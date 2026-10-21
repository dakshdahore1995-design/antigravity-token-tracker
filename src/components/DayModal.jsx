import React from 'react';
import { X, Calendar, Zap, DollarSign, Cpu, Users, MessageSquare, ArrowUpRight } from 'lucide-react';

export default function DayModal({ day, onClose }) {
  if (!day) return null;

  const formatNumber = (n) => (n || 0).toLocaleString();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <Calendar className="text-neon" size={20} />
            <div>
              <h3 className="modal-title">Activity Inspector: {day.date}</h3>
              <span className="modal-subtitle">
                {day.day_of_week !== undefined
                  ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.day_of_week]
                  : ''} • {day.calls_count} LLM Calls
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Top Token Summary Row */}
          <div className="modal-summary-grid">
            <div className="modal-stat-box">
              <span className="stat-label">Total Daily Tokens</span>
              <strong className="stat-value text-neon">
                {formatNumber(day.total_tokens)}
              </strong>
            </div>

            <div className="modal-stat-box">
              <span className="stat-label">Prompt Input</span>
              <strong className="stat-value">
                {formatNumber(day.input_tokens)}
              </strong>
            </div>

            <div className="modal-stat-box">
              <span className="stat-label">Completion Output</span>
              <strong className="stat-value">
                {formatNumber(day.output_tokens)}
              </strong>
            </div>

            <div className="modal-stat-box">
              <span className="stat-label">API Market Value</span>
              <strong className="stat-value text-amber">
                ${day.cost_usd?.toFixed(2) || '0.00'}
              </strong>
            </div>
          </div>

          {/* Model Breakdown Section */}
          <div className="modal-section">
            <h4 className="modal-section-title">
              <Cpu size={15} className="text-blue" />
              Models Used on this Day
            </h4>
            <div className="modal-table-wrapper">
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Calls</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Total Tokens</th>
                    <th>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(day.models || {}).map(([modelName, m]) => (
                    <tr key={modelName}>
                      <td className="text-truncate-sm font-semibold">{modelName}</td>
                      <td>{m.calls}</td>
                      <td>{formatNumber(m.in)}</td>
                      <td>{formatNumber(m.out)}</td>
                      <td className="text-neon font-bold">{formatNumber(m.total)}</td>
                      <td className="text-amber">${m.cost?.toFixed(3)}</td>
                    </tr>
                  ))}
                  {Object.keys(day.models || {}).length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-muted text-center py-4">
                        No model activity recorded on this day (&lt; 50 tokens).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Account Allocation Section */}
          {day.accounts && Object.keys(day.accounts).length > 0 && (
            <div className="modal-section">
              <h4 className="modal-section-title">
                <Users size={15} className="text-cyan" />
                Accounts Active on this Day
              </h4>
              <div className="modal-accounts-list">
                {Object.entries(day.accounts).map(([accId, acc]) => (
                  <div key={accId} className="modal-account-pill">
                    <span>Account #{accId}</span>
                    <strong className="text-neon">{formatNumber(acc.total)} tokens</strong>
                    <span className="text-muted">({acc.calls} calls)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
