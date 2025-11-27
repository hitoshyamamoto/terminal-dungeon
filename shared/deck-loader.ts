// ============================================================================
// DECK LOADER - Load and validate YAML decks with tier support
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { DoorsDeckSchema, TreasuresDeckSchema } from "./schemas.js";
import type {
  DeckDefinition,
  DeckKind,
  Card,
  CardTier,
  TierAccess,
} from "./types.js";
import { getTierAccess } from "./types.js";

export interface LoadedDeck {
  definition: DeckDefinition;
  cards: Card[];
  cardsByTier: Map<CardTier, Card[]>;
}

/**
 * Expands cards with the "repeat" field into multiple instances
 */
function expandRepeats(cards: any[]): Card[] {
  const expanded: Card[] = [];

  for (const card of cards) {
    const repeat = card.repeat || 1;
    delete card.repeat; // Remove repeat field from final card

    if (repeat === 1) {
      expanded.push(card);
    } else {
      for (let i = 1; i <= repeat; i++) {
        const instance = { ...card, id: `${card.id}-${i}` };
        expanded.push(instance);
      }
    }
  }

  return expanded;
}

/**
 * Load a deck from a YAML file
 */
export function loadDeck(filePath: string, kind: DeckKind): LoadedDeck {
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(content);

  // Validate schema
  const schema = kind === "doors" ? DoorsDeckSchema : TreasuresDeckSchema;
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid ${kind} deck at ${filePath}: ${result.error.message}`
    );
  }

  const deckData = (parsed as any).deck;

  // Expand repeats
  const cards = expandRepeats(deckData.cards);

  // Build definition
  const definition: DeckDefinition = {
    kind,
    id: deckData.id,
    name: deckData.name,
    version: deckData.version,
    language: deckData.language,
    cards,
  };

  // Index by tier
  const cardsByTier = new Map<CardTier, Card[]>();
  cardsByTier.set(1, []);
  cardsByTier.set(2, []);
  cardsByTier.set(3, []);

  for (const card of cards) {
    cardsByTier.get(card.tier)!.push(card);
  }

  return { definition, cards, cardsByTier };
}

/**
 * Load all decks from a directory
 */
export function loadDecksFromDir(
  dirPath: string,
  kind: DeckKind
): Map<string, LoadedDeck> {
  const decks = new Map<string, LoadedDeck>();

  if (!fs.existsSync(dirPath)) {
    return decks;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file.endsWith(".yaml") || file.endsWith(".yml")) {
      const filePath = path.join(dirPath, file);
      try {
        const deck = loadDeck(filePath, kind);
        decks.set(deck.definition.id, deck);
      } catch (err) {
        console.error(`Failed to load deck ${filePath}:`, err);
      }
    }
  }

  return decks;
}

/**
 * Shuffle an array in place using Fisher-Yates
 */
export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Draw a card from a deck based on player level and tier probabilities
 */
export function drawCardWithTier(
  deck: Card[],
  playerLevel: number,
  cardsByTier: Map<CardTier, Card[]>
): Card | null {
  if (deck.length === 0) return null;

  const tierAccess = getTierAccess(playerLevel);
  const { tiers, probabilities } = tierAccess;

  // Select a tier based on probabilities
  const roll = Math.random();
  let cumulative = 0;
  let selectedTier: CardTier = 1;

  for (let i = 0; i < tiers.length; i++) {
    cumulative += probabilities[i];
    if (roll <= cumulative) {
      selectedTier = tiers[i];
      break;
    }
  }

  // Get available cards in the selected tier that are still in the deck
  const tierCards = cardsByTier.get(selectedTier) || [];
  const availableInTier = tierCards.filter((card) => deck.includes(card));

  if (availableInTier.length > 0) {
    // Pick a random card from the tier
    const card =
      availableInTier[Math.floor(Math.random() * availableInTier.length)];
    const index = deck.indexOf(card);
    if (index !== -1) {
      deck.splice(index, 1);
      return card;
    }
  }

  // Fallback: try lower tiers first, then higher
  const fallbackOrder = [1, 2, 3].filter((t) => t !== selectedTier);
  for (const tier of fallbackOrder) {
    const tierCards = cardsByTier.get(tier as CardTier) || [];
    const availableInTier = tierCards.filter((card) => deck.includes(card));
    if (availableInTier.length > 0) {
      const card =
        availableInTier[Math.floor(Math.random() * availableInTier.length)];
      const index = deck.indexOf(card);
      if (index !== -1) {
        deck.splice(index, 1);
        return card;
      }
    }
  }

  // Last resort: draw any card
  if (deck.length > 0) {
    return deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  }

  return null;
}

/**
 * Draw multiple cards
 */
export function drawCards(
  deck: Card[],
  count: number,
  playerLevel: number,
  cardsByTier: Map<CardTier, Card[]>
): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = drawCardWithTier(deck, playerLevel, cardsByTier);
    if (card) drawn.push(card);
  }
  return drawn;
}

/**
 * Merge multiple decks into one
 * Combines all cards from multiple decks and rebuilds tier indices
 */
export function mergeDecks(decks: LoadedDeck[]): LoadedDeck {
  if (decks.length === 0) {
    throw new Error("Cannot merge empty deck list");
  }

  if (decks.length === 1) {
    return decks[0];
  }

  // Verify all decks are the same kind
  const kind = decks[0].definition.kind;
  for (const deck of decks) {
    if (deck.definition.kind !== kind) {
      throw new Error(
        `Cannot merge decks of different kinds: ${kind} and ${deck.definition.kind}`
      );
    }
  }

  // Combine all cards
  const allCards: Card[] = [];
  for (const deck of decks) {
    allCards.push(...deck.cards);
  }

  // Create merged definition
  const deckIds = decks.map((d) => d.definition.id).join("+");
  const deckNames = decks.map((d) => d.definition.name).join(" + ");

  const mergedDefinition: DeckDefinition = {
    kind,
    id: deckIds,
    name: deckNames,
    version: decks[0].definition.version,
    language: decks[0].definition.language,
    cards: allCards,
  };

  // Rebuild tier index
  const cardsByTier = new Map<CardTier, Card[]>();
  cardsByTier.set(1, []);
  cardsByTier.set(2, []);
  cardsByTier.set(3, []);

  for (const card of allCards) {
    cardsByTier.get(card.tier)!.push(card);
  }

  return {
    definition: mergedDefinition,
    cards: allCards,
    cardsByTier,
  };
}

