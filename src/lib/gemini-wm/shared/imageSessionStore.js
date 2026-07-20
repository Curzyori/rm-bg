function normalizeAssetId(value, prefix) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith(prefix) || trimmed.length <= prefix.length) {
    return '';
  }
  return trimmed;
}

export function normalizeImageSessionAssetIds(assetIds = null) {
  const normalized = {
    responseId: normalizeAssetId(assetIds?.responseId, 'r_'),
    draftId: normalizeAssetId(assetIds?.draftId, 'rc_'),
    conversationId: normalizeAssetId(assetIds?.conversationId, 'c_')
  };

  if (!normalized.responseId && !normalized.draftId && !normalized.conversationId) {
    return null;
  }

  return normalized;
}

export function buildImageSessionKey(assetIds = null) {
  const normalizedAssetIds = normalizeImageSessionAssetIds(assetIds);
  if (!normalizedAssetIds) {
    return '';
  }

  if (normalizedAssetIds.draftId) {
    return `draft:${normalizedAssetIds.draftId}`;
  }

  if (normalizedAssetIds.responseId && normalizedAssetIds.conversationId) {
    return `response:${normalizedAssetIds.responseId}|conversation:${normalizedAssetIds.conversationId}`;
  }

  return '';
}

function createEmptySurfaceCollection() {
  return {
    preview: new Set(),
    fullscreen: new Set(),
    unknown: new Set()
  };
}

function createEmptyProcessedResourceRecord() {
  return {
    objectUrl: '',
    blob: null,
    blobType: '',
    processedMeta: null,
    processedFrom: ''
  };
}

function createEmptyProcessedResourceSlots() {
  return {
    preview: createEmptyProcessedResourceRecord(),
    full: createEmptyProcessedResourceRecord()
  };
}

function createSessionRecord(sessionKey, assetIds, now = Date.now()) {
  return {
    sessionKey,
    assetIds: normalizeImageSessionAssetIds(assetIds),
    sources: {
      originalUrl: '',
      previewUrl: '',
      currentBlobUrl: ''
    },
    derived: {
      processedBlobUrl: '',
      processedBlobType: '',
      processedMeta: null,
      processedFrom: '',
      processedSlots: createEmptyProcessedResourceSlots()
    },
    state: {
      preview: 'idle',
      fullscreen: 'idle',
      unknown: 'idle',
      lastError: ''
    },
    surfaces: createEmptySurfaceCollection(),
    timestamps: {
      createdAt: Number(now) || Date.now(),
      updatedAt: Number(now) || Date.now(),
      lastProcessedAt: 0
    }
  };
}

function touchSession(session, now = Date.now()) {
  session.timestamps.updatedAt = Number(now) || Date.now();
  return session;
}

function normalizeSurfaceType(surface = '') {
  const normalizedSurface = typeof surface === 'string' ? surface.trim().toLowerCase() : '';
  if (normalizedSurface === 'preview' || normalizedSurface === 'fullscreen') {
    return normalizedSurface;
  }
  return 'unknown';
}

function normalizeProcessedResourceSlot(slot = '') {
  const normalizedSlot = typeof slot === 'string' ? slot.trim().toLowerCase() : '';
  if (normalizedSlot === 'full') {
    return 'full';
  }
  return 'preview';
}

function readElementProcessedObjectUrl(element) {
  const objectUrl = typeof element?.dataset?.gwrWatermarkObjectUrl === 'string'
    ? element.dataset.gwrWatermarkObjectUrl.trim()
    : '';
  return objectUrl || '';
}

function isUsableSurfaceElement(element) {
  if (!element || typeof element !== 'object') {
    return false;
  }
  if ('isConnected' in element) {
    return Boolean(element.isConnected);
  }
  return true;
}

function findPreferredSurfaceElement(elements, preferredProcessedUrl = '') {
  let processedMatch = null;
  let processedFallback = null;
  let plainFallback = null;

  for (const element of elements) {
    if (!isUsableSurfaceElement(element)) {
      continue;
    }

    const processedObjectUrl = readElementProcessedObjectUrl(element);
    if (processedObjectUrl && preferredProcessedUrl && processedObjectUrl === preferredProcessedUrl) {
      return element;
    }
    if (processedObjectUrl) {
      processedFallback ||= element;
      continue;
    }
    plainFallback ||= element;
  }

  processedMatch ||= processedFallback;
  return processedMatch || plainFallback || null;
}

function readProcessedSlotResource(session, slot) {
  const normalizedSlot = normalizeProcessedResourceSlot(slot);
  const resource = session?.derived?.processedSlots?.[normalizedSlot] || null;
  if (!resource?.objectUrl) {
    return null;
  }

  return {
    kind: 'processed',
    url: resource.objectUrl,
    ...(resource.blob ? { blob: resource.blob } : {}),
    mimeType: resource.blobType || 'image/png',
    processedMeta: resource.processedMeta,
    source: resource.processedFrom || 'processed',
    slot: normalizedSlot
  };
}

function syncLegacyProcessedFields(session) {
  const previewResource = readProcessedSlotResource(session, 'preview');
  const fullResource = readProcessedSlotResource(session, 'full');
  const preferredResource = previewResource || fullResource;

  session.derived.processedBlobUrl = preferredResource?.url || '';
  session.derived.processedBlobType = preferredResource?.mimeType || '';
  session.derived.processedMeta = preferredResource?.processedMeta ?? null;
  session.derived.processedFrom = preferredResource?.source || '';
}

function buildOriginalResource(session) {
  if (!session?.sources?.originalUrl) {
    return null;
  }

  return {
    kind: 'original',
    url: session.sources.originalUrl,
    mimeType: '',
    processedMeta: null,
    source: 'original'
  };
}

function isFullQualityAction(action = '') {
  return action === 'clipboard' || action === 'download';
}

export function createImageSessionStore({
  now = () => Date.now()
} = {}) {
  const sessions = new Map();
  const elementBindings = new WeakMap();

  function getSession(sessionKey = '') {
    if (!sessionKey) {
      return null;
    }
    return sessions.get(sessionKey) || null;
  }

  function getOrCreateByAssetIds(assetIds = null) {
    const normalizedAssetIds = normalizeImageSessionAssetIds(assetIds);
    const sessionKey = buildImageSessionKey(normalizedAssetIds);
    if (!sessionKey) {
      return '';
    }

    let session = sessions.get(sessionKey);
    if (!session) {
      session = createSessionRecord(sessionKey, normalizedAssetIds, now());
      sessions.set(sessionKey, session);
      return sessionKey;
    }

    if (!session.assetIds) {
      session.assetIds = normalizedAssetIds;
    } else {
      session.assetIds = {
        responseId: session.assetIds.responseId || normalizedAssetIds.responseId,
        draftId: session.assetIds.draftId || normalizedAssetIds.draftId,
        conversationId: session.assetIds.conversationId || normalizedAssetIds.conversationId
      };
    }
    touchSession(session, now());
    return sessionKey;
  }

  function getByAssetIds(assetIds = null) {
    const sessionKey = buildImageSessionKey(assetIds);
    return sessionKey ? sessions.get(sessionKey) || null : null;
  }

  function attachElement(sessionKey, surface, element) {
    const session = getSession(sessionKey);
    if (!session || !element || typeof element !== 'object') {
      return false;
    }

    detachElement(element);
    const normalizedSurface = normalizeSurfaceType(surface);
    session.surfaces[normalizedSurface].add(element);
    elementBindings.set(element, {
      sessionKey,
      surface: normalizedSurface
    });
    touchSession(session, now());
    return true;
  }

  function detachElement(element) {
    const binding = elementBindings.get(element);
    if (!binding) {
      return false;
    }
    const session = getSession(binding.sessionKey);
    if (session) {
      session.surfaces[binding.surface]?.delete(element);
      touchSession(session, now());
    }
    elementBindings.delete(element);
    return true;
  }

  function updateOriginalSource(sessionKey, sourceUrl = '') {
    const session = getSession(sessionKey);
    const normalizedUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
    if (!session || !normalizedUrl) {
      return false;
    }
    session.sources.originalUrl = normalizedUrl;
    touchSession(session, now());
    return true;
  }

  function updateSourceSnapshot(sessionKey, {
    sourceUrl = '',
    isPreviewSource = false
  } = {}) {
    const session = getSession(sessionKey);
    const normalizedUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
    if (!session || !normalizedUrl) {
      return false;
    }

    if (normalizedUrl.startsWith('blob:') || normalizedUrl.startsWith('data:')) {
      session.sources.currentBlobUrl = normalizedUrl;
    } else if (isPreviewSource) {
      session.sources.previewUrl = normalizedUrl;
    } else {
      session.sources.originalUrl ||= normalizedUrl;
    }
    touchSession(session, now());
    return true;
  }

  function updateProcessedResult(sessionKey, {
    slot = 'preview',
    objectUrl = '',
    blob = null,
    blobType = '',
    processedMeta = null,
    processedFrom = ''
  } = {}) {
    const session = getSession(sessionKey);
    const normalizedObjectUrl = typeof objectUrl === 'string' ? objectUrl.trim() : '';
    if (!session || !normalizedObjectUrl) {
      return false;
    }

    const normalizedSlot = normalizeProcessedResourceSlot(slot);
    if (!session.derived.processedSlots) {
      session.derived.processedSlots = createEmptyProcessedResourceSlots();
    }
    session.derived.processedSlots[normalizedSlot] = {
      objectUrl: normalizedObjectUrl,
      blob: blob instanceof Blob ? blob : null,
      blobType: typeof blobType === 'string' ? blobType.trim() : '',
      processedMeta: processedMeta ?? null,
      processedFrom: typeof processedFrom === 'string' ? processedFrom.trim() : ''
    };
    syncLegacyProcessedFields(session);
    const timestamp = Number(now()) || Date.now();
    touchSession(session, timestamp);
    session.timestamps.lastProcessedAt = timestamp;
    return true;
  }

  function markProcessing(sessionKey, surface, status, error = '') {
    const session = getSession(sessionKey);
    if (!session) {
      return false;
    }

    const normalizedSurface = normalizeSurfaceType(surface);
    session.state[normalizedSurface] = typeof status === 'string' ? status : 'idle';
    session.state.lastError = typeof error === 'string' ? error : '';
    touchSession(session, now());
    return true;
  }

  function getBestResource(sessionKey, action = 'display') {
    const session = getSession(sessionKey);
    if (!session) {
      return null;
    }

    const fullProcessedResource = readProcessedSlotResource(session, 'full');
    const previewProcessedResource = readProcessedSlotResource(session, 'preview');

    if (isFullQualityAction(action)) {
      if (fullProcessedResource) {
        return fullProcessedResource;
      }

      const originalResource = buildOriginalResource(session);
      if (originalResource) {
        return originalResource;
      }
    } else {
      if (previewProcessedResource) {
        return previewProcessedResource;
      }

      if (fullProcessedResource) {
        return fullProcessedResource;
      }
    }

    const originalResource = buildOriginalResource(session);
    if (originalResource) {
      return originalResource;
    }

    if (session.sources.previewUrl) {
      return {
        kind: 'preview',
        url: session.sources.previewUrl,
        mimeType: '',
        processedMeta: null,
        source: 'preview'
      };
    }

    if (session.sources.currentBlobUrl) {
      return {
        kind: 'blob',
        url: session.sources.currentBlobUrl,
        mimeType: '',
        processedMeta: null,
        source: 'blob'
      };
    }

    return null;
  }

  function getPreferredElement(sessionKey, action = 'display') {
    const session = getSession(sessionKey);
    if (!session) {
      return null;
    }

    const preferredResource = getBestResource(sessionKey, action);
    const preferredProcessedUrl = preferredResource?.kind === 'processed'
      ? preferredResource.url || ''
      : '';
    const orderedSurfaces = ['preview', 'fullscreen', 'unknown'];
    for (const surface of orderedSurfaces) {
      const preferredElement = findPreferredSurfaceElement(
        session.surfaces?.[surface] || [],
        preferredProcessedUrl
      );
      if (preferredElement) {
        return preferredElement;
      }
    }

    return null;
  }

  function getSnapshot(sessionKey) {
    const session = getSession(sessionKey);
    if (!session) {
      return null;
    }

    return {
      sessionKey: session.sessionKey,
      assetIds: session.assetIds ? { ...session.assetIds } : null,
      sources: { ...session.sources },
      derived: {
        ...session.derived,
        processedSlots: {
          preview: {
            ...session.derived.processedSlots.preview,
            blob: session.derived.processedSlots.preview.blob || null
          },
          full: {
            ...session.derived.processedSlots.full,
            blob: session.derived.processedSlots.full.blob || null
          }
        },
      },
      state: { ...session.state },
      surfaces: {
        previewCount: session.surfaces.preview.size,
        fullscreenCount: session.surfaces.fullscreen.size,
        unknownCount: session.surfaces.unknown.size
      },
      timestamps: { ...session.timestamps }
    };
  }

  return {
    buildSessionKey: buildImageSessionKey,
    getOrCreateByAssetIds,
    getByAssetIds,
    getSnapshot,
    getBestResource,
    getPreferredElement,
    attachElement,
    detachElement,
    updateOriginalSource,
    updateSourceSnapshot,
    updateProcessedResult,
    markProcessing
  };
}

const defaultImageSessionStore = createImageSessionStore();

export function getDefaultImageSessionStore() {
  return defaultImageSessionStore;
}
