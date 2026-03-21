import { useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';

type TopbarProps = {
  onShipIt: () => void;
  onTestRun: () => void;
};

export const Topbar = ({ onShipIt, onTestRun }: TopbarProps) => {
  const [intent, setIntent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { nodes, setNodes, setEdges, addCopilotMessage } = usePipelineStore();

  const handleGenerate = async () => {
    if (!intent.trim()) return;

    setIsGenerating(true);
    try {
      const result: any = await apiClient.generatePipeline(intent);
      const transformedNodes = result.nodes.map((node: any) => ({
        ...node,
        data: {
          label: node.config?.label || node.type || 'Node',
          ...node.config,
          status: 'idle',
        }
      }));
      setNodes(transformedNodes);
      setEdges(result.edges);
      if (result.copilotMessage) {
        addCopilotMessage({
          role: 'claude',
          text: result.copilotMessage,
        });
      } else {
        addCopilotMessage({
          role: 'claude',
          text: 'Pipeline generated! Click any node to configure it.',
        });
      }
    } catch (error) {
      addCopilotMessage({
        role: 'system',
        text: 'Failed to generate pipeline. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div
      style={{
        height: '64px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '24px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '20px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '120px',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>⚡</span>
        <span>Forge</span>
      </div>

      {/* Intent Input */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Describe what you want to build..."
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isGenerating}
          style={{
            flex: 1,
            height: '40px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0 16px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !intent.trim()}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isGenerating || !intent.trim() ? 'not-allowed' : 'pointer',
            opacity: isGenerating || !intent.trim() ? 0.5 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            transition: 'opacity 0.2s',
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Pipeline'}
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onTestRun}
          disabled={nodes.length === 0}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'transparent',
            border: '1px solid var(--accent)',
            borderRadius: '8px',
            color: 'var(--accent)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.5 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>▶</span>
          <span>Test Run</span>
        </button>
        <button
          onClick={onShipIt}
          disabled={nodes.length === 0}
          style={{
            height: '40px',
            padding: '0 20px',
            background: nodes.length === 0 ? 'var(--bg-card)' : 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.5 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🚀</span>
          <span>Ship It</span>
        </button>
      </div>
    </div>
  );
};
