#!/bin/bash

# ============================================================================
# Terminal Dungeon - Script de Habilitação para Internet
# ============================================================================
# Este script aplica automaticamente as modificações necessárias para
# permitir conexões pela internet.
#
# Uso: ./enable-internet.sh
# ============================================================================

set -e  # Exit on error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "============================================"
echo "  Terminal Dungeon - Internet Mode Setup"
echo "============================================"
echo -e "${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Criar backup
echo -e "${YELLOW}Criando backup dos arquivos originais...${NC}"
mkdir -p .backups
cp client/index.ts .backups/client-index.ts.bak 2>/dev/null || true
cp server/index.ts .backups/server-index.ts.bak 2>/dev/null || true
cp client/commands.ts .backups/client-commands.ts.bak 2>/dev/null || true
echo -e "${GREEN}✓ Backup criado em .backups/${NC}"

# Modificação 1: Adicionar comando 'connect' à lista de comandos
echo -e "\n${YELLOW}[1/5] Adicionando comando 'connect' à lista...${NC}"
if grep -q '"connect"' client/commands.ts; then
    echo -e "${GREEN}✓ Comando 'connect' já está na lista${NC}"
else
    sed -i '/^const ALL_COMMANDS/,/^\];/{
        /"list",/a\  "connect",
    }' client/commands.ts
    echo -e "${GREEN}✓ Comando 'connect' adicionado${NC}"
fi

# Modificação 2: Patch no client/index.ts
echo -e "\n${YELLOW}[2/5] Verificando client/index.ts...${NC}"

# Verificar se já tem a função promptConnect
if grep -q "function promptConnect" client/index.ts; then
    echo -e "${GREEN}✓ Função promptConnect já existe${NC}"
else
    echo -e "${YELLOW}⚠ Você precisa adicionar manualmente a função promptConnect${NC}"
    echo -e "${YELLOW}  Veja INTERNET_PATCH.md para instruções detalhadas${NC}"
fi

# Modificação 3: Patch no server/index.ts
echo -e "\n${YELLOW}[3/5] Verificando server/index.ts...${NC}"

# Verificar se já tem a função getPublicIp
if grep -q "getPublicIp" server/index.ts; then
    echo -e "${GREEN}✓ Função getPublicIp já existe${NC}"
else
    echo -e "${YELLOW}⚠ Você precisa adicionar manualmente a função getPublicIp${NC}"
    echo -e "${YELLOW}  Veja INTERNET_PATCH.md para instruções detalhadas${NC}"
fi

# Modificação 4: Atualizar documentação
echo -e "\n${YELLOW}[4/5] Atualizando documentação...${NC}"
if grep -q "### \`connect\`" docs/commands.md; then
    echo -e "${GREEN}✓ Documentação já atualizada${NC}"
else
    cat >> docs/commands.md << 'EOF'

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
EOF
    echo -e "${GREEN}✓ Documentação atualizada${NC}"
fi

# Modificação 5: Criar arquivo de configuração
echo -e "\n${YELLOW}[5/5] Criando arquivo de configuração...${NC}"
cat > .env.example << 'EOF'
# Terminal Dungeon - Configuração de Rede

# Modo de operação (LAN ou INTERNET)
NETWORK_MODE=LAN

# Para modo INTERNET:
# 1. Configure port forwarding no roteador (TCP 4000)
# 2. Ou use VPN (ZeroTier/Tailscale)
# PUBLIC_IP=seu.ip.publico.aqui
# TCP_PORT=4000

# Para modo LAN:
# USE_UDP_DISCOVERY=true
# UDP_PORT=9999
EOF
echo -e "${GREEN}✓ Arquivo .env.example criado${NC}"

# Recompilar
echo -e "\n${YELLOW}Recompilando o projeto...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Projeto recompilado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao compilar. Execute 'npm run build' para ver detalhes${NC}"
fi

# Resumo final
echo -e "\n${CYAN}============================================${NC}"
echo -e "${GREEN}✓ Configuração básica concluída!${NC}"
echo -e "${CYAN}============================================${NC}"

echo -e "\n${YELLOW}⚠ ATENÇÃO: Modificações manuais necessárias${NC}"
echo -e "Abra o arquivo ${CYAN}INTERNET_PATCH.md${NC} e aplique:"
echo -e "  1. Função ${CYAN}promptConnect${NC} em client/index.ts"
echo -e "  2. Case ${CYAN}'connect'${NC} no switch de comandos"
echo -e "  3. Função ${CYAN}getPublicIp${NC} em server/index.ts"
echo -e "  4. Modificação na exibição do IP público"

echo -e "\n${YELLOW}Próximos passos:${NC}"
echo -e "  1. ${CYAN}Aplique as modificações manuais${NC} (veja INTERNET_PATCH.md)"
echo -e "  2. ${CYAN}npm run build${NC} - Recompilar"
echo -e "  3. ${CYAN}Escolha uma solução:${NC}"
echo -e "     • ${GREEN}VPN (ZeroTier/Tailscale)${NC} - Mais fácil, sem configuração"
echo -e "     • ${GREEN}Port Forwarding${NC} - Mais rápido, requer config no roteador"
echo -e "     • ${GREEN}VPS na nuvem${NC} - Servidor sempre online"
echo -e "  4. ${CYAN}Leia INTERNET_SETUP.md${NC} - Guia completo"

echo -e "\n${GREEN}Para reverter as mudanças:${NC}"
echo -e "  cp .backups/*.bak . # Restaurar backups"
echo -e "  ou use: ${CYAN}git checkout -- .${NC}"

echo -e "\n${CYAN}Documentação criada:${NC}"
echo -e "  • ${GREEN}INTERNET_SETUP.md${NC} - Guia completo de configuração"
echo -e "  • ${GREEN}INTERNET_PATCH.md${NC} - Modificações de código detalhadas"

echo -e "\n${YELLOW}Teste rápido com VPN:${NC}"
echo -e "  1. ${CYAN}curl -s https://install.zerotier.com | sudo bash${NC}"
echo -e "  2. Crie rede em: ${CYAN}https://my.zerotier.com${NC}"
echo -e "  3. ${CYAN}sudo zerotier-cli join [NETWORK_ID]${NC}"
echo -e "  4. Jogue normalmente!"

echo -e "\n${GREEN}Boa sorte jogando pela internet! 🎮🌐${NC}\n"
