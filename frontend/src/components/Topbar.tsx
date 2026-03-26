import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePipelineStore } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';
import { fetchWithAuth } from '../lib/api';
import { localPipelines } from '../lib/localPipelines';
import { getMockPipeline, getMockCopilotMessages } from '../lib/mocks/demoData';
import { normalizePipeline } from '../lib/normalizePipeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// DEMO MODE: Single source of truth
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

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
  onOpenHistory: () => void;
};

type SaveStatus = 'idle' | 'saved' | 'updated' | 'error';

export const Topbar = ({ onShipIt, onTestRun, onDraw, onToggleTheme, theme, onResetTour, session, onSignOut, onOpenPipelines, onPipelineSaved, onOpenHistory }: TopbarProps) => {
  const [intent, setIntent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const {
    nodes, edges,
    setNodes, setEdges,
    addCopilotMessage,
    activePipelineId,
    activePipelineName,
    lastSavedSnapshot,
    setActivePipeline,
    updateLastSavedSnapshot,
  } = usePipelineStore();

  // Auto-dismiss save status after 3 s
  useEffect(() => {
    if (saveStatus === 'idle') return;
    const t = setTimeout(() => setSaveStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const openSaveModal = () => {
    setSaveModalName(activePipelineName ?? '');
    setShowSaveModal(true);
  };

  const handleSaveSubmit = async () => {
    const name = saveModalName.trim() || 'My Pipeline';
    setShowSaveModal(false);
    setIsSaving(true);

    try {
      if (activePipelineId) {
        // ── UPDATE existing pipeline ──────────────────────────────────────────

        // Check if this is a localStorage-based pipeline
        if (activePipelineId.startsWith('local_')) {
          localPipelines.update(activePipelineId, name, nodes, edges);
          updateLastSavedSnapshot();
          setSaveStatus('updated');
          onPipelineSaved?.();
          return;
        }

        const prevNodes = (lastSavedSnapshot?.nodes as Array<{ id: string }> | undefined) ?? [];
        const prevEdges = (lastSavedSnapshot?.edges as Array<{ id: string }> | undefined) ?? [];
        const currentNodeIds = nodes.map((n) => n.id);
        const prevNodeIds = prevNodes.map((n) => n.id);
        const currentEdgeIds = edges.map((e) => e.id);
        const prevEdgeIds = prevEdges.map((e) => e.id);

        const diffDescription = [
          `Nodes added: ${currentNodeIds.filter((id) => !prevNodeIds.includes(id)).length}`,
          `Nodes removed: ${prevNodeIds.filter((id) => !currentNodeIds.includes(id)).length}`,
          `Edges added: ${currentEdgeIds.filter((id) => !prevEdgeIds.includes(id)).length}`,
          `Edges removed: ${prevEdgeIds.filter((id) => !currentEdgeIds.includes(id)).length}`,
          `Node types now present: ${[...new Set(nodes.map((n) => n.type))].join(', ')}`,
        ].join(', ');

        try {
          const [summarizeRes, updateRes] = await Promise.all([
            fetchWithAuth(`${API_URL}/api/pipelines/summarize`, {
              method: 'POST',
              body: JSON.stringify({
                pipelineName: name,
                diffDescription,
                previousNodeCount: prevNodeIds.length,
                currentNodeCount: currentNodeIds.length,
              }),
            }),
            fetchWithAuth(`${API_URL}/api/pipelines/${activePipelineId}`, {
              method: 'PUT',
              body: JSON.stringify({ name, nodes, edges }),
            }),
          ]);

          // Fallback to localStorage on 503
          if (updateRes.status === 503) {
            const localPipe = localPipelines.update(activePipelineId, name, nodes, edges);
            if (localPipe) {
              updateLastSavedSnapshot();
              setSaveStatus('updated');
              onPipelineSaved?.();
              return;
            }
          }

          if (!updateRes.ok) throw new Error(`Update failed: HTTP ${updateRes.status}`);

          const { summary } = summarizeRes.ok
            ? (await summarizeRes.json() as { summary: string })
            : { summary: 'Pipeline updated with structural changes.' };

          await fetchWithAuth(`${API_URL}/api/history/${activePipelineId}`, {
            method: 'POST',
            body: JSON.stringify({ summary, nodes, edges }),
          });

          updateLastSavedSnapshot();
          setSaveStatus('updated');
        } catch (apiErr) {
          // Fallback to localStorage on any API error
          console.warn('[Topbar] API error, falling back to localStorage:', apiErr);
          localPipelines.update(activePipelineId, name, nodes, edges);
          updateLastSavedSnapshot();
          setSaveStatus('updated');
        }
      } else {
        // ── CREATE new pipeline ───────────────────────────────────────────────
        try {
          const res = await fetchWithAuth(`${API_URL}/api/pipelines`, {
            method: 'POST',
            body: JSON.stringify({ name, nodes, edges }),
          });

          // Fallback to localStorage on 503
          if (res.status === 503) {
            const localPipe = localPipelines.save(name, nodes, edges);
            setActivePipeline(localPipe.id, name);
            updateLastSavedSnapshot();
            setSaveStatus('saved');
            onPipelineSaved?.();
            return;
          }

          if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);

          const saved = await res.json() as { id: string };
          setActivePipeline(saved.id, name);
          updateLastSavedSnapshot();
          setSaveStatus('saved');
        } catch (apiErr) {
          // Fallback to localStorage on any API error
          console.warn('[Topbar] API error, falling back to localStorage:', apiErr);
          const localPipe = localPipelines.save(name, nodes, edges);
          setActivePipeline(localPipe.id, name);
          updateLastSavedSnapshot();
          setSaveStatus('saved');
        }
      }
      onPipelineSaved?.();
    } catch (err) {
      console.error('[Topbar] Save failed:', err);
      setSaveStatus('error');
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

    // 🔴 DEMO MODE: Use mock pipeline directly - NO BACKEND REQUIRED
    if (DEMO_MODE) {
      console.log('[Topbar] DEMO MODE: Generating pipeline from mock data:', intent);
      const mockData = getMockPipeline(intent);
      const normalized = normalizePipeline(mockData);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage,
      });

      // Add contextual copilot message
      const contextMessages = getMockCopilotMessages('pipeline-generated');
      if (contextMessages.length > 0) {
        setTimeout(() => {
          addCopilotMessage({
            role: 'claude',
            text: contextMessages[0],
          });
        }, 500);
      }

      setIsGenerating(false);
      return;
    }

    // Real mode: Try backend, fallback to mock on error
    try {
      const result: any = await apiClient.generatePipeline(intent);
      const normalized = normalizePipeline(result);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage,
      });
    } catch (error) {
      console.error('[Topbar] Pipeline generation failed, using mock fallback:', error);
      // FAIL-SAFE: Use mock pipeline as fallback
      const mockData = getMockPipeline(intent);
      const normalized = normalizePipeline(mockData);

      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      addCopilotMessage({
        role: 'claude',
        text: normalized.copilotMessage + ' (Demo mode fallback)',
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
    <>
    {/* Save Modal */}
    {showSaveModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
      >
        <div
          style={{
            width: '400px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Modal header */}
          <div
            style={{
              padding: '20px 24px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>💾</span>
                Save Pipeline
              </div>
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: activePipelineId ? '#10b981' : 'var(--text-muted)',
                }}
              >
                {activePipelineId ? `Updating: ${activePipelineName ?? 'existing pipeline'}` : 'Saving as new pipeline'}
              </div>
            </div>
            <button
              onClick={() => setShowSaveModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '22px',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '2px 6px',
                borderRadius: '6px',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ×
            </button>
          </div>

          {/* Modal body */}
          <div style={{ padding: '20px 24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Pipeline Name
            </label>
            <input
              type="text"
              autoFocus
              value={saveModalName}
              onChange={(e) => setSaveModalName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSubmit(); if (e.key === 'Escape') setShowSaveModal(false); }}
              placeholder="My Pipeline"
              style={{
                width: '100%',
                height: '42px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0 14px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>

          {/* Modal footer */}
          <div
            style={{
              padding: '0 24px 20px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={() => setShowSaveModal(false)}
              style={{
                height: '38px',
                padding: '0 18px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubmit}
              style={{
                height: '38px',
                padding: '0 22px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
            >
              {activePipelineId ? 'Update Pipeline' : 'Save Pipeline'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div
      style={{
        height: '72px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        boxShadow: '0 1px 20px rgba(99, 102, 241, 0.08)',
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
        <div style={{ flex: 1 }}>
          <input
            data-tour="intent-box"
            type="text"
            placeholder="Describe what you want to build..."
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            style={{
              width: '100%',
              height: '40px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0 16px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              opacity: 0.6,
              letterSpacing: '0.02em',
            }}
          >
            Press Enter to generate · Ctrl+Z to undo
          </div>
        </div>
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
            fontWeight: 600,
            cursor: isGenerating || !intent.trim() ? 'not-allowed' : 'pointer',
            opacity: isGenerating || !intent.trim() ? 0.9 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            transition: 'all 0.3s ease',
            animation: isGenerating ? 'shimmer 2s linear infinite' : 'none',
            backgroundImage: isGenerating
              ? 'linear-gradient(90deg, var(--accent), #7c7ff1, var(--accent))'
              : 'none',
            backgroundSize: '200% 100%',
            boxShadow: isGenerating ? '0 0 16px rgba(99, 102, 241, 0.5)' : 'none',
          }}
        >
          {isGenerating ? '⚡ Generating...' : '✨ Generate Pipeline'}
        </button>
      </div>

      {/* Action Buttons - Grouped with dividers */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* GROUP 1: View Actions */}
        {onResetTour && (
          <button
            onClick={onResetTour}
            title="Restart onboarding tour"
            style={{
              height: '36px',
              width: '36px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ?
          </button>
        )}
        <button
          onClick={onDraw}
          title="Draw a pipeline sketch"
          style={{
            height: '36px',
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ✏️
        </button>
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            height: '36px',
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', opacity: 0.5, margin: '0 4px' }} />

        {/* GROUP 2: Library Actions (icon-only, smaller) */}
        <button
          onClick={onOpenPipelines}
          title="My Pipelines"
          style={{
            height: '36px',
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          📁
        </button>
        <button
          onClick={activePipelineId ? onOpenHistory : undefined}
          title={activePipelineId ? 'Execution History' : 'Load a pipeline to view history'}
          style={{
            height: '36px',
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: activePipelineId ? 'pointer' : 'default',
            opacity: activePipelineId ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'color 0.2s, background 0.2s, opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            if (activePipelineId) {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          🕐
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', opacity: 0.5, margin: '0 4px' }} />

        {/* GROUP 3: Run Action */}
        <button
          data-tour="test-run-btn"
          onClick={onTestRun}
          disabled={nodes.length === 0}
          style={{
            height: '38px',
            padding: '0 16px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.4 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (nodes.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <span style={{ fontSize: '11px' }}>▶</span>
          <span>Test Run</span>
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', opacity: 0.5, margin: '0 4px' }} />

        {/* GROUP 4: Save Actions */}
        {/* Save status badge */}
        {saveStatus !== 'idle' && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: saveStatus === 'error' ? '#f43f5e' : '#10b981',
              opacity: 0.9,
              whiteSpace: 'nowrap',
              marginRight: '4px',
            }}
          >
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'updated' && '✓ Updated'}
            {saveStatus === 'error' && '✗ Failed'}
          </span>
        )}

        {/* Save button */}
        <button
          onClick={openSaveModal}
          disabled={nodes.length === 0 || isSaving}
          style={{
            height: '38px',
            padding: '0 14px',
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

        {/* Ship It - PRIMARY CTA */}
        <button
          data-tour="ship-it-btn"
          onClick={onShipIt}
          disabled={nodes.length === 0}
          style={{
            height: '38px',
            padding: '0 18px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.5 : 1,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: nodes.length > 0 ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (nodes.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 14px rgba(99, 102, 241, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'none';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = nodes.length > 0 ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none';
          }}
        >
          <span style={{ fontSize: '14px' }}>🚀</span>
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
    </>
  );
};
