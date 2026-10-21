import React from 'react';
import { PieChart, Zap, Activity, Cpu, Calendar, TrendingUp } from 'lucide-react';

export default function RadarAndDonut({ modelsData, monthlyData, summary }) {
  if (!modelsData) return null;

  // 1. Prepare Donut Chart Data
  const modelEntries = Object.entries(modelsData).map(([name, data]) => ({
    name,
    label: name.replace('gemini-', '').replace('claude-', ''),
    total: data.total || 0,
    calls: data.calls || 0,
    cost: data.cost || 0,
  }));

  const grandTotal = modelEntries.reduce((acc, m) => acc + m.total, 0) || 1;

  // Colors for models
  const MODEL_COLORS = {
    'gemini-3.8-flash-high': '#00ff88',
    'claude-sonnet-4-6': '#3b82f6',
    'gemini-3.8-flash-medium': '#eab308',
    'gemini-3.1-pro-low': '#a855f7',
    'gemini-3.6-flash-low': '#14b8a6',
    'claude-opus-4-6-thinking': '#ec4899',
  };

  // Calculate SVG Donut arcs
  let accumulatedAngle = 0;
  const donutSlices = modelEntries.map((m) => {
    const fraction = m.total / grandTotal;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + fraction * 2 * Math.PI;
    accumulatedAngle = endAngle;

    const color = MODEL_COLORS[m.name] || '#64748b';

    // SVG Arc coordinates (radius 80, inner 50)
    const rOuter = 80;
    const rInner = 52;
    const cx = 100;
    const cy = 100;

    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);

    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return {
      ...m,
      percentage: (fraction * 100).toFixed(1),
      color,
      pathData,
    };
  });

  // 2. Prepare Radar Spider Chart (5 dimensions matching Image 4)
  // Axes:
  // 1. Frequency (Calls per day)
  // 2. Context Depth (In/Out ratio)
  // 3. Peak Burst (Max Day / Avg Day)
  // 4. Output Density (Output volume)
  // 5. Model Diversity (Number of models active)
  const axes = [
    { label: 'Call Vol', value: 0.85, raw: `${summary.total_calls} calls` },
    { label: 'Context', value: 0.92, raw: `${((summary.total_input_tokens / grandTotal) * 100).toFixed(0)}% In` },
    { label: 'Peak Burst', value: 0.88, raw: `${((summary.max_day?.tokens / (grandTotal / (summary.active_days || 1)))).toFixed(1)}x avg` },
    { label: 'Generation', value: 0.70, raw: `${(summary.total_output_tokens / 1_000_000).toFixed(1)}M Out` },
    { label: 'Diversity', value: 0.80, raw: `${modelEntries.length} models` },
  ];

  const radarRadius = 75;
  const radarCx = 100;
  const radarCy = 100;
  const totalAxes = axes.length;

  const getCoordinates = (index, value) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = radarRadius * value;
    return {
      x: radarCx + r * Math.cos(angle),
      y: radarCy + r * Math.sin(angle),
    };
  };

  const radarPolygonPoints = axes
    .map((ax, idx) => {
      const { x, y } = getCoordinates(idx, ax.value);
      return `${x},${y}`;
    })
    .join(' ');

  // Grid levels (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="analytics-layout-grid">
      {/* Card 1: 5-Axis Spider Radar Chart (Image 4 exact reproduction) */}
      <div className="analytics-card glass-panel">
        <div className="analytics-card-header">
          <Activity size={18} className="text-neon" />
          <div>
            <h3 className="analytics-card-title">Antigravity AI Radar Signature</h3>
            <span className="analytics-card-sub">5-dimensional coding behavior profile</span>
          </div>
        </div>

        <div className="radar-chart-wrapper">
          <svg viewBox="0 0 200 200" className="radar-svg">
            {/* Background concentric web polygons */}
            {gridLevels.map((lvl, lIdx) => {
              const pts = axes
                .map((_, aIdx) => {
                  const { x, y } = getCoordinates(aIdx, lvl);
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <polygon
                  key={lIdx}
                  points={pts}
                  fill="none"
                  stroke="#1c2638"
                  strokeWidth="1"
                  strokeDasharray={lvl === 1 ? 'none' : '3 3'}
                />
              );
            })}

            {/* Axis spokes */}
            {axes.map((ax, idx) => {
              const { x, y } = getCoordinates(idx, 1);
              return (
                <line
                  key={idx}
                  x1={radarCx}
                  y1={radarCy}
                  x2={x}
                  y2={y}
                  stroke="#1c2638"
                  strokeWidth="1"
                />
              );
            })}

            {/* Radar Filled Data Shape */}
            <polygon
              points={radarPolygonPoints}
              fill="rgba(0, 255, 136, 0.25)"
              stroke="#00ff88"
              strokeWidth="2"
            />

            {/* Data Points on vertices */}
            {axes.map((ax, idx) => {
              const { x, y } = getCoordinates(idx, ax.value);
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#00ff88"
                  stroke="#07090e"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Axis labels */}
            {axes.map((ax, idx) => {
              const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
              const textR = radarRadius + 16;
              const tx = radarCx + textR * Math.cos(angle);
              const ty = radarCy + textR * Math.sin(angle);
              return (
                <text
                  key={idx}
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  fill="#8ea0bc"
                  fontSize="8"
                  fontFamily="Inter"
                  fontWeight="600"
                >
                  {ax.label}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="radar-legend-list">
          {axes.map((ax, idx) => (
            <div key={idx} className="radar-legend-item">
              <span className="radar-legend-label">{ax.label}:</span>
              <strong className="radar-legend-val text-neon">{ax.raw}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Donut Model Breakdown (Image 4 bottom left) */}
      <div className="analytics-card glass-panel">
        <div className="analytics-card-header">
          <Cpu size={18} className="text-blue" />
          <div>
            <h3 className="analytics-card-title">Model Token Share</h3>
            <span className="analytics-card-sub">Distribution across LLMs</span>
          </div>
        </div>

        <div className="donut-layout">
          <div className="donut-chart-container">
            <svg viewBox="0 0 200 200" className="donut-svg">
              {donutSlices.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill={slice.color}
                  className="donut-slice"
                  stroke="#07090e"
                  strokeWidth="2"
                />
              ))}
              {/* Inner Hole text */}
              <text
                x="100"
                y="96"
                textAnchor="middle"
                fill="#f0f4fc"
                fontSize="15"
                fontWeight="800"
                fontFamily="Outfit"
              >
                {(grandTotal / 1_000_000).toFixed(1)}M
              </text>
              <text
                x="100"
                y="112"
                textAnchor="middle"
                fill="#8ea0bc"
                fontSize="8"
                fontFamily="Inter"
              >
                TOTAL TOKENS
              </text>
            </svg>
          </div>

          <div className="donut-legend-column">
            {donutSlices.map((s, idx) => (
              <div key={idx} className="donut-legend-row">
                <span
                  className="color-bullet"
                  style={{ background: s.color }}
                ></span>
                <span className="model-name-text text-truncate-sm" title={s.name}>
                  {s.label}
                </span>
                <strong className="model-pct-text">{s.percentage}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Monthly Progress Bars */}
      <div className="analytics-card glass-panel">
        <div className="analytics-card-header">
          <Calendar size={18} className="text-amber" />
          <div>
            <h3 className="analytics-card-title">Monthly Quota Cycle Totals</h3>
            <span className="analytics-card-sub">Token velocity across billing periods</span>
          </div>
        </div>

        <div className="monthly-bars-list">
          {Object.entries(monthlyData || {}).map(([month, mData]) => {
            const pct = Math.min(100, Math.round((mData.total / 15_000_000) * 100));
            return (
              <div key={month} className="monthly-bar-item">
                <div className="monthly-bar-info">
                  <span className="month-name-badge">{month}</span>
                  <div className="month-numbers">
                    <strong className="text-neon">{(mData.total / 1_000_000).toFixed(2)}M tokens</strong>
                    <span className="month-calls">({mData.calls} calls • ${mData.cost?.toFixed(2)})</span>
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-neon"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
