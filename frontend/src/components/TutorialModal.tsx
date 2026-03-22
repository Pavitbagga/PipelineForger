import { useState } from 'react';
import { tutorialData, type TutorialTemplate } from '../data/tutorialData';
import { usePipelineStore } from '../store/pipelineStore';

type Section = 'welcome' | 'nodes' | 'build' | 'templates' | 'tips';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'welcome', label: 'Welcome', icon: '👋' },
  { id: 'nodes', label: 'Node Types', icon: '🧱' },
  { id: 'build', label: 'First Pipeline', icon: '⚡' },
  { id: 'templates', label: 'Templates', icon: '📦' },
  { id: 'tips', label: 'Tips & Mistakes', icon: '💡' },
];

type Props = {
  onClose: () => void;
};

export const TutorialModal = ({ onClose }: Props) => {
  const [activeSection, setActiveSection] = useState<Section>('welcome');
  const { loadTemplate } = usePipelineStore();

  const handleLoadTemplate = (template: TutorialTemplate) => {
    loadTemplate(
      template.pipelineNodes,
      template.pipelineEdges,
      `Loaded template: ${template.name}. Click any node to configure it, then hit Test Run.`
    );
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '32px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          height: '82vh',
          maxHeight: '680px',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: '200px',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            background: 'var(--bg-base)',
          }}
        >
          {/* Logo area */}
          <div
            style={{
              padding: '24px 20px 20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              Forge Guide
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Getting started
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeSection === s.id ? 600 : 400,
                  background: activeSection === s.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: activeSection === s.id ? 'var(--accent)' : 'var(--text-muted)',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== s.id) {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== s.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          {/* Close */}
          <div style={{ padding: '16px 8px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
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
              Skip for now
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              padding: '24px 32px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexShrink: 0,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '22px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {SECTIONS.find((s) => s.id === activeSection)?.icon}{' '}
                {activeSection === 'welcome'
                  ? tutorialData.title
                  : SECTIONS.find((s) => s.id === activeSection)?.label}
              </h1>
              {activeSection === 'welcome' && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {tutorialData.subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {activeSection === 'welcome' && <WelcomeSection onNavigate={setActiveSection} />}
            {activeSection === 'nodes' && <NodesSection />}
            {activeSection === 'build' && <BuildSection />}
            {activeSection === 'templates' && <TemplatesSection onLoad={handleLoadTemplate} />}
            {activeSection === 'tips' && <TipsSection />}
          </div>

          {/* Footer nav */}
          <div
            style={{
              padding: '16px 32px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
              }}
              disabled={activeSection === SECTIONS[0].id}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: activeSection === SECTIONS[0].id ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '13px',
                cursor: activeSection === SECTIONS[0].id ? 'default' : 'pointer',
                opacity: activeSection === SECTIONS[0].id ? 0.4 : 1,
              }}
            >
              ← Back
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    width: activeSection === s.id ? '20px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: activeSection === s.id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            {activeSection === SECTIONS[SECTIONS.length - 1].id ? (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Building →
              </button>
            ) : (
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                  setActiveSection(SECTIONS[idx + 1].id);
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Section components ──────────────────────────────────────────────────────

function WelcomeSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
        {tutorialData.intro}
      </p>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            margin: '0 0 10px',
            color: 'var(--text-primary)',
          }}
        >
          {tutorialData.howItWorks.heading}
        </h3>
        <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)', margin: '0 0 12px' }}>
          {tutorialData.howItWorks.explanation}
        </p>
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          {tutorialData.howItWorks.analogy}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { icon: '📝', label: 'Describe', desc: 'Type what you want to build' },
          { icon: '⚡', label: 'Generate', desc: 'Forge builds the pipeline' },
          { icon: '🚀', label: 'Run & Ship', desc: 'Test it, then export as code' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onNavigate('nodes')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Learn the node types →
        </button>
        <button
          onClick={() => onNavigate('templates')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Load a starter template →
        </button>
      </div>
    </div>
  );
}

function NodesSection() {
  const [activeNode, setActiveNode] = useState(tutorialData.nodes[0].id);
  const node = tutorialData.nodes.find((n) => n.id === activeNode)!;

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* Node list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, width: '150px' }}>
        {tutorialData.nodes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveNode(n.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: activeNode === n.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeNode === n.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
              color: activeNode === n.id ? 'var(--accent)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: activeNode === n.id ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span>{n.icon}</span>
            <span>{n.name}</span>
          </button>
        ))}
      </div>

      {/* Node detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px' }}>{node.icon}</span>
            <div>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {node.name}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>
                {node.tagline}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
            {node.description}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            When to use it
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
            {node.whenToUse}
          </p>
        </div>

        <div
          style={{
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Example
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 10px' }}>
            {node.example.scenario}
          </p>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              color: 'var(--accent)',
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 12px',
              letterSpacing: '0.5px',
            }}
          >
            {node.example.pipeline}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildSection() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
          {tutorialData.firstPipeline.heading}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
          Goal: {tutorialData.firstPipeline.goal}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tutorialData.firstPipeline.steps.map((step) => (
          <div
            key={step.step}
            onClick={() => toggleStep(step.step)}
            style={{
              background: completedSteps.has(step.step) ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-card)',
              border: completedSteps.has(step.step) ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: completedSteps.has(step.step) ? 'var(--accent)' : 'var(--bg-base)',
                  border: completedSteps.has(step.step) ? 'none' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: completedSteps.has(step.step) ? 'white' : 'var(--text-muted)',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {completedSteps.has(step.step) ? '✓' : step.step}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    textDecoration: completedSteps.has(step.step) ? 'line-through' : 'none',
                    opacity: completedSteps.has(step.step) ? 0.6 : 1,
                  }}
                >
                  {step.title}
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text-muted)',
                    margin: 0,
                    opacity: completedSteps.has(step.step) ? 0.5 : 1,
                  }}
                >
                  {step.description}
                </p>
                {step.tip && !completedSteps.has(step.step) && (
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: 'var(--accent)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    💡 {step.tip}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {completedSteps.size === tutorialData.firstPipeline.steps.length && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '14px',
            color: '#10b981',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          You built your first pipeline. Now try adding a Tool node before the LLM.
        </div>
      )}
    </div>
  );
}

function TemplatesSection({ onLoad }: { onLoad: (t: TutorialTemplate) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        Load a template to start with a working pipeline. You can customize any node after loading.
      </p>
      {tutorialData.templates.map((tpl) => (
        <div
          key={tpl.id}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                margin: '0 0 6px',
                color: 'var(--text-primary)',
              }}
            >
              {tpl.name}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.6' }}>
              {tpl.description}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tpl.nodeLabels.map((n) => (
                <span
                  key={n}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onLoad(tpl)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {tpl.ctaLabel}
          </button>
        </div>
      ))}
    </div>
  );
}

function TipsSection() {
  const [tab, setTab] = useState<'mistakes' | 'practices'>('mistakes');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-base)', borderRadius: '8px', padding: '4px' }}>
        {(['mistakes', 'practices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: tab === t ? 'var(--bg-panel)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'mistakes' ? '⚠️ Common Mistakes' : '✅ Best Practices'}
          </button>
        ))}
      </div>

      {tab === 'mistakes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tutorialData.mistakesToAvoid.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                ⚠️ {item.mistake}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: '1.6' }}>
                {item.why}
              </p>
              <div
                style={{
                  fontSize: '12px',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
              >
                Fix: {item.fix}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'practices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tutorialData.bestPractices.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {item.practice}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
                  {item.reason}
                </p>
              </div>
            </div>
          ))}

          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '16px',
              fontSize: '13px',
              lineHeight: '1.7',
              color: 'var(--accent)',
              fontStyle: 'italic',
            }}
          >
            {tutorialData.finalTip}
          </div>
        </div>
      )}
    </div>
  );
}
