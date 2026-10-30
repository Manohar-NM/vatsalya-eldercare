const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const Health = require("../models/Health");
const { getHealthTrends } = require("../controllers/healthController");
const {
  analyzeHealthTrends,
  parseBloodPressure,
  getPeriodStartDate,
  TREND_THRESHOLDS
} = require("../services/healthTrendService");

describe("Phase 4: Health Pattern Analysis & Trend Test Suite", () => {
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

  test("1. Correct historical aggregation across multiple genuine records", () => {
    const parent = { name: "Ramesh Sharma", age: 72 };
    const records = [
      { heartRate: 72, spO2: 98, bloodPressure: "120/80", steps: 3000, timestamp: new Date(Date.now() - 300000) },
      { heartRate: 76, spO2: 97, bloodPressure: "122/82", steps: 4500, timestamp: new Date() }
    ];

    const result = analyzeHealthTrends({ parent, healthRecords: records, period: "week" });

    assert.equal(result.totalReadings, 2);
    assert.equal(result.metricsAvailable.heartRate, 2);
    assert.equal(result.metricsAvailable.spO2, 2);
    assert.equal(result.metricsAvailable.bloodPressure, 2);
    assert.equal(result.metricsAvailable.steps, 2);
    assert.equal(result.trends.heartRate.length, 2);
    assert.equal(result.trends.bloodPressure[1].systolic, 122);
    assert.equal(result.trends.bloodPressure[1].diastolic, 82);
  });

  test("2. Empty historical records are handled gracefully with 0 readings", () => {
    const parent = { name: "Sita Devi" };
    const result = analyzeHealthTrends({ parent, healthRecords: [], period: "month" });

    assert.equal(result.totalReadings, 0);
    assert.equal(result.latest, null);
    assert.equal(result.previous, null);
    assert.deepEqual(result.changes, {});
    assert.equal(result.trends.heartRate.length, 0);
    assert.equal(result.trends.spO2.length, 0);
    assert.equal(result.trends.bloodPressure.length, 0);
    assert.equal(result.flags.length, 0);
    assert.ok(result.aiReadiness.summaryText.includes("No health records exist"));
  });

  test("3. Missing measurement fields do not break analysis", () => {
    const parent = { name: "Anand" };
    // Entry 1 has only Heart Rate. Entry 2 has only SpO2 and BP.
    const records = [
      { heartRate: 70, timestamp: new Date(Date.now() - 60000) },
      { spO2: 96, bloodPressure: "128/84", timestamp: new Date() }
    ];

    const result = analyzeHealthTrends({ parent, healthRecords: records, period: "week" });

    assert.equal(result.totalReadings, 2);
    assert.equal(result.trends.heartRate.length, 1);
    assert.equal(result.trends.spO2.length, 1);
    assert.equal(result.trends.bloodPressure.length, 1);
    assert.equal(result.trends.steps.length, 0);
    // Since only 1 heart rate exists, no comparison can be made
    assert.equal(result.changes.heartRate, undefined);
  });

  test("4. Invalid measurements/strings in blood pressure are filtered safely", () => {
    assert.equal(parseBloodPressure("invalid-bp"), null);
    assert.equal(parseBloodPressure("120"), null);
    assert.equal(parseBloodPressure(""), null);
    assert.equal(parseBloodPressure(null), null);
    const parsed = parseBloodPressure("130/85");
    assert.equal(parsed.systolic, 130);
    assert.equal(parsed.diastolic, 85);
  });

  test("5. Caregiver ownership enforcement: blocks unowned parent access (403)", async () => {
    const origFindOne = Parent.findOne;
    Parent.findOne = async () => null; // Belongs to different caregiver

    try {
      const req = {
        params: { parentId: testParentId2.toString() },
        user: { _id: testCaregiverId1 },
        query: { period: "week" }
      };
      const res = createMockRes();

      await getHealthTrends(req, res);

      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.match(res.jsonData.message, /not authorized/i);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("6. Cross-parent data isolation: query scopes strictly to requested parent", async () => {
    const origFindOne = Parent.findOne;
    const origFindHealth = Health.find;

    let queriedParentId = null;
    Parent.findOne = async () => ({
      _id: testParentId1,
      name: "Parent A",
      child: testCaregiverId1
    });

    Health.find = (query) => {
      queriedParentId = query.parent;
      return {
        sort: () => ({
          limit: () => ({
            lean: async () => []
          })
        })
      };
    };

    try {
      const req = {
        params: { parentId: testParentId1.toString() },
        user: { _id: testCaregiverId1 },
        query: { period: "week" }
      };
      const res = createMockRes();

      await getHealthTrends(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(queriedParentId.toString(), testParentId1.toString());
    } finally {
      Parent.findOne = origFindOne;
      Health.find = origFindHealth;
    }
  });

  test("7. Trend calculation correctness for differences and directions", () => {
    const parent = { name: "Ramesh" };
    const records = [
      { heartRate: 70, spO2: 99, bloodPressure: "115/75", steps: 2000, timestamp: new Date(Date.now() - 3600000) },
      { heartRate: 85, spO2: 96, bloodPressure: "135/85", steps: 3500, timestamp: new Date() }
    ];

    const result = analyzeHealthTrends({ parent, healthRecords: records, period: "week" });

    // Heart rate went from 70 to 85 (+15, up)
    assert.equal(result.changes.heartRate.difference, 15);
    assert.equal(result.changes.heartRate.direction, "up");
    assert.equal(result.changes.heartRate.current, 85);

    // SpO2 went from 99 to 96 (-3, down)
    assert.equal(result.changes.spO2.difference, -3);
    assert.equal(result.changes.spO2.direction, "down");

    // Blood pressure: systolic +20, diastolic +10
    assert.equal(result.changes.bloodPressure.sysDifference, 20);
    assert.equal(result.changes.bloodPressure.diaDifference, 10);
    assert.equal(result.changes.bloodPressure.direction, "up");
  });

  test("8. Unusual-change indicator correctness: flags threshold breaches and jumps", () => {
    const parent = { name: "Ramesh" };
    const records = [
      // Normal reading
      { heartRate: 72, spO2: 98, bloodPressure: "120/80", timestamp: new Date(Date.now() - 7200000) },
      // Tachycardia (>100 bpm), Low SpO2 (<95%), High BP (>=140/90), and sudden jump in HR (>20 bpm)
      { heartRate: 108, spO2: 92, bloodPressure: "148/94", timestamp: new Date() }
    ];

    const result = analyzeHealthTrends({ parent, healthRecords: records, period: "week" });

    assert.ok(result.flags.length >= 3, "Must flag HR, SpO2, and BP anomalies");

    // Check Heart Rate flags
    const hrFlags = result.flags.filter((f) => f.metric === "Heart Rate");
    assert.ok(hrFlags.some((f) => f.type === "clinical_threshold"));
    assert.ok(hrFlags.some((f) => f.type === "change_indicator")); // jump from 72 to 108 (36 bpm delta)

    // Check SpO2 flag
    const spO2Flags = result.flags.filter((f) => f.metric === "Blood Oxygen (SpO2)");
    assert.ok(spO2Flags.some((f) => f.message.includes("below standard 95%")));

    // Check BP flag
    const bpFlags = result.flags.filter((f) => f.metric === "Blood Pressure");
    assert.ok(bpFlags.some((f) => f.message.includes("Stage 2 review")));
  });

  test("9. Invalid period queries are rejected with 400 Bad Request", async () => {
    const req = {
      params: { parentId: testParentId1.toString() },
      user: { _id: testCaregiverId1 },
      query: { period: "century" } // invalid
    };
    const res = createMockRes();

    await getHealthTrends(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.match(res.jsonData.message, /invalid period/i);
  });

  test("10. No fabricated readings: only real timestamps and measurements are preserved", () => {
    const parent = { name: "Elder" };
    const date1 = new Date("2026-10-25T10:00:00.000Z");
    const date2 = new Date("2026-10-26T14:30:00.000Z");
    const records = [
      { heartRate: 68, timestamp: date1 },
      { heartRate: 74, timestamp: date2 }
    ];

    const result = analyzeHealthTrends({ parent, healthRecords: records, period: "all" });

    assert.equal(result.trends.heartRate.length, 2);
    assert.equal(result.trends.heartRate[0].timestamp, date1.toISOString());
    assert.equal(result.trends.heartRate[1].timestamp, date2.toISOString());
    assert.equal(result.trends.spO2.length, 0, "Unmeasured SpO2 must not be fabricated");
    assert.equal(result.trends.bloodPressure.length, 0, "Unmeasured BP must not be fabricated");
    assert.equal(result.trends.steps.length, 0, "Unmeasured steps must not be fabricated");
  });
});

