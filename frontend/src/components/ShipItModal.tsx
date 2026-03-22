import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { usePipelineStore } from '../store/pipelineStore';
import type { NodeData } from '../store/pipelineStore';
import { fetchWithAuth } from '../lib/api';
// ADD THIS: needed to sanitise nodes before sending to the backend
import { getDefaultConfig } from '../lib/nodeDefaults';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type ShipFile = {
  name: string;
  content: string;
  encoding: string;
};

type ShipItModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const FILE_ICONS: Record<string, string> = {
  'pipeline.json': '📋',
  'run.py': '▶',
  'forge_runner.py': '⚙',
  'README.md': '📖',
};

export const ShipItModal = ({ isOpen, onClose }: ShipItModalProps) => {
  const { nodes, edges, setIsGeneratingCode } = usePipelineStore();
  const [files, setFiles] = useState<ShipFile[]>([]);
  // ADD THIS: warnings returned from the server when nodes use default config
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState('My Pipeline');

  useEffect(() => {
    if (isOpen && nodes.length > 0) {
      void generateExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, nodes]);

  const generateExport = async () => {
    setIsLoading(true);
    setIsGeneratingCode(true);
    setError(null);
    setFiles([]);
    // ADD THIS: reset warnings on each generation
    setExportWarnings([]);
    setActiveTab(0);

    try {
      // ADD THIS: convert React Flow nodes → EngineNode format before sending.
      // node.data.config is the backend-ready config injected at creation time.
      // Fall back to getDefaultConfig so nodes created before this fix still work.
      const engineNodes = nodes.map((node) => ({
        id: node.id,
        type: node.type ?? 'output',
        position: node.position,
        config: (node.data as NodeData).config ?? getDefaultConfig(node.type ?? ''),
        inputs: ['text'],
        outputs: ['text'],
        label: (node.data as NodeData).label,
      }));

      const response = await fetchWithAuth(`${API_URL}/api/generate-code`, {
        method: 'POST',
        body: JSON.stringify({ nodes: engineNodes, edges, name: pipelineName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errs = body['errors'] as string[] | undefined;
        throw new Error(errs ? errs.join('; ') : `HTTP ${response.status}`);
      }

      // CHANGE THIS: destructure warnings from the response
      const result = await response.json() as { files: ShipFile[]; warnings?: string[] };
      setFiles(result.files ?? []);
      setExportWarnings(result.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate export');
    } finally {
      setIsLoading(false);
      setIsGeneratingCode(false);
    }
  };

  const handleDownload = async () => {
    if (files.length === 0) return;

    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.name, file.content);
    }

    const safeName = pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName || 'pipeline'}-forge.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const activeFile = files[activeTab];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '40px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1100px',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ── Modal header ── */}
        <div
          style={{
            padding: '20px 28px',
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
                fontFamily: 'Syne, sans-serif',
                fontSize: '20px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span>🚀</span>
              <span>Ship It</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Export your pipeline as a self-contained Python project
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pipeline name input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Name:
              </label>
              <input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  width: '160px',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              />
              <button
                onClick={() => void generateExport()}
                disabled={isLoading}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                  opacity: isLoading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Regenerate
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ADD THIS: yellow warnings banner — shown when nodes have default configs */}
        {!isLoading && exportWarnings.length > 0 && (
          <div
            style={{
              background: 'rgba(245,158,11,0.08)',
              borderBottom: '1px solid rgba(245,158,11,0.3)',
              padding: '10px 20px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#f59e0b',
                fontWeight: 600,
                marginBottom: exportWarnings.length > 0 ? '6px' : 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚠</span>
              <span>
                Some nodes are using default configuration. Click any node on the canvas to
                configure it before exporting for production use.
              </span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {exportWarnings.map((w, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: 'rgba(245,158,11,0.85)',
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: '1.5',
                  }}
                >
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: file tabs + code preview */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border)',
            }}
          >
            {/* File tabs */}
            {files.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--border)',
                  flexShrink: 0,
                  overflowX: 'auto',
                }}
              >
                {files.map((file, i) => (
                  <button
                    key={file.name}
                    onClick={() => setActiveTab(i)}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      background: activeTab === i ? 'var(--bg-base)' : 'transparent',
                      border: 'none',
                      borderBottom: activeTab === i ? '2px solid var(--accent)' : '2px solid transparent',
                      borderRight: '1px solid var(--border)',
                      color: activeTab === i ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s',
                    }}
                  >
                    <span>{FILE_ICONS[file.name] ?? '📄'}</span>
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Code area */}
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
              {isLoading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: '16px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid var(--border)',
                      borderTopColor: 'var(--accent)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div style={{ fontSize: '13px' }}>Generating your pipeline export...</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!isLoading && error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '40px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#f43f5e', textAlign: 'center' }}>
                    {error}
                  </div>
                  <button
                    onClick={() => void generateExport()}
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

              {!isLoading && !error && activeFile && (
                <pre
                  style={{
                    margin: 0,
                    padding: '24px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                    lineHeight: '1.65',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {activeFile.content}
                </pre>
              )}
            </div>
          </div>

          {/* Right: info + download */}
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* What's included */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  What's included
                </div>
                {[
                  { icon: '📋', name: 'pipeline.json', desc: 'Your pipeline schema' },
                  { icon: '▶', name: 'run.py', desc: 'Entry point runner' },
                  { icon: '⚙', name: 'forge_runner.py', desc: 'AI-generated engine' },
                  { icon: '📖', name: 'README.md', desc: 'Setup instructions' },
                ].map((f) => (
                  <div
                    key={f.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{f.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--text-primary)',
                          marginBottom: '2px',
                        }}
                      >
                        {f.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick start */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'inherit' }}>
                  Quick start
                </div>
                <div>pip install anthropic</div>
                <div>export ANTHROPIC_API_KEY=...</div>
                <div>python run.py &apos;your input&apos;</div>
              </div>
            </div>

            {/* Download button */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => void handleDownload()}
                disabled={isLoading || files.length === 0}
                style={{
                  width: '100%',
                  height: '46px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading || files.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isLoading || files.length === 0 ? 0.5 : 1,
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && files.length > 0) e.currentTarget.style.filter = 'brightness(1.15)';
                }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
              >
                <span>📦</span>
                <span>Download .zip</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
