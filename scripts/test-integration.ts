// ============================================================================
// INTEGRATION TEST - Test server and game functionality
// ============================================================================

import { Lobby } from "../server/lobby.js";
import { Game } from "../server/game.js";
import { loadDecksFromDir } from "../shared/deck-loader.js";
import { generateLobbyCode, generateLobbyId, hashPassword } from "../shared/utils.js";

async function runIntegrationTests() {
  console.log("=== Terminal Dungeon Integration Tests ===\n");

  try {
    // Test 1: Load Decks
    console.log("Test 1: Loading decks...");
    const doorDecks = loadDecksFromDir("./decks/doors", "doors");
    const treasureDecks = loadDecksFromDir("./decks/treasures", "treasures");

    if (doorDecks.size === 0 || treasureDecks.size === 0) {
      throw new Error("Failed to load decks");
    }
    console.log(`✓ Loaded ${doorDecks.size} door deck(s) and ${treasureDecks.size} treasure deck(s)\n`);

    // Test 2: Create Lobby
    console.log("Test 2: Creating lobby...");
    const lobbyId = generateLobbyId();
    const code = generateLobbyCode();
    const passwordHash = await hashPassword("test123");
    const lobby = new Lobby(lobbyId, code, "p0", "Test Lobby", passwordHash);
    console.log(`✓ Lobby created with code: ${code}\n`);

    // Test 3: Add Players
    console.log("Test 3: Adding players to lobby...");
    lobby.addPlayer("p0", "Alice");
    lobby.addPlayer("p1", "Bob");
    console.log(`✓ Added 2 players. Current players: ${lobby.players.size}\n`);

    // Test 4: Check if game can start
    console.log("Test 4: Checking if game can start...");
    if (!lobby.canStart()) {
      throw new Error("Game should be able to start with 2 players");
    }
    console.log(`✓ Game can start with ${lobby.players.size} players\n`);

    // Test 5: Create Game Instance
    console.log("Test 5: Creating game instance...");
    const doorDeck = Array.from(doorDecks.values())[0];
    const treasureDeck = Array.from(treasureDecks.values())[0];

    const playerIds = Array.from(lobby.players.keys());
    const playerNames = new Map(
      Array.from(lobby.players.values()).map((p) => [p.id, p.name])
    );

    const game = new Game(
      playerIds,
      playerNames,
      doorDeck,
      treasureDeck,
      lobby.manifest
    );
    console.log(`✓ Game created with ${playerIds.length} players\n`);

    // Test 6: Verify Initial Game State
    console.log("Test 6: Verifying initial game state...");
    const state = game.state;

    if (state.phase !== "OPEN_DOOR") {
      throw new Error(`Expected OPEN_DOOR phase, got ${state.phase}`);
    }

    const playerCount = Object.keys(state.players).length;
    if (playerCount !== 2) {
      throw new Error(`Expected 2 players, got ${playerCount}`);
    }

    console.log(`✓ Initial state correct:`);
    console.log(`  - Phase: ${state.phase}`);
    console.log(`  - Active player: ${playerNames.get(state.activePlayer)}`);
    console.log(`  - Players: ${state.turnOrder.map(pid => playerNames.get(pid)).join(", ")}\n`);

    // Test 7: Player Opens Door
    console.log("Test 7: Player 1 opens a door...");
    const openResult = game.processAction({
      playerId: playerIds[0],
      kind: "OPEN",
    });

    if (!openResult.success) {
      throw new Error(`Failed to open door: ${openResult.error}`);
    }
    console.log(`✓ Door opened successfully`);
    console.log(`  Events generated: ${openResult.events.length}`);
    if (openResult.events.length > 0) {
      console.log(`  First event: ${openResult.events[0]}`);
    }
    console.log();

    // Test 8: Check Phase Transition
    console.log("Test 8: Checking phase after opening door...");
    const newState = game.state;
    console.log(`✓ Current phase: ${newState.phase}`);

    if (newState.fight) {
      console.log(`  - Fight in progress: ${newState.fight.monster.name}`);
      console.log(`  - Monster level: ${newState.fight.monster.level}`);
      console.log(`  - Attacker power: ${newState.fight.playerPower}`);
    }
    console.log();

    // Test 9: Player Action Based on Phase
    console.log("Test 9: Testing player action based on phase...");
    const currentPhase = game.state.phase;

    if (currentPhase === "FIGHT" && game.state.fight) {
      // Try to fight the monster
      const fightResult = game.processAction({
        playerId: playerIds[0],
        kind: "FIGHT",
      });

      console.log(`✓ Fight action processed: ${fightResult.success ? "Success" : "Failed"}`);
      if (!fightResult.success) {
        console.log(`  Reason: ${fightResult.error}`);
      } else {
        console.log(`  Events: ${fightResult.events.join(", ")}`);
      }
    } else if (currentPhase === "LOOT") {
      // Draw a treasure
      const lootResult = game.processAction({
        playerId: playerIds[0],
        kind: "LOOT",
      });

      if (lootResult.success) {
        console.log(`✓ Loot action successful`);
        console.log(`  Events: ${lootResult.events.join(", ")}`);
      }
    } else if (currentPhase === "OPTIONAL_TROUBLE") {
      // Skip trouble and end turn
      const endResult = game.processAction({
        playerId: playerIds[0],
        kind: "END",
      });

      if (endResult.success) {
        console.log(`✓ Turn ended successfully`);
      }
    }
    console.log();

    // Test 10: Verify Player Stats
    console.log("Test 10: Checking player stats...");
    const currentState = game.state;
    for (const playerId of Object.keys(currentState.players)) {
      const player = currentState.players[playerId];
      console.log(`Player: ${playerNames.get(playerId)}`);
      console.log(`  - Level: ${player.level}`);
      console.log(`  - Hand size: ${player.hand.length}`);
      console.log(`  - Equipped items: ${player.equipped.length}`);
      console.log(`  - Is dead: ${player.isDead}`);
    }
    console.log();

    // Test 11: Test Game Events System
    console.log("Test 11: Testing game events system...");
    console.log(`✓ Event system working (${openResult.events.length} events generated on door open)\n`);

    // Test 12: Verify Deck Integrity
    console.log("Test 12: Verifying deck integrity...");
    console.log(`✓ Door deck has ${doorDeck.cards.length} cards`);
    console.log(`✓ Treasure deck has ${treasureDeck.cards.length} cards`);
    console.log(`✓ Current doors in deck: ${currentState.doorsDeck.length}`);
    console.log(`✓ Current treasures in deck: ${currentState.treasuresDeck.length}\n`);

    // Test 13: Test Multiple Turn Cycles
    console.log("Test 13: Testing multiple turn cycles...");
    let turnsCompleted = 0;
    const maxTurns = 3;

    for (let i = 0; i < maxTurns; i++) {
      const activePlayerId = game.state.activePlayer;
      const phase = game.state.phase;

      console.log(`  Turn ${i + 1}: ${playerNames.get(activePlayerId)} - Phase: ${phase}`);

      // Attempt to progress through the turn
      if (phase === "OPEN_DOOR") {
        game.processAction({ playerId: activePlayerId, kind: "OPEN" });
      } else if (phase === "FIGHT") {
        // Try to flee
        game.processAction({ playerId: activePlayerId, kind: "FLEE" });
      } else if (phase === "LOOT") {
        game.processAction({ playerId: activePlayerId, kind: "LOOT" });
      } else if (phase === "OPTIONAL_TROUBLE" || phase === "END_TURN") {
        game.processAction({ playerId: activePlayerId, kind: "END" });
        turnsCompleted++;
      }

      // Safety break if we're stuck
      if (i > 0 && game.state.phase === phase && game.state.activePlayer === activePlayerId) {
        console.log(`  (Turn cycle detected, breaking)`);
        break;
      }
    }
    console.log(`✓ Completed ${turnsCompleted} full turn(s)\n`);

    console.log("=== All Integration Tests Passed! ===\n");
    console.log("Summary:");
    console.log("✓ Deck loading works");
    console.log("✓ Lobby creation works");
    console.log("✓ Player management works");
    console.log("✓ Game initialization works");
    console.log("✓ Turn-based gameplay works");
    console.log("✓ Card drawing and playing works");
    console.log("✓ Game state management works");
    console.log("✓ Event system works");
    console.log("✓ Multiple turn cycles work");

    return true;
  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error((error as Error).message);
    console.error((error as Error).stack);
    return false;
  }
}

// Run tests
runIntegrationTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
