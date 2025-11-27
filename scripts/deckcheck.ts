#!/usr/bin/env node
// ============================================================================
// DECK VALIDATION SCRIPT - Validate and analyze deck balance
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { loadDeck } from "../shared/deck-loader.js";
import type { DeckKind, CardTier, MonsterCard, ItemCard } from "../shared/types.js";
import { colorize } from "../shared/utils.js";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface DeckStats {
  totalCards: number;
  byTier: Record<CardTier, number>;
  byType: Record<string, number>;
  avgMonsterLevel?: Record<CardTier, number>;
  avgMonsterTreasures?: Record<CardTier, number>;
  avgItemBonus?: Record<CardTier, number>;
}

function validateDeckFile(filePath: string, kind: DeckKind): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const deck = loadDeck(filePath, kind);

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (const card of deck.cards) {
      if (ids.has(card.id)) {
        result.errors.push(`Duplicate card ID: ${card.id}`);
        result.valid = false;
      }
      ids.add(card.id);
    }

    // Minimum deck size
    if (deck.cards.length < 20) {
      result.warnings.push(
        `Deck has only ${deck.cards.length} cards. Recommended: at least 20.`
      );
    }

    // Tier-specific validation
    if (kind === "doors") {
      validateDoorsDeck(deck.cards, result);
    } else {
      validateTreasuresDeck(deck.cards, result);
    }

    return result;
  } catch (err) {
    result.valid = false;
    result.errors.push((err as Error).message);
    return result;
  }
}

function validateDoorsDeck(cards: any[], result: ValidationResult): void {
  const tierCounts: Record<CardTier, { monsters: number; curses: number; events: number }> = {
    1: { monsters: 0, curses: 0, events: 0 },
    2: { monsters: 0, curses: 0, events: 0 },
    3: { monsters: 0, curses: 0, events: 0 },
  };

  for (const card of cards) {
    const tier = card.tier as CardTier;

    if (card.type === "monster") {
      tierCounts[tier].monsters++;

      // Check monster level ranges
      if (tier === 1 && (card.level < 1 || card.level > 5)) {
        result.warnings.push(
          `Monster ${card.id} (${card.name}) is Tier 1 but level ${card.level}. Recommended: 1-5.`
        );
      } else if (tier === 2 && (card.level < 6 || card.level > 10)) {
        result.warnings.push(
          `Monster ${card.id} (${card.name}) is Tier 2 but level ${card.level}. Recommended: 6-10.`
        );
      } else if (tier === 3 && (card.level < 11 || card.level > 15)) {
        result.warnings.push(
          `Monster ${card.id} (${card.name}) is Tier 3 but level ${card.level}. Recommended: 11-15.`
        );
      }
    } else if (card.type === "curse") {
      tierCounts[tier].curses++;
    } else if (card.type === "event") {
      tierCounts[tier].events++;
    }
  }

  // Check curse/event frequency (15-20% recommended)
  const totalCards = cards.length;
  const totalCurses = tierCounts[1].curses + tierCounts[2].curses + tierCounts[3].curses;
  const cursePercent = (totalCurses / totalCards) * 100;

  if (cursePercent < 10) {
    result.warnings.push(
      `Only ${cursePercent.toFixed(1)}% curses. Recommended: 15-20%.`
    );
  } else if (cursePercent > 30) {
    result.warnings.push(
      `${cursePercent.toFixed(1)}% curses. Recommended: 15-20%.`
    );
  }
}

function validateTreasuresDeck(cards: any[], result: ValidationResult): void {
  const tierCounts: Record<CardTier, { items: number; inst: number; levelup: number }> = {
    1: { items: 0, inst: 0, levelup: 0 },
    2: { items: 0, inst: 0, levelup: 0 },
    3: { items: 0, inst: 0, levelup: 0 },
  };

  for (const card of cards) {
    const tier = card.tier as CardTier;

    if (card.type === "item") {
      tierCounts[tier].items++;

      // Check item bonus ranges
      if (tier === 1 && (card.bonus < 1 || card.bonus > 3)) {
        result.warnings.push(
          `Item ${card.id} (${card.name}) is Tier 1 but bonus ${card.bonus}. Recommended: 1-3.`
        );
      } else if (tier === 2 && (card.bonus < 3 || card.bonus > 5)) {
        result.warnings.push(
          `Item ${card.id} (${card.name}) is Tier 2 but bonus ${card.bonus}. Recommended: 3-5.`
        );
      } else if (tier === 3 && (card.bonus < 5 || card.bonus > 8)) {
        result.warnings.push(
          `Item ${card.id} (${card.name}) is Tier 3 but bonus ${card.bonus}. Recommended: 5-8.`
        );
      }
    } else if (card.type === "inst") {
      tierCounts[tier].inst++;
    } else if (card.type === "levelup") {
      tierCounts[tier].levelup++;
    }
  }

  // Check for level-up cards
  const totalLevelUps =
    tierCounts[1].levelup + tierCounts[2].levelup + tierCounts[3].levelup;

  if (totalLevelUps < 5) {
    result.warnings.push(
      `Only ${totalLevelUps} level-up cards. Recommended: at least 5.`
    );
  }
}

function calculateStats(cards: any[], kind: DeckKind): DeckStats {
  const stats: DeckStats = {
    totalCards: cards.length,
    byTier: { 1: 0, 2: 0, 3: 0 },
    byType: {},
  };

  // Count by tier and type
  for (const card of cards) {
    stats.byTier[card.tier as CardTier]++;
    stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;
  }

  if (kind === "doors") {
    // Monster stats
    const monstersByTier: Record<CardTier, MonsterCard[]> = { 1: [], 2: [], 3: [] };
    for (const card of cards) {
      if (card.type === "monster") {
        monstersByTier[card.tier as CardTier].push(card as MonsterCard);
      }
    }

    stats.avgMonsterLevel = {} as Record<CardTier, number>;
    stats.avgMonsterTreasures = {} as Record<CardTier, number>;

    for (const tier of [1, 2, 3] as CardTier[]) {
      const monsters = monstersByTier[tier];
      if (monsters.length > 0) {
        stats.avgMonsterLevel[tier] =
          monsters.reduce((sum, m) => sum + m.level, 0) / monsters.length;
        stats.avgMonsterTreasures[tier] =
          monsters.reduce((sum, m) => sum + m.treasures, 0) / monsters.length;
      }
    }
  } else {
    // Item stats
    const itemsByTier: Record<CardTier, ItemCard[]> = { 1: [], 2: [], 3: [] };
    for (const card of cards) {
      if (card.type === "item") {
        itemsByTier[card.tier as CardTier].push(card as ItemCard);
      }
    }

    stats.avgItemBonus = {} as Record<CardTier, number>;

    for (const tier of [1, 2, 3] as CardTier[]) {
      const items = itemsByTier[tier];
      if (items.length > 0) {
        stats.avgItemBonus[tier] =
          items.reduce((sum, i) => sum + i.bonus, 0) / items.length;
      }
    }
  }

  return stats;
}

function printStats(deckName: string, stats: DeckStats, kind: DeckKind): void {
  console.log(colorize(`\n=== ${deckName} Statistics ===`, "cyan"));
  console.log(`Total Cards: ${stats.totalCards}`);

  console.log("\nDistribution by Tier:");
  for (const tier of [1, 2, 3] as CardTier[]) {
    const percent = ((stats.byTier[tier] / stats.totalCards) * 100).toFixed(1);
    console.log(`  Tier ${tier}: ${stats.byTier[tier]} (${percent}%)`);
  }

  console.log("\nDistribution by Type:");
  for (const [type, count] of Object.entries(stats.byType)) {
    const percent = ((count / stats.totalCards) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percent}%)`);
  }

  if (kind === "doors" && stats.avgMonsterLevel) {
    console.log("\nMonster Averages by Tier:");
    for (const tier of [1, 2, 3] as CardTier[]) {
      if (stats.avgMonsterLevel[tier]) {
        console.log(
          `  Tier ${tier}: Lvl ${stats.avgMonsterLevel[tier].toFixed(1)}, ${stats.avgMonsterTreasures![tier].toFixed(1)} treasures`
        );
      }
    }
  } else if (kind === "treasures" && stats.avgItemBonus) {
    console.log("\nItem Bonus Averages by Tier:");
    for (const tier of [1, 2, 3] as CardTier[]) {
      if (stats.avgItemBonus[tier]) {
        console.log(`  Tier ${tier}: +${stats.avgItemBonus[tier].toFixed(1)}`);
      }
    }
  }
}

function validateDirectory(dirPath: string, kind: DeckKind): void {
  console.log(colorize(`\n=== Validating ${kind} decks in ${dirPath} ===\n`, "bright"));

  if (!fs.existsSync(dirPath)) {
    console.log(colorize(`Directory not found: ${dirPath}`, "red"));
    return;
  }

  const files = fs.readdirSync(dirPath).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml")
  );

  if (files.length === 0) {
    console.log(colorize("No deck files found.", "yellow"));
    return;
  }

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(colorize(`Checking ${file}...`, "bright"));

    const result = validateDeckFile(filePath, kind);

    if (result.valid) {
      console.log(colorize("✓ Valid", "green"));
    } else {
      console.log(colorize("✗ Invalid", "red"));
    }

    for (const error of result.errors) {
      console.log(colorize(`  ERROR: ${error}`, "red"));
    }

    for (const warning of result.warnings) {
      console.log(colorize(`  WARN: ${warning}`, "yellow"));
    }

    // Print stats
    if (result.valid || result.errors.length === 0) {
      try {
        const deck = loadDeck(filePath, kind);
        const stats = calculateStats(deck.cards, kind);
        printStats(deck.definition.name, stats, kind);
      } catch (err) {
        // Already reported in validation
      }
    }

    console.log();
  }
}

// Main
console.log(colorize("\n╔═══════════════════════════════════╗", "cyan"));
console.log(colorize("║   Deck Validation & Analysis      ║", "cyan"));
console.log(colorize("╚═══════════════════════════════════╝", "cyan"));

validateDirectory("./decks/doors", "doors");
validateDirectory("./decks/treasures", "treasures");

console.log(colorize("Validation complete!\n", "green"));

