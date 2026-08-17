// api.js
// Network-related functionalities

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



export async function apiStartAnalysis() {
  const url = `${BASE_URL}/analysis`;
  const options = _getApiOptions({ method: "POST", body: { "status": "start" } });
  log("[API] Requested new analysis")

  return await _executeApi({ url, options });
}



export async function apiSaveGraph(data) {
  data.timestamp = Date.now();

  const url = `${BASE_URL}/graphs`;
  const options = _getApiOptions({ method: "POST", body: data });

  return await _executeApi({ url, options });
}



async function _executeApi({ url, options }) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok && (response.status >= 200 && response.status < 300)) {
      // success
      return data;
    } else {
      const msg = data?.message || 'Unknown error';
      log('[API]', { msg, time: 3000 });
      return null;
    }

  } catch (err) {
    console.error('Request error:', err);
    log('[API]', { msg: 'Request error' });
    return null;
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