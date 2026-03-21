import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeData } from '../../store/pipelineStore';

const RouterNode = ({ data: rawData, selected }: NodeProps) => {
  const data = rawData as NodeData;
  const color = '#22d3ee';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${selected ? color : 'var(--border)'}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '180px',
        boxShadow: selected ? `0 0 0 2px ${color}40` : 'none',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#6b6b8a',
          width: '10px',
          height: '10px',
          border: '2px solid var(--bg-panel)',
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
          letterSpacing: '0.5px',
        }}
      >
        ROUTER
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
        {data.label || "Router"}
      </div>

      {/* Condition Preview */}
      {data.condition && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.condition.length > 30
            ? data.condition.substring(0, 30) + '...'
            : data.condition}
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
            animation: data.status === 'running' ? 'pulse 1.5s infinite' : 'none',
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
        }}
      />

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default memo(RouterNode);
