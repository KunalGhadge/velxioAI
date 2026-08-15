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

  const isSlashCommand = filter.startsWith('/');

  if (isSlashCommand) {
    const slashCommands = [
      { tag: '/fix', desc: 'Auto-diagnose & fix compilation errors and circuit faults' },
      { tag: '/build', desc: 'Generate complete circuit schematic + firmware from description' },
      { tag: '/wire', desc: 'Auto-route all power, ground, and GPIO wires on canvas' },
      { tag: '/explain', desc: 'Interactive 2-minute visual hardware learning guide' },
      { tag: '/bom', desc: 'Generate Bill of Materials & breadboard assembly guide' },
      { tag: '/refactor', desc: 'Convert blocking delay() loops to non-blocking millis()' },
      { tag: '/audit', desc: 'Run pin conflict watchdog & electrical logic safety check' },
      { tag: '/clear', desc: 'Clear chat history' },
    ];

    const query = filter.replace('/', '').toLowerCase();
    const matched = slashCommands.filter(
      (c) => c.tag.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query)
    );

    if (matched.length === 0) return null;

    return (
      <div className="velxio-mention-popup">
        <div className="velxio-mention-header">⚡ Slash Commands</div>
        {matched.map((item) => (
          <div
            key={item.tag}
            className="velxio-mention-item"
            onClick={() => onSelect(item.tag)}
          >
            <span className="velxio-mention-tag" style={{ color: '#ec4899' }}>{item.tag}</span>
            <span className="velxio-mention-desc">— {item.desc}</span>
          </div>
        ))}
      </div>
    );
  }

  // Otherwise handle @mentions
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
    desc: `${c.type || 'component'} on canvas`,
  }));

  const allTags = [...baseTags, ...fileTags, ...componentTags];
  const query = filter.replace('@', '').toLowerCase();
  const matched = allTags.filter(
    (t) => t.tag.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)
  );

  if (matched.length === 0) return null;

  return (
    <div className="velxio-mention-popup">
      <div className="velxio-mention-header">📎 Context Tags</div>
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
