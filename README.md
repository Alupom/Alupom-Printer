# Alupom Print 🖨️

App de impressão automática de comandas para o painel de parceiros Alupom.

## Como funciona

1. O lojista instala o **Alupom Print** no computador
2. A app roda em background (ícone na bandeja do sistema)
3. O portal web conecta via WebSocket local (`ws://localhost:8765`)
4. Quando um pedido é aceito, a comanda é impressa automaticamente

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Linux
npm run build:linux
```

Os instaladores ficam em `dist-electron/`.

## Integração com o portal

Copie o arquivo `src/renderer/useAlupomPrint.ts` para `app/loja/hooks/useAlupomPrint.ts` no projeto Next.js.

Use o hook assim:

```tsx
import { useAlupomPrint } from "@/app/loja/hooks/useAlupomPrint";

const { status, imprimir, conectado } = useAlupomPrint();

// Imprimir uma comanda
const ok = await imprimir({
  pedidoId: pedido.id,
  lojaNome: pedido.lojaNome,
  nomeCliente: pedido.nomeCliente,
  total: pedido.total,
  frete: pedido.frete,
  itens: pedido.itens,
  metodoPagamento: pedido.metodoPagamento,
  isRetirada: pedido.isRetirada,
  observacao: pedido.observacao,
  endereco: pedido.endereco,
});
```

## Estrutura

```
src/
  main/
    main.js         ← Processo principal Electron (tray, WebSocket, impressão)
    preload.js      ← Bridge segura IPC
  renderer/
    App.jsx         ← App React
    screens/
      SetupScreen.jsx   ← Configurar impressora
      StatusScreen.jsx  ← Status e últimas impressões
    useAlupomPrint.ts   ← Hook para o portal Next.js
```

## Protocolo WebSocket

### Portal → Alupom Print

```json
{ "type": "PRINT_COMANDA", "data": { ...dadosPedido } }
{ "type": "GET_CONFIG" }
```

### Alupom Print → Portal

```json
{ "type": "PRINT_OK", "id": "pedidoId" }
{ "type": "CONFIG", "impressora": "...", "papel": "80mm" }
{ "type": "ERROR", "message": "..." }
```
