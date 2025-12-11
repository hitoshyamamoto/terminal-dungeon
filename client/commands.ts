// ============================================================================
// CLIENT COMMANDS - Command parsing and execution
// ============================================================================

import type { GameClient } from "./net.js";
import type { Renderer } from "./render.js";
import type { GameState, StateMessage, Card } from "../shared/types.js";
import { colorize, findClosestCommand } from "../shared/utils.js";

const ALL_COMMANDS = [
  "help",
  "chat",
  "whisper",
  "rules",
  "status",
  "quit",
  "feedback",
  "list",
  "join",
  "create",
  "start",
  "password",
  "open",
  "provoke",
  "loot",
  "end",
  "fight",
  "flee",
  "help",
  "accept",
  "decline",
  "mod",
  "hand",
  "show",
  "play",
  "equip",
  "unequip",
  "levelup",
  "discard",
  "view",
  "inspect",
  "follow",
  "unfollow",
];

export class CommandHandler {
  private client: GameClient;
  private renderer: Renderer;
  private myHand: Card[] = [];
  private myId?: string;
  private currentState?: StateMessage;

  constructor(client: GameClient, renderer: Renderer) {
    this.client = client;
    this.renderer = renderer;
  }

  setMyId(id: string): void {
    this.myId = id;
  }

  setHand(hand: Card[]): void {
    this.myHand = hand;
  }

  setState(state: StateMessage): void {
    this.currentState = state;
  }

  execute(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed) return true;

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check if command exists
    if (!ALL_COMMANDS.includes(command)) {
      const closest = findClosestCommand(command, ALL_COMMANDS);
      if (closest) {
        console.log(
          colorize(
            `Unknown command '${command}'. Did you mean '${closest}'?`,
            "yellow"
          )
        );
      } else {
        console.log(colorize(`Unknown command '${command}'.`, "red"));
      }
      return true;
    }

    try {
      switch (command) {
        case "help":
          this.cmdHelp(args);
          break;
        case "chat":
          this.cmdChat(args.join(" "));
          break;
        case "whisper":
          this.cmdWhisper(args);
          break;
        case "rules":
          this.cmdRules();
          break;
        case "status":
          this.cmdStatus();
          break;
        case "quit":
          return false;
        case "feedback":
          console.log(
            colorize("Feedback sent to host logs.", "green")
          );
          break;

        // Turn actions
        case "open":
          this.client.send({ t: "ACTION", kind: "OPEN" });
          break;
        case "provoke":
          if (args.length === 0) {
            console.log(colorize("Usage: provoke <card_id or index>", "yellow"));
          } else {
            const cardId = this.getCardIdFromIndexOrId(args[0]);
            if (!cardId) {
              console.log(colorize(`Card '${args[0]}' not found in your hand.`, "red"));
            } else {
              this.client.send({
                t: "ACTION",
                kind: "PROVOKE",
                cardId,
              });
            }
          }
          break;
        case "loot":
          this.client.send({ t: "ACTION", kind: "LOOT" });
          break;
        case "end":
          this.client.send({ t: "ACTION", kind: "END" });
          break;

        // Combat
        case "fight":
          this.client.send({ t: "ACTION", kind: "FIGHT" });
          break;
        case "flee":
          this.client.send({ t: "ACTION", kind: "FLEE" });
          break;
        case "accept":
          this.client.send({ t: "ACTION", kind: "ACCEPT" });
          break;
        case "decline":
          this.client.send({ t: "ACTION", kind: "DECLINE" });
          break;
        case "mod":
          if (args.length === 0) {
            console.log(colorize("Usage: mod +N", "yellow"));
          } else {
            const value = parseInt(args[0]);
            this.client.send({ t: "ACTION", kind: "MOD", value });
          }
          break;

        // Hand/Cards
        case "hand":
          this.renderer.renderHand(this.myHand);
          break;
        case "show":
          this.cmdShow(args);
          break;
        case "play":
          if (args.length === 0) {
            console.log(colorize("Usage: play <card_id or index>", "yellow"));
          } else {
            const cardId = this.getCardIdFromIndexOrId(args[0]);
            if (!cardId) {
              console.log(colorize(`Card '${args[0]}' not found in your hand.`, "red"));
            } else {
              this.client.send({
                t: "ACTION",
                kind: "PLAY",
                cardId,
              });
            }
          }
          break;
        case "equip":
          if (args.length === 0) {
            console.log(colorize("Usage: equip <card_id or index>", "yellow"));
          } else {
            const cardId = this.getCardIdFromIndexOrId(args[0]);
            if (!cardId) {
              console.log(colorize(`Card '${args[0]}' not found in your hand.`, "red"));
            } else {
              this.client.send({
                t: "ACTION",
                kind: "EQUIP",
                cardId,
              });
            }
          }
          break;
        case "unequip":
          if (args.length === 0) {
            console.log(colorize("Usage: unequip <card_id>", "yellow"));
          } else {
            this.client.send({
              t: "ACTION",
              kind: "UNEQUIP",
              cardId: args[0],
            });
          }
          break;
        case "levelup":
          this.client.send({ t: "ACTION", kind: "LEVELUP" });
          break;
        case "discard":
          if (args.length === 0) {
            console.log(colorize("Usage: discard <card_id or index>", "yellow"));
          } else {
            const cardId = this.getCardIdFromIndexOrId(args[0]);
            if (!cardId) {
              console.log(colorize(`Card '${args[0]}' not found in your hand.`, "red"));
            } else {
              this.client.send({
                t: "ACTION",
                kind: "DISCARD",
                cardId,
              });
            }
          }
          break;

        // Views
        case "view":
          this.cmdView(args);
          break;
        case "inspect":
          console.log(
            colorize("Inspect not yet implemented.", "yellow")
          );
          break;
        case "follow":
          this.cmdFollow(args);
          break;
        case "unfollow":
          this.renderer.setFollowMode("none");
          break;

        default:
          console.log(colorize(`Command '${command}' not implemented.`, "yellow"));
      }
    } catch (err) {
      console.log(colorize(`Error: ${(err as Error).message}`, "red"));
    }

    return true;
  }

  private cmdHelp(args: string[]): void {
    if (args.length === 0) {
      console.log(colorize("\n=== Commands ===", "bright"));
      console.log("Global: help, chat, whisper, rules, status, quit, feedback");
      console.log("Turn: open, provoke, loot, end");
      console.log("Combat: fight, flee, accept, decline, mod");
      console.log("Cards: hand, show, play, equip, unequip, levelup, discard");
      console.log("Views: view [players|table|hand|feed|all], inspect, follow, unfollow");
      console.log("\nType 'help <command>' for details.");
      console.log();
    } else {
      const cmd = args[0].toLowerCase();
      console.log(colorize(`\nHelp for '${cmd}':`, "bright"));
      console.log("(Detailed help not yet implemented)");
      console.log();
    }
  }

  private cmdChat(msg: string): void {
    if (!msg) {
      console.log(colorize("Usage: chat <message>", "yellow"));
      return;
    }
    this.client.send({ t: "CHAT", msg });
  }

  private cmdWhisper(args: string[]): void {
    if (args.length < 2) {
      console.log(colorize("Usage: whisper @name <message>", "yellow"));
      return;
    }
    const to = args[0];
    const msg = args.slice(1).join(" ");
    this.client.send({ t: "WHISPER", to, msg });
  }

  private cmdRules(): void {
    console.log(colorize("\n=== Terminal Dungeon Rules ===", "bright"));
    console.log("Objective: Reach Level 15 (default)");
    console.log();
    console.log("Turn phases:");
    console.log("  1. Open Door - reveal a card");
    console.log("  2. Fight (if Monster) or resolve effect");
    console.log("  3. Provoke Trouble (optional)");
    console.log("  4. Loot the Room (if no fight)");
    console.log("  5. End Turn (hand limit: 5)");
    console.log();
    console.log("Combat: Power = Level + Item Bonuses");
    console.log("Win if Power >= Monster Level");
    console.log("Flee: roll 5-6 on d6 to escape");
    console.log();
  }

  private cmdStatus(): void {
    if (!this.currentState) {
      console.log(colorize("No game state yet.", "yellow"));
      return;
    }

    const me = this.currentState.players.find((p) => p.id === this.myId);
    if (!me) {
      console.log(colorize("Player not found.", "yellow"));
      return;
    }

    console.log(colorize("\n=== Your Status ===", "bright"));
    console.log(`Name: ${me.name}`);
    console.log(`Level: ${me.level}`);
    console.log(`Power: ${me.power}`);
    console.log(`Hand: ${me.handSize} cards`);
    console.log(`Phase: ${this.currentState.phase}`);
    console.log(`Your Turn: ${this.currentState.active === this.myId ? "Yes" : "No"}`);
    console.log();
  }

  /**
   * Helper to get card ID from index or ID string
   * Returns null if not found
   */
  private getCardIdFromIndexOrId(idOrIndex: string): string | null {
    // Try as index first
    const index = parseInt(idOrIndex);
    if (!isNaN(index) && index >= 0 && index < this.myHand.length) {
      return this.myHand[index].id;
    }

    // Try as ID
    const card = this.myHand.find((c) => c.id === idOrIndex);
    return card ? card.id : null;
  }

  private cmdShow(args: string[]): void {
    if (args.length === 0) {
      console.log(colorize("Usage: show <card_id or index>", "yellow"));
      return;
    }

    const idOrIndex = args[0];
    let card: Card | undefined;

    // Try as index first
    const index = parseInt(idOrIndex);
    if (!isNaN(index) && index >= 0 && index < this.myHand.length) {
      card = this.myHand[index];
    } else {
      // Try as ID
      card = this.myHand.find((c) => c.id === idOrIndex);
    }

    if (!card) {
      console.log(colorize(`Card '${idOrIndex}' not found.`, "red"));
      return;
    }

    console.log(colorize(`\n${card.name}`, "bright"));
    console.log(`Type: ${card.type}, Tier: ${card.tier}`);
    if ("level" in card) {
      console.log(`Level: ${card.level}, Treasures: ${(card as any).treasures}`);
    }
    if ("bonus" in card) {
      console.log(`Bonus: +${(card as any).bonus}`);
    }
    if ("effect" in card) {
      console.log(`Effect: ${(card as any).effect}`);
    }
    if (card.text) {
      console.log(`Text: ${card.text}`);
    }
    console.log();
  }

  private cmdView(args: string[]): void {
    if (args.length === 0) {
      console.log(
        colorize("Usage: view [players|table|hand|feed|all] [n]", "yellow")
      );
      return;
    }

    const subcommand = args[0].toLowerCase();

    if (!this.currentState) {
      console.log(colorize("No game state yet.", "yellow"));
      return;
    }

    switch (subcommand) {
      case "players":
        this.renderer.renderPlayers(this.currentState);
        break;
      case "table":
        this.renderer.renderTable(this.currentState);
        break;
      case "hand":
        this.renderer.renderHand(this.myHand);
        break;
      case "feed":
        const count = args[1] ? parseInt(args[1]) : 10;
        this.renderer.renderFeed(count);
        break;
      case "all":
        this.renderer.renderAll(this.currentState, this.myHand);
        break;
      default:
        console.log(colorize(`Unknown view: ${subcommand}`, "yellow"));
    }
  }

  private cmdFollow(args: string[]): void {
    if (args.length === 0) {
      console.log(colorize("Usage: follow [table|feed]", "yellow"));
      return;
    }

    const mode = args[0].toLowerCase();
    if (mode === "table" || mode === "feed") {
      this.renderer.setFollowMode(mode);
    } else {
      console.log(colorize("Usage: follow [table|feed]", "yellow"));
    }
  }
}

