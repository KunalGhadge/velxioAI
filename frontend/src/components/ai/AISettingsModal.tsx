import React, { useState, useEffect } from 'react';
import { useAIStore } from '../../ai/useAIStore';
import { SUPPORTED_MODELS, LLMClient } from '../../ai/LLMClient';
import type { AIProviderId } from '../../ai/types';
import './AISettingsModal.css';

export const AISettingsModal: React.FC = () => {
  const {
    settingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    setApiKey,
  } = useAIStore();

  const [provider, setProvider] = useState<AIProviderId>(settings.provider);
  const [keysMap, setKeysMap] = useState<Record<string, string>>({ ...settings.apiKeys });
  const [selectedModel, setSelectedModel] = useState<string>(settings.selectedModel);
  const [temperature, setTemperature] = useState<number>(settings.temperature);
  const [autoHeal, setAutoHeal] = useState<boolean>(settings.autoHealEnabled);
  const [explainMode, setExplainMode] = useState<boolean>(settings.explainMode);
  const [customEndpoint, setCustomEndpoint] = useState<string>(settings.customEndpoint || '');

  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state whenever settings modal opens
  useEffect(() => {
    if (settingsModalOpen) {
      setProvider(settings.provider);
      setKeysMap({ ...settings.apiKeys });
      setSelectedModel(settings.selectedModel);
      setTemperature(settings.temperature);
      setAutoHeal(settings.autoHealEnabled);
      setExplainMode(settings.explainMode);
      setCustomEndpoint(settings.customEndpoint || '');
      setTestResult(null);
    }
  }, [settingsModalOpen, settings]);

  if (!settingsModalOpen) return null;

  const currentApiKey = keysMap[provider] || '';

  const handleProviderChange = (p: AIProviderId) => {
    setProvider(p);
    const available = SUPPORTED_MODELS.filter((m) => m.provider === p);
    const defaultModel = available.find((m) => m.isRecommended) || available[0];
    if (defaultModel) {
      setSelectedModel(defaultModel.id);
    }
    setTestResult(null);
  };

  const handleKeyChange = (val: string) => {
    const trimmed = val.trim();
    setKeysMap((prev) => ({ ...prev, [provider]: trimmed }));
  };

  const handleTestKey = async () => {
    const keyToTest = (keysMap[provider] || '').trim();
    if (!keyToTest && provider !== 'ollama') {
      setTestResult({ success: false, message: `Please enter your ${provider.toUpperCase()} API key first` });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await LLMClient.testApiKey(provider, keyToTest, selectedModel);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    // Save all keys in map
    Object.entries(keysMap).forEach(([p, k]) => {
      setApiKey(p as AIProviderId, k.trim());
    });

    updateSettings({
      provider,
      selectedModel,
      temperature,
      autoHealEnabled: autoHeal,
      explainMode,
      customEndpoint: provider === 'ollama' ? customEndpoint : undefined,
    });

    closeSettingsModal();
  };

  const currentModels = SUPPORTED_MODELS.filter((m) => m.provider === provider);

  const getPortalLink = () => {
    switch (provider) {
      case 'gemini':
        return { name: 'Google AI Studio (Free)', url: 'https://aistudio.google.com/app/apikey' };
      case 'groq':
        return { name: 'Groq Console (Free 500+ tok/s)', url: 'https://console.groq.com/keys' };
      case 'claude':
        return { name: 'Anthropic Console', url: 'https://console.anthropic.com/settings/keys' };
      case 'openai':
        return { name: 'OpenAI API Keys', url: 'https://platform.openai.com/api-keys' };
      default:
        return null;
    }
  };

  const portal = getPortalLink();

  return (
    <div className="velxio-modal-backdrop" onClick={closeSettingsModal}>
      <div className="velxio-ai-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="velxio-modal-header">
          <h3>⚙️ VelxioAI Studio Settings</h3>
          <button className="velxio-modal-close" onClick={closeSettingsModal} title="Close">
            ✕
          </button>
        </div>

        <div className="velxio-modal-body">
          {/* Provider Selection */}
          <div className="velxio-setting-group">
            <label>AI Model Provider (BYOK)</label>
            <select
              className="velxio-select"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProviderId)}
            >
              <option value="gemini">Google Gemini (Recommended & Free Tier)</option>
              <option value="groq">Groq (Ultra-Fast 500+ tok/s)</option>
              <option value="claude">Anthropic Claude</option>
              <option value="openai">OpenAI / OpenRouter</option>
              <option value="ollama">Local Ollama (Offline)</option>
            </select>
            <p className="velxio-setting-desc">
              Your API keys are stored 100% locally in your browser's encrypted local storage.
            </p>
          </div>

          {/* API Key */}
          {provider !== 'ollama' ? (
            <div className="velxio-setting-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>
                  {provider.toUpperCase()} API Key(s)
                  {LLMClient.parseKeyPool(currentApiKey).length > 1 && (
                    <span style={{ color: '#3fb950', fontSize: 11, marginLeft: 6 }}>
                      ({LLMClient.parseKeyPool(currentApiKey).length} keys in auto-rotation pool)
                    </span>
                  )}
                </label>
                {portal && (
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}
                  >
                    Get free key on {portal.name} ↗
                  </a>
                )}
              </div>
              <div className="velxio-key-row" style={{ alignItems: 'flex-start' }}>
                <textarea
                  className="velxio-input"
                  style={{ minHeight: 60, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                  placeholder={`Paste 1 or multiple ${provider} keys (separated by commas or newlines) to auto-rotate on quota limit...`}
                  value={currentApiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                />
                <button
                  className="velxio-btn-secondary"
                  onClick={handleTestKey}
                  disabled={testing || !currentApiKey}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {testing ? 'Testing...' : 'Test Key(s)'}
                </button>
              </div>
            </div>
          ) : (
            <div className="velxio-setting-group">
              <label>Ollama Endpoint URL</label>
              <input
                type="text"
                className="velxio-input"
                placeholder="http://localhost:11434/v1"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
              />
            </div>
          )}

          {testResult && (
            <div className={`velxio-test-feedback ${testResult.success ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}

          {/* Model Selection */}
          <div className="velxio-setting-group">
            <label>Active Model</label>
            <select
              className="velxio-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {currentModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.contextWindow}) {m.isRecommended ? '★ Recommended' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="velxio-setting-group">
            <label>Creativity / Temperature: {temperature}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <p className="velxio-setting-desc">Lower values (0.1–0.3) ensure deterministic, physically accurate circuits.</p>
          </div>

          {/* Feature Toggles */}
          <div className="velxio-toggle-row">
            <div className="velxio-toggle-label">
              <span>Auto-Heal Diagnostics</span>
              <small>Automatically diagnose compilation & circuit faults</small>
            </div>
            <input
              type="checkbox"
              checked={autoHeal}
              onChange={(e) => setAutoHeal(e.target.checked)}
            />
          </div>

          <div className="velxio-toggle-row">
            <div className="velxio-toggle-label">
              <span>Interactive Hardware Tutor Cards</span>
              <small>Attach 2-minute visual learning cards explaining electronic concepts</small>
            </div>
            <input
              type="checkbox"
              checked={explainMode}
              onChange={(e) => setExplainMode(e.target.checked)}
            />
          </div>
        </div>

        <div className="velxio-modal-footer">
          <button className="velxio-btn-secondary" onClick={closeSettingsModal}>
            Cancel
          </button>
          <button className="velxio-btn-primary" onClick={handleSave}>
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
