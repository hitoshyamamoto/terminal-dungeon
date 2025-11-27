// ============================================================================
// GAME ENGINE - Server-authoritative FSM and rules
// ============================================================================

import type {
  GameState,
  GamePhase,
  Player,
  Card,
  MonsterCard,
  ItemCard,
  FightState,
  DoorCard,
  TreasureCard,
  LobbyManifest,
  CardTier,
} from "../shared/types.js";
import {
  DEFAULT_MAX_LEVEL,
  DEFAULT_HAND_LIMIT,
} from "../shared/types.js";
import { calculatePower } from "../shared/utils.js";
import { drawCardWithTier, drawCards, shuffle } from "../shared/deck-loader.js";
import type { LoadedDeck } from "../shared/deck-loader.js";

export interface GameAction {
  playerId: string;
  kind: string;
  cardId?: string;
  target?: string;
  offer?: string;
  value?: number;
}

export interface GameResult {
  success: boolean;
  error?: string;
  events: string[];
  stateChanged: boolean;
}

export class Game {
  state: GameState;
  manifest: LobbyManifest;
  doorsDeck: LoadedDeck;
  treasuresDeck: LoadedDeck;
  eventLog: string[] = [];

  constructor(
    playerIds: string[],
    playerNames: Map<string, string>,
    doorsDeck: LoadedDeck,
    treasuresDeck: LoadedDeck,
    manifest?: Partial<LobbyManifest>
  ) {
    this.doorsDeck = doorsDeck;
    this.treasuresDeck = treasuresDeck;

    // Initialize manifest
    this.manifest = {
      maxLevel: manifest?.maxLevel || DEFAULT_MAX_LEVEL,
      tiersEnabled: manifest?.tiersEnabled ?? true,
      tierWindows: manifest?.tierWindows || {
        "1": [1, 5],
        "2": [6, 10],
        "3": [11, 15],
      },
      tierWeights: manifest?.tierWeights || {
        "1": 0.6,
        "2": 0.3,
        "3": 0.1,
      },
    };

    // Create shuffled decks
    const doors = [...doorsDeck.cards];
    const treasures = [...treasuresDeck.cards];
    shuffle(doors);
    shuffle(treasures);

    // Initialize players
    const players: Record<string, Player> = {};
    for (const id of playerIds) {
      players[id] = {
        id,
        name: playerNames.get(id) || id,
        level: 1,
        hand: [],
        equipped: [],
        isDead: false,
        levelUpsThisTurn: 0,
      };
    }

    // Deal initial hands: 4 doors + 4 treasures each
    for (const id of playerIds) {
      const player = players[id];
      player.hand.push(...drawCards(doors, 4, player.level, doorsDeck.cardsByTier));
      player.hand.push(...drawCards(treasures, 4, player.level, treasuresDeck.cardsByTier));
    }

    this.state = {
      rev: 0,
      phase: "OPEN_DOOR",
      activePlayer: playerIds[0],
      players,
      turnOrder: [...playerIds],
      currentTurnIndex: 0,
      doorsDeck: doors,
      treasuresDeck: treasures,
      doorsDiscard: [],
      treasuresDiscard: [],
      maxLevel: this.manifest.maxLevel,
      foughtThisTurn: false,
    };
  }

  /**
   * Process an action and return the result
   */
  processAction(action: GameAction): GameResult {
    const events: string[] = [];
    const player = this.state.players[action.playerId];

    if (!player) {
      return {
        success: false,
        error: "Player not found.",
        events: [],
        stateChanged: false,
      };
    }

    // Route to appropriate handler
    switch (action.kind) {
      case "OPEN":
        return this.handleOpen(action, events);
      case "PROVOKE":
        return this.handleProvoke(action, events);
      case "FIGHT":
        return this.handleFight(action, events);
      case "FLEE":
        return this.handleFlee(action, events);
      case "HELP":
        return this.handleHelp(action, events);
      case "ACCEPT":
        return this.handleAccept(action, events);
      case "DECLINE":
        return this.handleDecline(action, events);
      case "MOD":
        return this.handleMod(action, events);
      case "PLAY":
        return this.handlePlay(action, events);
      case "EQUIP":
        return this.handleEquip(action, events);
      case "UNEQUIP":
        return this.handleUnequip(action, events);
      case "LEVELUP":
        return this.handleLevelUp(action, events);
      case "DISCARD":
        return this.handleDiscard(action, events);
      case "LOOT":
        return this.handleLoot(action, events);
      case "END":
        return this.handleEnd(action, events);
      default:
        return {
          success: false,
          error: "Unknown action.",
          events: [],
          stateChanged: false,
        };
    }
  }

  private handleOpen(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "OPEN_DOOR") {
      return {
        success: false,
        error: `Invalid in this phase. Options: ${this.getValidCommands().join(" | ")}`,
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId !== this.state.activePlayer) {
      return {
        success: false,
        error: "Not your turn.",
        events: [],
        stateChanged: false,
      };
    }

    const player = this.state.players[action.playerId];
    const card = drawCardWithTier(
      this.state.doorsDeck,
      player.level,
      this.doorsDeck.cardsByTier
    );

    if (!card) {
      events.push("@you tried to open a door, but the deck is empty!");
      this.state.phase = "LOOT";
      this.state.rev++;
      return { success: true, events, stateChanged: true };
    }

    const doorCard = card as DoorCard;

    if (doorCard.type === "monster") {
      const monster = doorCard as MonsterCard;
      events.push(
        `@you opened a Door and found ${monster.name} Lvl ${monster.level} (${monster.treasures} treasures).`
      );

      this.state.fight = {
        monster,
        attacker: action.playerId,
        modifiers: 0,
        modifierCount: 0,
        playerPower: calculatePower(player),
        monsterPower: monster.level,
      };
      this.state.phase = "FIGHT";
      this.state.foughtThisTurn = true;
    } else if (doorCard.type === "curse") {
      events.push(`@you opened a Door: ${doorCard.name} - ${doorCard.effect}`);
      events.push(`Curse applied!`);
      this.state.doorsDiscard.push(doorCard);
      this.state.phase = "OPTIONAL_TROUBLE";
    } else {
      // event
      events.push(`@you opened a Door: ${doorCard.name} - ${doorCard.effect}`);
      this.state.doorsDiscard.push(doorCard);
      this.state.phase = "OPTIONAL_TROUBLE";
    }

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleProvoke(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "OPTIONAL_TROUBLE") {
      return {
        success: false,
        error: `Can only provoke trouble during OPTIONAL_TROUBLE phase.`,
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId !== this.state.activePlayer) {
      return {
        success: false,
        error: "Not your turn.",
        events: [],
        stateChanged: false,
      };
    }

    if (this.state.foughtThisTurn) {
      return {
        success: false,
        error: "Already fought this turn.",
        events: [],
        stateChanged: false,
      };
    }

    const player = this.state.players[action.playerId];
    const card = player.hand.find((c) => c.id === action.cardId);

    if (!card) {
      return {
        success: false,
        error: `Card ${action.cardId} not in your hand.`,
        events: [],
        stateChanged: false,
      };
    }

    if (card.type !== "monster") {
      return {
        success: false,
        error: "Can only provoke with a monster card.",
        events: [],
        stateChanged: false,
      };
    }

    const monster = card as MonsterCard;
    player.hand = player.hand.filter((c) => c.id !== action.cardId);

    events.push(
      `@you provoked trouble with ${monster.name} Lvl ${monster.level}!`
    );

    this.state.fight = {
      monster,
      attacker: action.playerId,
      modifiers: 0,
      modifierCount: 0,
      playerPower: calculatePower(player),
      monsterPower: monster.level,
    };
    this.state.phase = "FIGHT";
    this.state.foughtThisTurn = true;
    this.state.rev++;

    return { success: true, events, stateChanged: true };
  }

  private handleFight(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "FIGHT") {
      return {
        success: false,
        error: "No fight in progress.",
        events: [],
        stateChanged: false,
      };
    }

    if (!this.state.fight) {
      return {
        success: false,
        error: "No fight state.",
        events: [],
        stateChanged: false,
      };
    }

    const fight = this.state.fight;
    const player = this.state.players[fight.attacker];
    
    let totalPlayerPower = fight.playerPower;
    if (fight.helper && fight.helperPower) {
      totalPlayerPower += fight.helperPower;
    }

    const totalMonsterPower = fight.monsterPower + fight.modifiers;

    if (totalPlayerPower >= totalMonsterPower) {
      // Victory!
      events.push(
        `Victory! @${player.name} defeated ${fight.monster.name}. ${fight.monster.reward}`
      );

      // Apply rewards
      player.level += 1;
      const treasures = drawCards(
        this.state.treasuresDeck,
        fight.monster.treasures,
        player.level,
        this.treasuresDeck.cardsByTier
      );
      player.hand.push(...treasures);

      events.push(
        `@${player.name} gained +1 level and drew ${fight.monster.treasures} treasures.`
      );

      // Helper reward (if negotiated)
      if (fight.helper && fight.helperOffer) {
        const helper = this.state.players[fight.helper];
        events.push(`@${helper.name} receives their agreed reward: ${fight.helperOffer}`);
      }

      this.state.doorsDiscard.push(fight.monster);
      this.state.fight = undefined;
      this.state.phase = "END_TURN";
    } else {
      // Defeat!
      events.push(
        `@${player.name} lost the fight against ${fight.monster.name}!`
      );
      events.push(`You can attempt to flee (5-6 on d6) or accept the penalty.`);
      return {
        success: false,
        error: "Lost the fight. Use 'flee' to attempt escape.",
        events,
        stateChanged: true,
      };
    }

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleFlee(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "FIGHT") {
      return {
        success: false,
        error: "No fight in progress.",
        events: [],
        stateChanged: false,
      };
    }

    if (!this.state.fight) {
      return {
        success: false,
        error: "No fight state.",
        events: [],
        stateChanged: false,
      };
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    events.push(`@you rolled a ${roll}.`);

    if (roll >= 5) {
      events.push("You escaped!");
      this.state.doorsDiscard.push(this.state.fight.monster);
      this.state.fight = undefined;
      this.state.phase = "END_TURN";
    } else {
      events.push("Failed to escape!");
      if (this.state.fight.monster.penalty) {
        events.push(`Penalty: ${this.state.fight.monster.penalty}`);
      }
      // Apply death (simplified)
      const player = this.state.players[action.playerId];
      this.applyDeath(player, events);
      this.state.doorsDiscard.push(this.state.fight.monster);
      this.state.fight = undefined;
      this.state.phase = "END_TURN";
    }

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleHelp(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "FIGHT") {
      return {
        success: false,
        error: "No fight in progress.",
        events: [],
        stateChanged: false,
      };
    }

    if (!this.state.fight) {
      return {
        success: false,
        error: "No fight state.",
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId === this.state.fight.attacker) {
      return {
        success: false,
        error: "Cannot help yourself.",
        events: [],
        stateChanged: false,
      };
    }

    if (this.state.fight.helper) {
      return {
        success: false,
        error: "Someone is already helping.",
        events: [],
        stateChanged: false,
      };
    }

    const helper = this.state.players[action.playerId];
    this.state.fight.helper = action.playerId;
    this.state.fight.helperOffer = action.offer || "help";
    this.state.fight.helperPower = calculatePower(helper);

    events.push(
      `@${helper.name} offers to help with: ${this.state.fight.helperOffer}`
    );
    events.push(
      `@${this.state.players[this.state.fight.attacker].name} must 'accept' or 'decline'.`
    );

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleAccept(action: GameAction, events: string[]): GameResult {
    if (!this.state.fight || !this.state.fight.helper) {
      return {
        success: false,
        error: "No help offer to accept.",
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId !== this.state.fight.attacker) {
      return {
        success: false,
        error: "Only the attacker can accept help.",
        events: [],
        stateChanged: false,
      };
    }

    const helper = this.state.players[this.state.fight.helper];
    events.push(`@you accepted help from @${helper.name}!`);

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleDecline(action: GameAction, events: string[]): GameResult {
    if (!this.state.fight || !this.state.fight.helper) {
      return {
        success: false,
        error: "No help offer to decline.",
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId !== this.state.fight.attacker) {
      return {
        success: false,
        error: "Only the attacker can decline help.",
        events: [],
        stateChanged: false,
      };
    }

    const helper = this.state.players[this.state.fight.helper];
    events.push(`@you declined help from @${helper.name}.`);

    this.state.fight.helper = undefined;
    this.state.fight.helperOffer = undefined;
    this.state.fight.helperPower = undefined;

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleMod(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "FIGHT") {
      return {
        success: false,
        error: "No fight in progress.",
        events: [],
        stateChanged: false,
      };
    }

    if (!this.state.fight) {
      return {
        success: false,
        error: "No fight state.",
        events: [],
        stateChanged: false,
      };
    }

    if (this.state.fight.modifierCount >= 1) {
      return {
        success: false,
        error: "Modifier limit reached (max 1 per Monster).",
        events: [],
        stateChanged: false,
      };
    }

    const value = action.value || 0;
    this.state.fight.modifiers += value;
    this.state.fight.modifierCount++;

    const player = this.state.players[action.playerId];
    events.push(`@${player.name} played ${value > 0 ? "+" : ""}${value} on the Monster.`);

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handlePlay(action: GameAction, events: string[]): GameResult {
    const player = this.state.players[action.playerId];
    const card = player.hand.find((c) => c.id === action.cardId);

    if (!card) {
      return {
        success: false,
        error: `Card ${action.cardId} not in your hand.`,
        events: [],
        stateChanged: false,
      };
    }

    if (card.type === "inst") {
      // Instant card (e.g., potion in fight)
      if (this.state.phase === "FIGHT") {
        events.push(`@you played ${card.name}: ${card.effect}`);
        player.hand = player.hand.filter((c) => c.id !== action.cardId);
        this.state.treasuresDiscard.push(card);
        this.state.rev++;
        return { success: true, events, stateChanged: true };
      } else {
        return {
          success: false,
          error: "Can only play instant cards during a fight.",
          events: [],
          stateChanged: false,
        };
      }
    }

    return {
      success: false,
      error: "Use 'equip' for items or 'levelup' for level cards.",
      events: [],
      stateChanged: false,
    };
  }

  private handleEquip(action: GameAction, events: string[]): GameResult {
    const player = this.state.players[action.playerId];
    const card = player.hand.find((c) => c.id === action.cardId);

    if (!card) {
      return {
        success: false,
        error: `Card ${action.cardId} not in your hand.`,
        events: [],
        stateChanged: false,
      };
    }

    if (card.type !== "item") {
      return {
        success: false,
        error: "Can only equip item cards.",
        events: [],
        stateChanged: false,
      };
    }

    const item = card as ItemCard;
    player.hand = player.hand.filter((c) => c.id !== action.cardId);
    player.equipped.push(item);

    events.push(`@you equipped ${item.name} (+${item.bonus}).`);

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleUnequip(action: GameAction, events: string[]): GameResult {
    const player = this.state.players[action.playerId];
    const item = player.equipped.find((c) => c.id === action.cardId);

    if (!item) {
      return {
        success: false,
        error: `Item ${action.cardId} not equipped.`,
        events: [],
        stateChanged: false,
      };
    }

    player.equipped = player.equipped.filter((c) => c.id !== action.cardId);
    player.hand.push(item);

    events.push(`@you unequipped ${item.name}.`);

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleLevelUp(action: GameAction, events: string[]): GameResult {
    const player = this.state.players[action.playerId];

    if (player.levelUpsThisTurn >= 1) {
      return {
        success: false,
        error: "Already used 1 'Go Up a Level' this turn.",
        events: [],
        stateChanged: false,
      };
    }

    const card = player.hand.find((c) => c.type === "levelup");

    if (!card) {
      return {
        success: false,
        error: "No 'Go Up a Level' card in hand.",
        events: [],
        stateChanged: false,
      };
    }

    player.hand = player.hand.filter((c) => c.id !== card.id);
    player.level++;
    player.levelUpsThisTurn++;

    events.push(`@you used ${card.name}. Level is now ${player.level}.`);

    this.state.treasuresDiscard.push(card);
    this.state.rev++;

    return { success: true, events, stateChanged: true };
  }

  private handleDiscard(action: GameAction, events: string[]): GameResult {
    const player = this.state.players[action.playerId];
    const card = player.hand.find((c) => c.id === action.cardId);

    if (!card) {
      return {
        success: false,
        error: `Card ${action.cardId} not in your hand.`,
        events: [],
        stateChanged: false,
      };
    }

    player.hand = player.hand.filter((c) => c.id !== action.cardId);

    if ("level" in card) {
      this.state.doorsDiscard.push(card as DoorCard);
    } else {
      this.state.treasuresDiscard.push(card as TreasureCard);
    }

    events.push(`@you discarded ${card.name}.`);

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private handleLoot(action: GameAction, events: string[]): GameResult {
    if (this.state.phase !== "OPTIONAL_TROUBLE" && this.state.phase !== "LOOT") {
      return {
        success: false,
        error: "Cannot loot in this phase.",
        events: [],
        stateChanged: false,
      };
    }

    if (action.playerId !== this.state.activePlayer) {
      return {
        success: false,
        error: "Not your turn.",
        events: [],
        stateChanged: false,
      };
    }

    if (this.state.foughtThisTurn) {
      return {
        success: false,
        error: "Already fought this turn; cannot loot.",
        events: [],
        stateChanged: false,
      };
    }

    const player = this.state.players[action.playerId];
    const card = drawCardWithTier(
      this.state.doorsDeck,
      player.level,
      this.doorsDeck.cardsByTier
    );

    if (card) {
      player.hand.push(card);
      events.push(`@you looted the room and drew a face-down Door card.`);
    } else {
      events.push(`@you tried to loot, but the deck is empty!`);
    }

    this.state.phase = "END_TURN";
    this.state.rev++;

    return { success: true, events, stateChanged: true };
  }

  private handleEnd(action: GameAction, events: string[]): GameResult {
    if (action.playerId !== this.state.activePlayer) {
      return {
        success: false,
        error: "Not your turn.",
        events: [],
        stateChanged: false,
      };
    }

    const player = this.state.players[action.playerId];

    // Check for victory
    if (player.level >= this.state.maxLevel) {
      events.push(
        `🎉 @${player.name} reached Level ${this.state.maxLevel} and WINS THE GAME! 🎉`
      );
      this.state.phase = "LOBBY";
      this.state.rev++;
      return { success: true, events, stateChanged: true };
    }

    // Enforce hand limit
    const excess = player.hand.length - DEFAULT_HAND_LIMIT;
    if (excess > 0) {
      events.push(
        `@you have ${player.hand.length} cards (limit ${DEFAULT_HAND_LIMIT}). Discard ${excess} to the lowest-level player.`
      );

      // Find lowest level player (not self)
      const lowestPlayer = this.findLowestLevelPlayer(action.playerId);
      if (lowestPlayer) {
        const discarded = player.hand.splice(0, excess);
        lowestPlayer.hand.push(...discarded);
        events.push(
          `@you donated ${excess} cards to @${lowestPlayer.name}.`
        );
      } else {
        // Fallback: just discard
        const discarded = player.hand.splice(0, excess);
        this.state.doorsDiscard.push(...discarded.filter((c) => "level" in c) as DoorCard[]);
        this.state.treasuresDiscard.push(...discarded.filter((c) => !("level" in c)) as TreasureCard[]);
      }
    }

    // Reset turn state
    player.levelUpsThisTurn = 0;

    // Next player
    this.state.currentTurnIndex =
      (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
    this.state.activePlayer = this.state.turnOrder[this.state.currentTurnIndex];
    this.state.phase = "OPEN_DOOR";
    this.state.foughtThisTurn = false;

    events.push(
      `Turn ends. @${this.state.players[this.state.activePlayer].name}'s turn!`
    );

    this.state.rev++;
    return { success: true, events, stateChanged: true };
  }

  private applyDeath(player: Player, events: string[]): void {
    // Lose items
    this.state.treasuresDiscard.push(...player.equipped);
    player.equipped = [];

    // -1 Level (min 1)
    player.level = Math.max(1, player.level - 1);

    events.push(
      `@${player.name} died! Lost all items and -1 level. Will draw 4+4 cards next turn.`
    );

    player.isDead = true;
  }

  private findLowestLevelPlayer(excludeId: string): Player | null {
    let lowest: Player | null = null;
    let lowestLevel = Infinity;

    for (const id of this.state.turnOrder) {
      if (id === excludeId) continue;
      const p = this.state.players[id];
      if (p.level < lowestLevel) {
        lowestLevel = p.level;
        lowest = p;
      }
    }

    return lowest;
  }

  private getValidCommands(): string[] {
    const player = this.state.players[this.state.activePlayer];
    const commands: string[] = [];

    switch (this.state.phase) {
      case "OPEN_DOOR":
        commands.push("open", "end");
        break;
      case "FIGHT":
        commands.push("fight", "flee", "play", "help", "accept", "decline", "mod");
        break;
      case "OPTIONAL_TROUBLE":
        commands.push("provoke", "loot", "end");
        break;
      case "LOOT":
        commands.push("loot", "end");
        break;
      case "END_TURN":
        commands.push("end", "discard");
        break;
    }

    return commands;
  }
}

