// ============================================================================
// SERVER MAIN - Entry point for server/host
// ============================================================================

import * as readline from "readline";
import * as os from "os";
import { Lobby } from "./lobby.js";
import { Game } from "./game.js";
import { GameServer } from "./net.js";
import { DiscoveryBeacon } from "./discovery.js";
import { loadDecksFromDir } from "../shared/deck-loader.js";
import type { LoadedDeck } from "../shared/deck-loader.js";
import {
  generateLobbyCode,
  generateLobbyId,
  hashPassword,
  colorize,
} from "../shared/utils.js";
import { TCP_BASE_PORT } from "../shared/types.js";
import { findAvailablePortSmart } from "../shared/port-utils.js";
import type { ClientMessage, ActionMessage } from "../shared/types.js";
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
    console.log("  create <name>  - Create a lobby");
    console.log("  start          - Start the game");
    console.log("  status         - Show lobby status");
    console.log("  quit           - Stop server");
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
    await this.server.start();

    // Start UDP beacon
    const localIp = this.getLocalIp();
    this.beacon = new DiscoveryBeacon({
      lobbyId,
      code,
      host: localIp,
      port,
      maxPlayers: 6,
      decks: this.lobby.selectedDecks,
    });
    this.beacon.start();

    console.log(colorize(`\n✓ Lobby created!`, "green"));
    console.log(`  Code: ${colorize(code, "bright")}`);
    console.log(`  Lobby ID: ${lobbyId}`);
    console.log(`  Port: ${port}`);
    console.log(`  Local IP: ${localIp}`);
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

    // Load selected decks
    const doorDeck = this.doorDecks.get(this.lobby.selectedDecks.doors);
    const treasureDeck = this.treasureDecks.get(
      this.lobby.selectedDecks.treasures
    );

    if (!doorDeck || !treasureDeck) {
      console.log(colorize("Selected decks not found.", "red"));
      return;
    }

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

