const USERSCRIPT_TRUSTED_TYPES_POLICY = 'gemini-watermark-remover';

function getUserscriptTrustedTypesPolicy(env = globalThis) {
  const trustedTypesApi = env?.trustedTypes;
  if (!trustedTypesApi || typeof trustedTypesApi.createPolicy !== 'function') {
    return null;
  }

  try {
    const existingPolicy = typeof trustedTypesApi.getPolicy === 'function'
      ? trustedTypesApi.getPolicy(USERSCRIPT_TRUSTED_TYPES_POLICY)
      : null;
    return existingPolicy || trustedTypesApi.createPolicy(
      USERSCRIPT_TRUSTED_TYPES_POLICY,
      {
        createScript: (value) => value,
        createScriptURL: (value) => value
      }
    );
  } catch {
    return null;
  }
}

export function toTrustedScript(script, env = globalThis) {
  const policy = getUserscriptTrustedTypesPolicy(env);
  if (!policy) return script;
  if (typeof policy.createScript !== 'function') return null;
  try {
    return policy.createScript(script);
  } catch {
    return null;
  }
}

export function toTrustedScriptUrl(url, env = globalThis) {
  const policy = getUserscriptTrustedTypesPolicy(env);
  if (!policy) return url;
  if (typeof policy.createScriptURL !== 'function') return null;
  try {
    return policy.createScriptURL(url);
  } catch {
    return null;
  }
}

export function toWorkerScriptUrl(url, env = globalThis) {
  return toTrustedScriptUrl(url, env);
}
