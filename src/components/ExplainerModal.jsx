import React from 'react';
import { X, HelpCircle, Zap, ShieldCheck, Cpu, DollarSign, Layers } from 'lucide-react';

export default function ExplainerModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <HelpCircle className="text-neon" size={20} />
            <div>
              <h3 className="modal-title">How Antigravity Counts AI Tokens & Credits</h3>
              <span className="modal-subtitle">
                Understanding token mechanics, prompt caching, and contribution levels
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Section 1: Token Breakdown */}
          <div className="explainer-section">
            <h4 className="explainer-heading">
              <Zap size={16} className="text-neon" />
              Token Classifications
            </h4>
            <div className="explainer-cards-grid">
              <div className="explainer-card">
                <strong>📥 Input / Prompt Tokens</strong>
                <p>
                  Includes your project directory structure, open editor buffers, instructions, tools schema, and previous conversation history sent to the LLM.
                </p>
              </div>

              <div className="explainer-card">
                <strong>📤 Output / Completion Tokens</strong>
                <p>
                  Includes the AI's internal reasoning chain, code modifications, bash command proposals, and responses generated back to the IDE.
                </p>
              </div>

              <div className="explainer-card">
                <strong>⚡ Cached Tokens (Zero Cost)</strong>
                <p>
                  Antigravity uses context caching on repeated system prompts and codebase indexes, reducing latency and saving API quota.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Heatmap Level Rules */}
          <div className="explainer-section">
            <h4 className="explainer-heading">
              <Layers size={16} className="text-neon" />
              Contribution Grid Coloring Rules
            </h4>
            <div className="levels-guide-list">
              <div className="level-guide-row">
                <span className="legend-cell level-0"></span>
                <span className="level-name">Level 0 (Unlit):</span>
                <span className="level-desc">&lt; 50 tokens (Empty / Resting day)</span>
              </div>
              <div className="level-guide-row">
                <span className="legend-cell level-1"></span>
                <span className="level-name">Level 1:</span>
                <span className="level-desc">50 - 500,000 tokens (Light usage)</span>
              </div>
              <div className="level-guide-row">
                <span className="legend-cell level-2"></span>
                <span className="level-name">Level 2:</span>
                <span className="level-desc">500,000 - 2,000,000 tokens (Standard coding session)</span>
              </div>
              <div className="level-guide-row">
                <span className="legend-cell level-3"></span>
                <span className="level-name">Level 3:</span>
                <span className="level-desc">2,000,000 - 5,000,000 tokens (Heavy pair programming)</span>
              </div>
              <div className="level-guide-row">
                <span className="legend-cell level-4"></span>
                <span className="level-name">Level 4:</span>
                <span className="level-desc">5,000,000 - 10,000,000 tokens (Multi-file full refactors)</span>
              </div>
              <div className="level-guide-row">
                <span className="legend-cell level-5 neon-blaster"></span>
                <span className="level-name text-neon">Level 5 (Neon Blast):</span>
                <span className="level-desc">&gt; 10,000,000 tokens (Extreme coding marathon!)</span>
              </div>
            </div>
          </div>

          {/* Section 3: 6 Pro Accounts Strategy */}
          <div className="explainer-section">
            <h4 className="explainer-heading">
              <Cpu size={16} className="text-blue" />
              6 Pro Accounts Cycling Strategy
            </h4>
            <p className="explainer-text">
              Because you cycle through 6 Pro accounts as quotas finish, this matrix aggregates all conversations across all 6 accounts into a single unbroken timeline. You never lose your streak, peak stats, or historical totals when switching accounts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
