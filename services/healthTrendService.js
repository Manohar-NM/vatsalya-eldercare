/**
 * Vatsalya Health Pattern & Trend Analysis Service
 * Grounded in verified database records from MongoDB.
 * Computes deterministic statistics, trends, and transparent rule-based review flags.
 */

const TREND_THRESHOLDS = {
  heartRate: {
    lowBpm: 50, // Bradycardia review threshold
    highBpm: 100, // Tachycardia review threshold
    significantChangeBpm: 20
  },
  spO2: {
    targetPercent: 95, // Standard target minimum
    alertPercent: 90, // Significant desaturation threshold
    significantDropPercent: 3
  },
  bloodPressure: {
    systolicHigh: 140, // Stage 2 Hypertension review
    systolicLow: 90, // Hypotension review
    diastolicHigh: 90, // Diastolic review
    diastolicLow: 60,
    significantChangeSys: 20,
    significantChangeDia: 15
  },
  steps: {
    sedentaryThreshold: 1000,
    significantDropPct: 50
  }
};

const TREND_DISCLAIMER =
  "Disclaimer: Health trend summaries and change indicators are automated, rule-based review aids for caregiver awareness. They do not constitute a clinical diagnosis, medical evaluation, or emergency triage. Always consult a qualified physician for clinical decisions.";

/**
 * Parses "120/80" into { systolic: 120, diastolic: 80 }
 */
const parseBloodPressure = (bpString) => {
  if (typeof bpString !== "string") return null;
  const parts = bpString.trim().split("/");
  if (parts.length !== 2) return null;
  const sys = parseInt(parts[0], 10);
  const dia = parseInt(parts[1], 10);
  if (Number.isNaN(sys) || Number.isNaN(dia)) return null;
  return { systolic: sys, diastolic: dia };
};

/**
 * Calculates start Date based on selected period
 */
const getPeriodStartDate = (period = "week") => {
  const now = new Date();
  switch (period.toLowerCase()) {
    case "day":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
    default:
      return null;
  }
};

/**
 * Computes trend series, latest/previous comparisons, and threshold flags.
 */
const analyzeHealthTrends = ({ parent, healthRecords = [], period = "week" }) => {
  const pName = parent?.name || "Parent";

  // Records sorted oldest to newest for trend lines and chronological change tracking
  const chronological = [...healthRecords].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  // Reverse sorted (newest first) for latest value lookups
  const newestFirst = [...chronological].reverse();

  // 1. Separate series per metric (only genuine, non-null measurements)
  const hrSeries = [];
  const spO2Series = [];
  const bpSeries = [];
  const stepsSeries = [];

  chronological.forEach((r) => {
    const ts = r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString();
    const formattedDate = new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    if (r.heartRate !== null && r.heartRate !== undefined && !Number.isNaN(r.heartRate)) {
      hrSeries.push({ timestamp: ts, formattedDate, value: r.heartRate });
    }
    if (r.spO2 !== null && r.spO2 !== undefined && !Number.isNaN(r.spO2)) {
      spO2Series.push({ timestamp: ts, formattedDate, value: r.spO2 });
    }
    if (r.bloodPressure) {
      const parsed = parseBloodPressure(r.bloodPressure);
      if (parsed) {
        bpSeries.push({
          timestamp: ts,
          formattedDate,
          systolic: parsed.systolic,
          diastolic: parsed.diastolic,
          raw: r.bloodPressure
        });
      }
    }
    if (r.steps !== null && r.steps !== undefined && !Number.isNaN(r.steps)) {
      stepsSeries.push({ timestamp: ts, formattedDate, value: r.steps });
    }
  });

  // 2. Identify Latest & Previous Values per metric
  const getLatestAndPrevious = (series) => {
    if (!series.length) return { latest: null, previous: null };
    const latest = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    return { latest, previous };
  };

  const hrLatestPrev = getLatestAndPrevious(hrSeries);
  const spO2LatestPrev = getLatestAndPrevious(spO2Series);
  const bpLatestPrev = getLatestAndPrevious(bpSeries);
  const stepsLatestPrev = getLatestAndPrevious(stepsSeries);

  // 3. Compute Differences / Changes
  const changes = {};

  if (hrLatestPrev.latest && hrLatestPrev.previous) {
    const diff = hrLatestPrev.latest.value - hrLatestPrev.previous.value;
    changes.heartRate = {
      difference: diff,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "stable",
      current: hrLatestPrev.latest.value,
      previous: hrLatestPrev.previous.value,
      latestTimestamp: hrLatestPrev.latest.timestamp
    };
  }

  if (spO2LatestPrev.latest && spO2LatestPrev.previous) {
    const diff = spO2LatestPrev.latest.value - spO2LatestPrev.previous.value;
    changes.spO2 = {
      difference: diff,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "stable",
      current: spO2LatestPrev.latest.value,
      previous: spO2LatestPrev.previous.value,
      latestTimestamp: spO2LatestPrev.latest.timestamp
    };
  }

  if (bpLatestPrev.latest && bpLatestPrev.previous) {
    const sysDiff = bpLatestPrev.latest.systolic - bpLatestPrev.previous.systolic;
    const diaDiff = bpLatestPrev.latest.diastolic - bpLatestPrev.previous.diastolic;
    changes.bloodPressure = {
      sysDifference: sysDiff,
      diaDifference: diaDiff,
      direction: sysDiff > 0 || diaDiff > 0 ? "up" : sysDiff < 0 || diaDiff < 0 ? "down" : "stable",
      current: bpLatestPrev.latest.raw,
      previous: bpLatestPrev.previous.raw,
      latestTimestamp: bpLatestPrev.latest.timestamp
    };
  }

  if (stepsLatestPrev.latest && stepsLatestPrev.previous) {
    const diff = stepsLatestPrev.latest.value - stepsLatestPrev.previous.value;
    changes.steps = {
      difference: diff,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "stable",
      current: stepsLatestPrev.latest.value,
      previous: stepsLatestPrev.previous.value,
      latestTimestamp: stepsLatestPrev.latest.timestamp
    };
  }

  // 4. Unusual Change & Review Indicators (Rule-based, transparent)
  const flags = [];

  // 4a. Heart Rate Thresholds
  hrSeries.forEach((entry) => {
    if (entry.value > TREND_THRESHOLDS.heartRate.highBpm) {
      flags.push({
        metric: "Heart Rate",
        type: "clinical_threshold",
        severity: "review",
        value: `${entry.value} bpm`,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Heart rate of ${entry.value} bpm is above standard resting threshold (> ${TREND_THRESHOLDS.heartRate.highBpm} bpm). Review context (e.g. recent exertion or anxiety).`
      });
    } else if (entry.value < TREND_THRESHOLDS.heartRate.lowBpm) {
      flags.push({
        metric: "Heart Rate",
        type: "clinical_threshold",
        severity: "review",
        value: `${entry.value} bpm`,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Heart rate of ${entry.value} bpm is below standard resting threshold (< ${TREND_THRESHOLDS.heartRate.lowBpm} bpm).`
      });
    }
  });

  // Sudden Heart Rate Jump between consecutive measurements
  for (let i = 1; i < hrSeries.length; i++) {
    const diff = Math.abs(hrSeries[i].value - hrSeries[i - 1].value);
    if (diff >= TREND_THRESHOLDS.heartRate.significantChangeBpm) {
      flags.push({
        metric: "Heart Rate",
        type: "change_indicator",
        severity: "notice",
        value: `${hrSeries[i - 1].value} → ${hrSeries[i].value} bpm (Δ ${diff})`,
        timestamp: hrSeries[i].timestamp,
        formattedDate: hrSeries[i].formattedDate,
        message: `Significant change of ${diff} bpm detected between consecutive readings (${hrSeries[i - 1].value} bpm to ${hrSeries[i].value} bpm).`
      });
    }
  }

  // 4b. SpO2 Thresholds
  spO2Series.forEach((entry) => {
    if (entry.value < TREND_THRESHOLDS.spO2.alertPercent) {
      flags.push({
        metric: "Blood Oxygen (SpO2)",
        type: "clinical_threshold",
        severity: "urgent_review",
        value: `${entry.value}%`,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Blood oxygen of ${entry.value}% is below 90%. If accompanied by breathing distress, seek immediate medical attention.`
      });
    } else if (entry.value < TREND_THRESHOLDS.spO2.targetPercent) {
      flags.push({
        metric: "Blood Oxygen (SpO2)",
        type: "clinical_threshold",
        severity: "review",
        value: `${entry.value}%`,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Blood oxygen of ${entry.value}% is below standard 95% target. Monitor for persistent drops.`
      });
    }
  });

  // SpO2 sudden drop
  for (let i = 1; i < spO2Series.length; i++) {
    const drop = spO2Series[i - 1].value - spO2Series[i].value;
    if (drop >= TREND_THRESHOLDS.spO2.significantDropPercent) {
      flags.push({
        metric: "Blood Oxygen (SpO2)",
        type: "change_indicator",
        severity: "notice",
        value: `${spO2Series[i - 1].value}% → ${spO2Series[i].value}% (-${drop}%)`,
        timestamp: spO2Series[i].timestamp,
        formattedDate: spO2Series[i].formattedDate,
        message: `Sudden oxygen drop of ${drop}% between consecutive checks (${spO2Series[i - 1].value}% to ${spO2Series[i].value}%). Check sensor placement.`
      });
    }
  }

  // 4c. Blood Pressure Thresholds
  bpSeries.forEach((entry) => {
    if (entry.systolic >= TREND_THRESHOLDS.bloodPressure.systolicHigh || entry.diastolic >= TREND_THRESHOLDS.bloodPressure.diastolicHigh) {
      flags.push({
        metric: "Blood Pressure",
        type: "clinical_threshold",
        severity: "review",
        value: entry.raw,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Blood pressure reading (${entry.raw}) meets Stage 2 review criteria (SYS ≥ ${TREND_THRESHOLDS.bloodPressure.systolicHigh} or DIA ≥ ${TREND_THRESHOLDS.bloodPressure.diastolicHigh} mmHg).`
      });
    } else if (entry.systolic < TREND_THRESHOLDS.bloodPressure.systolicLow || entry.diastolic < TREND_THRESHOLDS.bloodPressure.diastolicLow) {
      flags.push({
        metric: "Blood Pressure",
        type: "clinical_threshold",
        severity: "review",
        value: entry.raw,
        timestamp: entry.timestamp,
        formattedDate: entry.formattedDate,
        message: `Blood pressure reading (${entry.raw}) is low (SYS < ${TREND_THRESHOLDS.bloodPressure.systolicLow} or DIA < ${TREND_THRESHOLDS.bloodPressure.diastolicLow} mmHg). Ensure hydration and monitor for dizziness.`
      });
    }
  });

  // 5. Structure Overall Summary & AI-Readiness Narrative
  const totalReadings = healthRecords.length;
  const metricsAvailable = {
    heartRate: hrSeries.length,
    spO2: spO2Series.length,
    bloodPressure: bpSeries.length,
    steps: stepsSeries.length
  };

  const latestOverall = newestFirst[0] || null;
  const previousOverall = newestFirst[1] || null;

  // Build grounded text summary for future Nemotron prompt injection
  const trendSummaryParagraphs = [];
  if (totalReadings === 0) {
    trendSummaryParagraphs.push(`No health records exist in the selected period (${period}) for ${pName}.`);
  } else {
    trendSummaryParagraphs.push(
      `Analyzed ${totalReadings} historical measurement(s) for ${pName} over the period: "${period}".`
    );

    if (hrLatestPrev.latest) {
      trendSummaryParagraphs.push(
        `• Heart Rate: Latest reading is ${hrLatestPrev.latest.value} bpm (${hrLatestPrev.latest.formattedDate}) across ${hrSeries.length} recorded reading(s).`
      );
    } else {
      trendSummaryParagraphs.push(`• Heart Rate: No readings recorded in this timeframe.`);
    }

    if (spO2LatestPrev.latest) {
      trendSummaryParagraphs.push(
        `• Blood Oxygen (SpO2): Latest reading is ${spO2LatestPrev.latest.value}% (${spO2LatestPrev.latest.formattedDate}) across ${spO2Series.length} recorded reading(s).`
      );
    } else {
      trendSummaryParagraphs.push(`• Blood Oxygen: No readings recorded in this timeframe.`);
    }

    if (bpLatestPrev.latest) {
      trendSummaryParagraphs.push(
        `• Blood Pressure: Latest reading is ${bpLatestPrev.latest.raw} (${bpLatestPrev.latest.formattedDate}) across ${bpSeries.length} recorded reading(s).`
      );
    } else {
      trendSummaryParagraphs.push(`• Blood Pressure: No readings recorded in this timeframe.`);
    }

    if (stepsLatestPrev.latest) {
      trendSummaryParagraphs.push(
        `• Activity / Steps: Latest record is ${stepsLatestPrev.latest.value} steps (${stepsLatestPrev.latest.formattedDate}).`
      );
    }

    if (flags.length > 0) {
      trendSummaryParagraphs.push(`• Attention Flags: ${flags.length} automated review notice(s) generated.`);
    } else {
      trendSummaryParagraphs.push(`• Attention Flags: No readings breached automated review thresholds.`);
    }
  }

  return {
    period,
    totalReadings,
    metricsAvailable,
    latest: latestOverall
      ? {
          timestamp: latestOverall.timestamp,
          heartRate: latestOverall.heartRate ?? null,
          spO2: latestOverall.spO2 ?? null,
          bloodPressure: latestOverall.bloodPressure || null,
          steps: latestOverall.steps ?? null,
          activity: latestOverall.activity || null
        }
      : null,
    previous: previousOverall
      ? {
          timestamp: previousOverall.timestamp,
          heartRate: previousOverall.heartRate ?? null,
          spO2: previousOverall.spO2 ?? null,
          bloodPressure: previousOverall.bloodPressure || null,
          steps: previousOverall.steps ?? null,
          activity: previousOverall.activity || null
        }
      : null,
    changes,
    trends: {
      heartRate: hrSeries,
      spO2: spO2Series,
      bloodPressure: bpSeries,
      steps: stepsSeries
    },
    flags,
    aiReadiness: {
      mode: "deterministic_summary",
      provider: "Vatsalya Pattern Analysis Engine (Pre-Nemotron Pipeline)",
      summaryText: trendSummaryParagraphs.join("\n"),
      flagCount: flags.length
    },
    disclaimer: TREND_DISCLAIMER
  };
};

module.exports = {
  analyzeHealthTrends,
  parseBloodPressure,
  getPeriodStartDate,
  TREND_THRESHOLDS,
  TREND_DISCLAIMER
};

