const Content = require("../models/Content");

exports.getFreeContent = async (req, res) => {
  try {
    const content = await Content.find({ category: "free" });

    return res.json({
      count: content.length,
      content,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch free content",
    });
  }
};

exports.getPremiumContent = async (req, res) => {
  try {
    const User = require("../models/User");

    const user = await User.findById(req.user._id);

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

    if (!["premium", "pro"].includes(user.subscription.plan)) {
      return res.status(403).json({
        message: "Premium or pro subscription required",
      });
    }

    const content = await Content.find({
      category: { $in: ["free", "premium"] },
    });

    return res.json({
      count: content.length,
      content,
      plan: user.subscription.plan,
      discountPercent:
        user.subscription.plan === "pro" ? 20 : 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch premium content",
    });
  }
};

exports.createContent = async (req, res) => {
  try {
    const { title, description, category, price } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      !["free", "premium"].includes(category)
    ) {
      return res.status(400).json({
        message: "Valid title, description, and category are required",
      });
    }

    if (
      price !== undefined &&
      (
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      )
    ) {
      return res.status(400).json({
        message: "Price must be a non-negative number",
      });
    }

    const content = await Content.create({
      title: title.trim(),
      description: description.trim(),
      category,
      price: price ?? 0,
    });

    return res.status(201).json({
      message: "Content created successfully",
      content,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not create content",
    });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "category",
      "price",
    ];

    const updates = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (
      Object.keys(updates).length === 0 ||
      (updates.title !== undefined &&
        (typeof updates.title !== "string" ||
          !updates.title.trim())) ||
      (updates.description !== undefined &&
        (typeof updates.description !== "string" ||
          !updates.description.trim())) ||
      (updates.category !== undefined &&
        !["free", "premium"].includes(updates.category)) ||
      (updates.price !== undefined &&
        (typeof updates.price !== "number" ||
          !Number.isFinite(updates.price) ||
          updates.price < 0))
    ) {
      return res.status(400).json({
        message: "Invalid content fields",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        message: "Content not found",
      });
    }

    return res.json({
      message: "Content updated successfully",
      content,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid content ID",
      });
    }

    return res.status(500).json({
      message: "Could not update content",
    });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndDelete(
      req.params.id
    );

    if (!content) {
      return res.status(404).json({
        message: "Content not found",
      });
    }

    return res.json({
      message: "Content deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid content ID",
      });
    }

    return res.status(500).json({
      message: "Could not delete content",
    });
  }
};