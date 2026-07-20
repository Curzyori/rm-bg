const ALLENK_FDNCNN_RUNTIME_PROFILES = Object.freeze([
    Object.freeze({
        id: 'allenk-fdncnn-veo-text-23x10',
        modelSize: 86,
        modelWidth: 86,
        modelHeight: 74,
        maxWatermarkSize: 23,
        matchWatermark: Object.freeze({ width: 23, height: 10 }),
        modelUrl: './models/allenk-fdncnn/model_core_fp32_86x74.onnx',
        inputShape: Object.freeze([1, 4, 74, 86]),
        outputShape: Object.freeze([1, 3, 74, 86]),
        padding: 32
    }),
    Object.freeze({
        id: 'allenk-fdncnn-104',
        modelSize: 104,
        modelWidth: 104,
        modelHeight: 104,
        maxWatermarkSize: 56,
        modelUrl: './models/allenk-fdncnn/model_core_fp32_104.onnx',
        inputShape: Object.freeze([1, 4, 104, 104]),
        outputShape: Object.freeze([1, 3, 104, 104])
    }),
    Object.freeze({
        id: 'allenk-fdncnn-200',
        modelSize: 200,
        modelWidth: 200,
        modelHeight: 200,
        maxWatermarkSize: Infinity,
        modelUrl: './models/allenk-fdncnn/model_core_fp32_200.onnx',
        inputShape: Object.freeze([1, 4, 200, 200]),
        outputShape: Object.freeze([1, 3, 200, 200])
    })
]);

const DEFAULT_ALLENK_FDNCNN_RUNTIME_PROFILE = ALLENK_FDNCNN_RUNTIME_PROFILES.find(
    (profile) => profile.id === 'allenk-fdncnn-200'
) || ALLENK_FDNCNN_RUNTIME_PROFILES[ALLENK_FDNCNN_RUNTIME_PROFILES.length - 1];
const DEFAULT_ALLENK_FDNCNN_PADDING = 64;

function getWatermarkSize(position = null) {
    const width = Number(position?.width);
    const height = Number(position?.height ?? position?.width);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    return Math.max(width, height);
}

function cloneAllenkProfile(profile, padding) {
    return {
        ...profile,
        inputShape: [...profile.inputShape],
        outputShape: [...profile.outputShape],
        padding
    };
}

function resolveAllenkFdncnnRuntimeProfile(position = null) {
    const watermarkSize = getWatermarkSize(position);
    if (!watermarkSize) {
        return cloneAllenkProfile(DEFAULT_ALLENK_FDNCNN_RUNTIME_PROFILE, DEFAULT_ALLENK_FDNCNN_PADDING);
    }

    const width = Math.round(Number(position?.width));
    const height = Math.round(Number(position?.height ?? position?.width));
    const exactProfile = ALLENK_FDNCNN_RUNTIME_PROFILES.find((candidate) => (
        candidate.matchWatermark &&
        candidate.matchWatermark.width === width &&
        candidate.matchWatermark.height === height
    ));
    if (exactProfile) {
        return cloneAllenkProfile(exactProfile, exactProfile.padding);
    }

    const profile = ALLENK_FDNCNN_RUNTIME_PROFILES.find((candidate) => watermarkSize <= candidate.maxWatermarkSize) ||
        DEFAULT_ALLENK_FDNCNN_RUNTIME_PROFILE;
    const padding = Math.max(0, Math.floor((profile.modelSize - watermarkSize) / 2));
    return cloneAllenkProfile(profile, padding);
}

export {
    ALLENK_FDNCNN_RUNTIME_PROFILES,
    resolveAllenkFdncnnRuntimeProfile
};
