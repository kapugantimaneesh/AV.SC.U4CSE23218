const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const express = require("express");
const { authenticate, fetchNotifications } = require("./apiClient");
const { topPriorityNotifications } = require("./priorityInbox");

const app = express();
const port = Number(process.env.NOTIFICATION_PORT || 3002);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "campus-notifications",
  });
});

app.get("/notifications", async (req, res) => {
  try {
    const token = await authenticate();
    const notifications = await fetchNotifications(token);

    res.json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch notifications",
      message: error.message,
      details: error.response?.data,
    });
  }
});

app.get("/notifications/priority", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const token = await authenticate();
    const notifications = await fetchNotifications(token);
    const priorityNotifications = topPriorityNotifications(notifications, limit);

    res.json({
      requestedLimit: limit,
      count: priorityNotifications.length,
      priorityRule: "Placement > Result > Event, then newer notifications first",
      priorityNotifications,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: "Failed to build priority inbox",
      message: error.message,
      details: error.response?.data,
    });
  }
});

app.listen(port, () => {
  console.log(`Campus notifications backend running on http://localhost:${port}`);
});
