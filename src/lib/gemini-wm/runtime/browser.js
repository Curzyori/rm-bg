import {
  createCachedImageProcessor,
  createSharedBlobProcessor,
  loadImageFromBlob
} from '../shared/imageProcessing.js';

function normalizeProcessingOptions(defaultOptions = {}, options = {}) {
  const { maxPasses: _ignoredMaxPasses, ...normalizedDefaultOptions } =
    defaultOptions && typeof defaultOptions === 'object' ? defaultOptions : {};
  const { maxPasses: _ignoredCallMaxPasses, ...normalizedOptions } =
    options && typeof options === 'object' ? options : {};
  return {
    adaptiveMode: 'always',
    ...normalizedDefaultOptions,
    ...normalizedOptions
  };
}

function normalizeProcessedMeta(processedMeta) {
  if (!processedMeta || typeof processedMeta !== 'object') {
    return {
      processorPath: 'main-thread'
    };
  }

  if (processedMeta.processorPath != null) {
    return processedMeta;
  }

  return {
    ...processedMeta,
    processorPath: 'main-thread'
  };
}

function normalizeProcessResult(result) {
  return {
    processedBlob: result?.processedBlob || null,
    processedMeta: result?.processedMeta == null
      ? null
      : normalizeProcessedMeta(result.processedMeta)
  };
}

export function createBrowserRuntimeProcessor(options = {}) {
  const {
    createEngine,
    defaultOptions = {},
    logger = console,
    processBlob = null,
    dispose = null
  } = options && typeof options === 'object' ? options : {};

  const processRenderable = typeof processBlob === 'function'
    ? null
    : createCachedImageProcessor({
      createEngine
    });
  const processMainThread = typeof processBlob === 'function'
    ? null
    : async (blob, processingOptions = {}) => {
      const image = await loadImageFromBlob(blob);
      return processRenderable(image, normalizeProcessingOptions(defaultOptions, processingOptions));
    };
  const processWithBestPath = typeof processBlob === 'function'
    ? async (blob, processingOptions = {}) => (
      normalizeProcessResult(
        await processBlob(blob, normalizeProcessingOptions(defaultOptions, processingOptions))
      )
    )
    : createSharedBlobProcessor({
      processMainThread,
      onWorkerError(error) {
        logger?.warn?.('[Gemini Watermark Remover] Browser runtime fallback failed:', error);
      }
    });

  const processWatermarkBlob = async (blob, processingOptions = {}) => (
    processWithBestPath(blob, processingOptions)
  );

  const removeWatermarkFromBlob = async (blob, processingOptions = {}) => (
    (await processWatermarkBlob(blob, processingOptions)).processedBlob
  );

  const runtime = {
    processWatermarkBlob,
    removeWatermarkFromBlob
  };

  if (typeof dispose === 'function') {
    runtime.dispose = () => dispose();
  }

  return runtime;
}
