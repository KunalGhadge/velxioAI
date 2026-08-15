import React from 'react';
import { useAIStore } from '../../ai/useAIStore';
import type { CircuitProposal } from '../../ai/types';
import './AICircuitProposalCard.css';

interface Props {
  proposal: CircuitProposal;
}

export const AICircuitProposalCard: React.FC<Props> = ({ proposal }) => {
  const { applyCircuitProposal } = useAIStore();

  return (
    <div className="velxio-circuit-card">
      <div className="velxio-circuit-header">
        <div className="velxio-circuit-title">
          <span>🔌</span>
          <span>{proposal.title}</span>
        </div>
        <div>
          {proposal.applied ? (
            <span className="velxio-circuit-btn-applied">✓ Placed on Canvas</span>
          ) : (
            <button
              className="velxio-circuit-btn-apply"
              onClick={() => applyCircuitProposal(proposal)}
            >
              Apply to Canvas
            </button>
          )}
        </div>
      </div>
      <div className="velxio-circuit-body">
        {proposal.description && <p style={{ margin: 0 }}>{proposal.description}</p>}

        {proposal.componentsToAdd.length > 0 && (
          <div>
            <strong style={{ color: '#e0e0e0' }}>Components to Add:</strong>
            <div className="velxio-circuit-list" style={{ marginTop: 4 }}>
              {proposal.componentsToAdd.map((c) => (
                <div key={c.id} className="velxio-circuit-item">
                  <span>📦</span>
                  <span>
                    {c.type} (id: {c.id}) at ({c.left}, {c.top})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {proposal.wiresToAdd.length > 0 && (
          <div>
            <strong style={{ color: '#e0e0e0' }}>Connections to Route:</strong>
            <div className="velxio-circuit-list" style={{ marginTop: 4 }}>
              {proposal.wiresToAdd.map((w, idx) => (
                <div key={idx} className="velxio-circuit-item">
                  <span style={{ color: w.color || '#3b82f6' }}>🧵</span>
                  <span>
                    {w.fromPart}:{w.fromPin} ➔ {w.toPart}:{w.toPin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
