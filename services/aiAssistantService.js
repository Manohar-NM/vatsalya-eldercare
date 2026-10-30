/**
 * Vatsalya AI Caregiver Assistant Service
 * Provides grounded, safety-first caregiver assistance.
 * Supports:
 * - Development Mode: Rule-based, database-grounded simulation (clearly labeled).
 * - Production Mode: NVIDIA Nemotron on Nebius AI Studio when API credentials are live.
 */

const { getNebiusConfig, sanitizeError, AiConfigError, AiTimeoutError, AiProviderError, MANDATORY_DISCLAIMER } = require("./aiService");

const ASSISTANT_DISCLAIMER =
  "Disclaimer: This assistant provides informational caregiver support and does not replace licensed medical advice, diagnosis, or prescription treatment. In emergencies, immediately contact emergency services (112 / 911).";

/**
 * Determine which vitals are missing from the latest health reading.
 */
const detectMissingMetrics = (healthRecords = []) => {
  const latest = healthRecords[0] || null;
  const missing = [];

  if (!latest || latest.heartRate === null || latest.heartRate === undefined) {
    missing.push("Heart Rate");
  }
  if (!latest || latest.spO2 === null || latest.spO2 === undefined) {
    missing.push("Blood Oxygen (SpO2)");
  }
  if (!latest || !latest.bloodPressure) {
    missing.push("Blood Pressure");
  }
  if (!latest || latest.steps === null || latest.steps === undefined) {
    missing.push("Daily Steps / Activity");
  }

  return missing;
};

/**
 * Check if the user query contains urgent or emergency indicators.
 */
const checkEmergencyKeywords = (message = "") => {
  const emergencyRegex = /\b(chest pain|heart attack|stroke|can't breathe|difficulty breathing|shortness of breath|unconscious|fainted|loss of consciousness|bleeding heavily|severe head injury|fall down|sudden numbness|emergency)\b/i;
  return emergencyRegex.test(message);
};

/**
 * Generate a rule-based, strictly database-grounded response for development mode.
 * Never fabricates data; explains missing records honestly.
 */
const generateDevelopmentModeResponse = ({ parent, healthRecords = [], message = "" }) => {
  const pName = parent?.name || "the parent";
  const medicines = parent?.medicines || [];
  const reminders = parent?.reminders || {};
  const appointments = parent?.appointments || [];
  const conditions = parent?.conditions || "None recorded";
  const missingMetrics = detectMissingMetrics(healthRecords);
  const latestRecord = healthRecords[0] || null;
  const lowerMsg = message.trim().toLowerCase();

  // 1. Emergency Safety Check
  if (checkEmergencyKeywords(lowerMsg)) {
    return {
      reply: `⚠️ **IMMEDIATE ACTION REQUIRED**:\nIf ${pName} is experiencing an acute emergency (such as severe chest pain, shortness of breath, sudden weakness, or unconsciousness), **please call emergency services immediately (112 / 911) or proceed to the nearest emergency room.**\n\nDo not rely on this digital assistant or wait for message responses during a medical emergency.\n\n${ASSISTANT_DISCLAIMER}`,
      isEmergency: true,
      missingMetrics
    };
  }

  // 2. Health Summary / Overview
  if (
    lowerMsg.includes("summarize") ||
    lowerMsg.includes("summary") ||
    lowerMsg.includes("overview") ||
    lowerMsg.includes("how is") ||
    lowerMsg.includes("condition")
  ) {
    let vitalsText = "";
    if (!latestRecord) {
      vitalsText = `• **Vitals Status**: No vital measurements (heart rate, SpO2, blood pressure, steps) have been recorded yet for ${pName}.`;
    } else {
      const parts = [];
      if (latestRecord.heartRate) parts.push(`Heart Rate: ${latestRecord.heartRate} bpm`);
      if (latestRecord.spO2) parts.push(`SpO2: ${latestRecord.spO2}%`);
      if (latestRecord.bloodPressure) parts.push(`Blood Pressure: ${latestRecord.bloodPressure}`);
      if (latestRecord.steps) parts.push(`Steps: ${latestRecord.steps}`);
      const dateStr = latestRecord.timestamp ? new Date(latestRecord.timestamp).toLocaleDateString() : "Recent";
      vitalsText = `• **Latest Vitals (${dateStr})**: ${parts.length ? parts.join(", ") : "Reading recorded without specific vitals"}`;
    }

    const medsText = medicines.length
      ? medicines.map((m) => `${m.name} (${m.dosage || "dose unstated"}, ${m.frequency || "daily"})`).join("; ")
      : "No medications currently registered.";

    const missingText = missingMetrics.length
      ? `• **Data Gaps**: Currently unmeasured: ${missingMetrics.join(", ")}.`
      : "• **Data Gaps**: All key vitals have recent readings.";

    return {
      reply: `### Health Overview for ${pName}\n\n` +
        `• **Age**: ${parent?.age || "Not specified"}\n` +
        `• **Medical Conditions**: ${conditions}\n` +
        `• **Blood Type**: ${parent?.bloodType || "Not recorded"}\n` +
        `${vitalsText}\n` +
        `• **Active Medications**: ${medsText}\n` +
        `${missingText}\n\n` +
        `💡 *Caregiver Tip*: Keep tracking regular vitals to build an accurate clinical history for upcoming doctor visits.\n\n` +
        `${ASSISTANT_DISCLAIMER}`,
      missingMetrics
    };
  }

  // 3. Missing Measurements
  if (
    lowerMsg.includes("missing") ||
    lowerMsg.includes("not measured") ||
    lowerMsg.includes("gap") ||
    lowerMsg.includes("unmeasured")
  ) {
    if (healthRecords.length === 0) {
      return {
        reply: `### Missing Health Measurements for ${pName}\n\n` +
          `**All key vital signs are currently missing.** There are 0 health records stored in the database for ${pName}.\n\n` +
          `The following readings have not been recorded:\n` +
          `1. Heart Rate (bpm)\n` +
          `2. Blood Oxygen (SpO2 %)\n` +
          `3. Blood Pressure (mmHg)\n` +
          `4. Daily Physical Activity / Steps\n\n` +
          `Use the **+ Record Vitals** action on your dashboard or connect a paired device to log measurements.\n\n` +
          `${ASSISTANT_DISCLAIMER}`,
        missingMetrics
      };
    }

    if (missingMetrics.length === 0) {
      return {
        reply: `### Health Measurements for ${pName}\n\n` +
          `Good news: All primary vital sign categories (Heart Rate, SpO2, Blood Pressure, and Steps) have at least one recent reading in ${pName}'s latest record.\n\n` +
          `${ASSISTANT_DISCLAIMER}`,
        missingMetrics: []
      };
    }

    return {
      reply: `### Missing Health Measurements for ${pName}\n\n` +
        `Based on the latest entry on file, the following measurements are **missing or unrecorded**:\n\n` +
        missingMetrics.map((m, idx) => `${idx + 1}. **${m}** (Not measured)`).join("\n") +
        `\n\nRegular monitoring of these parameters provides essential data for family caregivers and attending physicians.\n\n` +
        `${ASSISTANT_DISCLAIMER}`,
      missingMetrics
    };
  }

  // 4. Medicines / Medication Schedule
  if (
    lowerMsg.includes("medicine") ||
    lowerMsg.includes("medication") ||
    lowerMsg.includes("dose") ||
    lowerMsg.includes("pill") ||
    lowerMsg.includes("prescription") ||
    lowerMsg.includes("scheduled")
  ) {
    if (!medicines.length) {
      return {
        reply: `### Medication Schedule for ${pName}\n\n` +
          `There are **no medications** currently registered in ${pName}'s profile.\n\n` +
          `You can add prescribed medicines via the **+ Add Medicine** panel on the Caregiver Dashboard.\n\n` +
          `⚠️ *Safety Notice*: Always verify prescriptions directly with the treating physician or licensed pharmacist before administering any new medicine.\n\n` +
          `${ASSISTANT_DISCLAIMER}`,
        missingMetrics
      };
    }

    const medRows = medicines.map((m, idx) => {
      return `${idx + 1}. **${m.name}**\n   - Dosage: ${m.dosage || "Not stated"}\n   - Frequency: ${m.frequency || "Daily"}`;
    }).join("\n\n");

    // Check device reminders if any
    let reminderText = "";
    if (reminders.medicines && reminders.medicines.length > 0) {
      const rList = reminders.medicines.map((r) => `${r.name}: ${r.times?.join(", ") || "No specific times"}`).join("; ");
      reminderText = `\n\n**Device Reminders Configured:**\n${rList}`;
    }

    return {
      reply: `### Active Medications for ${pName}\n\n` +
        `The following ${medicines.length} medication(s) are recorded in the system:\n\n` +
        `${medRows}` +
        `${reminderText}\n\n` +
        `⚠️ *Important Reminder*: Never adjust dosage, discontinue, or add medications without direct guidance from ${pName}'s prescribing physician.\n\n` +
        `${ASSISTANT_DISCLAIMER}`,
      missingMetrics
    };
  }

  // 5. Recent Health Records / Vitals History
  if (
    lowerMsg.includes("recent") ||
    lowerMsg.includes("records") ||
    lowerMsg.includes("history") ||
    lowerMsg.includes("readings") ||
    lowerMsg.includes("vitals")
  ) {
    if (healthRecords.length === 0) {
      return {
        reply: `### Recent Health Records for ${pName}\n\n` +
          `There are **0 health records** logged for ${pName}.\n\n` +
          `To begin tracking trends, tap **+ Record Vitals** in the Caregiver Dashboard.\n\n` +
          `${ASSISTANT_DISCLAIMER}`,
        missingMetrics
      };
    }

    const recordsText = healthRecords.slice(0, 5).map((r, idx) => {
      const parts = [];
      if (r.heartRate !== null && r.heartRate !== undefined) parts.push(`Heart Rate: ${r.heartRate} bpm`);
      if (r.spO2 !== null && r.spO2 !== undefined) parts.push(`SpO2: ${r.spO2}%`);
      if (r.bloodPressure) parts.push(`BP: ${r.bloodPressure}`);
      if (r.steps !== null && r.steps !== undefined) parts.push(`Steps: ${r.steps}`);
      if (r.activity) parts.push(`Activity: "${r.activity}"`);

      const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleString() : `Record #${idx + 1}`;
      const vitalsSummary = parts.length ? parts.join(" | ") : "No vitals recorded in this entry";
      return `**${idx + 1}. [${dateStr}]**\n${vitalsSummary}`;
    }).join("\n\n");

    return {
      reply: `### Recent Health Records for ${pName}\n\n` +
        `Showing the last ${Math.min(healthRecords.length, 5)} record(s):\n\n` +
        `${recordsText}\n\n` +
        `${ASSISTANT_DISCLAIMER}`,
      missingMetrics
    };
  }

  // 6. Doctor Questions / Discussion Points
  if (
    lowerMsg.includes("doctor") ||
    lowerMsg.includes("discuss") ||
    lowerMsg.includes("appointment") ||
    lowerMsg.includes("visit") ||
    lowerMsg.includes("questions")
  ) {
    const questions = [];

    if (conditions && conditions !== "None recorded") {
      questions.push(`Review management and symptoms for diagnosed condition(s): "${conditions}".`);
    }

    if (medicines.length > 0) {
      questions.push(`Review current medication list (${medicines.map((m) => m.name).join(", ")}) for effectiveness and potential interactions.`);
    } else {
      questions.push("Discuss whether any preventative supplements or routine medications are recommended.");
    }

    if (missingMetrics.length > 0) {
      questions.push(`Ask the doctor which frequency is recommended for measuring unmonitored vitals: ${missingMetrics.join(", ")}.`);
    }

    questions.push("Inquire about recommended daily physical activity targets and hydration guidelines.");
    questions.push("Ask what warning signs or red flags should prompt immediate caregiver action.");

    let apptText = "";
    if (appointments.length > 0) {
      const nextAppt = appointments[0];
      apptText = `\n\n📅 **Upcoming Appointment**: Dr. ${nextAppt.doctorName} (${nextAppt.specialty || "General"}) on ${nextAppt.date} at ${nextAppt.time}.`;
    }

    return {
      reply: `### Recommended Doctor Discussion Points for ${pName}\n\n` +
        `Here are tailored questions to bring to ${pName}'s next medical consultation:\n\n` +
        questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n") +
        `${apptText}\n\n` +
        `${ASSISTANT_DISCLAIMER}`,
      missingMetrics
    };
  }

  // 7. General / Unrecognized Query (Grounded Fallback)
  return {
    reply: `### Caregiver Assistant for ${pName}\n\n` +
      `I have reviewed the records on file for ${pName}:\n` +
      `• **Total Health Readings**: ${healthRecords.length}\n` +
      `• **Active Medicines**: ${medicines.length}\n` +
      `• **Upcoming Appointments**: ${appointments.length}\n` +
      `• **Documented Conditions**: ${conditions}\n\n` +
      `I can only provide answers based on information recorded in the database. For topics outside these records, please consult a healthcare professional.\n\n` +
      `You can ask me:\n` +
      `• *"Summarize my parent's health"*\n` +
      `• *"What health measurements are missing?"*\n` +
      `• *"What medicines are scheduled today?"*\n` +
      `• *"Show me the recent health records"*\n` +
      `• *"What should I discuss with the doctor?"*\n\n` +
      `${ASSISTANT_DISCLAIMER}`,
    missingMetrics
  };
};

/**
 * Main Assistant entry point.
 * Distinguishes between Development Mode and Live Nemotron Inference.
 */
const generateAssistantChat = async ({
  parent,
  healthRecords = [],
  message,
  conversationHistory = [],
  testFetch = null
}) => {
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("Message text is required.");
  }

  const cleanMessage = message.trim();
  const config = getNebiusConfig();

  // If AI_ASSISTANT_DEV_MODE is set or NEBIUS_API_KEY is not configured, run Development Mode
  const isDevMode = !config.apiKey || process.env.AI_ASSISTANT_DEV_MODE === "true";

  if (isDevMode) {
    const devResult = generateDevelopmentModeResponse({
      parent,
      healthRecords,
      message: cleanMessage
    });

    return {
      reply: devResult.reply,
      mode: "development",
      isSimulated: true,
      provider: "Vatsalya Development Assistant (Database-grounded simulation)",
      model: "Vatsalya Rule Engine v1 (Development Mode)",
      disclaimer: ASSISTANT_DISCLAIMER,
      dataPoints: healthRecords.length,
      missingMetrics: devResult.missingMetrics || [],
      isEmergency: Boolean(devResult.isEmergency),
      timestamp: new Date().toISOString()
    };
  }

  // --- Production Path: NVIDIA Nemotron via Nebius AI Studio ---
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const fetchFn = testFetch || globalThis.fetch;

  if (!fetchFn) {
    clearTimeout(timer);
    throw new Error("Native fetch is not available in current Node runtime.");
  }

  // Build context-aware prompt with strict clinical safety
  const pName = parent?.name || "Parent";
  const medicines = (parent?.medicines || []).map((m) => `${m.name} (${m.dosage || "dose unstated"}, ${m.frequency || "daily"})`).join(", ") || "None recorded";
  const conditions = parent?.conditions || "None recorded";
  const missing = detectMissingMetrics(healthRecords).join(", ") || "None";
  const latestVitals = healthRecords[0]
    ? `HR: ${healthRecords[0].heartRate || "--"} bpm, SpO2: ${healthRecords[0].spO2 || "--"}%, BP: ${healthRecords[0].bloodPressure || "--"}`
    : "No vitals recorded";

  const systemInstructions = `You are Vatsalya AI Caregiver Assistant powered by NVIDIA Nemotron.
You assist family caregivers in caring for their elderly loved one (${pName}).

PATIENT CONTEXT (Ground Truth):
- Name: ${pName}
- Age: ${parent?.age || "Unspecified"}
- Known Conditions: ${conditions}
- Medicines: ${medicines}
- Latest Vitals: ${latestVitals}
- Unmeasured Categories: ${missing}

STRICT SAFETY RULES:
1. You are an informational assistant, NOT a medical doctor.
2. NEVER prescribe, change, or recommend altering any medication or dosage.
3. NEVER diagnose any disease or clinical condition.
4. If the user mentions emergency symptoms (chest pain, stroke, unconsciousness, severe breathing problems), urgently advise contacting emergency services (112 / 911).
5. Ground all observations strictly in the provided patient records. Never hallucinate readings.
6. Clearly state when measurements are missing.
7. Conclude every response with: "${ASSISTANT_DISCLAIMER}"`;

  // Format valid conversation history (last 6 messages max to prevent token blowup)
  const safeHistory = Array.isArray(conversationHistory)
    ? conversationHistory
        .filter((msg) => msg && typeof msg.content === "string" && (msg.role === "user" || msg.role === "assistant"))
        .slice(-6)
        .map((msg) => ({ role: msg.role, content: msg.content.trim() }))
    : [];

  const requestMessages = [
    { role: "system", content: systemInstructions },
    ...safeHistory,
    { role: "user", content: cleanMessage }
  ];

  try {
    const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: requestMessages,
        temperature: 0.2,
        max_tokens: 600
      }),
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

    const finalReply = content.includes(ASSISTANT_DISCLAIMER)
      ? content.trim()
      : `${content.trim()}\n\n${ASSISTANT_DISCLAIMER}`;

    return {
      reply: finalReply,
      mode: "production",
      isSimulated: false,
      provider: "Nebius AI Studio (NVIDIA Nemotron)",
      model: data.model || config.modelId,
      disclaimer: ASSISTANT_DISCLAIMER,
      dataPoints: healthRecords.length,
      missingMetrics: detectMissingMetrics(healthRecords),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timer);

    if (err.name === "AbortError") {
      throw new AiTimeoutError(`AI assistant request timed out after ${config.timeoutMs}ms.`);
    }

    if (err instanceof AiConfigError || err instanceof AiProviderError || err instanceof AiTimeoutError) {
      throw err;
    }

    throw new AiProviderError(`AI communication failure: ${sanitizeError(err.message)}`, 502);
  }
};

module.exports = {
  generateAssistantChat,
  generateDevelopmentModeResponse,
  detectMissingMetrics,
  checkEmergencyKeywords,
  ASSISTANT_DISCLAIMER
};

