import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import "./HealthPatternAnalysis.css";

const PERIODS = [
  { key: "day", label: "24 Hours" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "all", label: "All History" }
];

export default function HealthPatternAnalysis({ parent, onRecordVitals = null }) {
  const [prevParentId, setPrevParentId] = useState(parent?._id);
  const [period, setPeriod] = useState("week");
  const [trendsData, setTrendsData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const inFlightRef = useRef(parent?._id);

  // Derived loading state avoids cascading renders from synchronous setState in effects
  const isLoading = Boolean(parent?._id) && !errorMessage && (trendsData === null || trendsData?.period !== period);

  // Reset state during render when switching parents (idiomatic React pattern)
  if (parent?._id !== prevParentId) {
    setPrevParentId(parent?._id);
    setTrendsData(null);
    setErrorMessage("");
  }

  useEffect(() => {
    if (!parent?._id) return;

    let isSubscribed = true;
    const currentParentId = parent._id;
    inFlightRef.current = currentParentId;

    API.get(`/health/${currentParentId}/trends?period=${period}`)
      .then((res) => {
        if (!isSubscribed || inFlightRef.current !== currentParentId) return;
        setTrendsData(res.data);
        setErrorMessage("");
      })
      .catch((err) => {
        if (!isSubscribed || inFlightRef.current !== currentParentId) return;
        const msg = err.response?.data?.message || err.message;
        setErrorMessage(msg || "Unable to load health trends. Please retry.");
        setTrendsData(null);
      });

    return () => {
      isSubscribed = false;
    };
  }, [parent?._id, period]);

  if (!parent) {
    return (
      <section className="trends-card empty-trends">
        <p>Select a parent to view health trends and historical patterns.</p>
      </section>
    );
  }

  const latest = trendsData?.latest;
  const changes = trendsData?.changes || {};
  const trends = trendsData?.trends || { heartRate: [], spO2: [], bloodPressure: [], steps: [] };
  const flags = trendsData?.flags || [];
  const metricsAvailable = trendsData?.metricsAvailable || { heartRate: 0, spO2: 0, bloodPressure: 0, steps: 0 };

  return (
    <section className="trends-card" aria-label="Health Pattern Analysis">
      {/* Header */}
      <header className="trends-header">
        <div>
          <div className="trends-title-row">
            <h2>Health Pattern Analysis</h2>
            <span className="trends-badge">Rule-Based Clinical Indicators</span>
          </div>
          <small className="trends-subtitle">
            Historical measurements and change tracking for <strong>{parent.name}</strong>
          </small>
        </div>

        {/* Period Selector Tabs */}
        <div className="trends-period-selector" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`period-btn ${period === p.key ? "active" : ""}`}
              onClick={() => setPeriod(p.key)}
              disabled={isLoading}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="trends-loading-state">
          <span className="loading-spinner" />
          <p>Analyzing health records for {parent.name}...</p>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="trends-error-state">
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={() => setPeriod((prev) => prev)} className="btn-retry-trends">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && trendsData && (
        <div className="trends-content">
          {/* Summary Cards Grid */}
          <div className="metrics-summary-grid">
            {/* Heart Rate Card */}
            <article className="trend-metric-box">
              <div className="metric-box-head">
                <span className="metric-title">Heart Rate</span>
                <span className="metric-count">{metricsAvailable.heartRate} reading(s)</span>
              </div>
              <div className="metric-value-row">
                <strong>{latest?.heartRate ? `${latest.heartRate} bpm` : "--"}</strong>
                {changes.heartRate && (
                  <span className={`change-pill change-${changes.heartRate.direction}`}>
                    {changes.heartRate.direction === "up" ? "▲ +" : changes.heartRate.direction === "down" ? "▼ " : "● "}
                    {changes.heartRate.difference} bpm
                  </span>
                )}
              </div>
              <small className="metric-meta">
                {latest?.heartRate ? "Latest reading on file" : "Not measured in this period"}
              </small>
            </article>

            {/* SpO2 Card */}
            <article className="trend-metric-box">
              <div className="metric-box-head">
                <span className="metric-title">Blood Oxygen (SpO2)</span>
                <span className="metric-count">{metricsAvailable.spO2} reading(s)</span>
              </div>
              <div className="metric-value-row">
                <strong>{latest?.spO2 ? `${latest.spO2}%` : "--"}</strong>
                {changes.spO2 && (
                  <span className={`change-pill change-${changes.spO2.direction}`}>
                    {changes.spO2.direction === "up" ? "▲ +" : changes.spO2.direction === "down" ? "▼ " : "● "}
                    {changes.spO2.difference}%
                  </span>
                )}
              </div>
              <small className="metric-meta">
                {latest?.spO2 ? "Latest reading on file" : "Not measured in this period"}
              </small>
            </article>

            {/* Blood Pressure Card */}
            <article className="trend-metric-box">
              <div className="metric-box-head">
                <span className="metric-title">Blood Pressure</span>
                <span className="metric-count">{metricsAvailable.bloodPressure} reading(s)</span>
              </div>
              <div className="metric-value-row">
                <strong>{latest?.bloodPressure || "--"}</strong>
                {changes.bloodPressure && (
                  <span className={`change-pill change-${changes.bloodPressure.direction}`}>
                    Δ {changes.bloodPressure.sysDifference >= 0 ? `+${changes.bloodPressure.sysDifference}` : changes.bloodPressure.sysDifference}/
                    {changes.bloodPressure.diaDifference >= 0 ? `+${changes.bloodPressure.diaDifference}` : changes.bloodPressure.diaDifference}
                  </span>
                )}
              </div>
              <small className="metric-meta">
                {latest?.bloodPressure ? "SYS / DIA (mmHg)" : "Not measured in this period"}
              </small>
            </article>

            {/* Steps Card */}
            <article className="trend-metric-box">
              <div className="metric-box-head">
                <span className="metric-title">Daily Activity</span>
                <span className="metric-count">{metricsAvailable.steps} reading(s)</span>
              </div>
              <div className="metric-value-row">
                <strong>{latest?.steps !== null && latest?.steps !== undefined ? `${latest.steps.toLocaleString()} steps` : "--"}</strong>
                {changes.steps && (
                  <span className={`change-pill change-${changes.steps.direction}`}>
                    {changes.steps.direction === "up" ? "▲ +" : changes.steps.direction === "down" ? "▼ " : "● "}
                    {changes.steps.difference.toLocaleString()}
                  </span>
                )}
              </div>
              <small className="metric-meta">
                {latest?.steps !== null && latest?.steps !== undefined ? "Daily recorded steps" : "No steps logged"}
              </small>
            </article>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            {/* Heart Rate Chart */}
            <div className="chart-card">
              <div className="chart-card-head">
                <div>
                  <h4>Heart Rate Trend (bpm)</h4>
                  <small>Normal resting range: 60 - 100 bpm</small>
                </div>
                {onRecordVitals && (
                  <button type="button" className="btn-chart-action" onClick={onRecordVitals}>
                    + Record
                  </button>
                )}
              </div>
              <SvgLineChart
                data={trends.heartRate}
                valKey="value"
                color="#003883"
                unit="bpm"
                minY={40}
                maxY={130}
              />
            </div>

            {/* SpO2 Chart */}
            <div className="chart-card">
              <div className="chart-card-head">
                <div>
                  <h4>Blood Oxygen Trend (SpO2 %)</h4>
                  <small>Target range: 95% - 100%</small>
                </div>
              </div>
              <SvgLineChart
                data={trends.spO2}
                valKey="value"
                color="#0d9488"
                unit="%"
                minY={85}
                maxY={100}
              />
            </div>

            {/* Blood Pressure Chart */}
            <div className="chart-card">
              <div className="chart-card-head">
                <div>
                  <h4>Blood Pressure Trend (mmHg)</h4>
                  <small>Systolic (Dark Blue) vs Diastolic (Teal)</small>
                </div>
              </div>
              <SvgDualLineChart
                data={trends.bloodPressure}
                sysKey="systolic"
                diaKey="diastolic"
              />
            </div>

            {/* Steps Activity Chart */}
            <div className="chart-card">
              <div className="chart-card-head">
                <div>
                  <h4>Activity & Steps</h4>
                  <small>Physical activity logged per record</small>
                </div>
              </div>
              <SvgBarChart data={trends.steps} valKey="value" />
            </div>
          </div>

          {/* Flags & Unusual Change Indicators */}
          {flags.length > 0 && (
            <div className="trends-flags-section">
              <div className="flags-heading">
                <h3>⚠️ Pattern & Threshold Alerts ({flags.length})</h3>
                <small>Conservative rule-based flags generated from genuine readings</small>
              </div>

              <div className="flags-list">
                {flags.map((flag, idx) => (
                  <div key={idx} className={`flag-row severity-${flag.severity || "review"}`}>
                    <span className="flag-metric-tag">{flag.metric}</span>
                    <div className="flag-info">
                      <div className="flag-title-row">
                        <strong>{flag.value}</strong>
                        <span className="flag-time">{flag.formattedDate}</span>
                      </div>
                      <p>{flag.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Disclaimer */}
          <footer className="trends-disclaimer">
            {trendsData.disclaimer}
          </footer>
        </div>
      )}
    </section>
  );
}

/**
 * Lightweight, accessible SVG Line Chart
 */
function SvgLineChart({ data = [], valKey = "value", color = "#003883", unit = "", minY = 40, maxY = 130 }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No measurements recorded in this timeframe.</p>
      </div>
    );
  }

  const width = 500;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d[valKey]);
  const minVal = Math.min(minY, ...values);
  const maxVal = Math.max(maxY, ...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW + padding.left;
    const y = height - padding.bottom - ((d[valKey] - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");

  return (
    <div className="svg-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-trend-chart">
        {/* Horizontal gridlines */}
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height / 2} x2={width - padding.right} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />

        {/* Min/Max Y-axis labels */}
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="chart-axis-label">{maxVal}{unit}</text>
        <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" className="chart-axis-label">{minVal}{unit}</text>

        {/* Data Line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data Points */}
        {points.map((pt, i) => (
          <g key={i} className="chart-point-group">
            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke={color} strokeWidth="2.5" />
            <title>{`${pt.formattedDate}: ${pt[valKey]} ${unit}`}</title>
          </g>
        ))}

        {/* First & Last Date Labels */}
        {points.length > 0 && (
          <>
            <text x={points[0].x} y={height - 8} textAnchor="start" className="chart-axis-label">
              {points[0].formattedDate}
            </text>
            {points.length > 1 && (
              <text x={points[points.length - 1].x} y={height - 8} textAnchor="end" className="chart-axis-label">
                {points[points.length - 1].formattedDate}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Dual Line Chart for Systolic & Diastolic Blood Pressure
 */
function SvgDualLineChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No blood pressure readings recorded in this timeframe.</p>
      </div>
    );
  }

  const width = 500;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = 50;
  const maxVal = 180;
  const range = maxVal - minVal;

  const sysPoints = data.map((d, i) => {
    const x = data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW + padding.left;
    const y = height - padding.bottom - ((d.systolic - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const diaPoints = data.map((d, i) => {
    const x = data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW + padding.left;
    const y = height - padding.bottom - ((d.diastolic - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const sysPath = sysPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
  const diaPath = diaPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");

  return (
    <div className="svg-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-trend-chart">
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height / 2} x2={width - padding.right} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />

        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="chart-axis-label">180</text>
        <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" className="chart-axis-label">50</text>

        {/* Systolic Line (Navy) */}
        {sysPoints.length > 1 && (
          <path d={sysPath} fill="none" stroke="#003883" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {/* Diastolic Line (Teal) */}
        {diaPoints.length > 1 && (
          <path d={diaPath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Points */}
        {sysPoints.map((pt, i) => (
          <circle key={`sys-${i}`} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#003883" strokeWidth="2">
            <title>{`${pt.formattedDate}: SYS ${pt.systolic} mmHg`}</title>
          </circle>
        ))}
        {diaPoints.map((pt, i) => (
          <circle key={`dia-${i}`} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#0d9488" strokeWidth="2">
            <title>{`${pt.formattedDate}: DIA ${pt.diastolic} mmHg`}</title>
          </circle>
        ))}

        {/* Date labels */}
        {sysPoints.length > 0 && (
          <>
            <text x={sysPoints[0].x} y={height - 8} textAnchor="start" className="chart-axis-label">
              {sysPoints[0].formattedDate}
            </text>
            {sysPoints.length > 1 && (
              <text x={sysPoints[sysPoints.length - 1].x} y={height - 8} textAnchor="end" className="chart-axis-label">
                {sysPoints[sysPoints.length - 1].formattedDate}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Bar Chart for Activity and Steps
 */
function SvgBarChart({ data = [], valKey = "value" }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No steps or daily activity logged in this timeframe.</p>
      </div>
    );
  }

  const width = 500;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(5000, ...data.map((d) => d[valKey]));
  const barWidth = Math.max(12, Math.min(36, chartW / (data.length * 1.8)));

  return (
    <div className="svg-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-trend-chart">
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />

        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="chart-axis-label">{maxVal.toLocaleString()}</text>
        <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" className="chart-axis-label">0</text>

        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(1, data.length - 1 || 1)) * (chartW - barWidth);
          const barHeight = Math.max(4, (d[valKey] / maxVal) * chartH);
          const y = height - padding.bottom - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill="#003883"
                opacity="0.85"
              >
                <title>{`${d.formattedDate}: ${d[valKey]} steps`}</title>
              </rect>
            </g>
          );
        })}

        {data.length > 0 && (
          <>
            <text x={padding.left} y={height - 8} textAnchor="start" className="chart-axis-label">
              {data[0].formattedDate}
            </text>
            {data.length > 1 && (
              <text x={width - padding.right} y={height - 8} textAnchor="end" className="chart-axis-label">
                {data[data.length - 1].formattedDate}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
