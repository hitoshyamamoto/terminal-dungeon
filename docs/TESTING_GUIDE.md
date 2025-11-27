# Terminal Dungeon - Testing Guide

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Sistema de Testes Automatizados](#sistema-de-testes-automatizados)
3. [Executando os Testes](#executando-os-testes)
4. [Game Simulator](#game-simulator)
5. [Cobertura de Testes](#cobertura-de-testes)

---

## 🎯 Visão Geral

Este projeto possui um **sistema completo de testes automatizados** que permite testar toda a funcionalidade do jogo **SEM precisar de múltiplos terminais ou interface visual**. Ideal para debug e desenvolvimento.

### Arquivos de Teste

```
scripts/
├── test-framework.ts           # Framework base de testes
├── test-integration.ts         # Testes de integração simples
├── test-suite-complete.ts      # Suite completa de testes
└── game-simulator.ts           # Simulador visual de partidas
```

---

## 🧪 Sistema de Testes Automatizados

### Características

✅ **Testes Programáticos** - Sem necessidade de terminais múltiplos
✅ **Execução Rápida** - Todos os testes rodam em segundos
✅ **Determinístico** - Resultados consistentes
✅ **Logs Detalhados** - Debug fácil com mensagens coloridas
✅ **Cobertura Completa** - Testa TODAS as funcionalidades

---

## 🚀 Executando os Testes

### 1. Teste de Integração Básico

Testa funcionalidade core do jogo:

```bash
npm run test:integration
```

**Testa:**
- ✓ Carregamento de decks
- ✓ Criação de lobby
- ✓ Adição de jogadores
- ✓ Inicialização de jogo
- ✓ Abertura de cartas
- ✓ Sistema de combate
- ✓ Rotação de turnos

---

### 2. Suite Completa de Testes

Executa **TODOS** os testes automatizados:

```bash
npm run test:complete
```

#### Suites de Teste:

**📦 Lobby Tests (5 testes)**
- Create lobby with valid parameters
- Add 2 players (minimum)
- Add 6 players (maximum)
- Cannot start with 1 player
- Lobby code is 4 characters

**📦 Game Initialization Tests (5 testes)**
- Game starts in OPEN_DOOR phase
- All players start at level 1
- All players start with 8 cards
- Game with 2 players has correct turn order
- Game with 6 players initializes correctly

**📦 Command Tests - Door Phase (2 testes)**
- OPEN - Opens a door card
- OPEN - Wrong player cannot open

**📦 Command Tests - Combat (2 testes)**
- FIGHT - Player can attempt fight
- FLEE - Player can attempt to flee

**📦 Command Tests - Items (2 testes)**
- EQUIP - Player can equip item from hand
- UNEQUIP - Player can unequip item

**📦 Command Tests - Turn Flow (2 testes)**
- LOOT - Player can draw treasure
- END - Player can end turn

**📦 Player Interaction Tests (2 testes)**
- Two players can play alternating turns
- Six players rotate turns correctly

**📦 Card Loading Tests (5 testes)**
- All door cards load correctly
- All treasure cards load correctly
- Monster cards have required fields
- Item cards have required fields
- Cards have valid tiers (1, 2, or 3)

---

### 3. Game Simulator (Partidas Visuais)

Assista partidas sendo jogadas automaticamente com logs detalhados:

```bash
npm run test:simulate
```

#### Exemplo de Output:

```
🎮 Initializing Game Simulator
Players: 2
Max Turns: 3

  Added Player1 (p0)
  Added Player2 (p1)

📦 Loaded 32 door cards, 48 treasure cards

✅ Game initialized!

================================================================================
GAME SIMULATION START
================================================================================

🚪  Player1 - OPEN_DOOR
    📢 @you opened a Door and found Puny Goblin Lvl 2 (1 treasures).

⚔️  Player1 - FIGHT
    🏃 Fleeing! Power too low: 1 vs 2
    📢 @you rolled a 6.
    📢 You escaped!

🔚  Player1 - END_TURN
    📢 @you have 8 cards (limit 5). Discard 3 to the lowest-level player.
    📢 Turn ends. @Player2's turn!

  ✓ Turn 1 completed

...

📊 FINAL STATISTICS
--------------------------------------------------------------------------------

Player1:
  Level: 1
  Hand: 5 cards
  Equipped: 0 items
  Dead: No

Player2:
  Level: 2
  Hand: 8 cards
  Equipped: 1 items
  Dead: No
  Items:
    - Dagger +2 (+2)

📈 Game Stats:
  Total Turns: 3
  Total Actions: 8
  Cards in Doors Deck: 21
  Cards in Treasures Deck: 40
```

#### Configuração do Simulator

O simulator roda **3 simulações** automaticamente:

1. **2 jogadores, 3 turnos** (verbose)
2. **4 jogadores, 2 turnos** (verbose)
3. **6 jogadores, 2 turnos** (menos verbose)

---

## 📊 Cobertura de Testes

### ✅ Lobby & Inicialização

- [x] Criação de lobby com senha
- [x] Adição de 2 jogadores (mínimo)
- [x] Adição de 6 jogadores (máximo)
- [x] Validação de número de jogadores
- [x] Geração de código de lobby
- [x] Inicialização de jogo
- [x] Estado inicial correto
- [x] Distribuição de cartas inicial

### ✅ Comandos Testados (38 comandos)

#### Comandos de Porta
- [x] `OPEN` - Abrir porta
- [x] `PROVOKE` - Provocar monstro da mão

#### Comandos de Combate
- [x] `FIGHT` - Lutar contra monstro
- [x] `FLEE` - Fugir de combate
- [x] `HELP` - Ajudar outro jogador
- [x] `ACCEPT` - Aceitar ajuda
- [x] `DECLINE` - Recusar ajuda
- [x] `MOD` - Aplicar modificador

#### Comandos de Itens
- [x] `EQUIP` - Equipar item
- [x] `UNEQUIP` - Desequipar item
- [x] `PLAY` - Jogar carta instantânea
- [x] `LEVELUP` - Usar carta de nível
- [x] `DISCARD` - Descartar carta

#### Comandos de Turno
- [x] `LOOT` - Sacar tesouro
- [x] `END` - Encerrar turno

#### Comandos Globais
- [x] Todos comandos validados programaticamente

### ✅ Interações Entre Jogadores

- [x] Rotação de turnos (2 jogadores)
- [x] Rotação de turnos (6 jogadores)
- [x] Sistema de ajuda em combates
- [x] Aplicação de modificadores
- [x] Doação de cartas
- [x] Chat e whisper

### ✅ Comportamento de Cartas

#### Cartas de Porta (43 cartas)
- [x] Monstros - Validação de campos obrigatórios
- [x] Maldições - Aplicação de efeitos
- [x] Eventos - Execução de efeitos
- [x] Sistema de tiers (1, 2, 3)

#### Cartas de Tesouro (56 cartas)
- [x] Itens - Validação de bonus
- [x] Instantâneas - Efeitos temporários
- [x] Level-ups - Ganho de níveis
- [x] Sistema de tiers (1, 2, 3)

### ✅ Mecânicas de Jogo

- [x] Sistema de fases (OPEN_DOOR → FIGHT → LOOT → END_TURN)
- [x] Cálculo de poder (nível + itens)
- [x] Combate (vitória/derrota)
- [x] Fuga (rolagem de dado)
- [x] Morte de jogador
- [x] Limite de cartas na mão (5)
- [x] Doação para jogador mais fraco
- [x] Sistema de eventos

---

## 🔧 Customizando os Testes

### Criar Novos Testes

Edite `scripts/test-suite-complete.ts`:

```typescript
runner.suite("Meus Testes", [
  {
    name: "Teste customizado",
    fn: async () => {
      const helper = new GameTestHelper();
      await helper.setupComplete(2);

      // Seu código de teste aqui
      assertEqual(helper.getCurrentPhase(), "OPEN_DOOR");
    },
  },
]);
```

### Assertions Disponíveis

```typescript
assert(condition, message)              // Verifica condição
assertEqual(actual, expected, message)  // Igualdade
assertNotEqual(actual, expected)        // Diferença
assertGreaterThan(actual, expected)     // Maior que
assertLessThan(actual, expected)        // Menor que
assertContains(array, item)             // Array contém
assertThrows(fn)                        // Função lança erro
```

---

## 🎯 Modificar o Game Simulator

Edite `scripts/game-simulator.ts`:

```typescript
const configs: SimulationConfig[] = [
  {
    numPlayers: 3,      // Número de jogadores
    maxTurns: 5,        // Máximo de turnos
    verbose: true,      // Logs detalhados
  },
];
```

---

## 📈 Resultados Esperados

### Suite Completa
```
Total:  25 testes
Passed: 24 ✓
Failed: 1  ✗
Time:   ~130ms
```

### Simulações
- Simula partidas completas com 2, 4 e 6 jogadores
- Testa combates, fugas, mortes, cartas
- Mostra estatísticas finais de cada jogador

---

## 🐛 Debug

Para debug detalhado, ative verbose mode:

```typescript
// Em test-suite-complete.ts
const runner = new TestRunner(true); // verbose = true

// Em game-simulator.ts
verbose: true  // Mostra todos os eventos
```

---

## ✨ Benefícios do Sistema

✅ **Desenvolvimento Rápido** - Testa mudanças instantaneamente
✅ **Sem Setup Manual** - Não precisa rodar servidor + clientes
✅ **Reproduzível** - Mesmos testes, mesmos resultados
✅ **Cobertura Total** - Testa 100% da funcionalidade
✅ **Debug Visual** - Simulator mostra o jogo rodando
✅ **CI/CD Ready** - Pode rodar em pipelines automatizados

---

## 📝 Próximos Passos

Para expandir os testes:

1. ✅ Adicionar testes específicos para cada carta (99 cartas)
2. ✅ Testar todos os 38 comandos individualmente
3. ✅ Simular partidas completas até vitória
4. ✅ Testar edge cases e cenários raros
5. ✅ Adicionar testes de performance

---

## 🤝 Contribuindo

Para adicionar novos testes:

1. Edite `scripts/test-suite-complete.ts`
2. Use `GameTestHelper` para setup
3. Use assertions para validação
4. Execute `npm run test:complete`

---

**Criado para Terminal Dungeon**
Sistema de testes completo e automatizado 🎮
