const EXTENSION_ENABLED_STORAGE_KEY = 'gwrEnabled';
const GEMINI_ORIGIN_PATTERN = /^https:\/\/(?:business\.)?gemini\.google\//i;

function getExtensionApi() {
  return globalThis.chrome || null;
}

function getManifestVersion() {
  const manifest = getExtensionApi()?.runtime?.getManifest?.();
  return typeof manifest?.version === 'string' ? manifest.version : '';
}

function getCurrentActiveTab() {
  return new Promise((resolve) => {
    const extensionApi = getExtensionApi();
    if (!extensionApi?.tabs?.query) {
      resolve(null);
      return;
    }

    extensionApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(Array.isArray(tabs) ? tabs[0] || null : null);
    });
  });
}

async function reloadCurrentGeminiTab() {
  const tab = await getCurrentActiveTab();
  if (!tab?.id || !GEMINI_ORIGIN_PATTERN.test(tab.url || '')) {
    return;
  }
  getExtensionApi()?.tabs?.reload?.(tab.id);
}

function readEnabled(callback) {
  const storage = getExtensionApi()?.storage?.local;
  if (!storage?.get) {
    callback(true);
    return;
  }

  storage.get({ [EXTENSION_ENABLED_STORAGE_KEY]: true }, (items) => {
    callback(items?.[EXTENSION_ENABLED_STORAGE_KEY] !== false);
  });
}

function writeEnabled(enabled, callback) {
  const storage = getExtensionApi()?.storage?.local;
  if (!storage?.set) {
    callback?.();
    return;
  }

  storage.set({ [EXTENSION_ENABLED_STORAGE_KEY]: Boolean(enabled) }, callback);
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enable-toggle');
  const versionLabel = document.getElementById('extension-version');

  if (versionLabel) {
    const version = getManifestVersion();
    versionLabel.textContent = version ? `v${version}` : '';
  }

  if (!toggle) return;

  readEnabled((enabled) => {
    toggle.checked = enabled;
  });

  toggle.addEventListener('change', () => {
    writeEnabled(toggle.checked, () => {
      void reloadCurrentGeminiTab();
    });
  });
});
