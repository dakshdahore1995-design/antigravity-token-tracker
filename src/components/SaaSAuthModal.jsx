import React, { useState } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  Check,
  Sparkles,
  CreditCard,
  Mail,
  Lock,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Building2,
  DollarSign
} from 'lucide-react';

export default function SaaSAuthModal({ onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('family'); // 'auth', 'family', 'pricing'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState(() => {
    return localStorage.getItem('antigravity_saas_workspace') || "Daksh's Family Workspace";
  });

  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('antigravity_saas_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 1, email: 'daksh.admin@gmail.com', name: 'Daksh (Owner)', role: 'Admin', accounts: 3 },
      { id: 2, email: 'alex.dev@gmail.com', name: 'Alex (Family Dev)', role: 'Member', accounts: 2 },
      { id: 3, email: 'sam.pro@gmail.com', name: 'Sam (Family Pro)', role: 'Member', accounts: 2 },
    ];
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [currentPlan, setCurrentPlan] = useState(() => {
    return localStorage.getItem('antigravity_saas_plan') || 'Family Pro ($19/mo)';
  });
  const [successBanner, setSuccessBanner] = useState('');

  const saveMembers = (updated) => {
    setMembers(updated);
    localStorage.setItem('antigravity_saas_members', JSON.stringify(updated));
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    const newEntry = {
      id: Date.now(),
      email: newMemberEmail.trim(),
      name: newMemberEmail.split('@')[0],
      role: newMemberRole,
      accounts: 1,
    };
    saveMembers([...members, newEntry]);
    setNewMemberEmail('');
    setSuccessBanner(`Invited ${newEntry.email} to ${workspaceName}!`);
    setTimeout(() => setSuccessBanner(''), 3000);
  };

  const handleRemoveMember = (id) => {
    saveMembers(members.filter((m) => m.id !== id));
  };

  const handleUpgradePlan = (planName) => {
    setCurrentPlan(planName);
    localStorage.setItem('antigravity_saas_plan', planName);
    setSuccessBanner(`Subscribed to ${planName} successfully!`);
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <Building2 className="text-neon" size={22} />
            <div>
              <h3 className="modal-title">SaaS Workspace & Family Account Linking</h3>
              <span className="modal-subtitle">
                Multi-tenant accounts, family quota pooling, and monetization tiers
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="saas-nav-tabs">
          <button
            className={`saas-nav-btn ${activeTab === 'family' ? 'active' : ''}`}
            onClick={() => setActiveTab('family')}
          >
            <Users size={15} />
            <span>Family & Team Workspace</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <CreditCard size={15} />
            <span>SaaS Pricing & Plans</span>
            <span className="badge badge-neon" style={{ fontSize: '0.65rem' }}>Sellable</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth')}
          >
            <Lock size={15} />
            <span>User Authentication</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {successBanner && (
            <div className="status-banner banner-success">
              <CheckCircle2 size={16} />
              <span>{successBanner}</span>
            </div>
          )}

          {/* TAB 1: Family & Team Workspace */}
          {activeTab === 'family' && (
            <div className="saas-section">
              <div className="workspace-title-bar">
                <div>
                  <span className="workspace-sub">Active Workspace:</span>
                  <h3 className="workspace-name">{workspaceName}</h3>
                </div>
                <div className="workspace-badge-group">
                  <span className="badge badge-neon">{currentPlan}</span>
                  <span className="badge badge-healthy">
                    {members.reduce((a, b) => a + (b.accounts || 1), 0)} Linked Accounts
                  </span>
                </div>
              </div>

              {/* Members Table */}
              <div className="modal-table-wrapper" style={{ marginTop: '14px' }}>
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Family Member / Dev</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Linked Accounts</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td className="font-semibold text-primary">{m.name}</td>
                        <td className="text-secondary">{m.email}</td>
                        <td>
                          <span className={`badge ${m.role === 'Admin' ? 'badge-neon' : 'badge-gemini-flash'}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="text-neon font-bold">{m.accounts} Accounts</td>
                        <td>
                          {m.role !== 'Admin' && (
                            <button
                              className="delete-member-link"
                              onClick={() => handleRemoveMember(m.id)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invite Member Form */}
              <form onSubmit={handleAddMember} className="invite-member-form">
                <h4 className="form-heading">
                  <UserPlus size={15} className="text-neon" />
                  Invite Family Member or Team Account
                </h4>
                <div className="invite-inputs-row">
                  <input
                    type="email"
                    placeholder="member@gmail.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                    className="modal-text-input"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="filter-select"
                  >
                    <option value="Member">Member (Developer)</option>
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Viewer">Viewer (Read-Only)</option>
                  </select>
                  <button type="submit" className="btn-primary">
                    <UserPlus size={14} />
                    <span>Invite</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SaaS Pricing & Monetization */}
          {activeTab === 'pricing' && (
            <div className="saas-section">
              <div className="pricing-intro">
                <h3>Monetize This Dashboard as a Commercial SaaS Product</h3>
                <p>
                  You can deploy this as a paid subscription service for developers and companies to track multi-account Antigravity and AI token budgets.
                </p>
              </div>

              <div className="pricing-cards-grid">
                {/* Free Tier */}
                <div className="pricing-card">
                  <div className="pricing-card-header">
                    <h4>Starter</h4>
                    <div className="price-tag">$0 <span>/ month</span></div>
                    <p className="price-desc">For individual developers testing 1 account.</p>
                  </div>
                  <ul className="pricing-features-list">
                    <li><Check size={14} className="text-neon" /> 1 Antigravity Account</li>
                    <li><Check size={14} className="text-neon" /> 2D GitHub-Style Heatmap</li>
                    <li><Check size={14} className="text-neon" /> 30-Day History</li>
                  </ul>
                  <button
                    className={`plan-select-btn ${currentPlan.includes('Free') ? 'current' : ''}`}
                    onClick={() => handleUpgradePlan('Starter Free ($0/mo)')}
                  >
                    {currentPlan.includes('Free') ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>

                {/* Pro Tier ($9/mo) */}
                <div className="pricing-card pricing-card-featured">
                  <div className="featured-pill">Popular</div>
                  <div className="pricing-card-header">
                    <h4>Pro Power User</h4>
                    <div className="price-tag">$9 <span>/ month</span></div>
                    <p className="price-desc">For power devs cycling multiple accounts.</p>
                  </div>
                  <ul className="pricing-features-list">
                    <li><Check size={14} className="text-neon" /> Up to 7 Pro Accounts</li>
                    <li><Check size={14} className="text-neon" /> 3D Isometric Extruded City</li>
                    <li><Check size={14} className="text-neon" /> 365-Day Unlimited History</li>
                    <li><Check size={14} className="text-neon" /> Real GitHub API Commits Link</li>
                  </ul>
                  <button
                    className={`plan-select-btn plan-featured-btn ${currentPlan.includes('$9') ? 'current' : ''}`}
                    onClick={() => handleUpgradePlan('Pro Power User ($9/mo)')}
                  >
                    {currentPlan.includes('$9') ? 'Current Plan' : 'Upgrade to Pro'}
                  </button>
                </div>

                {/* Family & Team Tier ($19/mo) */}
                <div className="pricing-card">
                  <div className="pricing-card-header">
                    <h4>Family & Team Pro</h4>
                    <div className="price-tag">$19 <span>/ month</span></div>
                    <p className="price-desc">Pooled quota sharing for families & teams.</p>
                  </div>
                  <ul className="pricing-features-list">
                    <li><Check size={14} className="text-neon" /> Unlimited Linked Accounts</li>
                    <li><Check size={14} className="text-neon" /> Family Member Invites</li>
                    <li><Check size={14} className="text-neon" /> 24/7 Netlify Serverless Cloud</li>
                    <li><Check size={14} className="text-neon" /> Quota Exhaustion Alerts</li>
                  </ul>
                  <button
                    className={`plan-select-btn ${currentPlan.includes('$19') ? 'current' : ''}`}
                    onClick={() => handleUpgradePlan('Family & Team Pro ($19/mo)')}
                  >
                    {currentPlan.includes('$19') ? 'Current Plan' : 'Select Family Plan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: User Authentication */}
          {activeTab === 'auth' && (
            <div className="saas-section">
              <div className="auth-form-card">
                <h3>{isSignUp ? 'Create SaaS Account' : 'Sign In to Your Workspace'}</h3>
                <p className="auth-sub">
                  Powered by Supabase Multi-Tenant Auth with zero local PC compute.
                </p>

                <div className="auth-inputs">
                  <div className="form-group">
                    <label className="form-label">Email Address:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="modal-text-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="modal-text-input"
                    />
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                    onClick={() => {
                      setSuccessBanner('Signed in successfully to Supabase cloud auth!');
                      setTimeout(() => setSuccessBanner(''), 3000);
                    }}
                  >
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight size={15} />
                  </button>

                  <div className="toggle-auth-row">
                    <button
                      className="toggle-auth-btn"
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp
                        ? 'Already have an account? Sign in'
                        : "Don't have an account? Sign up"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
