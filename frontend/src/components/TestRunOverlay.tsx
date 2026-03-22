import { useState, useEffect, useRef } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { runPipelineFromCanvas } from '../lib/engineApi';
import type { StepEvent, ExecutionResult, EngineNode, EngineEdge, NodeConfig } from '../types/engine';
// ADD THIS: shared defaults — used as fallback for nodes without data.config
import { getDefaultConfig } from '../lib/nodeDefaults';

type TestRunOverlayProps = {
  isActive: boolean;
  onClose: () => void;
  onRunComplete?: () => void;
};

type Phase = 'input' | 'running';

const MAX_INPUT_LENGTH = 1000;

// ── Prompt injection guard ────────────────────────────────────────────────────

const INJECTION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /ignore\s+(all\s+|previous\s+|your\s+)?(instructions|rules|guidelines|system\s+prompt)/i, reason: 'Instruction override detected' },
  { pattern: /disregard\s+(all\s+|previous\s+|your\s+)?(instructions|rules|guidelines)/i, reason: 'Instruction override detected' },
  { pattern: /forget\s+(your\s+|all\s+)?(training|instructions|rules|previous)/i, reason: 'Instruction override detected' },
  { pattern: /you\s+are\s+now\s+(a\s+|an\s+)?(?!running|executing|processing)/i, reason: 'Role reassignment detected' },
  { pattern: /new\s+(system\s+)?instruction[s]?[\s:]/i, reason: 'System instruction injection detected' },
  { pattern: /\[system\]/i, reason: 'System tag injection detected' },
  { pattern: /\n\s*(human|assistant|system)\s*:/i, reason: 'Role injection pattern detected' },
  { pattern: /###\s*(instruction|system|prompt)/i, reason: 'Prompt delimiter injection detected' },
  { pattern: /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/i, reason: 'Model control token detected' },
  { pattern: /jailbreak/i, reason: 'Jailbreak attempt detected' },
];

function validateInput(input: string): string | null {
  if (!input.trim()) return 'Please enter a test prompt.';
  if (input.length > MAX_INPUT_LENGTH) return `Input must be ${MAX_INPUT_LENGTH} characters or fewer.`;
  for (const { pattern, reason } of INJECTION_PATTERNS) {
    if (pattern.test(input)) return reason;
  }
  return null;
}

function sanitizeInput(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();
}

// ── Context-aware example prompts ────────────────────────────────────────────

function generateExamples(nodes: ReturnType<typeof usePipelineStore.getState>['nodes']): string[] {
  const types = new Set(nodes.map((n) => n.type as string));
  const toolNodes  = nodes.filter((n) => n.type === 'tool');
  const agentNodes = nodes.filter((n) => n.type === 'agent');
  const llmNodes   = nodes.filter((n) => n.type === 'llm');
  const toolTypes  = toolNodes.map((n) => (n.data as Record<string, unknown>)['toolType'] as string).filter(Boolean);
  const goals      = agentNodes.map((n) => ((n.data as Record<string, unknown>)['goal'] as string) || '').filter(Boolean);
  const allPrompts = llmNodes.map((n) => ((n.data as Record<string, unknown>)['systemPrompt'] as string) || '').join(' ').toLowerCase();

  if (toolTypes.includes('search')) return [
    'What are the latest breakthroughs in quantum computing?',
    'Find recent news about renewable energy adoption in 2025',
    'Search for the most cited AI research papers this year',
  ];
  if (toolTypes.includes('code')) return [
    'Write a Python function that flattens a nested list recursively',
    'Debug this snippet: def divide(a, b): return a / b',
    'Explain how binary search works with an example implementation',
  ];
  if (toolTypes.includes('file')) return [
    'Summarise the key points from the uploaded document',
    'Extract all action items and deadlines from the meeting notes',
    'What are the main conclusions in this report?',
  ];
  if (toolTypes.includes('api')) return [
    'Fetch the current weather for San Francisco and summarise it',
    'Send a POST request with payload {"status": "active"} and parse the response',
    'Call the pricing API and return the cheapest available plan',
  ];
  if (types.has('agent')) {
    const goal = goals[0] || '';
    return [
      goal ? `Research and summarise: ${goal}` : 'Research the current state of large language models',
      goal ? `Create a step-by-step plan to: ${goal}` : 'Analyse the pros and cons of microservices architecture',
      goal ? `What are the biggest challenges in: ${goal}?` : 'Find the top 5 productivity tools for remote teams',
    ];
  }
  if (types.has('router')) return [
    'I need urgent help resetting my account password',
    'Can you explain the refund process for a subscription?',
    'What features are included in the enterprise tier?',
  ];
  if (allPrompts.match(/summar/)) return [
    'Summarise the key AI trends shaping 2025',
    'Give me a 3-bullet overview of transformer architecture',
    'Condense this into the top takeaways: "Retrieval-augmented generation combines..."',
  ];
  if (allPrompts.match(/code|program|engineer|developer/)) return [
    'How do I implement debounce in TypeScript?',
    'Write a React hook that syncs state to localStorage',
    'Explain the difference between useEffect and useLayoutEffect',
  ];
  return [
    'Explain the concept of neural networks in simple terms',
    'What are 3 evidence-based strategies for improving team productivity?',
    'Draft a concise professional email to reschedule a client meeting',
  ];
}

function describePipeline(nodes: ReturnType<typeof usePipelineStore.getState>['nodes']): string {
  const types = nodes.map((n) => n.type as string).filter((t) => t !== 'input' && t !== 'output');
  if (types.length === 0) return 'pipeline';
  const unique = [...new Set(types)];
  const labels: Record<string, string> = { llm: 'LLM', tool: 'tool', agent: 'agent', router: 'router' };
  return unique.map((t) => labels[t] ?? t).join(' → ') + ' pipeline';
}

// ── Step status badge ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<StepEvent['status'], string> = {
  pending: 'rgba(99,102,241,0.2)',
  running: 'rgba(99,102,241,0.3)',
  success: 'rgba(16,185,129,0.2)',
  error: 'rgba(244,63,94,0.2)',
  skipped: 'rgba(100,116,139,0.2)',
};
const STATUS_TEXT: Record<StepEvent['status'], string> = {
  pending: '#6366f1',
  running: '#6366f1',
  success: '#10b981',
  error: '#f43f5e',
  skipped: '#64748b',
};
const STATUS_ICON: Record<StepEvent['status'], string> = {
  pending: '○',
  running: '⟳',
  success: '✓',
  error: '✗',
  skipped: '–',
};
const NODE_TYPE_ICON: Record<string, string> = {
  input: '→',
  llm: '◈',
  tool: '⚙',
  agent: '◎',
  router: '⊕',
  output: '←',
};

// Convert store nodes/edges to EngineNode/EngineEdge format.
// ADD THIS: prefers node.data.config (injected at creation / updated by ConfigPanel)
//           and falls back to constructing config from flat data fields for nodes
//           that pre-date this fix.
function toEngineNodes(storeNodes: ReturnType<typeof usePipelineStore.getState>['nodes']): EngineNode[] {
  const modelMap: Record<string, string> = {
    'claude-sonnet': 'claude-sonnet-4-20250514',
    'gpt-4': 'gpt-4',
    'gemini-pro': 'gemini-pro',
  };
  const toolTypeMap: Record<string, string> = {
    search: 'web_search',
    code: 'code_executor',
    file: 'file_reader',
    api: 'api_caller',
  };
  return storeNodes.map((n) => {
    const data = n.data as Record<string, unknown>;

    // ADD THIS: if node already carries a backend-ready config, use it directly
    if (data['config'] != null && typeof data['config'] === 'object') {
      return {
        id: n.id,
        type: (n.type ?? 'output') as EngineNode['type'],
        position: n.position ?? { x: 0, y: 0 },
        config: data['config'] as NodeConfig,
        inputs: ['text'],
        outputs: ['text'],
        label: data['label'] as string | undefined,
      };
    }

    // Fallback: construct config from flat fields (nodes pre-dating this fix)
    let config: NodeConfig;
    switch (n.type) {
      case 'llm':
        config = {
          model: (modelMap[data['model'] as string] ?? 'claude-sonnet-4-20250514') as 'claude-sonnet-4-20250514' | 'gpt-4' | 'gemini-pro',
          systemPrompt: (data['systemPrompt'] as string) ?? 'You are a helpful assistant.',
          temperature: (data['temperature'] as number) ?? 0.7,
        };
        break;
      case 'tool':
        config = {
          toolType: (toolTypeMap[data['toolType'] as string] ?? 'web_search') as 'web_search' | 'code_executor' | 'file_reader' | 'api_caller',
          parameters: data['parameters'] as Record<string, string> | undefined,
        };
        break;
      case 'agent':
        config = {
          goal: (data['goal'] as string) ?? 'Complete the task.',
          tools: (data['availableTools'] as string[]) ?? [],
          maxSteps: (data['maxSteps'] as number) ?? 3,
          model: 'claude-sonnet-4-20250514',
        };
        break;
      case 'router':
        config = { conditions: [], defaultTarget: '' };
        break;
      case 'input':
        config = { inputType: 'text', label: (data['label'] as string) ?? 'Input' };
        break;
      case 'output':
      default:
        config = { outputType: 'text', label: (data['label'] as string) ?? 'Output' };
        break;
    }
    // Patch data.config so subsequent calls use the fast path
    data['config'] = getDefaultConfig(n.type ?? '');
    return {
      id: n.id,
      type: (n.type ?? 'output') as EngineNode['type'],
      position: n.position ?? { x: 0, y: 0 },
      config,
      inputs: ['text'],
      outputs: ['text'],
      label: data['label'] as string | undefined,
    };
  });
}

function toEngineEdges(storeEdges: ReturnType<typeof usePipelineStore.getState>['edges']): EngineEdge[] {
  return storeEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export const TestRunOverlay = ({ isActive, onClose, onRunComplete }: TestRunOverlayProps) => {
  const { nodes, edges, updateNode } = usePipelineStore();
  const [phase, setPhase] = useState<Phase>('input');
  const [promptInput, setPromptInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [confirmedInput, setConfirmedInput] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const examples = generateExamples(nodes);
  const pipelineLabel = describePipeline(nodes);

  useEffect(() => {
    if (isActive) {
      setPhase('input');
      setPromptInput('');
      setValidationError(null);
      setSteps([]);
      setExecutionResult(null);
      setRunError(null);
      setCopied(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isActive]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const handleStart = async () => {
    const error = validateInput(promptInput);
    if (error) { setValidationError(error); return; }
    const safe = sanitizeInput(promptInput);
    setConfirmedInput(safe);
    setPhase('running');
    await runTest(safe);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleStart(); }
    if (e.key === 'Escape') onClose();
  };

  const runTest = async (input: string) => {
    setIsRunning(true);
    setSteps([]);
    setExecutionResult(null);
    setRunError(null);

    const engineNodes = toEngineNodes(nodes);
    const engineEdges = toEngineEdges(edges);

    try {
      await runPipelineFromCanvas(
        engineNodes,
        engineEdges,
        input,
        pipelineLabel,
        (step) => {
          // Update canvas node visual state
          if (step.status === 'running') {
            updateNode(step.nodeId, { status: 'running' });
          } else if (step.status === 'success') {
            updateNode(step.nodeId, { status: 'done' });
          } else if (step.status === 'error') {
            updateNode(step.nodeId, { status: 'error' });
          }
          // Update log
          setSteps((prev) => {
            const existing = prev.findIndex((s) => s.nodeId === step.nodeId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = step;
              return updated;
            }
            return [...prev, step];
          });
        },
        (result) => {
          setExecutionResult(result);
        },
        (message) => {
          setRunError(message);
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setRunError(message);
    } finally {
      setIsRunning(false);
      onRunComplete?.();
      setTimeout(() => {
        nodes.forEach((node) => updateNode(node.id, { status: 'idle' }));
      }, 2000);
    }
  };

  const handleCopyOutput = () => {
    if (!executionResult) return;
    void navigator.clipboard.writeText(executionResult.finalOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isActive) return null;

  const successCount = steps.filter((s) => s.status === 'success').length;
  const totalCount = steps.filter((s) => s.status !== 'skipped').length;

  return (
    <>
      {/* ── Phase 1: Input Dialog ── */}
      {phase === 'input' && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '12px',
              padding: '28px',
              width: '480px',
              maxWidth: '90vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Test Run
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Running your <span style={{ color: 'var(--accent)' }}>{pipelineLabel}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}
              >
                ×
              </button>
            </div>

            {/* Example prompts */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Try an example
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPromptInput(ex); setValidationError(null); textareaRef.current?.focus(); }}
                    style={{
                      background: promptInput === ex ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                      border: `1px solid ${promptInput === ex ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '6px', padding: '8px 12px',
                      color: promptInput === ex ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer', textAlign: 'left', lineHeight: '1.4',
                      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (promptInput !== ex) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={(e) => { if (promptInput !== ex) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or write your own</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <textarea
                ref={textareaRef}
                value={promptInput}
                onChange={(e) => { setPromptInput(e.target.value); if (validationError) setValidationError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Summarise the latest AI trends in 3 bullet points"
                maxLength={MAX_INPUT_LENGTH + 50}
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: `1px solid ${validationError ? 'var(--error)' : 'var(--border)'}`,
                  borderRadius: '8px', padding: '12px',
                  color: 'var(--text-primary)', fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.6',
                  resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={(e) => { if (!validationError) e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { if (!validationError) e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⌘↵ to run</div>
              <div style={{ fontSize: '11px', color: promptInput.length > MAX_INPUT_LENGTH ? 'var(--error)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {promptInput.length} / {MAX_INPUT_LENGTH}
              </div>
            </div>

            {validationError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚠</span>
                <span style={{ fontSize: '12px', color: 'var(--error)', fontFamily: 'JetBrains Mono, monospace' }}>{validationError}</span>
              </div>
            )}

            <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '6px', padding: '8px 12px', marginBottom: '20px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Inputs are validated for prompt injection before execution. Plain natural language prompts work best.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ height: '38px', padding: '0 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                Cancel
              </button>
              <button
                onClick={() => void handleStart()}
                disabled={!promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH}
                style={{
                  height: '38px', padding: '0 24px',
                  background: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 'var(--bg-card)' : 'var(--accent)',
                  border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 'not-allowed' : 'pointer',
                  opacity: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 0.5 : 1,
                  fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span>▶</span><span>Run Pipeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Execution Panel ── */}
      {phase === 'running' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: executionResult ? '420px' : '300px',
            background: 'var(--bg-panel)',
            borderTop: '2px solid var(--accent)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
            transition: 'height 0.3s ease',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isRunning ? 'var(--accent)' : executionResult ? '#10b981' : '#f43f5e',
                animation: isRunning ? 'pulse 1.5s infinite' : 'none',
              }} />
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 600 }}>
                {isRunning ? 'Running...' : executionResult ? `Done — ${successCount}/${totalCount} steps` : 'Error'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{confirmedInput}"
              </div>
              {executionResult && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(executionResult.totalDurationMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isRunning}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: '20px', padding: '4px', lineHeight: 1, opacity: isRunning ? 0.3 : 1 }}
            >
              ×
            </button>
          </div>

          {/* Body: step log + output */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Step log */}
            <div style={{ flex: '0 0 50%', overflowY: 'auto', padding: '12px 16px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {steps.length === 0 && isRunning && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Initializing…
                </div>
              )}
              {steps.map((step) => (
                <div
                  key={step.nodeId}
                  onClick={() => setExpandedStep(expandedStep === step.nodeId ? null : step.nodeId)}
                  style={{
                    borderRadius: '6px',
                    border: `1px solid ${STATUS_COLORS[step.status]}`,
                    background: STATUS_COLORS[step.status],
                    padding: '8px 10px',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {/* Step row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: STATUS_TEXT[step.status], fontWeight: 700, width: '14px', textAlign: 'center' }}>
                      {STATUS_ICON[step.status]}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '14px', textAlign: 'center' }}>
                      {NODE_TYPE_ICON[step.nodeType] ?? '?'}
                    </span>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {step.nodeId}
                    </span>
                    <span style={{ fontSize: '10px', color: STATUS_TEXT[step.status], background: STATUS_COLORS[step.status], padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {step.status}
                    </span>
                    {step.durationMs !== undefined && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {step.durationMs}ms
                      </span>
                    )}
                  </div>
                  {/* Expanded detail */}
                  {expandedStep === step.nodeId && (
                    <div style={{ marginTop: '8px', borderTop: `1px solid ${STATUS_COLORS[step.status]}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {step.input !== undefined && (
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Input</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5', maxHeight: '60px', overflowY: 'auto' }}>
                            {step.input.slice(0, 300)}{step.input.length > 300 ? '…' : ''}
                          </div>
                        </div>
                      )}
                      {(step.output ?? step.error) && (
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {step.error ? 'Error' : 'Output'}
                          </div>
                          <div style={{ fontSize: '11px', color: step.error ? '#f43f5e' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5', maxHeight: '60px', overflowY: 'auto' }}>
                            {(step.output ?? step.error ?? '').slice(0, 300)}{((step.output ?? step.error ?? '').length > 300) ? '…' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {runError && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', fontSize: '12px', color: '#f43f5e', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                  {runError}
                </div>
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Final output */}
            <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Final Output
                </span>
                {executionResult && (
                  <button
                    onClick={handleCopyOutput}
                    style={{ height: '26px', padding: '0 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: copied ? '#10b981' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {executionResult ? (
                  <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.65', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {executionResult.finalOutput}
                  </pre>
                ) : isRunning ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Waiting for pipeline to complete…</div>
                ) : runError ? (
                  <div style={{ color: '#f43f5e', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{runError}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </>
  );
};
