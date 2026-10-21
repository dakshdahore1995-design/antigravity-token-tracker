import React, { useState } from 'react';
import { Clock, MessageSquare, Cpu, Calendar, Zap, DollarSign, ChevronRight, Hash } from 'lucide-react';

export default function ActivityTimeline({ conversations, onSelectDay }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('all');

  if (!conversations || conversations.length === 0) return null;

  // Filter conversations
  const filtered = conversations.filter((c) => {
    const matchesModel = modelFilter === 'all' || c.model === modelFilter;
    const matchesSearch = !searchTerm || c.cid.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesModel && matchesSearch;
  });

  const uniqueModels = Array.from(new Set(conversations.map((c) => c.model)));

  // Format date
  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="timeline-container glass-panel">
      <div className="timeline-header">
        <div>
          <h2 className="timeline-title">Antigravity Coding Session Activity</h2>
          <span className="timeline-subtitle">
            Recent agent sessions with granular token counts and model traces
          </span>
        </div>

        <div className="timeline-filters">
          <input
            type="text"
            placeholder="Search conversation ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="timeline-search-input"
          />

          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="timeline-select"
          >
            <option value="all">All Models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="timeline-list">
        {filtered.slice(0, 30).map((conv, idx) => {
          const isClaude = conv.model.includes('claude');
          const isFlash = conv.model.includes('flash');
          const isPro = conv.model.includes('pro');

          return (
            <div key={conv.cid || idx} className="timeline-item">
              <div className="timeline-item-icon">
                <MessageSquare size={16} />
              </div>

              <div className="timeline-item-content">
                <div className="timeline-item-top">
                  <div className="timeline-cid-row">
                    <span className="cid-code">ID: {conv.cid.substring(0, 16)}...</span>
                    <span className="account-tag">Account #{conv.account_id}</span>
                  </div>
                  <span className="timeline-time">{formatDate(conv.last_seen)}</span>
                </div>

                <div className="timeline-item-meta">
                  <span
                    className={`badge ${
                      isClaude
                        ? 'badge-claude'
                        : isFlash
                        ? 'badge-gemini-flash'
                        : isPro
                        ? 'badge-gemini-pro'
                        : 'badge-neon'
                    }`}
                  >
                    <Cpu size={12} />
                    {conv.model}
                  </span>

                  <span className="meta-tokens text-neon">
                    <Zap size={13} />
                    <strong>{(conv.total_tokens).toLocaleString()}</strong> tokens
                  </span>

                  <span className="meta-sub">
                    In: {(conv.input_tokens).toLocaleString()} • Out: {(conv.output_tokens).toLocaleString()}
                  </span>

                  <span className="meta-cost text-amber">
                    <DollarSign size={13} />
                    ${conv.cost_usd}
                  </span>

                  <span className="meta-calls">
                    <Hash size={13} />
                    {conv.calls_count} steps
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
