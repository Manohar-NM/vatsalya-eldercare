const express = require("express");
const router = express.Router();

const { addHealth, getHealth } = require("../controllers/healthController");

router.post("/add", addHealth);
router.get("/:parentId", getHealth);

module.exports = router;