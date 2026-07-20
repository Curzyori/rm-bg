import { extractGeminiImageAssetIds } from './domAdapter.js';
import { resolveCompatibleActionContext } from './actionContextCompat.js';
import {
  buildImageSessionKey,
  getDefaultImageSessionStore,
  normalizeImageSessionAssetIds
} from './imageSessionStore.js';

function mergeImageSessionAssetIds(...candidates) {
  const merged = {
    responseId: '',
    draftId: '',
    conversationId: ''
  };

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeImageSessionAssetIds(candidate);
    if (!normalizedCandidate) {
      continue;
    }

    merged.responseId ||= normalizedCandidate.responseId || '';
    merged.draftId ||= normalizedCandidate.draftId || '';
    merged.conversationId ||= normalizedCandidate.conversationId || '';
  }

  return normalizeImageSessionAssetIds(merged);
}

function resolveImageElementFromTarget(target) {
  const normalizedTagName = typeof target?.tagName === 'string'
    ? target.tagName.toUpperCase()
    : '';
  return normalizedTagName === 'IMG' ? target : null;
}

export function resolveImageSessionContext({
  action = 'display',
  actionContext = null,
  target = null,
  imageElement = null,
  resolveImageElement = null,
  resolveAssetIds = extractGeminiImageAssetIds,
  imageSessionStore = getDefaultImageSessionStore()
} = {}) {
  const resolvedActionContext = resolveCompatibleActionContext(actionContext);
  let resolvedImageElement = imageElement
    || resolvedActionContext?.imageElement
    || resolveImageElementFromTarget(target)
    || null;

  if (!resolvedImageElement && typeof resolveImageElement === 'function') {
    resolvedImageElement = resolveImageElement(resolvedActionContext) || null;
  }

  const extractedImageAssetIds = typeof resolveAssetIds === 'function' && resolvedImageElement
    ? resolveAssetIds(resolvedImageElement)
    : null;
  const extractedTargetAssetIds = typeof resolveAssetIds === 'function' && target
    ? resolveAssetIds(target)
    : null;
  const assetIds = mergeImageSessionAssetIds(
    resolvedActionContext?.assetIds,
    extractedImageAssetIds,
    extractedTargetAssetIds
  );

  const explicitSessionKey = typeof resolvedActionContext?.sessionKey === 'string'
    ? resolvedActionContext.sessionKey.trim()
    : '';
  const sessionKey = explicitSessionKey
    || imageSessionStore?.getOrCreateByAssetIds?.(assetIds)
    || buildImageSessionKey(assetIds);
  const sessionSnapshot = sessionKey
    ? imageSessionStore?.getSnapshot?.(sessionKey) || null
    : null;
  const mergedAssetIds = mergeImageSessionAssetIds(
    assetIds,
    sessionSnapshot?.assetIds
  );
  const resource = sessionKey
    ? imageSessionStore?.getBestResource?.(sessionKey, action) || null
    : null;
  const preferredImageElement = sessionKey
    ? imageSessionStore?.getPreferredElement?.(sessionKey, action) || null
    : null;
  if (preferredImageElement) {
    resolvedImageElement = preferredImageElement;
  }

  return {
    action,
    sessionKey: sessionKey || '',
    assetIds: mergedAssetIds,
    imageElement: resolvedImageElement,
    resource
  };
}
