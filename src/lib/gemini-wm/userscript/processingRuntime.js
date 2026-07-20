import { canvasToBlob } from '../core/canvasBlob.js';
import {
  createCachedEngineGetter,
  createCachedCanvasProcessor,
  loadImageElementFromBlob
} from '../shared/imageProcessing.js';
import { toWorkerScriptUrl } from './trustedTypes.js';
import { isTimingDebugEnabled, shouldUseInlineWorker } from './runtimeFlags.js';

const DEFAULT_INLINE_WORKER_TIMEOUT_MS = 120000;
const DEFAULT_WORKER_PING_TIMEOUT_MS = 3000;

function toError(errorLike, fallback = 'Inline worker error') {
  if (errorLike instanceof Error) return errorLike;
  if (typeof errorLike === 'string' && errorLike.length > 0) return new Error(errorLike);
  if (errorLike && typeof errorLike.message === 'string' && errorLike.message.length > 0) {
    return new Error(errorLike.message);
  }
  return new Error(fallback);
}

function nowMs() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

class InlineWorkerClient {
  constructor(workerCode) {
    const blob = new Blob([workerCode], { type: 'text/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    const workerScriptUrl = toWorkerScriptUrl(this.workerUrl);
    if (!workerScriptUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
      throw new Error('Trusted Types policy unavailable for inline worker');
    }
    try {
      this.worker = new Worker(workerScriptUrl);
    } catch (error) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
      throw error;
    }
    this.pending = new Map();
    this.requestId = 0;
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
  }

  dispose() {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.worker.terminate();
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    const error = new Error('Inline worker disposed');
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pending.clear();
  }

  handleMessage(event) {
    const payload = event?.data;
    if (!payload || typeof payload.id === 'undefined') return;
    const pending = this.pending.get(payload.id);
    if (!pending) return;
    this.pending.delete(payload.id);
    clearTimeout(pending.timeoutId);
    if (payload.ok) {
      pending.resolve(payload.result);
      return;
    }
    pending.reject(new Error(payload.error?.message || 'Inline worker request failed'));
  }

  handleError(event) {
    const error = new Error(event?.message || 'Inline worker crashed');
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pending.clear();
  }

  request(type, payload, transferList = [], timeoutMs = DEFAULT_INLINE_WORKER_TIMEOUT_MS) {
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Inline worker request timed out: ${type}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeoutId });
      try {
        this.worker.postMessage({ id, type, ...payload }, transferList);
      } catch (error) {
        clearTimeout(timeoutId);
        this.pending.delete(id);
        reject(toError(error));
      }
    });
  }

  async ping(timeoutMs = DEFAULT_WORKER_PING_TIMEOUT_MS) {
    await this.request('ping', {}, [], timeoutMs);
  }

  async processWatermarkBlob(blob, options = {}) {
    const inputBuffer = await blob.arrayBuffer();
    const result = await this.request(
      'process-image',
      { inputBuffer, mimeType: blob.type || 'image/png', options },
      [inputBuffer]
    );
    return {
      processedBlob: new Blob([result.processedBuffer], { type: result.mimeType || 'image/png' }),
      processedMeta: result.meta || null
    };
  }
}

export function createUserscriptProcessingRuntime({
  workerCode = '',
  env = globalThis,
  logger = console
} = {}) {
  let workerClient = null;
  const timingDebugEnabled = isTimingDebugEnabled(env);

  function normalizeProcessingOptions(options = {}) {
    const { maxPasses: _ignoredMaxPasses, ...normalizedOptions } =
      options && typeof options === 'object' ? options : {};
    return {
      adaptiveMode: 'always',
      ...normalizedOptions
    };
  }

  const getEngine = createCachedEngineGetter();
  const processRenderableToCanvas = createCachedCanvasProcessor({
    getEngine
  });

  function disableInlineWorker(reason) {
    if (!workerClient) return;
    logger?.warn?.('[Gemini Watermark Remover] Disable worker path:', reason);
    workerClient.dispose();
    workerClient = null;
  }

  function emitTiming(stage, payload = {}) {
    if (!timingDebugEnabled) return;
    logger?.info?.(`[Gemini Watermark Remover] timing ${stage}`, payload);
  }

  async function processBlobOnMainThread(blob, options = {}) {
    const startedAt = nowMs();
    const engineWaitStartedAt = nowMs();
    await getEngine();
    const engineWaitMs = nowMs() - engineWaitStartedAt;
    const decodeStartedAt = nowMs();
    const img = await loadImageElementFromBlob(blob);
    const decodeMs = nowMs() - decodeStartedAt;
    const removeStartedAt = nowMs();
    const canvas = await processRenderableToCanvas(img, {
      ...options,
      debugTimings: timingDebugEnabled
    });
    const removeWatermarkMs = nowMs() - removeStartedAt;
    const encodeStartedAt = nowMs();
    const processedBlob = await canvasToBlob(canvas);
    const encodeMs = nowMs() - encodeStartedAt;
    const totalMs = nowMs() - startedAt;
    const engineStageTimings = canvas?.__watermarkTiming ?? null;
    const processorTimings = engineStageTimings?.processor ?? null;
    const selectionDebug = canvas?.__watermarkMeta?.selectionDebug ?? null;
    emitTiming('process-blob-main-thread', {
      sourceBlobType: blob?.type || '',
      sourceBlobSize: blob?.size || 0,
      imageWidth: img?.width || 0,
      imageHeight: img?.height || 0,
      engineWaitMs,
      decodeMs,
      removeWatermarkMs,
      encodeMs,
      totalMs,
      adaptiveMode: options?.adaptiveMode || '',
      engineStageTimings,
      engineDrawMs: engineStageTimings?.drawMs ?? null,
      engineGetImageDataMs: engineStageTimings?.getImageDataMs ?? null,
      engineProcessWatermarkImageDataMs: engineStageTimings?.processWatermarkImageDataMs ?? null,
      enginePutImageDataMs: engineStageTimings?.putImageDataMs ?? null,
      processorInitialSelectionMs: processorTimings?.initialSelectionMs ?? null,
      processorFirstPassMetricsMs: processorTimings?.firstPassMetricsMs ?? null,
      processorExtraPassMs: processorTimings?.extraPassMs ?? null,
      processorFinalMetricsMs: processorTimings?.finalMetricsMs ?? null,
      processorRecalibrationMs: processorTimings?.recalibrationMs ?? null,
      processorSubpixelRefinementMs: processorTimings?.subpixelRefinementMs ?? null,
      processorPreviewEdgeCleanupMs: processorTimings?.previewEdgeCleanupMs ?? null,
      processorTotalMs: processorTimings?.totalMs ?? null,
      selectionDebug
    });
    return {
      processedBlob,
      processedMeta: canvas.__watermarkMeta || null
    };
  }

  async function processBlobWithBestPath(blob, options = {}) {
    const normalizedOptions = normalizeProcessingOptions(options);

    if (workerClient) {
      try {
        return await workerClient.processWatermarkBlob(blob, normalizedOptions);
      } catch (error) {
        logger?.warn?.('[Gemini Watermark Remover] Worker path failed, fallback to main thread:', error);
        disableInlineWorker(error);
      }
    }

    return processBlobOnMainThread(blob, normalizedOptions);
  }

  const runtime = {
    async initialize() {
      if (!shouldUseInlineWorker(workerCode, env)) {
        return false;
      }

      try {
        workerClient = new InlineWorkerClient(workerCode);
        await workerClient.ping();
        logger?.log?.('[Gemini Watermark Remover] Worker acceleration enabled');
        return true;
      } catch (workerError) {
        workerClient?.dispose();
        workerClient = null;
        logger?.warn?.('[Gemini Watermark Remover] Worker initialization failed, using main thread:', workerError);
        return false;
      }
    },
    dispose(reason) {
      disableInlineWorker(reason);
    },
    async processWatermarkBlob(blob, options = {}) {
      return processBlobWithBestPath(blob, options);
    },
    async removeWatermarkFromBlob(blob, options = {}) {
      return (await runtime.processWatermarkBlob(blob, normalizeProcessingOptions(options))).processedBlob;
    }
  };

  return runtime;
}
