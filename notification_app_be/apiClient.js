const axios = require("axios");

const BASE_URL = "http://20.207.122.201/evaluation-service";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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

  return token.replace(/^Bearer\s+/i, "");
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

async function fetchNotifications(token) {
  const response = await axios.get(`${BASE_URL}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 15000,
  });

  return response.data.notifications || [];
}

module.exports = {
  authenticate,
  fetchNotifications,
};
