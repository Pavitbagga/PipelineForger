import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeData } from '../../store/pipelineStore';

const OutputNode = ({ data: rawData, selected }: NodeProps) => {
  const data = rawData as NodeData;
  const color = '#f43f5e';

  return (
    <div
      style={{
        position: 'relative',
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
        OUTPUT
      </div>

      {/* Node Name */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}
      >
        {data.label || "Output"}
      </div>

      {/* Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

export default memo(OutputNode);
