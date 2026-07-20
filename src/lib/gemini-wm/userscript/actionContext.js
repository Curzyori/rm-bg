import { extractGeminiImageAssetIds, getGeminiImageQuerySelector, resolveCandidateImageUrl } from '../shared/domAdapter.js';
import { resolveImageSessionContext } from '../shared/imageSessionContext.js';
import { getDefaultImageSessionStore } from '../shared/imageSessionStore.js';
import { normalizeGoogleusercontentImageUrl } from './urlUtils.js';

export function assetIdsMatch(candidate = null, target = null) {
  if (!candidate || !target) {
    return false;
  }

  if (candidate.draftId && target.draftId) {
    return candidate.draftId === target.draftId;
  }

  return Boolean(
    candidate.responseId
      && target.responseId
      && candidate.responseId === target.responseId
      && candidate.conversationId
      && target.conversationId
      && candidate.conversationId === target.conversationId
  );
}

export function findGeminiImageElementForAssetIds(root, assetIds) {
  if (!root || !assetIds || typeof root.querySelectorAll !== 'function') {
    return null;
  }

  let fallbackMatch = null;
  for (const imageElement of root.querySelectorAll(getGeminiImageQuerySelector())) {
    if (!assetIdsMatch(extractGeminiImageAssetIds(imageElement), assetIds)) {
      continue;
    }

    if (imageElement?.dataset?.gwrWatermarkObjectUrl) {
      return imageElement;
    }

    fallbackMatch ||= imageElement;
  }

  return fallbackMatch;
}

export function findGeminiImageElementForSourceUrl(root, sourceUrl = '') {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return null;
  }

  const normalizedTargetUrl = typeof sourceUrl === 'string'
    ? normalizeGoogleusercontentImageUrl(sourceUrl.trim())
    : '';
  if (!normalizedTargetUrl) {
    return null;
  }

  let fallbackMatch = null;
  const unboundBlobCandidates = [];
  for (const imageElement of root.querySelectorAll(getGeminiImageQuerySelector())) {
    const candidateUrl = normalizeGoogleusercontentImageUrl(resolveCandidateImageUrl(imageElement) || '');
    if (!candidateUrl || candidateUrl !== normalizedTargetUrl) {
      const currentSrc = typeof imageElement?.currentSrc === 'string'
        ? imageElement.currentSrc.trim()
        : '';
      const src = typeof imageElement?.src === 'string'
        ? imageElement.src.trim()
        : '';
      const hasExplicitSource = typeof imageElement?.dataset?.gwrSourceUrl === 'string'
        && imageElement.dataset.gwrSourceUrl.trim();
      if (!hasExplicitSource && (currentSrc.startsWith('blob:') || src.startsWith('blob:'))) {
        unboundBlobCandidates.push(imageElement);
      }
      continue;
    }

    if (imageElement?.dataset?.gwrWatermarkObjectUrl) {
      return imageElement;
    }

    fallbackMatch ||= imageElement;
  }

  if (!fallbackMatch && unboundBlobCandidates.length === 1) {
    return unboundBlobCandidates[0];
  }

  return fallbackMatch;
}

function collectCandidateImagesFromRoot(root) {
  if (!root || typeof root !== 'object') {
    return [];
  }

  const candidates = [];
  if (typeof root.tagName === 'string' && root.tagName.toUpperCase() === 'IMG') {
    candidates.push(root);
  }
  if (typeof root.querySelectorAll === 'function') {
    candidates.push(...root.querySelectorAll('img'));
  }
  return candidates.filter(Boolean);
}

function findPreferredGeminiImageElement(root, assetIds) {
  const candidates = collectCandidateImagesFromRoot(root);
  if (candidates.length === 0) {
    return null;
  }

  const matchingAssetCandidate = assetIds
    ? candidates.find((imageElement) => assetIdsMatch(extractGeminiImageAssetIds(imageElement), assetIds))
    : null;
  const processedMatchingAssetCandidate = matchingAssetCandidate?.dataset?.gwrWatermarkObjectUrl
    ? matchingAssetCandidate
    : null;
  if (processedMatchingAssetCandidate) {
    return processedMatchingAssetCandidate;
  }
  if (matchingAssetCandidate) {
    return matchingAssetCandidate;
  }

  const processedProcessableCandidate = candidates.find((imageElement) => (
    typeof imageElement?.dataset?.gwrWatermarkObjectUrl === 'string'
      && imageElement.dataset.gwrWatermarkObjectUrl.trim()
  ));
  if (processedProcessableCandidate) {
    return processedProcessableCandidate;
  }

  return candidates[0] || null;
}

export function findNearbyGeminiImageElement(targetWindow, target, assetIds) {
  const buttonLike = typeof target?.closest === 'function'
    ? target.closest('button,[role="button"]')
    : null;
  const globalAssetMatch = assetIds
    ? findGeminiImageElementForAssetIds(targetWindow?.document || document, assetIds)
    : null;
  const candidateRoots = [
    buttonLike?.closest?.('generated-image,.generated-image-container'),
    buttonLike?.closest?.('single-image'),
    buttonLike?.closest?.('expansion-dialog,[role="dialog"],.image-expansion-dialog-panel,.cdk-overlay-pane'),
    buttonLike?.closest?.('[data-test-draft-id]')
  ].filter(Boolean);

  for (const root of candidateRoots) {
    const imageElement = findPreferredGeminiImageElement(root, assetIds);
    if (imageElement?.dataset?.gwrWatermarkObjectUrl) {
      return imageElement;
    }
    if (globalAssetMatch?.dataset?.gwrWatermarkObjectUrl) {
      return globalAssetMatch;
    }
    if (imageElement) {
      return imageElement;
    }
  }

  return globalAssetMatch;
}

export function createGeminiActionContextResolver({
  targetWindow,
  imageSessionStore = getDefaultImageSessionStore()
} = {}) {
  function resolveActionContext(target, {
    action = 'display'
  } = {}) {
    const initialImageElement = findNearbyGeminiImageElement(targetWindow, target, null);
    const initialContext = resolveImageSessionContext({
      action,
      target,
      imageElement: initialImageElement,
      imageSessionStore
    });

    const preferredImageElement = initialContext?.assetIds
      ? findNearbyGeminiImageElement(targetWindow, target, initialContext.assetIds)
      : null;
    if (!preferredImageElement || preferredImageElement === initialImageElement) {
      return initialContext;
    }

    return resolveImageSessionContext({
      action,
      target,
      imageElement: preferredImageElement,
      imageSessionStore
    });
  }

  function resolveImageElement(actionContext = null) {
    if (actionContext?.imageElement) {
      return actionContext.imageElement;
    }

    const assetIds = actionContext?.assetIds || null;
    const target = actionContext?.target || null;
    return findNearbyGeminiImageElement(targetWindow, target, assetIds);
  }

  return {
    resolveActionContext,
    resolveImageElement
  };
}
