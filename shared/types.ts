// ============================================================================
// SHARED TYPES - Used by both server and client
// ============================================================================

export const GAME_VERSION = "1.0.0";
export const DEFAULT_MAX_LEVEL = 15;
export const DEFAULT_HAND_LIMIT = 5;
export const UDP_PORT = 9999;
export const TCP_BASE_PORT = 4000;

// ============================================================================
// DECK TYPES
// ============================================================================

export type DeckKind = "doors" | "treasures";
export type CardTier = 1 | 2 | 3;

export type DoorCardType = "monster" | "curse" | "event";
export type TreasureCardType = "item" | "inst" | "levelup";
export type CardType = DoorCardType | TreasureCardType;

export interface MonsterCard {
  id: string;
  tier: CardTier;
  type: "monster";
  name: string;
  level: number;
  treasures: number;
  reward: string;
  penalty?: string;
  text: string;
}

export interface CurseCard {
  id: string;
  tier: CardTier;
  type: "curse";
  name: string;
  effect: string;
  text?: string;
}

export interface EventCard {
  id: string;
  tier: CardTier;
  type: "event";
  name: string;
  effect: string;
  text?: string;
}

export type DoorCard = MonsterCard | CurseCard | EventCard;

export interface ItemCard {
  id: string;
  tier: CardTier;
  type: "item";
  name: string;
  bonus: number;
  text: string;
}

export interface InstantCard {
  id: string;
  tier: CardTier;
  type: "inst";
  name: string;
  effect: string;
  text?: string;
}

export interface LevelUpCard {
  id: string;
  tier: CardTier;
  type: "levelup";
  name: string;
  effect: string;
  text?: string;
}

export type TreasureCard = ItemCard | InstantCard | LevelUpCard;

export type Card = DoorCard | TreasureCard;

export interface DeckDefinition {
  kind: DeckKind;
  id: string;
  name: string;
  version: number;
  language: string;
  cards: Card[];
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

export type GamePhase =
  | "LOBBY"
  | "OPEN_DOOR"
  | "FIGHT"
  | "OPTIONAL_TROUBLE"
  | "LOOT"
  | "END_TURN";

export type LobbyStatus = "OPEN" | "IN_GAME" | "FULL";

export interface Player {
  id: string;
  name: string;
  level: number;
  hand: Card[];
  equipped: ItemCard[];
  isDead: boolean;
  levelUpsThisTurn: number;
}

export interface FightState {
  monster: MonsterCard;
  attacker: string; // player id
  helper?: string; // player id
  helperOffer?: string;
  modifiers: number; // total modifier applied
  modifierCount: number; // track how many mods applied (limit 1)
  playerPower: number;
  helperPower?: number;
  monsterPower: number;
}

export interface GameState {
  rev: number;
  phase: GamePhase;
  activePlayer: string; // player id
  players: Record<string, Player>;
  turnOrder: string[];
  currentTurnIndex: number;
  doorsDeck: Card[];
  treasuresDeck: Card[];
  doorsDiscard: Card[];
  treasuresDiscard: Card[];
  fight?: FightState;
  maxLevel: number;
  foughtThisTurn: boolean;
}

export interface LobbyManifest {
  maxLevel: number;
  tiersEnabled: boolean;
  tierWindows: Record<string, [number, number]>;
  tierWeights: Record<string, number>;
}

// ============================================================================
// NETWORK PROTOCOL TYPES
// ============================================================================

export interface BeaconMessage {
  t: "BEACON";
  game: string;
  lobbyId: string;
  code: string;
  host: string;
  port: number;
  players: number;
  maxPlayers: number;
  status: LobbyStatus;
  version: string;
  decks?: {
    doors: string[];
    treasures: string[];
  };
}

export interface JoinMessage {
  t: "JOIN";
  lobbyId: string;
  name: string;
  password: string;
}

export interface RejoinMessage {
  t: "REJOIN";
  sessionToken: string;
}

export interface ActionMessage {
  t: "ACTION";
  kind:
    | "OPEN"
    | "PROVOKE"
    | "FIGHT"
    | "FLEE"
    | "HELP"
    | "ACCEPT"
    | "DECLINE"
    | "MOD"
    | "PLAY"
    | "EQUIP"
    | "UNEQUIP"
    | "LEVELUP"
    | "DISCARD"
    | "LOOT"
    | "END";
  cardId?: string;
  target?: string;
  offer?: string;
  value?: number;
}

export interface ChatMessage {
  t: "CHAT";
  msg: string;
}

export interface WhisperMessage {
  t: "WHISPER";
  to: string;
  msg: string;
}

export interface ResyncMessage {
  t: "RESYNC";
  sinceRev: number;
}

export interface PingMessage {
  t: "PING";
}

export type ClientMessage =
  | JoinMessage
  | RejoinMessage
  | ActionMessage
  | ChatMessage
  | WhisperMessage
  | ResyncMessage
  | PingMessage;

export interface WelcomeMessage {
  t: "WELCOME";
  you: string;
  sessionToken: string;
  state: GameState;
  decks: {
    doors: DeckDefinition;
    treasures: DeckDefinition;
  };
  manifest: LobbyManifest;
}

export interface StateMessage {
  t: "STATE";
  rev: number;
  phase: GamePhase;
  active: string;
  players: Array<{
    id: string;
    name: string;
    level: number;
    power: number;
    handSize: number;
    equipped: ItemCard[];
    isDead: boolean;
  }>;
  fight?: FightState;
  turnOrder: string[];
  currentTurnIndex: number;
  yourHand?: Card[]; // Only sent to the specific player
}

export interface EventMessage {
  t: "EVENT";
  msg: string;
}

export interface PromptMessage {
  t: "PROMPT";
  kind: string;
  from?: string;
  count?: number;
}

export interface ErrorMessage {
  t: "ERROR";
  msg: string;
}

export interface PongMessage {
  t: "PONG";
}

export type ServerMessage =
  | WelcomeMessage
  | StateMessage
  | EventMessage
  | PromptMessage
  | ErrorMessage
  | PongMessage;

// ============================================================================
// TIER PROGRESSION
// ============================================================================

export interface TierAccess {
  tiers: CardTier[];
  probabilities: number[];
}

export function getTierAccess(level: number): TierAccess {
  if (level <= 5) {
    return { tiers: [1], probabilities: [1.0] };
  } else if (level <= 10) {
    return { tiers: [1, 2], probabilities: [0.75, 0.25] };
  } else {
    return { tiers: [1, 2, 3], probabilities: [0.6, 0.3, 0.1] };
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface LobbyInfo {
  lobbyId: string;
  code: string;
  host: string;
  port: number;
  players: number;
  maxPlayers: number;
  status: LobbyStatus;
  version: string;
  lastSeen: number;
  decks?: {
    doors: string[];
    treasures: string[];
  };
}

