import { useRef, useEffect, useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';

export const CopilotPanel = () => {
  const { copilotMessages, addCopilotMessage } = usePipelineStore();
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages]);

  const handleAskQuestion = () => {
    if (!question.trim()) return;

    addCopilotMessage({
      role: 'system',
      text: question,
    });

    // Simulate Claude response
    setTimeout(() => {
      addCopilotMessage({
        role: 'claude',
        text: 'I can help you with that! Try connecting your nodes or adjusting the configuration.',
      });
    }, 800);

    setQuestion('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div
      style={{
        width: '280px',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>⚡</span>
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          Forge Copilot
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {copilotMessages.map((message, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background:
                message.role === 'claude'
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'var(--bg-card)',
              border: `1px solid ${
                message.role === 'claude' ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)'
              }`,
              fontSize: '13px',
              lineHeight: '1.5',
              color:
                message.role === 'claude' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Ask Claude..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              height: '36px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
            }}
          />
          <button
            onClick={handleAskQuestion}
            disabled={!question.trim()}
            style={{
              width: '36px',
              height: '36px',
              background: question.trim() ? 'var(--accent)' : 'var(--bg-card)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: question.trim() ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};
