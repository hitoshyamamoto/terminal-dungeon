# Sistema de Interação de Cartas - Terminal Dungeon

Este documento explica **como as cartas interagem com os jogadores** e **como o sistema processa cada tipo de carta**.

---

## 🎴 Visão Geral

As cartas no Terminal Dungeon seguem um ciclo de vida:

```
Deck (embaralhado) → Sorteio → Mão do Jogador → Uso/Equipamento → Descarte
```

Cada tipo de carta tem **comportamentos diferentes** quando interage com jogadores.

---

## 📊 Fluxo de Dados

### Estrutura do Jogador

```typescript
Player {
  id: string;              // "p1", "p2", etc
  name: string;            // Nome do jogador
  level: number;           // Nível atual (1-15)
  hand: Card[];            // Cartas na mão (limite 5)
  equipped: ItemCard[];    // Itens equipados (sem limite!)
  isDead: boolean;         // Status de morte
  levelUpsThisTurn: number; // Contador de level-ups (máx 1/turno)
}
```

### Como o Poder é Calculado

```typescript
Power = Level + Σ(bônus dos itens equipados) + efeitos temporários
```

**Exemplo:**
- Nível: 5
- Equipado: Longsword +4, Leather Armor +1, Ring +2
- **Poder Total: 5 + 4 + 1 + 2 = 12**

---

## 🚪 CARTAS DE PORTAS (Doors)

### 1. 👹 MONSTROS

#### Como Aparecem
```typescript
// Quando jogador usa comando "open"
> open

// Sistema processa:
1. Sorteia carta do deck Doors baseado no nível do jogador
2. Se for monstro → cria estado de combate
3. Monstro NÃO vai para a mão, vai direto para combate
```

#### Interação com Jogador

**Fase 1: Revelação**
```typescript
handleOpen() {
  const monster = drawCardWithTier(doorsDeck, player.level);
  
  // Cria estado de combate
  state.fight = {
    monster: monster,
    attacker: playerId,
    playerPower: calculatePower(player),  // Nível + itens
    monsterPower: monster.level,
    modifiers: 0
  };
  
  // Muda fase do jogo
  state.phase = "FIGHT";
}
```

**Fase 2: Combate**
```typescript
handleFight() {
  const totalPlayerPower = fight.playerPower + (helper ? helperPower : 0);
  const totalMonsterPower = fight.monsterPower + fight.modifiers;
  
  if (totalPlayerPower >= totalMonsterPower) {
    // VITÓRIA!
    player.level += 1;  // Sobe nível
    
    // Sorteia tesouros (também baseado em tier!)
    const treasures = drawCards(treasureDeck, monster.treasures, player.level);
    player.hand.push(...treasures);  // Adiciona à mão
    
    // Monstro vai para descarte
    doorsDiscard.push(monster);
  } else {
    // DERROTA - tenta fugir
    // (ver seção Fuga)
  }
}
```

**Fase 3: Fuga**
```typescript
handleFlee() {
  const roll = d6();  // 1-6
  
  if (roll >= 5) {
    // Escapou! Monstro vai para descarte
    doorsDiscard.push(monster);
  } else {
    // Não escapou! Aplica penalidade
    applyPenalty(player, monster.penalty);
    
    // Pode causar morte
    if (severe) {
      applyDeath(player);
    }
  }
}
```

**Exemplo Prático:**
```bash
# Jogador nível 3 com Shortsword +3 equipada
> status
Level: 3, Power: 6

> open
[EVENT] @you found Goblin Lvl 5 (2 treasures)

# Sistema cria: fight { playerPower: 6, monsterPower: 5 }

> fight
[EVENT] Victory! +1 Level; draw 2 Treasures

# Sistema executa:
# - player.level = 4
# - treasures = drawCards(treasureDeck, 2, level=4)  ← tier-aware!
# - player.hand.push(treasure1, treasure2)
```

---

### 2. 😈 MALDIÇÕES (Curses)

#### Como Funcionam
```typescript
handleOpen() {
  const curse = drawCardWithTier(doorsDeck, player.level);
  
  if (curse.type === "curse") {
    // Efeito aplicado IMEDIATAMENTE
    events.push(`Curse: ${curse.effect}`);
    
    // Exemplos de efeitos:
    // - "-1 Level" → player.level--
    // - "Lose items" → player.equipped = []
    // - "Discard 2 cards" → player.hand.splice(0, 2)
    
    // Carta vai para descarte
    doorsDiscard.push(curse);
    
    // Continua turno (pode provocar ou saquear)
    state.phase = "OPTIONAL_TROUBLE";
  }
}
```

**Exemplo:**
```bash
> open
[EVENT] @you found Duck of Doom!
[EVENT] Curse: -1 Level (minimum 1)

# Sistema executa:
# - player.level = Math.max(1, player.level - 1)
# - curse vai para doorsDiscard
```

---

### 3. 🎲 EVENTOS (Events)

#### Como Funcionam
```typescript
handleOpen() {
  const event = drawCardWithTier(doorsDeck, player.level);
  
  if (event.type === "event") {
    // Efeito positivo ou neutro
    
    // Exemplos:
    // - "Draw 1 Treasure" → player.hand.push(drawCard(treasureDeck))
    // - "+1 Level" → player.level++
    // - "All players draw 1" → forEach player...
    
    doorsDiscard.push(event);
    state.phase = "OPTIONAL_TROUBLE";
  }
}
```

**Exemplo:**
```bash
> open
[EVENT] @you found Wandering Merchant!
[EVENT] Effect: Draw 1 Treasure card

# Sistema executa:
# - treasure = drawCardWithTier(treasureDeck, player.level)
# - player.hand.push(treasure)
```

---

## 💎 CARTAS DE TESOUROS (Treasures)

### 1. ⚔️ ITENS (Items)

#### Ciclo de Vida Completo

**Receber → Mão → Equipar → Poder Aumenta → Desequipar → Descartar**

```typescript
// 1. RECEBER (após vencer monstro)
const treasures = drawCards(treasureDeck, count, player.level);
player.hand.push(...treasures);

// 2. EQUIPAR (comando do jogador)
handleEquip(cardId) {
  const item = player.hand.find(c => c.id === cardId);
  
  // Remove da mão
  player.hand = player.hand.filter(c => c.id !== cardId);
  
  // Adiciona ao equipamento
  player.equipped.push(item);
  
  // Poder recalculado AUTOMATICAMENTE na próxima ação
}

// 3. CALCULAR PODER (sempre que necessário)
calculatePower(player) {
  let power = player.level;
  for (const item of player.equipped) {
    power += item.bonus;  // ← Itens contribuem aqui!
  }
  return power;
}

// 4. DESEQUIPAR (opcional)
handleUnequip(cardId) {
  const item = player.equipped.find(c => c.id === cardId);
  
  // Remove do equipamento
  player.equipped = player.equipped.filter(c => c.id !== cardId);
  
  // Volta para a mão
  player.hand.push(item);
}

// 5. DESCARTAR
handleDiscard(cardId) {
  const card = player.hand.find(c => c.id === cardId);
  player.hand = player.hand.filter(c => c.id !== cardId);
  
  treasuresDiscard.push(card);  // ← Vai para pilha de descarte
}
```

**Exemplo Prático:**
```bash
# 1. Receber
[EVENT] @you drew Longsword +4

# Carta agora está em player.hand

# 2. Ver mão
> hand
[0] Longsword +4 (+4) - A finely crafted blade
[1] Healing Potion +2 - Use in combat: +2
[2] Go Up a Level - +1 Level

# 3. Equipar
> equip 0
[EVENT] @you equipped Longsword +4

# Agora está em player.equipped[]
# Poder automaticamente aumenta: 5 + 4 = 9

> status
Level: 5, Power: 9

# 4. Usar em combate
> open
[EVENT] @you found Orc Lvl 8

> fight
# Sistema compara: playerPower (9) vs monsterPower (8)
# Vitória!
```

---

### 2. ⚡ INSTANTÂNEOS (Instant)

#### Como Funcionam

**Diferença:** Usados uma vez e descartados

```typescript
handlePlay(cardId) {
  const card = player.hand.find(c => c.id === cardId);
  
  if (card.type === "inst") {
    if (state.phase === "FIGHT") {
      // Efeito aplicado no combate atual
      
      // Exemplos:
      // - "Potion +2" → fight.playerPower += 2
      // - "Monster -3" → fight.modifiers -= 3
      // - "Auto-win" → forceWin()
      
      // Remove da mão
      player.hand = player.hand.filter(c => c.id !== cardId);
      
      // Vai para descarte
      treasuresDiscard.push(card);
      
      events.push(`@you played ${card.name}: ${card.effect}`);
    } else {
      error("Can only play instant cards during a fight.");
    }
  }
}
```

**Exemplo:**
```bash
> open
[EVENT] @you found Dragon Lvl 12

> status
Level: 5, Power: 8  # Não é suficiente!

> hand
[0] Healing Potion +2
[1] Fire Scroll +3

> play 1
[EVENT] @you played Fire Scroll +3: +3 to your side

# Sistema: fight.playerPower = 8 + 3 = 11
# Ainda não é suficiente...

> play 0
[EVENT] @you played Healing Potion +2: +2 to your side

# Sistema: fight.playerPower = 11 + 2 = 13

> fight
# 13 >= 12 → Vitória!
```

---

### 3. 📈 LEVEL-UP (Go Up a Level)

#### Como Funcionam

```typescript
handleLevelUp() {
  // Verifica limite
  if (player.levelUpsThisTurn >= 1) {
    error("Already used 1 'Go Up a Level' this turn.");
    return;
  }
  
  // Busca carta na mão
  const card = player.hand.find(c => c.type === "levelup");
  
  if (card) {
    // Remove da mão
    player.hand = player.hand.filter(c => c.id !== card.id);
    
    // Aumenta nível
    player.level++;
    
    // Incrementa contador
    player.levelUpsThisTurn++;
    
    // Vai para descarte
    treasuresDiscard.push(card);
    
    events.push(`@you used ${card.name}. Level is now ${player.level}.`);
  }
}
```

**Exemplo:**
```bash
> status
Level: 14, Power: 20

> hand
[0] Go Up a Level
[1] Longsword +4

> levelup
[EVENT] @you used Go Up a Level. Level is now 15.
[EVENT] 🎉 @you reached Level 15 and WINS THE GAME! 🎉
```

---

## 🔄 Sistema de Tiers (Progressão)

### Como Afeta o Sorteio

```typescript
// Quando jogador sorteia carta
drawCardWithTier(deck, playerLevel) {
  // 1. Determina tiers disponíveis baseado no nível
  const tierAccess = getTierAccess(playerLevel);
  // Lvl 1-5  → [1]        (100%)
  // Lvl 6-10 → [1, 2]     (75%, 25%)
  // Lvl 11+  → [1, 2, 3]  (60%, 30%, 10%)
  
  // 2. Sorteia tier com probabilidade
  const tier = selectTierByProbability(tierAccess);
  
  // 3. Pega carta aleatória desse tier
  const cardsInTier = cardsByTier.get(tier);
  const card = random(cardsInTier);
  
  return card;
}
```

**Por que isso importa:**
- Jogador nível 3 → **não pode pegar cartas Tier 3** (muito poderosas)
- Jogador nível 12 → **pode pegar qualquer tier**, mas cartas T1 ainda são comuns
- **Progressão natural**: cartas melhores aparecem conforme você fica mais forte

**Exemplo Prático:**
```bash
# Nível 3 (só tier 1)
> open
[EVENT] @you found Goblin Lvl 3 (Tier 1)

# Ganha, sobe para nível 6
> fight
[EVENT] Victory! Level is now 6

# Nível 6 (tier 1 e 2)
> open
[EVENT] @you found Orc Warrior Lvl 7 (Tier 2)  ← agora aparece T2!

# Vence, pega tesouros tier 2
[EVENT] You drew Battleaxe +5 (Tier 2)  ← item mais forte!
```

---

## 💀 Morte e Penalidades

### Como a Morte Afeta o Jogador

```typescript
applyDeath(player) {
  // 1. Perde TODOS os itens equipados
  treasuresDiscard.push(...player.equipped);
  player.equipped = [];
  
  // 2. Perde 1 nível (mínimo 1)
  player.level = Math.max(1, player.level - 1);
  
  // 3. Marca como morto (próximo turno recebe cartas)
  player.isDead = true;
  
  events.push(`@${player.name} died! Lost all items and -1 level.`);
}

// No próximo turno
startTurn(player) {
  if (player.isDead) {
    // Recebe 4+4 cartas novas
    player.hand.push(...drawCards(doorsDeck, 4, player.level));
    player.hand.push(...drawCards(treasureDeck, 4, player.level));
    
    player.isDead = false;
  }
}
```

---

## 🤝 Interação Entre Jogadores

### 1. Ajuda (Help)

```typescript
// Jogador B oferece ajuda
handleHelp(playerId, target, offer) {
  const helper = players[playerId];
  const helperPower = calculatePower(helper);
  
  fight.helper = playerId;
  fight.helperPower = helperPower;  // ← Poder do ajudante
  fight.helperOffer = offer;  // "1t", "2 treasures", etc
  
  events.push(`@${helper.name} offers to help for: ${offer}`);
}

// Jogador A aceita
handleAccept() {
  // Agora o combate usa ambos os poderes
  const totalPower = fight.playerPower + fight.helperPower;
  
  if (win) {
    // Ajudante recebe recompensa negociada
    negotiateReward(fight.helper, fight.helperOffer);
  }
}
```

### 2. Modificadores

```typescript
// Qualquer jogador pode modificar monstro
handleMod(playerId, value) {
  // Limite: 1 modificador por monstro (MVP)
  if (fight.modifierCount >= 1) {
    error("Modifier limit reached");
    return;
  }
  
  // Aplica modificador
  fight.modifiers += value;  // +3 ou -2
  fight.modifierCount++;
  
  events.push(`@${player.name} played ${value} on the Monster`);
}
```

---

## 🎯 Resumo dos Fluxos

### Monstro
```
Deck → Sorteio (tier-aware) → Combate → Vitória → Tesouros → Mão
                                      ↓ Derrota
                                    Fuga → d6 → Sucesso/Penalidade
```

### Item
```
Deck → Sorteio → Mão → Equipar → Contribui para Poder
                      ↓ Opcional
                   Desequipar → Mão → Descartar
```

### Instantâneo
```
Deck → Sorteio → Mão → Usar em Combate (efeito) → Descarte
```

### Level-Up
```
Deck → Sorteio → Mão → Usar (1x/turno) → +1 Nível → Descarte
```

---

## 📝 Exemplo Completo de Turno

```bash
# Estado inicial
Level: 5, Power: 9, Hand: 5 cards

# 1. Abrir porta
> open
[Sistema sorteia: tier baseado em level 5 → Tier 1 (100%)]
[Sistema pega: Monster "Skeleton Lvl 4"]
[Sistema cria: fight { playerPower: 9, monsterPower: 4 }]
[EVENT] @you found Skeleton Lvl 4 (1 treasure)

# 2. Combate (automático - poder suficiente)
> fight
[Sistema compara: 9 >= 4 → WIN]
[Sistema executa: player.level = 6]
[Sistema sorteia: 1 tesouro tier-aware (level 6 → pode ser T1 ou T2)]
[Sistema adiciona: treasure → player.hand]
[Sistema move: skeleton → doorsDiscard]
[EVENT] Victory! +1 Level; draw 1 Treasure
[EVENT] You drew Chainmail +3

# 3. Estado atualizado
# - player.level = 6
# - player.hand tem nova carta
# - agora pode pegar cartas Tier 2!

# 4. Equipar item novo
> equip T102
[Sistema: move Chainmail da mão para equipped]
[Sistema: recalcula poder = 6 + 3 + outros itens = 12]
[EVENT] @you equipped Chainmail +3

# 5. Terminar turno
> end
[Sistema verifica: hand.length > 5?]
[Se sim: doa excesso ao jogador de menor nível]
[Sistema: player.levelUpsThisTurn = 0]
[Sistema: próximo jogador]
```

---

## 🔑 Pontos-Chave

1. **Cartas nunca "flutuam"** - sempre estão em: deck, mão, equipadas, ou descarte
2. **Tier system** garante progressão natural
3. **Poder recalculado** sempre que necessário (não armazenado)
4. **Estado imutável** - server é autoritativo
5. **Efeitos aplicados** imediatamente pelo servidor
6. **Cliente só envia comandos** - server processa tudo

Isso garante:
- ✅ Sem trapaça (server valida tudo)
- ✅ Sincronização automática
- ✅ Regras consistentes
- ✅ Fácil adicionar novos tipos de cartas

---

Quer ver algum tipo específico de carta ou interação em mais detalhe?

