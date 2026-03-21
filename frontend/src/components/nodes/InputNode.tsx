import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const InputNode = ({ data = {}, selected }: NodeProps) => {
  const color = '#10b981';
  const nodeData = data as any;
  return (
    <div style={{
      background: '#1a1a2e',
      border: `1px solid ${selected ? color : '#ffffff12'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '8px',
      padding: '12px',
      minWidth: '180px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#6b6b8a', marginBottom: '6px' }}>
        INPUT
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#f0f0ff', marginBottom: '8px' }}>
        {nodeData?.label || 'Input'}
      </div>
      <div style={{ fontSize: '11px', color: '#6b6b8a' }}>
        {nodeData?.status || 'idle'}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, width: '10px', height: '10px' }} />
    </div>
  );
};

export default memo(InputNode);
