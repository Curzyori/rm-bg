import { normalizeErrorMessage } from '../shared/errorUtils.js';
import {
  blobBridgeResultToPayload,
  buildBlobBridgeResult,
  createBlobBridgeResultFromResponse,
  createBridgeRequestId,
  installWindowMessageBridge
} from './bridgeShared.js';

export const USERSCRIPT_PROCESS_REQUEST = 'gwr:userscript-process-request';
export const USERSCRIPT_PROCESS_RESPONSE = 'gwr:userscript-process-response';

const USERSCRIPT_PROCESS_BRIDGE_FLAG = '__gwrUserscriptProcessBridgeInstalled__';

export function createUserscriptProcessBridgeServer({
  targetWindow = globalThis.window || null,
  processWatermarkBlob,
  removeWatermarkFromBlob,
  logger = console
} = {}) {
  return async function handleUserscriptProcessBridge(event) {
    if (!event?.data || event.data.type !== USERSCRIPT_PROCESS_REQUEST) {
      return;
    }
    if (targetWindow && event.source && event.source !== targetWindow) {
      return;
    }
    if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
      return;
    }

    const requestId = typeof event.data.requestId === 'string' ? event.data.requestId : '';
    const action = typeof event.data.action === 'string' ? event.data.action : '';
    if (!requestId || !action) {
      return;
    }

    try {
      const inputBlob = new Blob([event.data.inputBuffer], {
        type: event.data.mimeType || 'image/png'
      });
      let result;
      if (action === 'process-watermark-blob') {
        if (typeof processWatermarkBlob !== 'function') {
          throw new Error('processWatermarkBlob bridge handler unavailable');
        }
        result = await processWatermarkBlob(inputBlob, event.data.options || {});
      } else if (action === 'remove-watermark-blob') {
        if (typeof removeWatermarkFromBlob !== 'function') {
          throw new Error('removeWatermarkFromBlob bridge handler unavailable');
        }
        result = await removeWatermarkFromBlob(inputBlob, event.data.options || {});
      } else {
        throw new Error(`Unknown bridge action: ${action}`);
      }

      const payload = await blobBridgeResultToPayload(result, {
        invalidBlobMessage: 'Bridge processor must return a Blob'
      });
      targetWindow.postMessage({
        type: USERSCRIPT_PROCESS_RESPONSE,
        requestId,
        ok: true,
        action,
        result: payload
      }, '*', [payload.processedBuffer]);
    } catch (error) {
      logger?.warn?.('[Gemini Watermark Remover] Userscript bridge request failed:', error);
      targetWindow.postMessage({
        type: USERSCRIPT_PROCESS_RESPONSE,
        requestId,
        ok: false,
        action,
        error: normalizeErrorMessage(error, 'Userscript bridge failed')
      }, '*');
    }
  };
}

export function installUserscriptProcessBridge(options = {}) {
  const {
    targetWindow = globalThis.window || null
  } = options;

  return installWindowMessageBridge({
    targetWindow,
    bridgeFlag: USERSCRIPT_PROCESS_BRIDGE_FLAG,
    createHandler() {
      return createUserscriptProcessBridgeServer({
        ...options,
        targetWindow
      });
    }
  });
}

export function createUserscriptProcessBridgeClient({
  targetWindow = globalThis.window || null,
  timeoutMs = 120000,
  fallbackProcessWatermarkBlob,
  fallbackRemoveWatermarkFromBlob,
  logger = console
} = {}) {
  async function request(action, blob, options, fallback) {
    if (!(blob instanceof Blob)) {
      throw new TypeError('blob must be a Blob');
    }

    if (
      !targetWindow
      || typeof targetWindow.addEventListener !== 'function'
      || typeof targetWindow.removeEventListener !== 'function'
      || typeof targetWindow.postMessage !== 'function'
    ) {
      return fallback(blob, options);
    }

    const inputBuffer = await blob.arrayBuffer();
    const requestId = createBridgeRequestId('gwr-us-bridge');

    try {
      return await new Promise((resolve, reject) => {
        const cleanup = () => {
          targetWindow.removeEventListener('message', handleMessage);
          globalThis.clearTimeout(timeoutId);
        };

        const handleMessage = (event) => {
          if (targetWindow && event.source && event.source !== targetWindow) {
            return;
          }
          if (!event?.data || event.data.type !== USERSCRIPT_PROCESS_RESPONSE) {
            return;
          }
          if (event.data.requestId !== requestId) {
            return;
          }

          cleanup();
          if (event.data.ok === false) {
            reject(new Error(normalizeErrorMessage(event.data.error, 'Userscript bridge failed')));
            return;
          }
          resolve(createBlobBridgeResultFromResponse(event.data.result));
        };

        const timeoutId = globalThis.setTimeout(() => {
          cleanup();
          reject(new Error(`Userscript bridge timed out: ${action}`));
        }, timeoutMs);

        targetWindow.addEventListener('message', handleMessage);
        targetWindow.postMessage({
          type: USERSCRIPT_PROCESS_REQUEST,
          requestId,
          action,
          inputBuffer,
          mimeType: blob.type || 'image/png',
          options: options || {}
        }, '*', [inputBuffer]);
      });
    } catch (error) {
      logger?.warn?.('[Gemini Watermark Remover] Userscript bridge fallback:', error);
      return fallback(blob, options);
    }
  }

  return {
    async processWatermarkBlob(blob, options = {}) {
      if (typeof fallbackProcessWatermarkBlob !== 'function') {
        throw new Error('fallbackProcessWatermarkBlob must be a function');
      }
      return request('process-watermark-blob', blob, options, fallbackProcessWatermarkBlob);
    },
    async removeWatermarkFromBlob(blob, options = {}) {
      if (typeof fallbackRemoveWatermarkFromBlob !== 'function') {
        throw new Error('fallbackRemoveWatermarkFromBlob must be a function');
      }
      const result = await request('remove-watermark-blob', blob, options, async (inputBlob, inputOptions) => {
        const processedBlob = await fallbackRemoveWatermarkFromBlob(inputBlob, inputOptions);
        return buildBlobBridgeResult(processedBlob, null);
      });
      return result.processedBlob;
    }
  };
}
