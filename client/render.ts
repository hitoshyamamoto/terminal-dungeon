// ============================================================================
// CLIENT RENDERING - Format game state for CLI display
// ============================================================================

import type {
  StateMessage,
  GameState,
  Card,
  Player,
} from "../shared/types.js";
import { colorize, formatCard } from "../shared/utils.js";

export class Renderer {
  private followMode: "none" | "table" | "feed" = "none";
  private eventFeed: string[] = [];
  private lastState?: StateMessage;

  addEvent(event: string): void {
    this.eventFeed.push(event);
    if (this.eventFeed.length > 100) {
      this.eventFeed.shift();
    }

    if (this.followMode === "feed") {
      console.log(colorize(`[EVENT] ${event}`, "cyan"));
    }
  }

  updateState(state: StateMessage): void {
    this.lastState = state;

    if (this.followMode === "table") {
      this.renderTable(state);
    }
  }

  renderTable(state: StateMessage): void {
    console.log(colorize("\n=== Game Table ===", "bright"));
    console.log(`Phase: ${colorize(state.phase, "yellow")}`);
    console.log(
      `Active: ${colorize(
        state.players.find((p) => p.id === state.active)?.name || "?",
        "green"
      )}`
    );
    console.log(`Revision: ${state.rev}`);

    if (state.fight) {
      console.log(colorize("\n--- Fight ---", "red"));
      console.log(`Monster: ${state.fight.monster.name} (Lvl ${state.fight.monster.level})`);
      console.log(`Attacker Power: ${state.fight.playerPower}`);
      console.log(`Monster Power: ${state.fight.monsterPower + state.fight.modifiers}`);
      if (state.fight.helper) {
        console.log(`Helper: ${state.fight.helper} (Power: ${state.fight.helperPower || 0})`);
      }
    }

    console.log();
  }

  renderPlayers(state: StateMessage): void {
    console.log(colorize("\n=== Players ===", "bright"));

    for (const player of state.players) {
      const active = player.id === state.active ? colorize(" [ACTIVE]", "green") : "";
      console.log(
        `${player.name}${active}: Lvl ${player.level}, Power ${player.power}, Hand: ${player.handSize}`
      );

      if (player.equipped.length > 0) {
        console.log(`  Equipped: ${player.equipped.map((e) => `${e.name} (+${e.bonus})`).join(", ")}`);
      }
    }

    console.log();
  }

  renderHand(hand: Card[]): void {
    console.log(colorize("\n=== Your Hand ===", "bright"));

    if (hand.length === 0) {
      console.log(colorize("(empty)", "dim"));
    } else {
      for (let i = 0; i < hand.length; i++) {
        console.log(formatCard(hand[i], i));
      }
    }

    console.log();
  }

  renderFeed(count: number = 10): void {
    console.log(colorize("\n=== Event Feed ===", "bright"));

    const start = Math.max(0, this.eventFeed.length - count);
    const events = this.eventFeed.slice(start);

    if (events.length === 0) {
      console.log(colorize("(no events)", "dim"));
    } else {
      for (const event of events) {
        console.log(`  ${event}`);
      }
    }

    console.log();
  }

  renderAll(state: StateMessage, hand: Card[]): void {
    this.renderTable(state);
    this.renderPlayers(state);
    this.renderHand(hand);
  }

  setFollowMode(mode: "none" | "table" | "feed"): void {
    this.followMode = mode;
    console.log(colorize(`Follow mode: ${mode}`, "cyan"));
  }

  getFollowMode(): string {
    return this.followMode;
  }
}

