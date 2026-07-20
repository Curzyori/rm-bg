export function resolveCompatibleActionContext(actionContext = null) {
  return actionContext && typeof actionContext === 'object'
    ? actionContext
    : null;
}

export function resolveCompatibleActionContextFromPayload(payload = null) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return resolveCompatibleActionContext(payload.actionContext);
}

export function createActionContextProvider({
  getActionContext = null
} = {}) {
  return (...args) => resolveActionContextFromProviders({
    getActionContext,
    args
  });
}

export function resolveActionContextFromProviders({
  getActionContext = null,
  args = []
} = {}) {
  return typeof getActionContext === 'function'
    ? getActionContext(...args)
    : null;
}

export function appendCompatibleActionContext(payload = {}, actionContext = null) {
  if (!actionContext || typeof actionContext !== 'object') {
    return { ...payload };
  }

  return {
    ...payload,
    actionContext
  };
}

export function getActionContextFromIntentGate(intentGate = null, candidate = null) {
  if (!intentGate || typeof intentGate !== 'object') {
    return null;
  }

  if (typeof intentGate.getRecentActionContext === 'function') {
    return intentGate.getRecentActionContext(candidate);
  }

  return null;
}
