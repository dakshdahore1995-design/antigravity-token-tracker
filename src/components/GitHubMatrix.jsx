import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Search, Sparkles, ExternalLink, Calendar, Flame, Award, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function GitHubMatrix() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('antigravity_github_username') || 'torvalds';
  });
  const [inputVal, setInputVal] = useState(username);
  const [gitData, setGitData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('last');

  const fetchGitHubContributions = async (user) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Official public cloud API for GitHub contributions
      const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=${selectedYear}`);
      if (!res.ok) throw new Error('User not found or GitHub rate limit reached.');
      const data = await res.json();
      setGitData(data);
      localStorage.setItem('antigravity_github_username', user);
    } catch (err) {
      setError(err.message || 'Failed to fetch GitHub contributions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGitHubContributions(username);
  }, [selectedYear]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      const cleanUser = inputVal.trim().replace(/^@/, '');
      setUsername(cleanUser);
      fetchGitHubContributions(cleanUser);
    }
  };

  // Group contributions into weeks of 7 days
  const contributions = gitData?.contributions || [];
  const weeks = [];
  let currentWeek = [];

  contributions.forEach((day, index) => {
    const d = new Date(day.date);
    currentWeek.push({
      ...day,
      day_of_week: d.getDay(),
      month: d.toLocaleString('en-US', { month: 'short' }),
    });

    if (currentWeek.length === 7 || index === contributions.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Calculate month labels
  const monthLabels = [];
  let lastMonth = '';
  weeks.forEach((week, colIndex) => {
    const firstDay = week[0];
    if (firstDay && firstDay.month !== lastMonth) {
      lastMonth = firstDay.month;
      monthLabels.push({ colIndex, label: firstDay.month });
    }
  });

  // Streaks calculation
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  contributions.forEach((d) => {
    if (d.count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });

  for (let i = contributions.length - 1; i >= 0; i--) {
    if (contributions[i].count > 0) currentStreak++;
    else if (i < contributions.length - 1) break;
  }

  const totalCommits = gitData?.total
    ? Object.values(gitData.total).reduce((a, b) => a + b, 0)
    : contributions.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div className="github-matrix-container glass-panel">
      {/* Search & Header */}
      <div className="github-matrix-header">
        <div className="git-title-group">
          <div className="git-icon-circle">
            <GitBranch size={22} className="text-neon" />
          </div>
          <div>
            <h2 className="git-matrix-title">
              Real GitHub Contributions Matrix (Cloud Direct)
            </h2>
            <p className="git-matrix-desc">
              Connected directly to GitHub's public API • 100% Cloud-native • Zero PC compute
            </p>
          </div>
        </div>

        {/* Username Search Form */}
        <form onSubmit={handleSubmit} className="git-search-form">
          <div className="search-input-wrapper">
            <Search size={15} className="text-muted" />
            <input
              type="text"
              placeholder="Enter GitHub username..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="git-search-input"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} />
            <span>{isLoading ? 'Fetching...' : 'Fetch Git Matrix'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="status-banner banner-error">
          <span>{error}</span>
        </div>
      )}

      {/* GitHub Stats Row */}
      {gitData && (
        <div className="git-stats-grid">
          <div className="git-stat-card">
            <span className="git-stat-label">Total Contributions</span>
            <strong className="git-stat-val text-neon">{totalCommits.toLocaleString()}</strong>
            <span className="git-stat-sub">Commits & PRs</span>
          </div>

          <div className="git-stat-card">
            <span className="git-stat-label">GitHub Account</span>
            <strong className="git-stat-val text-blue">@{username}</strong>
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noreferrer"
              className="git-link-out"
            >
              <span>View Profile</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div className="git-stat-card">
            <span className="git-stat-label">Current Streak</span>
            <strong className="git-stat-val text-amber">{currentStreak} days</strong>
            <span className="git-stat-sub">Consecutive commits</span>
          </div>

          <div className="git-stat-card">
            <span className="git-stat-label">Longest Streak</span>
            <strong className="git-stat-val">{longestStreak} days</strong>
            <span className="git-stat-sub">All-time record</span>
          </div>
        </div>
      )}

      {/* 2D GitHub Heatmap Matrix */}
      {gitData && (
        <div className="heatmap-scroll-area" style={{ marginTop: '16px' }}>
          <div className="heatmap-matrix-wrapper">
            {/* Month labels */}
            <div className="heatmap-months-header">
              <div className="weekday-spacer"></div>
              <div className="months-timeline">
                {monthLabels.map((m, idx) => (
                  <div
                    key={idx}
                    className="month-label"
                    style={{ left: `${m.colIndex * 15}px` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Body */}
            <div className="heatmap-body">
              <div className="heatmap-weekdays">
                <span className="weekday-label"></span>
                <span className="weekday-label">Mon</span>
                <span className="weekday-label"></span>
                <span className="weekday-label">Wed</span>
                <span className="weekday-label"></span>
                <span className="weekday-label">Fri</span>
                <span className="weekday-label"></span>
              </div>

              <div className="heatmap-grid">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="heatmap-week-column">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className={`heatmap-cell level-${day.level || 0}`}
                        title={`${day.date}: ${day.count} contributions`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div className="heatmap-footer">
        <span className="rule-badge">Direct Source: GitHub API</span>
        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-cell level-0"></div>
          <div className="legend-cell level-1"></div>
          <div className="legend-cell level-2"></div>
          <div className="legend-cell level-3"></div>
          <div className="legend-cell level-4"></div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  );
}
