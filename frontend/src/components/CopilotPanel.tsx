import { useRef, useEffect, useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { useResize } from '../hooks/useResize';
import { apiClient } from '../lib/apiClient';

export const CopilotPanel = () => {
  const { copilotMessages, addCopilotMessage, nodes, edges } = usePipelineStore();
  const [question, setQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { size, onMouseDown } = useResize(280, 240, 500, 'horizontal');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages]);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const userMessage = question.trim();
    addCopilotMessage({
      role: 'system',
      text: userMessage,
    });

    setQuestion('');
    setIsTyping(true);

    try {
      // Call the REAL copilot API (or mock that calls real Claude)
      const result = await apiClient.sendCopilotMessage(userMessage, { nodes, edges });
      setIsTyping(false);
      addCopilotMessage({
        role: 'claude',
        text: result.response,
      });
    } catch (error) {
      console.error('[CopilotPanel] Error calling copilot:', error);
      setIsTyping(false);
      addCopilotMessage({
        role: 'claude',
        text: 'Sorry, I encountered an error. Please try again.',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div
      data-tour="copilot-panel"
      style={{
        width: `${size}px`,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          background: 'transparent',
          zIndex: 10,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#6366f160';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      />
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
              padding: '12px 12px 12px 16px',
              borderRadius: '8px',
              background:
                message.role === 'claude'
                  ? 'rgba(99, 102, 241, 0.08)'
                  : message.role === 'system'
                  ? 'rgba(244, 63, 94, 0.08)'
                  : 'var(--bg-card)',
              border: `1px solid ${
                message.role === 'claude'
                  ? 'rgba(99, 102, 241, 0.25)'
                  : message.role === 'system'
                  ? 'rgba(244, 63, 94, 0.25)'
                  : 'var(--border)'
              }`,
              borderLeft: `3px solid ${
                message.role === 'claude'
                  ? 'var(--accent)'
                  : message.role === 'system'
                  ? 'var(--error)'
                  : 'var(--border)'
              }`,
              fontSize: '13px',
              lineHeight: '1.5',
              color:
                message.role === 'claude' ? 'var(--text-primary)' : 'var(--text-muted)',
              animation: 'fade-in 0.3s ease-out',
            }}
          >
            {message.text}
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              padding: '12px 12px 12px 16px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderLeft: '3px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              animation: 'fade-in 0.3s ease-out',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'dot-pulse 1.4s infinite',
              }}
            />
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'dot-pulse 1.4s infinite 0.2s',
              }}
            />
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'dot-pulse 1.4s infinite 0.4s',
              }}
            />
          </div>
        )}
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
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleAskQuestion}
            disabled={!question.trim()}
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: question.trim() ? 'pointer' : 'not-allowed',
              opacity: question.trim() ? 1 : 0.4,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};
