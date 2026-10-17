require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    message: "L2 Authentication and Subscription API is running",
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/subscriptionRoutes"));
app.use("/api/content", require("./routes/contentRoutes"));

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    if (
      !process.env.MONGO_URI ||
      !process.env.JWT_ACCESS_SECRET ||
      !process.env.JWT_REFRESH_SECRET
    ) {
      throw new Error("Required environment variables are missing");
    }

    if (
      process.env.JWT_ACCESS_SECRET.length < 32 ||
      process.env.JWT_REFRESH_SECRET.length < 32 ||
      process.env.JWT_ACCESS_SECRET ===
        process.env.JWT_REFRESH_SECRET
    ) {
      throw new Error("Use two different strong JWT secrets");
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();