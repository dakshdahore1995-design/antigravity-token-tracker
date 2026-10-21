import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  Edit2,
  Plus,
  Trash2,
  Info,
  Check
} from 'lucide-react';

export default function AccountsHub({ accounts, onSelectAccountFilter }) {
  // Store custom account labels in localStorage
  const [accountList, setAccountList] = useState(() => {
    const saved = localStorage.getItem('antigravity_accounts_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return (accounts || []).map((a) => ({
      ...a,
      email: `account${a.id}@gmail.com`,
    }));
  });

  const [activeAccountOnDevice, setActiveAccountOnDevice] = useState(() => {
    return localStorage.getItem('antigravity_active_account_id') || '1';
  });

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editQuota, setEditQuota] = useState(10);

  // Sync state if accounts prop changes
  useEffect(() => {
    if (!localStorage.getItem('antigravity_accounts_config') && accounts && accounts.length > 0) {
      setAccountList(
        accounts.map((a) => ({
          ...a,
          email: `account${a.id}@gmail.com`,
        }))
      );
    }
  }, [accounts]);

  const saveToStorage = (updated) => {
    setAccountList(updated);
    localStorage.setItem('antigravity_accounts_config', JSON.stringify(updated));
  };

  const handleStartEdit = (acc) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditEmail(acc.email || `account${acc.id}@gmail.com`);
    setEditQuota(Math.round((acc.quota_tokens || 10_000_000) / 1_000_000));
  };

  const handleSaveEdit = (accId) => {
    const updated = accountList.map((a) => {
      if (a.id === accId) {
        return {
          ...a,
          name: editName.trim() || `Account #${accId}`,
          email: editEmail.trim(),
          quota_tokens: editQuota * 1_000_000,
          percent_used: Math.min(100, Number(((a.total_tokens / (editQuota * 1_000_000)) * 100).toFixed(1))),
        };
      }
      return a;
    });
    saveToStorage(updated);
    setEditingId(null);
  };

  const handleSetCurrentActive = (accId) => {
    setActiveAccountOnDevice(accId.toString());
    localStorage.setItem('antigravity_active_account_id', accId.toString());
  };

  const handleAddAccount = () => {
    const nextId = accountList.length + 1;
    const newAcc = {
      id: nextId,
      name: `Pro Account #${nextId}`,
      email: `account${nextId}@gmail.com`,
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      cost_usd: 0,
      calls_count: 0,
      quota_tokens: 10_000_000,
      percent_used: 0,
      status: 'Ready',
    };
    const updated = [...accountList, newAcc];
    saveToStorage(updated);
  };

  const handleDeleteAccount = (accId) => {
    if (accountList.length <= 1) return;
    const updated = accountList.filter((a) => a.id !== accId);
    saveToStorage(updated);
  };

  const totalTokensAll = accountList.reduce((sum, a) => sum + (a.total_tokens || 0), 0);

  return (
    <div className="accounts-hub-container">
      {/* Transparency Note Banner */}
      <div className="transparency-note-card glass-panel">
        <Info size={18} className="text-neon" />
        <div className="transparency-text">
          <strong>How Multi-Account Tracking Works in Antigravity:</strong>
          <span>
            Antigravity IDE saves all conversations from all your accounts locally on this machine under <code>~/.gemini/antigravity-ide/conversations/</code>. The total tokens (<strong>{(totalTokensAll / 1_000_000).toFixed(1)}M</strong>) and heatmap are 100% real local telemetry. Use this Hub to customize your {accountList.length} accounts, set their real emails, track per-account quotas, and record switches!
          </span>
        </div>
      </div>

      {/* Top Advisory Banner */}
      <div className="accounts-advisory-card glass-panel">
        <div className="advisory-left">
          <div className="advisory-icon-ring">
            <Zap size={22} className="text-neon" />
          </div>
          <div>
            <h2 className="advisory-title">{accountList.length} Pro Accounts Hub</h2>
            <p className="advisory-desc">
              Currently logged in on this PC:{' '}
              <strong className="text-neon">
                Account #{activeAccountOnDevice} (
                {accountList.find((a) => a.id.toString() === activeAccountOnDevice)?.name || `Account #${activeAccountOnDevice}`})
              </strong>
            </p>
          </div>
        </div>

        <div className="advisory-right">
          <button className="add-account-btn" onClick={handleAddAccount}>
            <Plus size={15} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="accounts-cards-grid">
        {accountList.map((acc) => {
          const isCurrentlyActive = acc.id.toString() === activeAccountOnDevice;
          const isEditing = editingId === acc.id;
          const isExhausted = acc.percent_used >= 95;
          const isWarning = acc.percent_used >= 80 && !isExhausted;

          return (
            <div
              key={acc.id}
              className={`account-card glass-panel ${
                isCurrentlyActive ? 'card-device-active' : ''
              } ${isExhausted ? 'border-exhausted' : isWarning ? 'border-warning' : ''}`}
            >
              {/* Header */}
              <div className="account-card-header">
                <div className="account-avatar">
                  <span>#{acc.id}</span>
                </div>

                <div className="account-header-info">
                  {isEditing ? (
                    <div className="edit-inputs-col">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Account Name"
                        className="edit-input-field"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="user@gmail.com"
                        className="edit-input-field edit-input-sub"
                      />
                      <div className="quota-edit-row">
                        <span>Quota (M tokens):</span>
                        <input
                          type="number"
                          value={editQuota}
                          onChange={(e) => setEditQuota(Number(e.target.value))}
                          className="quota-num-input"
                          min="1"
                          max="100"
                        />
                      </div>
                      <button
                        className="save-edit-btn"
                        onClick={() => handleSaveEdit(acc.id)}
                      >
                        <Check size={14} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="name-and-edit">
                        <h3 className="account-name">{acc.name}</h3>
                        <button
                          className="edit-pencil-btn"
                          onClick={() => handleStartEdit(acc)}
                          title="Rename / Set Email"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <span className="account-email-tag">
                        {acc.email || `account${acc.id}@gmail.com`}
                      </span>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="account-status-badge">
                    {isCurrentlyActive ? (
                      <span className="badge badge-device-active">
                        <CheckCircle2 size={11} /> Current on PC
                      </span>
                    ) : isExhausted ? (
                      <span className="badge badge-exhausted">
                        <AlertTriangle size={11} /> Exhausted
                      </span>
                    ) : isWarning ? (
                      <span className="badge badge-warning">
                        <Zap size={11} /> High Load
                      </span>
                    ) : (
                      <span className="badge badge-healthy">Ready</span>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Gauge */}
              <div className="account-gauge-area">
                <div className="gauge-metric-row">
                  <span className="gauge-label">Tokens Used:</span>
                  <strong className="gauge-val text-neon">
                    {((acc.total_tokens || 0) / 1_000_000).toFixed(2)}M /{' '}
                    {((acc.quota_tokens || 10_000_000) / 1_000_000).toFixed(0)}M
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className={`progress-fill ${
                      isExhausted ? 'fill-rose' : isWarning ? 'fill-amber' : 'fill-neon'
                    }`}
                    style={{ width: `${acc.percent_used || 0}%` }}
                  ></div>
                </div>

                <div className="gauge-sub-row">
                  <span>{acc.percent_used || 0}% of cycle quota</span>
                  <span className="text-amber">${acc.cost_usd || '0.00'} API value</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="account-action-buttons-row">
                {!isCurrentlyActive && (
                  <button
                    className="set-active-btn"
                    onClick={() => handleSetCurrentActive(acc.id)}
                    title="Mark this as the account currently signed in on your Antigravity IDE"
                  >
                    <CheckCircle2 size={13} />
                    <span>I Switched to This Account</span>
                  </button>
                )}

                <button
                  className="account-select-btn"
                  onClick={() => onSelectAccountFilter(acc.id.toString())}
                >
                  <span>Filter Heatmap</span>
                  <ArrowRight size={13} />
                </button>

                {accountList.length > 1 && (
                  <button
                    className="delete-acc-btn"
                    onClick={() => handleDeleteAccount(acc.id)}
                    title="Remove this account"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
