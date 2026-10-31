import React from 'react';
import {
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Copy,
  Check,
  HelpCircle,
  Terminal
} from 'lucide-react';

export default function ErrorDiagnosticModal({ errorData, onClose, onRetry }) {
  const [copied, setCopied] = React.useState(false);

  if (!errorData) return null;

  const {
    title = 'Connection Verification Failed',
    service = 'Google Cloud / Gemini API',
    httpStatus = 403,
    errorCode = 'PERMISSION_DENIED',
    rawMessage = 'Method does not allow unregistered callers.',
    diagnosis = 'Google rejected the request because the API key or OAuth credentials are not authorized for this API.',
    fixSteps = [],
    rawObject = null,
    testedAt = new Date().toLocaleTimeString(),
  } = errorData;

  const handleCopyRaw = () => {
    const textToCopy = typeof rawObject === 'object' && rawObject !== null
      ? JSON.stringify(rawObject, null, 2)
      : rawMessage;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: '680px',
          width: '92%',
          border: '1px solid rgba(255, 77, 77, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 77, 77, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid rgba(255, 77, 77, 0.25)',
            background: 'linear-gradient(90deg, rgba(255, 50, 50, 0.12), transparent)',
          }}
        >
          <div className="modal-title-wrapper">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(255, 50, 50, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff4d4d',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#ff6b6b' }}>
                {title}
              </h3>
              <span className="modal-subtitle">
                Target: <strong>{service}</strong> • Tested at {testedAt}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Status Badge Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 50, 50, 0.2)',
                border: '1px solid rgba(255, 50, 50, 0.4)',
                color: '#ff6b6b',
                fontWeight: '700',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
              }}
            >
              HTTP {httpStatus} {errorCode ? `• ${errorCode}` : ''}
            </span>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary, #aaa)',
                fontSize: '0.8rem',
              }}
            >
              Real Google Cloud Provider Response
            </span>
          </div>

          {/* Raw Error Code Box */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #888)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Exact Google API Response Payload:
              </span>
              <button
                onClick={handleCopyRaw}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#00f0ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre
              style={{
                background: 'rgba(10, 15, 25, 0.95)',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#ff9999',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '130px',
                overflowY: 'auto',
              }}
            >
              <code>{rawMessage}</code>
            </pre>
          </div>

          {/* Root Cause Diagnosis */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 170, 0, 0.08)',
              border: '1px solid rgba(255, 170, 0, 0.25)',
              marginBottom: '18px',
            }}
          >
            <h4
              style={{
                margin: '0 0 6px 0',
                color: '#ffb84d',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HelpCircle size={15} />
              Root Cause Diagnosis
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                lineHeight: '1.45',
                color: 'var(--text-primary, #ddd)',
              }}
            >
              {diagnosis}
            </p>
          </div>

          {/* Actionable Fix Checklist */}
          {fixSteps && fixSteps.length > 0 && (
            <div>
              <h4
                style={{
                  margin: '0 0 10px 0',
                  color: '#00f0ff',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Step-by-Step Remediation:
              </h4>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.82rem',
                  lineHeight: '1.4',
                  color: 'var(--text-secondary, #bbb)',
                }}
              >
                {fixSteps.map((step, idx) => (
                  <li key={idx}>
                    {step.includes('https://') ? (
                      <>
                        {step.split('https://')[0]}
                        <a
                          href={`https://${step.split('https://')[1].split(' ')[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#00ff88',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          https://{step.split('https://')[1].split(' ')[0]}
                          <ExternalLink size={11} />
                        </a>{' '}
                        {step.split('https://')[1].split(' ').slice(1).join(' ')}
                      </>
                    ) : (
                      step
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#4285F4',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
            }}
          >
            <span>Open Google Cloud Console</span>
            <ExternalLink size={13} />
          </a>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Dismiss
            </button>
            {onRetry && (
              <button
                className="btn-primary"
                onClick={onRetry}
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #00ff88)',
                  color: '#050a14',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
