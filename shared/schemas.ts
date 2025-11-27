// ============================================================================
// ZOD SCHEMAS - Validation for decks and protocol messages
// ============================================================================

import { z } from "zod";

// ============================================================================
// DECK SCHEMAS
// ============================================================================

const CardTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const MonsterCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("monster"),
  name: z.string(),
  level: z.number().int().min(1),
  treasures: z.number().int().min(0),
  reward: z.string(),
  penalty: z.string().optional(),
  text: z.string(),
  repeat: z.number().int().min(1).optional(),
});

const CurseCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("curse"),
  name: z.string(),
  effect: z.string(),
  text: z.string().optional(),
  repeat: z.number().int().min(1).optional(),
});

const EventCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("event"),
  name: z.string(),
  effect: z.string(),
  text: z.string().optional(),
  repeat: z.number().int().min(1).optional(),
});

const DoorCardSchema = z.union([
  MonsterCardSchema,
  CurseCardSchema,
  EventCardSchema,
]);

const ItemCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("item"),
  name: z.string(),
  bonus: z.number().int(),
  text: z.string(),
  repeat: z.number().int().min(1).optional(),
});

const InstantCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("inst"),
  name: z.string(),
  effect: z.string(),
  text: z.string().optional(),
  repeat: z.number().int().min(1).optional(),
});

const LevelUpCardSchema = z.object({
  id: z.string(),
  tier: CardTierSchema,
  type: z.literal("levelup"),
  name: z.string(),
  effect: z.string(),
  text: z.string().optional(),
  repeat: z.number().int().min(1).optional(),
});

const TreasureCardSchema = z.union([
  ItemCardSchema,
  InstantCardSchema,
  LevelUpCardSchema,
]);

export const DoorsDeckSchema = z.object({
  deck: z.object({
    kind: z.literal("doors"),
    id: z.string(),
    name: z.string(),
    version: z.number().int(),
    language: z.string(),
    cards: z.array(DoorCardSchema),
  }),
});

export const TreasuresDeckSchema = z.object({
  deck: z.object({
    kind: z.literal("treasures"),
    id: z.string(),
    name: z.string(),
    version: z.number().int(),
    language: z.string(),
    cards: z.array(TreasureCardSchema),
  }),
});

// ============================================================================
// PROTOCOL SCHEMAS
// ============================================================================

export const BeaconMessageSchema = z.object({
  t: z.literal("BEACON"),
  game: z.string(),
  lobbyId: z.string(),
  code: z.string(),
  host: z.string(),
  port: z.number(),
  players: z.number(),
  maxPlayers: z.number(),
  status: z.enum(["OPEN", "IN_GAME", "FULL"]),
  version: z.string(),
  decks: z
    .object({
      doors: z.string(),
      treasures: z.string(),
    })
    .optional(),
});

export const JoinMessageSchema = z.object({
  t: z.literal("JOIN"),
  lobbyId: z.string(),
  name: z.string(),
  password: z.string(),
});

export const ActionMessageSchema = z.object({
  t: z.literal("ACTION"),
  kind: z.enum([
    "OPEN",
    "PROVOKE",
    "FIGHT",
    "FLEE",
    "HELP",
    "ACCEPT",
    "DECLINE",
    "MOD",
    "PLAY",
    "EQUIP",
    "UNEQUIP",
    "LEVELUP",
    "DISCARD",
    "LOOT",
    "END",
  ]),
  cardId: z.string().optional(),
  target: z.string().optional(),
  offer: z.string().optional(),
  value: z.number().optional(),
});

export const ChatMessageSchema = z.object({
  t: z.literal("CHAT"),
  msg: z.string(),
});

export const WhisperMessageSchema = z.object({
  t: z.literal("WHISPER"),
  to: z.string(),
  msg: z.string(),
});

export const ResyncMessageSchema = z.object({
  t: z.literal("RESYNC"),
  sinceRev: z.number(),
});

export const ClientMessageSchema = z.union([
  JoinMessageSchema,
  ActionMessageSchema,
  ChatMessageSchema,
  WhisperMessageSchema,
  ResyncMessageSchema,
  z.object({ t: z.literal("PING") }),
]);

