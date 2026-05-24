import React, { useState, useEffect } from 'react';

export default function SetupScreen({ config, onSave }) {
  const [impressoras, setImpressoras] = useState([]);
  const [selecionadas, setSelecionadas] = useState(config?.impressoras || []);
  const [papel, setPapel] = useState((config?.papel || '80mm').replace('mm', ''));
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.getPrinters().then((list) => {
      setImpressoras(list);
      setCarregando(false);
    });
  }, []);

  const toggleImpressora = (imp) => {
    setSelecionadas((prev) =>
      prev.includes(imp) ? prev.filter((i) => i !== imp) : [...prev, imp]
    );
  };

  const salvar = async () => {
    if (selecionadas.length === 0 || !papel) return;
    setSalvando(true);
    const newConfig = {
      impressora: selecionadas[0],
      impressoras: selecionadas,
      papel: `${papel}mm`,
    };
    await window.electronAPI.saveConfig(newConfig);
    setSalvando(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave({ ...config, ...newConfig });
  };

  const testar = async (imp) => {
    setTestando(imp);
    setTestResult(null);
    await window.electronAPI.saveConfig({ impressora: imp, papel: `${papel}mm` });
    const result = await window.electronAPI.testPrint();
    setTestResult({ imp, ...result });
    setTestando(null);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F2F5FF' }}>

      {/* Header */}
      <div style={{ background: '#0A66FF', padding: '24px 24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🖨️</div>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>ALUPOM</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>Configuração de impressão</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* Tamanho do papel */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Largura do papel (mm)</label>
          <input
            type="number"
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            placeholder="Ex: 80 ou 58"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '2px solid #E5E7EB', fontSize: 16, fontWeight: 700,
              color: '#1C1C1C', background: 'white', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.borderColor = '#0A66FF'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Padrão: 80mm (POS 80) ou 58mm (POS 58)
          </p>
        </div>

        {/* Impressoras */}
        <div>
          <label style={labelStyle}>Impressoras disponíveis</label>
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
              Carregando impressoras...
            </div>
          ) : impressoras.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
              Nenhuma impressora encontrada
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {impressoras.map((imp) => {
                const sel = selecionadas.includes(imp);
                const isTesting = testando === imp;
                const result = testResult?.imp === imp ? testResult : null;
                return (
                  <div
                    key={imp}
                    style={{
                      background: 'white', borderRadius: 12, padding: '12px 14px',
                      border: sel ? '2px solid #0A66FF' : '2px solid #E5E7EB',
                      transition: 'border 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleImpressora(imp)}
                        style={{
                          width: 20, height: 20, borderRadius: 6, cursor: 'pointer',
                          background: sel ? '#0A66FF' : 'white',
                          border: sel ? '2px solid #0A66FF' : '2px solid #D1D5DB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {sel && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                      </div>

                      {/* Nome */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {imp}
                        </p>
                        {result && (
                          <p style={{ fontSize: 11, color: result.success ? '#065F46' : '#991B1B', marginTop: 2 }}>
                            {result.success ? '✅ Teste enviado!' : `❌ ${result.error}`}
                          </p>
                        )}
                      </div>

                      {/* Botão teste */}
                      <button
                        onClick={() => testar(imp)}
                        disabled={isTesting || !papel}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          border: '1.5px solid #0A66FF', color: '#0A66FF', background: 'white',
                          cursor: 'pointer', flexShrink: 0, opacity: isTesting ? 0.6 : 1,
                        }}
                      >
                        {isTesting ? '...' : 'Testar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer — botão salvar */}
      <div style={{ padding: '12px 20px 20px', background: '#F2F5FF' }}>
        <button
          onClick={salvar}
          disabled={selecionadas.length === 0 || !papel || salvando}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, fontSize: 15,
            fontWeight: 800, border: 'none', cursor: 'pointer',
            background: selecionadas.length === 0 || !papel ? '#D1D5DB' : '#0A66FF',
            color: 'white', transition: 'background 0.2s',
          }}
        >
          {saved ? '✅ Configuração salva!' : salvando ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#6B7280', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 8,
};