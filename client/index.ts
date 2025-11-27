// ============================================================================
// CLIENT MAIN - Entry point for client/player
// ============================================================================

import * as readline from "readline";
import { GameClient } from "./net.js";
import { Renderer } from "./render.js";
import { CommandHandler } from "./commands.js";
import { ClientDiscovery } from "./discovery.js";
import type {
  WelcomeMessage,
  StateMessage,
  EventMessage,
  ErrorMessage,
  Card,
} from "../shared/types.js";
import { colorize } from "../shared/utils.js";
import { GAME_VERSION } from "../shared/types.js";

class TerminalDungeonClient {
  private rl: readline.Interface;
  private client?: GameClient;
  private renderer: Renderer;
  private commandHandler?: CommandHandler;
  private discovery: ClientDiscovery;
  private myId?: string;
  private myHand: Card[] = [];
  private connected = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });

    this.renderer = new Renderer();
    this.discovery = new ClientDiscovery();

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
      console.error("Uncaught exception:", err);
      this.shutdown();
      process.exit(1);
    });
  }

  private setupCommands(): void {
    console.log(colorize("\n╔═══════════════════════════════════╗", "cyan"));
    console.log(colorize("║   Terminal Dungeon - Client       ║", "cyan"));
    console.log(colorize("╚═══════════════════════════════════╝", "cyan"));
    console.log(`Version: ${GAME_VERSION}\n`);
    console.log("Commands:");
    console.log("  list                  - List available lobbies");
    console.log("  join <code>           - Join a lobby by code");
    console.log("  connect <ip> <port>   - Connect directly to host");
    console.log("  help                  - Show all commands");
    console.log("  quit                  - Exit");
    console.log();

    this.rl.prompt();

    this.rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      const shouldContinue = await this.handleCommand(trimmed);
      if (!shouldContinue) {
        this.shutdown();
        process.exit(0);
      }

      this.rl.prompt();
    });

    this.rl.on("close", () => {
      this.shutdown();
      process.exit(0);
    });
  }

  private async handleCommand(cmd: string): Promise<boolean> {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();

    // If connected, delegate to command handler
    if (this.connected && this.commandHandler) {
      return this.commandHandler.execute(cmd);
    }

    // Pre-connection commands
    try {
      switch (command) {
        case "list":
          await this.cmdList();
          break;
        case "join":
          await this.cmdJoin(parts[1]);
          break;
        case "connect":
          await this.cmdConnect(parts[1], parts[2]);
          break;
        case "help":
          this.cmdHelp();
          break;
        case "quit":
          return false;
        default:
          console.log(
            colorize(`Unknown command: ${command}. Try 'help'.`, "yellow")
          );
      }
    } catch (err) {
      console.log(colorize(`Error: ${(err as Error).message}`, "red"));
    }

    return true;
  }

  private async cmdList(): Promise<void> {
    console.log(colorize("\nScanning for lobbies...", "cyan"));

    // Start discovery if not started
    if (!this.discovery) {
      this.discovery = new ClientDiscovery();
      await this.discovery.start();
    }

    // Wait a bit for beacons
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const lobbies = this.discovery.getLobbies();

    if (lobbies.length === 0) {
      console.log(colorize("No lobbies found.", "yellow"));
      console.log();
      return;
    }

    console.log(colorize("\n=== Available Lobbies ===", "bright"));
    for (const lobby of lobbies) {
      const status =
        lobby.status === "OPEN"
          ? colorize("OPEN", "green")
          : lobby.status === "IN_GAME"
          ? colorize("IN_GAME", "yellow")
          : colorize("FULL", "red");

      console.log(
        `  Code: ${colorize(lobby.code, "bright")} | ${lobby.host}:${lobby.port} | ${lobby.players}/${lobby.maxPlayers} | ${status}`
      );
    }
    console.log();
  }

  private async cmdJoin(code?: string): Promise<void> {
    if (!code) {
      console.log(colorize("Usage: join <code>", "yellow"));
      return;
    }

    // Start discovery if not started
    if (!this.discovery) {
      this.discovery = new ClientDiscovery();
      await this.discovery.start();
    }

    // Find lobby
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const lobby = this.discovery.findLobbyByCode(code);

    if (!lobby) {
      console.log(
        colorize(`Lobby ${code} not found. Try 'list' first.`, "red")
      );
      return;
    }

    // Version check
    if (lobby.version !== GAME_VERSION) {
      console.log(
        colorize(
          `Version mismatch! Server: ${lobby.version}, Client: ${GAME_VERSION}`,
          "red"
        )
      );
      return;
    }

    // Prompt for name
    const name = await this.prompt("Enter your name: ");
    if (!name.trim()) {
      console.log(colorize("Name required.", "yellow"));
      return;
    }

    // Prompt for password
    const password = await this.prompt("Enter lobby password: ");

    // Connect
    console.log(colorize(`\nConnecting to ${lobby.host}:${lobby.port}...`, "cyan"));

    this.client = new GameClient(lobby.host, lobby.port);

    this.client.onMessage = (msg) => this.handleServerMessage(msg);
    this.client.onConnect = () => {
      console.log(colorize("Connected!", "green"));
      this.client!.send({
        t: "JOIN",
        lobbyId: lobby.lobbyId,
        name: name.trim(),
        password,
      });
    };
    this.client.onDisconnect = () => {
      console.log(colorize("Disconnected from server.", "red"));
      this.connected = false;
    };

    try {
      await this.client.connect();
    } catch (err) {
      console.log(
        colorize(`Failed to connect: ${(err as Error).message}`, "red")
      );
    }
  }

  private async cmdConnect(ip?: string, portStr?: string): Promise<void> {
    if (!ip || !portStr) {
      console.log(colorize("Usage: connect <ip> <port>", "yellow"));
      console.log(colorize("Example: connect 192.168.1.100 4000", "dim"));
      return;
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.log(colorize("Invalid port number.", "red"));
      return;
    }

    // Prompt for name
    const name = await this.prompt("Enter your name: ");
    if (!name.trim()) {
      console.log(colorize("Name required.", "yellow"));
      return;
    }

    // Prompt for password
    const password = await this.prompt("Enter lobby password: ");

    // Prompt for lobby ID (optional, can use empty string)
    const lobbyId = await this.prompt("Enter lobby ID (press Enter to skip): ");

    // Connect
    console.log(colorize(`\nConnecting to ${ip}:${port}...`, "cyan"));

    this.client = new GameClient(ip, port);

    this.client.onMessage = (msg) => this.handleServerMessage(msg);
    this.client.onConnect = () => {
      console.log(colorize("Connected!", "green"));
      this.client!.send({
        t: "JOIN",
        lobbyId: lobbyId.trim() || "direct-connect",
        name: name.trim(),
        password,
      });
    };
    this.client.onDisconnect = () => {
      console.log(colorize("Disconnected from server.", "red"));
      this.connected = false;
    };

    try {
      await this.client.connect();
    } catch (err) {
      console.log(
        colorize(`Failed to connect: ${(err as Error).message}`, "red")
      );
    }
  }

  private cmdHelp(): void {
    console.log(colorize("\n=== Commands ===", "bright"));
    console.log("Pre-game:");
    console.log("  list                  - List available lobbies");
    console.log("  join <code>           - Join a lobby by code");
    console.log("  connect <ip> <port>   - Connect directly to host (bypass discovery)");
    console.log("  quit                  - Exit");
    console.log("\nIn-game:");
    console.log("  help           - Show help");
    console.log("  open           - Open a door");
    console.log("  fight          - Resolve combat");
    console.log("  flee           - Attempt to escape");
    console.log("  end            - End turn");
    console.log("  hand           - View your hand");
    console.log("  view [what]    - View game state");
    console.log("  chat <msg>     - Public chat");
    console.log("\nType 'help <command>' for details.");
    console.log();
  }

  private handleServerMessage(msg: any): void {
    switch (msg.t) {
      case "WELCOME":
        this.handleWelcome(msg as WelcomeMessage);
        break;
      case "STATE":
        this.handleState(msg as StateMessage);
        break;
      case "EVENT":
        this.handleEvent(msg as EventMessage);
        break;
      case "ERROR":
        this.handleError(msg as ErrorMessage);
        break;
      case "PONG":
        // Keep-alive
        break;
      default:
        console.log(colorize(`Unknown message type: ${msg.t}`, "yellow"));
    }
  }

  private handleWelcome(msg: WelcomeMessage): void {
    this.myId = msg.you;
    this.connected = true;

    // Extract my hand from state
    const me = msg.state.players[msg.you];
    if (me) {
      this.myHand = me.hand;
    }

    this.commandHandler = new CommandHandler(this.client!, this.renderer);
    this.commandHandler.setMyId(msg.you);
    this.commandHandler.setHand(this.myHand);

    console.log(colorize("\n✓ Welcome to the game!", "green"));
    console.log(`Your ID: ${msg.you}`);
    console.log(`Max Level: ${msg.manifest.maxLevel}`);
    console.log(
      `Decks: ${msg.decks.doors.name} + ${msg.decks.treasures.name}`
    );
    console.log();
    console.log(
      colorize(
        "Game starting soon! Type 'help' for commands or 'view all' to see the game state.",
        "cyan"
      )
    );
    console.log();
  }

  private handleState(msg: StateMessage): void {
    if (this.commandHandler) {
      this.commandHandler.setState(msg);
    }
    this.renderer.updateState(msg);
  }

  private handleEvent(msg: EventMessage): void {
    // Replace @you with actual name
    let event = msg.msg;
    if (this.myId) {
      const me = this.commandHandler?.["currentState"]?.players.find(
        (p) => p.id === this.myId
      );
      if (me) {
        event = event.replace("@you", `@${me.name}`);
      }
    }

    this.renderer.addEvent(event);

    // Always print events to console (unless in follow mode)
    if (this.renderer.getFollowMode() !== "feed") {
      console.log(colorize(`[EVENT] ${event}`, "cyan"));
    }
  }

  private handleError(msg: ErrorMessage): void {
    console.log(colorize(`[ERROR] ${msg.msg}`, "red"));
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private shutdown(): void {
    console.log(colorize("\nGoodbye!", "cyan"));
    if (this.client) {
      this.client.disconnect();
    }
    if (this.discovery) {
      this.discovery.stop();
    }
    this.rl.close();
  }

  async start(): Promise<void> {
    try {
      await this.discovery.start();
    } catch (err) {
      console.log(
        colorize(
          `Failed to start discovery: ${(err as Error).message}`,
          "red"
        )
      );
    }
  }
}

// Start client
const client = new TerminalDungeonClient();
client.start();

