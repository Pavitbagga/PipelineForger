import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';

type TopbarProps = {
  onShipIt: () => void;
  onTestRun: () => void;
  onDraw: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  onResetTour?: () => void;
  session: Session | null;
  onSignOut: () => void;
  onOpenPipelines: () => void;
  onPipelineSaved?: () => void;
};

export const Topbar = ({ onShipIt, onTestRun, onDraw, onToggleTheme, theme, onResetTour, session, onSignOut, onOpenPipelines, onPipelineSaved }: TopbarProps) => {
  const [intent, setIntent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { nodes, setNodes, setEdges, addCopilotMessage, savePipeline } = usePipelineStore();

  const handleSave = async () => {
    const name = window.prompt('Pipeline name:', 'My Pipeline');
    if (!name?.trim()) return;
    setIsSaving(true);
    try {
      await savePipeline(name.trim());
      onPipelineSaved?.();
    } catch {
      console.error('[Topbar] Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = session?.user.user_metadata['full_name'] as string | undefined;

  const initials = (() => {
    if (displayName) {
      const words = displayName.trim().split(/\s+/);
      const first = words[0]?.[0] ?? '';
      const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
      return (first + last).toUpperCase();
    }
    return (session?.user.email?.[0] ?? '?').toUpperCase();
  })();

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
    } catch {
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
          data-tour="intent-box"
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
          data-tour="generate-btn"
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
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {onResetTour && (
          <button
            onClick={onResetTour}
            title="Restart the onboarding tour"
            style={{
              height: '36px',
              padding: '0 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ? Tour
          </button>
        )}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            height: '36px',
            width: '36px',
            background: 'var(--btn-ghost-bg)',
            border: '1px solid var(--btn-ghost-border)',
            borderRadius: '8px',
            color: 'var(--btn-ghost-color)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-ghost-bg)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--btn-ghost-border)';
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-ghost-bg)';
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          onClick={onDraw}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'var(--btn-ghost-bg)',
            border: '1px solid var(--btn-ghost-border)',
            borderRadius: '8px',
            color: 'var(--btn-ghost-color)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--btn-ghost-border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--btn-ghost-color)';
          }}
        >
          <span>✏️</span>
          <span>Draw</span>
        </button>
        <button
          data-tour="test-run-btn"
          onClick={onTestRun}
          disabled={nodes.length === 0}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'transparent',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            color: 'var(--accent)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.4 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (nodes.length > 0) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <span>▶</span>
          <span>Test Run</span>
        </button>
        {/* My Pipelines button */}
        <button
          onClick={onOpenPipelines}
          style={{
            height: '40px',
            padding: '0 16px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <span>📁</span>
          <span>My Pipelines</span>
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={nodes.length === 0 || isSaving}
          style={{
            height: '40px',
            padding: '0 16px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: nodes.length === 0 || isSaving ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.4 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (nodes.length > 0 && !isSaving) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <span>💾</span>
          <span>{isSaving ? 'Saving…' : 'Save'}</span>
        </button>

        <button
          data-tour="ship-it-btn"
          onClick={onShipIt}
          disabled={nodes.length === 0}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'var(--accent)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.4 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'opacity 0.2s, filter 0.2s',
          }}
          onMouseEnter={(e) => {
            if (nodes.length > 0) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'none';
          }}
        >
          <span>🚀</span>
          <span>Ship It</span>
        </button>

        {/* User avatar + sign-out menu */}
        {session && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              title={displayName ?? session.user.email ?? 'Account'}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
                boxShadow: '0 0 0 2px rgba(99,102,241,0.3)',
                transition: 'box-shadow 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.3)'; }}
            >
              {initials}
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  minWidth: '180px',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {displayName ?? 'User'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {session.user.email}
                  </div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onSignOut(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f43f5e',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
