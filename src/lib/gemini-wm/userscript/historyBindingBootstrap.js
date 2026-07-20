const GEMINI_HISTORY_RPC_ID = 'hNvQHb';
const GEMINI_HISTORY_PAGE_SIZE = 10;

function normalizeConversationRouteSegment(segment = '') {
  const normalizedSegment = String(segment || '').trim().replace(/^\/+|\/+$/g, '');
  if (!normalizedSegment || normalizedSegment === 'app') {
    return '';
  }

  if (normalizedSegment.startsWith('c_')) {
    return normalizedSegment;
  }

  return `c_${normalizedSegment}`;
}

export function extractGeminiConversationIdFromPath(pathname = '') {
  const normalizedPath = String(pathname || '').trim();
  if (!normalizedPath) {
    return '';
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  const appIndex = segments.indexOf('app');
  if (appIndex < 0) {
    return '';
  }

  return normalizeConversationRouteSegment(segments[appIndex + 1] || '');
}

export function getGeminiBootstrapRpcConfig(targetWindow = globalThis.window || null) {
  const bootstrapData = targetWindow?.WIZ_global_data;
  if (!bootstrapData || typeof bootstrapData !== 'object') {
    return null;
  }

  const at = typeof bootstrapData.SNlM0e === 'string' ? bootstrapData.SNlM0e.trim() : '';
  const buildLabel = typeof bootstrapData.cfb2h === 'string' ? bootstrapData.cfb2h.trim() : '';
  const sessionId = typeof bootstrapData.FdrFJe === 'string' ? bootstrapData.FdrFJe.trim() : '';
  const endpointBase = typeof bootstrapData.eptZe === 'string' ? bootstrapData.eptZe.trim() : '';

  if (!at || !buildLabel || !sessionId || !endpointBase) {
    return null;
  }

  return {
    at,
    buildLabel,
    sessionId,
    endpointBase
  };
}

export function buildGeminiConversationHistoryRequest({
  origin = 'https://gemini.google.com',
  sourcePath = '/app',
  hl = 'en',
  reqId = 100000,
  conversationId = '',
  rpcConfig = null,
  pageSize = GEMINI_HISTORY_PAGE_SIZE
} = {}) {
  if (!conversationId || !rpcConfig) {
    return null;
  }

  const endpointBase = String(rpcConfig.endpointBase || '').trim();
  const endpointPath = endpointBase.endsWith('/')
    ? `${endpointBase}data/batchexecute`
    : `${endpointBase}/data/batchexecute`;
  const url = new URL(endpointPath, origin);
  url.searchParams.set('rpcids', GEMINI_HISTORY_RPC_ID);
  url.searchParams.set('source-path', sourcePath || '/app');
  url.searchParams.set('bl', rpcConfig.buildLabel);
  url.searchParams.set('f.sid', rpcConfig.sessionId);
  url.searchParams.set('hl', hl || 'en');
  url.searchParams.set('_reqid', String(reqId));
  url.searchParams.set('rt', 'c');

  const payload = [[[
    GEMINI_HISTORY_RPC_ID,
    JSON.stringify([conversationId, pageSize, null, 1, [0], [4], null, 1]),
    null,
    'generic'
  ]]];

  return {
    url: url.toString(),
    init: {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `f.req=${encodeURIComponent(JSON.stringify(payload))}&at=${encodeURIComponent(rpcConfig.at)}&`
    }
  };
}

let historyReqCounter = 0;

function nextHistoryReqId() {
  historyReqCounter = (historyReqCounter + 100000) % 900000;
  return 100000 + historyReqCounter;
}

export async function requestGeminiConversationHistoryBindings({
  targetWindow = globalThis.window || null,
  fetchImpl = null,
  onResponseText = null,
  logger = console
} = {}) {
  if (!targetWindow || typeof targetWindow !== 'object') {
    return false;
  }

  const conversationId = extractGeminiConversationIdFromPath(targetWindow.location?.pathname || '');
  if (!conversationId) {
    return false;
  }

  const rpcConfig = getGeminiBootstrapRpcConfig(targetWindow);
  if (!rpcConfig) {
    return false;
  }

  const request = buildGeminiConversationHistoryRequest({
    origin: targetWindow.location?.origin || 'https://gemini.google.com',
    sourcePath: targetWindow.location?.pathname || '/app',
    hl: targetWindow.document?.documentElement?.lang || targetWindow.navigator?.language || 'en',
    reqId: nextHistoryReqId(),
    conversationId,
    rpcConfig
  });
  if (!request) {
    return false;
  }

  const effectiveFetch = typeof fetchImpl === 'function'
    ? fetchImpl
    : targetWindow.fetch?.bind(targetWindow);
  if (typeof effectiveFetch !== 'function') {
    return false;
  }

  try {
    const response = await effectiveFetch(request.url, request.init);
    if (typeof onResponseText === 'function' && response) {
      const responseText = typeof response.clone === 'function'
        ? await response.clone().text()
        : await response.text();
      await onResponseText(responseText, {
        request,
        response
      });
    }
    return true;
  } catch (error) {
    logger?.warn?.('[Gemini Watermark Remover] Conversation history bootstrap failed:', error);
    return false;
  }
}
