# 🔧 Patch para Conexão pela Internet

Este documento contém as modificações de código necessárias para adicionar suporte a conexões pela internet.

---

## Modificação 1: Adicionar comando `connect` ao cliente

### Arquivo: `client/index.ts`

**Localização:** Logo após as importações (linha ~10)

**Adicionar:**

```typescript
// Helper function for direct connection
async function promptConnect(
  rl: readline.Interface
): Promise<{ host: string; port: number; code: string } | null> {
  return new Promise((resolve) => {
    rl.question(
      colorize("Enter server IP:PORT (ex: 203.0.113.25:4000): ", "cyan"),
      (ipPort) => {
        rl.question(colorize("Enter lobby code: ", "cyan"), (code) => {
          const parts = ipPort.trim().split(":");
          const host = parts[0];
          const port = parts[1] ? parseInt(parts[1]) : 4000;

          if (!host || !code.trim()) {
            console.log(colorize("Invalid input.", "red"));
            resolve(null);
            return;
          }

          resolve({ host, port, code: code.trim().toUpperCase() });
        });
      }
    );
  });
}
```

**Localização:** No bloco `switch` de comandos (procure por `case "join":`)

**Adicionar ANTES do case "join":**

```typescript
case "connect": {
  console.log(colorize("\n=== Direct Connection (Internet) ===\n", "cyan"));

  const connection = await promptConnect(rl);
  if (!connection) {
    rl.prompt();
    break;
  }

  const password = await prompt(rl, "Enter lobby password: ");
  const playerName = await prompt(rl, "Enter your name: ");

  try {
    console.log(
      colorize(`\nConnecting to ${connection.host}:${connection.port}...`, "yellow")
    );

    await client.connect(connection.host, connection.port);

    client.send({
      t: "JOIN",
      lobbyId: connection.code,
      name: playerName,
      password: password,
    });

    console.log(colorize("✓ Connected! Waiting for welcome message...\n", "green"));
  } catch (err) {
    console.log(
      colorize(`✗ Failed to connect: ${(err as Error).message}`, "red")
    );
  }

  rl.prompt();
  break;
}
```

**Localização:** Seção de ajuda (procure por "Commands:")

**Modificar a lista de comandos para incluir:**

```typescript
console.log("Commands:");
console.log("  list              - List lobbies on LAN (UDP discovery)");
console.log("  connect           - Connect directly via IP:PORT (for internet)");
console.log("  join <code>       - Join a lobby from list");
console.log("  quit              - Exit");
console.log();
```

---

## Modificação 2: Mostrar IP público no servidor

### Arquivo: `server/index.ts`

**Localização:** Dentro da classe `ServerHost`, após o método `getLocalIp()` (linha ~310)

**Adicionar:**

```typescript
private async getPublicIp(): Promise<string> {
  try {
    const https = await import("https");
    return new Promise((resolve, reject) => {
      const req = https.get("https://api.ipify.org", { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data.trim()));
      });

      req.on("error", () => resolve("N/A"));
      req.on("timeout", () => {
        req.destroy();
        resolve("N/A");
      });
    });
  } catch {
    return "N/A";
  }
}
```

**Localização:** Método `cmdCreate`, seção onde imprime informações do lobby (linha ~148-153)

**Substituir:**

```typescript
// ANTES:
console.log(colorize(`\n✓ Lobby created!`, "green"));
console.log(`  Code: ${colorize(code, "bright")}`);
console.log(`  Lobby ID: ${lobbyId}`);
console.log(`  Port: ${port}`);
console.log(`  Local IP: ${localIp}`);
console.log();
```

**POR:**

```typescript
// DEPOIS:
const publicIp = await this.getPublicIp();

console.log(colorize(`\n✓ Lobby created!`, "green"));
console.log(`  Code: ${colorize(code, "bright")}`);
console.log(`  Lobby ID: ${lobbyId}`);
console.log(`  Port: ${port}`);
console.log(`  Local IP: ${localIp} ${colorize("(for LAN)", "dim")}`);

if (publicIp !== "N/A") {
  console.log(`  Public IP: ${colorize(publicIp, "bright")} ${colorize("(for internet)", "dim")}`);
  console.log();
  console.log(colorize("=== Internet Play Instructions ===", "cyan"));
  console.log(colorize("1. Configure port forwarding on your router:", "yellow"));
  console.log(`   - Protocol: TCP`);
  console.log(`   - External Port: ${port}`);
  console.log(`   - Internal Port: ${port}`);
  console.log(`   - Internal IP: ${localIp}`);
  console.log();
  console.log(colorize("2. Share with friends:", "yellow"));
  console.log(`   - IP:PORT: ${colorize(publicIp + ":" + port, "bright")}`);
  console.log(`   - Code: ${colorize(code, "bright")}`);
  console.log(`   - Password: (your password)`);
  console.log();
  console.log(colorize("3. Friends connect using:", "yellow"));
  console.log(`   ${colorize("> connect", "green")}`);
  console.log(`   Enter IP:PORT: ${publicIp}:${port}`);
  console.log(`   Enter code: ${code}`);
  console.log();
}

console.log(colorize("=== LAN Play ===", "cyan"));
console.log("Friends on same network use:");
console.log(`  ${colorize("> list", "green")}`);
console.log(`  ${colorize("> join " + code, "green")}`);
console.log();
```

---

## Modificação 3: Adicionar ao ALL_COMMANDS

### Arquivo: `client/commands.ts`

**Localização:** Array `ALL_COMMANDS` (linha ~10)

**Adicionar:**

```typescript
const ALL_COMMANDS = [
  "help",
  "chat",
  "whisper",
  "rules",
  "status",
  "quit",
  "feedback",
  "list",
  "connect",  // ← ADICIONE ESTA LINHA
  "join",
  "create",
  // ... resto do array
];
```

---

## Modificação 4: Atualizar documentação de comandos

### Arquivo: `docs/commands.md`

**Localização:** Seção "Lobby / Pre-Game Commands" (linha ~45)

**Adicionar após o comando `list`:**

```markdown
### `connect`
Connect directly to a server via IP and port (for internet play).

**Usage:**
```
connect
```

**Interactive prompts:**
- Server IP:PORT (ex: 203.0.113.25:4000)
- Lobby code (ex: F9K3)
- Password
- Your name

**When to use:**
- Playing over the internet (not LAN)
- Server has port forwarding configured
- You know the server's public IP and port

**Example:**
```
> connect
Enter server IP:PORT: 203.0.113.25:4000
Enter lobby code: F9K3
Enter lobby password: secret123
Enter your name: Bob
✓ Connected!
```
```

---

## Modificação 5: Permitir código como lobby ID no servidor

### Arquivo: `server/lobby.ts`

**Localização:** Método que valida JOIN (procure por validação de `lobbyId`)

**Modificar para aceitar código como alternativa:**

```typescript
// Se o cliente enviar o código em vez do lobbyId
if (msg.lobbyId.length === 4) {
  // É um código, não um lobbyId UUID
  // Aceitar se corresponder ao código do lobby
  if (msg.lobbyId.toUpperCase() !== this.code.toUpperCase()) {
    return { success: false, error: "Invalid lobby code" };
  }
}
```

**Nota:** Esta modificação pode já estar implementada se o servidor for flexível com IDs.

---

## Testando as Modificações

### Teste 1: Conexão Direta (mesma máquina)

**Terminal 1 (Servidor):**
```bash
npm run build
npm run server
> create TestGame
Set password: test123
# Anote o IP local, ex: 192.168.1.100
```

**Terminal 2 (Cliente):**
```bash
npm run client
> connect
Enter IP:PORT: 127.0.0.1:4000
Enter code: [código mostrado no servidor]
Enter password: test123
Enter name: Alice
```

### Teste 2: Conexão pela Internet (VPN)

**Com ZeroTier/Tailscale ativo:**

**Host:**
```bash
npm run server
> create InternetGame
# Anote o IP virtual do ZeroTier (ex: 10.147.17.5)
```

**Cliente remoto:**
```bash
npm run client
> connect
Enter IP:PORT: 10.147.17.5:4000
Enter code: [código]
Enter password: [senha]
Enter name: Bob
```

### Teste 3: Port Forwarding

1. Configure port forwarding no roteador (TCP 4000 → seu IP local)
2. Descubra seu IP público: `curl ifconfig.me`
3. Cliente remoto usa `connect` com seu IP público

---

## Rollback (Reverter Mudanças)

Se algo der errado, você pode reverter usando Git:

```bash
# Ver mudanças
git diff

# Descartar mudanças
git checkout -- client/index.ts
git checkout -- server/index.ts
git checkout -- client/commands.ts

# Ou reverter tudo
git reset --hard HEAD
```

---

## Próximos Passos

1. ✅ Aplicar patches acima
2. ✅ Recompilar: `npm run build`
3. ✅ Testar localmente (127.0.0.1:4000)
4. ✅ Testar com VPN (ZeroTier/Tailscale)
5. ✅ Configurar port forwarding (se necessário)
6. ✅ Testar com amigo remoto

---

## Recursos Adicionais

- Veja `INTERNET_SETUP.md` para guias completos
- Tutorial de port forwarding: https://portforward.com/
- Teste de portas abertas: https://www.yougetsignal.com/tools/open-ports/
- ZeroTier docs: https://docs.zerotier.com/

---

**Dica:** Comece testando com **ZeroTier** ou **Tailscale** antes de configurar port forwarding - é muito mais fácil e não requer mexer no roteador!
