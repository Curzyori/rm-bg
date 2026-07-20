export function applyVideoBitrateDebugOverride({
    windowObject = globalThis,
    videoBitrateInput,
    setNumberControl
} = {}) {
    const bitrate = Number(windowObject?.__gwrVideoOverrideBitrate);
    if (!Number.isFinite(bitrate) || bitrate <= 0) return false;
    if (!videoBitrateInput || typeof setNumberControl !== 'function') return false;

    setNumberControl(videoBitrateInput, bitrate / 1000 / 1000);
    return true;
}
