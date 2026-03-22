import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';

type NodeTypeConfig = {
  type: string;
  label: string;
  color: string;
  icon: string;
};

const nodeTypes: NodeTypeConfig[] = [
  { type: 'input', label: 'INPUT', color: '#10b981', icon: '📥' },
  { type: 'llm', label: 'LLM', color: '#6366f1', icon: '🤖' },
  { type: 'tool', label: 'TOOL', color: '#f59e0b', icon: '🔧' },
  { type: 'agent', label: 'AGENT', color: '#8b5cf6', icon: '🎯' },
  { type: 'router', label: 'ROUTER', color: '#22d3ee', icon: '🔀' },
  { type: 'output', label: 'OUTPUT', color: '#f43f5e', icon: '📤' },
];

const templates = [
  { name: 'research-report', label: 'Research & Report' },
  { name: 'support-bot', label: 'Support Bot' },
  { name: 'code-reviewer', label: 'Code Reviewer' },
];

export const Sidebar = () => {
  const { setNodes, setEdges, addCopilotMessage } = usePipelineStore();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleTemplateClick = async (templateName: string) => {
    try {
      const result: any = await apiClient.loadTemplate(templateName);
      setNodes(result.nodes);
      setEdges(result.edges);
      addCopilotMessage({
        role: 'claude',
        text: result.copilotMessage,
      });
    } catch {
      addCopilotMessage({
        role: 'system',
        text: 'Failed to load template. Please try again.',
      });
    }
  };

  return (
    <div
      style={{
        width: '220px',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
      }}
    >
      {/* Node Types */}
      <div data-tour="node-sidebar">
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            letterSpacing: '0.5px',
          }}
        >
          Node Types
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nodeTypes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${node.color}`,
                borderRadius: '6px',
                padding: '12px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-base)';
                e.currentTarget.style.borderLeftWidth = '4px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderLeftWidth = '3px';
              }}
            >
              <span style={{ fontSize: '18px' }}>{node.icon}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '2px',
                  }}
                >
                  {node.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* Templates */}
      <div data-tour="templates-sidebar">
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            letterSpacing: '0.5px',
          }}
        >
          Templates
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => handleTemplateClick(template.name)}
              style={{
                background: 'var(--btn-ghost-bg)',
                border: '1px solid var(--btn-ghost-border)',
                borderRadius: '6px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.2s, background 0.2s',
                fontFamily: 'JetBrains Mono, monospace',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--btn-ghost-bg)';
                e.currentTarget.style.borderColor = 'var(--btn-ghost-border)';
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
