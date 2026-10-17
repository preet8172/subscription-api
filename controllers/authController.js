const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

const createToken = (user, type, secret, expiresIn) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type,
      jti: randomUUID(),
    },
    secret,
    {
      expiresIn,
      algorithm: "HS256",
    }
  );
};

const addToBlacklist = async (token, secret, type) => {
  const decoded = jwt.verify(token, secret, {
    algorithms: ["HS256"],
  });

  if (decoded.type !== type || !decoded.jti) {
    throw new Error("Invalid token type");
  }

  await TokenBlacklist.updateOne(
    { jti: decoded.jti },
    {
      $setOnInsert: {
        jti: decoded.jti,
        expiresAt: new Date(decoded.exp * 1000),
      },
    },
    { upsert: true }
  );
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Provide a username, valid email, and password of at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Signup failed",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const accessToken = createToken(
      user,
      "access",
      process.env.JWT_ACCESS_SECRET,
      "15m"
    );

    const refreshToken = createToken(
      user,
      "refresh",
      process.env.JWT_REFRESH_SECRET,
      "7d"
    );

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: 900,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string") {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        message: "Access token required",
      });
    }

    // Verify both tokens before revoking either.
    const access = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET,
      { algorithms: ["HS256"] }
    );

    const refresh = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      { algorithms: ["HS256"] }
    );

    if (
      access.type !== "access" ||
      refresh.type !== "refresh" ||
      access.sub !== req.user._id.toString() ||
      refresh.sub !== access.sub ||
      !access.jti ||
      !refresh.jti
    ) {
      return res.status(401).json({
        message: "Invalid token pair",
      });
    }

    await TokenBlacklist.bulkWrite([
      {
        updateOne: {
          filter: { jti: access.jti },
          update: {
            $setOnInsert: {
              jti: access.jti,
              expiresAt: new Date(access.exp * 1000),
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { jti: refresh.jti },
          update: {
            $setOnInsert: {
              jti: refresh.jti,
              expiresAt: new Date(refresh.exp * 1000),
            },
          },
          upsert: true,
        },
      },
    ]);

    return res.json({
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string") {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      { algorithms: ["HS256"] }
    );

    if (decoded.type !== "refresh" || !decoded.jti) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    const blacklisted = await TokenBlacklist.exists({
      jti: decoded.jti,
    });

    if (blacklisted) {
      return res.status(401).json({
        message: "Refresh token has been revoked",
      });
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Rotate refresh tokens to prevent reuse.
    const newRefreshToken = createToken(
      user,
      "refresh",
      process.env.JWT_REFRESH_SECRET,
      "7d"
    );

    await addToBlacklist(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      "refresh"
    );

    const accessToken = createToken(
      user,
      "access",
      process.env.JWT_ACCESS_SECRET,
      "15m"
    );

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresIn: 900,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid, expired, or revoked refresh token",
    });
  }
};