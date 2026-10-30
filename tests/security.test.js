const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { getJwtSecret } = require("../utils/jwtSecret");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Parent = require("../models/Parent");
const SOS = require("../models/SOS");
const userController = require("../controllers/userController");
const sosController = require("../controllers/sosController");
const dashboardController = require("../controllers/dashboardController");
const healthController = require("../controllers/healthController");

describe("Stage 1 Security & Authorization Test Suite", () => {
  const devSecret = getJwtSecret();
  const testUserId1 = new mongoose.Types.ObjectId();
  const testUserId2 = new mongoose.Types.ObjectId();
  const testParentId1 = new mongoose.Types.ObjectId();
  const testParentId2 = new mongoose.Types.ObjectId();
  const testSosId1 = new mongoose.Types.ObjectId();

  // Helper mock request/response
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

  test("1. JWT Secret: Fails safely in production when secret is missing or weak", () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /FATAL SECURITY CONFIGURATION/);

      process.env.JWT_SECRET = "short";
      assert.throws(() => getJwtSecret(), /FATAL SECURITY CONFIGURATION/);

      process.env.JWT_SECRET = "a_very_secure_random_string_that_is_at_least_32_characters_long";
      assert.equal(getJwtSecret(), "a_very_secure_random_string_that_is_at_least_32_characters_long");
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.JWT_SECRET = origSecret;
      else delete process.env.JWT_SECRET;
    }
  });

  test("2. Auth Middleware: Rejects missing token with 401", async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.jsonData.message, /no token/i);
  });

  test("3. Auth Middleware: Rejects invalid or expired token with 401", async () => {
    const req = { headers: { authorization: "Bearer invalid.token.payload" } };
    const res = createMockRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.jsonData.message, /token failed/i);
  });

  test("4. Auth Middleware: Rejects orphaned/deleted user token with 401", async () => {
    // Mock User.findById to return null (simulating deleted user in DB)
    const origFindById = User.findById;
    User.findById = () => ({
      select: async () => null
    });

    const token = jwt.sign({ id: testUserId1 }, devSecret, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    let nextCalled = false;

    try {
      await protect(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.match(res.jsonData.message, /user not found or deleted/i);
    } finally {
      User.findById = origFindById;
    }
  });

  test("5. Registration: Rejects invalid inputs (email, short password, empty name)", async () => {
    // Missing / invalid name
    const res1 = createMockRes();
    await userController.registerUser({ body: { name: " ", email: "test@example.com", password: "password123" } }, res1);
    assert.equal(res1.statusCode, 400);

    // Invalid email
    const res2 = createMockRes();
    await userController.registerUser({ body: { name: "Test User", email: "invalid-email", password: "password123" } }, res2);
    assert.equal(res2.statusCode, 400);

    // Short password (< 6 chars)
    const res3 = createMockRes();
    await userController.registerUser({ body: { name: "Test User", email: "test@example.com", password: "123" } }, res3);
    assert.equal(res3.statusCode, 400);
  });

  test("6. Registration: Response never exposes password or password hash", async () => {
    const origFindOne = User.findOne;
    const origCreate = User.create;

    User.findOne = async () => null;
    User.create = async (doc) => ({
      _id: testUserId1,
      name: doc.name,
      age: doc.age,
      email: doc.email,
      role: "child",
      password: doc.password, // hashed password on record
      createdAt: new Date()
    });

    try {
      const res = createMockRes();
      await userController.registerUser({
        body: { name: "Safe User", email: "safe@example.com", password: "securePassword123" }
      }, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.jsonData.user.name, "Safe User");
      assert.equal(res.jsonData.user.password, undefined, "Password hash must NOT be in response");
      assert.equal(res.jsonData.password, undefined);
    } finally {
      User.findOne = origFindOne;
      User.create = origCreate;
    }
  });

  test("7. SOS Resolution: Prevents unauthorized caregiver from resolving another family's SOS alert (IDOR fix)", async () => {
    const origFindById = SOS.findById;
    SOS.findById = (id) => ({
      populate: async () => ({
        _id: testSosId1,
        status: "ACTIVE",
        parent: {
          _id: testParentId1,
          child: testUserId1 // Owned by user 1
        },
        save: async () => {}
      })
    });

    try {
      // User 2 attempts to resolve User 1's parent SOS
      const req = {
        params: { sosId: testSosId1.toString() },
        user: { _id: testUserId2 }, // Attacker
        app: { get: () => null }
      };
      const res = createMockRes();

      await sosController.resolveSOS(req, res);
      assert.equal(res.statusCode, 403, "Must return 403 Forbidden for cross-family SOS resolution");
      assert.match(res.jsonData.message, /not authorized/i);

      // User 1 resolves their own SOS
      const reqLegit = {
        params: { sosId: testSosId1.toString() },
        user: { _id: testUserId1 }, // Legitimate owner
        app: { get: () => null }
      };
      const resLegit = createMockRes();

      await sosController.resolveSOS(reqLegit, resLegit);
      assert.equal(resLegit.statusCode, 200);
      assert.equal(resLegit.jsonData.message, "SOS resolved successfully");
    } finally {
      SOS.findById = origFindById;
    }
  });

  test("8. Dashboard Authorization: Prevents accessing another caregiver's dashboard", async () => {
    const req = {
      params: { childId: testUserId1.toString() },
      user: { _id: testUserId2 } // Mismatched user
    };
    const res = createMockRes();

    await dashboardController.getDashboard(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.jsonData.message, /not authorized/i);
  });

  test("9. Health Authorization: Prevents accessing health data of unowned parent", async () => {
    const origFindOne = Parent.findOne;
    Parent.findOne = async () => null; // Parent not owned by user

    try {
      const req = {
        params: { parentId: testParentId2.toString() },
        user: { _id: testUserId1 }
      };
      const res = createMockRes();

      await healthController.getHealth(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.message, /not authorized/i);
    } finally {
      Parent.findOne = origFindOne;
    }
  });

  test("10. Users List: Password hashes are excluded from sanitized getUsers output", async () => {
    const origFind = User.find;
    User.find = () => ({
      select: () => ({
        sort: async () => [
          { _id: testUserId1, name: "User 1", email: "u1@example.com", role: "child" }
        ]
      })
    });

    try {
      const res = createMockRes();
      await userController.getUsers({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData[0].password, undefined, "Users list must not contain password field");
    } finally {
      User.find = origFind;
    }
  });
});
