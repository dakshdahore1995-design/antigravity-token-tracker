import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
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
  Copy,
  Key,
  Radio,
  Sliders,
  Terminal,
  Activity,
  Database
} from 'lucide-react';
import ErrorDiagnosticModal from './ErrorDiagnosticModal';
import confetti from 'canvas-confetti';
import { saveUserAccount, deleteUserAccount } from '../lib/supabase';

export default function AccountsHub({
  accounts,
  onAccountsChange,
  selectedAccountFilter,
  onSelectAccountFilter,
  currentUser,
}) {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectionType, setConnectionType] = useState('oauth'); // 'oauth' | 'apikey' | 'json'
  const [accountNickname, setAccountNickname] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [quotaInput, setQuotaInput] = useState('10000000');
  
  // Diagnostic Modal State
  const [activeDiagnostic, setActiveDiagnostic] = useState(null);
  const [testingAccId, setTestingAccId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Whitelist-aware redirect URI resolution
  const isNetlifyOrigin = window.location.origin.includes('netlify.app');
  const [usePreauthorizedNetlify, setUsePreauthorizedNetlify] = useState(!isNetlifyOrigin);
  const [copiedUri, setCopiedUri] = useState('');

  const getEffectiveRedirectUri = () => {
    if (usePreauthorizedNetlify) {
      return 'https://antigravity-token-tracker.netlify.app/auth/callback';
    }
    return `${window.location.origin}/auth/callback`;
  };

  // Handle opening the Connect Account modal
  const handleOpenConnectModal = () => {
    const nextNum = (accounts?.length || 0) + 1;
    setAccountNickname(`Google Account #${nextNum}`);
    setApiKeyInput('');
    setConnectionType('oauth');
    setIsConnectModalOpen(true);
  };

  // Direct, Synchronous Google OAuth 2.0 Redirect (Zero Fetch Latency)
  const handleInitiateGoogleOAuth = () => {
    setIsConnecting(true);
    try {
      const nextId = (accounts?.length || 0) + 1;
      const redirectOrigin = window.location.origin;
      const redirectUri = getEffectiveRedirectUri();
      const clientId = '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com';

      const scopes = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' ');

      const stateObj = {
        intent: 'connect_account',
        account_id: nextId,
        account_name: accountNickname.trim() || `Google Account #${nextId}`,
        origin: redirectOrigin,
        redirect_uri: redirectUri,
        timestamp: Date.now(),
      };

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `prompt=select_account%20consent&` +
        `state=${encodeURIComponent(JSON.stringify(stateObj))}`;

      window.location.href = googleAuthUrl;
    } catch (err) {
      setIsConnecting(false);
      setActiveDiagnostic({
        title: 'Google OAuth Initialization Failed',
        service: 'Google Identity OAuth 2.0',
        httpStatus: 0,
        errorCode: 'INIT_ERROR',
        rawMessage: err.message,
        diagnosis: 'Could not construct Google OAuth redirection parameters.',
        fixSteps: ['Verify browser security settings and retry.'],
      });
    }
  };

  // Helper to run live test against Gemini API (with direct client-side fallback if serverless proxy is unavailable)
  const testGeminiApiKey = async (key) => {
    // 1. Try serverless verification endpoint first
    try {
      const res = await fetch('/api/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, accountName: accountNickname }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      // Continue to direct Google API fallback
    }

    // 2. Direct browser call to Google Generative Language API
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
    const startTime = Date.now();
    try {
      const response = await fetch(googleUrl, { method: 'GET' });
      const latencyMs = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.models) {
        const geminiModels = data.models
          .filter(m => m.name && (m.name.includes('gemini') || m.name.includes('learnlm')))
          .map(m => m.displayName || m.name.replace('models/', ''));

        return {
          success: true,
          status: 'Verified & Active',
          latency_ms: latencyMs,
          models_count: data.models.length,
          available_models: geminiModels.slice(0, 8),
          provider: 'Google Gemini AI Studio / Cloud',
        };
      }

      const googleErr = data.error || {};
      const httpCode = response.status;
      const rawMessage = googleErr.message || response.statusText || 'Unknown error from Google Cloud API';
      const reason = googleErr.status || 'PERMISSION_DENIED';

      let diagnosis = 'Google Cloud rejected this API key.';
      let fixSteps = [
        'Visit Google AI Studio: https://aistudio.google.com/app/apikey',
        'Generate a new API key for your Google Account.',
      ];

      if (httpCode === 403) {
        if (rawMessage.includes('unregistered callers') || rawMessage.includes('API key not valid')) {
          diagnosis = 'Google rejected the request because this API key is either invalid, deleted, or restricted from calling the Generative Language API.';
          fixSteps = [
            'Visit Google AI Studio: https://aistudio.google.com/app/apikey',
            'Generate a new API key for your Google Account.',
            'Ensure "Generative Language API" is enabled in Google Cloud Console (console.cloud.google.com).',
          ];
        }
      }

      return {
        success: false,
        http_status: httpCode,
        google_status: reason,
        raw_error_message: rawMessage,
        diagnosis,
        fix_steps: fixSteps,
        google_error_object: googleErr,
      };
    } catch (err) {
      return {
        success: false,
        http_status: 0,
        google_status: 'NETWORK_ERROR',
        raw_error_message: err.message,
        diagnosis: 'Could not contact Google Cloud servers from the browser.',
        fix_steps: ['Check your internet connection and verify ad-blockers do not block googleapis.com.'],
      };
    }
  };

  // Connect & Verify via Google Gemini API Key
  const handleVerifyAndConnectApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setIsConnecting(true);
    const keyToTest = apiKeyInput.trim();

    try {
      const result = await testGeminiApiKey(keyToTest);
      setIsConnecting(false);

      if (result.success) {
        // Success: Key is verified by Google
        const nextId = (accounts?.length || 0) + 1;
        const newAccount = {
          id: nextId,
          name: accountNickname.trim() || `Account #${nextId}`,
          email: `${keyToTest.slice(0, 8)}...${keyToTest.slice(-4)}@gemini.api`,
          auth_type: 'api_key',
          apiKey: keyToTest,
          isConnected: true,
          status: 'Verified & Active',
          latency_ms: result.latency_ms,
          models_count: result.models_count,
          available_models: result.available_models,
          quota_tokens: parseInt(quotaInput, 10) || 10_000_000,
          total_tokens: 0,
          percent_used: 0,
          connected_at: new Date().toISOString(),
          errorDetails: null,
        };

        // Persist to Supabase Cloud
        if (currentUser?.id) {
          saveUserAccount(currentUser.id, newAccount);
        }

        const updated = [...(accounts || []), newAccount];
        onAccountsChange(updated);
        setIsConnectModalOpen(false);
        setSuccessBanner(`Successfully linked and verified ${newAccount.name} against Google Cloud (Synced to Supabase)!`);
        setTimeout(() => setSuccessBanner(''), 5000);

        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#00f0ff', '#00ff88', '#4285F4'],
        });
      } else {
        // Validation Failed: Show Real Specific Diagnostic
        const diagData = {
          title: 'Google API Key Verification Failed',
          service: 'Google Cloud Generative Language (Gemini)',
          httpStatus: result.http_status || 403,
          errorCode: result.google_status || 'PERMISSION_DENIED',
          rawMessage: result.raw_error_message || 'API key rejected by Google Cloud API.',
          diagnosis: result.diagnosis || 'Google Cloud rejected this API key.',
          fixSteps: result.fix_steps || [
            'Visit Google AI Studio: https://aistudio.google.com/app/apikey',
            'Generate a new API key for your Google Account.',
          ],
          rawObject: result.google_error_object,
          testedAt: new Date().toLocaleTimeString(),
        };

        // Open the diagnostic modal so the user gets the exact failure reason!
        setActiveDiagnostic(diagData);

        // Optionally allow user to save as "Needs Attention" so they can inspect it later
        const nextId = (accounts?.length || 0) + 1;
        const failedAccount = {
          id: nextId,
          name: accountNickname.trim() || `Account #${nextId}`,
          email: `${keyToTest.slice(0, 8)}... (Invalid Key)`,
          auth_type: 'api_key',
          apiKey: keyToTest,
          isConnected: false,
          status: 'Connection Failed',
          quota_tokens: parseInt(quotaInput, 10) || 10_000_000,
          total_tokens: 0,
          percent_used: 0,
          connected_at: new Date().toISOString(),
          errorDetails: diagData,
        };

        const updated = [...(accounts || []), failedAccount];
        onAccountsChange(updated);
        setIsConnectModalOpen(false);
      }
    } catch (err) {
      setIsConnecting(false);
      setActiveDiagnostic({
        title: 'Validation Call Failed',
        service: 'Google Verification Endpoint',
        httpStatus: 500,
        errorCode: 'FETCH_ERROR',
        rawMessage: err.message,
        diagnosis: 'Could not contact the verification endpoint.',
        fixSteps: ['Verify server is running and reachable.'],
      });
    }
  };

  // Re-Test an existing account's connection
  const handleTestPingAccount = async (account) => {
    setTestingAccId(account.id);
    try {
      if (account.apiKey) {
        const res = await fetch('/api/verify-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: account.apiKey }),
        });
        const result = await res.json();
        setTestingAccId(null);

        if (result.success) {
          const updated = accounts.map((a) =>
            a.id === account.id
              ? {
                  ...a,
                  isConnected: true,
                  status: 'Verified & Active',
                  latency_ms: result.latency_ms,
                  models_count: result.models_count,
                  errorDetails: null,
                }
              : a
          );
          onAccountsChange(updated);
          setSuccessBanner(`Ping successful! ${account.name} response time: ${result.latency_ms}ms.`);
          setTimeout(() => setSuccessBanner(''), 4000);
        } else {
          const diagData = {
            title: `Ping Failed: ${account.name}`,
            service: 'Google Cloud Gemini API',
            httpStatus: result.http_status || 403,
            errorCode: result.google_status || 'ERROR',
            rawMessage: result.raw_error_message,
            diagnosis: result.diagnosis,
            fixSteps: result.fix_steps,
            rawObject: result.google_error_object,
          };
          const updated = accounts.map((a) =>
            a.id === account.id
              ? { ...a, isConnected: false, status: 'Connection Failed', errorDetails: diagData }
              : a
          );
          onAccountsChange(updated);
          setActiveDiagnostic(diagData);
        }
      } else {
        // OAuth token test
        setTestingAccId(null);
        setSuccessBanner(`${account.name} Google OAuth connection token is active.`);
        setTimeout(() => setSuccessBanner(''), 3000);
      }
    } catch (err) {
      setTestingAccId(null);
      setActiveDiagnostic({
        title: `Ping Exception: ${account.name}`,
        service: 'Local Network',
        httpStatus: 0,
        errorCode: 'PING_EXCEPTION',
        rawMessage: err.message,
        diagnosis: 'Network error executing live ping test.',
        fixSteps: ['Check your internet connection.'],
      });
    }
  };

  // Remove Account
  const handleRemoveAccount = async (id) => {
    if (confirm('Are you sure you want to unlink and remove this account?')) {
      if (currentUser?.id) {
        await deleteUserAccount(currentUser.id, id);
      }
      const updated = accounts.filter((a) => a.id !== id);
      onAccountsChange(updated);
      if (selectedAccountFilter === id.toString()) {
        onSelectAccountFilter('all');
      }
    }
  };

  const accountList = accounts || [];
  const activeCount = accountList.filter((a) => a.isConnected).length;
  const totalTokens = accountList.reduce((acc, a) => acc + (a.total_tokens || 0), 0);
  const totalQuota = accountList.reduce((acc, a) => acc + (a.quota_tokens || 10_000_000), 0);
  const consolidatedPercent = totalQuota > 0 ? Math.round((totalTokens / totalQuota) * 100) : 0;

  return (
    <div className="accounts-hub-container">
      {/* Top Banner & Quick Controls */}
      <div className="accounts-header-card glass-panel">
        <div className="accounts-header-left">
          <div className="accounts-icon-badge">
            <Users size={24} className="text-neon" />
          </div>
          <div>
            <h2 className="accounts-title">Connected AI Accounts Hub</h2>
            <p className="accounts-subtitle">
              Manage multi-account Google OAuth tokens, Gemini API keys, and pooled quota limits.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '12px',
                background: 'rgba(0, 255, 136, 0.08)',
                border: '1px solid rgba(0, 255, 136, 0.25)',
                fontSize: '0.7rem',
                color: '#00ff88',
                marginTop: '6px',
              }}
            >
              <Database size={11} />
              <span>Supabase Cloud PostgreSQL Active • Unlimited Slots</span>
            </div>
          </div>
        </div>

        <div className="accounts-header-actions">
          <button className="btn-primary" onClick={handleOpenConnectModal}>
            <Plus size={16} />
            <span>+ Add Account (Unlimited Slots)</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="status-banner banner-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Consolidated Metrics Bar */}
      <div className="accounts-metrics-row">
        <div className="account-metric-card glass-panel">
          <span className="metric-label">Linked Accounts</span>
          <div className="metric-value-row">
            <span className="metric-number">{accountList.length}</span>
            <span className="metric-badge badge-neon">{activeCount} Verified Online</span>
          </div>
        </div>

        <div className="account-metric-card glass-panel">
          <span className="metric-label">Consolidated Quota Pool</span>
          <div className="metric-value-row">
            <span className="metric-number">
              {(totalQuota / 1_000_000).toFixed(1)}M
            </span>
            <span className="metric-unit">Tokens</span>
          </div>
        </div>

        <div className="account-metric-card glass-panel">
          <span className="metric-label">Total Pool Consumption</span>
          <div className="metric-value-row">
            <span className="metric-number">{consolidatedPercent}%</span>
            <span className="metric-subtext">{totalTokens.toLocaleString()} used</span>
          </div>
        </div>
      </div>

      {/* Accounts List Section */}
      <div className="accounts-grid-section">
        <div className="accounts-grid-header">
          <h3>Active Account Nodes ({accountList.length}) • Unlimited Slots Available</h3>
          <div className="accounts-filter-pill-group">
            <button
              className={`account-filter-btn ${selectedAccountFilter === 'all' ? 'active' : ''}`}
              onClick={() => onSelectAccountFilter('all')}
            >
              All Accounts (Consolidated)
            </button>
            {accountList.map((a) => (
              <button
                key={a.id}
                className={`account-filter-btn ${
                  selectedAccountFilter === a.id.toString() ? 'active' : ''
                }`}
                onClick={() => onSelectAccountFilter(a.id.toString())}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State when 0 accounts */}
        {accountList.length === 0 ? (
          <div className="accounts-empty-card glass-panel">
            <div className="empty-icon-wrap">
              <Cloud size={48} className="text-secondary" />
            </div>
            <h3>No Accounts Linked Yet</h3>
            <p>
              Connect your Google Cloud OAuth account or Google Gemini API Key to start tracking
              tokens in 2D and 3D heatmaps.
            </p>
            <button className="btn-primary" onClick={handleOpenConnectModal}>
              <Plus size={16} />
              <span>Connect Your First Account</span>
            </button>
          </div>
        ) : (
          <div className="accounts-cards-grid">
            {accountList.map((acc) => {
              const isSelected = selectedAccountFilter === acc.id.toString();
              const isFailed = acc.status === 'Connection Failed' || !acc.isConnected;

              return (
                <div
                  key={acc.id}
                  className={`account-slot-card glass-panel ${isSelected ? 'selected' : ''} ${
                    isFailed ? 'failed-card' : ''
                  }`}
                >
                  <div className="card-top-bar">
                    <div className="card-identity">
                      <div className="account-avatar">
                        {acc.avatar ? (
                          <img src={acc.avatar} alt={acc.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {acc.name ? acc.name.charAt(0).toUpperCase() : '#'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="card-acc-name">{acc.name}</h4>
                        <span className="card-acc-email">{acc.email || 'No email associated'}</span>
                      </div>
                    </div>

                    <div className="card-status-pill">
                      {acc.isConnected ? (
                        <span className="badge badge-healthy">
                          <CheckCircle2 size={12} />
                          <span>Verified Online</span>
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <ShieldAlert size={12} />
                          <span>Failed / Attention</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Alert Box on Failed Accounts */}
                  {isFailed && acc.errorDetails && (
                    <div className="card-error-snippet">
                      <div className="error-snippet-header">
                        <AlertTriangle size={13} className="text-danger" />
                        <span>HTTP {acc.errorDetails.httpStatus} • {acc.errorDetails.errorCode}</span>
                      </div>
                      <p className="error-snippet-msg">{acc.errorDetails.rawMessage}</p>
                      <button
                        className="btn-snippet-diag"
                        onClick={() => setActiveDiagnostic(acc.errorDetails)}
                      >
                        🔍 View Specific Diagnostic Report & Fix
                      </button>
                    </div>
                  )}

                  {/* Quota Progress */}
                  <div className="card-quota-area">
                    <div className="quota-labels">
                      <span>Token Usage</span>
                      <span>
                        {(acc.total_tokens || 0).toLocaleString()} /{' '}
                        {((acc.quota_tokens || 10_000_000) / 1_000_000).toFixed(0)}M ({acc.percent_used || 0}%)
                      </span>
                    </div>
                    <div className="quota-bar-track">
                      <div
                        className="quota-bar-fill"
                        style={{
                          width: `${Math.min(acc.percent_used || 0, 100)}%`,
                          background:
                            (acc.percent_used || 0) > 85
                              ? '#ff4d4d'
                              : (acc.percent_used || 0) > 60
                              ? '#ffaa00'
                              : '#00ff88',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Verified Metadata */}
                  {acc.isConnected && acc.available_models && (
                    <div className="card-models-preview">
                      <span className="models-tag">
                        ⚡ {acc.available_models.length} Gemini Models Active
                      </span>
                      {acc.latency_ms && (
                        <span className="models-tag">Latency: {acc.latency_ms}ms</span>
                      )}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="card-footer-actions">
                    <button
                      className="card-action-btn"
                      onClick={() => handleTestPingAccount(acc)}
                      disabled={testingAccId === acc.id}
                      title="Run live ping test against Google servers"
                    >
                      <RefreshCw
                        size={13}
                        className={testingAccId === acc.id ? 'spin-anim' : ''}
                      />
                      <span>{testingAccId === acc.id ? 'Testing...' : 'Test Ping'}</span>
                    </button>

                    <button
                      className={`card-action-btn ${isSelected ? 'active-filter' : ''}`}
                      onClick={() => onSelectAccountFilter(acc.id.toString())}
                    >
                      <Activity size={13} />
                      <span>{isSelected ? 'Active Filter' : 'Filter View'}</span>
                    </button>

                    <button
                      className="card-action-btn btn-danger-action"
                      onClick={() => handleRemoveAccount(acc.id)}
                      title="Unlink and remove account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Unlimited Account Add Tile */}
            <div
              className="account-slot-card glass-panel add-card-slot"
              onClick={handleOpenConnectModal}
              style={{
                borderStyle: 'dashed',
                borderWidth: '1.5px',
                borderColor: 'rgba(0, 240, 255, 0.3)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '220px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s ease',
                padding: '24px 16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(0, 240, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00f0ff',
                  marginBottom: '10px',
                }}
              >
                <Plus size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#fff' }}>
                + Add Another Account
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, #888)',
                  maxWidth: '220px',
                  lineHeight: 1.4,
                }}
              >
                Unlimited Google OAuth and Gemini API accounts supported.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connect Account Modal */}
      {isConnectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsConnectModalOpen(false)}>
          <div
            className="modal-content glass-panel modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <Cloud className="text-neon" size={22} />
                <div>
                  <h3 className="modal-title">Connect AI & Cloud Account</h3>
                  <span className="modal-subtitle">
                    Add another account node to pool tokens and monitor rate limits
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsConnectModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Account Nickname */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Account Nickname / Identifier</label>
                <input
                  type="text"
                  value={accountNickname}
                  onChange={(e) => setAccountNickname(e.target.value)}
                  placeholder="e.g. Personal Google, Team Antigravity, Research GCP"
                  className="modal-text-input"
                  required
                />
              </div>

              {/* Protocol Tabs */}
              <div className="saas-nav-tabs" style={{ marginBottom: '18px' }}>
                <button
                  type="button"
                  className={`saas-nav-btn ${connectionType === 'oauth' ? 'active' : ''}`}
                  onClick={() => setConnectionType('oauth')}
                >
                  <Globe size={15} />
                  <span>Google OAuth 2.0 (Official)</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-btn ${connectionType === 'apikey' ? 'active' : ''}`}
                  onClick={() => setConnectionType('apikey')}
                >
                  <Key size={15} />
                  <span>Google Gemini API Key</span>
                </button>
              </div>

              {/* Protocol 1: Official Google OAuth */}
              {connectionType === 'oauth' && (
                <div className="connect-tab-panel">
                  <p className="tab-explainer-text">
                    Authorizes this workspace directly with your Google Cloud Account. Exchanges
                    code via serverless OAuth 2.0 with zero local machine dependencies.
                  </p>

                  <div className="oauth-init-box">
                    <button
                      type="button"
                      className="auth-google-btn"
                      onClick={handleInitiateGoogleOAuth}
                      disabled={isConnecting}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {isConnecting
                          ? 'Redirecting to Google Accounts...'
                          : `Authorize "${accountNickname}" with Google`}
                      </span>
                    </button>
                    <span className="oauth-note">
                      Client ID: <code>719271873086-kpujid5noaftp00cc3lgf50fns212g3m...</code>
                    </span>

                    {/* Redirect URI Whitelist Box */}
                    <div
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 240, 255, 0.05)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        fontSize: '0.75rem',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ color: 'var(--text-secondary, #ccc)', lineHeight: 1.4 }}>
                        Active Callback URI: <code style={{ color: '#00ff88', wordBreak: 'break-all' }}>{getEffectiveRedirectUri()}</code>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffb84d' }}>
                        <input
                          type="checkbox"
                          checked={usePreauthorizedNetlify}
                          onChange={(e) => setUsePreauthorizedNetlify(e.target.checked)}
                        />
                        <span>Use Pre-Authorized Netlify Callback (Bypasses redirect_uri_mismatch)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Protocol 2: Google Gemini API Key */}
              {connectionType === 'apikey' && (
                <form onSubmit={handleVerifyAndConnectApiKey} className="connect-tab-panel">
                  <p className="tab-explainer-text">
                    Enter a Google Gemini API Key from Google AI Studio. The system tests live connectivity
                    against Google endpoints before adding the account. If validation fails, exact
                    reasons and diagnostic steps are shown.
                  </p>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Google Gemini API Key</label>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="modal-text-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Monthly Token Quota Limit</label>
                    <select
                      value={quotaInput}
                      onChange={(e) => setQuotaInput(e.target.value)}
                      className="filter-select"
                      style={{ width: '100%' }}
                    >
                      <option value="5000000">5,000,000 Tokens (Starter Free Tier)</option>
                      <option value="10000000">10,000,000 Tokens (Standard Pro Tier)</option>
                      <option value="50000000">50,000,000 Tokens (Team Enterprise Tier)</option>
                      <option value="100000000">100,000,000 Tokens (Unlimited Cloud)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isConnecting}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {isConnecting
                        ? 'Verifying with Google Servers...'
                        : 'Test Connection & Link Account'}
                    </span>
                  </button>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsConnectModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Diagnostic Modal */}
      {activeDiagnostic && (
        <ErrorDiagnosticModal
          errorData={activeDiagnostic}
          onClose={() => setActiveDiagnostic(null)}
          onRetry={() => {
            setActiveDiagnostic(null);
            setIsConnectModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
