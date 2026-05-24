import React, { useState, useEffect } from 'react';

export default function StatusScreen({ config, onOpenSetup }) {
  const [wsStatus, setWsStatus] = useState({ running: false, clients: 0, port: 8765 });
  const [portalConectado, setPortalConectado] = useState(false);
  const [ultimasImpressoes, setUltimasImpressoes] = useState([]);

  useEffect(() => {
    // Status inicial
    window.electronAPI.getWsStatus().then(setWsStatus);

    // Listeners de eventos
    window.electronAPI.onWsStatus((data) => setWsStatus((s) => ({ ...s, ...data })));
    window.electronAPI.onWsClientConnected(() => setPortalConectado(true));
    window.electronAPI.onWsClientDisconnected(() => setPortalConectado(false));
    window.electronAPI.onPrintJob((job) => {
      setUltimasImpressoes((prev) => [
        { ...job, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      ['ws-status', 'ws-client-connected', 'ws-client-disconnected', 'print-job'].forEach(
        (ch) => window.electronAPI.removeAllListeners(ch)
      );
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 440, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🖨️</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>Alupom Print</h1>
            <p style={{ fontSize: 12, color: '#6B7280' }}>v1.0.0</p>
          </div>
        </div>
        <button
          onClick={onOpenSetup}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
        >
          ⚙️ Configurar
        </button>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatusCard
          icon={wsStatus.running ? '🟢' : '🔴'}
          label="Servidor"
          value={wsStatus.running ? `Porta ${wsStatus.port}` : 'Parado'}
          color={wsStatus.running ? '#065F46' : '#991B1B'}
          bg={wsStatus.running ? '#D1FAE5' : '#FEE2E2'}
        />
        <StatusCard
          icon={portalConectado ? '🔗' : '⏳'}
          label="Portal web"
          value={portalConectado ? 'Conectado' : 'Aguardando'}
          color={portalConectado ? '#065F46' : '#92400E'}
          bg={portalConectado ? '#D1FAE5' : '#FEF3C7'}
        />
      </div>

      {/* Impressora configurada */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1.5px solid #E5E7EB' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Impressora</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          {(config?.impressoras?.length > 0 ? config.impressoras : config?.impressora ? [config.impressora] : []).map((imp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10 }}>🖨️</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>{imp}</p>
            </div>
          ))}
          {(!config?.impressoras?.length && !config?.impressora) && (
            <p style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF' }}>Nenhuma configurada</p>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Papel: {config?.papel || '80mm'}</p>
      </div>

      {/* Como conectar */}
      <div style={{ background: '#EFF6FF', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1.5px solid #BFDBFE' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>Como conectar o portal</p>
        <p style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
          No portal do parceiro, vá em <b>Gestão → Impressora</b> e clique em <b>"Conectar Alupom Print"</b>.<br />
          Certifique-se que o Alupom Print está aberto neste computador.
        </p>
      </div>

      {/* Últimas impressões */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Últimas impressões
        </p>
        {ultimasImpressoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 13 }}>Nenhuma impressão ainda</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>As comandas aparecerão aqui</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ultimasImpressoes.map((job, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, padding: '10px 14px', border: '1.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>#{(job.pedidoId || '').substring(0, 6).toUpperCase()}</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{job.nomeCliente}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
                    {Number(job.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>{job.hora}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>
        <p style={{ fontSize: 13, fontWeight: 700, color }}>{value}</p>
      </div>
    </div>
  );
}
