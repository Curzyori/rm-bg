import { normalizeErrorMessage } from '../shared/errorUtils.js';
import {
  blobBridgeResultToPayload,
  buildBlobBridgeResult,
  createBlobBridgeResultFromResponse,
  createBridgeRequestId,
  installWindowMessageBridge
} from './bridgeShared.js';

export const PAGE_PROCESS_REQUEST = 'gwr:page-process-request';
export const PAGE_PROCESS_RESPONSE = 'gwr:page-process-response';

const PAGE_PROCESS_BRIDGE_FLAG = '__gwrPageProcessBridgeInstalled__';

function isAllowedMessageSource(eventSource, targetWindow) {
  if (!targetWindow || !eventSource) {
    return true;
  }
  if (eventSource === targetWindow) {
    return true;
  }

  try {
    if (eventSource.window === targetWindow || eventSource.self === targetWindow) {
      return true;
    }
  } catch {}

  try {
    if (targetWindow.window === eventSource || targetWindow.self === eventSource) {
      return true;
    }
  } catch {}

  return false;
}

export function createPageProcessBridgeServer({
  targetWindow = globalThis.window || null,
  processWatermarkBlob,
  removeWatermarkFromBlob,
  logger = console
} = {}) {
  return async function handlePageProcessBridge(event) {
    if (!event?.data || event.data.type !== PAGE_PROCESS_REQUEST) {
      return;
    }
    if (!isAllowedMessageSource(event?.source, targetWindow)) {
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
          throw new Error('processWatermarkBlob page bridge handler unavailable');
        }
        result = await processWatermarkBlob(inputBlob, event.data.options || {});
      } else if (action === 'remove-watermark-blob') {
        if (typeof removeWatermarkFromBlob !== 'function') {
          throw new Error('removeWatermarkFromBlob page bridge handler unavailable');
        }
        result = await removeWatermarkFromBlob(inputBlob, event.data.options || {});
      } else {
        throw new Error(`Unknown page bridge action: ${action}`);
      }

      const payload = await blobBridgeResultToPayload(result, {
        invalidBlobMessage: 'Page bridge processor must return a Blob'
      });
      targetWindow.postMessage({
        type: PAGE_PROCESS_RESPONSE,
        requestId,
        ok: true,
        action,
        result: payload
      }, '*', [payload.processedBuffer]);
    } catch (error) {
      logger?.warn?.('[Gemini Watermark Remover] Page bridge request failed:', error);
      targetWindow.postMessage({
        type: PAGE_PROCESS_RESPONSE,
        requestId,
        ok: false,
        action,
        error: normalizeErrorMessage(error, 'Page bridge failed')
      }, '*');
    }
  };
}

export function installPageProcessBridge(options = {}) {
  const {
    targetWindow = globalThis.window || null
  } = options;

  return installWindowMessageBridge({
    targetWindow,
    bridgeFlag: PAGE_PROCESS_BRIDGE_FLAG,
    createHandler() {
      return createPageProcessBridgeServer({
        ...options,
        targetWindow
      });
    }
  });
}

function sanitizeSerializableAssetIds(assetIds = null) {
  if (!assetIds || typeof assetIds !== 'object') {
    return null;
  }

  const sanitized = {};
  for (const key of ['responseId', 'draftId', 'conversationId']) {
    if (typeof assetIds[key] === 'string' && assetIds[key].trim()) {
      sanitized[key] = assetIds[key].trim();
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizeSerializableResource(resource = null) {
  if (!resource || typeof resource !== 'object') {
    return null;
  }

  const sanitized = {};
  for (const key of ['kind', 'url', 'mimeType', 'source', 'slot']) {
    if (typeof resource[key] === 'string' && resource[key].trim()) {
      sanitized[key] = resource[key].trim();
    }
  }
  if (resource.processedMeta != null) {
    sanitized.processedMeta = resource.processedMeta;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizeSerializableActionContext(actionContext = null) {
  if (!actionContext || typeof actionContext !== 'object') {
    return null;
  }

  const sanitized = {};
  if (typeof actionContext.action === 'string' && actionContext.action.trim()) {
    sanitized.action = actionContext.action.trim();
  }
  if (typeof actionContext.sessionKey === 'string' && actionContext.sessionKey.trim()) {
    sanitized.sessionKey = actionContext.sessionKey.trim();
  }

  const assetIds = sanitizeSerializableAssetIds(actionContext.assetIds);
  if (assetIds) {
    sanitized.assetIds = assetIds;
  }

  const resource = sanitizeSerializableResource(actionContext.resource);
  if (resource) {
    sanitized.resource = resource;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizePageProcessOptions(options = {}) {
  if (!options || typeof options !== 'object') {
    return {};
  }

  const sanitized = { ...options };
  const actionContext = sanitizeSerializableActionContext(options.actionContext);
  delete sanitized.actionContext;
  if (actionContext) {
    sanitized.actionContext = actionContext;
  }
  return sanitized;
}

export function createPageProcessBridgeClient({
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
    const requestId = createBridgeRequestId('gwr-page-bridge');
    const sanitizedOptions = sanitizePageProcessOptions(options);

    try {
      return await new Promise((resolve, reject) => {
        const cleanup = () => {
          targetWindow.removeEventListener('message', handleMessage);
          globalThis.clearTimeout(timeoutId);
        };

        const handleMessage = (event) => {
          if (!isAllowedMessageSource(event?.source, targetWindow)) {
            return;
          }
          if (!event?.data || event.data.type !== PAGE_PROCESS_RESPONSE) {
            return;
          }
          if (event.data.requestId !== requestId) {
            return;
          }

          cleanup();
          if (event.data.ok === false) {
            reject(new Error(normalizeErrorMessage(event.data.error, 'Page bridge failed')));
            return;
          }
          resolve(createBlobBridgeResultFromResponse(event.data.result));
        };

        const timeoutId = globalThis.setTimeout(() => {
          cleanup();
          reject(new Error(`Page bridge timed out: ${action}`));
        }, timeoutMs);

        targetWindow.addEventListener('message', handleMessage);
        targetWindow.postMessage({
          type: PAGE_PROCESS_REQUEST,
          requestId,
          action,
          inputBuffer,
          mimeType: blob.type || 'image/png',
          options: sanitizedOptions
        }, '*', [inputBuffer]);
      });
    } catch (error) {
      logger?.warn?.('[Gemini Watermark Remover] Page bridge fallback:', error);
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
