import { useRef, useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { apiClient } from '../lib/apiClient';
import { usePipelineStore } from '../store/pipelineStore';
import type { NodeData } from '../store/pipelineStore';

type DrawingTool = 'pen' | 'eraser';
type Phase = 'drawing' | 'interpreting' | 'feedback' | 'refining';

const PEN_COLORS = ['#f1f5f9', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#38bdf8'];
const CANVAS_W = 900;
const CANVAS_H = 480;

export const DrawingCanvasModal = ({ onClose }: { onClose: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#f1f5f9');
  const [brushSize, setBrushSize] = useState(3);
  const [phase, setPhase] = useState<Phase>('drawing');
  const [interpretation, setInterpretation] = useState('');
  const [pendingNodes, setPendingNodes] = useState<Node<NodeData>[]>([]);
  const [pendingEdges, setPendingEdges] = useState<Edge[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { setNodes, setEdges, addCopilotMessage } = usePipelineStore();

  const saveSnapshot = (ctx: CanvasRenderingContext2D) => {
    history.current = [
      ...history.current.slice(-29),
      ctx.getImageData(0, 0, CANVAS_W, CANVAS_H),
    ];
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    saveSnapshot(ctx);
  // saveSnapshot is stable (doesn't capture reactive values) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'drawing') return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getCanvasPos(e);
    isDrawingRef.current = true;
    lastPos.current = pos;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? 20 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#0f172a' : color;
    ctx.fill();
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPos.current || phase !== 'drawing') return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const onMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPos.current = null;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) saveSnapshot(ctx);
    }
  };

  const undo = () => {
    if (history.current.length <= 1) return;
    history.current = history.current.slice(0, -1);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(history.current[history.current.length - 1], 0, 0);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    history.current = [];
    saveSnapshot(ctx);
  };

  const getImageBase64 = () =>
    canvasRef.current!.toDataURL('image/png').split(',')[1];

  const interpret = async (feedback?: string) => {
    setErrorMsg('');
    setPhase('interpreting');
    try {
      const result = await apiClient.interpretSketch(getImageBase64(), feedback);
      setInterpretation(result.interpretation);
      setPendingNodes(result.nodes);
      setPendingEdges(result.edges);
      setPhase('feedback');
    } catch {
      setErrorMsg('Interpretation failed. Please try again.');
      setPhase('drawing');
    }
  };

  const applyPipeline = () => {
    setNodes(pendingNodes);
    setEdges(pendingEdges);
    addCopilotMessage({
      role: 'claude',
      text: `Pipeline built from your sketch: ${interpretation}`,
    });
    onClose();
  };

  const submitRefinement = () => {
    if (!feedbackText.trim()) return;
    const fb = feedbackText;
    setFeedbackText('');
    interpret(fb);
  };

  const btnBase: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace',
    border: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '960px',
          maxWidth: '96vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>✏️</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 600 }}>
              Sketch Your Pipeline
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Draw boxes for nodes, arrows for connections — Claude will interpret your sketch
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '22px',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', background: '#0f172a', lineHeight: 0, flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: '100%',
              display: 'block',
              cursor:
                phase !== 'drawing'
                  ? 'default'
                  : tool === 'eraser'
                  ? 'cell'
                  : 'crosshair',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />

          {/* Interpreting overlay */}
          {phase === 'interpreting' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid var(--accent)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'pf-spin 0.8s linear infinite',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Claude is reading your drawing...
              </span>
            </div>
          )}
        </div>

        {/* Drawing toolbar */}
        {phase === 'drawing' && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            {/* Color swatches */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool('pen'); }}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c && tool === 'pen' ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* Brush size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Size {brushSize}px
              </span>
              <input
                type="range"
                min={1}
                max={14}
                value={brushSize}
                onChange={(e) => setBrushSize(+e.target.value)}
                style={{ width: '72px', accentColor: 'var(--accent)' }}
              />
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

            <button
              onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
              style={{
                ...btnBase,
                background: tool === 'eraser' ? 'var(--accent)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {tool === 'eraser' ? '✏️ Pen' : '⬜ Eraser'}
            </button>

            <button
              onClick={undo}
              style={{ ...btnBase, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              ↩ Undo
            </button>

            <button
              onClick={clearCanvas}
              style={{ ...btnBase, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Clear
            </button>

            {errorMsg && (
              <span style={{ color: '#f87171', fontSize: '13px' }}>{errorMsg}</span>
            )}

            <div style={{ flex: 1 }} />

            <button
              onClick={() => interpret()}
              style={{
                ...btnBase,
                padding: '8px 24px',
                background: 'var(--accent)',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              ⚡ Interpret Drawing
            </button>
          </div>
        )}

        {/* Feedback / Refining panel */}
        {(phase === 'feedback' || phase === 'refining') && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(99,102,241,0.04)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px', marginTop: '2px', flexShrink: 0 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Claude interpreted your sketch as:
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    padding: '10px 14px',
                    background: 'rgba(99,102,241,0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.25)',
                    marginBottom: '14px',
                  }}
                >
                  {interpretation}
                </div>

                {/* Refinement input */}
                {phase === 'refining' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. 'Add a router between LLM and output' or 'The third box is a tool node, not LLM'"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitRefinement()}
                      style={{
                        flex: 1,
                        height: '38px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--accent)',
                        borderRadius: '6px',
                        padding: '0 12px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'JetBrains Mono, monospace',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={submitRefinement}
                      disabled={!feedbackText.trim()}
                      style={{
                        ...btnBase,
                        padding: '0 16px',
                        height: '38px',
                        background: 'var(--accent)',
                        color: 'white',
                        opacity: feedbackText.trim() ? 1 : 0.5,
                        cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Re-interpret →
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={applyPipeline}
                    style={{
                      ...btnBase,
                      padding: '8px 20px',
                      background: 'var(--accent)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    ✓ Yes, build this pipeline
                  </button>

                  {phase === 'feedback' && (
                    <button
                      onClick={() => setPhase('refining')}
                      style={{
                        ...btnBase,
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                      }}
                    >
                      Refine it...
                    </button>
                  )}
                  {phase === 'refining' && (
                    <button
                      onClick={() => setPhase('feedback')}
                      style={{
                        ...btnBase,
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setPhase('drawing');
                      setInterpretation('');
                    }}
                    style={{
                      ...btnBase,
                      padding: '8px 16px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ↩ Draw again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pf-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
