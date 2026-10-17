const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  refresh,
} = require("../controllers/authController");

const authenticate = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refresh);

module.exports = router;