import {
  GWR_EXTENSION_GM_XHR_REQUEST,
  GWR_EXTENSION_GM_XHR_RESPONSE,
  GWR_EXTENSION_STATE_REQUEST,
  GWR_EXTENSION_STATE_RESPONSE
} from './messageTypes.js';

const EXTENSION_ENABLED_STORAGE_KEY = 'gwrEnabled';

function readExtensionEnabled(callback) {
  chrome.storage.local.get({ [EXTENSION_ENABLED_STORAGE_KEY]: true }, (items) => {
    callback(items?.[EXTENSION_ENABLED_STORAGE_KEY] !== false);
  });
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.type === GWR_EXTENSION_STATE_REQUEST && data.requestId) {
    readExtensionEnabled((enabled) => {
      window.postMessage({
        type: GWR_EXTENSION_STATE_RESPONSE,
        requestId: data.requestId,
        enabled
      }, '*');
    });
    return;
  }

  if (data.type !== GWR_EXTENSION_GM_XHR_REQUEST || !data.requestId) {
    return;
  }

  chrome.runtime.sendMessage({
    type: GWR_EXTENSION_GM_XHR_REQUEST,
    requestId: data.requestId,
    request: data.request || {}
  }, (response) => {
    window.postMessage({
      type: GWR_EXTENSION_GM_XHR_RESPONSE,
      requestId: data.requestId,
      response: response || {
        ok: false,
        status: 0,
        statusText: '',
        headers: {},
        bytes: [],
        error: chrome.runtime.lastError?.message || 'No extension response'
      }
    }, '*');
  });
});
