import React from 'react';
import {
  MessageSquare,
  Hash,
  Cpu,
  Calendar,
  Flame,
  Award,
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function StatsBanner({ summary, filteredTokens, filteredCost }) {
  if (!summary) return null;

  // Format large numbers
  const formatTokens = (val) => {
    if (!val && val !== 0) return '0';
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'K';
    return val.toLocaleString();
  };

  const displayTokens = filteredTokens !== undefined ? filteredTokens : summary.total_tokens;
  const displayCost = filteredCost !== undefined ? filteredCost : summary.total_cost_usd;

  return (
    <div className="stats-banner-container glass-panel">
      {/* 8 Primary Cards matching Image 1 layout */}
      <div className="stats-grid-primary">
        {/* Sessions */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Sessions</span>
            <MessageSquare size={14} className="stat-card-icon" />
          </div>
          <div className="stat-card-value">{summary.total_sessions}</div>
          <div className="stat-card-sub">Agent Conversations</div>
        </div>

        {/* Messages */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Messages</span>
            <Hash size={14} className="stat-card-icon" />
          </div>
          <div className="stat-card-value">{summary.total_calls.toLocaleString()}</div>
          <div className="stat-card-sub">LLM Tool & Step Calls</div>
        </div>

        {/* Total Tokens - Circled/Glowing Highlight matching Image 1 */}
        <div className="stat-card stat-card-highlight">
          <div className="stat-highlight-ring"></div>
          <div className="stat-card-header">
            <span className="stat-card-title highlight-text">Total tokens</span>
            <Zap size={14} className="stat-card-icon text-neon" />
          </div>
          <div className="stat-card-value text-neon-glow">
            {formatTokens(displayTokens)}
          </div>
          <div className="stat-card-sub highlight-sub">
            {(displayTokens).toLocaleString()} tokens
          </div>
        </div>

        {/* Active Days */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Active days</span>
            <Calendar size={14} className="stat-card-icon" />
          </div>
          <div className="stat-card-value">{summary.active_days}</div>
          <div className="stat-card-sub">Productive Days</div>
        </div>

        {/* Current Streak */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Current streak</span>
            <Flame size={14} className="stat-card-icon text-amber" />
          </div>
          <div className="stat-card-value text-amber">
            {summary.current_streak}d
          </div>
          <div className="stat-card-sub">Days Active In A Row</div>
        </div>

        {/* Longest Streak */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Longest streak</span>
            <Award size={14} className="stat-card-icon text-amber" />
          </div>
          <div className="stat-card-value">{summary.longest_streak}d</div>
          <div className="stat-card-sub">Personal All-time Record</div>
        </div>

        {/* Peak Hour */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Peak hour</span>
            <Clock size={14} className="stat-card-icon" />
          </div>
          <div className="stat-card-value">{summary.peak_hour}</div>
          <div className="stat-card-sub">Most Active Coding Time</div>
        </div>

        {/* Favorite Model */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Favorite model</span>
            <Cpu size={14} className="stat-card-icon text-blue" />
          </div>
          <div className="stat-card-value text-truncate-sm text-blue">
            {summary.favorite_model.replace('gemini-', '').replace('claude-', '')}
          </div>
          <div className="stat-card-sub">{summary.favorite_model}</div>
        </div>
      </div>

      {/* Secondary Row: Max Day, Min Day, Market Cost, Cached Savings */}
      <div className="stats-grid-secondary">
        <div className="mini-stat-card">
          <TrendingUp size={14} className="text-neon" />
          <span className="mini-label">Max Day Peak:</span>
          <span className="mini-value text-neon">
            {formatTokens(summary.max_day?.tokens)}
          </span>
          <span className="mini-sub">({summary.max_day?.date})</span>
        </div>

        <div className="mini-stat-card">
          <TrendingUp size={14} className="text-muted" style={{ transform: 'rotate(180deg)' }} />
          <span className="mini-label">Min Active Day:</span>
          <span className="mini-value">
            {formatTokens(summary.min_day?.tokens)}
          </span>
          <span className="mini-sub">({summary.min_day?.date})</span>
        </div>

        <div className="mini-stat-card">
          <DollarSign size={14} className="text-amber" />
          <span className="mini-label">Market Value Equiv:</span>
          <span className="mini-value text-amber">
            ${displayCost?.toFixed(2) || '0.00'}
          </span>
          <span className="mini-sub">API standard pricing</span>
        </div>

        <div className="mini-stat-card">
          <ShieldCheck size={14} className="text-cyan" />
          <span className="mini-label">Prompt Cache Saved:</span>
          <span className="mini-value text-cyan">
            {formatTokens(summary.total_cached_tokens)}
          </span>
          <span className="mini-sub">Zero-latency tokens</span>
        </div>
      </div>

      {/* Dynamic Comparison Quote matching Image 1: "You've used ~5720x more tokens than The Little Prince." */}
      <div className="stats-quote-footer">
        <Sparkles size={14} className="text-neon" />
        <span>
          You've used{' '}
          <strong>
            ~{summary.little_prince_multiplier?.toLocaleString()}x
          </strong>{' '}
          more tokens than <em>The Little Prince</em> (and ~
          {Math.round(summary.total_tokens / 780000)}x more than <em>War and Peace</em>)!
        </span>
      </div>
    </div>
  );
}
