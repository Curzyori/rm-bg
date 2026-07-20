import {
  GWR_EXTENSION_GM_XHR_REQUEST,
  GWR_EXTENSION_GM_XHR_RESPONSE
} from './messageTypes.js';

let nextRequestId = 1;

function normalizeHeaders(headers = {}) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return { ...headers };
}

function responseHeadersToText(headers = {}) {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\r\n');
}

function bytesToArrayBuffer(bytes = []) {
  return new Uint8Array(bytes).buffer;
}

function decodeResponseBody(response, responseType = '') {
  const normalizedType = String(responseType || '').toLowerCase();
  const arrayBuffer = bytesToArrayBuffer(response?.bytes || []);

  if (normalizedType === 'arraybuffer') {
    return arrayBuffer;
  }

  if (normalizedType === 'blob') {
    const mimeType = response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '';
    return new Blob([arrayBuffer], { type: mimeType });
  }

  const text = new TextDecoder().decode(arrayBuffer);
  if (normalizedType === 'json') {
    return text ? JSON.parse(text) : null;
  }

  return text;
}

function createGmXmlHttpRequest(targetWindow) {
  return function GM_xmlhttpRequest(details = {}) {
    const requestId = `gwr-gm-xhr-${Date.now()}-${nextRequestId++}`;
    const timeoutMs = Number(details.timeout) || 0;
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      targetWindow.removeEventListener('message', handleMessage);
      if (timeoutId != null) {
        targetWindow.clearTimeout(timeoutId);
      }
    };

    const finish = (callback, payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback?.(payload);
    };

    const buildCallbackPayload = (response) => ({
      finalUrl: response?.finalUrl || details.url || '',
      readyState: 4,
      response: decodeResponseBody(response, details.responseType),
      responseHeaders: responseHeadersToText(response?.headers || {}),
      responseText: new TextDecoder().decode(bytesToArrayBuffer(response?.bytes || [])),
      status: Number(response?.status) || 0,
      statusText: response?.statusText || ''
    });

    function handleMessage(event) {
      if (event.source !== targetWindow) return;
      const data = event.data || {};
      if (data.type !== GWR_EXTENSION_GM_XHR_RESPONSE || data.requestId !== requestId) {
        return;
      }

      if (data.error || data.response?.ok === false) {
        finish(details.onerror, {
          error: data.error || data.response?.error || 'GM_xmlhttpRequest failed',
          status: Number(data.response?.status) || 0,
          statusText: data.response?.statusText || ''
        });
        return;
      }

      finish(details.onload, buildCallbackPayload(data.response));
    }

    targetWindow.addEventListener('message', handleMessage);
    if (timeoutMs > 0) {
      timeoutId = targetWindow.setTimeout(() => {
        finish(details.ontimeout, {
          error: 'timeout',
          status: 0,
          statusText: ''
        });
      }, timeoutMs);
    }

    targetWindow.postMessage({
      type: GWR_EXTENSION_GM_XHR_REQUEST,
      requestId,
      request: {
        data: details.data ?? details.body ?? null,
        headers: normalizeHeaders(details.headers),
        method: details.method || 'GET',
        responseType: details.responseType || '',
        url: details.url || ''
      }
    }, '*');

    return {
      abort() {
        finish(details.onabort, {
          error: 'abort',
          status: 0,
          statusText: ''
        });
      }
    };
  };
}

export function installTampermonkeyCompat({
  targetWindow = globalThis.window
} = {}) {
  if (!targetWindow || typeof targetWindow !== 'object') {
    return null;
  }

  targetWindow.unsafeWindow = targetWindow;
  targetWindow.GM_xmlhttpRequest = createGmXmlHttpRequest(targetWindow);
  targetWindow.GM = {
    ...(targetWindow.GM && typeof targetWindow.GM === 'object' ? targetWindow.GM : {}),
    xmlHttpRequest: targetWindow.GM_xmlhttpRequest
  };

  return {
    GM_xmlhttpRequest: targetWindow.GM_xmlhttpRequest,
    unsafeWindow: targetWindow.unsafeWindow
  };
}
