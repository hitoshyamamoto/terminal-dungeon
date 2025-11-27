# 🚀 Guia Rápido - Jogar pela Internet

**Tempo estimado:** 5-10 minutos

---

## 🎯 Solução Mais Rápida: Tailscale (RECOMENDADO)

### Passo 1: Instalar (ambos os jogadores)

**Linux/WSL:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**Windows:**
- Baixar: https://tailscale.com/download
- Instalar e fazer login

### Passo 2: Jogar

```bash
# Host:
npm run server
> create MeuJogo

# Cliente:
npm run client
> list        # Funciona automaticamente!
> join [CÓDIGO]
```

**Pronto!** Vocês estão na mesma rede virtual. ✅

---

## 🔧 Alternativa: Comando `connect` (Port Forwarding)

Se preferir não usar VPN, adicione o comando `connect`:

### Passo 1: Aplicar Modificações

```bash
# No diretório do projeto:
./enable-internet.sh

# Depois abra INTERNET_PATCH.md e aplique as modificações manuais
# (copiar/colar código nos arquivos indicados)
```

### Passo 2: Configurar Port Forwarding

1. **Descobrir IP local:**
   ```bash
   ip addr | grep inet  # Linux
   ipconfig             # Windows
   # Exemplo: 192.168.1.100
   ```

2. **Acessar roteador:**
   - Navegador: `http://192.168.0.1` ou `http://192.168.1.1`
   - Login: geralmente `admin` / `admin`

3. **Criar regra:**
   ```
   Nome: Terminal Dungeon
   Protocolo: TCP
   Porta Externa: 4000
   Porta Interna: 4000
   IP Destino: [seu IP local]
   ```

4. **Descobrir IP público:**
   ```bash
   curl ifconfig.me
   # Exemplo: 203.0.113.25
   ```

### Passo 3: Jogar

```bash
# Host:
npm run server
> create MeuJogo
# Compartilhe: IP público (ex: 203.0.113.25), porta (4000), código e senha

# Cliente (internet):
npm run client
> connect
Enter IP:PORT: 203.0.113.25:4000
Enter code: [CÓDIGO]
Enter password: [SENHA]
Enter name: [SEU NOME]
```

---

## 🆘 Troubleshooting Rápido

### "Connection refused"
```bash
# Verifique se servidor está rodando:
sudo ss -tulnp | grep 4000

# Abra firewall:
sudo ufw allow 4000/tcp
```

### "No lobbies found" com `list`
- **Normal na internet!** UDP broadcast não funciona fora da LAN
- Use `connect` em vez de `list`

### Tailscale não conecta
```bash
# Ver status:
sudo tailscale status

# Reconectar:
sudo tailscale down
sudo tailscale up
```

### Port forwarding não funciona
- Teste se porta está aberta: https://www.yougetsignal.com/tools/open-ports/
- ISP bloqueia porta 4000? Tente 8080 ou 3000
- Tem IP público? (alguns ISPs usam CGNAT)
  ```bash
  curl ifconfig.me  # Se começar com 100.x, você está em CGNAT
  ```

---

## 📊 Comparação Rápida

| Método | Tempo Setup | Dificuldade | Requer Root | Requer Config Router |
|--------|-------------|-------------|-------------|---------------------|
| **Tailscale** | 2 min | ⭐ Fácil | ✅ Sim | ❌ Não |
| **ZeroTier** | 5 min | ⭐⭐ Média | ✅ Sim | ❌ Não |
| **Port Forward** | 10 min | ⭐⭐⭐ Difícil | ❌ Não | ✅ Sim |

---

## 💡 Dica Final

**Primeira vez?** Use **Tailscale**:
- Não precisa mexer no roteador
- Não precisa modificar código
- Funciona em qualquer rede (até 4G/5G)
- Grátis para até 100 dispositivos

**Já tem experiência?** Use **Port Forwarding + comando `connect`**:
- Menor latência
- Mais controle
- Aprende networking

---

## 📚 Documentação Completa

- **INTERNET_SETUP.md** - Guia detalhado de todas as soluções
- **INTERNET_PATCH.md** - Modificações de código passo-a-passo
- **enable-internet.sh** - Script automatizado

---

## ✅ Checklist

- [ ] Tailscale instalado (ou port forward configurado)
- [ ] Servidor rodando (`npm run server`)
- [ ] IP/código compartilhado com amigo
- [ ] Firewall liberado (porta 4000)
- [ ] Ambos na mesma "rede" (virtual ou internet)

---

**Boa diversão! 🎮**

Problemas? Veja a documentação completa em `INTERNET_SETUP.md`
