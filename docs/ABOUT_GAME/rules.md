# Terminal Dungeon - Game Rules

Complete rules for Terminal Dungeon, a simplified Munchkin-inspired card game.

## Objective

Be the first player to reach **Level 15** (default, configurable by host).

---

## Setup

1. **Create/Join Lobby:** Host creates a lobby, players join with code and password
2. **Select Decks:** Host chooses one Doors deck and one Treasures deck
3. **Start Game:** Host starts when 2-6 players are ready
4. **Initial Deal:** Each player receives 4 Doors + 4 Treasures

---

## Turn Structure

Each turn has **5 phases**:

### 1. Open Door
Reveal a card from the Doors deck.

**Outcomes:**
- **Monster:** Enter combat (phase 2)
- **Curse/Event:** Resolve effect immediately, then proceed
- **Empty Deck:** Skip to Loot phase

### 2. Fight (if Monster)
Combat is automatic if a Monster appears.

**Combat Resolution:**
- **Player Power:** Level + Item Bonuses + Temporary Effects
- **Monster Power:** Monster Level + Modifiers

**Win Condition:** Player Power ≥ Monster Power

**Win Rewards:**
- +1 Level (or as specified on card)
- Draw N Treasures (as specified on card)

**Lose:** Attempt to flee or suffer penalty

### 3. Provoke Trouble (Optional)
If no fight occurred (Curse/Event), you may play a Monster from your hand to start a fight.

**Usage:**
```
provoke D117
```

**Note:** Can only fight once per turn.

### 4. Loot the Room
If no fight occurred, draw a face-down Door card.

**Usage:**
```
loot
```

### 5. End Turn
End your turn. Hand limit is enforced.

**Hand Limit:** 5 cards maximum

**Excess Cards:** Donated to the lowest-level player (if tie, next clockwise).

**Usage:**
```
end
```

---

## Combat Rules

### Power Calculation
```
Power = Level + Σ(Equipped Item Bonuses) + Temporary Effects
```

**Example:**
- Level 5
- Equipped: Longsword +4, Leather Armor +1
- **Power:** 5 + 4 + 1 = **10**

### Winning Combat
If Player Power ≥ Monster Power:
- Gain +1 Level (or as specified)
- Draw N Treasures
- Monster goes to discard

### Losing Combat
If Player Power < Monster Power:
1. Attempt to **flee** (roll d6: 5-6 succeeds)
2. If flee fails, suffer **penalty** (as specified on card)

### Fleeing
```
flee
```

**Roll:** d6 (1-6)
- **5-6:** Escape successfully
- **1-4:** Suffer penalty

---

## Player Interaction

### Helping
Any player (except attacker) may offer to help in combat.

**Offer Help:**
```
help @alice 1t
```

**Attacker Response:**
```
accept    # Accept help
decline   # Decline help
```

**Rules:**
- Only 1 helper allowed (MVP)
- Helper adds their Power to attacker's
- Negotiation via text chat
- If attacker wins, helper receives agreed reward

### Modifiers
Players may play modifiers on Monsters during combat.

**Usage:**
```
mod +3    # Make monster stronger
mod -2    # Make monster weaker
```

**Limit:** Maximum 1 modifier per Monster (MVP rule)

---

## Card Types

### Doors Deck

#### Monsters
- **Level:** Monster strength
- **Treasures:** Reward count
- **Reward:** Level gain or special effect
- **Penalty:** Applied on loss (if flee fails)

**Example:**
```
Goblin Lvl 6
Treasures: 2
Reward: +1 level
Penalty: Lose your armor
```

#### Curses
Negative effects applied immediately when revealed.

**Example:**
```
Duck of Doom
Effect: -1 Level (minimum 1)
```

#### Events
Positive or neutral effects.

**Example:**
```
Wandering Merchant
Effect: Draw 1 Treasure card
```

### Treasures Deck

#### Items
Equipment that provides a Power bonus.

**Example:**
```
Longsword +4
Bonus: +4
```

**Rules:**
- No equipment slots (MVP)
- All bonuses stack
- Use `equip <id>` to equip
- Use `unequip <id>` to remove

#### Instant Cards
One-time effects usable during combat.

**Example:**
```
Healing Potion +2
Effect: Use in combat: +2 to your side
```

**Usage:**
```
play T020
```

#### Level-Up Cards
Permanently increase your level.

**Example:**
```
Go Up a Level
Effect: +1 Level (max 1 per turn)
```

**Usage:**
```
levelup
```

**Limit:** Can only use 1 per turn.

---

## Death

If you die (fail to flee and suffer fatal penalty):

1. **Lose all equipped items** (to discard)
2. **-1 Level** (minimum 1)
3. **Next turn:** Draw 4 Doors + 4 Treasures
4. **Continue playing** (no elimination)

---

## Tier System

Cards have **tiers (1, 2, 3)** that affect draw probabilities.

### Tier Access by Level

| Player Level | Available Tiers | Probabilities      |
|--------------|-----------------|---------------------|
| 1-5          | 1               | 100%                |
| 6-10         | 1, 2            | 75%, 25%            |
| 11-15        | 1, 2, 3         | 60%, 30%, 10%       |

### Tier Recommendations

| Tier | Monster Level | Item Bonus |
|------|---------------|------------|
| 1    | 1-5           | +1 to +3   |
| 2    | 6-10          | +3 to +5   |
| 3    | 11-15         | +5 to +8   |

**Note:** The tier system ensures progression without overwhelming players with high-power cards early.

---

## Winning

The first player to reach **Level 15** (or configured max level) wins immediately.

**Victory Message:**
```
🎉 @Alice reached Level 15 and WINS THE GAME! 🎉
```

---

## Special Rules (MVP)

1. **No Equipment Slots:** All items can be equipped simultaneously
2. **No Classes/Races:** Pure level-based progression
3. **No Shop/Economy:** Progression via tiers only
4. **One Modifier per Monster:** Simplified interaction
5. **One Helper per Fight:** Easier negotiation

---

## Tips & Strategy

### Early Game (Levels 1-5)
- Focus on equipping items
- Avoid risky fights
- Save instant cards for tough monsters

### Mid Game (Levels 6-10)
- Start helping others for rewards
- Use modifiers strategically
- Build a strong equipment set

### Late Game (Levels 11-15)
- Fight aggressively to reach 15 first
- Block opponents with modifiers
- Negotiate help carefully

---

## Example Turn

**Alice's Turn (Level 4, Power 7):**

1. **Open Door:** Reveals "Orc Warrior (Lvl 6)"
2. **Fight:** Alice's Power (7) < Orc (6+2 mod from Bob) = 8
3. **Flee:** Rolls 5 → Escapes!
4. **End Turn:** Hand limit OK, turn passes to Bob

**Bob's Turn (Level 3, Power 5):**

1. **Open Door:** Reveals "Wandering Merchant"
2. **Event:** Draw 1 Treasure (gets "Longsword +4")
3. **Loot:** (No fight occurred) Draws face-down Door
4. **Equip:** `equip T100` → Power now 9
5. **End Turn:** Turn passes to Charlie

---

## FAQ

**Q: Can I play items during combat?**  
A: You can equip items at any time, but combat power is calculated when the fight is resolved.

**Q: What happens if I have more than 5 cards at end of turn?**  
A: Excess cards go to the lowest-level player. If tied, next clockwise.

**Q: Can I decline to fight a Monster?**  
A: No, Monsters must be fought or fled.

**Q: Can I help myself?**  
A: No.

**Q: What if the deck runs out?**  
A: Shuffle the discard pile to form a new deck.

**Q: Can I trade cards?**  
A: Not directly. Use the help system during combat to negotiate rewards.

---

## Commands Quick Reference

| Action               | Command                  |
|----------------------|--------------------------|
| Open Door            | `open`                   |
| Fight Monster        | `fight`                  |
| Flee                 | `flee`                   |
| Provoke Trouble      | `provoke <card_id>`      |
| Loot Room            | `loot`                   |
| End Turn             | `end`                    |
| Equip Item           | `equip <card_id>`        |
| Use Level-Up         | `levelup`                |
| Help Player          | `help @name [offer]`     |
| Accept Help          | `accept`                 |
| Play Modifier        | `mod +N`                 |
| View Hand            | `hand`                   |
| View Status          | `status`                 |
| View Game State      | `view all`               |

For the complete command list, see [commands.md](commands.md).

