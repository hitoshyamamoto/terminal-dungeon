# 🔒 WireGuard - Solução 100% Terminal para Internet

**Nível:** ⭐⭐⭐⭐ Avançado
**Tempo:** 15-20 minutos
**Requer:** Conhecimento de Linux, SSH ou troca de arquivos

---

## ⚠️ Aviso

Esta é a **única solução 100% terminal**, mas é **significativamente mais complexa** que Tailscale.

**Recomendação honesta:** Se você não se importa em abrir o navegador **uma única vez** para criar a rede no ZeroTier, essa é uma opção muito mais simples.

---

## 📋 Pré-requisitos

- Ambos usando Linux (WSL funciona)
- Capacidade de trocar arquivos de texto (WhatsApp, email, etc)
- OU um dos dois tem IP público para SSH

---

## Opção A: Um Jogador Tem IP Público (Mais Fácil)

### Passo 1: Host Instala e Configura WireGuard

**No terminal do host:**

```bash
# Instalar WireGuard
sudo apt update
sudo apt install wireguard -y

# Gerar chaves
wg genkey | tee privatekey | wg pubkey > publickey

# Ver chaves
echo "Private Key:"
cat privatekey
echo "Public Key:"
cat publickey

# Configurar interface
sudo nano /etc/wireguard/wg0.conf
```

**Conteúdo do arquivo `/etc/wireguard/wg0.conf`:**

```ini
[Interface]
PrivateKey = [sua_private_key_aqui]
Address = 10.0.0.1/24
ListenPort = 51820

# Habilitar roteamento
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Peer (cliente) - será adicionado depois
[Peer]
PublicKey = [public_key_do_cliente]
AllowedIPs = 10.0.0.2/32
```

**Iniciar WireGuard:**

```bash
# Habilitar IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# Iniciar interface
sudo wg-quick up wg0

# Verificar status
sudo wg show

# Abrir porta no firewall
sudo ufw allow 51820/udp
```

**Descobrir IP público:**

```bash
curl ifconfig.me
# Exemplo: 203.0.113.25
```

### Passo 2: Cliente Instala e Configura

**No terminal do cliente:**

```bash
# Instalar WireGuard
sudo apt update
sudo apt install wireguard -y

# Gerar chaves
wg genkey | tee privatekey | wg pubkey > publickey

# Ver chaves
echo "Public Key (envie para o host):"
cat publickey
```

**Enviar sua public key para o host via WhatsApp/email/etc**

**Host adiciona peer no arquivo `/etc/wireguard/wg0.conf`:**

```ini
# Adicionar ao final:
[Peer]
PublicKey = [public_key_do_cliente_aqui]
AllowedIPs = 10.0.0.2/32
```

**Host reinicia WireGuard:**

```bash
sudo wg-quick down wg0
sudo wg-quick up wg0
```

**Cliente cria arquivo de configuração:**

```bash
sudo nano /etc/wireguard/wg0.conf
```

**Conteúdo:**

```ini
[Interface]
PrivateKey = [sua_private_key]
Address = 10.0.0.2/24

[Peer]
PublicKey = [public_key_do_host]
Endpoint = [IP_PUBLICO_DO_HOST]:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

**Cliente conecta:**

```bash
sudo wg-quick up wg0

# Testar conectividade
ping 10.0.0.1
```

### Passo 3: Jogar!

```bash
# Host:
npm run server
> create MeuJogo

# Cliente:
npm run client
> list    # Funciona! VPN está ativa
> join [CÓDIGO]
```

---

## Opção B: Nenhum Tem IP Público (Mais Complexo)

Neste caso, precisa de um **servidor relay** (VPS) ou usar **WireGuard com STUN** (muito complexo).

**Não recomendado** - melhor usar ZeroTier neste caso.

---

## 🔧 Comandos Úteis

```bash
# Ver status
sudo wg show

# Parar VPN
sudo wg-quick down wg0

# Iniciar VPN
sudo wg-quick up wg0

# Ver logs
sudo journalctl -u wg-quick@wg0

# Testar conectividade
ping 10.0.0.1  # Do cliente para host
ping 10.0.0.2  # Do host para cliente
```

---

## 🐛 Troubleshooting

### Não conecta

```bash
# Verificar se interface está ativa
ip addr show wg0

# Verificar firewall
sudo ufw status
sudo ufw allow 51820/udp

# Verificar roteamento
sudo sysctl net.ipv4.ip_forward
```

### Conecta mas `list` não funciona

```bash
# Verificar se broadcast UDP funciona na VPN
# (WireGuard não suporta broadcast por padrão!)

# SOLUÇÃO: Use o comando 'connect' em vez de 'list'
# Cliente usa:
> connect
Enter IP:PORT: 10.0.0.1:4000
```

**IMPORTANTE:** WireGuard bloqueia broadcast UDP por padrão. Você **precisará** usar o comando `connect` (Opção 2) mesmo com VPN!

---

## ⚠️ Problema: WireGuard + UDP Broadcast

WireGuard **não propaga broadcasts** por padrão. Isso significa que mesmo com VPN ativa, o comando `list` (que usa UDP broadcast) **não funcionará**.

**Você precisará:**

1. Usar WireGuard para conectividade
2. **E também aplicar o patch do comando `connect`** (INTERNET_PATCH.md)

Ou seja, não evita modificar o código! 😕

---

## 💡 Conclusão Honesta

**WireGuard 100% terminal é possível, MAS:**

1. ✅ É 100% terminal
2. ❌ Muito mais complexo que Tailscale
3. ❌ Ainda precisa do comando `connect` (UDP broadcast não funciona)
4. ❌ Requer IP público de um dos lados (ou VPS)
5. ❌ Troca manual de chaves públicas

**Comparação:**

| Tarefa | WireGuard | Tailscale | LAN |
|--------|-----------|-----------|-----|
| Setup inicial | 20 min | 2 min | 0 min |
| Usa navegador | ❌ Não | ✅ 1 vez (login) | ❌ Não |
| Precisa IP público | ✅ Sim | ❌ Não | ❌ Não |
| Comando `connect` | ✅ Precisa | ❌ Não precisa | ❌ Não precisa |
| Complexidade | ⭐⭐⭐⭐ | ⭐ | - |

---

## 🎯 Recomendação Final

Se seu objetivo é **evitar navegador completamente**, considere:

1. **Continuar com LAN** - Mais simples, zero configuração

2. **Aceitar abrir navegador 1 vez** - Use Tailscale:
   - Instalação: terminal
   - Login: navegador (1 vez apenas)
   - Uso: terminal (sempre)
   - Muito mais fácil que WireGuard

3. **Se realmente quer 100% terminal** - Use WireGuard:
   - Mas saiba que é complexo
   - E ainda precisará modificar código (comando `connect`)
   - E um dos lados precisa IP público

---

A escolha é sua! 🚀
