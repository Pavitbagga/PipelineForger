import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import type { NodeData } from '../../store/pipelineStore';
import { EthicsWarningBadge } from '../EthicsWarningBadge';
import { useEthicsRisks } from '../../hooks/useEthicsRisks';

const ToolNode = ({ data: rawData, selected, id }: NodeProps) => {
  const data = rawData as NodeData;
  const color = '#f59e0b';
  const isRunning = data.status === 'running';
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  const { getRiskForNode } = useEthicsRisks();
  const ethicsRisk = getRiskForNode(id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const toolIcons: Record<string, string> = {
    search: '🔍',
    code: '💻',
    file: '📄',
    api: '🌐',
  };

  const toolNames: Record<string, string> = {
    search: 'Web Search',
    code: 'Code Executor',
    file: 'File Reader',
    api: 'API Caller',
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${selected ? color : 'var(--border)'}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '180px',
        boxShadow: selected
          ? `0 0 0 2px ${color}, 0 0 20px ${color}40`
          : `inset 4px 0 8px ${color}15`,
        transition: 'all 0.2s ease',
        animation: isRunning ? 'shimmer 2s linear infinite' : 'none',
        backgroundImage: isRunning
          ? `linear-gradient(90deg, transparent, ${color}15, transparent)`
          : 'none',
        backgroundSize: '200% 100%',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!selected) {
          e.currentTarget.style.boxShadow = `0 0 20px ${color}20, inset 4px 0 8px ${color}15`;
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (!selected) {
          e.currentTarget.style.boxShadow = `inset 4px 0 8px ${color}15`;
        }
      }}
    >
      {/* Ethics Warning Badge */}
      <EthicsWarningBadge risk={ethicsRisk} />

      {/* Delete button */}
      {(isHovered || selected) && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '2px solid var(--bg-panel)',
            background: '#f43f5e',
            color: 'white',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
            zIndex: 10,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.3)';
          }}
        >
          ×
        </button>
      )}
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#6b6b8a',
          width: '10px',
          height: '10px',
          border: '2px solid var(--bg-panel)',
          left: '-6px',
        }}
      />

      {/* Node Type Label */}
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '6px',
          letterSpacing: '0.12em',
        }}
      >
        TOOL
      </div>

      {/* Node Name */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}
      >
        {data.label || "Tool"}
      </div>

      {/* Tool Type */}
      {data.toolType && (
        <div
          style={{
            fontSize: '11px',
            color: color,
            marginBottom: '8px',
            background: `${color}20`,
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{toolIcons[data.toolType]}</span>
          <span>{toolNames[data.toolType] || data.toolType}</span>
        </div>
      )}

      {/* Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background:
              data.status === 'running'
                ? color
                : data.status === 'done'
                ? 'var(--success)'
                : data.status === 'error'
                ? 'var(--error)'
                : 'var(--text-muted)',
            animation: data.status === 'running' ? 'pulse-dot 1.5s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {data.status || 'idle'}
        </span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: color,
          width: '10px',
          height: '10px',
          border: '2px solid var(--bg-panel)',
          right: '-6px',
        }}
      />

    </div>
  );
};

export default memo(ToolNode);
