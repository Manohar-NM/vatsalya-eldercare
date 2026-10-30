import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./AiHealthInsights.css";

const parseSummarySections = (rawText) => {
  if (!rawText) return null;

  let mainText = rawText;
  let disclaimer = "";
  const disclaimerIdx = rawText.indexOf("Disclaimer:");
  if (disclaimerIdx !== -1) {
    disclaimer = rawText.slice(disclaimerIdx).trim();
    mainText = rawText.slice(0, disclaimerIdx).trim();
  }

  const execMatch = mainText.match(/(?:1\.\s*)?(?:Executive Caregiver Summary|Executive Summary)[:\n\s]+([\s\S]*?)(?=(?:2\.\s*)?(?:Vital Observations|Observations)|$)/i);
  const obsMatch = mainText.match(/(?:2\.\s*)?(?:Vital Observations|Observations)[:\n\s]+([\s\S]*?)(?=(?:3\.\s*)?(?:Caregiver Action Items|Action Items|Caregiver Guidance)|$)/i);
  const guideMatch = mainText.match(/(?:3\.\s*)?(?:Caregiver Action Items|Action Items|Caregiver Guidance|Routine Suggestions)[:\n\s]+([\s\S]*?)(?=(?:4\.\s*)?(?:Recommended Questions|Questions for the Next Doctor Visit|Questions for Doctor)|$)/i);
  const docMatch = mainText.match(/(?:4\.\s*)?(?:Recommended Questions for the Next Doctor Visit|Questions for Doctor|Recommended Questions)[:\n\s]+([\s\S]*?)$/i);

  if (execMatch || obsMatch || guideMatch || docMatch) {
    return {
      executive: execMatch ? execMatch[1].trim() : "",
      observations: obsMatch ? obsMatch[1].trim() : "",
      guidance: guideMatch ? guideMatch[1].trim() : "",
      doctorQuestions: docMatch ? docMatch[1].trim() : "",
      disclaimer
    };
  }

  return { raw: mainText, disclaimer };
};

export default function AiHealthInsights({ parent, compact = false, onRecordVitals = null }) {
  const navigate = useNavigate();
  const [prevParentId, setPrevParentId] = useState(parent?._id);
  const [status, setStatus] = useState("idle"); // idle | loading | success | no-data | auth-error | provider-unavailable | error
  const [summaryData, setSummaryData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const inFlightIdRef = useRef(null);

  // Idiomatic React pattern for resetting state on prop change during render
  if (parent?._id !== prevParentId) {
    setPrevParentId(parent?._id);
    setStatus("idle");
    setSummaryData(null);
    setErrorMessage("");
  }

  const handleGenerateSummary = useCallback(async () => {
    if (!parent?._id || status === "loading") return;

    const requestedParentId = parent._id;
    inFlightIdRef.current = requestedParentId;
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await API.get(`/ai/health-summary/${requestedParentId}`);

      // Avoid race conditions if user switched parent while request was in-flight
      if (inFlightIdRef.current !== requestedParentId) return;

      const data = res.data;

      if (data.requiresData || data.dataPoints === 0) {
        setStatus("no-data");
        setSummaryData(data);
      } else {
        setStatus("success");
        setSummaryData({
          ...data,
          generatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      if (inFlightIdRef.current !== requestedParentId) return;

      const responseStatus = err.response?.status;
      const apiMessage = err.response?.data?.message || err.message;

      if (responseStatus === 401) {
        setStatus("auth-error");
        setErrorMessage("Your caregiver session has expired or is invalid. Please log in again to generate insights.");
      } else if (responseStatus === 503 || responseStatus === 502) {
        setStatus("provider-unavailable");
        setErrorMessage(
          apiMessage || "The NVIDIA Nemotron AI inference provider is temporarily unconfigured or unreachable. Caregiver summaries will resume once provider connection is established."
        );
      } else if (responseStatus === 403) {
        setStatus("error");
        setErrorMessage("You are not authorized to view insights for this parent.");
      } else {
        setStatus("error");
        setErrorMessage(apiMessage || "An unexpected error occurred while analyzing health records. Please try again.");
      }
    }
  }, [parent, status]);

  if (!parent) {
    return (
      <section className="ai-insights-card">
        <div className="ai-callout info">
          <span className="ai-callout-icon">ℹ</span>
          <div className="ai-callout-content">
            <h3>No Parent Selected</h3>
            <p>Please select a parent profile to review health records and generate AI care insights.</p>
          </div>
        </div>
      </section>
    );
  }

  const sections = summaryData?.summary ? parseSummarySections(summaryData.summary) : null;
  const disclaimerText = summaryData?.disclaimer || "Disclaimer: This summary is generated for caregiver awareness and does not substitute for professional medical advice, diagnosis, or treatment.";

  return (
    <section className={`ai-insights-card ${compact ? "compact" : ""}`}>
      <div className="ai-insights-header">
        <div className="ai-insights-title-group">
          <div className="ai-insights-icon">AI</div>
          <div>
            <h2>AI Health Insights</h2>
            <p>Observational health summary for {parent.name}</p>
          </div>
        </div>

        <div className="ai-badges">
          <span className="ai-badge nvidia">NVIDIA Nemotron</span>
          <span className="ai-badge nebius">Nebius AI Studio</span>
          {status === "success" && (
            <button
              type="button"
              className="btn-generate-ai compact"
              onClick={handleGenerateSummary}
              disabled={status === "loading"}
              title="Refresh AI summary"
            >
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* STATE 1: Initial View */}
      {status === "idle" && (
        <div className="ai-initial-view">
          <div className="ai-initial-text">
            <p>
              Generate an observational analysis of <strong>{parent.name}&apos;s</strong> recent vital signs, medication
              schedule, and daily activity.
            </p>
            <small>Insights are informational for family caregivers and do not constitute a clinical diagnosis.</small>
          </div>
          <button
            type="button"
            className="btn-generate-ai"
            onClick={handleGenerateSummary}
          >
            <span>✨</span> Generate AI Health Summary
          </button>
        </div>
      )}

      {/* STATE 2: Loading View */}
      {status === "loading" && (
        <div className="ai-loading-view" role="status" aria-live="polite">
          <div className="ai-spinner" />
          <strong>Analyzing available health records...</strong>
          <p>Consulting NVIDIA Nemotron via Nebius AI Studio for {parent.name}&apos;s recent trends.</p>
        </div>
      )}

      {/* STATE 3: Success View */}
      {status === "success" && summaryData && (
        <div className="ai-success-view">
          <div className="ai-success-meta">
            <span>
              <strong>Model:</strong> {summaryData.model || "nvidia/llama-3.1-nemotron-70b-instruct"}
            </span>
            <span>
              <strong>Data Points Analyzed:</strong> {summaryData.dataPoints || 0}
            </span>
            {summaryData.lastRecordedAt && (
              <span>
                <strong>Latest Record:</strong> {new Date(summaryData.lastRecordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {summaryData.generatedAt && (
              <span>
                <strong>Generated:</strong> {new Date(summaryData.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <div className="ai-summary-body">
            {sections?.executive && (
              <div className="ai-section-block executive">
                <div className="ai-section-title">
                  <span>📋</span> Executive Caregiver Summary
                </div>
                <div className="ai-section-content">{sections.executive}</div>
              </div>
            )}

            {sections?.observations && (
              <div className="ai-section-block observations">
                <div className="ai-section-title">
                  <span>🩺</span> Vital Observations &amp; Trends
                </div>
                <div className="ai-section-content">{sections.observations}</div>
              </div>
            )}

            {sections?.guidance && (
              <div className="ai-section-block guidance">
                <div className="ai-section-title">
                  <span>💡</span> Caregiver Action Items &amp; Routine Guidance
                </div>
                <div className="ai-section-content">{sections.guidance}</div>
              </div>
            )}

            {sections?.doctorQuestions && (
              <div className="ai-section-block doctor-questions">
                <div className="ai-section-title">
                  <span>❓</span> Recommended Questions for Doctor Visit
                </div>
                <div className="ai-section-content">{sections.doctorQuestions}</div>
              </div>
            )}

            {sections?.raw && (
              <div className="ai-raw-content">{sections.raw}</div>
            )}
          </div>

          <div className="ai-disclaimer-box">
            <span>🛡</span>
            <div>
              <strong>Medical Disclaimer:</strong> {disclaimerText}
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: No Data State */}
      {status === "no-data" && (
        <div className="ai-callout info">
          <span className="ai-callout-icon">ℹ</span>
          <div className="ai-callout-content">
            <h3>Insufficient Health Measurements</h3>
            <p>
              {summaryData?.summary ||
                `No vital readings (heart rate, SpO2, blood pressure, or steps) have been recorded yet for ${parent.name}.`}
            </p>
            <div className="ai-callout-actions">
              {onRecordVitals && (
                <button
                  type="button"
                  className="btn-ai-action"
                  onClick={onRecordVitals}
                >
                  + Record Health Measurement
                </button>
              )}
              <button
                type="button"
                className="btn-ai-action"
                onClick={handleGenerateSummary}
              >
                ↻ Re-check Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 5: Authentication Error */}
      {status === "auth-error" && (
        <div className="ai-callout danger">
          <span className="ai-callout-icon">🔒</span>
          <div className="ai-callout-content">
            <h3>Caregiver Session Expired</h3>
            <p>{errorMessage}</p>
            <div className="ai-callout-actions">
              <button
                type="button"
                className="btn-ai-action"
                onClick={() => navigate("/login")}
              >
                Log In Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 6: Provider Unavailable */}
      {status === "provider-unavailable" && (
        <div className="ai-callout warning">
          <span className="ai-callout-icon">⚡</span>
          <div className="ai-callout-content">
            <h3>AI Service Temporarily Unavailable</h3>
            <p>{errorMessage}</p>
            <div className="ai-callout-actions">
              <button
                type="button"
                className="btn-ai-action"
                onClick={handleGenerateSummary}
              >
                ↻ Check Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 7: General Error */}
      {status === "error" && (
        <div className="ai-callout danger">
          <span className="ai-callout-icon">⚠️</span>
          <div className="ai-callout-content">
            <h3>Unable to Generate AI Summary</h3>
            <p>{errorMessage}</p>
            <div className="ai-callout-actions">
              <button
                type="button"
                className="btn-ai-action"
                onClick={handleGenerateSummary}
              >
                ↻ Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
