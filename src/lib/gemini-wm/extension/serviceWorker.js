import {
  GWR_EXTENSION_GM_XHR_REQUEST
} from './messageTypes.js';

function normalizeRequestHeaders(headers = {}) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name, value]) => name && value != null)
      .map(([name, value]) => [name, String(value)])
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== GWR_EXTENSION_GM_XHR_REQUEST) {
    return false;
  }

  const request = message.request || {};
  fetch(request.url, {
    method: request.method || 'GET',
    headers: normalizeRequestHeaders(request.headers),
    body: request.data ?? undefined,
    credentials: 'omit',
    redirect: 'follow'
  }).then(async (response) => {
    const buffer = await response.arrayBuffer();
    sendResponse({
      ok: response.ok,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bytes: Array.from(new Uint8Array(buffer))
    });
  }).catch((error) => {
    sendResponse({
      ok: false,
      finalUrl: request.url || '',
      status: 0,
      statusText: '',
      headers: {},
      bytes: [],
      error: String(error?.message || error)
    });
  });

  return true;
});
