import { installTampermonkeyCompat } from './tampermonkeyCompat.js';
import {
  GWR_EXTENSION_STATE_REQUEST,
  GWR_EXTENSION_STATE_RESPONSE
} from './messageTypes.js';
import { initGeminiWatermarkRemoverUserscript } from '../userscript/index.js';

let nextStateRequestId = 1;

function resolveExtensionEnabled({
  targetWindow = window,
  timeoutMs = 500
} = {}) {
  if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
    return Promise.resolve(true);
  }

  const requestId = `gwr-extension-state-${Date.now()}-${nextStateRequestId++}`;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (enabled) => {
      if (settled) return;
      settled = true;
      targetWindow.removeEventListener('message', handleMessage);
      targetWindow.clearTimeout?.(timeoutId);
      resolve(enabled !== false);
    };
    const handleMessage = (event) => {
      if (event.source !== targetWindow) return;
      const data = event.data || {};
      if (data.type !== GWR_EXTENSION_STATE_RESPONSE || data.requestId !== requestId) {
        return;
      }
      finish(data.enabled);
    };
    const timeoutId = targetWindow.setTimeout?.(() => {
      finish(true);
    }, timeoutMs);

    targetWindow.addEventListener('message', handleMessage);
    targetWindow.postMessage({
      type: GWR_EXTENSION_STATE_REQUEST,
      requestId
    }, '*');
  });
}

async function initExtensionUserscript() {
  const enabled = await resolveExtensionEnabled();
  if (!enabled) {
    console.info('[Gemini Watermark Remover] Extension disabled');
    return;
  }

  installTampermonkeyCompat({
    targetWindow: window
  });

  await initGeminiWatermarkRemoverUserscript();
}

void initExtensionUserscript();
