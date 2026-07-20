export function createImageWatermarkPipelineCleanupConfig({
    previewEdgeCleanupMaxSize,
    known48EdgeCleanupMinSize,
    known48EdgeCleanupMaxSize,
    v2SmallEdgeCleanupSize,
    v2SmallEdgeCleanupSizeTolerance
} = {}) {
    return {
        previewEdgeCleanupMaxSize,
        known48EdgeCleanupMinSize,
        known48EdgeCleanupMaxSize,
        v2SmallEdgeCleanupSize,
        v2SmallEdgeCleanupSizeTolerance
    };
}

export function createImageWatermarkPipelineRequest({
    imageData,
    options = {},
    nowMs,
    cloneImageData,
    alphaGainCandidates,
    alphaPriorityGains,
    createAcceptedPipelineDependencies,
    cleanupConfig,
    visualPostProcessingEnabled = false
} = {}) {
    return {
        imageData,
        options,
        nowMs,
        cloneImageData,
        alphaGainCandidates,
        alphaPriorityGains,
        createAcceptedPipelineDependencies,
        cleanupConfig,
        visualPostProcessingEnabled
    };
}
