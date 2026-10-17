const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const {
  getFreeContent,
  getPremiumContent,
  createContent,
  updateContent,
  deleteContent,
} = require("../controllers/contentController");

// Public endpoint: free content
router.get("/free", getFreeContent);

// Protected endpoint: premium/pro subscriptions
router.get("/premium", authenticate, getPremiumContent);

// Admin-only content management
router.post("/", authenticate, adminOnly, createContent);
router.patch("/:id", authenticate, adminOnly, updateContent);
router.delete("/:id", authenticate, adminOnly, deleteContent);

module.exports = router;