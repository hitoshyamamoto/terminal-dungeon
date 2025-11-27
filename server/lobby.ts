// ============================================================================
// LOBBY MANAGEMENT - Password, players, deck selection
// ============================================================================

import { hashPassword } from "../shared/utils.js";
import type { LobbyManifest, DeckKind } from "../shared/types.js";
import { DEFAULT_MAX_LEVEL } from "../shared/types.js";

export interface LobbyPlayer {
  id: string;
  name: string;
}

export class Lobby {
  lobbyId: string;
  code: string;
  hostId: string;
  passwordHash: string;
  players: Map<string, LobbyPlayer> = new Map();
  maxPlayers: number = 6;
  selectedDecks: { doors: string[]; treasures: string[] };
  manifest: LobbyManifest;
  failedAttempts: Map<string, number> = new Map();
  inGame: boolean = false;

  constructor(
    lobbyId: string,
    code: string,
    hostId: string,
    hostName: string,
    passwordHash: string
  ) {
    this.lobbyId = lobbyId;
    this.code = code;
    this.hostId = hostId;
    this.passwordHash = passwordHash;

    // Host is first player
    this.players.set(hostId, { id: hostId, name: hostName });

    // Default deck selection (backwards compatible - single deck)
    this.selectedDecks = { doors: ["door_01"], treasures: ["treasure_01"] };

    // Default manifest
    this.manifest = {
      maxLevel: DEFAULT_MAX_LEVEL,
      tiersEnabled: true,
      tierWindows: { "1": [1, 5], "2": [6, 10], "3": [11, 15] },
      tierWeights: { "1": 0.6, "2": 0.3, "3": 0.1 },
    };
  }

  async verifyPassword(password: string, clientId: string): Promise<boolean> {
    const hash = await hashPassword(password);

    if (hash !== this.passwordHash) {
      const attempts = (this.failedAttempts.get(clientId) || 0) + 1;
      this.failedAttempts.set(clientId, attempts);

      if (attempts >= 3) {
        throw new Error(
          "Too many failed password attempts. Temporarily blocked."
        );
      }

      return false;
    }

    // Reset on success
    this.failedAttempts.delete(clientId);
    return true;
  }

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    if (this.inGame) {
      return false;
    }

    this.players.set(id, { id, name });
    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  canStart(): boolean {
    return (
      this.players.size >= 2 &&
      this.players.size <= this.maxPlayers &&
      !this.inGame
    );
  }

  // Add a deck to the selection
  addDeck(kind: DeckKind, deckId: string): void {
    if (kind === "doors") {
      if (!this.selectedDecks.doors.includes(deckId)) {
        this.selectedDecks.doors.push(deckId);
      }
    } else {
      if (!this.selectedDecks.treasures.includes(deckId)) {
        this.selectedDecks.treasures.push(deckId);
      }
    }
  }

  // Remove a deck from the selection
  removeDeck(kind: DeckKind, deckId: string): void {
    if (kind === "doors") {
      this.selectedDecks.doors = this.selectedDecks.doors.filter(
        (id) => id !== deckId
      );
    } else {
      this.selectedDecks.treasures = this.selectedDecks.treasures.filter(
        (id) => id !== deckId
      );
    }
  }

  // Clear all decks of a kind
  clearDecks(kind: DeckKind): void {
    if (kind === "doors") {
      this.selectedDecks.doors = [];
    } else {
      this.selectedDecks.treasures = [];
    }
  }

  // Get selected deck IDs
  getSelectedDecks(kind: DeckKind): string[] {
    return kind === "doors"
      ? this.selectedDecks.doors
      : this.selectedDecks.treasures;
  }

  setMaxLevel(level: number): void {
    this.manifest.maxLevel = level;
  }

  async changePassword(newPassword: string): Promise<void> {
    this.passwordHash = await hashPassword(newPassword);
  }
}

