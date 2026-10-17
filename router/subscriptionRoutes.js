const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");

const {
  subscribe,
  status,
  renew,
  cancel,
} = require("../controllers/subscriptionController");

router.use(authenticate);

router.post("/subscribe", subscribe);
router.get("/subscription-status", status);
router.patch("/renew", renew);
router.post("/cancel-subscription", cancel);

module.exports = router;