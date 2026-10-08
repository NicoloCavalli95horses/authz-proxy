// api.js
// Network-related functionalities
// These APIs are executed in the Node context and are invisible to Playwright

//==============================
// Import
//==============================
import { log } from './utils.js';


//==============================
// Consts
//==============================
const BASE_URL = `http://${process.env.API_HOST}:${process.env.API_PORT}/api`;


//==============================
// Functions
//==============================

export async function apiToggleProxyState(enable) {
  const url = `${BASE_URL}/proxy`;
  const options = _getApiOptions({ method: "PUT", body: { "enable": enable } });
  log("[API] Requested new proxy state: " + enable)

  return await _executeApi({ url, options });
}



export async function apiGetResults() {
  const url = `${BASE_URL}/results`;
  const options = _getApiOptions();
  log("[API] Requested new analysis")

  return await _executeApi({ url, options });
}



async function _executeApi({ url, options }) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (response.ok && (response.status >= 200 && response.status < 300)) {
      return data;
    }

    const message = data?.detail || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  } catch (err) {
    log("[API] Request failed:", err);
    throw err;
  }
}



function _getApiOptions({
  method = "GET",
  headers = {},
  body,
  token,
} = {}) {
  return {
    method,
    body: JSON.stringify(body),
    headers: {
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      "Content-Type": "application/json",
    },
  };
}