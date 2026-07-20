import { isGeminiGeneratedAssetUrl, isGeminiPreviewAssetUrl } from '../userscript/urlUtils.js';

function shouldFetchBlobDirectly(sourceUrl) {
  return typeof sourceUrl === 'string'
    && (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:'));
}

function isRuntimeBlobUrl(sourceUrl) {
  return typeof sourceUrl === 'string' && sourceUrl.startsWith('blob:');
}

function shouldPreferRenderedCapture(sourceUrl) {
  return isGeminiPreviewAssetUrl(sourceUrl);
}

async function captureRenderedBlob({
  image,
  captureRenderedImageBlob
}) {
  if (typeof captureRenderedImageBlob !== 'function') {
    throw new Error('Rendered capture unavailable');
  }
  return captureRenderedImageBlob(image);
}

export async function acquireOriginalBlob({
  sourceUrl,
  image,
  fetchBlobFromBackground,
  fetchBlobDirect,
  captureRenderedImageBlob,
  validateBlob,
  preferRenderedCaptureForPreview = true,
  preferRenderedCaptureForBlobUrl = false,
  allowRenderedCaptureFallbackOnValidationFailure = true
}) {
  const normalizedSourceUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';

  if (preferRenderedCaptureForPreview && shouldPreferRenderedCapture(normalizedSourceUrl)) {
    return captureRenderedBlob({
      image,
      captureRenderedImageBlob
    });
  }

  if (preferRenderedCaptureForBlobUrl && isRuntimeBlobUrl(normalizedSourceUrl)) {
    return captureRenderedBlob({
      image,
      captureRenderedImageBlob
    });
  }

  if (isGeminiGeneratedAssetUrl(normalizedSourceUrl)) {
    const blob = await fetchBlobFromBackground(normalizedSourceUrl);
    if (typeof validateBlob === 'function') {
      try {
        await validateBlob(blob);
      } catch (error) {
        if (!allowRenderedCaptureFallbackOnValidationFailure) {
          throw error;
        }
        return captureRenderedBlob({
          image,
          captureRenderedImageBlob
        });
      }
    }
    return blob;
  }

  if (shouldFetchBlobDirectly(normalizedSourceUrl)) {
    return fetchBlobDirect(normalizedSourceUrl);
  }

  return captureRenderedBlob({
    image,
    captureRenderedImageBlob
  });
}
