import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Box,
  PieChart,
  Users,
  Clock,
  RefreshCw,
  Upload,
  Globe,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Edit2,
  Check,
  GitBranch,
  Building2
} from 'lucide-react';

export default function Header({
  userName,
  setUserName,
  activeTab,
  setActiveTab,
  timeRange,
  setTimeRange,
  metricType,
  setMetricType,
  selectedModel,
  setSelectedModel,
  selectedAccount,
  setSelectedAccount,
  modelsList,
  accountsList,
  onOpenSync,
  onOpenSaaS,
  totalTokensFormatted,
  activeDaysCount
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="header-container glass-panel">
      {/* Top Bar: Personalized greeting + Quick Action buttons */}
      <div className="header-top">
        <div className="header-greeting-wrapper">
          <div className="greeting-icon">
            <Sparkles className="icon-sparkle" />
          </div>
          <div className="greeting-text-area">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="greeting-edit-form">
                <span>What's up next, </span>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                  onBlur={handleSaveName}
                  className="greeting-input"
                />
                <button type="submit" className="greeting-save-btn">
                  <Check size={16} />
                </button>
              </form>
            ) : (
              <h1 className="greeting-title" onClick={() => setIsEditingName(true)} title="Click to rename">
                What's up next, {userName}?
                <Edit2 size={15} className="edit-icon-hint" />
              </h1>
            )}
            <p className="greeting-subtitle">
              Antigravity AI Token Matrix • 
              <span className="live-pulse-badge">
                <span className="pulse-dot"></span> ☁️ 100% Cloud Netlify Serverless (24/7 Anywhere)
              </span>
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="action-btn action-saas"
            onClick={onOpenSaaS}
            title="SaaS Subscriptions, Multi-Account Family Workspace & Monetization"
          >
            <Building2 size={15} />
            <span>Family & SaaS</span>
            <span className="badge badge-neon" style={{ fontSize: '0.65rem' }}>Sellable</span>
          </button>

          <button 
            className="action-btn action-sync"
            onClick={() => setActiveTab('accounts')}
            title="Connect your 7 Google accounts via OAuth in the cloud"
          >
            <Users size={15} />
            <span>Connect Google Accounts</span>
          </button>

          <button 
            onClick={onOpenSync}
            className="action-btn action-netlify"
            title="View Netlify Cloud Serverless Functions status"
          >
            <Globe size={15} />
            <span>Netlify Cloud 24/7</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="header-nav-row">
        <div className="nav-tabs-group">
          <button
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Layers size={16} />
            <span>Overview & Heatmap</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'git' ? 'active' : ''}`}
            onClick={() => setActiveTab('git')}
          >
            <GitBranch size={16} />
            <span>Real GitHub Map</span>
            <span className="tab-pill">Cloud Git</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'isometric' ? 'active' : ''}`}
            onClick={() => setActiveTab('isometric')}
          >
            <Box size={16} />
            <span>3D Isometric Matrix</span>
            <span className="tab-pill">3D</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <PieChart size={16} />
            <span>Radar & Model Split</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <Users size={16} />
            <span>Pro Accounts Hub</span>
            <span className="tab-pill-green">{accountsList.length || 7} Accounts</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={16} />
            <span>Daily Activity</span>
          </button>
        </div>

        {/* Time Filter Tabs (Matching Image 1: All | 30d | 7d) */}
        <div className="time-filter-group">
          {[
            { id: 'all', label: 'All' },
            { id: 'year', label: '365d' },
            { id: '30d', label: '30d' },
            { id: '7d', label: '7d' },
          ].map((t) => (
            <button
              key={t.id}
              className={`time-filter-pill ${timeRange === t.id ? 'active' : ''}`}
              onClick={() => setTimeRange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Filters: Accounts, Models, Metric Selector */}
      <div className="header-subfilters-bar">
        <div className="filter-item">
          <span className="filter-label">Account:</span>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="filter-select"
          >
            <option value="all">⚡ All {accountsList.length || 7} Accounts (Unified Pool)</option>
            {accountsList.map((acc) => (
              <option key={acc.id} value={acc.id}>
                Account #{acc.id} — {acc.name} ({acc.percent_used}% quota)
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <span className="filter-label">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="filter-select"
          >
            <option value="all">🤖 All Models Used</option>
            {modelsList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <span className="filter-label">Metric View:</span>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="filter-select"
          >
            <option value="total">📊 Total Tokens (In + Out)</option>
            <option value="input">📥 Input Tokens Only</option>
            <option value="output">📤 Output Tokens Only</option>
            <option value="cache">⚡ Cached / Reasoning Tokens</option>
            <option value="cost">💰 Market Cost ($ Equivalence)</option>
          </select>
        </div>

        <div className="filter-summary-badge">
          <span>Active Filter: </span>
          <strong>{totalTokensFormatted}</strong> tokens across <strong>{activeDaysCount}</strong> days
        </div>
      </div>
    </header>
  );
}
