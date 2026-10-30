/**
 * Vatsalya AI Service
 * Isolated integration with Nebius AI Studio using NVIDIA Nemotron models.
 */

class AiConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "AiConfigError";
    this.statusCode = 503;
  }
}

class AiTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "AiTimeoutError";
    this.statusCode = 504;
  }
}

class AiProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AiProviderError";
    this.statusCode = status || 502;
  }
}

// Redact potential secret keys from error strings or logs
const sanitizeError = (err) => {
  if (!err) return "";
  const str = typeof err === "string" ? err : err.message || String(err);
  return str
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]")
    .replace(/key=[A-Za-z0-9_\-.]+/gi, "key=[REDACTED]");
};

const getNebiusConfig = () => {
  const apiKey = process.env.NEBIUS_API_KEY || "";
  const baseUrl = (process.env.NEBIUS_BASE_URL || "https://api.studio.nebius.ai/v1").replace(/\/+$/, "");
  const modelId = process.env.NEMOTRON_MODEL_ID || "nvidia/llama-3.1-nemotron-70b-instruct";
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 15000;

  return { apiKey, baseUrl, modelId, timeoutMs };
};

const MANDATORY_DISCLAIMER =
  "Disclaimer: This summary is generated for caregiver awareness and does not substitute for professional medical advice, diagnosis, or treatment.";

const SYSTEM_PROMPT = `You are Vatsalya Caregiver Health Assistant, an AI caregiving advisor powered by NVIDIA Nemotron.
Your role is to help family caregivers understand recent health observations for their elderly loved one.

STRICT CLINICAL SAFETY RULES:
1. OBSERVATIONAL ONLY: You are an informational assistant, NOT a medical doctor. NEVER provide definitive medical diagnoses.
2. NO MEDICATION ALTERATIONS: NEVER prescribe, suggest changes to, or recommend discontinuing any medication or dosage.
3. DATA HONESTY: NEVER fabricate, estimate, or hallucinate health metrics, readings, or events that are not in the record.
4. HIGHLIGHT GAPS: Explicitly identify metrics that have not been recorded or where data is insufficient.
5. CAREGIVER FOCUS: Focus on observable trends, routine reminders, comfort suggestions, and clarifying questions the caregiver can bring to the doctor.
6. MANDATORY DISCLAIMER: Always conclude your response with:
"${MANDATORY_DISCLAIMER}"`;

const buildSummaryPrompt = ({ parent, healthRecords = [], medicines = [], activities = [] }) => {
  const recordedVitals = healthRecords.map((r, idx) => {
    const parts = [];
    if (r.heartRate !== null && r.heartRate !== undefined) parts.push(`Heart Rate: ${r.heartRate} bpm`);
    if (r.spO2 !== null && r.spO2 !== undefined) parts.push(`SpO2: ${r.spO2}%`);
    if (r.bloodPressure) parts.push(`Blood Pressure: ${r.bloodPressure}`);
    if (r.steps !== null && r.steps !== undefined) parts.push(`Steps: ${r.steps}`);
    if (r.activity) parts.push(`Activity Note: "${r.activity}"`);
    const dateStr = r.timestamp ? new Date(r.timestamp).toISOString() : `Reading #${idx + 1}`;
    return `- [${dateStr}] ${parts.length ? parts.join(", ") : "Recorded with no specific vitals"}`;
  });

  const medsList = medicines.length
    ? medicines.map((m) => `- ${m.name} (${m.dosage || "Dose unstated"}, frequency: ${m.frequency || "unspecified"})`).join("\n")
    : "No medications currently scheduled in system.";

  const actsList = activities.length
    ? activities.map((a) => `- ${a.title} (Status: ${a.status || "pending"}, target: ${a.targetMinutes || 15} mins)`).join("\n")
    : "No specific daily physical activities tracked.";

  return `Please review the following elderly care record for caregiver insights:

PATIENT PROFILE:
- Name: ${parent?.name || "Elder"}
- Age: ${parent?.age || "Not specified"}
- Stated Medical Conditions: ${parent?.conditions || "None recorded"}
- Blood Type: ${parent?.bloodType || "Not recorded"}

PRESCRIBED MEDICATIONS ON RECORD:
${medsList}

RECENT ACTIVITIES TRACKED:
${actsList}

RECORDED HEALTH METRICS HISTORY (${healthRecords.length} total entries):
${recordedVitals.length ? recordedVitals.join("\n") : "No vital readings recorded yet."}

Please provide:
1. Executive Caregiver Summary (2-3 concise sentences on recent trends).
2. Vital Observations (noting any patterns or missing data).
3. Caregiver Action Items & Routine Suggestions.
4. Recommended Questions for the Next Doctor Visit.`;
};

/**
 * Generate a health summary using NVIDIA Nemotron via Nebius AI Studio.
 */
const generateHealthSummary = async ({ parent, healthRecords = [], medicines = [], activities = [], testFetch }) => {
  const config = getNebiusConfig();

  if (!config.apiKey) {
    throw new AiConfigError("Nebius AI API key is not configured. Set NEBIUS_API_KEY in environment to enable AI insights.");
  }

  const prompt = buildSummaryPrompt({ parent, healthRecords, medicines, activities });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  const fetchFn = testFetch || globalThis.fetch;
  if (!fetchFn) {
    clearTimeout(timer);
    throw new Error("Native fetch is not available in current Node runtime.");
  }

  const url = `${config.baseUrl}/chat/completions`;
  const body = {
    model: config.modelId,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 800
  };

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const cleanErr = sanitizeError(errText);
      throw new AiProviderError(`Nebius AI Studio returned status ${response.status}: ${cleanErr}`, response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      throw new AiProviderError("Nebius AI Studio returned an empty response.", 502);
    }

    // Ensure the mandatory disclaimer is present in the final output
    const finalSummary = content.includes(MANDATORY_DISCLAIMER)
      ? content.trim()
      : `${content.trim()}\n\n${MANDATORY_DISCLAIMER}`;

    return {
      summary: finalSummary,
      model: data.model || config.modelId,
      disclaimer: MANDATORY_DISCLAIMER,
      provider: "Nebius AI Studio (NVIDIA Nemotron)"
    };
  } catch (err) {
    clearTimeout(timer);

    if (err.name === "AbortError") {
      throw new AiTimeoutError(`AI service request timed out after ${config.timeoutMs}ms.`);
    }

    if (err instanceof AiConfigError || err instanceof AiProviderError || err instanceof AiTimeoutError) {
      throw err;
    }

    throw new AiProviderError(`AI communication failure: ${sanitizeError(err.message)}`, 502);
  }
};

module.exports = {
  generateHealthSummary,
  buildSummaryPrompt,
  getNebiusConfig,
  sanitizeError,
  AiConfigError,
  AiTimeoutError,
  AiProviderError,
  MANDATORY_DISCLAIMER,
  SYSTEM_PROMPT
};

