import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Node, Edge } from '@xyflow/react';
import { usePipelineStore } from '../store/pipelineStore';
import type { NodeData } from '../store/pipelineStore';
import { tutorialData } from '../data/tutorialData';

// ── Types ─────────────────────────────────────────────────────────────────────

type TooltipPos = 'below' | 'right' | 'left' | 'top-center' | 'center';

type NodeLegendItem = { icon: string; name: string; desc: string };

type SpotlightStep = {
  kind: 'spotlight';
  target: string;
  position: TooltipPos;
  heading: string;
  body: string;
  example?: string;
  legend?: NodeLegendItem[];
};

type ModalStep = { kind: 'modal'; id: 'welcome' | 'complete' };
type TourStep = SpotlightStep | ModalStep;

// ── Constants ─────────────────────────────────────────────────────────────────

const SPOT_PAD = 10; // padding around the spotlit element (px)
const TOOLTIP_W = 320; // tooltip card fixed width (px)
const TOOLTIP_GAP = 16; // gap between element edge and tooltip

const NODE_LEGEND: NodeLegendItem[] = [
  { icon: '📥', name: 'INPUT',  desc: 'Where data enters your pipeline' },
  { icon: '🧠', name: 'LLM',    desc: 'Runs Claude, GPT-4, or Gemini on your data' },
  { icon: '🔧', name: 'TOOL',   desc: 'Calls external tools: search, code, APIs' },
  { icon: '🤖', name: 'AGENT',  desc: 'Autonomous reasoning across multiple steps' },
  { icon: '🔀', name: 'ROUTER', desc: 'Branches the flow based on a condition' },
  { icon: '📤', name: 'OUTPUT', desc: 'Returns the final result to the user' },
];

const STEPS: TourStep[] = [
  { kind: 'modal', id: 'welcome' },
  {
    kind: 'spotlight',
    target: 'intent-box',
    position: 'below',
    heading: 'Start Here',
    body: 'Type what you want to build in plain English. Claude will automatically place the nodes and wire the pipeline for you.',
    example: "Try: 'Summarize customer feedback and send a report'",
  },
  {
    kind: 'spotlight',
    target: 'generate-btn',
    position: 'below',
    heading: 'Generate Pipeline',
    body: 'After describing your goal, hit this to let Claude design the full pipeline. Nodes appear on the canvas automatically.',
  },
  {
    kind: 'spotlight',
    target: 'node-sidebar',
    position: 'right',
    heading: 'Node Types',
    body: 'Prefer to build manually? Drag any node onto the canvas.',
    legend: NODE_LEGEND,
  },
  {
    kind: 'spotlight',
    target: 'templates-sidebar',
    position: 'right',
    heading: 'Starter Templates',
    body: "Not sure where to start? Click any template to instantly load a pre-built pipeline onto the canvas. Edit it however you like.",
  },
  {
    kind: 'spotlight',
    target: 'canvas-area',
    position: 'center',
    heading: 'Your Canvas',
    body: 'This is your workspace. Nodes live here. Connect them by dragging from one handle to another. Click any node to configure it.',
  },
  {
    kind: 'spotlight',
    target: 'copilot-panel',
    position: 'left',
    heading: 'Forge Copilot',
    body: 'Claude watches your pipeline as you build. Ask it questions, get suggestions, and catch problems before you run anything.',
  },
  {
    kind: 'spotlight',
    target: 'test-run-btn',
    position: 'below',
    heading: 'Test Run',
    body: 'Run your pipeline with a real input. Each node lights up green (success) or red (error) so you can debug step by step.',
  },
  {
    kind: 'spotlight',
    target: 'ship-it-btn',
    position: 'below',
    heading: 'Ship It',
    body: "When your pipeline is ready, export clean Python code you fully own. No platform lock-in. Just your code.",
  },
  { kind: 'modal', id: 'complete' },
];

const SPOTLIGHT_TOTAL = STEPS.filter((s) => s.kind === 'spotlight').length;

// ── Utility: resetTour ────────────────────────────────────────────────────────

export function resetTour(): void {
  localStorage.removeItem('forge_onboarded');
}

// ── Helper: tooltip position ──────────────────────────────────────────────────

function tooltipStyle(rect: DOMRect, pos: TooltipPos): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const base: React.CSSProperties = { position: 'fixed', width: TOOLTIP_W, zIndex: 9010 };

  switch (pos) {
    case 'below': {
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
      return { ...base, top: rect.bottom + SPOT_PAD + TOOLTIP_GAP, left };
    }
    case 'right': {
      const top = Math.max(8, Math.min(rect.top, vh - 500));
      return { ...base, left: rect.right + SPOT_PAD + TOOLTIP_GAP, top };
    }
    case 'left': {
      const left = rect.left - SPOT_PAD - TOOLTIP_GAP - TOOLTIP_W;
      const top = Math.max(8, Math.min(rect.top, vh - 400));
      return { ...base, left: Math.max(8, left), top };
    }
    case 'top-center': {
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
      // bottom = distance from viewport bottom to the bottom of the tooltip
      const bottom = vh - (rect.top - SPOT_PAD - TOOLTIP_GAP);
      return { ...base, bottom: Math.max(8, bottom), left };
    }
    case 'center': {
      // Float the tooltip inside the target, horizontally centred, vertically near the top third
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
      const top = rect.top + Math.max(24, rect.height * 0.18);
      return { ...base, top, left };
    }
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** 4-quadrant dark overlay that leaves a transparent hole around the target */
function SpotlightOverlay({ rect }: { rect: DOMRect }) {
  const rx = rect.left - SPOT_PAD;
  const ry = rect.top - SPOT_PAD;
  const rw = rect.width + SPOT_PAD * 2;
  const rh = rect.height + SPOT_PAD * 2;

  const shared: React.CSSProperties = {
    position: 'fixed',
    background: 'rgba(0,0,0,0.75)',
    zIndex: 9000,
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
  };

  return (
    <>
      {/* Top */}
      <div style={{ ...shared, top: 0, left: 0, right: 0, height: ry }} />
      {/* Bottom */}
      <div style={{ ...shared, top: ry + rh, left: 0, right: 0, bottom: 0 }} />
      {/* Left strip (middle row) */}
      <div style={{ ...shared, top: ry, left: 0, width: Math.max(0, rx), height: rh }} />
      {/* Right strip (middle row) */}
      <div style={{ ...shared, top: ry, left: rx + rw, right: 0, height: rh }} />
    </>
  );
}

/** Solid full-screen overlay for modal steps */
function FullOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(6px)',
      pointerEvents: 'none',
    }} />
  );
}

/** Cyan glow border tracking the spotlit element */
function GlowBorder({ rect }: { rect: DOMRect }) {
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9005,
        pointerEvents: 'none',
        top: rect.top - SPOT_PAD,
        left: rect.left - SPOT_PAD,
        width: rect.width + SPOT_PAD * 2,
        height: rect.height + SPOT_PAD * 2,
        borderRadius: 10,
        boxShadow: '0 0 0 3px #38bdf8, 0 0 24px rgba(56,189,248,0.45)',
        transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
      }}
    />
  );
}

/** CSS-border arrow triangles for each direction */
type ArrowProps = { pos: TooltipPos };

function Arrow({ pos }: ArrowProps) {
  const OUTER = 9;
  const INNER = 7;

  const outerBorder = (color: string): React.CSSProperties => {
    switch (pos) {
      case 'below':      return { borderLeft: `${OUTER}px solid transparent`, borderRight: `${OUTER}px solid transparent`, borderBottom: `${OUTER}px solid ${color}` };
      case 'right':      return { borderTop: `${OUTER}px solid transparent`, borderBottom: `${OUTER}px solid transparent`, borderRight: `${OUTER}px solid ${color}` };
      case 'left':       return { borderTop: `${OUTER}px solid transparent`, borderBottom: `${OUTER}px solid transparent`, borderLeft: `${OUTER}px solid ${color}` };
      case 'top-center': return { borderLeft: `${OUTER}px solid transparent`, borderRight: `${OUTER}px solid transparent`, borderTop: `${OUTER}px solid ${color}` };
    }
  };

  const innerBorder = (color: string): React.CSSProperties => {
    switch (pos) {
      case 'below':      return { borderLeft: `${INNER}px solid transparent`, borderRight: `${INNER}px solid transparent`, borderBottom: `${INNER}px solid ${color}` };
      case 'right':      return { borderTop: `${INNER}px solid transparent`, borderBottom: `${INNER}px solid transparent`, borderRight: `${INNER}px solid ${color}` };
      case 'left':       return { borderTop: `${INNER}px solid transparent`, borderBottom: `${INNER}px solid transparent`, borderLeft: `${INNER}px solid ${color}` };
      case 'top-center': return { borderLeft: `${INNER}px solid transparent`, borderRight: `${INNER}px solid transparent`, borderTop: `${INNER}px solid ${color}` };
    }
  };

  // No arrow for center-positioned tooltips (floating inside the target)
  if (pos === 'center') return null;

  const placement = (): React.CSSProperties => {
    switch (pos) {
      case 'below':      return { top: -OUTER, left: '50%', transform: 'translateX(-50%)' };
      case 'right':      return { left: -OUTER, top: '50%', transform: 'translateY(-50%)' };
      case 'left':       return { right: -OUTER, top: '50%', transform: 'translateY(-50%)' };
      case 'top-center': return { bottom: -OUTER, left: '50%', transform: 'translateX(-50%)' };
      case 'center':     return {};
    }
  };

  const innerPlacement = (): React.CSSProperties => {
    switch (pos) {
      case 'below':      return { top: -INNER + 1, left: '50%', transform: 'translateX(-50%)' };
      case 'right':      return { left: -INNER + 1, top: '50%', transform: 'translateY(-50%)' };
      case 'left':       return { right: -INNER + 1, top: '50%', transform: 'translateY(-50%)' };
      case 'top-center': return { bottom: -INNER + 1, left: '50%', transform: 'translateX(-50%)' };
      case 'center':     return {};
    }
  };

  const common: React.CSSProperties = { position: 'absolute', width: 0, height: 0 };

  return (
    <>
      <div style={{ ...common, ...placement(), ...outerBorder('var(--border)') }} />
      <div style={{ ...common, ...innerPlacement(), ...innerBorder('var(--bg-panel)') }} />
    </>
  );
}

/** Tooltip card shown during spotlight steps */
type TooltipCardProps = {
  step: SpotlightStep;
  rect: DOMRect;
  spotNum: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isFirstSpot: boolean;
};

function TooltipCard({ step, rect, spotNum, onNext, onBack, onSkip, isFirstSpot }: TooltipCardProps) {
  const style = tooltipStyle(rect, step.position);

  return (
    <div
      style={{
        ...style,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        pointerEvents: 'all',
      }}
    >
      <Arrow pos={step.position} />

      {/* Heading */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {step.heading}
      </div>

      {/* Body */}
      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-muted)', margin: '0 0 12px' }}>
        {step.body}
      </p>

      {/* Example chip */}
      {step.example && (
        <div style={{
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--accent)',
          fontStyle: 'italic',
          marginBottom: 12,
        }}>
          {step.example}
        </div>
      )}

      {/* Node legend */}
      {step.legend && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {step.legend.map((item) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 52, fontFamily: 'JetBrains Mono, monospace' }}>{item.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Nav row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <button
          onClick={onBack}
          disabled={isFirstSpot}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 6, padding: '6px 14px', fontSize: 12,
            color: isFirstSpot ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: isFirstSpot ? 'not-allowed' : 'pointer', opacity: isFirstSpot ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Step {spotNum} of {SPOTLIGHT_TOTAL}
        </span>

        <button
          onClick={onNext}
          style={{
            background: 'var(--accent)', border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}
        >
          Next →
        </button>
      </div>

      {/* Skip link */}
      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent', border: 'none', fontSize: 11,
            color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline',
            padding: 0,
          }}
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}

/** Full-screen welcome modal (step 0) */
type WelcomeModalProps = { onStart: () => void; onSkip: () => void };

function WelcomeModal({ onStart, onSkip }: WelcomeModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9010,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 460,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        pointerEvents: 'all',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, margin: '0 0 10px', color: 'var(--text-primary)' }}>
          Welcome to Forge
        </h1>
        <p style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 500, margin: '0 0 16px' }}>
          Build AI pipelines by describing what you want — Claude designs it for you.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 32px' }}>
          Click through this quick tour to see what each part of the screen does.
          Takes less than a minute.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onSkip}
            style={{
              flex: 1, height: 44, background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            Skip
          </button>
          <button
            onClick={onStart}
            style={{
              flex: 2, height: 44, background: 'var(--accent)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Show Me Around →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Completion modal with template quick-launch cards */
type CompleteModalProps = {
  onLoadTemplate: (nodes: Node<NodeData>[], edges: Edge[], message: string) => void;
  onScratch: () => void;
};

function CompleteModal({ onLoadTemplate, onScratch }: CompleteModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9010,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 560,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        pointerEvents: 'all',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚡</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            You're ready to build
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Start by describing your pipeline above, or load a template from the sidebar.
          </p>
        </div>

        {/* Template cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {tutorialData.templates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                  {tpl.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {tpl.description.slice(0, 90)}{tpl.description.length > 90 ? '…' : ''}
                </div>
              </div>
              <button
                onClick={() => onLoadTemplate(tpl.pipelineNodes, tpl.pipelineEdges, `Loaded template: ${tpl.name}. Click any node to configure it.`)}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px',
                  background: 'var(--accent)', border: 'none',
                  borderRadius: 7, color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Load Template →
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onScratch}
          style={{
            width: '100%', height: 42,
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-muted)', fontSize: 13,
            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          Start from Scratch
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type OnboardingTourProps = { onComplete: () => void };

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { loadTemplate } = usePipelineStore();

  const current = STEPS[stepIdx];

  // Read/update the target element rect whenever the step changes
  useEffect(() => {
    if (current.kind !== 'spotlight') {
      setTargetRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [stepIdx, current]);

  const handleComplete = () => {
    localStorage.setItem('forge_onboarded', 'true');
    onComplete();
  };

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else handleComplete();
  };

  const handleBack = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  // Which spotlight step number is this? (1-based, counts only spotlight steps)
  const spotNum = STEPS.slice(0, stepIdx + 1).filter((s) => s.kind === 'spotlight').length;

  const portal = (
    <>
      {/* Overlay */}
      {current.kind === 'spotlight' && targetRect
        ? <SpotlightOverlay rect={targetRect} />
        : <FullOverlay />
      }

      {/* Glow border */}
      {current.kind === 'spotlight' && targetRect && (
        <GlowBorder rect={targetRect} />
      )}

      {/* Content */}
      {current.kind === 'modal' ? (
        current.id === 'welcome' ? (
          <WelcomeModal onStart={handleNext} onSkip={handleComplete} />
        ) : (
          <CompleteModal
            onLoadTemplate={(nodes, edges, msg) => {
              loadTemplate(nodes, edges, msg);
              handleComplete();
            }}
            onScratch={handleComplete}
          />
        )
      ) : current.kind === 'spotlight' && targetRect ? (
        <TooltipCard
          step={current}
          rect={targetRect}
          spotNum={spotNum}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleComplete}
          isFirstSpot={spotNum === 1}
        />
      ) : null}
    </>
  );

  return ReactDOM.createPortal(portal, document.body);
};
