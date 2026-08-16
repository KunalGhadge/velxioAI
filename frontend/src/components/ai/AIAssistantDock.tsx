import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '../../ai/useAIStore';
import { AIChatMessage } from './AIChatMessage';
import { MentionPopup } from './MentionPopup';
import { AISettingsModal } from './AISettingsModal';
import './AIAssistantDock.css';

import { AIProgressTracker } from './AIProgressTracker';

export const AIAssistantDock: React.FC = () => {
  const {
    dockOpen,
    dockWidth,
    setDockWidth,
    toggleDock,
    messages,
    sendMessage,
    isStreaming,
    streamingContent,
    streamingReasoning,
    clearMessages,
    openSettingsModal,
    settings,
    checkpointSnapshot,
    rollbackCheckpoint,
    undoAIAction,
    redoAIAction,
  } = useAIStore();

  const [input, setInput] = useState('');
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Smooth scroll on new completed message, direct scroll on token stream
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, streamingContent]);

  // Clean streaming content (stripping uncompleted or completed velxio-action blocks)
  const displayStreamingContent = streamingContent
    .replace(/```velxio-action[\s\S]*?```/g, '')
    .replace(/```velxio-action[\s\S]*/g, '')
    .trim();

  // Drag to resize handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setDockWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setDockWidth]);

  if (!dockOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@') || lastWord.startsWith('/')) {
      setMentionFilter(lastWord);
    } else {
      setMentionFilter(null);
    }
  };

  const handleMentionSelect = (tag: string) => {
    if (tag === '/clear') {
      clearMessages();
      setInput('');
      setMentionFilter(null);
      return;
    }

    if (!mentionFilter) return;
    const words = input.split(/\s+/);
    words.pop();
    const nextInput = [...words, tag, ''].join(' ');
    setInput(nextInput);
    setMentionFilter(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'User' : 'VelxioAI'} (${new Date(m.timestamp).toLocaleTimeString()}):\n\n${m.content}\n\n---\n`
      )
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velxioai-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
    setMentionFilter(null);
  };

  return (
    <>
      <div className="velxio-ai-dock-container" style={{ width: `${dockWidth}px` }}>
        {/* Resize Divider */}
        <div
          className={`velxio-dock-resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize AI Studio"
        />

        <div className="velxio-ai-dock">
          {/* Header */}
          <div className="velxio-ai-header">
            <div className="velxio-ai-title">
              <span>✨</span>
              <span>VelxioAI Studio</span>
              <span className="velxio-ai-model-pill">{settings.selectedModel}</span>
            </div>
            <div className="velxio-ai-actions">
              <button
                className="velxio-ai-btn-icon"
                onClick={undoAIAction}
                title="Undo AI Action (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                className="velxio-ai-btn-icon"
                onClick={redoAIAction}
                title="Redo AI Action (Ctrl+Y)"
              >
                ↪
              </button>
              <button
                className="velxio-ai-btn-icon"
                onClick={handleExportChat}
                title="Save & Export Chat History (.md)"
                disabled={messages.length === 0}
              >
                💾
              </button>
              <button
                className="velxio-ai-btn-icon"
                onClick={openSettingsModal}
                title="AI Settings & API Keys"
              >
                ⚙️
              </button>
              <button
                className="velxio-ai-btn-icon"
                onClick={clearMessages}
                title="Clear Chat History"
              >
                🗑️
              </button>
              <button
                className="velxio-ai-btn-icon"
                onClick={() => toggleDock(false)}
                title="Close AI Studio (Ctrl+L)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 1-Click Rollback Banner */}
          {checkpointSnapshot && (
            <div className="velxio-ai-rollback-banner">
              <span>Workspace modified by AI action</span>
              <button className="velxio-ai-rollback-btn" onClick={rollbackCheckpoint}>
                ↩ Undo All Changes
              </button>
            </div>
          )}

          {/* Real-time Event-Driven Build Progress Animation */}
          <AIProgressTracker />

          {/* Messages */}
          <div className="velxio-ai-messages" ref={messagesContainerRef}>
            {messages.length === 0 && !isStreaming && (
              <div className="velxio-ai-empty-state">
                <div className="velxio-ai-empty-icon">✨</div>
                <h4>Welcome to VelxioAI Studio</h4>
                <p>Build, simulate, auto-wire, and self-heal embedded hardware with zero prior experience.</p>

                <div className="velxio-ai-starter-list">
                  <button
                    className="velxio-ai-starter-item"
                    onClick={() => sendMessage('Build a basic LED blink circuit with a series resistor')}
                  >
                    <span>💡</span>
                    <span>Wire a Blink LED Circuit</span>
                  </button>
                  <button
                    className="velxio-ai-starter-item"
                    onClick={() => sendMessage('Build a DHT22 temperature and humidity monitor')}
                  >
                    <span>🌡️</span>
                    <span>DHT22 Temp & Humidity Monitor</span>
                  </button>
                  <button
                    className="velxio-ai-starter-item"
                    onClick={() => sendMessage('Build an ultrasonic distance sensor with HC-SR04')}
                  >
                    <span>📡</span>
                    <span>HC-SR04 Distance Sensor</span>
                  </button>
                  <button
                    className="velxio-ai-starter-item"
                    onClick={() => sendMessage('/fix Auto-diagnose and fix all compilation and circuit errors')}
                  >
                    <span>🩺</span>
                    <span>Diagnose & Auto-Fix Errors (/fix)</span>
                  </button>
                  <button
                    className="velxio-ai-starter-item"
                    onClick={() => sendMessage('/bom Generate Bill of Materials and breadboarding guide')}
                  >
                    <span>📦</span>
                    <span>Generate Bill of Materials (/bom)</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <AIChatMessage key={msg.id} message={msg} />
            ))}

            {/* Live Streaming Content */}
            {isStreaming && (
              <div className="velxio-ai-streaming-block">
                {streamingReasoning && (
                  <details className="velxio-reasoning-dropdown" open>
                    <summary>🧠 Thinking...</summary>
                    <div className="velxio-reasoning-body">{streamingReasoning}</div>
                  </details>
                )}
                <span>{displayStreamingContent || 'Analyzing circuit & generating firmware...'}</span>
                <span className="velxio-ai-cursor" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="velxio-ai-input-box">
            {mentionFilter !== null && (
              <MentionPopup filter={mentionFilter} onSelect={handleMentionSelect} />
            )}

            <textarea
              ref={inputRef}
              className="velxio-ai-textarea"
              placeholder="Ask VelxioAI (e.g. 'Build an ultrasonic alarm', type @ for context)..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <div className="velxio-ai-input-footer">
              <div className="velxio-ai-quick-tags">
                <button
                  className="velxio-tag-btn"
                  onClick={() => setInput((p) => `${p} @board `)}
                  title="Reference active board"
                >
                  @board
                </button>
                <button
                  className="velxio-tag-btn"
                  onClick={() => setInput((p) => `${p} @circuit `)}
                  title="Reference canvas netlist"
                >
                  @circuit
                </button>
                <button
                  className="velxio-tag-btn"
                  onClick={() => setInput((p) => `${p} /fix `)}
                  title="Self-heal errors"
                >
                  /fix
                </button>
              </div>

              <button
                className="velxio-ai-send-btn"
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
              >
                {isStreaming ? 'Generating...' : 'Send ↵'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AISettingsModal />
    </>
  );
};
