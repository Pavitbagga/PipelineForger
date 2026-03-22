import { useState, useEffect, useRef } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { apiClient, type RunEvent } from '../lib/apiClient';

type TestRunOverlayProps = {
  isActive: boolean;
  onClose: () => void;
};

type LogEntry = {
  nodeId: string;
  nodeName: string;
  status: 'done' | 'running' | 'error';
  output: string;
  timestamp: number;
};

type Phase = 'input' | 'running';

const MAX_INPUT_LENGTH = 1000;

// Patterns that indicate prompt injection attempts
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
  // Strip control characters (keep newlines \u000A and tabs \u0009)
  return input.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();
}

// Derive 3 context-aware example prompts from the current pipeline nodes.
function generateExamples(nodes: any[]): string[] {
  const types = new Set(nodes.map((n) => n.type as string));
  const llmNodes   = nodes.filter((n) => n.type === 'llm');
  const toolNodes  = nodes.filter((n) => n.type === 'tool');
  const agentNodes = nodes.filter((n) => n.type === 'agent');

  const toolTypes   = toolNodes.map((n) => n.data?.toolType as string).filter(Boolean);
  const goals       = agentNodes.map((n) => (n.data?.goal as string) || '').filter(Boolean);
  const allPrompts  = llmNodes.map((n) => (n.data?.systemPrompt as string) || '').join(' ').toLowerCase();

  // Tool-driven pipelines
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

  // Agent pipelines — use the goal if set
  if (types.has('agent')) {
    const goal = goals[0] || '';
    return [
      goal ? `Research and summarise: ${goal}` : 'Research the current state of large language models',
      goal ? `Create a step-by-step plan to: ${goal}` : 'Analyse the pros and cons of microservices architecture',
      goal ? `What are the biggest challenges in: ${goal}?` : 'Find the top 5 productivity tools for remote teams',
    ];
  }

  // Router pipelines — multi-path
  if (types.has('router')) return [
    'I need urgent help resetting my account password',
    'Can you explain the refund process for a subscription?',
    'What features are included in the enterprise tier?',
  ];

  // LLM-only — infer from system prompt keywords
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
  if (allPrompts.match(/support|help desk|customer/)) return [
    'My order has not arrived after 10 days — what should I do?',
    'How do I upgrade my subscription plan?',
    'I was charged twice for the same order',
  ];
  if (allPrompts.match(/translat/)) return [
    'Translate "The meeting starts at 9 AM" into French, Spanish, and Japanese',
    'What does "Weltanschauung" mean in English?',
    'Translate this email to formal Portuguese: "Hi, I need to reschedule our call"',
  ];
  if (allPrompts.match(/review|analyz|evaluat|audit/)) return [
    'Review this function: const add = (a, b) => a + b; — suggest improvements',
    'Analyse the trade-offs between REST and GraphQL for a mobile app',
    'Evaluate this startup idea: a subscription box for artisan coffee',
  ];

  // Generic fallback
  return [
    'Explain the concept of neural networks in simple terms',
    'What are 3 evidence-based strategies for improving team productivity?',
    'Draft a concise professional email to reschedule a client meeting',
  ];
}

// Produce a short human-readable description of what the pipeline does.
function describePipeline(nodes: any[]): string {
  const types = nodes.map((n) => n.type as string).filter((t) => t !== 'input' && t !== 'output');
  if (types.length === 0) return 'pipeline';
  const unique = [...new Set(types)];
  const labels: Record<string, string> = {
    llm: 'LLM', tool: 'tool', agent: 'agent', router: 'router',
  };
  return unique.map((t) => labels[t] ?? t).join(' → ') + ' pipeline';
}

export const TestRunOverlay = ({ isActive, onClose }: TestRunOverlayProps) => {
  const { nodes, edges, updateNode } = usePipelineStore();
  const [phase, setPhase] = useState<Phase>('input');
  const [promptInput, setPromptInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [confirmedInput, setConfirmedInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const examples = generateExamples(nodes);
  const pipelineLabel = describePipeline(nodes);

  useEffect(() => {
    if (isActive) {
      setPhase('input');
      setPromptInput('');
      setValidationError(null);
      setLogs([]);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isActive]);

  const handleStart = async () => {
    const error = validateInput(promptInput);
    if (error) {
      setValidationError(error);
      return;
    }
    const safe = sanitizeInput(promptInput);
    setConfirmedInput(safe);
    setPhase('running');
    await runTest(safe);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStart();
    }
    if (e.key === 'Escape') onClose();
  };

  const runTest = async (input: string) => {
    setIsRunning(true);
    setLogs([]);
    try {
      await apiClient.testRun({ nodes, edges }, input, (event: RunEvent) => {
        if (event.status === 'running') {
          updateNode((event as any).nodeId, { status: 'running' });
        } else if (event.status === 'success') {
          const node = nodes.find((n) => n.id === (event as any).nodeId);
          updateNode((event as any).nodeId, { status: 'done' });
          setLogs((prev) => [
            ...prev,
            {
              nodeId: (event as any).nodeId,
              nodeName: (node?.data as any)?.label ?? (event as any).nodeId,
              status: 'done' as const,
              output: (event as any).output ?? '',
              timestamp: Date.now(),
            },
          ]);
        } else if (event.status === 'error') {
          const node = nodes.find((n) => n.id === (event as any).nodeId);
          updateNode((event as any).nodeId, { status: 'error' });
          setLogs((prev) => [
            ...prev,
            {
              nodeId: (event as any).nodeId,
              nodeName: (node?.data as any)?.label ?? (event as any).nodeId,
              status: 'error' as const,
              output: (event as any).error ?? 'Unknown error',
              timestamp: Date.now(),
            },
          ]);
        }
      });
    } catch (error) {
      console.error('Test run failed:', error);
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        nodes.forEach((node) => updateNode(node.id, { status: 'idle' }));
      }, 2000);
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* ── Phase 1: Input Dialog ── */}
      {phase === 'input' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            {/* Header */}
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
                    onClick={() => {
                      setPromptInput(ex);
                      setValidationError(null);
                      textareaRef.current?.focus();
                    }}
                    style={{
                      background: promptInput === ex ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                      border: `1px solid ${promptInput === ex ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: promptInput === ex ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: '1.4',
                      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (promptInput !== ex) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (promptInput !== ex) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or write your own</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Textarea */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <textarea
                ref={textareaRef}
                value={promptInput}
                onChange={(e) => {
                  setPromptInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Summarise the latest AI trends in 3 bullet points"
                maxLength={MAX_INPUT_LENGTH + 50} // allow typing a bit over to show error
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: `1px solid ${validationError ? 'var(--error)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { if (!validationError) e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { if (!validationError) e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>

            {/* Character count + hint */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ⌘↵ to run
              </div>
              <div style={{
                fontSize: '11px',
                color: promptInput.length > MAX_INPUT_LENGTH ? 'var(--error)' : 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {promptInput.length} / {MAX_INPUT_LENGTH}
              </div>
            </div>

            {/* Validation error banner */}
            {validationError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '14px' }}>⚠</span>
                <span style={{ fontSize: '12px', color: 'var(--error)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {validationError}
                </span>
              </div>
            )}

            {/* Safety note */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.06)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '20px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
            }}>
              Inputs are validated for prompt injection before execution. Plain natural language prompts work best.
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH}
                style={{
                  height: '38px',
                  padding: '0 24px',
                  background: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 'var(--bg-card)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 'not-allowed' : 'pointer',
                  opacity: !promptInput.trim() || promptInput.length > MAX_INPUT_LENGTH ? 0.5 : 1,
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s',
                }}
              >
                <span>▶</span>
                <span>Run Pipeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Log Drawer ── */}
      {phase === 'running' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '280px',
            background: 'var(--bg-panel)',
            borderTop: '2px solid var(--accent)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isRunning ? 'var(--accent)' : 'var(--success)',
                  animation: isRunning ? 'pulse 1.5s infinite' : 'none',
                }}
              />
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 600 }}>
                {isRunning ? 'Test Run in Progress...' : 'Test Run Complete'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Input: "{confirmedInput}"
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isRunning}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontSize: '20px',
                padding: '4px',
                lineHeight: 1,
                opacity: isRunning ? 0.3 : 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Logs */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                Initializing test run...
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    background: log.status === 'error' ? 'rgba(244, 63, 94, 0.1)' : log.status === 'done' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    border: `1px solid ${log.status === 'error' ? 'rgba(244, 63, 94, 0.3)' : log.status === 'done' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                    borderRadius: '6px',
                    animation: 'slideIn 0.3s ease-out',
                  }}
                >
                  <div style={{ fontSize: '18px', lineHeight: 1 }}>
                    {log.status === 'done' ? '✓' : log.status === 'error' ? '✗' : '⟳'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {log.nodeName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                      {log.output}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
