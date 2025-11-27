# Terminal Dungeon (Português)

> Um jogo de cartas multiplayer inspirado em Munchkin que roda inteiramente no terminal

[![Licença: MIT](https://img.shields.io/badge/Licença-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Início Rápido

```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Terminal 1: Iniciar servidor/host
npm run server

# Terminal 2: Iniciar cliente/jogador
npm run client
```

**[📖 Guia de Instalação](docs/INSTALL.md)** | **[🚀 Início Rápido (5min)](docs/QUICKSTART.md)** | **[🇺🇸 English](README.md)**

---

## O que é Terminal Dungeon?

Um **jogo de cartas multiplayer** para 2-6 jogadores em rede local:
- 🎮 **38 comandos CLI** - Sem interface gráfica, apenas terminal
- 🌐 **Auto-descoberta** - Encontra jogos na rede automaticamente
- 🃏 **99 cartas** - Sistema completo com 3 níveis de progressão
- 🔒 **Lobbies protegidos por senha** - Jogos privados
- 🎲 **Gameplay estilo Munchkin** - Lute contra monstros, colete tesouros, chegue ao Nível 15

---

## Características

| Recurso | Descrição |
|---------|-----------|
| **Apenas CLI** | Todas as ações via comandos de texto |
| **Multiplayer LAN** | Auto-descoberta UDP + gameplay sincronizado TCP |
| **Múltiplos Lobbies** | Jogos protegidos por senha na mesma rede |
| **Decks Modulares** | Definições de cartas em YAML com validação |
| **Progressão por Tiers** | Desbloqueie cartas mais fortes conforme sobe de nível |
| **Servidor Autoritativo** | Motor de regras robusto baseado em FSM |
| **Reconexão** | Ressincronização automática de estado |

---

## Gameplay

**Objetivo:** Seja o primeiro a chegar no **Nível 15**!

**Seu Turno:**
1. **Abrir Porta** - Revele um Monstro, Maldição ou Evento
2. **Lutar ou Fugir** - Lute contra monstros para ganhar níveis e tesouros
3. **Saquear** - Pegue tesouro se não lutou
4. **Terminar Turno** - Descarte até ter 5 cartas

**Poder = Seu Nível + Bônus dos Itens**

[📚 Regras Completas](docs/ABOUT_GAME/rules.md) | [💬 Todos os Comandos](docs/ABOUT_GAME/commands.md)

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| **[START_HERE.md](docs/START_HERE.md)** | Guia para novos usuários - comece por aqui! (por favor) |
| **[QUICKSTART.md](docs/QUICKSTART.md)** | Jogo rápido |
| **[INSTALL.md](docs/INSTALL.md)** | Instruções detalhadas de instalação |
| **[TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** | Testes automatizados & simulação |
| **[LAN_SETUP_GUIDE.md](docs/LAN_SETUP_GUIDE.md)** | Configuração de rede & troubleshooting |
| **[PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)** | Visão técnica & arquitetura |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Como contribuir |

### Documentação do Jogo

- [Referência de Comandos](docs/ABOUT_GAME/commands.md) - Todos os 38 comandos explicados
- [Regras do Jogo](docs/ABOUT_GAME/rules.md) - Regras completas de gameplay
- [Guia de Rede](docs/ABOUT_GAME/networking.md) - Configuração LAN & firewall
- [Especificação do Protocolo](docs/ABOUT_GAME/protocol.md) - Detalhes do protocolo de rede
- [Interações de Cartas](docs/ABOUT_GAME/card_interactions.md) - Mecânicas & efeitos das cartas

---

## Comandos Essenciais

```bash
# Lobby
list                  # Listar jogos disponíveis
join <código>         # Entrar em um lobby (código de 4 caracteres)
create <nome>         # Criar um lobby (host)
start                 # Iniciar jogo (host, 2-6 jogadores)

# Gameplay
open                  # Abrir uma porta
fight                 # Lutar contra monstro
flee                  # Tentar fugir (d6: 5-6 sucesso)
loot                  # Pegar tesouro
end                   # Terminar seu turno

# Itens & Cartas
hand                  # Ver suas cartas
equip <id>            # Equipar item
levelup               # Usar carta "Suba um Nível"
view all              # Ver tudo

# Ajuda
help                  # Mostrar todos os comandos
rules                 # Resumo rápido das regras
status                # Seu nível e poder
```

---

## Desenvolvimento

```bash
# Executar testes automatizados
npm run test:complete

# Executar simulador de jogo
npm run test:simulate

# Validar decks
npm run deckcheck

# Verificar código
npm run lint
```

---

## Stack Tecnológica

- **Runtime:** Node.js 18+ com TypeScript
- **Rede:** TCP nativo (`net`) e UDP (`dgram`)
- **Validação:** Schemas Zod
- **Formato de Dados:** Decks YAML (js-yaml)
- **Logging:** Pino

---

## Portas de Rede

- **UDP 9999** - Descoberta de lobbies (beacons a cada 2s)
- **TCP 4000+** - Protocolo do jogo (JSON por linha)

Certifique-se de que essas portas estejam abertas no firewall para multiplayer!

---

## Estrutura do Projeto

```
terminal-dungeon/
├── client/           # Implementação do cliente
├── server/           # Implementação do servidor
├── shared/           # Código & tipos compartilhados
├── decks/            # Definições de cartas YAML
├── docs/             # Documentação
└── scripts/          # Utilitários & testes
```

---

## Licença

[MIT](LICENSE) - Veja o arquivo LICENSE para detalhes

---

## Status

✅ **100% Completo** - Todos os requisitos implementados e testados!

---

**Pronto para jogar?** Confira **[START_HERE.md](docs/START_HERE.md)** para começar!
