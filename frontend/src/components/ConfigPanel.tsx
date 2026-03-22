import { useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import type { NodeData } from '../store/pipelineStore';

export const ConfigPanel = () => {
  const { nodes, selectedNodeId, updateNode, setSelectedNodeId } = usePipelineStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Local form state — reset synchronously during render when selection changes
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(selectedNodeId);
  const [formData, setFormData] = useState<NodeData>(selectedNode?.data || { label: '' });

  if (lastSelectedId !== selectedNodeId) {
    setLastSelectedId(selectedNodeId);
    setFormData(selectedNode?.data || { label: '' });
  }

  if (!selectedNode) return null;

  const handleSave = () => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, formData);
      setSelectedNodeId(null); // Close panel after saving
    }
  };

  const handleClose = () => {
    setSelectedNodeId(null);
  };

  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get node color
  const colorMap: Record<string, string> = {
    input: '#10b981',
    llm: '#6366f1',
    tool: '#f59e0b',
    agent: '#8b5cf6',
    router: '#22d3ee',
    output: '#f43f5e',
  };
  const nodeColor = colorMap[selectedNode.type || 'default'] || '#6b6b8a';

  return (
    <div
      style={{
        width: '320px',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '4px',
              height: '24px',
              background: nodeColor,
              borderRadius: '2px',
            }}
          />
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.5px',
              }}
            >
              {selectedNode.type}
            </div>
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Configure Node
            </div>
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Form Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Label Field (Common to all nodes) */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Node Label
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => updateFormField('label', e.target.value)}
            style={{
              width: '100%',
              height: '40px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0 12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = nodeColor;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
            }}
          />
        </div>

        {/* LLM Node Config */}
        {selectedNode.type === 'llm' && (
          <>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Model
              </label>
              <select
                value={formData.model || 'claude-sonnet'}
                onChange={(e) => updateFormField('model', e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0 12px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="claude-sonnet">Claude Sonnet</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                System Prompt
              </label>
              <textarea
                value={formData.systemPrompt || ''}
                onChange={(e) => updateFormField('systemPrompt', e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = nodeColor;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Temperature: {formData.temperature?.toFixed(1) || '0.7'}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature || 0.7}
                onChange={(e) => updateFormField('temperature', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                }}
              />
            </div>
          </>
        )}

        {/* Tool Node Config */}
        {selectedNode.type === 'tool' && (
          <>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Tool Type
              </label>
              <select
                value={formData.toolType || 'search'}
                onChange={(e) => updateFormField('toolType', e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0 12px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="search">Web Search</option>
                <option value="code">Code Executor</option>
                <option value="file">File Reader</option>
                <option value="api">API Caller</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Parameters
              </label>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                Key-value configuration (coming soon)
              </div>
            </div>
          </>
        )}

        {/* Agent Node Config */}
        {selectedNode.type === 'agent' && (
          <>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Goal
              </label>
              <textarea
                value={formData.goal || ''}
                onChange={(e) => updateFormField('goal', e.target.value)}
                rows={4}
                placeholder="Describe what the agent should achieve..."
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = nodeColor;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Max Steps
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxSteps || 5}
                onChange={(e) => updateFormField('maxSteps', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0 12px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = nodeColor;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                }}
              />
            </div>
          </>
        )}

        {/* Router Node Config */}
        {selectedNode.type === 'router' && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Routing Condition
            </label>
            <textarea
              value={formData.condition || ''}
              onChange={(e) => updateFormField('condition', e.target.value)}
              rows={4}
              placeholder="Describe routing logic in plain English..."
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                resize: 'vertical',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = nodeColor;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            flex: 1,
            height: '40px',
            background: 'var(--btn-ghost-bg)',
            border: '1px solid var(--btn-ghost-border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            height: '40px',
            background: nodeColor,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};
