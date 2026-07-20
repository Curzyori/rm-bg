import {
  createCachedImageProcessor,
  loadImageElementFromBlob
} from '../shared/imageProcessing.js';
import { installPageProcessBridge } from '../userscript/pageProcessBridge.js';

const PAGE_PROCESS_RUNTIME_FLAG = '__gwrPageProcessRuntimeInstalled__';

export function installPageProcessRuntime({
  targetWindow = globalThis.window || null,
  logger = console
} = {}) {
  if (!targetWindow) {
    return null;
  }
  if (targetWindow[PAGE_PROCESS_RUNTIME_FLAG]) {
    return targetWindow[PAGE_PROCESS_RUNTIME_FLAG];
  }

  const processRenderable = createCachedImageProcessor({
    processorPath: null
  });

  async function processWatermarkBlob(blob, options = {}) {
    const img = await loadImageElementFromBlob(blob);
    const result = await processRenderable(img, options);

    return {
      processedBlob: result?.processedBlob || null,
      processedMeta: result?.processedMeta || null
    };
  }

  async function removeWatermarkFromBlob(blob, options = {}) {
    return (await processWatermarkBlob(blob, options)).processedBlob;
  }

  const bridge = installPageProcessBridge({
    targetWindow,
    processWatermarkBlob,
    removeWatermarkFromBlob,
    logger
  });

  targetWindow[PAGE_PROCESS_RUNTIME_FLAG] = {
    bridge,
    processWatermarkBlob,
    removeWatermarkFromBlob,
    dispose() {
      bridge?.dispose?.();
      delete targetWindow[PAGE_PROCESS_RUNTIME_FLAG];
    }
  };
  return targetWindow[PAGE_PROCESS_RUNTIME_FLAG];
}
