# 🌐 Terminal Dungeon - Guia de Jogo pela Internet

Este guia explica **3 formas** de jogar Terminal Dungeon com amigos em **redes diferentes** (internet).

---

## 📋 Comparação das Soluções

| Solução | Dificuldade | Modificação de Código | Custo | Velocidade |
|---------|-------------|----------------------|-------|------------|
| **1. VPN Virtual (ZeroTier/Tailscale)** | ⭐ Fácil | ❌ Não | 🆓 Grátis | ⚡ Rápida |
| **2. Port Forwarding** | ⭐⭐ Média | ✅ Sim (pequena) | 🆓 Grátis | ⚡⚡ Muito Rápida |
| **3. Servidor VPS (Nuvem)** | ⭐⭐⭐ Avançada | ✅ Sim (pequena) | 💰 ~$5/mês* | ⚡⚡ Muito Rápida |

*Pode ser grátis com Oracle Cloud Always Free ou AWS Free Tier

---

## Solução 1: VPN Virtual (RECOMENDADO) 🎯

Cria uma rede virtual entre vocês - **não precisa modificar código!**

### Opção A: ZeroTier (Mais Popular)

#### Passo 1: Criar Rede
1. Acesse: https://my.zerotier.com
2. Faça login (grátis)
3. Clique em "Create A Network"
4. Copie o **Network ID** (16 caracteres, ex: `a1b2c3d4e5f6g7h8`)

#### Passo 2: Instalar nos Computadores

**Linux/WSL (Ubuntu):**
```bash
curl -s https://install.zerotier.com | sudo bash
```

**Windows:**
- Baixar: https://www.zerotier.com/download/
- Instalar o programa

**Mac:**
```bash
brew install zerotier-one
```

#### Passo 3: Conectar à Rede

```bash
# Substitua pelo seu Network ID
sudo zerotier-cli join a1b2c3d4e5f6g7h8
```

#### Passo 4: Autorizar Membros
1. Volte em https://my.zerotier.com
2. Vá na sua rede
3. Role até "Members"
4. Marque a caixa ✅ ao lado de cada membro

#### Passo 5: Verificar IPs Virtuais

```bash
# Ver seu IP virtual (começa com 10.x ou 172.x)
ip addr show zt0  # Linux
ipconfig          # Windows
```

#### Passo 6: Jogar!

```bash
# Host:
npm run server
> create MeuJogo
# (define senha)

# Cliente:
npm run client
> list               # Funcionará automaticamente!
> join <CÓDIGO>
```

---

### Opção B: Tailscale (Mais Fácil)

#### Passo 1: Instalar

**Linux/WSL:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**Windows/Mac:**
- Baixar: https://tailscale.com/download

#### Passo 2: Fazer Login
```bash
sudo tailscale up
# Abrirá navegador para login (use conta Google/Microsoft/GitHub)
```

#### Passo 3: Jogar!
```bash
# Pronto! Todos na mesma rede virtual
npm run server  # Host
npm run client  # Cliente usa 'list'
```

**Vantagem:** Tailscale é **automático** - não precisa criar/configurar rede manualmente!

---

### Opção C: Hamachi (Interface Gráfica)

1. Baixar: https://www.vpn.net/
2. Instalar
3. Criar rede privada (botão "Create Network")
4. Compartilhar nome da rede + senha com amigos
5. Amigos clicam em "Join Network"
6. Jogar normalmente!

---

## Solução 2: Port Forwarding + Comando `connect` 🔧

Permite conexão direta via IP público. **Requer modificação pequena no código.**

### Passo 1: Adicionar Comando `connect`

Adicione este código ao cliente para permitir conexão direta:

**Arquivo: `client/index.ts`**

Adicione estas linhas após importações:
```typescript
import type { ClientDiscovery } from "./discovery.js";

// Adicione esta função helper
async function promptConnect(rl: readline.Interface): Promise<{host: string, port: number, code: string} | null> {
  return new Promise((resolve) => {
    rl.question("Enter server IP:PORT (ex: 203.0.113.25:4000): ", (ipPort) => {
      rl.question("Enter lobby code: ", (code) => {
        const [host, portStr] = ipPort.split(":");
        const port = parseInt(portStr) || 4000;

        if (!host || !code) {
          console.log(colorize("Invalid input.", "red"));
          resolve(null);
          return;
        }

        resolve({ host, port, code: code.toUpperCase() });
      });
    });
  });
}
```

Modifique o switch do comando `join` para aceitar IP direto:

```typescript
case "connect": {
  const connection = await promptConnect(rl);
  if (!connection) break;

  // Conectar diretamente (sem UDP discovery)
  const password = await prompt(rl, "Enter lobby password: ");
  const name = await prompt(rl, "Enter your name: ");

  try {
    await client.connect(connection.host, connection.port);
    client.send({
      t: "JOIN",
      lobbyId: connection.code, // Usa código como ID temporário
      name,
      password,
    });
  } catch (err) {
    console.log(colorize(`Failed to connect: ${(err as Error).message}`, "red"));
  }
  break;
}
```

### Passo 2: Configurar Port Forwarding no Roteador

#### 2.1: Descobrir IP Local
```bash
# Linux/Mac:
ip addr | grep inet

# Windows:
ipconfig

# Procure por: 192.168.x.x ou 10.x.x.x
```

#### 2.2: Acessar Roteador
1. Abra navegador: `http://192.168.0.1` ou `http://192.168.1.1`
2. Login (geralmente admin/admin, veja etiqueta do roteador)
3. Procure: **Port Forwarding**, **Virtual Server**, ou **NAT**

#### 2.3: Criar Regra
```
Nome: Terminal Dungeon
Protocolo: TCP
Porta Externa: 4000
Porta Interna: 4000
IP Destino: [SEU IP LOCAL, ex: 192.168.1.100]
```

**Importante:** Também abra porta **UDP 9999** se quiser que `list` funcione!

#### 2.4: Descobrir IP Público

```bash
curl ifconfig.me
# Ou acesse: https://www.whatismyip.com/
```

Exemplo de IP público: `203.0.113.25`

### Passo 3: Modificar Servidor para Mostrar IP Público

**Arquivo: `server/index.ts`**

Adicione função para obter IP público:

```typescript
private async getPublicIp(): Promise<string> {
  try {
    const https = await import('https');
    return new Promise((resolve) => {
      https.get('https://api.ipify.org', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data.trim()));
      }).on('error', () => resolve('N/A'));
    });
  } catch {
    return 'N/A';
  }
}
```

Modifique `cmdCreate` para mostrar IP público:

```typescript
private async cmdCreate(name: string): Promise<void> {
  // ... código existente ...

  const localIp = this.getLocalIp();
  const publicIp = await this.getPublicIp();

  // ... resto do código ...

  console.log(colorize(`\n✓ Lobby created!`, "green"));
  console.log(`  Code: ${colorize(code, "bright")}`);
  console.log(`  Port: ${port}`);
  console.log(`  Local IP: ${localIp} (LAN)`);
  console.log(`  Public IP: ${colorize(publicIp, "bright")} (Internet)`);
  console.log();
  console.log(colorize("For internet play:", "cyan"));
  console.log(`  1. Configure port forwarding (TCP ${port})`);
  console.log(`  2. Share with friends: ${publicIp}:${port} + code ${code}`);
  console.log(`  3. Friends use: connect ${publicIp}:${port}`);
  console.log();
}
```

### Passo 4: Jogar!

**Host:**
```bash
npm run server
> create MeuJogo
# Anote o IP público + código
# Ex: 203.0.113.25:4000 + código F9K3
```

**Cliente (internet):**
```bash
npm run client
> connect
Enter server IP:PORT: 203.0.113.25:4000
Enter lobby code: F9K3
Enter password: [senha]
Enter your name: Bob
```

---

## Solução 3: Servidor VPS (Nuvem) ☁️

Host roda o servidor em uma VPS na nuvem com IP público fixo.

### Opção A: Oracle Cloud (GRÁTIS para sempre)

1. **Criar conta:** https://cloud.oracle.com/
   - Free tier: 2 VMs Always Free

2. **Criar instância:**
   - Shape: VM.Standard.E2.1.Micro (Always Free)
   - SO: Ubuntu 22.04
   - Abrir portas: 4000 (TCP), 9999 (UDP)

3. **Conectar via SSH:**
```bash
ssh ubuntu@<IP_DA_VM>
```

4. **Instalar dependências:**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clonar projeto
git clone [seu-repositorio]
cd project
npm install
npm run build
```

5. **Rodar servidor:**
```bash
npm run server
> create MeuJogo
```

6. **Clientes conectam:**
```bash
npm run client
> connect
Enter server IP:PORT: <IP_DA_VM>:4000
```

### Opção B: AWS EC2 Free Tier

Similar ao Oracle Cloud, mas free tier dura apenas 12 meses.

### Opção C: Linode/DigitalOcean (~$5/mês)

Mais simples de usar, mas pago.

---

## 🔒 Segurança

### Firewall (Host)

```bash
# Ubuntu/Debian
sudo ufw allow 4000/tcp
sudo ufw allow 9999/udp

# CentOS/RHEL
sudo firewall-cmd --add-port=4000/tcp --permanent
sudo firewall-cmd --add-port=9999/udp --permanent
sudo firewall-cmd --reload

# Windows
# Painel de Controle > Firewall > Regras de Entrada
# Nova Regra > Porta > TCP 4000 + UDP 9999
```

### Senhas Fortes

```bash
# Use senhas de 12+ caracteres
create MeuJogo
Set lobby password: MyS3cur3P@ssw0rd!2024
```

### DDoS Protection (VPS)

Se usar VPS, considere:
- Cloudflare (proxy reverso)
- fail2ban (bloquear IPs abusivos)
- Rate limiting no código

---

## 🐛 Troubleshooting

### Erro: "Connection refused"
- ✅ Servidor está rodando?
- ✅ Port forwarding configurado?
- ✅ Firewall permite a porta?
- ✅ IP público correto? (teste: `curl ifconfig.me`)

### Erro: "No lobbies found" com `list`
- ✅ UDP 9999 aberta no firewall?
- ✅ UDP broadcast não funciona na internet - use `connect`
- ✅ Para internet, use sempre `connect` em vez de `list`

### Erro: "Connection timeout"
- ✅ ISP bloqueia portas? (alguns bloqueiam 4000)
- ✅ Tente outra porta: 8080, 3000, ou 5000
- ✅ Verifique: https://www.yougetsignal.com/tools/open-ports/

### VPN não conecta
- ✅ ZeroTier: membros autorizados no painel?
- ✅ Tailscale: ambos fizeram login?
- ✅ Firewall bloqueando VPN? (desabilitar temporariamente para teste)

### Lag/Latência
- ✅ Use servidores geograficamente próximos
- ✅ Conexão Wi-Fi? Tente cabo ethernet
- ✅ VPN adiciona ~20-50ms de latência

---

## 📊 Comparação de Latências

| Método | Latência Típica | Observações |
|--------|----------------|-------------|
| **LAN local** | 1-5 ms | Ideal |
| **Port Forward direto** | 10-50 ms | Depende da distância |
| **ZeroTier/Tailscale** | 30-100 ms | Adiciona overhead da VPN |
| **VPS (mesma região)** | 20-80 ms | Boa para jogos |
| **VPS (outra região)** | 100-300+ ms | Pode ter lag |

---

## ✅ Checklist Rápido

### Para Port Forwarding:
- [ ] IP local descoberto
- [ ] Port forwarding configurado no roteador (TCP 4000)
- [ ] Firewall liberado (TCP 4000, UDP 9999)
- [ ] IP público descoberto
- [ ] Código modificado com comando `connect`
- [ ] Testado localmente primeiro

### Para VPN (ZeroTier):
- [ ] Conta criada em my.zerotier.com
- [ ] Rede criada
- [ ] ZeroTier instalado em todos os PCs
- [ ] Todos deram join na rede
- [ ] Todos autorizados no painel web
- [ ] IPs virtuais verificados

### Para VPS:
- [ ] VPS criada e acessível via SSH
- [ ] Node.js instalado
- [ ] Projeto clonado e compilado
- [ ] Portas abertas no security group
- [ ] Servidor rodando
- [ ] IP público anotado

---

## 🎯 Recomendação Final

**Para usuários não técnicos:** Use **Tailscale** (Solução 1B)
- Instalação automática
- Zero configuração
- Interface amigável

**Para gamers experientes:** Use **Port Forwarding** (Solução 2)
- Menor latência
- Controle total
- Aprende sobre redes

**Para desenvolvedores:** Use **VPS** (Solução 3)
- Servidor sempre online
- Pode hospedar múltiplos jogos
- Aprende cloud computing

---

## 📚 Recursos Adicionais

- **Port Forwarding:** https://portforward.com/
- **ZeroTier Docs:** https://docs.zerotier.com/
- **Tailscale Docs:** https://tailscale.com/kb/
- **Oracle Cloud Free Tier:** https://www.oracle.com/cloud/free/
- **Teste de Portas:** https://www.yougetsignal.com/tools/open-ports/

---

Boa sorte jogando com seus amigos pela internet! 🎮🌐✨
