import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';
import { useResize } from '../hooks/useResize';
import { getMockTemplate } from '../lib/mocks/demoData';
import { normalizePipeline } from '../lib/normalizePipeline';

// DEMO MODE: Single source of truth
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

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
  const { size, onMouseDown } = useResize(220, 160, 350, 'horizontal');

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleTemplateClick = async (templateName: string) => {
    // 🔴 DEMO MODE: Use mock template directly - NO BACKEND REQUIRED
    if (DEMO_MODE) {
      console.log('[Sidebar] DEMO MODE: Loading template from mock data:', templateName);
      const mockData = getMockTemplate(templateName);
      const normalized = normalizePipeline(mockData);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage,
      });
      return;
    }

    // Real mode: Try backend, fallback to mock on error
    try {
      const result: any = await apiClient.loadTemplate(templateName);
      const normalized = normalizePipeline(result);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage,
      });
    } catch (error) {
      console.error('[Sidebar] Template loading failed, using mock fallback:', error);
      // FAIL-SAFE: Use mock template as fallback
      const mockData = getMockTemplate(templateName);
      const normalized = normalizePipeline(mockData);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage + ' (Demo mode fallback)',
      });
    }
  };

  return (
    <div
      style={{
        width: `${size}px`,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          background: 'transparent',
          zIndex: 10,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#6366f160';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
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
            letterSpacing: '0.15em',
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
                borderLeft: `4px solid ${node.color}`,
                borderRadius: '6px',
                padding: '12px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `inset 4px 0 6px ${node.color}15`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-base)';
                e.currentTarget.style.borderLeftWidth = '4px';
                e.currentTarget.style.boxShadow = `inset 4px 0 10px ${node.color}25`;
                e.currentTarget.style.backgroundImage = `linear-gradient(90deg, ${node.color}10, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderLeftWidth = '4px';
                e.currentTarget.style.boxShadow = `inset 4px 0 6px ${node.color}15`;
                e.currentTarget.style.backgroundImage = 'none';
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
                    letterSpacing: '0.05em',
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
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
          margin: '4px 0',
        }}
      />

      {/* Templates */}
      <div data-tour="templates-sidebar">
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            letterSpacing: '0.15em',
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
                transition: 'all 0.3s ease',
                fontFamily: 'JetBrains Mono, monospace',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement;
                if (arrow) {
                  arrow.style.opacity = '1';
                  arrow.style.transform = 'translateX(0)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--btn-ghost-bg)';
                e.currentTarget.style.borderColor = 'var(--btn-ghost-border)';
                const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement;
                if (arrow) {
                  arrow.style.opacity = '0';
                  arrow.style.transform = 'translateX(-4px)';
                }
              }}
            >
              <span>{template.label}</span>
              <span
                className="arrow"
                style={{
                  opacity: 0,
                  transform: 'translateX(-4px)',
                  transition: 'all 0.3s ease',
                  color: 'var(--accent)',
                }}
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        style={{
          height: '60px',
          background: 'linear-gradient(to top, var(--bg-panel), transparent)',
          pointerEvents: 'none',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
    </div>
  );
};
