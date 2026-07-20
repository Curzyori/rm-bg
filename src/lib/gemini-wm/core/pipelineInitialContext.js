import {
    calculateWatermarkPosition,
    detectWatermarkConfig,
    resolveInitialStandardConfig
} from './watermarkConfig.js';

export function createInitialPipelineContext({
    imageData,
    options = {},
    cloneImageData,
    alphaGainCandidates = [],
    alphaPriorityGains = [],
    detectConfig = detectWatermarkConfig,
    resolveConfig = resolveInitialStandardConfig,
    calculatePosition = calculateWatermarkPosition
} = {}) {
    const adaptiveMode = options.adaptiveMode || 'auto';
    const allowAdaptiveSearch =
        adaptiveMode !== 'never' &&
        adaptiveMode !== 'off';
    const originalImageData = cloneImageData(imageData);
    const { alpha48, alpha96 } = options;

    if (!alpha48 || !alpha96) {
        throw new Error('processWatermarkImageData requires alpha48 and alpha96');
    }

    const defaultConfig = detectConfig(originalImageData.width, originalImageData.height);
    const resolvedConfig = resolveConfig({
        imageData: originalImageData,
        defaultConfig,
        alpha48,
        alpha96
    });
    const position = calculatePosition(
        originalImageData.width,
        originalImageData.height,
        resolvedConfig
    );

    return {
        originalImageData,
        alpha48,
        alpha96,
        alphaGainCandidates,
        alphaPriorityGains,
        allowAdaptiveSearch,
        defaultConfig,
        resolvedConfig,
        position
    };
}
