import { useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../store/pipelineStore';
import { usePipelineStore } from '../store/pipelineStore';
import { fetchWithAuth } from '../lib/api';
import type { SavedPipeline } from '../types/pipeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ height: '14px', width: '65%', borderRadius: '4px', background: 'var(--bg-base)', animation: 'forge-pulse 1.4s ease-in-out infinite' }} />
      <div style={{ height: '11px', width: '40%', borderRadius: '4px', background: 'var(--bg-base)', animation: 'forge-pulse 1.4s ease-in-out infinite 0.2s' }} />
    </div>
  );
}

// ── Pipeline card ──────────────────────────────────────────────────────────────

type CardState = 'idle' | 'confirm-load' | 'confirm-delete' | 'deleting';

type PipelineCardProps = {
  pipeline: SavedPipeline;
  onLoad: (p: SavedPipeline) => void;
  onDelete: (id: string) => Promise<void>;
};

function PipelineCard({ pipeline, onLoad, onDelete }: PipelineCardProps) {
  const [state, setState] = useState<CardState>('idle');
  const [deleteError, setDeleteError] = useState(false);

  const formattedDate = new Date(pipeline.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDeleteConfirm = async () => {
    setState('deleting');
    setDeleteError(false);
    try {
      await onDelete(pipeline.id);
    } catch {
      setDeleteError(true);
      setState('idle');
    }
  };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: state !== 'idle' ? 'var(--bg-base)' : 'var(--bg-card)',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        if (state === 'idle') e.currentTarget.style.background = 'var(--bg-base)';
      }}
      onMouseLeave={(e) => {
        if (state === 'idle') e.currentTarget.style.background = 'var(--bg-card)';
      }}
    >
      {/* Top row — name + action buttons */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '3px',
            }}
          >
            {pipeline.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {formattedDate}
          </div>
        </div>

        {state === 'idle' && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setState('confirm-load')}
              style={actionBtnStyle('accent')}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Load
            </button>
            <button
              onClick={() => setState('confirm-delete')}
              style={actionBtnStyle('danger')}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Confirm load */}
      {state === 'confirm-load' && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
            This will replace your current canvas. Continue?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onLoad(pipeline)}
              style={confirmBtnStyle('accent')}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Yes, Load
            </button>
            <button
              onClick={() => setState('idle')}
              style={confirmBtnStyle('ghost')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {(state === 'confirm-delete' || state === 'deleting') && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Delete this pipeline? This cannot be undone.
          </p>
          {deleteError && (
            <p style={{ fontSize: '11px', color: '#f43f5e', margin: '0 0 8px' }}>
              Failed to delete. Please try again.
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDeleteConfirm}
              disabled={state === 'deleting'}
              style={confirmBtnStyle('danger')}
              onMouseEnter={(e) => { if (state !== 'deleting') e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {state === 'deleting' ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setState('idle')}
              disabled={state === 'deleting'}
              style={confirmBtnStyle('ghost')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Button style helpers ───────────────────────────────────────────────────────

function actionBtnStyle(variant: 'accent' | 'danger'): React.CSSProperties {
  return {
    height: '28px',
    padding: '0 10px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: variant === 'accent' ? 'var(--accent)' : 'rgba(244,63,94,0.15)',
    color: variant === 'accent' ? '#fff' : '#f43f5e',
    fontFamily: 'JetBrains Mono, monospace',
    transition: 'opacity 0.15s',
  };
}

function confirmBtnStyle(variant: 'accent' | 'danger' | 'ghost'): React.CSSProperties {
  if (variant === 'ghost') {
    return {
      height: '30px',
      padding: '0 12px',
      borderRadius: '6px',
      border: '1px solid var(--border)',
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--text-muted)',
      fontFamily: 'JetBrains Mono, monospace',
      transition: 'border-color 0.15s',
    };
  }
  return {
    height: '30px',
    padding: '0 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: variant === 'danger' ? '#f43f5e' : 'var(--accent)',
    color: '#fff',
    fontFamily: 'JetBrains Mono, monospace',
    transition: 'opacity 0.15s',
  };
}

// ── Panel ──────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  refreshTrigger: number;
  onPipelineLoaded: () => void;
};

export const SavedPipelinesPanel = ({ onClose, refreshTrigger, onPipelineLoaded }: Props) => {
  const [pipelines, setPipelines] = useState<SavedPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const { setNodes, setEdges, setActivePipeline } = usePipelineStore();

  // Slide-in animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fetch pipelines whenever panel opens or refreshTrigger increments
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`${API_URL}/api/pipelines`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SavedPipeline[];
        if (!cancelled) setPipelines(data);
      } catch (err) {
        if (!cancelled) setError('Failed to load pipelines.');
        console.error('[SavedPipelinesPanel] fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const handleLoad = (pipeline: SavedPipeline) => {
    setNodes(pipeline.nodes as unknown as Node<NodeData>[]);
    setEdges(pipeline.edges as unknown as Edge[]);
    setActivePipeline(pipeline.id, pipeline.name);
    onPipelineLoaded();
    onClose();
  };

  const handleDelete = async (id: string) => {
    // Optimistic removal
    const prev = pipelines;
    setPipelines((ps) => ps.filter((p) => p.id !== id));
    try {
      const res = await fetchWithAuth(`${API_URL}/api/pipelines/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Revert and re-throw so the card can show an error
      setPipelines(prev);
      throw err;
    }
  };

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes forge-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          bottom: 0,
          width: '320px',
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(-320px)',
          transition: 'transform 250ms ease',
          boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>📁</span>
            My Pipelines
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '20px',
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

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
              <p style={{ fontSize: '13px', color: '#f43f5e', marginBottom: '12px' }}>{error}</p>
              <button
                onClick={() => {
                  // Force re-fetch by re-running the effect manually
                  setLoading(true);
                  setError(null);
                  fetchWithAuth(`${API_URL}/api/pipelines`)
                    .then((r) => r.json() as Promise<SavedPipeline[]>)
                    .then(setPipelines)
                    .catch(() => setError('Failed to load pipelines.'))
                    .finally(() => setLoading(false));
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && pipelines.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6 }}>
                No saved pipelines yet.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7, lineHeight: 1.6 }}>
                Use the Save button above to save your current pipeline.
              </p>
            </div>
          )}

          {!loading && !error && pipelines.map((p) => (
            <PipelineCard
              key={p.id}
              pipeline={p}
              onLoad={handleLoad}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
            Pipelines are saved to your account
          </p>
        </div>
      </div>
    </>
  );
};
