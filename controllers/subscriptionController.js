const User = require("../models/User");

const PLAN_PRICES = {
  premium: 499,
  pro: 999,
};

const getActivePlan = async (user) => {
  if (
    user.subscription.plan !== "free" &&
    (
      !user.subscription.expiresAt ||
      user.subscription.expiresAt <= new Date()
    )
  ) {
    user.subscription.plan = "free";
    user.subscription.expiresAt = null;
    await user.save();
  }

  return user.subscription.plan;
};

const getExpiryDate = (startDate = new Date()) => {
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + 30);
  return expiry;
};

exports.subscribe = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["premium", "pro"].includes(plan)) {
      return res.status(400).json({
        message: "Choose premium or pro",
      });
    }

    const currentPlan = await getActivePlan(req.user);

    if (currentPlan !== "free") {
      return res.status(400).json({
        message: "Cancel or renew your active subscription first",
      });
    }

    // Demonstration only: this does not charge money.
    req.user.subscription.plan = plan;
    req.user.subscription.expiresAt = getExpiryDate();

    await req.user.save();

    return res.status(200).json({
      message: "Subscription activated (demo mode)",
      plan,
      price: PLAN_PRICES[plan],
      expiresAt: req.user.subscription.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not subscribe",
    });
  }
};

exports.status = async (req, res) => {
  try {
    const plan = await getActivePlan(req.user);

    return res.json({
      plan,
      expiresAt: req.user.subscription.expiresAt,
      isActive: plan !== "free",
      discountPercent: plan === "pro" ? 20 : 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch subscription status",
    });
  }
};

exports.renew = async (req, res) => {
  try {
    const plan = await getActivePlan(req.user);

    if (plan === "free") {
      return res.status(400).json({
        message: "Subscription expired or inactive. Buy a new plan.",
      });
    }

    // Extend the existing expiry by 30 days.
    const currentExpiry = req.user.subscription.expiresAt;
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + 30);

    req.user.subscription.expiresAt = newExpiry;
    await req.user.save();

    return res.json({
      message: "Subscription renewed (demo mode)",
      plan,
      price: PLAN_PRICES[plan],
      expiresAt: newExpiry,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not renew subscription",
    });
  }
};

exports.cancel = async (req, res) => {
  try {
    await getActivePlan(req.user);

    req.user.subscription.plan = "free";
    req.user.subscription.expiresAt = null;

    await req.user.save();

    return res.json({
      message: "Subscription cancelled; free access is now active",
      plan: "free",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not cancel subscription",
    });
  }
};