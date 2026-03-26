import { useState } from 'react';
import type { EthicsRisk } from '../lib/mocks/demoData';

type EthicsWarningBadgeProps = {
  risk: EthicsRisk | null;
};

export const EthicsWarningBadge = ({ risk }: EthicsWarningBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!risk) return null;

  const severityColors = {
    low: { bg: 'rgba(250, 204, 21, 0.15)', border: '#facc15', text: '#fbbf24' },
    medium: { bg: 'rgba(251, 146, 60, 0.15)', border: '#fb923c', text: '#f97316' },
    high: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#dc2626' },
  };

  const colors = severityColors[risk.severity];
  const icon = risk.severity === 'high' ? '⚠' : risk.severity === 'medium' ? '⚡' : 'ℹ';

  return (
    <div
      style={{
        position: 'absolute',
        top: '-8px',
        left: '-8px',
        zIndex: 10,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          cursor: 'help',
          animation: 'pulse-soft 2s infinite',
          boxShadow: `0 0 8px ${colors.border}40`,
        }}
      >
        {icon}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '0',
            minWidth: '200px',
            maxWidth: '280px',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.5',
            color: '#ffffff',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            animation: 'fade-in 0.2s ease-out',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: colors.text,
              marginBottom: '4px',
              textTransform: 'uppercase',
              fontSize: '10px',
              letterSpacing: '0.5px',
            }}
          >
            {risk.severity} Risk
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>{risk.message}</div>
        </div>
      )}

      <style>{`
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
