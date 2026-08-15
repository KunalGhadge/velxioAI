import React from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { useEditorStore } from '../../store/useEditorStore';
import './MentionPopup.css';

interface Props {
  filter: string;
  onSelect: (tag: string) => void;
}

export const MentionPopup: React.FC<Props> = ({ filter, onSelect }) => {
  const components = useSimulatorStore((s) => s.components || []);
  const files = useEditorStore((s) => s.files || []);

  const baseTags = [
    { tag: '@board', desc: 'Current active board specs & pinouts' },
    { tag: '@circuit', desc: 'Complete canvas netlist & wiring' },
    { tag: '@serial', desc: 'Recent Serial Monitor outputs' },
    { tag: '@errors', desc: 'Compiler diagnostics & SPICE warnings' },
  ];

  const fileTags = files.map((f) => ({
    tag: `@file:${f.name}`,
    desc: `Code file (${f.name})`,
  }));

  const componentTags = components.map((c) => ({
    tag: `@component:${c.id}`,
    desc: `${c.type} on canvas`,
  }));

  const allTags = [...baseTags, ...fileTags, ...componentTags];
  const query = filter.replace('@', '').toLowerCase();
  const matched = allTags.filter(
    (t) => t.tag.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)
  );

  if (matched.length === 0) return null;

  return (
    <div className="velxio-mention-popup">
      {matched.map((item) => (
        <div
          key={item.tag}
          className="velxio-mention-item"
          onClick={() => onSelect(item.tag)}
        >
          <span className="velxio-mention-tag">{item.tag}</span>
          <span className="velxio-mention-desc">— {item.desc}</span>
        </div>
      ))}
    </div>
  );
};
