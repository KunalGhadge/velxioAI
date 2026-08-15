import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIMessage } from '../../ai/types';
import { useAIStore } from '../../ai/useAIStore';
import { AICodeDiffCard } from './AICodeDiffCard';
import { AICircuitProposalCard } from './AICircuitProposalCard';
import { HardwareLearningCard } from './HardwareLearningCard';
import { HardwareBOMCard } from './HardwareBOMCard';
import './AIChatMessage.css';

interface Props {
  message: AIMessage;
}

export const AIChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const { openSettingsModal, rollbackCheckpoint, checkpointSnapshot } = useAIStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`velxio-chat-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className="velxio-msg-author">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${isUser ? 'you' : 'ai'}`}>
            {isUser ? 'You' : 'VelxioAI'}
          </span>
          <span style={{ fontSize: 11, color: '#888888', fontWeight: 400 }}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Hover Copy Button */}
        <button
          className={`velxio-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Copy message text"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      {/* Collapsible Reasoning Dropdown */}
      {message.reasoning && (
        <details className="velxio-reasoning-dropdown">
          <summary>🧠 View Model Technical Reasoning</summary>
          <div className="velxio-reasoning-body">{message.reasoning}</div>
        </details>
      )}

      {/* Real-time Steps Checklist */}
      {message.steps && message.steps.length > 0 && (
        <div className="velxio-steps-list">
          {message.steps.map((step) => (
            <div
              key={step.id}
              className={`velxio-step-item ${step.status === 'completed' ? 'completed' : ''}`}
            >
              <span className="velxio-step-icon">
                {step.status === 'completed' ? '✔' : step.status === 'in_progress' ? '⏳' : '○'}
              </span>
              <span>{step.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Beautiful Rich Markdown Rendering */}
      <div className="velxio-msg-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="velxio-md-p">{children}</p>,
            strong: ({ children }) => <strong className="velxio-md-bold">{children}</strong>,
            em: ({ children }) => <em className="velxio-md-em">{children}</em>,
            ul: ({ children }) => <ul className="velxio-md-ul">{children}</ul>,
            ol: ({ children }) => <ol className="velxio-md-ol">{children}</ol>,
            li: ({ children }) => <li className="velxio-md-li">{children}</li>,
            h1: ({ children }) => <h3 className="velxio-md-h1">{children}</h3>,
            h2: ({ children }) => <h4 className="velxio-md-h2">{children}</h4>,
            h3: ({ children }) => <h5 className="velxio-md-h3">{children}</h5>,
            code: ({ inline, className, children, ...props }: any) => {
              return inline ? (
                <code className="velxio-md-inline-code" {...props}>
                  {children}
                </code>
              ) : (
                <pre className="velxio-md-code-block">
                  <code {...props}>{children}</code>
                </pre>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Auto-Applied Execution Banner */}
      {(message.circuitProposal || message.codeProposal) && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
            <span>⚡</span>
            <span>
              <strong>Auto-Applied to Studio:</strong> Circuit placed on canvas & sketch.ino written.
            </span>
          </div>
          {checkpointSnapshot && (
            <button
              onClick={rollbackCheckpoint}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
              }}
              title="Revert all changes made by this AI action"
            >
              ↩ Revert
            </button>
          )}
        </div>
      )}

      {/* Quick Settings Shortcut on Error */}
      {(message.error || message.content.includes('Missing API Key') || message.content.includes('API Key')) && message.role === 'assistant' && (
        <button
          onClick={openSettingsModal}
          style={{
            background: '#007acc',
            color: '#ffffff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'fit-content',
          }}
        >
          <span>⚙️</span>
          <span>Configure API Key in Settings</span>
        </button>
      )}

      {/* Interactive Circuit Proposal */}
      {message.circuitProposal && (
        <AICircuitProposalCard proposal={message.circuitProposal} />
      )}

      {/* Interactive Code Proposal */}
      {message.codeProposal && (
        <AICodeDiffCard proposal={message.codeProposal} />
      )}

      {/* Hardware Learning Card */}
      {message.learningCard && (
        <HardwareLearningCard data={message.learningCard} />
      )}

      {/* Hardware BOM Card */}
      {message.bomData && (
        <HardwareBOMCard data={message.bomData} />
      )}
    </div>
  );
};
