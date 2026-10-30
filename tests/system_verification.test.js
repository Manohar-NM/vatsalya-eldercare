const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const SOS = require("../models/SOS");
const { addMedicine, removeMedicine } = require("../controllers/parentController");
const { createSOS } = require("../controllers/sosController");

describe("Phase 5: System Verification & Defect Resolution Suite", () => {
  const testCaregiverId = new mongoose.Types.ObjectId();
  const testParentId = new mongoose.Types.ObjectId();

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

  test("1. Medicine Creation: Rejects empty or missing medicine name with 400", async () => {
    const reqEmpty = {
      params: { parentId: testParentId.toString() },
      user: { _id: testCaregiverId },
      body: { name: "   ", dosage: "5mg" }
    };
    const resEmpty = createMockRes();

    await addMedicine(reqEmpty, resEmpty);

    assert.equal(resEmpty.statusCode, 400);
    assert.match(resEmpty.jsonData.message, /medicine name is required/i);
  });

  test("2. Medicine Creation: Adds valid medicine and emits socket update", async () => {
    const origFindById = Parent.findById;
    let emittedRoom = null;
    let emittedEvent = null;

    const mockParent = {
      _id: testParentId,
      name: "Ramesh Sharma",
      child: testCaregiverId,
      medicines: [],
      save: async () => {}
    };

    Parent.findById = async () => mockParent;

    const mockIo = {
      to: (room) => {
        emittedRoom = room;
        return {
          emit: (event) => {
            emittedEvent = event;
          }
        };
      }
    };

    try {
      const req = {
        params: { parentId: testParentId.toString() },
        user: { _id: testCaregiverId },
        body: { name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
        app: { get: (name) => (name === "io" ? mockIo : null) }
      };
      const res = createMockRes();

      await addMedicine(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.message, "Medicine added");
      assert.equal(mockParent.medicines.length, 1);
      assert.equal(mockParent.medicines[0].name, "Metformin");
      assert.equal(emittedRoom, `parent_${testParentId}`);
      assert.equal(emittedEvent, "MEDICINE_UPDATED");
    } finally {
      Parent.findById = origFindById;
    }
  });

  test("3. Medicine Removal: Synchronizes deletion to parent device room in real time", async () => {
    const origFindById = Parent.findById;
    const medId = new mongoose.Types.ObjectId();
    let emittedRoom = null;
    let emittedEvent = null;

    const mockParent = {
      _id: testParentId,
      name: "Ramesh Sharma",
      child: testCaregiverId,
      medicines: [{ _id: medId, name: "Aspirin" }],
      save: async () => {}
    };

    Parent.findById = async () => mockParent;

    const mockIo = {
      to: (room) => {
        emittedRoom = room;
        return {
          emit: (event) => {
            emittedEvent = event;
          }
        };
      }
    };

    try {
      const req = {
        params: { parentId: testParentId.toString(), medicineId: medId.toString() },
        user: { _id: testCaregiverId },
        app: { get: (name) => (name === "io" ? mockIo : null) }
      };
      const res = createMockRes();

      await removeMedicine(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockParent.medicines.length, 0);
      assert.equal(emittedRoom, `parent_${testParentId}`);
      assert.equal(emittedEvent, "MEDICINE_UPDATED");
    } finally {
      Parent.findById = origFindById;
    }
  });

  test("4. Emergency SOS: Emits location and contact in real-time alert payload", async () => {
    const origFindById = Parent.findById;
    const origCreateSOS = SOS.create;
    let emittedRoom = null;
    let emittedData = null;

    Parent.findById = async () => ({
      _id: testParentId,
      name: "Sita Devi",
      child: testCaregiverId,
      location: "Indiranagar, Bengaluru",
      phone: "+91 98765 43210"
    });

    SOS.create = async (doc) => ({
      _id: new mongoose.Types.ObjectId(),
      ...doc
    });

    const mockIo = {
      to: (room) => {
        emittedRoom = room;
        return {
          emit: (event, data) => {
            emittedData = data;
          }
        };
      }
    };

    try {
      const req = {
        body: { parentId: testParentId.toString(), message: "Need emergency assistance" },
        app: { get: (name) => (name === "io" ? mockIo : null) }
      };
      const res = createMockRes();

      await createSOS(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(emittedRoom, testCaregiverId.toString());
      assert.equal(emittedData.parentName, "Sita Devi");
      assert.equal(emittedData.location, "Indiranagar, Bengaluru");
      assert.equal(emittedData.phone, "+91 98765 43210");
    } finally {
      Parent.findById = origFindById;
      SOS.create = origCreateSOS;
    }
  });
});

