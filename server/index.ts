// ============================================================================
// SERVER MAIN - Entry point for server/host
// ============================================================================

import * as readline from "readline";
import * as os from "os";
import * as net from "net";
import { Lobby } from "./lobby.js";
import { Game } from "./game.js";
import { GameServer } from "./net.js";
import { DiscoveryBeacon } from "./discovery.js";
import { loadDecksFromDir, mergeDecks } from "../shared/deck-loader.js";
import type { LoadedDeck } from "../shared/deck-loader.js";
import {
  generateLobbyCode,
  generateLobbyId,
  hashPassword,
  colorize,
} from "../shared/utils.js";
import {
  getNetworkInfo,
  getPortForwardCommand,
} from "../shared/env-utils.js";
import { TCP_BASE_PORT } from "../shared/types.js";
import { findAvailablePortSmart } from "../shared/port-utils.js";
import type { ClientMessage, ActionMessage, WelcomeMessage } from "../shared/types.js";
import pino from "pino";

const logger = pino({ transport: { target: "pino-pretty" } });

class ServerHost {
  private lobby?: Lobby;
  private game?: Game;
  private server?: GameServer;
  private beacon?: DiscoveryBeacon;
  private doorDecks: Map<string, LoadedDeck> = new Map();
  private treasureDecks: Map<string, LoadedDeck> = new Map();
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });

    this.loadDecks();
    this.setupCommands();
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    // Handle Ctrl+C (SIGINT)
    process.on("SIGINT", () => {
      console.log(); // New line after ^C
      console.log(colorize("\nReceived SIGINT (Ctrl+C)", "yellow"));
      this.shutdown();
      process.exit(0);
    });

    // Handle kill/terminate signals (SIGTERM)
    process.on("SIGTERM", () => {
      console.log(colorize("\nReceived SIGTERM", "yellow"));
      this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught exception:", err);
      this.shutdown();
      process.exit(1);
    });
  }

  private loadDecks(): void {
    logger.info("Loading decks...");
    this.doorDecks = loadDecksFromDir("./decks/doors", "doors");
    this.treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");
    logger.info(
      `Loaded ${this.doorDecks.size} door decks, ${this.treasureDecks.size} treasure decks`
    );
  }

  private setupCommands(): void {
    console.log(colorize("\n=== Terminal Dungeon Server ===\n", "cyan"));
    console.log("Commands:");
    console.log("  create <name>           - Create a lobby");
    console.log("  list-decks              - List available decks");
    console.log("  show-decks              - Show selected decks");
    console.log("  add-deck <kind> <id>    - Add deck to selection");
    console.log("  remove-deck <kind> <id> - Remove deck from selection");
    console.log("  clear-decks <kind>      - Clear all decks of a kind");
    console.log("  start                   - Start the game");
    console.log("  status                  - Show lobby status");
    console.log("  quit                    - Stop server");
    console.log();

    this.rl.prompt();

    this.rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      await this.handleCommand(trimmed);
      this.rl.prompt();
    });

    this.rl.on("close", () => {
      this.shutdown();
      process.exit(0);
    });
  }

  private async handleCommand(cmd: string): Promise<void> {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();

    try {
      switch (command) {
        case "create":
          await this.cmdCreate(parts.slice(1).join(" "));
          break;
        case "list-decks":
          this.cmdListDecks();
          break;
        case "show-decks":
          this.cmdShowDecks();
          break;
        case "add-deck":
          this.cmdAddDeck(parts[1], parts[2]);
          break;
        case "remove-deck":
          this.cmdRemoveDeck(parts[1], parts[2]);
          break;
        case "clear-decks":
          this.cmdClearDecks(parts[1]);
          break;
        case "start":
          await this.cmdStart();
          break;
        case "status":
          this.cmdStatus();
          break;
        case "quit":
          this.shutdown();
          process.exit(0);
          break;
        default:
          console.log(colorize(`Unknown command: ${command}`, "red"));
      }
    } catch (err) {
      console.log(colorize(`Error: ${(err as Error).message}`, "red"));
    }
  }

  private async cmdCreate(name: string): Promise<void> {
    if (this.lobby) {
      console.log(colorize("Lobby already exists.", "yellow"));
      return;
    }

    if (!name) {
      console.log(colorize("Usage: create <name>", "yellow"));
      return;
    }

    // Prompt for password
    const password = await this.prompt("Set lobby password: ");
    const passwordHash = await hashPassword(password);

    const lobbyId = generateLobbyId();
    const code = generateLobbyCode();
    const hostId = "p0"; // Host is player 0

    this.lobby = new Lobby(lobbyId, code, hostId, name, passwordHash);

    // Find available TCP port (try base port first, then search)
    console.log(colorize("Finding available port...", "dim"));
    const port = await findAvailablePortSmart(TCP_BASE_PORT);
    console.log(colorize(`Using port ${port}`, "dim"));

    // Start TCP server
    this.server = new GameServer(port);
    this.server.onMessage = (playerId, msg) => this.handleClientMessage(playerId, msg);
    this.server.onJoin = async (socket, lobbyId, name, password) => this.handleJoin(socket, lobbyId, name, password);
    await this.server.start();

    // Get network information
    const netInfo = getNetworkInfo();

    // Start UDP beacon with recommended IP
    this.beacon = new DiscoveryBeacon({
      lobbyId,
      code,
      host: netInfo.recommendedIP,
      port,
      maxPlayers: 6,
      decks: this.lobby.selectedDecks,
    });
    this.beacon.start();

    console.log(colorize(`\n✓ Lobby created!`, "green"));
    console.log(`  Code: ${colorize(code, "bright")}`);
    console.log(`  Lobby ID: ${lobbyId}`);
    console.log(`  Port: ${port}`);

    // Show IP information based on environment
    if (netInfo.isWSL) {
      console.log(colorize("\n⚠️  WSL DETECTED - LAN Setup Required!", "yellow"));
      console.log(`  WSL Internal IP: ${colorize(netInfo.wslInternalIP || "unknown", "dim")}`);

      if (netInfo.windowsHostIP) {
        console.log(`  Windows Host IP: ${colorize(netInfo.windowsHostIP, "bright")} ${colorize("(auto-detected ✓)", "green")}`);
        console.log();
        console.log(colorize("📋 Clients should connect to:", "cyan"));
        console.log(`   ${colorize(`connect ${netInfo.windowsHostIP} ${port}`, "green")}`);
        console.log();
        console.log(colorize("⚙️  Port forwarding required:", "yellow"));
        if (netInfo.wslInternalIP) {
          const cmd = getPortForwardCommand(netInfo.wslInternalIP, port);
          console.log(colorize("   Run in PowerShell as Administrator:", "dim"));
          console.log(`   ${colorize(cmd.powershell, "bright")}`);
          console.log();
          console.log(colorize("   And allow firewall:", "dim"));
          console.log(`   ${colorize(`netsh advfirewall firewall add rule name="Terminal Dungeon" dir=in action=allow protocol=TCP localport=${port}`, "bright")}`);
        }
      } else {
        console.log(colorize("   ⚠️  Could not auto-detect Windows IP", "yellow"));
        console.log();
        console.log(colorize("📋 Step 1: Find your Windows IP address", "cyan"));
        console.log(colorize("   Run in Windows PowerShell:", "dim"));
        console.log(`   ${colorize("ipconfig", "bright")}`);
        console.log(colorize("   Look for 'IPv4 Address' under your network adapter", "dim"));
        console.log();
        console.log(colorize("📋 Step 2: Configure port forwarding", "cyan"));
        if (netInfo.wslInternalIP) {
          const cmd = getPortForwardCommand(netInfo.wslInternalIP, port);
          console.log(colorize("   Run in PowerShell as Administrator:", "dim"));
          console.log(`   ${colorize(cmd.powershell, "bright")}`);
        }
        console.log();
        console.log(colorize("📋 Step 3: Allow firewall", "cyan"));
        console.log(colorize("   Run in PowerShell as Administrator:", "dim"));
        console.log(`   ${colorize(`netsh advfirewall firewall add rule name="Terminal Dungeon" dir=in action=allow protocol=TCP localport=${port}`, "bright")}`);
      }
      console.log();
      console.log(colorize("💡 EASIER: Run server in Windows PowerShell instead", "cyan"));
      console.log(colorize("   cd C:\\path\\to\\terminal-dungeon", "dim"));
      console.log(colorize("   npm run server", "dim"));
      console.log(colorize("   (No port forwarding needed!)", "dim"));
    } else {
      console.log(`  Server IP: ${colorize(netInfo.recommendedIP, "bright")}`);
    }
    console.log();
  }

  private async cmdStart(): Promise<void> {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    if (!this.lobby.canStart()) {
      console.log(
        colorize(
          `Cannot start. Need 2-6 players. Currently: ${this.lobby.players.size}`,
          "yellow"
        )
      );
      return;
    }

    // Load and merge selected decks
    const selectedDoorDecks: LoadedDeck[] = [];
    for (const deckId of this.lobby.selectedDecks.doors) {
      const deck = this.doorDecks.get(deckId);
      if (!deck) {
        console.log(colorize(`Door deck '${deckId}' not found.`, "red"));
        return;
      }
      selectedDoorDecks.push(deck);
    }

    const selectedTreasureDecks: LoadedDeck[] = [];
    for (const deckId of this.lobby.selectedDecks.treasures) {
      const deck = this.treasureDecks.get(deckId);
      if (!deck) {
        console.log(colorize(`Treasure deck '${deckId}' not found.`, "red"));
        return;
      }
      selectedTreasureDecks.push(deck);
    }

    // Merge multiple decks into one
    const doorDeck = mergeDecks(selectedDoorDecks);
    const treasureDeck = mergeDecks(selectedTreasureDecks);

    // Create game
    const playerIds = Array.from(this.lobby.players.keys());
    const playerNames = new Map(
      Array.from(this.lobby.players.values()).map((p) => [p.id, p.name])
    );

    this.game = new Game(
      playerIds,
      playerNames,
      doorDeck,
      treasureDeck,
      this.lobby.manifest
    );

    this.lobby.inGame = true;
    this.beacon?.updateStatus("IN_GAME");

    console.log(colorize("\n✓ Game started!", "green"));
    console.log(`Players: ${playerIds.length}`);
    console.log(`First turn: ${playerNames.get(playerIds[0])}`);
    console.log();

    // Broadcast WELCOME to all clients
    for (const [id, player] of this.lobby.players) {
      this.server?.send(id, {
        t: "WELCOME",
        you: id,
        state: this.game.state,
        decks: {
          doors: doorDeck.definition,
          treasures: treasureDeck.definition,
        },
        manifest: this.lobby.manifest,
      });
    }

    // Broadcast initial state
    this.server?.broadcastState(this.game.state);
  }

  private cmdStatus(): void {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    console.log(colorize("\n=== Lobby Status ===", "cyan"));
    console.log(`Code: ${this.lobby.code}`);
    console.log(`Players: ${this.lobby.players.size}/${this.lobby.maxPlayers}`);
    for (const player of this.lobby.players.values()) {
      console.log(`  - ${player.name} (${player.id})`);
    }
    console.log(`In Game: ${this.lobby.inGame ? "Yes" : "No"}`);
    console.log();
  }

  private cmdListDecks(): void {
    console.log(colorize("\n=== Available Decks ===", "cyan"));

    console.log(colorize("\nDoor Decks:", "bright"));
    if (this.doorDecks.size === 0) {
      console.log("  No door decks loaded.");
    } else {
      for (const [id, deck] of this.doorDecks) {
        console.log(
          `  ${colorize(id, "bright")} - ${deck.definition.name} (${deck.cards.length} cards)`
        );
      }
    }

    console.log(colorize("\nTreasure Decks:", "bright"));
    if (this.treasureDecks.size === 0) {
      console.log("  No treasure decks loaded.");
    } else {
      for (const [id, deck] of this.treasureDecks) {
        console.log(
          `  ${colorize(id, "bright")} - ${deck.definition.name} (${deck.cards.length} cards)`
        );
      }
    }
    console.log();
  }

  private cmdShowDecks(): void {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    console.log(colorize("\n=== Selected Decks ===", "cyan"));

    console.log(colorize("\nDoors:", "bright"));
    if (this.lobby.selectedDecks.doors.length === 0) {
      console.log("  None selected");
    } else {
      for (const deckId of this.lobby.selectedDecks.doors) {
        const deck = this.doorDecks.get(deckId);
        const name = deck ? deck.definition.name : "Unknown";
        console.log(`  ${colorize(deckId, "green")} - ${name}`);
      }
    }

    console.log(colorize("\nTreasures:", "bright"));
    if (this.lobby.selectedDecks.treasures.length === 0) {
      console.log("  None selected");
    } else {
      for (const deckId of this.lobby.selectedDecks.treasures) {
        const deck = this.treasureDecks.get(deckId);
        const name = deck ? deck.definition.name : "Unknown";
        console.log(`  ${colorize(deckId, "green")} - ${name}`);
      }
    }
    console.log();
  }

  private cmdAddDeck(kind?: string, deckId?: string): void {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    if (this.lobby.inGame) {
      console.log(
        colorize("Cannot modify decks after game has started.", "yellow")
      );
      return;
    }

    if (!kind || !deckId) {
      console.log(colorize("Usage: add-deck <doors|treasures> <deckId>", "yellow"));
      return;
    }

    if (kind !== "doors" && kind !== "treasures") {
      console.log(
        colorize("Kind must be 'doors' or 'treasures'.", "yellow")
      );
      return;
    }

    // Check if deck exists
    const decks = kind === "doors" ? this.doorDecks : this.treasureDecks;
    if (!decks.has(deckId)) {
      console.log(colorize(`Deck '${deckId}' not found.`, "red"));
      console.log(`Use 'list-decks' to see available decks.`);
      return;
    }

    this.lobby.addDeck(kind, deckId);
    console.log(colorize(`✓ Added ${kind} deck: ${deckId}`, "green"));
  }

  private cmdRemoveDeck(kind?: string, deckId?: string): void {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    if (this.lobby.inGame) {
      console.log(
        colorize("Cannot modify decks after game has started.", "yellow")
      );
      return;
    }

    if (!kind || !deckId) {
      console.log(
        colorize("Usage: remove-deck <doors|treasures> <deckId>", "yellow")
      );
      return;
    }

    if (kind !== "doors" && kind !== "treasures") {
      console.log(
        colorize("Kind must be 'doors' or 'treasures'.", "yellow")
      );
      return;
    }

    this.lobby.removeDeck(kind, deckId);
    console.log(colorize(`✓ Removed ${kind} deck: ${deckId}`, "green"));
  }

  private cmdClearDecks(kind?: string): void {
    if (!this.lobby) {
      console.log(colorize("No lobby created.", "yellow"));
      return;
    }

    if (this.lobby.inGame) {
      console.log(
        colorize("Cannot modify decks after game has started.", "yellow")
      );
      return;
    }

    if (!kind) {
      console.log(colorize("Usage: clear-decks <doors|treasures>", "yellow"));
      return;
    }

    if (kind !== "doors" && kind !== "treasures") {
      console.log(
        colorize("Kind must be 'doors' or 'treasures'.", "yellow")
      );
      return;
    }

    this.lobby.clearDecks(kind);
    console.log(colorize(`✓ Cleared all ${kind} decks`, "green"));
  }

  private async handleJoin(
    socket: net.Socket,
    lobbyId: string,
    name: string,
    password: string
  ): Promise<{ success: boolean; playerId?: string; error?: string }> {
    // Check if lobby exists
    if (!this.lobby) {
      return { success: false, error: "Lobby does not exist" };
    }

    // Verify lobby ID
    if (this.lobby.lobbyId !== lobbyId) {
      return { success: false, error: "Invalid lobby ID" };
    }

    // Generate player ID
    const playerId = `p${this.lobby.players.size}`;

    // Verify password
    try {
      const passwordValid = await this.lobby.verifyPassword(password, playerId);
      if (!passwordValid) {
        return { success: false, error: "Incorrect password" };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }

    // Add player to lobby
    const added = this.lobby.addPlayer(playerId, name);
    if (!added) {
      return { success: false, error: "Lobby is full or game already started" };
    }

    logger.info(`Player ${name} (${playerId}) joined lobby ${this.lobby.code}`);

    // Update beacon with new player count
    if (this.beacon) {
      this.beacon.updatePlayerCount(this.lobby.players.size);
    }

    // Send WELCOME message
    // If game hasn't started, send a lobby state. If game started, send actual game state
    if (this.game) {
      // Game already started - send actual game state
      socket.write(JSON.stringify({
        t: "WELCOME",
        you: playerId,
        state: this.game.state,
        decks: {
          doors: this.game.doorsDeck.definition,
          treasures: this.game.treasuresDeck.definition,
        },
        manifest: this.lobby.manifest,
      } as WelcomeMessage) + "\n");
    } else {
      // Game not started - send minimal lobby state
      socket.write(JSON.stringify({
        t: "WELCOME",
        you: playerId,
        state: this.createLobbyState(),
        decks: {
          doors: { kind: "doors" as const, id: "lobby", name: "Waiting for game...", version: 1, language: "en", cards: [] },
          treasures: { kind: "treasures" as const, id: "lobby", name: "Waiting for game...", version: 1, language: "en", cards: [] },
        },
        manifest: this.lobby.manifest,
      } as WelcomeMessage) + "\n");
    }

    return { success: true, playerId };
  }

  private createLobbyState(): any {
    // Create a minimal game state for lobby waiting room
    const players: Record<string, any> = {};
    for (const [id, player] of this.lobby!.players) {
      players[id] = {
        id,
        name: player.name,
        level: 1,
        hand: [],
        equipped: [],
        isDead: false,
      };
    }

    return {
      rev: 0,
      phase: "LOBBY" as any,
      activePlayer: this.lobby!.hostId,
      players,
      turnOrder: Array.from(this.lobby!.players.keys()),
      currentTurnIndex: 0,
      doorsDeck: [],
      treasuresDeck: [],
      doorsDiscard: [],
      treasuresDiscard: [],
      maxLevel: this.lobby!.manifest.maxLevel,
      foughtThisTurn: false,
    };
  }

  private handleClientMessage(playerId: string, msg: ClientMessage): void {
    if (msg.t === "CHAT") {
      // Broadcast chat
      const player = this.lobby?.players.get(playerId);
      if (player) {
        this.server?.broadcast({
          t: "EVENT",
          msg: `[${player.name}]: ${msg.msg}`,
        });
      }
    } else if (msg.t === "WHISPER") {
      // Send whisper to target
      const player = this.lobby?.players.get(playerId);
      if (player) {
        this.server?.send(msg.to.replace("@", ""), {
          t: "EVENT",
          msg: `[Whisper from ${player.name}]: ${msg.msg}`,
        });
      }
    } else if (msg.t === "ACTION") {
      this.handleAction(playerId, msg);
    }
  }

  private handleAction(playerId: string, msg: ActionMessage): void {
    if (!this.game) {
      this.server?.send(playerId, {
        t: "ERROR",
        msg: "Game not started.",
      });
      return;
    }

    const result = this.game.processAction({
      playerId,
      kind: msg.kind,
      cardId: msg.cardId,
      target: msg.target,
      offer: msg.offer,
      value: msg.value,
    });

    if (!result.success) {
      this.server?.send(playerId, {
        t: "ERROR",
        msg: result.error || "Action failed.",
      });
    }

    // Broadcast events
    for (const event of result.events) {
      this.server?.broadcast({
        t: "EVENT",
        msg: event.replace("@you", `@${this.lobby?.players.get(playerId)?.name}`),
      });
    }

    // Broadcast state if changed
    if (result.stateChanged) {
      this.server?.broadcastState(this.game.state);
    }
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "127.0.0.1";
  }

  private shutdown(): void {
    console.log(colorize("\nShutting down...", "yellow"));
    this.beacon?.stop();
    this.server?.stop();
  }
}

// Start server
const server = new ServerHost();

