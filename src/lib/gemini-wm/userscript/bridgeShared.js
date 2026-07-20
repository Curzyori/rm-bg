export function buildBlobBridgeResult(processedBlob, processedMeta = null) {
  return {
    processedBlob,
    processedMeta
  };
}

export async function blobBridgeResultToPayload(
  result,
  { invalidBlobMessage = 'Bridge processor must return a Blob' } = {}
) {
  const normalizedResult = result instanceof Blob
    ? buildBlobBridgeResult(result, null)
    : buildBlobBridgeResult(result?.processedBlob, result?.processedMeta ?? null);
  const processedBlob = normalizedResult.processedBlob;
  if (!(processedBlob instanceof Blob)) {
    throw new Error(invalidBlobMessage);
  }

  const processedBuffer = await processedBlob.arrayBuffer();
  return {
    processedBuffer,
    mimeType: processedBlob.type || 'image/png',
    meta: normalizedResult.processedMeta ?? null
  };
}

export function createBlobBridgeResultFromResponse(result = {}) {
  return {
    processedBlob: new Blob([result.processedBuffer], {
      type: result.mimeType || 'image/png'
    }),
    processedMeta: result.meta ?? null
  };
}

export function createBridgeRequestId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function installWindowMessageBridge({
  targetWindow = globalThis.window || null,
  bridgeFlag,
  createHandler
} = {}) {
  if (!targetWindow || typeof targetWindow.addEventListener !== 'function') {
    return null;
  }
  if (!bridgeFlag) {
    throw new Error('bridgeFlag is required');
  }
  if (targetWindow[bridgeFlag]) {
    return targetWindow[bridgeFlag];
  }
  if (typeof createHandler !== 'function') {
    throw new Error('createHandler must be a function');
  }

  const handler = createHandler();
  const listener = (event) => {
    void handler(event);
  };
  targetWindow.addEventListener('message', listener);
  targetWindow[bridgeFlag] = {
    handler,
    dispose() {
      targetWindow.removeEventListener?.('message', listener);
      delete targetWindow[bridgeFlag];
    }
  };
  return targetWindow[bridgeFlag];
}
