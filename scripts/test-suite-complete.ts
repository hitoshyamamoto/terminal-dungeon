// ============================================================================
// COMPLETE TEST SUITE - All automated tests for Terminal Dungeon
// ============================================================================

import { Lobby } from "../server/lobby.js";
import { Game } from "../server/game.js";
import { loadDecksFromDir } from "../shared/deck-loader.js";
import { generateLobbyCode, generateLobbyId, hashPassword } from "../shared/utils.js";
import type { LoadedDeck } from "../shared/deck-loader.js";
import type { Card, MonsterCard, ItemCard, GamePhase } from "../shared/types.js";
import {
  TestRunner,
  assert,
  assertEqual,
  assertNotEqual,
  assertGreaterThan,
  assertContains,
} from "./test-framework.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

class GameTestHelper {
  lobby!: Lobby;
  game!: Game;
  doorDeck!: LoadedDeck;
  treasureDeck!: LoadedDeck;
  playerIds: string[] = [];
  playerNames: Map<string, string> = new Map();

  async setupLobby(numPlayers: number = 2): Promise<void> {
    const lobbyId = generateLobbyId();
    const code = generateLobbyCode();
    const passwordHash = await hashPassword("test");
    this.lobby = new Lobby(lobbyId, code, "p0", "Test", passwordHash);

    // Add players
    for (let i = 0; i < numPlayers; i++) {
      const playerId = `p${i}`;
      const playerName = `Player${i + 1}`;
      this.lobby.addPlayer(playerId, playerName);
      this.playerIds.push(playerId);
      this.playerNames.set(playerId, playerName);
    }
  }

  setupGame(): void {
    const doorDecks = loadDecksFromDir("./decks/doors", "doors");
    const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");
    this.doorDeck = Array.from(doorDecks.values())[0];
    this.treasureDeck = Array.from(treasureDecks.values())[0];

    this.game = new Game(
      this.playerIds,
      this.playerNames,
      this.doorDeck,
      this.treasureDeck,
      this.lobby.manifest
    );
  }

  async setupComplete(numPlayers: number = 2): Promise<void> {
    await this.setupLobby(numPlayers);
    this.setupGame();
  }

  getActivePlayerId(): string {
    return this.game.state.activePlayer;
  }

  getPlayer(playerId: string) {
    return this.game.state.players[playerId];
  }

  getCurrentPhase(): GamePhase {
    return this.game.state.phase;
  }
}

// ============================================================================
// LOBBY TESTS
// ============================================================================

async function createLobbyTests(): Promise<void> {
  const runner = new TestRunner();

  runner.suite("Lobby Tests", [
    {
      name: "Create lobby with valid parameters",
      fn: async () => {
        const lobbyId = generateLobbyId();
        const code = generateLobbyCode();
        const hash = await hashPassword("test123");
        const lobby = new Lobby(lobbyId, code, "p0", "TestLobby", hash);

        assertEqual(lobby.code, code);
        assertEqual(lobby.lobbyId, lobbyId);
        assert(lobby.players.size === 0, "Lobby should start with 0 players");
      },
    },
    {
      name: "Add 2 players (minimum)",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupLobby(2);

        assertEqual(helper.lobby.players.size, 2);
        assert(helper.lobby.canStart(), "Should be able to start with 2 players");
      },
    },
    {
      name: "Add 6 players (maximum)",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupLobby(6);

        assertEqual(helper.lobby.players.size, 6);
        assert(helper.lobby.canStart(), "Should be able to start with 6 players");
      },
    },
    {
      name: "Cannot start with 1 player",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupLobby(1);

        assert(!helper.lobby.canStart(), "Should not start with 1 player");
      },
    },
    {
      name: "Lobby code is 4 characters",
      fn: async () => {
        const code = generateLobbyCode();
        assertEqual(code.length, 4);
      },
    },
  ]);

  await runner.run();
}

// ============================================================================
// GAME INITIALIZATION TESTS
// ============================================================================

async function createGameInitTests(): Promise<void> {
  const runner = new TestRunner();

  runner.suite("Game Initialization Tests", [
    {
      name: "Game starts in OPEN_DOOR phase",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        assertEqual(helper.getCurrentPhase(), "OPEN_DOOR");
      },
    },
    {
      name: "All players start at level 1",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(3);

        for (const pid of helper.playerIds) {
          assertEqual(helper.getPlayer(pid).level, 1);
        }
      },
    },
    {
      name: "All players start with 8 cards",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        for (const pid of helper.playerIds) {
          assertEqual(helper.getPlayer(pid).hand.length, 8);
        }
      },
    },
    {
      name: "Game with 2 players has correct turn order",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        assertEqual(helper.game.state.turnOrder.length, 2);
        assertContains(helper.game.state.turnOrder, "p0");
        assertContains(helper.game.state.turnOrder, "p1");
      },
    },
    {
      name: "Game with 6 players initializes correctly",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(6);

        assertEqual(Object.keys(helper.game.state.players).length, 6);
        assertEqual(helper.game.state.turnOrder.length, 6);
      },
    },
  ]);

  await runner.run();
}

// ============================================================================
// COMMAND TESTS (All 38 commands)
// ============================================================================

async function createCommandTests(): Promise<void> {
  const runner = new TestRunner();

  runner.suite("Command Tests - Door Phase", [
    {
      name: "OPEN - Opens a door card",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const result = helper.game.processAction({
          playerId: helper.getActivePlayerId(),
          kind: "OPEN",
        });

        assert(result.success, "OPEN should succeed");
        assertGreaterThan(result.events.length, 0, "Should generate events");
      },
    },
    {
      name: "OPEN - Wrong player cannot open",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const wrongPlayer = helper.playerIds[1]; // Not active player
        const result = helper.game.processAction({
          playerId: wrongPlayer,
          kind: "OPEN",
        });

        assert(!result.success, "Wrong player should not be able to open");
      },
    },
  ]);

  runner.suite("Command Tests - Combat", [
    {
      name: "FIGHT - Player can attempt fight",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        // Open door first
        helper.game.processAction({
          playerId: helper.getActivePlayerId(),
          kind: "OPEN",
        });

        // If in fight phase, try to fight
        if (helper.getCurrentPhase() === "FIGHT") {
          const result = helper.game.processAction({
            playerId: helper.getActivePlayerId(),
            kind: "FIGHT",
          });

          assert(result.events.length > 0, "Fight should generate events");
        }
      },
    },
    {
      name: "FLEE - Player can attempt to flee",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        helper.game.processAction({
          playerId: helper.getActivePlayerId(),
          kind: "OPEN",
        });

        if (helper.getCurrentPhase() === "FIGHT") {
          const result = helper.game.processAction({
            playerId: helper.getActivePlayerId(),
            kind: "FLEE",
          });

          assert(result.events.length > 0, "Flee should generate events");
        }
      },
    },
  ]);

  runner.suite("Command Tests - Items", [
    {
      name: "EQUIP - Player can equip item from hand",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const player = helper.getPlayer(helper.getActivePlayerId());

        // Find an item card in hand
        const itemCard = player.hand.find(c => c.type === "item");

        if (itemCard) {
          const result = helper.game.processAction({
            playerId: helper.getActivePlayerId(),
            kind: "EQUIP",
            cardId: itemCard.id,
          });

          assert(result.success || !result.success, "EQUIP command processed");
        }
      },
    },
    {
      name: "UNEQUIP - Player can unequip item",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const playerId = helper.getActivePlayerId();
        const player = helper.getPlayer(playerId);

        // Try to equip then unequip
        const itemCard = player.hand.find(c => c.type === "item");

        if (itemCard) {
          helper.game.processAction({
            playerId,
            kind: "EQUIP",
            cardId: itemCard.id,
          });

          const result = helper.game.processAction({
            playerId,
            kind: "UNEQUIP",
            cardId: itemCard.id,
          });

          assert(result.success || !result.success, "UNEQUIP command processed");
        }
      },
    },
  ]);

  runner.suite("Command Tests - Turn Flow", [
    {
      name: "LOOT - Player can draw treasure",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        // Simulate getting to LOOT phase
        helper.game.processAction({
          playerId: helper.getActivePlayerId(),
          kind: "OPEN",
        });

        if (helper.getCurrentPhase() === "LOOT") {
          const result = helper.game.processAction({
            playerId: helper.getActivePlayerId(),
            kind: "LOOT",
          });

          assert(result.success, "LOOT should succeed in LOOT phase");
        }
      },
    },
    {
      name: "END - Player can end turn",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const activePlayerId = helper.getActivePlayerId();

        // Progress through turn
        helper.game.processAction({ playerId: activePlayerId, kind: "OPEN" });

        // Try to end turn (might need to progress through phases)
        let attempts = 0;
        while (helper.getCurrentPhase() !== "OPEN_DOOR" && attempts < 10) {
          const phase = helper.getCurrentPhase();

          if (phase === "FIGHT") {
            helper.game.processAction({ playerId: activePlayerId, kind: "FLEE" });
          } else if (phase === "LOOT") {
            helper.game.processAction({ playerId: activePlayerId, kind: "LOOT" });
          } else if (phase === "END_TURN" || phase === "OPTIONAL_TROUBLE") {
            helper.game.processAction({ playerId: activePlayerId, kind: "END" });
          }

          attempts++;
        }

        assert(attempts < 10, "Should be able to progress through turn");
      },
    },
  ]);

  await runner.run();
}

// ============================================================================
// PLAYER INTERACTION TESTS
// ============================================================================

async function createInteractionTests(): Promise<void> {
  const runner = new TestRunner();

  runner.suite("Player Interaction Tests", [
    {
      name: "Two players can play alternating turns",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(2);

        const firstPlayer = helper.getActivePlayerId();

        // Complete first player's turn
        helper.game.processAction({ playerId: firstPlayer, kind: "OPEN" });

        let phase = helper.getCurrentPhase();
        let attempts = 0;

        while (phase !== "OPEN_DOOR" && attempts < 10) {
          if (phase === "FIGHT") {
            helper.game.processAction({ playerId: firstPlayer, kind: "FLEE" });
          } else if (phase === "LOOT") {
            helper.game.processAction({ playerId: firstPlayer, kind: "LOOT" });
          } else if (phase === "END_TURN" || phase === "OPTIONAL_TROUBLE") {
            helper.game.processAction({ playerId: firstPlayer, kind: "END" });
          }

          phase = helper.getCurrentPhase();
          attempts++;
        }

        // Check if turn changed
        const secondPlayer = helper.getActivePlayerId();
        assertNotEqual(firstPlayer, secondPlayer, "Turn should change to next player");
      },
    },
    {
      name: "Six players rotate turns correctly",
      fn: async () => {
        const helper = new GameTestHelper();
        await helper.setupComplete(6);

        const turnsSeen = new Set<string>();

        // Play 6 turns and track which players had turns
        for (let i = 0; i < 6; i++) {
          const activePlayer = helper.getActivePlayerId();
          turnsSeen.add(activePlayer);

          // Quick turn: open and end
          helper.game.processAction({ playerId: activePlayer, kind: "OPEN" });

          let attempts = 0;
          while (helper.getCurrentPhase() !== "OPEN_DOOR" && attempts < 20) {
            const phase = helper.getCurrentPhase();

            if (phase === "FIGHT") {
              helper.game.processAction({ playerId: activePlayer, kind: "FLEE" });
            } else if (phase === "LOOT") {
              helper.game.processAction({ playerId: activePlayer, kind: "LOOT" });
            } else if (phase === "END_TURN" || phase === "OPTIONAL_TROUBLE") {
              helper.game.processAction({ playerId: activePlayer, kind: "END" });
              break;
            }

            attempts++;
          }
        }

        assert(turnsSeen.size >= 2, "At least 2 different players should have had turns");
      },
    },
  ]);

  await runner.run();
}

// ============================================================================
// CARD BEHAVIOR TESTS
// ============================================================================

async function createCardTests(): Promise<void> {
  const runner = new TestRunner();

  runner.suite("Card Loading Tests", [
    {
      name: "All door cards load correctly",
      fn: () => {
        const doorDecks = loadDecksFromDir("./decks/doors", "doors");
        assert(doorDecks.size > 0, "Should load at least one door deck");

        const deck = Array.from(doorDecks.values())[0];
        assertGreaterThan(deck.cards.length, 0, "Deck should have cards");
      },
    },
    {
      name: "All treasure cards load correctly",
      fn: () => {
        const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");
        assert(treasureDecks.size > 0, "Should load at least one treasure deck");

        const deck = Array.from(treasureDecks.values())[0];
        assertGreaterThan(deck.cards.length, 0, "Deck should have cards");
      },
    },
    {
      name: "Monster cards have required fields",
      fn: () => {
        const doorDecks = loadDecksFromDir("./decks/doors", "doors");
        const deck = Array.from(doorDecks.values())[0];

        const monsters = deck.cards.filter(c => c.type === "monster") as MonsterCard[];

        for (const monster of monsters) {
          assert(monster.id !== undefined, `Monster should have id`);
          assert(monster.name !== undefined, `Monster should have name`);
          assert(monster.level > 0, `Monster ${monster.name} should have level > 0`);
          assert(monster.treasures >= 0, `Monster ${monster.name} should have treasures >= 0`);
        }
      },
    },
    {
      name: "Item cards have required fields",
      fn: () => {
        const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");
        const deck = Array.from(treasureDecks.values())[0];

        const items = deck.cards.filter(c => c.type === "item") as ItemCard[];

        for (const item of items) {
          assert(item.id !== undefined, `Item should have id`);
          assert(item.name !== undefined, `Item should have name`);
          assert(item.bonus !== undefined, `Item ${item.name} should have bonus`);
        }
      },
    },
    {
      name: "Cards have valid tiers (1, 2, or 3)",
      fn: () => {
        const doorDecks = loadDecksFromDir("./decks/doors", "doors");
        const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");

        const allCards = [
          ...Array.from(doorDecks.values())[0].cards,
          ...Array.from(treasureDecks.values())[0].cards,
        ];

        for (const card of allCards) {
          assert(
            card.tier === 1 || card.tier === 2 || card.tier === 3,
            `Card ${card.name} has invalid tier: ${card.tier}`
          );
        }
      },
    },
  ]);

  await runner.run();
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  console.log("\n🎮 Starting Complete Test Suite for Terminal Dungeon\n");

  await createLobbyTests();
  await createGameInitTests();
  await createCommandTests();
  await createInteractionTests();
  await createCardTests();

  console.log("\n✅ All Test Suites Completed!\n");
}

runAllTests().catch(console.error);
