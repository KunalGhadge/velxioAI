import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '../../ai/useAIStore';
import { AIChatMessage } from './AIChatMessage';
import { MentionPopup } from './MentionPopup';
import { AISettingsModal } from './AISettingsModal';
import './AIAssistantDock.css';

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
  } = useAIStore();

  const [input, setInput] = useState('');
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

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
    if (lastWord.startsWith('@')) {
      setMentionFilter(lastWord);
    } else {
      setMentionFilter(null);
    }
  };

  const handleMentionSelect = (tag: string) => {
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

          {/* Messages */}
          <div className="velxio-ai-messages">
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
                <span>{streamingContent || 'Analyzing circuit & generating firmware...'}</span>
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
