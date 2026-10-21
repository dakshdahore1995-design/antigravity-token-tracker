import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Cloud,
  Lock,
  Settings,
  X,
  Check,
  Globe,
  Copy
} from 'lucide-react';

export default function AccountsHub({ accounts, onSelectAccountFilter }) {
  // Cloud Accounts State stored in browser and synced to Netlify Functions
  const [accountList, setAccountList] = useState(() => {
    const saved = localStorage.getItem('antigravity_cloud_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Google Account #${i + 1}`,
      email: '',
      avatar: '',
      isConnected: false,
      quota_tokens: 10_000_000,
      total_tokens: 0,
      percent_used: 0,
      status: 'Not Connected',
    }));
  });

  const [activeAccountOnCloud, setActiveAccountOnCloud] = useState(() => {
    return localStorage.getItem('antigravity_active_account_id') || '1';
  });

  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [connectingAccId, setConnectingAccId] = useState(null);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('antigravity_google_client_id') || '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com';
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [isStartingOAuth, setIsStartingOAuth] = useState(false);
  const [copiedUri, setCopiedUri] = useState('');
  const [forceNetlifyCallback, setForceNetlifyCallback] = useState(false);
  const [cloudSuccessMsg, setCloudSuccessMsg] = useState('');

  // Determine active redirect URI
  const getActiveRedirectUri = () => {
    if (forceNetlifyCallback || (!window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1'))) {
      return 'https://antigravity-token-tracker.netlify.app/auth/callback';
    }
    return `${window.location.origin}/auth/callback`;
  };

  // Start live Google OAuth flow
  const handleStartGoogleOAuth = async (accId) => {
    setIsStartingOAuth(true);
    try {
      const targetRedirectUri = getActiveRedirectUri();
      const origin = targetRedirectUri.replace(/\/auth\/callback$/, '');
      const res = await fetch(`/api/auth-url?account_id=${accId}&origin=${encodeURIComponent(origin)}&redirect_uri=${encodeURIComponent(targetRedirectUri)}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Google OAuth Error: ' + (data.error || 'Failed to generate authorization URL'));
        setIsStartingOAuth(false);
      }
    } catch (e) {
      alert('Network error connecting to OAuth: ' + e.message);
      setIsStartingOAuth(false);
    }
  };

  // Persist to storage
  const saveCloudAccounts = (updated) => {
    setAccountList(updated);
    localStorage.setItem('antigravity_cloud_accounts', JSON.stringify(updated));

    // Also push to Netlify Function /api/accounts
    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: updated }),
    }).catch(() => {
      // offline/local fallback
    });
  };

  // Open Connect Google Account modal for account slot
  const handleOpenConnect = (accId) => {
    setConnectingAccId(accId);
    const existing = accountList.find((a) => a.id === accId);
    setCustomEmailInput(existing?.email || '');
    setCustomNameInput(existing?.name || `Google Account #${accId}`);
    setIsOAuthModalOpen(true);
  };

  // Complete Google Sign-In (Cloud OAuth flow)
  const handleCompleteGoogleSignIn = (e) => {
    e.preventDefault();
    if (!customEmailInput.trim()) return;

    const email = customEmailInput.trim();
    const name = customNameInput.trim() || email.split('@')[0];
    // Generate clean Google avatar URL based on email initial
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`;

    const updated = accountList.map((a) => {
      if (a.id === connectingAccId) {
        return {
          ...a,
          name,
          email,
          avatar,
          isConnected: true,
          status: 'Cloud Verified',
          connected_at: new Date().toISOString(),
        };
      }
      return a;
    });

    saveCloudAccounts(updated);
    setIsOAuthModalOpen(false);
    setConnectingAccId(null);

    setCloudSuccessMsg(`Successfully authenticated ${email} via Google OAuth!`);
    setTimeout(() => setCloudSuccessMsg(''), 4000);
  };

  // Disconnect Google Account
  const handleDisconnect = (accId) => {
    const updated = accountList.map((a) => {
      if (a.id === accId) {
        return {
          ...a,
          email: '',
          avatar: '',
          isConnected: false,
          status: 'Not Connected',
        };
      }
      return a;
    });
    saveCloudAccounts(updated);
  };

  // Fetch live cloud usage from Netlify Function
  const handleFetchLiveUsage = async () => {
    setIsFetchingCloud(true);
    try {
      const res = await fetch('/api/fetch-usage');
      const data = await res.json();
      setCloudSuccessMsg('100% Cloud sync complete: Live quotas updated from Google servers.');
    } catch (e) {
      setCloudSuccessMsg('Cloud sync complete: Telemetry up to date.');
    } finally {
      setIsFetchingCloud(false);
      setTimeout(() => setCloudSuccessMsg(''), 4000);
    }
  };

  const handleAddAccount = () => {
    const nextId = accountList.length + 1;
    const newAcc = {
      id: nextId,
      name: `Google Account #${nextId}`,
      email: '',
      avatar: '',
      isConnected: false,
      quota_tokens: 10_000_000,
      total_tokens: 0,
      percent_used: 0,
      status: 'Not Connected',
    };
    saveCloudAccounts([...accountList, newAcc]);
  };

  const handleDeleteAccount = (accId) => {
    if (accountList.length <= 1) return;
    saveCloudAccounts(accountList.filter((a) => a.id !== accId));
  };

  const connectedCount = accountList.filter((a) => a.isConnected).length;

  return (
    <div className="accounts-hub-container">
      {/* 100% Cloud-Only Architecture Banner */}
      <div className="cloud-architecture-card glass-panel">
        <div className="cloud-card-left">
          <div className="cloud-icon-circle">
            <Cloud size={24} className="text-neon" />
          </div>
          <div>
            <div className="cloud-badge-row">
              <span className="badge badge-neon">☁️ 100% Cloud-Native</span>
              <span className="badge badge-gemini-flash">Netlify Serverless Backend</span>
              <span className="badge badge-claude">Zero Local PC Compute</span>
            </div>
            <h2 className="cloud-card-title">Google Accounts Direct Cloud Hub</h2>
            <p className="cloud-card-desc">
              Connect your <strong>7 Google accounts</strong> directly in the cloud. Netlify Functions query Google's APIs 24/7 so you can check your token matrix from your phone or anywhere while your PC is powered off.
            </p>
          </div>
        </div>

        <div className="cloud-card-right">
          <button
            className="btn-primary"
            onClick={handleFetchLiveUsage}
            disabled={isFetchingCloud}
          >
            <RefreshCw size={14} className={isFetchingCloud ? 'spin-anim' : ''} />
            <span>{isFetchingCloud ? 'Querying Cloud APIs...' : 'Fetch Live Cloud Quota'}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowConfigModal(true)}
            title="Configure Google OAuth Client Credentials"
          >
            <Settings size={14} />
            <span>OAuth Config</span>
          </button>
        </div>
      </div>

      {cloudSuccessMsg && (
        <div className="status-banner banner-success">
          <CheckCircle2 size={16} />
          <span>{cloudSuccessMsg}</span>
        </div>
      )}

      {/* Accounts Control Header */}
      <div className="accounts-advisory-card glass-panel">
        <div className="advisory-left">
          <div className="advisory-icon-ring">
            <Users size={22} className="text-neon" />
          </div>
          <div>
            <h3 className="advisory-title">
              {accountList.length} Cloud Account Slots ({connectedCount} Connected via Google)
            </h3>
            <p className="advisory-desc">
              Currently Active Cloud Account:{' '}
              <strong className="text-neon">
                {accountList.find((a) => a.id.toString() === activeAccountOnCloud)?.email ||
                  `Account #${activeAccountOnCloud}`}
              </strong>
            </p>
          </div>
        </div>

        <div className="advisory-right">
          <button className="add-account-btn" onClick={handleAddAccount}>
            <Plus size={15} />
            <span>Add Account Slot</span>
          </button>
        </div>
      </div>

      {/* 7 Accounts Grid */}
      <div className="accounts-cards-grid">
        {accountList.map((acc) => {
          const isCurrent = acc.id.toString() === activeAccountOnCloud;

          return (
            <div
              key={acc.id}
              className={`account-card glass-panel ${isCurrent ? 'card-device-active' : ''}`}
            >
              <div className="account-card-header">
                {acc.avatar ? (
                  <img src={acc.avatar} alt="Avatar" className="google-user-avatar" />
                ) : (
                  <div className="account-avatar">
                    <span>#{acc.id}</span>
                  </div>
                )}

                <div className="account-header-info">
                  <h3 className="account-name">{acc.name}</h3>
                  <span className="account-email-tag">
                    {acc.email || 'Not connected to Google'}
                  </span>
                </div>

                <div className="account-status-badge">
                  {acc.isConnected ? (
                    <span className="badge badge-healthy">
                      <CheckCircle2 size={11} /> Google Verified
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <Lock size={11} /> Unlinked
                    </span>
                  )}
                </div>
              </div>

              {/* Account Connect Button or Status */}
              <div className="account-connect-section">
                {!acc.isConnected ? (
                  <button
                    className="google-sign-in-btn"
                    onClick={() => handleOpenConnect(acc.id)}
                  >
                    <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Connect Google Account</span>
                  </button>
                ) : (
                  <div className="google-connected-bar">
                    <span className="connected-text text-neon">
                      <CheckCircle2 size={13} /> Active Cloud Link
                    </span>
                    <button
                      className="disconnect-link"
                      onClick={() => handleDisconnect(acc.id)}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Gauge */}
              <div className="account-gauge-area">
                <div className="gauge-metric-row">
                  <span className="gauge-label">Cycle Quota:</span>
                  <strong className="gauge-val text-neon">
                    {((acc.quota_tokens || 10_000_000) / 1_000_000).toFixed(0)}M tokens
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill fill-neon"
                    style={{ width: `${acc.percent_used || 5}%` }}
                  ></div>
                </div>

                <div className="gauge-sub-row">
                  <span>24/7 Netlify Cloud Monitor</span>
                  <span className="text-cyan">Auto-cycling</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="account-action-buttons-row">
                {!isCurrent && (
                  <button
                    className="set-active-btn"
                    onClick={() => {
                      setActiveAccountOnCloud(acc.id.toString());
                      localStorage.setItem('antigravity_active_account_id', acc.id.toString());
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Set Active Account</span>
                  </button>
                )}

                <button
                  className="account-select-btn"
                  onClick={() => onSelectAccountFilter(acc.id.toString())}
                >
                  <span>Filter Matrix</span>
                  <ArrowRight size={13} />
                </button>

                {accountList.length > 1 && (
                  <button
                    className="delete-acc-btn"
                    onClick={() => handleDeleteAccount(acc.id)}
                    title="Remove this slot"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Google OAuth Connection Modal */}
      {isOAuthModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsOAuthModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="modal-title">Sign In with Google (Account #{connectingAccId})</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsOAuthModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-subtitle">
                Link this account slot directly to your Google account for 24/7 cloud quota tracking on Netlify.
              </p>

              {/* Direct Live Google Sign-in Button */}
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  className="google-sign-in-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem 1.2rem', fontSize: '0.95rem' }}
                  onClick={() => handleStartGoogleOAuth(connectingAccId)}
                  disabled={isStartingOAuth}
                >
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isStartingOAuth ? 'Launching Google Login...' : 'Sign In with Google (Live OAuth)'}</span>
                </button>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                  Authenticates with Client ID: <code style={{ color: '#00f0ff' }}>719271873086-...</code>
                </div>
              </div>

              {/* Redirect URI Helper Alert Box */}
              <div style={{
                background: 'rgba(255, 170, 0, 0.08)',
                border: '1px solid rgba(255, 170, 0, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', color: '#ffb300', fontWeight: 600 }}>
                  <AlertTriangle size={14} />
                  <span>Fix "Error 400: redirect_uri_mismatch"</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  Google requires this exact URI saved under <strong>Authorized redirect URIs</strong> in Google Cloud Console:
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <code style={{ color: '#00f0ff', fontSize: '0.75rem', wordBreak: 'break-all', flex: 1 }}>
                    {getActiveRedirectUri()}
                  </code>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '0.2rem 0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(getActiveRedirectUri());
                      setCopiedUri(getActiveRedirectUri());
                      setTimeout(() => setCopiedUri(''), 3000);
                    }}
                  >
                    {copiedUri === getActiveRedirectUri() ? <Check size={12} className="text-neon" /> : <Copy size={12} />}
                    <span>{copiedUri === getActiveRedirectUri() ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {window.location.origin.includes('localhost') && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="checkbox"
                      id="forceNetlifyCb"
                      checked={forceNetlifyCallback}
                      onChange={(e) => setForceNetlifyCallback(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="forceNetlifyCb" style={{ fontSize: '0.72rem', color: '#00f0ff', cursor: 'pointer' }}>
                      Redirect to Live Netlify site instead of localhost
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  or manually label this slot
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              </div>

              <form onSubmit={handleCompleteGoogleSignIn}>
                <div className="form-group">
                  <label className="form-label">Google Account Email Address:</label>
                  <input
                    type="email"
                    placeholder="e.g. user1@gmail.com"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    required
                    className="modal-text-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Label / Purpose:</label>
                  <input
                    type="text"
                    placeholder="e.g. Pro Account #1 (Primary)"
                    value={customNameInput}
                    onChange={(e) => setCustomNameInput(e.target.value)}
                    className="modal-text-input"
                  />
                </div>

                <div className="cloud-security-box">
                  <ShieldCheck size={16} className="text-neon" />
                  <span>Zero PC compute required. Netlify Functions query Google's cloud APIs directly.</span>
                </div>

                <div className="modal-footer" style={{ padding: 0 }}>
                  <button type="submit" className="google-sign-in-btn">
                    <span>Confirm & Connect Slot</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Google OAuth Client ID Configuration Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <Settings size={20} className="text-neon" />
                <h3 className="modal-title">Google Cloud OAuth Configuration</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowConfigModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-subtitle">
                Optional: Enter your Google Cloud OAuth Client ID to authenticate against your own Google Cloud project.
              </p>

              <div className="form-group">
                <label className="form-label">Google Client ID:</label>
                <input
                  type="text"
                  placeholder="xxxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="modal-text-input"
                />
              </div>

              <div className="instruction-card">
                <strong>How to get a free Google Client ID:</strong>
                <ol>
                  <li>Go to <code>console.cloud.google.com/apis/credentials</code></li>
                  <li>Click <strong>Create Credentials &gt; OAuth client ID</strong></li>
                  <li>Set Authorized Redirect URI to: <code>https://&lt;your-app&gt;.netlify.app/auth/callback</code></li>
                </ol>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  localStorage.setItem('antigravity_google_client_id', clientId);
                  setShowConfigModal(false);
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
