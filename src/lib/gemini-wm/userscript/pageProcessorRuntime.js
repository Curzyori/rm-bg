import { toTrustedScript, toTrustedScriptUrl } from './trustedTypes.js';

const PAGE_PROCESSOR_SCRIPT_FLAG = '__gwrPageProcessorScriptInstalled__';
const PAGE_PROCESS_RUNTIME_FLAG = '__gwrPageProcessRuntimeInstalled__';
const PAGE_PROCESSOR_SCRIPT_TIMEOUT_MS = 5000;

function getExistingScriptNonce(documentRef) {
  const existingScript = documentRef?.querySelector?.('script[nonce]');
  const nonce = existingScript?.nonce || existingScript?.getAttribute?.('nonce') || '';
  return typeof nonce === 'string' && nonce.length > 0 ? nonce : '';
}

function applyScriptNonce(script, nonce) {
  if (!script || !nonce) {
    return;
  }
  script.nonce = nonce;
  script.setAttribute?.('nonce', nonce);
}

function createScriptElement(documentRef, nonce) {
  const script = documentRef.createElement('script');
  applyScriptNonce(script, nonce);
  return script;
}

function appendRuntimeScript(documentRef, script) {
  const parent = documentRef.head || documentRef.documentElement || documentRef.body;
  parent?.appendChild(script);
}

async function injectInlineRuntimeScript({
  targetWindow,
  documentRef,
  scriptCode,
  nonce
}) {
  const script = createScriptElement(documentRef, nonce);
  const trustedScript = toTrustedScript(scriptCode, targetWindow);
  if (!trustedScript) {
    throw new Error('Trusted Types script injection unavailable');
  }
  script.textContent = trustedScript;
  appendRuntimeScript(documentRef, script);
  script.remove();
  return targetWindow[PAGE_PROCESS_RUNTIME_FLAG] || null;
}

async function injectBlobRuntimeScript({
  targetWindow,
  documentRef,
  scriptCode,
  nonce
}) {
  const script = createScriptElement(documentRef, nonce);
  const blobUrl = URL.createObjectURL(new Blob([scriptCode], {
    type: 'text/javascript'
  }));
  const trustedScriptUrl = toTrustedScriptUrl(blobUrl, targetWindow);
  if (!trustedScriptUrl) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Trusted Types script URL injection unavailable');
  }

  try {
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        targetWindow.clearTimeout?.(timeoutId);
        script.onload = null;
        script.onerror = null;
      };
      const timeoutId = targetWindow.setTimeout?.(() => {
        cleanup();
        reject(new Error('Page runtime blob injection timed out'));
      }, PAGE_PROCESSOR_SCRIPT_TIMEOUT_MS);

      script.onload = () => {
        cleanup();
        resolve();
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('Page runtime blob injection failed'));
      };
      script.src = trustedScriptUrl;
      appendRuntimeScript(documentRef, script);
    });
  } finally {
    script.remove();
    URL.revokeObjectURL(blobUrl);
  }

  return targetWindow[PAGE_PROCESS_RUNTIME_FLAG] || null;
}

export async function installInjectedPageProcessorRuntime({
  targetWindow = globalThis.window || null,
  scriptCode = '',
  logger = console
} = {}) {
  if (!targetWindow || typeof scriptCode !== 'string' || scriptCode.length === 0) {
    return null;
  }
  if (targetWindow[PAGE_PROCESS_RUNTIME_FLAG]) {
    return targetWindow[PAGE_PROCESS_RUNTIME_FLAG];
  }
  if (targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG]) {
    return targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG];
  }

  const documentRef = targetWindow.document;
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    return null;
  }

  const nonce = getExistingScriptNonce(documentRef);

  try {
    const inlineRuntime = await injectInlineRuntimeScript({
      targetWindow,
      documentRef,
      scriptCode,
      nonce
    });
    if (inlineRuntime) {
      targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG] = inlineRuntime;
      return inlineRuntime;
    }

    logger?.info?.('[Gemini Watermark Remover] Page runtime inline injection did not register, retrying with blob script');
    const blobRuntime = await injectBlobRuntimeScript({
      targetWindow,
      documentRef,
      scriptCode,
      nonce
    });
    if (blobRuntime) {
      targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG] = blobRuntime;
      return blobRuntime;
    }
  } catch (error) {
    logger?.warn?.('[Gemini Watermark Remover] Page runtime injection failed:', error);
    return null;
  }

  if (!targetWindow[PAGE_PROCESS_RUNTIME_FLAG]) {
    logger?.warn?.('[Gemini Watermark Remover] Page runtime injection did not register a bridge');
    return null;
  }

  targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG] = targetWindow[PAGE_PROCESS_RUNTIME_FLAG];
  return targetWindow[PAGE_PROCESSOR_SCRIPT_FLAG];
}
