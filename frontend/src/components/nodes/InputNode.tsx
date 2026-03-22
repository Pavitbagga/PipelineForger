import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const InputNode = ({ data = {}, selected }: NodeProps) => {
  const color = '#10b981';
  const nodeData = data as any;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${selected ? color : 'var(--border)'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '8px',
      padding: '12px',
      minWidth: '180px',
      boxShadow: selected ? `0 0 0 2px ${color}40` : 'none',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>
        INPUT
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {nodeData?.label || 'Input'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: nodeData?.status === 'running' ? color
            : nodeData?.status === 'done' ? 'var(--success)'
            : nodeData?.status === 'error' ? 'var(--error)'
            : 'var(--text-muted)',
        }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {nodeData?.status || 'idle'}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, width: '10px', height: '10px', border: '2px solid var(--bg-panel)' }}
      />
    </div>
  );
};

export default memo(InputNode);
