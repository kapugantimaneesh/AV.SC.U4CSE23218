const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const axios = require("axios");
const { scheduleMaintenance } = require("./scheduler");

const BASE_URL = "http://20.207.122.201/evaluation-service";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function registrationBody() {
  return {
    email: requiredEnv("EMAIL"),
    name: requiredEnv("NAME"),
    mobileNo: requiredEnv("MOBILE_NO"),
    githubUsername: requiredEnv("GITHUB_USERNAME"),
    rollNo: requiredEnv("ROLL_NO"),
    accessCode: requiredEnv("ACCESS_CODE"),
  };
}

function authBody() {
  return {
    email: requiredEnv("EMAIL"),
    name: requiredEnv("NAME"),
    rollNo: requiredEnv("ROLL_NO"),
    accessCode: requiredEnv("ACCESS_CODE"),
    clientID: requiredEnv("CLIENT_ID"),
    clientSecret: requiredEnv("CLIENT_SECRET"),
  };
}

function extractToken(responseBody) {
  const token =
    responseBody.access_token ||
    responseBody.accessToken ||
    responseBody.token ||
    responseBody.Authorization ||
    responseBody.authorization;

  if (!token || typeof token !== "string") {
    throw new Error(`Auth succeeded, but no token field was found: ${JSON.stringify(responseBody)}`);
  }

  return token.startsWith("Bearer ") ? token.slice("Bearer ".length) : token;
}

async function register() {
  const response = await axios.post(`${BASE_URL}/register`, registrationBody(), {
    timeout: 15000,
  });

  return response.data;
}

async function authenticate() {
  if (process.env.AUTH_TOKEN) {
    return process.env.AUTH_TOKEN.replace(/^Bearer\s+/i, "");
  }

  const response = await axios.post(`${BASE_URL}/auth`, authBody(), {
    timeout: 15000,
  });

  return extractToken(response.data);
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchProtectedData(token) {
  const headers = authHeaders(token);

  const [depotsResponse, vehiclesResponse] = await Promise.all([
    axios.get(`${BASE_URL}/depots`, { headers, timeout: 15000 }),
    axios.get(`${BASE_URL}/vehicles`, { headers, timeout: 15000 }),
  ]);

  return {
    depots: depotsResponse.data.depots,
    vehicles: vehiclesResponse.data.vehicles,
  };
}

function sampleData() {
  return {
    depots: [
      { ID: 1, MechanicHours: 10 },
      { ID: 2, MechanicHours: 15 },
    ],
    vehicles: [
      { TaskID: "quick-high-impact", Duration: 1, Impact: 5 },
      { TaskID: "long-low-impact", Duration: 6, Impact: 2 },
      { TaskID: "medium-strong", Duration: 5, Impact: 9 },
      { TaskID: "short-best", Duration: 2, Impact: 9 },
      { TaskID: "balanced", Duration: 3, Impact: 10 },
    ],
  };
}

function printSchedule(schedule) {
  console.log(JSON.stringify({ schedules: schedule }, null, 2));
}

async function main() {
  const command = process.argv[2] || "schedule";

  if (command === "register") {
    const registered = await register();
    console.log(JSON.stringify(registered, null, 2));
    return;
  }

  if (command === "sample") {
    const { depots, vehicles } = sampleData();
    printSchedule(scheduleMaintenance(depots, vehicles));
    return;
  }

  if (command !== "schedule") {
    throw new Error("Usage: node vehicle_maintenance_scheduler/index.js [register|schedule|sample]");
  }

  const token = await authenticate();
  const { depots, vehicles } = await fetchProtectedData(token);
  printSchedule(scheduleMaintenance(depots, vehicles));
}

if (require.main === module) {
  main().catch((error) => {
    const responseBody = error.response ? JSON.stringify(error.response.data) : "";
    console.error(`Vehicle scheduler failed: ${error.message}`);

    if (responseBody) {
      console.error(responseBody);
    }

    process.exitCode = 1;
  });
}

module.exports = {
  authenticate,
  fetchProtectedData,
  register,
};
