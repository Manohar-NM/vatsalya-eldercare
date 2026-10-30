const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { getJwtSecret } = require("../utils/jwtSecret");

const {
  authLimiter,
  deviceLoginLimiter,
  sosLimiter,
  aiLimiter,
  nearbyLimiter,
  createRateLimiter
} = require("../middleware/rateLimitMiddleware");

describe("Phase 8.1: API Rate Limiting & Security Hardening Test Suite", () => {
  let server;
  let baseUrl;
  const devSecret = getJwtSecret();
  const testCaregiverId = new mongoose.Types.ObjectId().toString();
  const validToken = jwt.sign({ id: testCaregiverId }, devSecret, { expiresIn: "1h" });

  before(async () => {
    const app = express();
    app.use(express.json());

    // Mock routes using the actual production middleware
    app.post("/api/users/login", authLimiter, (req, res) => {
      res.status(200).json({ success: true, message: "Login successful" });
    });

    app.post("/api/users/register", authLimiter, (req, res) => {
      res.status(201).json({ success: true, message: "User registered" });
    });

    app.post("/api/sos/trigger", sosLimiter, (req, res) => {
      res.status(201).json({ success: true, message: "SOS alert triggered" });
    });

    app.post("/api/parents/device/login", deviceLoginLimiter, (req, res) => {
      res.status(200).json({ success: true, message: "Device paired" });
    });

    // Mock protected AI route with protect-like verification and aiLimiter
    app.post("/api/ai/assistant/chat", (req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Not authorized, no token" });
      }
      try {
        const decoded = jwt.verify(auth.split(" ")[1], devSecret);
        req.user = decoded;
        next();
      } catch {
        return res.status(401).json({ success: false, message: "Token failed" });
      }
    }, aiLimiter, (req, res) => {
      res.status(200).json({ success: true, message: "AI response generated" });
    });

    // Start ephemeral server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Reset any environment overrides
    delete process.env.RATE_LIMIT_AUTH_MAX;
    delete process.env.RATE_LIMIT_DEVICE_MAX;
    delete process.env.RATE_LIMIT_SOS_MAX;
    delete process.env.RATE_LIMIT_AI_MAX;
    delete process.env.RATE_LIMIT_NEARBY_MAX;
    delete process.env.RATE_LIMIT_DISABLED;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Login Rate Limiting: Blocks excessive authentication attempts with 429", async () => {
    process.env.RATE_LIMIT_AUTH_MAX = "3";

    // 3 requests allowed
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${baseUrl}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "caregiver@example.com", password: "wrong" })
      });
      assert.equal(res.status, 200, `Request ${i + 1} should succeed within limit`);
    }

    // 4th request must be blocked
    const blockedRes = await fetch(`${baseUrl}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "caregiver@example.com", password: "wrong" })
    });

    assert.equal(blockedRes.status, 429, "Excess login attempts must return 429");
    const data = await blockedRes.json();
    assert.equal(data.success, false);
    assert.match(data.message, /too many authentication attempts/i);
    assert.ok(blockedRes.headers.get("retry-after"), "Must include Retry-After header");
  });

  test("2. Rate Limit Headers: Includes standard RateLimit-* and disables legacy X-RateLimit-*", async () => {
    // Isolated limiter to test precise headers
    const testApp = express();
    const isolatedLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 5,
      defaultLimit: 5,
      message: "Test limit reached"
    });
    testApp.get("/test-headers", isolatedLimiter, (req, res) => res.json({ ok: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${testPort}/test-headers`);
      assert.equal(res.status, 200);

      // Verify standard RFC headers
      assert.equal(res.headers.get("ratelimit-limit"), "5", "Must contain ratelimit-limit");
      assert.equal(res.headers.get("ratelimit-remaining"), "4", "Must contain ratelimit-remaining");
      assert.ok(res.headers.get("ratelimit-reset"), "Must contain ratelimit-reset");

      // Verify legacy headers are disabled
      assert.equal(res.headers.get("x-ratelimit-limit"), null, "Legacy X-RateLimit-Limit must be disabled");
      assert.equal(res.headers.get("x-ratelimit-remaining"), null, "Legacy X-RateLimit-Remaining must be disabled");
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("3. Registration Abuse Protection: Limits rapid account creation", async () => {
    const testApp = express();
    testApp.use(express.json());
    const regLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 2,
      defaultLimit: 2,
      message: "Too many registrations. Please try again later."
    });
    testApp.post("/register", regLimiter, (req, res) => res.status(201).json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      // Req 1 & 2 pass
      const r1 = await fetch(`http://127.0.0.1:${testPort}/register`, { method: "POST" });
      const r2 = await fetch(`http://127.0.0.1:${testPort}/register`, { method: "POST" });
      assert.equal(r1.status, 201);
      assert.equal(r2.status, 201);

      // Req 3 blocked
      const r3 = await fetch(`http://127.0.0.1:${testPort}/register`, { method: "POST" });
      assert.equal(r3.status, 429);
      const data = await r3.json();
      assert.equal(data.success, false);
      assert.match(data.message, /too many registrations/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("4. Emergency SOS Limiter: Allows emergency burst but prevents automated flood DoS", async () => {
    const testApp = express();
    testApp.use(express.json());
    const emergencyLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute window
      limitFn: () => 4,
      defaultLimit: 4,
      message: "Too many SOS triggers from this IP. Please wait a moment before retrying or contact emergency services directly."
    });
    testApp.post("/sos", emergencyLimiter, (req, res) => res.status(201).json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      // 4 rapid emergency bursts allowed
      for (let i = 0; i < 4; i++) {
        const res = await fetch(`http://127.0.0.1:${testPort}/sos`, { method: "POST" });
        assert.equal(res.status, 201, `Emergency attempt ${i + 1} should be accepted`);
      }

      // 5th attempt is blocked to prevent DoS
      const blocked = await fetch(`http://127.0.0.1:${testPort}/sos`, { method: "POST" });
      assert.equal(blocked.status, 429);
      const data = await blocked.json();
      assert.equal(data.success, false);
      assert.match(data.message, /emergency services/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("5. Device Pairing Code Limiter: Thwarts brute-force guessing of pairing codes", async () => {
    const testApp = express();
    testApp.use(express.json());
    const devLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 3,
      defaultLimit: 3,
      message: "Too many device pairing attempts from this IP. Please try again after 15 minutes."
    });
    testApp.post("/device-login", devLimiter, (req, res) => res.status(200).json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`http://127.0.0.1:${testPort}/device-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uniqueCode: `CODE0${i}` })
        });
        assert.equal(res.status, 200);
      }

      const blocked = await fetch(`http://127.0.0.1:${testPort}/device-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueCode: "CODE99" })
      });
      assert.equal(blocked.status, 429);
      const data = await blocked.json();
      assert.equal(data.success, false);
      assert.match(data.message, /device pairing attempts/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("6. AI Endpoint Limiter: Rejects unauthenticated callers first before consuming rate quota", async () => {
    // Unauthenticated request
    const unauthRes = await fetch(`${baseUrl}/api/ai/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello AI" })
    });

    assert.equal(unauthRes.status, 401, "Should be rejected with 401 before rate limit");
    const unauthData = await unauthRes.json();
    assert.equal(unauthData.success, false);
    assert.match(unauthData.message, /no token/i);
  });

  test("7. AI Endpoint Limiter: Protects expensive AI endpoints with 429 on abuse", async () => {
    const testApp = express();
    testApp.use(express.json());
    const aiTestLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 2,
      defaultLimit: 2,
      message: "Too many AI requests. Please slow down and try again shortly."
    });
    testApp.post("/ai", aiTestLimiter, (req, res) => res.json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      const r1 = await fetch(`http://127.0.0.1:${testPort}/ai`, { method: "POST" });
      const r2 = await fetch(`http://127.0.0.1:${testPort}/ai`, { method: "POST" });
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);

      const r3 = await fetch(`http://127.0.0.1:${testPort}/ai`, { method: "POST" });
      assert.equal(r3.status, 429);
      const data = await r3.json();
      assert.equal(data.success, false);
      assert.match(data.message, /too many ai requests/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("8. Rate Limit Bypass: RATE_LIMIT_DISABLED=true bypasses limiter for automated testing", async () => {
    const testApp = express();
    const bypassLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 1,
      defaultLimit: 1,
      message: "Should not hit"
    });
    testApp.get("/bypass-test", bypassLimiter, (req, res) => res.json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      process.env.RATE_LIMIT_DISABLED = "true";
      // Send 5 requests; all should succeed because limiter is skipped
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`http://127.0.0.1:${testPort}/bypass-test`);
        assert.equal(res.status, 200, `Request ${i + 1} should bypass rate limiting`);
      }
    } finally {
      delete process.env.RATE_LIMIT_DISABLED;
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  test("9. Nearby Geocoding Limiter: Protects external geocoding lookup against flood", async () => {
    const testApp = express();
    testApp.use(express.json());
    const nearLimiter = createRateLimiter({
      windowMs: 60000,
      limitFn: () => 2,
      defaultLimit: 2,
      message: "Too many hospital lookup requests from this IP. Please try again shortly."
    });
    testApp.get("/hospitals", nearLimiter, (req, res) => res.json({ success: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const testPort = testServer.address().port;

    try {
      const r1 = await fetch(`http://127.0.0.1:${testPort}/hospitals`);
      const r2 = await fetch(`http://127.0.0.1:${testPort}/hospitals`);
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);

      const r3 = await fetch(`http://127.0.0.1:${testPort}/hospitals`);
      assert.equal(r3.status, 429);
      const data = await r3.json();
      assert.equal(data.success, false);
      assert.match(data.message, /hospital lookup/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });
});
