import React from 'react';
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
  const { openSettingsModal } = useAIStore();

  return (
    <div className={`velxio-chat-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className="velxio-msg-author">
        <span className={`badge ${isUser ? 'you' : 'ai'}`}>
          {isUser ? 'You' : 'VelxioAI'}
        </span>
        <span style={{ fontSize: 11, color: '#666666', fontWeight: 400 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
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

      {/* Message Text Content */}
      <div className="velxio-msg-content">{message.content}</div>

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
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'fit-content',
          }}
        >
          <span>⚙️</span>
          <span>Configure API Key</span>
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
