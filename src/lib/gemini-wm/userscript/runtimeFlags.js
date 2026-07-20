const INLINE_WORKER_DEFAULT_ENABLED =
  typeof __US_INLINE_WORKER_ENABLED__ === 'boolean' ? __US_INLINE_WORKER_ENABLED__ : false;

const FORCE_INLINE_WORKER_STORAGE_KEY = '__gwr_force_inline_worker__';
const DEBUG_TIMINGS_STORAGE_KEY = '__gwr_debug_timings__';

function isTruthyFlagValue(value) {
  return value === true || value === '1' || value === 'true';
}

function readStorageFlag(env, storageKey) {
  try {
    const value = env?.localStorage?.getItem?.(storageKey);
    return isTruthyFlagValue(value);
  } catch {
    return false;
  }
}

function readForceInlineWorkerFlag(env) {
  try {
    return isTruthyFlagValue(env?.__GWR_FORCE_INLINE_WORKER__);
  } catch {
    return false;
  }
}

export function shouldUseInlineWorker(workerCode, env = globalThis) {
  const unsafeWindowEnv = env?.unsafeWindow;
  const forceEnable =
    readForceInlineWorkerFlag(env)
    || readForceInlineWorkerFlag(unsafeWindowEnv)
    || readStorageFlag(env, FORCE_INLINE_WORKER_STORAGE_KEY)
    || readStorageFlag(unsafeWindowEnv, FORCE_INLINE_WORKER_STORAGE_KEY);
  if (!INLINE_WORKER_DEFAULT_ENABLED && !forceEnable) return false;
  if (typeof workerCode !== 'string' || workerCode.length === 0) return false;
  return typeof env?.Worker !== 'undefined' && typeof env?.Blob !== 'undefined';
}

export function isTimingDebugEnabled(env = globalThis) {
  const unsafeWindowEnv = env?.unsafeWindow;
  return isTruthyFlagValue(env?.__GWR_DEBUG_TIMINGS__)
    || isTruthyFlagValue(unsafeWindowEnv?.__GWR_DEBUG_TIMINGS__)
    || readStorageFlag(env, DEBUG_TIMINGS_STORAGE_KEY)
    || readStorageFlag(unsafeWindowEnv, DEBUG_TIMINGS_STORAGE_KEY);
}
