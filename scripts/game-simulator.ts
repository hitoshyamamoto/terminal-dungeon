// ============================================================================
// GAME SIMULATOR - Visual debug tool for watching simulated games
// ============================================================================

import { Lobby } from "../server/lobby.js";
import { Game } from "../server/game.js";
import { loadDecksFromDir } from "../shared/deck-loader.js";
import { generateLobbyCode, generateLobbyId, hashPassword } from "../shared/utils.js";
import type { GamePhase } from "../shared/types.js";

interface SimulationConfig {
  numPlayers: number;
  maxTurns: number;
  verbose: boolean;
  pauseBetweenActions?: number;
}

export class GameSimulator {
  private lobby!: Lobby;
  private game!: Game;
  private playerIds: string[] = [];
  private playerNames: Map<string, string> = new Map();
  private config: SimulationConfig;
  private turnCount: number = 0;
  private actionCount: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.log("🎮 Initializing Game Simulator", "cyan");
    this.log(`Players: ${this.config.numPlayers}`, "dim");
    this.log(`Max Turns: ${this.config.maxTurns}`, "dim");
    this.log("");

    // Create lobby
    const lobbyId = generateLobbyId();
    const code = generateLobbyCode();
    const passwordHash = await hashPassword("sim");
    this.lobby = new Lobby(lobbyId, code, "p0", "Simulation", passwordHash);

    // Add players
    for (let i = 0; i < this.config.numPlayers; i++) {
      const playerId = `p${i}`;
      const playerName = `Player${i + 1}`;
      this.lobby.addPlayer(playerId, playerName);
      this.playerIds.push(playerId);
      this.playerNames.set(playerId, playerName);
      this.log(`  Added ${playerName} (${playerId})`, "green");
    }

    // Load decks
    const doorDecks = loadDecksFromDir("./decks/doors", "doors");
    const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");
    const doorDeck = Array.from(doorDecks.values())[0];
    const treasureDeck = Array.from(treasureDecks.values())[0];

    this.log(`\n📦 Loaded ${doorDeck.cards.length} door cards, ${treasureDeck.cards.length} treasure cards`, "cyan");

    // Create game
    this.game = new Game(
      this.playerIds,
      this.playerNames,
      doorDeck,
      treasureDeck,
      this.lobby.manifest
    );

    this.log("\n✅ Game initialized!\n", "green");
  }

  async simulate(): Promise<void> {
    this.log("=" .repeat(80), "cyan");
    this.log("GAME SIMULATION START", "cyan");
    this.log("=".repeat(80), "cyan");
    this.log("");

    let safetyCounter = 0;
    const maxActions = this.config.maxTurns * 10; // Safety limit

    while (this.turnCount < this.config.maxTurns && safetyCounter < maxActions) {
      safetyCounter++;

      const activePlayerId = this.game.state.activePlayer;
      const playerName = this.playerNames.get(activePlayerId)!;
      const phase = this.game.state.phase;

      this.logAction(playerName, phase);

      // Execute action based on phase
      const success = await this.executePhaseAction(activePlayerId, phase);

      if (!success) {
        this.log(`  ⚠️  Failed to execute action in ${phase} phase`, "yellow");
      }

      // Check if turn completed
      if (this.game.state.activePlayer !== activePlayerId) {
        this.turnCount++;
        this.logTurnComplete(this.turnCount);
      }

      // Pause if configured
      if (this.config.pauseBetweenActions) {
        await this.sleep(this.config.pauseBetweenActions);
      }
    }

    this.log("\n" + "=".repeat(80), "cyan");
    this.log("GAME SIMULATION END", "cyan");
    this.log("=".repeat(80), "cyan");
    this.logFinalStats();
  }

  private async executePhaseAction(playerId: string, phase: GamePhase): Promise<boolean> {
    this.actionCount++;

    switch (phase) {
      case "OPEN_DOOR":
        return this.executeOpen(playerId);

      case "FIGHT":
        return this.executeFight(playerId);

      case "LOOT":
        return this.executeLoot(playerId);

      case "OPTIONAL_TROUBLE":
      case "END_TURN":
        return this.executeEnd(playerId);

      default:
        return false;
    }
  }

  private executeOpen(playerId: string): boolean {
    const result = this.game.processAction({ playerId, kind: "OPEN" });

    if (result.success && this.config.verbose) {
      for (const event of result.events) {
        this.log(`    📢 ${event}`, "dim");
      }
    }

    return result.success;
  }

  private executeFight(playerId: string): boolean {
    const fight = this.game.state.fight;

    if (!fight) return false;

    // Decide: fight or flee based on power
    const canWin = fight.playerPower >= fight.monsterPower;

    if (canWin) {
      const result = this.game.processAction({ playerId, kind: "FIGHT" });

      if (this.config.verbose) {
        this.log(`    ⚔️  Fighting! Power: ${fight.playerPower} vs ${fight.monsterPower}`, "dim");
        for (const event of result.events) {
          this.log(`    📢 ${event}`, "dim");
        }
      }

      return result.success;
    } else {
      const result = this.game.processAction({ playerId, kind: "FLEE" });

      if (this.config.verbose) {
        this.log(`    🏃 Fleeing! Power too low: ${fight.playerPower} vs ${fight.monsterPower}`, "dim");
        for (const event of result.events) {
          this.log(`    📢 ${event}`, "dim");
        }
      }

      return true; // Fleeing always "succeeds" as an action
    }
  }

  private executeLoot(playerId: string): boolean {
    const result = this.game.processAction({ playerId, kind: "LOOT" });

    if (result.success && this.config.verbose) {
      for (const event of result.events) {
        this.log(`    📢 ${event}`, "dim");
      }
    }

    return result.success;
  }

  private executeEnd(playerId: string): boolean {
    const result = this.game.processAction({ playerId, kind: "END" });

    if (result.success && this.config.verbose) {
      for (const event of result.events) {
        this.log(`    📢 ${event}`, "dim");
      }
    }

    return result.success;
  }

  private logAction(playerName: string, phase: GamePhase): void {
    const phaseEmoji = {
      OPEN_DOOR: "🚪",
      FIGHT: "⚔️",
      OPTIONAL_TROUBLE: "🎲",
      LOOT: "💎",
      END_TURN: "🔚",
      LOBBY: "🏠",
    };

    this.log(`${phaseEmoji[phase] || "▶️"}  ${playerName} - ${phase}`, "bright");
  }

  private logTurnComplete(turnNumber: number): void {
    this.log(`\n  ✓ Turn ${turnNumber} completed\n`, "green");
  }

  private logFinalStats(): void {
    this.log("\n📊 FINAL STATISTICS", "cyan");
    this.log("-".repeat(80), "dim");

    for (const playerId of this.playerIds) {
      const player = this.game.state.players[playerId];
      const name = this.playerNames.get(playerId)!;

      this.log(`\n${name}:`, "bright");
      this.log(`  Level: ${player.level}`, "dim");
      this.log(`  Hand: ${player.hand.length} cards`, "dim");
      this.log(`  Equipped: ${player.equipped.length} items`, "dim");
      this.log(`  Dead: ${player.isDead ? "Yes" : "No"}`, "dim");

      if (player.equipped.length > 0) {
        this.log(`  Items:`, "dim");
        for (const item of player.equipped) {
          this.log(`    - ${item.name} (+${item.bonus})`, "dim");
        }
      }
    }

    this.log(`\n📈 Game Stats:`, "cyan");
    this.log(`  Total Turns: ${this.turnCount}`, "dim");
    this.log(`  Total Actions: ${this.actionCount}`, "dim");
    this.log(`  Cards in Doors Deck: ${this.game.state.doorsDeck.length}`, "dim");
    this.log(`  Cards in Treasures Deck: ${this.game.state.treasuresDeck.length}`, "dim");
    this.log("");
  }

  private log(message: string, color: "cyan" | "green" | "yellow" | "red" | "dim" | "bright" = "dim"): void {
    const colors = {
      cyan: "\x1b[36m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      red: "\x1b[31m",
      dim: "\x1b[2m",
      bright: "\x1b[1m",
    };

    const reset = "\x1b[0m";
    console.log(`${colors[color]}${message}${reset}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// RUN SIMULATION
// ============================================================================

async function runSimulation() {
  const configs: SimulationConfig[] = [
    {
      numPlayers: 2,
      maxTurns: 3,
      verbose: true,
    },
    {
      numPlayers: 4,
      maxTurns: 2,
      verbose: true,
    },
    {
      numPlayers: 6,
      maxTurns: 2,
      verbose: false, // Less verbose for 6 players
    },
  ];

  for (const config of configs) {
    const simulator = new GameSimulator(config);
    await simulator.initialize();
    await simulator.simulate();
    console.log("\n");
  }

  console.log("🎉 All simulations completed!\n");
}

runSimulation().catch(console.error);
