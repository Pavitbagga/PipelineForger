import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { usePipelineStore } from '../store/pipelineStore';
import { timeAgo } from '../lib/timeAgo';
import type { StepEvent } from '../types/engine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExecutionRow = {
  id: string;
  pipeline_id: string;
  user_id: string;
  input: string | null;
  final_output: string | null;
  status: 'success' | 'error' | 'partial';
  duration_ms: number | null;
  steps: StepEvent[] | null;
  created_at: string;
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      style={{
        height: '64px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.06)',
        animation: 'forge-hist-pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

// ── Status badge constants ────────────────────────────────────────────────────

const STATUS_BADGE: Record<ExecutionRow['status'], { dot: string; label: string }> = {
  success: { dot: '#10b981', label: 'Success' },
  error:   { dot: '#f43f5e', label: 'Failed'  },
  partial: { dot: '#f59e0b', label: 'Partial' },
};

const STEP_STATUS_COLOR: Record<string, string> = {
  success: '#10b981',
  error:   '#f43f5e',
  skipped: '#64748b',
  running: '#6366f1',
  pending: '#6366f1',
};

// ── ExecutionCard ─────────────────────────────────────────────────────────────

function ExecutionCard({ row }: { row: ExecutionRow }) {
  const [expanded, setExpanded] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const badge = STATUS_BADGE[row.status];
  const duration =
    row.duration_ms !== null
      ? row.duration_ms >= 1000
        ? `⏱ ${(row.duration_ms / 1000).toFixed(1)}s`
        : `⏱ ${row.duration_ms}ms`
      : null;
  const inputPreview =
    (row.input ?? '').slice(0, 60) + ((row.input ?? '').length > 60 ? '…' : '');
  const stepCount = row.steps?.length ?? 0;

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => setExpanded((v) => !v)}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Always-visible summary */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {/* Top row: status + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: badge.dot,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: badge.dot,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {badge.label}
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {timeAgo(row.created_at)}
          </span>
        </div>

        {/* Middle row: input preview */}
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {inputPreview || '(no input)'}
        </div>

        {/* Bottom row: duration + step count */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {duration && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {duration}
            </span>
          )}
          {stepCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {stepCount} steps
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--bg-card)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.input && (
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Input
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  lineHeight: 1.55,
                  background: 'var(--bg-base)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {row.input}
              </div>
            </div>
          )}

          {row.final_output && (
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Final Output
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  lineHeight: 1.55,
                  background: 'var(--bg-base)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {row.final_output}
              </div>
            </div>
          )}

          {row.steps && row.steps.length > 0 && (
            <div>
              <button
                onClick={() => setStepsExpanded((v) => !v)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Steps ({row.steps.length})
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {stepsExpanded ? '▲' : '▼'}
                </span>
              </button>

              {stepsExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {row.steps.map((step) => (
                    <div
                      key={step.nodeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-base)',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <span
                        style={{
                          color: STEP_STATUS_COLOR[step.status] ?? 'var(--text-muted)',
                          fontWeight: 700,
                          width: '10px',
                          flexShrink: 0,
                        }}
                      >
                        {step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : step.status === 'skipped' ? '–' : '○'}
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {step.nodeId}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>
                        {step.nodeType}
                      </span>
                      {step.durationMs !== undefined && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>
                          {step.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  refreshTrigger?: number;
  onOpenPipelines?: () => void;
};

export const ExecutionHistoryPanel = ({ onClose, refreshTrigger, onOpenPipelines }: Props) => {
  const activePipelineId   = usePipelineStore((s) => s.activePipelineId);
  const activePipelineName = usePipelineStore((s) => s.activePipelineName);

  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [visible, setVisible]       = useState(false);

  // Slide-in
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fetch whenever pipeline or trigger changes
  useEffect(() => {
    if (!activePipelineId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(
          `${API_URL}/api/engine/${activePipelineId}/executions`
        );
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}${body ? ` — ${body}` : ''}`);
        }
        const data = (await res.json()) as ExecutionRow[];
        if (!cancelled) setExecutions(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [activePipelineId, refreshTrigger, retryCount]);

  return (
    <>
      <style>{`
        @keyframes forge-hist-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>🕐</span>
              Execution History
            </div>
            {activePipelineName && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginTop: '2px',
                }}
              >
                {activePipelineName}
              </div>
            )}
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── No pipeline loaded ─────────────────────────────────────── */}
          {!activePipelineId && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '32px', lineHeight: 1 }}>🕐</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No pipeline loaded
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  maxWidth: '240px',
                }}
              >
                Load a saved pipeline from My Pipelines to view its execution history.
              </div>
              {onOpenPipelines && (
                <button
                  onClick={() => { onClose(); onOpenPipelines(); }}
                  style={{
                    marginTop: '4px',
                    height: '36px',
                    padding: '0 18px',
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
                  Open My Pipelines
                </button>
              )}
            </div>
          )}

          {/* ── Loading skeletons ─────────────────────────────────────── */}
          {activePipelineId && loading && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* ── Error state ──────────────────────────────────────────── */}
          {activePipelineId && !loading && error && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '24px', lineHeight: 1 }}>⚠️</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                Couldn't load history
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  wordBreak: 'break-word',
                  maxWidth: '260px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
              <button
                onClick={() => setRetryCount((n) => n + 1)}
                style={{
                  marginTop: '8px',
                  height: '32px',
                  padding: '0 16px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
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
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────────── */}
          {activePipelineId && !loading && !error && executions.length === 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                textAlign: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '32px', color: 'var(--text-muted)', lineHeight: 1 }}>▶</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                No executions yet
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '220px' }}>
                Run your pipeline to see execution history here.
              </div>
            </div>
          )}

          {/* ── Execution list ───────────────────────────────────────── */}
          {activePipelineId && !loading && !error && executions.length > 0 && (
            <div style={{ flex: 1 }}>
              {executions.map((row) => (
                <ExecutionCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {activePipelineId && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Last 20 executions · Linked to this pipeline
            </p>
          </div>
        )}
      </div>
    </>
  );
};
