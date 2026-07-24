//==============================
// Import
//==============================
import { log } from '../utils/utils.js';


//==============================
// Consts
//==============================
const BASE_URL = "http://127.0.0.1:8000/api";


//==============================
// Functions
//==============================

export async function apiToggleProxyState(enable) {
  const url = `${BASE_URL}/${enable ? 'start' : 'stop'}`;
  const options = _getApiOptions({ method: "POST" });
  log("[Fetch API] Requested new proxy state: " + enable)

  return await _executeApi({ url, options });
}


async function _executeApi({ url, options }) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok && response.status === 200) {
      // success
      return data;
    } else {
      const msg = data?.message || 'Unknown error';
      addToastMsg({ msg, time: 3000 });
      return null;
    }

  } catch (err) {
    console.error('Request error:', err);
    addToastMsg({ msg: 'Request error' });
    return null;
  }
}


function _getApiOptions({
  method,
  mode,
  cache,
  credentials,
  headers,
  redirect,
  referrerPolicy,
  body,
  accept,
  token,
} = {}) {

  return {
    method: method || "GET",
    mode: mode || "cors",
    cache: cache || "no-cache",
    credentials: credentials || "same-origin",
    body: body || undefined,
    accept: accept,
    headers: {
      ...headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    redirect: redirect || "follow",
    referrerPolicy: referrerPolicy || "origin",
  };
}