import { createUserscriptProcessingRuntime } from '../userscript/processingRuntime.js';

function normalizeProcessingOptions(options = {}) {
  const { maxPasses: _ignoredMaxPasses, ...normalizedOptions } =
    options && typeof options === 'object' ? options : {};
  return normalizedOptions;
}

export function createUserscriptRuntimeProcessor(options = {}) {
  const runtime = createUserscriptProcessingRuntime(options);

  const processor = {
    initialize() {
      return runtime.initialize();
    },
    processWatermarkBlob(blob, processingOptions = {}) {
      return runtime.processWatermarkBlob(blob, normalizeProcessingOptions(processingOptions));
    },
    async removeWatermarkFromBlob(blob, processingOptions = {}) {
      return (await processor.processWatermarkBlob(blob, normalizeProcessingOptions(processingOptions))).processedBlob;
    },
    dispose(reason) {
      runtime.dispose(reason);
    }
  };

  return processor;
}
