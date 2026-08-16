import React, { useState } from 'react';
import { useAIStore } from '../../ai/useAIStore';
import type { CodeProposal } from '../../ai/types';
import './AICodeDiffCard.css';

interface Props {
  proposal: CodeProposal;
}

export const AICodeDiffCard: React.FC<Props> = ({ proposal }) => {
  const { applyCodeProposal } = useAIStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lineCount = proposal.proposedContent ? proposal.proposedContent.split('\n').length : 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(proposal.proposedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyCodeProposal(proposal);
  };

  return (
    <div className={`velxio-diff-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Compact Header */}
      <div className="velxio-diff-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="velxio-diff-title">
          <span className="velxio-diff-icon">📄</span>
          <span className="velxio-diff-filename">{proposal.fileName || 'sketch.ino'}</span>
          <span className="velxio-diff-badge">{lineCount} lines</span>
          {proposal.summary && (
            <span className="velxio-diff-summary" title={proposal.summary}>
              — {proposal.summary}
            </span>
          )}
        </div>

        <div className="velxio-diff-actions">
          {/* Quick Copy */}
          <button
            type="button"
            className="velxio-diff-btn-copy"
            onClick={handleCopy}
            title="Copy code to clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>

          {/* Apply Button */}
          {proposal.applied ? (
            <span className="velxio-diff-btn-applied">✓ Applied</span>
          ) : (
            <button
              type="button"
              className="velxio-diff-btn-accept"
              onClick={handleApply}
            >
              Apply Code
            </button>
          )}

          {/* Expand / Collapse Toggle */}
          <button
            type="button"
            className="velxio-diff-btn-toggle"
            aria-label={isExpanded ? 'Collapse Code' : 'Expand Code'}
          >
            {isExpanded ? '▲ Hide' : '▼ Expand'}
          </button>
        </div>
      </div>

      {/* Lazy Rendered Code Body */}
      {isExpanded && (
        <div className="velxio-diff-content">
          <pre className="velxio-diff-pre">
            <code>{proposal.proposedContent}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
