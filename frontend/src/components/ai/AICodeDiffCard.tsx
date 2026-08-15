import React from 'react';
import { useAIStore } from '../../ai/useAIStore';
import type { CodeProposal } from '../../ai/types';
import './AICodeDiffCard.css';

interface Props {
  proposal: CodeProposal;
}

export const AICodeDiffCard: React.FC<Props> = ({ proposal }) => {
  const { applyCodeProposal } = useAIStore();

  return (
    <div className="velxio-diff-card">
      <div className="velxio-diff-header">
        <div className="velxio-diff-title">
          <span>📝</span>
          <span>{proposal.fileName}</span>
          <small style={{ color: '#888888', fontWeight: 400 }}>— {proposal.summary}</small>
        </div>
        <div className="velxio-diff-actions">
          {proposal.applied ? (
            <span className="velxio-diff-btn-applied">✓ Applied to Editor</span>
          ) : (
            <button
              className="velxio-diff-btn-accept"
              onClick={() => applyCodeProposal(proposal)}
            >
              Apply to Editor
            </button>
          )}
        </div>
      </div>
      <div className="velxio-diff-content">
        <code>{proposal.proposedContent}</code>
      </div>
    </div>
  );
};
