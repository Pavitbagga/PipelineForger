import { useState, useEffect } from 'react';
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

export const TestRunOverlay = ({ isActive, onClose }: TestRunOverlayProps) => {
  const { nodes, edges, updateNode } = usePipelineStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testInput] = useState('Hello, test my pipeline!');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isActive && !isRunning) {
      runTest();
    }
  }, [isActive]);

  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      await apiClient.testRun({ nodes, edges }, testInput, (event: RunEvent) => {
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
      // Reset node statuses after 2 seconds
      setTimeout(() => {
        nodes.forEach((node) => {
          updateNode(node.id, { status: 'idle' });
        });
      }, 2000);
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* Bottom Drawer */}
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
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {isRunning ? 'Test Run in Progress...' : 'Test Run Complete'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Input: "{testInput}"
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
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
                  background:
                    log.status === 'error'
                      ? 'rgba(244, 63, 94, 0.1)'
                      : log.status === 'done'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(99, 102, 241, 0.1)',
                  border: `1px solid ${
                    log.status === 'error'
                      ? 'rgba(244, 63, 94, 0.3)'
                      : log.status === 'done'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(99, 102, 241, 0.3)'
                  }`,
                  borderRadius: '6px',
                  animation: 'slideIn 0.3s ease-out',
                }}
              >
                {/* Status Icon */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: 1,
                  }}
                >
                  {log.status === 'done'
                    ? '✓'
                    : log.status === 'error'
                    ? '✗'
                    : '⟳'}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    {log.nodeName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      lineHeight: '1.5',
                    }}
                  >
                    {log.output}
                  </div>
                </div>

                {/* Timestamp */}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
      </div>
    </>
  );
};
