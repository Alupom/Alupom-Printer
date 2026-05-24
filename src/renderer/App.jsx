import React, { useState, useEffect } from 'react';
import SetupScreen from './screens/SetupScreen';
import StatusScreen from './screens/StatusScreen';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    window.electronAPI.getConfig().then((cfg) => {
      setConfig({ ...cfg, impressoras: cfg.impressoras || (cfg.impressora ? [cfg.impressora] : []) });
      // Si no tiene impresora configurada, va a setup
      setScreen(cfg.impressora ? 'status' : 'setup');
    });
  }, []);

  if (screen === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🖨️</div>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        config={config}
        onSave={(newConfig) => {
          setConfig(newConfig);
          setScreen('status');
        }}
      />
    );
  }

  return (
    <StatusScreen
      config={config}
      onOpenSetup={() => setScreen('setup')}
    />
  );
}
