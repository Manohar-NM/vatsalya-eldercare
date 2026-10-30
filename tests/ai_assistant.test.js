const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const Health = require("../models/Health");
const { chatWithAssistant } = require("../controllers/aiAssistantController");
const {
  generateAssistantChat,
  generateDevelopmentModeResponse,
  detectMissingMetrics,
  checkEmergencyKeywords,
  ASSISTANT_DISCLAIMER
} = require("../services/aiAssistantService");
const { AiProviderError, AiTimeoutError } = require("../services/aiService");

describe("Phase 3: AI Caregiver Assistant Test Suite", () => {
  const testCaregiverId1 = new mongoose.Types.ObjectId();
  const testCaregiverId2 = new mongoose.Types.ObjectId();
  const testParentId1 = new mongoose.Types.ObjectId();
  const testParentId2 = new mongoose.Types.ObjectId();

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  test("1. Authenticated caregiver can access their parent's assistant", async () => {
    const origFindOne = Parent.findOne;
    const origFindHealth = Health.find;

    Parent.findOne = async () => ({
      _id: testParentId1,
      name: "Ramesh Sharma",
      age: 72,
      child: testCaregiverId1,
      conditions: "Hypertension",
      medicines: [{ name: "Amlodipine", dosage: "5mg", frequency: "Morning" }]
    });

    Health.find = () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            { heartRate: 75, spO2: 98, bloodPressure: "120/80", timestamp: new Date() }
          ]
        })
      })
    });

    try {
      const req = {
        params: { parentId: testParentId1.toString() },
        user: { _id: testCaregiverId1 },
        body: { message: "Summarize my parent's health" }
      };
      const res = createMockRes();

      await chatWithAssistant(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.success, true);
      assert.ok(res.jsonData.reply.length > 0);
      assert.ok(res.jsonData.disclaimer.includes("Disclaimer:"));
    } finally {
      Parent.findOne = origFindOne;
      Health.find = origFindHealth;
    }
  });

  test("2. Unauthenticated requests are rejected (401)", async () => {
    const req = {
      params: { parentId: testParentId1.toString() },
      body: { message: "How is my parent?" }
      // user is undefined
    };
    const res = createMockRes();

    await chatWithAssistant(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonData.success, false);
    assert.match(res.jsonData.message, /authentication required/i);
  });

  test("3. Caregiver cannot access another family's parent (403 IDOR check)", async () => {
    const origFindOne = Parent.findOne;
    // Simulate DB query returning null because parent belongs to another caregiver
    Parent.findOne = async () => null;

    try {
      const req = {
        params: { parentId: testParentId2.toString() },
        user: { _id: testCaregiverId1 },
        body: { message: "What medicines are scheduled?" }
      };
      const res = createMockRes();

      await chatWithAssistant(req, res);

      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.match(res.jsonData.message, /not authorized/i);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("4. Empty health records are handled correctly", async () => {
    const parent = {
      name: "Sita Devi",
      age: 68,
      conditions: "None recorded",
      medicines: []
    };
    const emptyRecords = [];

    const result = generateDevelopmentModeResponse({
      parent,
      healthRecords: emptyRecords,
      message: "Summarize my parent's health"
    });

    assert.ok(result.reply.includes("No vital measurements"));
    assert.ok(result.reply.includes("0 health records") || result.reply.includes("No vital measurements"));
    assert.equal(result.missingMetrics.length, 4, "Must identify all 4 primary metrics as missing");
    assert.ok(result.missingMetrics.includes("Heart Rate"));
    assert.ok(result.missingMetrics.includes("Blood Oxygen (SpO2)"));
    assert.ok(result.missingMetrics.includes("Blood Pressure"));
    assert.ok(result.missingMetrics.includes("Daily Steps / Activity"));
  });

  test("5. Missing medicine schedules are handled correctly", async () => {
    const parent = {
      name: "Sita Devi",
      medicines: []
    };

    const result = generateDevelopmentModeResponse({
      parent,
      healthRecords: [],
      message: "What medicines are scheduled today?"
    });

    assert.ok(result.reply.includes("no medications"));
    assert.ok(result.reply.includes("registered"));
    assert.ok(!result.reply.includes("Metformin"), "Must never invent medication names");
  });

  test("6. Development-mode responses are clearly labelled as simulations", async () => {
    const origDevMode = process.env.AI_ASSISTANT_DEV_MODE;
    process.env.AI_ASSISTANT_DEV_MODE = "true";

    try {
      const parent = { name: "Ramesh Sharma", medicines: [] };
      const response = await generateAssistantChat({
        parent,
        healthRecords: [],
        message: "What health measurements are missing?"
      });

      assert.equal(response.mode, "development");
      assert.equal(response.isSimulated, true);
      assert.match(response.provider, /simulation/i);
      assert.ok(!response.provider.includes("NVIDIA Nemotron Live Inference"));
      assert.ok(response.disclaimer.includes("Disclaimer:"));
    } finally {
      if (origDevMode !== undefined) {
        process.env.AI_ASSISTANT_DEV_MODE = origDevMode;
      } else {
        delete process.env.AI_ASSISTANT_DEV_MODE;
      }
    }
  });

  test("7. The assistant does not fabricate unavailable measurements", () => {
    const records = [{ heartRate: 72 }]; // SpO2, BP, steps missing
    const missing = detectMissingMetrics(records);

    assert.ok(!missing.includes("Heart Rate"), "Heart Rate is present");
    assert.ok(missing.includes("Blood Oxygen (SpO2)"), "SpO2 must be flagged as missing");
    assert.ok(missing.includes("Blood Pressure"), "BP must be flagged as missing");
    assert.ok(missing.includes("Daily Steps / Activity"), "Steps must be flagged as missing");

    const parent = { name: "Anand" };
    const devResponse = generateDevelopmentModeResponse({
      parent,
      healthRecords: records,
      message: "What health measurements are missing?"
    });

    assert.ok(devResponse.reply.includes("Blood Oxygen (SpO2)"));
    assert.ok(devResponse.reply.includes("Blood Pressure"));
    assert.ok(devResponse.reply.includes("Daily Steps / Activity"));
  });

  test("8. Invalid or empty messages are rejected (400)", async () => {
    const reqEmpty = {
      params: { parentId: testParentId1.toString() },
      user: { _id: testCaregiverId1 },
      body: { message: "   " }
    };
    const resEmpty = createMockRes();
    await chatWithAssistant(reqEmpty, resEmpty);

    assert.equal(resEmpty.statusCode, 400);
    assert.match(resEmpty.jsonData.message, /non-empty message is required/i);

    const reqMissing = {
      params: { parentId: testParentId1.toString() },
      user: { _id: testCaregiverId1 },
      body: {}
    };
    const resMissing = createMockRes();
    await chatWithAssistant(reqMissing, resMissing);

    assert.equal(resMissing.statusCode, 400);
  });

  test("9. Parent switching does not leak conversation data across parents", async () => {
    // Generate responses for two different parents with distinct data
    const parentA = {
      _id: testParentId1,
      name: "Father A",
      medicines: [{ name: "Aspirin", dosage: "75mg" }]
    };
    const parentB = {
      _id: testParentId2,
      name: "Mother B",
      medicines: [{ name: "Metformin", dosage: "500mg" }]
    };

    const resA = generateDevelopmentModeResponse({
      parent: parentA,
      healthRecords: [],
      message: "What medicines are scheduled today?"
    });

    const resB = generateDevelopmentModeResponse({
      parent: parentB,
      healthRecords: [],
      message: "What medicines are scheduled today?"
    });

    assert.ok(resA.reply.includes("Father A"));
    assert.ok(resA.reply.includes("Aspirin"));
    assert.ok(!resA.reply.includes("Mother B"));
    assert.ok(!resA.reply.includes("Metformin"));

    assert.ok(resB.reply.includes("Mother B"));
    assert.ok(resB.reply.includes("Metformin"));
    assert.ok(!resB.reply.includes("Father A"));
    assert.ok(!resB.reply.includes("Aspirin"));
  });

  test("10. Provider errors and emergency symptoms are handled safely", async () => {
    // 10a. Emergency detection
    const isEmergency = checkEmergencyKeywords("My father has severe chest pain and cannot breathe");
    assert.equal(isEmergency, true, "Must flag acute chest pain as emergency");

    const parent = { name: "Ramesh" };
    const emergencyReply = generateDevelopmentModeResponse({
      parent,
      healthRecords: [],
      message: "He is having severe chest pain"
    });
    assert.equal(emergencyReply.isEmergency, true);
    assert.ok(emergencyReply.reply.includes("IMMEDIATE ACTION REQUIRED"));
    assert.ok(emergencyReply.reply.includes("112 / 911"));

    // 10b. Provider failure handling in production mode
    const origKey = process.env.NEBIUS_API_KEY;
    const origDev = process.env.AI_ASSISTANT_DEV_MODE;
    process.env.NEBIUS_API_KEY = "mock-key";
    delete process.env.AI_ASSISTANT_DEV_MODE;

    const mockFailingFetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "Upstream inference capacity unavailable with Bearer secret-token-xyz"
    });

    try {
      await assert.rejects(
        () => generateAssistantChat({
          parent,
          healthRecords: [],
          message: "Summarize records",
          testFetch: mockFailingFetch
        }),
        (err) => {
          assert.ok(err instanceof AiProviderError);
          assert.equal(err.statusCode, 503);
          assert.ok(!err.message.includes("secret-token-xyz"), "Secrets must be sanitized");
          return true;
        }
      );
    } finally {
      if (origKey) process.env.NEBIUS_API_KEY = origKey;
      else delete process.env.NEBIUS_API_KEY;
      if (origDev) process.env.AI_ASSISTANT_DEV_MODE = origDev;
    }
  });
});

