const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const express = require("express");
const { authenticate, fetchProtectedData, register } = require("./index");
const { scheduleMaintenance } = require("./scheduler");

const app = express();
const port = Number(process.env.VEHICLE_PORT || 3001);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "vehicle-maintenance-scheduler",
  });
});

app.post("/register", async (req, res) => {
  try {
    const registered = await register();
    res.status(201).json(registered);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: "Registration failed",
      message: error.message,
      details: error.response?.data,
    });
  }
});

app.get("/schedule", async (req, res) => {
  try {
    const token = await authenticate();
    const { depots, vehicles } = await fetchProtectedData(token);
    const schedules = scheduleMaintenance(depots, vehicles);

    res.json({
      depotCount: schedules.length,
      vehicleCount: vehicles.length,
      schedules,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: "Scheduling failed",
      message: error.message,
      details: error.response?.data,
    });
  }
});

app.listen(port, () => {
  console.log(`Vehicle maintenance scheduler running on http://localhost:${port}`);
});
