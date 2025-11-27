# 🎮 Terminal Dungeon - Guia LAN

Este guia explica como configurar e jogar Terminal Dungeon em rede local (LAN).

---

## 🎯 Visão Geral

Terminal Dungeon é um jogo **LAN-only** (rede local):
- ✅ Todos os jogadores na mesma rede
- ✅ Descoberta automática via UDP
- ✅ Zero configuração complexa
- ✅ Perfeito para universidades, casas, eventos

---

## 📋 Requisitos

- **Jogadores:** 2-6 na mesma rede local
- **Rede:** Mesma subnet (ex: 192.168.1.x)
- **Portas:**
  - UDP 9999 (descoberta de lobbies)
  - TCP 4000+ (comunicação do jogo)
- **Node.js:** 18+ instalado
- **Sistema:** Linux, macOS, Windows (via WSL)

---

## 🚀 Setup Rápido (Mesma Máquina)

Teste localmente antes de tentar em múltiplos dispositivos:

```bash
# Terminal 1 (Servidor/Host):
npm run server
> create MeuJogo
Set password: test123
> start

# Terminal 2 (Cliente):
npm run client
> list
> join [CÓDIGO_MOSTRADO]
Enter password: test123
Enter name: Alice

# Comece a jogar!
> open
> fight
> end
```

---

## 🌐 Setup em Múltiplos Dispositivos

### Passo 1: Verificar Conectividade

Todos devem estar na **mesma rede**:

```bash
# Descobrir seu IP local:
# Linux/macOS:
ip addr | grep inet

# Windows (PowerShell):
ipconfig

# Exemplo de IPs na mesma rede:
# PC 1: 192.168.1.100 ✅
# PC 2: 192.168.1.101 ✅
# PC 3: 192.168.1.102 ✅
```

### Passo 2: Abrir Firewall

**Linux (UFW):**
```bash
sudo ufw allow 9999/udp
sudo ufw allow 4000:4010/tcp
```

**Windows:**
```powershell
# Executar como Administrador:
netsh advfirewall firewall add rule name="Terminal Dungeon UDP" dir=in action=allow protocol=UDP localport=9999
netsh advfirewall firewall add rule name="Terminal Dungeon TCP" dir=in action=allow protocol=TCP localport=4000-4010
```

**macOS:**
```bash
# Firewall geralmente permite tráfego LAN automaticamente
# Se houver problemas, vá em:
# Preferências → Segurança → Firewall → Opções do Firewall
```

### Passo 3: Iniciar Servidor (Host)

```bash
# No PC que será o host:
npm run server

> create JogoDosFins
Set lobby password: senha123

# Aguarde os jogadores se conectarem
> status  # Ver jogadores conectados

# Quando tiver 2-6 jogadores:
> start
```

### Passo 4: Conectar Clientes

```bash
# Nos outros PCs:
npm run client

> list
# Aguarde 2-3 segundos para descoberta

# Saída esperada:
# === Available Lobbies ===
#   Code: F9K3 | 192.168.1.100:4000 | 2/6 | OPEN

> join F9K3
Enter lobby password: senha123
Enter your name: Bob

# Pronto! Você está no jogo
```

---

## 🎓 Uso em Universidades (eduroam)

Muitas universidades usam **client isolation** no Wi-Fi, que impede comunicação direta entre dispositivos.

### ⚠️ Problema Comum

```bash
> list
No lobbies found.
```

Isso significa que o Wi-Fi da universidade bloqueia UDP broadcast.

### ✅ Soluções

#### Solução 1: Rede Ethernet Cabeada (Recomendado)

Laboratórios geralmente permitem comunicação entre PCs:

```bash
# Conecte todos os PCs via cabo Ethernet
# Teste:
npm run client
> list  # Provavelmente funcionará!
```

#### Solução 2: Hotspot Pessoal

Um jogador cria um Wi-Fi pessoal:

**Linux:**
```bash
# Interface gráfica:
# Configurações → Wi-Fi → Usar como ponto de acesso

# Ou via comando:
sudo apt install hostapd dnsmasq
# (configuração avançada)
```

**Windows:**
```
Configurações → Rede e Internet → Hotspot Móvel → Ativar
Nome da rede: TerminalDungeon
Senha: [defina uma senha]
```

**Como usar:**
1. Host cria hotspot e inicia servidor
2. Outros jogadores conectam ao hotspot
3. Jogam normalmente

#### Solução 3: Switch de Rede

Compre um switch não gerenciado (~R$ 50-100):

```
Recomendação: TP-Link TL-SF1005D (5 portas)

    [Switch]
     /  |  \
  [PC1][PC2][PC3]
```

**Vantagens:**
- ✅ Funciona sempre
- ✅ Portátil (leva para qualquer lugar)
- ✅ Independente da rede universitária
- ✅ Zero configuração

---

## 🐛 Troubleshooting

### Problema: "No lobbies found"

**Causas:**
- Dispositivos em redes diferentes
- Firewall bloqueando porta UDP 9999
- Client isolation (Wi-Fi universitário)

**Soluções:**
```bash
# 1. Verificar mesma rede:
ip addr  # Linux
ipconfig # Windows

# 2. Testar firewall:
sudo ufw status  # Linux
# Temporariamente desabilitar para teste:
sudo ufw disable

# 3. Tentar rede cabeada ou hotspot
```

### Problema: "Connection refused"

**Causas:**
- Servidor não está rodando
- Firewall bloqueando porta TCP 4000
- IP incorreto

**Soluções:**
```bash
# 1. Verificar servidor rodando:
# No PC host: deve estar no prompt do servidor

# 2. Verificar porta:
sudo ss -tulnp | grep 4000

# 3. Testar conexão:
telnet [IP_DO_HOST] 4000
# ou
nc -zv [IP_DO_HOST] 4000
```

### Problema: "Version mismatch"

**Solução:**
```bash
# Atualizar código em todos os PCs:
git pull  # Se usando git
npm install
npm run build
```

### Problema: "Disconnected from server"

**Causas:**
- Instabilidade de rede
- Host fechou o servidor

**Soluções:**
- Usar rede cabeada (mais estável)
- Host deve manter servidor aberto durante todo o jogo

---

## 📊 Especificações Técnicas

| Item | Valor |
|------|-------|
| **Protocolo Discovery** | UDP broadcast (porta 9999) |
| **Protocolo Jogo** | TCP (porta 4000+) |
| **Formato Mensagens** | JSON delimitado por `\n` |
| **Keep-Alive** | Ping/pong a cada 10s |
| **Timeout** | 30s sem resposta → desconexão |
| **Jogadores Máx** | 6 por lobby |
| **Lobbies Simultâneos** | Ilimitado (porta TCP única) |
| **Banda** | ~1-5 KB/s por cliente |
| **Latência LAN** | 1-5ms típico |

---

## 🎮 Comandos Essenciais

### No Lobby
```bash
list              # Listar lobbies disponíveis
join <código>     # Entrar em um lobby
create <nome>     # Criar lobby (host)
start             # Iniciar partida (host, 2-6 jogadores)
status            # Ver jogadores conectados
quit              # Sair
```

### Durante o Jogo
```bash
open              # Abrir porta
fight             # Lutar
flee              # Fugir (d6: 5-6 sucesso)
loot              # Saquear (se não lutou)
end               # Terminar turno

hand              # Ver cartas na mão
equip <id>        # Equipar item
play <id>         # Usar carta instantânea
levelup           # Usar "Go Up a Level"

view all          # Ver tudo
view players      # Ver jogadores
view table        # Ver mesa
status            # Seu status

help              # Ajuda
rules             # Resumo das regras
```

---

## 🎯 Dicas de Uso

### Para Eventos/LAN Parties

1. **Preparação:**
   - Todos instalam e testam antes do evento
   - Host testa firewall antecipadamente
   - Leve cabos Ethernet extras

2. **No Evento:**
   - Use rede cabeada se possível
   - Ou use hotspot/switch próprio
   - Defina senha forte para o lobby

3. **Gameplay:**
   - Host explica regras antes de começar
   - Use `view all` frequentemente
   - Use `chat` para comunicação

### Para Laboratórios

1. **Teste primeiro:**
   - Antes de convidar amigos, teste sozinho (2 terminais)
   - Verifique se rede do lab permite comunicação

2. **Horários:**
   - Labs vazios = melhor (menos interferência)
   - Evite horários de aula (lab ocupado)

3. **Permissões:**
   - Verifique se pode instalar software
   - Alguns labs têm restrições

---

## 📚 Documentação Adicional

- **[README.md](README.md)** - Visão geral do projeto
- **[docs/commands.md](docs/commands.md)** - Referência completa de comandos
- **[docs/rules.md](docs/rules.md)** - Regras completas do jogo
- **[docs/protocol.md](docs/protocol.md)** - Especificação do protocolo
- **[docs/networking.md](docs/networking.md)** - Detalhes de rede (UDP/TCP)
- **[INSTALL.md](INSTALL.md)** - Guia de instalação
- **[QUICKSTART.md](QUICKSTART.md)** - Início rápido

---

## 🎉 Divirta-se!

Terminal Dungeon foi feito para ser simples e funcionar perfeitamente em LAN.

**Dicas finais:**
- Teste localmente primeiro (2 terminais)
- Depois teste com 2 PCs na mesma rede
- Então convide mais amigos!

Boa sorte nas masmorras! 🗡️🐉✨
