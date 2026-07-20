import { canvasToBlob } from '../core/canvasBlob.js';
import { WatermarkEngine } from '../core/watermarkEngine.js';

function loadImageFromObjectUrl(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode Gemini image blob'));
    image.src = objectUrl;
  });
}

export async function loadImageElementFromBlob(blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImageFromObjectUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadRenderableFromBlobFallback(blob, originalError) {
  if (typeof createImageBitmap !== 'function') {
    throw originalError;
  }

  try {
    return await createImageBitmap(blob);
  } catch {
    throw originalError;
  }
}

export async function loadImageFromBlob(blob) {
  try {
    return await loadImageElementFromBlob(blob);
  } catch (error) {
    return await loadRenderableFromBlobFallback(blob, error);
  }
}

function withProcessorPath(meta, processorPath) {
  const normalizedMeta = meta && typeof meta === 'object' ? { ...meta } : null;
  if (processorPath != null) {
    return {
      ...(normalizedMeta || {}),
      processorPath
    };
  }
  return normalizedMeta;
}

function normalizeProcessorResult(result, processorPath = 'main-thread') {
  return {
    processedBlob: result?.processedBlob || null,
    processedMeta: withProcessorPath(result?.processedMeta || null, processorPath)
  };
}

function normalizeProcessingOptions(options = {}) {
  const { maxPasses: _ignoredMaxPasses, ...normalizedOptions } =
    options && typeof options === 'object' ? options : {};
  return {
    adaptiveMode: 'always',
    ...normalizedOptions
  };
}

export function createCachedEngineGetter({
  createEngine = () => WatermarkEngine.create()
} = {}) {
  let enginePromise = null;

  return async function getEngine() {
    if (!enginePromise) {
      enginePromise = Promise.resolve(createEngine()).catch((error) => {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  };
}

export function createCachedCanvasProcessor({
  createEngine = () => WatermarkEngine.create(),
  getEngine = null
} = {}) {
  const resolveEngine = typeof getEngine === 'function'
    ? getEngine
    : createCachedEngineGetter({ createEngine });

  return async function processRenderableToCanvas(image, options = {}) {
    const engine = await resolveEngine();
    const normalizedOptions = normalizeProcessingOptions(options);
    return engine.removeWatermarkFromImage(image, normalizedOptions);
  };
}

export function createCachedImageProcessor({
  createEngine = () => WatermarkEngine.create(),
  encodeCanvas = canvasToBlob,
  processorPath = 'main-thread'
} = {}) {
  const processRenderableToCanvas = createCachedCanvasProcessor({ createEngine });

  return async function processRenderable(image, options = {}) {
    const canvas = await processRenderableToCanvas(image, options);
    return {
      processedBlob: await encodeCanvas(canvas),
      processedMeta: withProcessorPath(canvas.__watermarkMeta || null, processorPath)
    };
  };
}

function createMainThreadBlobProcessor({
  loadRenderable = loadImageFromBlob,
  processRenderable = createCachedImageProcessor()
} = {}) {
  return async function processBlobOnMainThread(blob, options = {}) {
    const image = await loadRenderable(blob);
    return processRenderable(image, options);
  };
}

export function createSharedBlobProcessor({
  processMainThread = createMainThreadBlobProcessor(),
  getWorkerProcessor = null,
  onWorkerError = null
} = {}) {
  return async function processWithBestPath(blob, options = { adaptiveMode: 'always' }) {
    const normalizedOptions = normalizeProcessingOptions(options);
    const processWorker = typeof getWorkerProcessor === 'function'
      ? getWorkerProcessor()
      : null;

    if (typeof processWorker === 'function') {
      try {
        return await processWorker(blob, normalizedOptions);
      } catch (error) {
        onWorkerError?.(error);
      }
    }

    return normalizeProcessorResult(
      await processMainThread(blob, normalizedOptions),
      'main-thread'
    );
  };
}

const processWatermarkBlobOnMainThread = createMainThreadBlobProcessor();
const processWatermarkBlobWithBestPath = createSharedBlobProcessor();

export async function processWatermarkBlob(blob, options = { adaptiveMode: 'always' }) {
  return processWatermarkBlobWithBestPath(blob, options);
}

export async function removeWatermarkFromBlob(blob, options = { adaptiveMode: 'always' }) {
  const result = await processWatermarkBlob(blob, options);
  return result.processedBlob;
}
