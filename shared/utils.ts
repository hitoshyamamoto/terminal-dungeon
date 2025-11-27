// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

import type { Player, ItemCard } from "./types.js";

/**
 * Calculate player's total power
 */
export function calculatePower(player: Player): number {
  let power = player.level;
  for (const item of player.equipped) {
    power += item.bonus;
  }
  return power;
}

/**
 * Generate a random 4-character alphanumeric code
 */
export function generateLobbyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a random lobby ID
 */
export function generateLobbyId(): string {
  const part1 = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  const part2 = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `${part1}-${part2}`;
}

/**
 * Levenshtein distance for command suggestions
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find closest command match
 */
export function findClosestCommand(
  input: string,
  commands: string[]
): string | null {
  let minDist = Infinity;
  let closest: string | null = null;

  for (const cmd of commands) {
    const dist = levenshtein(input.toLowerCase(), cmd.toLowerCase());
    if (dist < minDist && dist <= 2) {
      minDist = dist;
      closest = cmd;
    }
  }

  return closest;
}

/**
 * Simple hash function for passwords (SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Format card for display
 */
export function formatCard(
  card: any,
  index?: number
): string {
  const prefix = index !== undefined ? `[${index}] ` : "";
  
  if (card.type === "monster") {
    return `${prefix}${card.name} (Lvl ${card.level}, ${card.treasures}T) - ${card.text}`;
  } else if (card.type === "item") {
    return `${prefix}${card.name} (+${card.bonus}) - ${card.text}`;
  } else if (card.type === "curse" || card.type === "event") {
    return `${prefix}${card.name} - ${card.effect}`;
  } else if (card.type === "inst") {
    return `${prefix}${card.name} - ${card.effect}`;
  } else if (card.type === "levelup") {
    return `${prefix}${card.name} - ${card.effect}`;
  }
  
  return `${prefix}${card.name}`;
}

/**
 * ANSI color codes
 */
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

/**
 * Colorize text
 */
export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

