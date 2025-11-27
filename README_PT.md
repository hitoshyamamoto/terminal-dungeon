# Terminal Dungeon (Português)

Um jogo de cartas multiplayer estilo Munchkin que roda inteiramente no terminal!

## 🎮 O Que É?

Terminal Dungeon é uma versão simplificada do Munchkin para terminal, com:
- **38 comandos CLI** - Sem interface gráfica, apenas comandos de texto
- **Multiplayer LAN** - Jogue com 2-6 amigos na mesma rede
- **Auto-descoberta** - Encontra lobbies automaticamente
- **99 cartas** - Sistema completo de portas e tesouros
- **Sistema de tiers** - Cartas mais poderosas desbloqueadas por nível

## 🚀 Início Rápido

### 1. Pré-requisitos

- **Node.js 18+** instalado
- **Terminal** (WSL Ubuntu recomendado no Windows)

### 2. Instalar

```bash
npm install
npm run build
```

### 3. Jogar

**Terminal 1 (Host):**
```bash
npm run server
# > create MeuJogo
# > (digite senha)
# > start
```

**Terminal 2 (Jogador):**
```bash
npm run client
# > list
# > join <CÓDIGO>
# > (digite senha)
```

## 📚 Documentação

- **[START_HERE.md](START_HERE.md)** - ⭐ COMECE AQUI!
- **[QUICKSTART.md](QUICKSTART.md)** - Guia rápido (5 minutos)
- **[INSTALL.md](INSTALL.md)** - Instalação detalhada
- **[docs/commands.md](docs/commands.md)** - Todos os comandos
- **[docs/rules.md](docs/rules.md)** - Regras do jogo
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Resumo técnico

## 🎯 Objetivo

Seja o primeiro a chegar no **Nível 15**!

## 🎲 Como Jogar

### Seu Turno

1. **Abra uma Porta:** `open`
   - Revela um monstro, maldição ou evento

2. **Lute (se for monstro):** `fight` ou `flee`
   - Poder ≥ Nível do Monstro = Vitória
   - Vitória = +1 Nível + Tesouros
   - Derrota = Fuga (d6: 5-6 sucesso) ou penalidade

3. **Saque (se não lutou):** `loot`
   - Pega uma carta virada para baixo

4. **Termine:** `end`
   - Limite de 5 cartas na mão

### Comandos Principais

```bash
open              # Abrir porta
fight             # Lutar
flee              # Fugir
loot              # Saquear
end               # Terminar turno

hand              # Ver suas cartas
equip <id>        # Equipar item
levelup           # Usar carta de nível

view all          # Ver tudo
status            # Seu status
help              # Ajuda
rules             # Regras
```

## 🃏 Sistema de Cartas

### Portas (Doors)
- **Monstros** - Lute para ganhar níveis e tesouros
- **Maldições** - Efeitos negativos
- **Eventos** - Efeitos variados

### Tesouros (Treasures)
- **Itens** - Equipamentos que dão bônus de poder
- **Instantâneos** - Use durante combate
- **Suba um Nível** - +1 nível (máximo 1 por turno)

### Sistema de Tiers

| Tier | Nível | Monstros | Itens |
|------|-------|----------|-------|
| 1    | 1-5   | Lvl 1-5  | +1 a +3 |
| 2    | 6-10  | Lvl 6-10 | +3 a +5 |
| 3    | 11-15 | Lvl 11-15 | +5 a +8 |

**Quanto maior seu nível, mais chance de pegar cartas poderosas!**

## 🌐 Rede Local

### Mesma Máquina
```bash
# Terminal 1
npm run server

# Terminal 2  
npm run client
```

### Múltiplas Máquinas
1. Todos na mesma rede Wi-Fi/Ethernet
2. Servidor no computador do host
3. Clientes nos outros computadores
4. Use `list` para encontrar o lobby
5. Use `join <CÓDIGO>` para entrar

### Firewall
Abra estas portas:
- **UDP 9999** - Descoberta de lobbies
- **TCP 4000-4010** - Comunicação do jogo

## 🛠️ Ferramentas

### Validar Decks
```bash
npm run deckcheck
```

### Verificar Código
```bash
npm run lint
```

### Testes
```bash
npm test
```

## 📊 Estrutura

```
terminal-dungeon/
├── client/           # Cliente (jogador)
├── server/           # Servidor (host)
├── shared/           # Código compartilhado
├── decks/            # Baralhos YAML
│   ├── doors/        # Portas (43 cartas)
│   └── treasures/    # Tesouros (56 cartas)
├── docs/             # Documentação
└── scripts/          # Utilitários
```

## 💡 Dicas

1. **Equipe itens cedo** para aumentar poder
2. **Guarde cartas de nível** para momentos críticos  
3. **Ajude outros jogadores** para ganhar recompensas
4. **Acompanhe o feed** de eventos

## 🐛 Problemas?

### Não encontra lobbies
- Aguarde 2-3 segundos
- Verifique firewall (UDP 9999)
- Mesma rede?

### Não conecta
- Servidor está rodando?
- Senha correta?
- Firewall (TCP 4000)?

### npm não funciona
- Instale Node.js 18+
- Use WSL Ubuntu no Windows

## 📖 Mais Informações

- **Instalação:** [INSTALL.md](INSTALL.md)
- **Guia Rápido:** [QUICKSTART.md](QUICKSTART.md)
- **Comandos:** [docs/commands.md](docs/commands.md)
- **Regras:** [docs/rules.md](docs/rules.md)
- **Rede:** [docs/networking.md](docs/networking.md)
- **Protocolo:** [docs/protocol.md](docs/protocol.md)

## 🤝 Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para:
- Reportar bugs
- Sugerir features
- Criar novos decks
- Contribuir código

## 📜 Licença

MIT - veja [LICENSE](LICENSE)

## 🎉 Status

✅ **100% COMPLETO** - Todos os requisitos implementados!

**Divirta-se!** 🎲🗡️🐉

