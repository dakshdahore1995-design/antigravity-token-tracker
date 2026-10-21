import React, { useState, useRef } from 'react';
import { HelpCircle, Info, Sparkles, ExternalLink, Calendar } from 'lucide-react';

export default function Heatmap2D({
  calendarDays,
  filteredMetric,
  selectedModel,
  selectedAccount,
  onSelectDay,
  onOpenExplainer,
  totalTokensFormatted,
}) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Group days into weeks (columns of 7 days)
  const weeks = [];
  let currentWeek = [];

  calendarDays.forEach((day, index) => {
    currentWeek.push(day);
    if (day.day_of_week === 6 || index === calendarDays.length - 1) {
      // pad week if needed
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Month labels positioning
  const monthLabels = [];
  let lastMonth = '';
  weeks.forEach((week, colIndex) => {
    const firstDay = week.find((d) => d !== null);
    if (firstDay && firstDay.month !== lastMonth) {
      lastMonth = firstDay.month;
      monthLabels.push({
        colIndex,
        label: firstDay.month,
      });
    }
  });

  // Calculate cell level based on active filters
  const getCellStats = (day) => {
    if (!day) return { level: 0, val: 0, active: false };

    let val = 0;
    if (selectedModel !== 'all') {
      const mData = day.models?.[selectedModel];
      if (mData) {
        if (filteredMetric === 'input') val = mData.in;
        else if (filteredMetric === 'output') val = mData.out;
        else if (filteredMetric === 'cache') val = mData.cache;
        else if (filteredMetric === 'cost') val = mData.cost;
        else val = mData.total;
      }
    } else if (selectedAccount !== 'all') {
      const aData = day.accounts?.[selectedAccount];
      if (aData) {
        if (filteredMetric === 'input') val = aData.in;
        else if (filteredMetric === 'output') val = aData.out;
        else if (filteredMetric === 'cost') val = aData.cost;
        else val = aData.total;
      }
    } else {
      if (filteredMetric === 'input') val = day.input_tokens;
      else if (filteredMetric === 'output') val = day.output_tokens;
      else if (filteredMetric === 'cache') val = day.cached_tokens;
      else if (filteredMetric === 'cost') val = day.cost_usd;
      else val = day.total_tokens;
    }

    // Rules:
    // < 50 tokens: Level 0 (no color / dark)
    // 50 - 500k: Level 1
    // 500k - 2M: Level 2
    // 2M - 5M: Level 3
    // 5M - 10M: Level 4
    // > 10M: Level 5 (complete blinding neon green glow)
    let level = 0;
    if (val < 50) level = 0;
    else if (val < 500_000) level = 1;
    else if (val < 2_000_000) level = 2;
    else if (val < 5_000_000) level = 3;
    else if (val < 10_000_000) level = 4;
    else level = 5;

    return { level, val, active: val >= 50 };
  };

  const handleCellHover = (e, day) => {
    if (!day) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cellRect = e.target.getBoundingClientRect();
    setTooltipPos({
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top - 12,
    });
    setHoveredDay(day);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="heatmap-container glass-panel" ref={containerRef}>
      {/* Heatmap Header */}
      <div className="heatmap-header">
        <div className="heatmap-title-group">
          <h2 className="heatmap-title">
            <span className="text-neon">{totalTokensFormatted}</span> contributions in the tracked period
          </h2>
          <span className="heatmap-subtitle">
            Hover over any square for token metrics • Click square to inspect sessions
          </span>
        </div>

        <div className="heatmap-actions-right">
          <button 
            className="learn-more-btn"
            onClick={onOpenExplainer}
          >
            <HelpCircle size={14} />
            <span>Learn how we count AI tokens</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="heatmap-scroll-area">
        <div className="heatmap-matrix-wrapper">
          {/* Month Headers */}
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

          {/* Matrix body with Weekday labels and Columns */}
          <div className="heatmap-body">
            {/* Weekday labels */}
            <div className="heatmap-weekdays">
              <span className="weekday-label"></span>
              <span className="weekday-label">Mon</span>
              <span className="weekday-label"></span>
              <span className="weekday-label">Wed</span>
              <span className="weekday-label"></span>
              <span className="weekday-label">Fri</span>
              <span className="weekday-label"></span>
            </div>

            {/* Weeks columns */}
            <div className="heatmap-grid">
              {weeks.map((week, wIndex) => (
                <div key={wIndex} className="heatmap-week-column">
                  {week.map((day, dIndex) => {
                    if (!day) {
                      return <div key={dIndex} className="heatmap-cell empty"></div>;
                    }
                    const { level, val, active } = getCellStats(day);
                    const isNeonBlaster = level === 5;

                    return (
                      <div
                        key={day.date}
                        className={`heatmap-cell level-${level} ${isNeonBlaster ? 'neon-blaster' : ''}`}
                        data-level={level}
                        onMouseEnter={(e) => handleCellHover(e, day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => onSelectDay(day)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Footer: Legend bar */}
      <div className="heatmap-footer">
        <div className="heatmap-notes">
          <span className="rule-badge">Rule: &lt;50 tokens = Dim / Uncolored</span>
          <span className="rule-badge neon-badge">&gt;10M tokens = Blinding Neon Green</span>
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-cell level-0" title="< 50 tokens (Empty)"></div>
          <div className="legend-cell level-1" title="50 - 500k tokens"></div>
          <div className="legend-cell level-2" title="500k - 2M tokens"></div>
          <div className="legend-cell level-3" title="2M - 5M tokens"></div>
          <div className="legend-cell level-4" title="5M - 10M tokens"></div>
          <div className="legend-cell level-5 neon-blaster" title="> 10M tokens (Neon Glow)"></div>
          <span className="legend-label">More</span>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && (
        <div
          className="heatmap-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="tooltip-header">
            <strong>{hoveredDay.date}</strong>
            <span className="tooltip-badge">
              {hoveredDay.calls_count} calls
            </span>
          </div>

          <div className="tooltip-body">
            <div className="tooltip-row highlight-row">
              <span>Total Tokens:</span>
              <strong className="text-neon">{formatNumber(hoveredDay.total_tokens)}</strong>
            </div>
            <div className="tooltip-row">
              <span>Input Tokens:</span>
              <span>{formatNumber(hoveredDay.input_tokens)}</span>
            </div>
            <div className="tooltip-row">
              <span>Output Tokens:</span>
              <span>{formatNumber(hoveredDay.output_tokens)}</span>
            </div>
            {hoveredDay.cached_tokens > 0 && (
              <div className="tooltip-row text-cyan">
                <span>Cached Tokens:</span>
                <span>{formatNumber(hoveredDay.cached_tokens)}</span>
              </div>
            )}
            <div className="tooltip-row">
              <span>API Market Cost:</span>
              <span className="text-amber">${hoveredDay.cost_usd?.toFixed(2)}</span>
            </div>
            {hoveredDay.top_model && (
              <div className="tooltip-row text-blue">
                <span>Top Model:</span>
                <span className="text-truncate-sm">{hoveredDay.top_model}</span>
              </div>
            )}
          </div>
          <div className="tooltip-hint">Click day to view all conversations</div>
        </div>
      )}
    </div>
  );
}
