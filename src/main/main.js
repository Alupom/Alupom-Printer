const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const { WebSocketServer } = require('ws');
const Store = require('electron-store');
const path = require('path');

const store = new Store();
let tray = null;
let mainWindow = null;
let wss = null;
const PORT = 8765;

// ─── Auto-start ───────────────────────────────────────────────────────────────
app.setLoginItemSettings({
  openAtLogin: store.get('autoStart', true),
  path: app.getPath('exe'),
});

// ─── Ventana principal ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    show: true,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'Alupom Print',
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const updateMenu = () => {
    const connected = wss && wss.clients.size > 0;
    const impressora = store.get('impressora', 'Nenhuma configurada');
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Alupom Print', enabled: false },
      { type: 'separator' },
      { label: `🖨️ ${impressora}`, enabled: false },
      { label: connected ? '🟢 Portal conectado' : '🔴 Aguardando conexão', enabled: false },
      { type: 'separator' },
      { label: 'Abrir configurações', click: () => { mainWindow.show(); mainWindow.focus(); } },
      { type: 'separator' },
      { label: 'Sair', click: () => { app.exit(0); } },
    ]);
    tray.setContextMenu(contextMenu);
  };

  tray.setToolTip('Alupom Print');
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
  updateMenu();

  // Actualiza el menu cada 5 segundos
  setInterval(updateMenu, 5000);
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────
function startWebSocketServer() {
  wss = new WebSocketServer({ port: PORT });

  wss.on('listening', () => {
    console.log(`✅ WebSocket server rodando na porta ${PORT}`);
    if (mainWindow) mainWindow.webContents.send('ws-status', { connected: true, port: PORT });
  });

  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin || 'desconhecido';
    console.log(`🔗 Cliente conectado: ${origin}`);
    if (mainWindow) mainWindow.webContents.send('ws-client-connected', { origin });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        console.log('📨 Mensagem recebida:', msg.type);

        if (msg.type === 'PRINT_COMANDA') {
          await handlePrint(msg.data);
          ws.send(JSON.stringify({ type: 'PRINT_OK', id: msg.data.pedidoId }));
        }

        if (msg.type === 'GET_CONFIG') {
          ws.send(JSON.stringify({
            type: 'CONFIG',
            impressora: store.get('impressora', null),
            papel: store.get('papel', '80mm'),
          }));
        }
      } catch (e) {
        console.error('Erro ao processar mensagem:', e);
        ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 Cliente desconectado');
      if (mainWindow) mainWindow.webContents.send('ws-client-disconnected');
    });
  });

  wss.on('error', (err) => {
    console.error('WebSocket erro:', err);
    if (mainWindow) mainWindow.webContents.send('ws-error', { message: err.message });
  });
}

// ─── Impressão ────────────────────────────────────────────────────────────────
async function handlePrint(data) {
  const impressoras = store.get('impressoras', []);
  const impressora = store.get('impressora');
  const papel = store.get('papel', '80mm');

  const lista = impressoras.length > 0 ? impressoras : impressora ? [impressora] : [];

  if (lista.length === 0) {
    throw new Error('Nenhuma impressora configurada');
  }

  // Notifica a janela
  if (mainWindow) {
    mainWindow.webContents.send('print-job', {
      pedidoId: data.pedidoId,
      nomeCliente: data.nomeCliente,
      total: data.total,
      impressora,
    });
  }

 const html = gerarHTML(data, papel);

  // Imprime em todas as impressoras selecionadas
  for (const imp of lista) {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false },
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    await new Promise((resolve, reject) => {
      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: imp,
          pageSize: { width: papel === '58mm' ? 58000 : 80000, height: 297000 },
          margins: { marginType: 'custom', top: 0, bottom: 0, left: 4, right: 4 },
        },
        (success, reason) => {
          printWin.close();
          if (success) resolve();
          else reject(new Error(`Falha na impressão em ${imp}: ${reason}`));
        }
      );
    });

    console.log(`✅ Comanda impressa em: ${imp}`);
  }

  // Notifica a janela com todas as impressoras
  if (mainWindow) {
    mainWindow.webContents.send('print-job', {
      pedidoId: data.pedidoId,
      nomeCliente: data.nomeCliente,
      total: data.total,
      impressora: lista.join(', '),
    });
  }
}

// ─── Gera HTML da comanda ─────────────────────────────────────────────────────
function gerarHTML(data, papel) {
  const largura = papel === '58mm' ? '58mm' : '80mm';
  const fmtBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataStr = agora.toLocaleDateString('pt-BR');
  const pedidoCurto = (data.pedidoId || '').substring(0, 6).toUpperCase();

  const itensHTML = (data.itens || []).map(item => `
    <div style="margin-bottom:4px">
      <div><b>${item.quantidade}x</b> ${item.nomeProduto || item.titulo || ''}</div>
      ${item.tamanho ? `<div style="padding-left:12px">Tam: ${item.tamanho}</div>` : ''}
      ${(item.extras || []).map(e => `<div style="padding-left:12px">+ ${e.nome} (${fmtBRL(e.preco)})</div>`).join('')}
      ${item.observacao ? `<div style="padding-left:12px">OBS: ${item.observacao}</div>` : ''}
      <div style="text-align:right">${fmtBRL((item.preco || 0) * (item.quantidade || 1))}</div>
    </div>
  `).join('');

  const enderecoHTML = !data.isRetirada && data.endereco ? `
    <div style="border-top:1px dashed #000;margin:4px 0"></div>
    <div><b>ENTREGA</b></div>
    <div>${data.endereco.rua}, ${data.endereco.numero}</div>
    ${data.endereco.complemento ? `<div>${data.endereco.complemento}</div>` : ''}
    <div>${data.endereco.bairro || ''}</div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; font-size: 11px; width: ${largura}; padding: 4mm; }
  @page { size: ${largura} auto; margin: 0; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:4px">
    <div style="font-weight:bold;font-size:14px">${data.lojaNome || 'ALUPOM'}</div>
    <div style="font-size:10px">COMANDA DE PEDIDO</div>
    <div style="border-top:1px dashed #000;margin:4px 0"></div>
  </div>
  <div style="margin-bottom:4px">
    <div><b>Pedido:</b> #${pedidoCurto}</div>
    <div><b>Data:</b> ${dataStr} ${hora}</div>
    <div><b>Cliente:</b> ${data.nomeCliente || ''}</div>
    <div><b>Tipo:</b> ${data.isRetirada ? 'RETIRADA' : 'DELIVERY'}</div>
  </div>
  <div style="border-top:1px dashed #000;margin:4px 0"></div>
  <div style="font-weight:bold;margin-bottom:2px">ITENS</div>
  ${itensHTML}
  <div style="border-top:1px dashed #000;margin:4px 0"></div>
  ${(data.frete || 0) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Frete</span><span>${fmtBRL(data.frete)}</span></div>` : ''}
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px">
    <span>TOTAL</span><span>${fmtBRL(data.total)}</span>
  </div>
  <div style="border-top:1px dashed #000;margin:4px 0"></div>
  <div><b>Pagamento:</b> ${data.metodoPagamento || ''}</div>
  ${enderecoHTML}
  ${data.observacao ? `<div style="border-top:1px dashed #000;margin:4px 0"></div><div><b>OBS:</b> ${data.observacao}</div>` : ''}
  <div style="border-top:1px dashed #000;margin:4px 0"></div>
  <div style="text-align:center;font-size:10px">Alupom — ${dataStr}</div>
</body>
</html>`;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-printers', async () => {
  const win = mainWindow || new BrowserWindow({ show: false });
  const printers = await win.webContents.getPrintersAsync();
  return printers.map(p => p.name);
});

ipcMain.handle('get-config', () => ({
  impressora: store.get('impressora', null),
  impressoras: store.get('impressoras', []),
  papel: store.get('papel', '80mm'),
  autoStart: store.get('autoStart', true),
  port: PORT,
}));

ipcMain.handle('save-config', (_, config) => {
  if (config.impressora !== undefined) store.set('impressora', config.impressora);
  if (config.impressoras !== undefined) store.set('impressoras', config.impressoras);
  if (config.papel !== undefined) store.set('papel', config.papel);
  if (config.autoStart !== undefined) {
    store.set('autoStart', config.autoStart);
    app.setLoginItemSettings({ openAtLogin: config.autoStart });
  }
  return { success: true };
});

ipcMain.handle('test-print', async () => {
  try {
    await handlePrint({
      pedidoId: 'TESTE001',
      lojaNome: 'Alupom Print',
      nomeCliente: 'Teste de Impressão',
      total: 99.90,
      frete: 0,
      metodoPagamento: 'Teste',
      isRetirada: true,
      itens: [
        { quantidade: 2, nomeProduto: 'Produto Teste', preco: 49.95, extras: [] },
      ],
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-ws-status', () => ({
  running: !!wss,
  port: PORT,
  clients: wss ? wss.clients.size : 0,
}));

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  startWebSocketServer();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('activate', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});
