const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const Health = require("../models/Health");
const { validateHealthMetrics, addHealth, getHealth } = require("../controllers/healthController");
const { updateHealth, getMyParents } = require("../controllers/parentController");
const { authenticateDeviceOrCaregiver } = require("../middleware/authMiddleware");
const { getHealthSummary } = require("../controllers/aiController");
const {
  generateHealthSummary,
  AiConfigError,
  AiTimeoutError,
  AiProviderError,
  sanitizeError,
  MANDATORY_DISCLAIMER
} = require("../services/aiService");

describe("Phase 1: Reliable Health Data & NVIDIA Nemotron AI Integration", () => {
  const testCaregiverId1 = new mongoose.Types.ObjectId();
  const testCaregiverId2 = new mongoose.Types.ObjectId();
  const testParentId1 = new mongoose.Types.ObjectId();
  const testParentId2 = new mongoose.Types.ObjectId();

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
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

  test("1. Health Schema: Does not fabricate default heart rate or SpO2 values", () => {
    const freshParent = new Parent({
      name: "Ramesh Sharma",
      child: testCaregiverId1
    });

    assert.equal(freshParent.heartRate, null, "heartRate must default to null when unmeasured");
    assert.equal(freshParent.spO2, null, "spO2 must default to null when unmeasured");
    assert.equal(freshParent.bloodPressure, null, "bloodPressure must default to null when unmeasured");
    assert.equal(freshParent.activity, null, "activity must default to null when unmeasured");
  });

  test("2. Health Validation: Rejects invalid ranges and empty measurements with 400", () => {
    // Negative heart rate
    const resNegHr = validateHealthMetrics({ heartRate: -10 });
    assert.ok(resNegHr.error, "Must reject negative heart rate");

    // Extreme high heart rate
    const resHighHr = validateHealthMetrics({ heartRate: 350 });
    assert.ok(resHighHr.error, "Must reject heart rate > 250 bpm");

    // Invalid SpO2
    const resLowOx = validateHealthMetrics({ spO2: 35 });
    assert.ok(resLowOx.error, "Must reject SpO2 < 50%");
    const resHighOx = validateHealthMetrics({ spO2: 105 });
    assert.ok(resHighOx.error, "Must reject SpO2 > 100%");

    // Negative steps
    const resNegSteps = validateHealthMetrics({ steps: -500 });
    assert.ok(resNegSteps.error, "Must reject negative steps");

    // Invalid blood pressure format
    const resInvalidBp = validateHealthMetrics({ bloodPressure: "high" });
    assert.ok(resInvalidBp.error, "Must reject invalid blood pressure format");

    // Empty payload
    const resEmpty = validateHealthMetrics({});
    assert.ok(resEmpty.error, "Must reject empty measurement submission");

    // Valid readings
    const resValid = validateHealthMetrics({
      heartRate: 74,
      spO2: 97,
      steps: 4200,
      bloodPressure: "120/80",
      activity: "Morning walk"
    });
    assert.equal(resValid.error, undefined);
    assert.equal(resValid.payload.heartRate, 74);
    assert.equal(resValid.payload.spO2, 97);
    assert.equal(resValid.payload.steps, 4200);
    assert.equal(resValid.payload.bloodPressure, "120/80");
  });

  test("3. Caregiver Auth: addHealth blocks caregivers from modifying unowned parents (403)", async () => {
    const origFindOne = Parent.findOne;
    Parent.findOne = async () => null; // Parent not owned by user

    try {
      const req = {
        body: { parent: testParentId2.toString(), heartRate: 75 },
        user: { _id: testCaregiverId1 }
      };
      const res = createMockRes();

      await addHealth(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.message, /not authorized/i);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("4. Device Security: Unauthenticated callers cannot update parent health (401/403)", async () => {
    // 4a. No credentials provided
    const reqNoAuth = {
      params: { parentId: testParentId1.toString() },
      headers: {},
      body: {}
    };
    const resNoAuth = createMockRes();
    let nextCalled = false;

    await authenticateDeviceOrCaregiver(reqNoAuth, resNoAuth, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(resNoAuth.statusCode, 401);

    // 4b. Invalid device code provided
    const origFindOne = Parent.findOne;
    Parent.findOne = async () => null;

    try {
      const reqBadCode = {
        params: { parentId: testParentId1.toString() },
        headers: { "x-parent-code": "VAT-WRONG" },
        body: {}
      };
      const resBadCode = createMockRes();
      let nextCalledBad = false;

      await authenticateDeviceOrCaregiver(reqBadCode, resBadCode, () => {
        nextCalledBad = true;
      });
      assert.equal(nextCalledBad, false);
      assert.equal(resBadCode.statusCode, 403);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("5. AI Summary IDOR: Blocks caregiver from requesting AI summary for another family (403)", async () => {
    const origFindOne = Parent.findOne;
    Parent.findOne = async () => null; // Parent belongs to someone else

    try {
      const req = {
        params: { parentId: testParentId2.toString() },
        user: { _id: testCaregiverId1 }
      };
      const res = createMockRes();

      await getHealthSummary(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.message, /not authorized/i);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("6. Missing Records: Returns informative response without calling external LLM", async () => {
    const origFindOne = Parent.findOne;
    const origFindHealth = Health.find;

    Parent.findOne = async () => ({
      _id: testParentId1,
      name: "Sita Devi",
      child: testCaregiverId1,
      medicines: []
    });

    Health.find = () => ({
      sort: () => ({
        limit: async () => [] // 0 records
      })
    });

    try {
      const req = {
        params: { parentId: testParentId1.toString() },
        user: { _id: testCaregiverId1 },
        query: {}
      };
      const res = createMockRes();

      await getHealthSummary(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.success, true);
      assert.equal(res.jsonData.dataPoints, 0);
      assert.equal(res.jsonData.requiresData, true);
      assert.match(res.jsonData.summary, /no health metrics/i);
      assert.ok(res.jsonData.disclaimer.includes("Disclaimer:"));
    } finally {
      Parent.findOne = origFindOne;
      Health.find = origFindHealth;
    }
  });

  test("7. Missing Nebius Config: Fails gracefully with 503 instead of crashing", async () => {
    const origApiKey = process.env.NEBIUS_API_KEY;
    delete process.env.NEBIUS_API_KEY;

    try {
      await assert.rejects(
        () => generateHealthSummary({ parent: { name: "Test" }, healthRecords: [{ heartRate: 70 }] }),
        (err) => {
          assert.ok(err instanceof AiConfigError);
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    } finally {
      if (origApiKey) process.env.NEBIUS_API_KEY = origApiKey;
    }
  });

  test("8. AI Summary Generation: Successfully structures Nemotron output with disclaimer", async () => {
    const origApiKey = process.env.NEBIUS_API_KEY;
    process.env.NEBIUS_API_KEY = "test-mock-key";

    // Mock fetch that simulates Nebius AI Studio response
    const mockFetch = async (url, options) => {
      assert.match(url, /studio\.nebius\.ai\/v1\/chat\/completions/);
      assert.equal(options.method, "POST");
      assert.match(options.headers.Authorization, /Bearer test-mock-key/);

      const parsedBody = JSON.parse(options.body);
      assert.equal(parsedBody.model, "nvidia/llama-3.1-nemotron-70b-instruct");
      assert.equal(parsedBody.messages.length, 2);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: "nvidia/llama-3.1-nemotron-70b-instruct",
          choices: [
            {
              message: {
                content:
                  "1. Executive Caregiver Summary: Ramesh has maintained stable vital readings with heart rate consistently between 70-76 bpm.\n2. Observations: SpO2 levels are normal at 98%.\n3. Suggestions: Ensure consistent hydration.\n4. Questions for Doctor: Inquire about current blood pressure trends."
              }
            }
          ]
        })
      };
    };

    try {
      const result = await generateHealthSummary({
        parent: { name: "Ramesh", age: 72, conditions: "Mild hypertension" },
        healthRecords: [
          { heartRate: 74, spO2: 98, bloodPressure: "125/82", timestamp: new Date() }
        ],
        medicines: [{ name: "Amlodipine", dosage: "5mg", frequency: "Daily" }],
        testFetch: mockFetch
      });

      assert.ok(result.summary.includes("Executive Caregiver Summary"));
      assert.ok(result.summary.includes(MANDATORY_DISCLAIMER), "Must include mandatory disclaimer");
      assert.equal(result.model, "nvidia/llama-3.1-nemotron-70b-instruct");
      assert.equal(result.provider, "Nebius AI Studio (NVIDIA Nemotron)");
    } finally {
      if (origApiKey) process.env.NEBIUS_API_KEY = origApiKey;
      else delete process.env.NEBIUS_API_KEY;
    }
  });

  test("9. Credential Protection: sanitizeError scrubs Bearer tokens and API keys", () => {
    const leakyError = "Failed to connect to https://studio.nebius.ai with Authorization: Bearer neb-secret-token-xyz123";
    const sanitized = sanitizeError(leakyError);

    assert.ok(!sanitized.includes("neb-secret-token-xyz123"), "Secret token must be removed");
    assert.ok(sanitized.includes("Bearer [REDACTED]"), "Bearer token must be replaced with [REDACTED]");
  });

  test("10. Provider Failure: Handles 500 error gracefully without crashing server", async () => {
    const origApiKey = process.env.NEBIUS_API_KEY;
    process.env.NEBIUS_API_KEY = "test-mock-key";

    const failingFetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Nebius Server Error with secret key=abc12345"
    });

    try {
      await assert.rejects(
        () =>
          generateHealthSummary({
            parent: { name: "Test" },
            healthRecords: [{ heartRate: 70 }],
            testFetch: failingFetch
          }),
        (err) => {
          assert.ok(err instanceof AiProviderError);
          assert.equal(err.statusCode, 500);
          assert.ok(!err.message.includes("abc12345"), "Must not leak raw secrets from provider error text");
          return true;
        }
      );
    } finally {
      if (origApiKey) process.env.NEBIUS_API_KEY = origApiKey;
      else delete process.env.NEBIUS_API_KEY;
    }
  });

  test("11. Data Consistency: getMyParents enforces null for vitals when no genuine Health records exist", async () => {
    const origFind = Parent.find;
    const origFindOne = Health.findOne;

    // Simulate parent document that has legacy defaults (72, 98, 120/80, Normal) in MongoDB
    Parent.find = async () => [
      {
        _id: testParentId1,
        name: "Legacy Parent",
        child: testCaregiverId1,
        heartRate: 72,
        spO2: 98,
        bloodPressure: "120/80",
        activity: "Normal",
        toObject() {
          return { ...this };
        }
      }
    ];

    // No records exist in Health collection
    Health.findOne = () => ({
      sort: async () => null
    });

    try {
      const req = { user: { _id: testCaregiverId1 } };
      const res = createMockRes();

      await getMyParents(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.length, 1);
      assert.equal(res.jsonData[0].heartRate, null, "heartRate must be null when no Health records exist");
      assert.equal(res.jsonData[0].spO2, null, "spO2 must be null when no Health records exist");
      assert.equal(res.jsonData[0].bloodPressure, null, "bloodPressure must be null when no Health records exist");
      assert.equal(res.jsonData[0].activity, null, "activity must be null when no Health records exist");
    } finally {
      Parent.find = origFind;
      Health.findOne = origFindOne;
    }
  });
});

