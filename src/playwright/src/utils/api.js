// api.js
// Network-related functionalities
// These APIs are executed in the Node context and are invisible to Playwright

//==============================
// Import
//==============================
import { config } from '../config.js';
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



// Create the main DB record
export async function apiInitRun(data) {
  if (!data) { throw new Error("Missing data"); }

  const url = `${BASE_URL}/runs`;
  const options = _getApiOptions({ method: "POST", body: data });
  log("[API] Requested new run");

  return await _executeApi({ url, options });
}



// Save new node (GUI state)
export async function apiSaveState(runId, node) {
  if (!runId || !node) { throw new Error("Missing runId or state data"); }

  log("[API] Saving GUI state (graph node)...");
  const url = `${BASE_URL}/runs/${runId}/states`;
  const options = _getApiOptions({ method: "POST", body: node });

  return await _executeApi({ url, options });
}



// Save an interaction execution and its effects
export async function apiSaveInteraction(runId, data) {
  if (!runId || !data) { throw new Error("Missing runId or interaction data"); }

  log("[API] Saving GUI interaction (graph edge)...");
  const url = `${BASE_URL}/runs/${runId}/interactions`;
  const options = _getApiOptions({ method: "POST", body: data });

  return await _executeApi({ url, options });
}



export async function apiStartAnalysis() {
  const url = `${BASE_URL}/analysis`;
  const options = _getApiOptions({ method: "POST", body: { "status": "start" } });
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