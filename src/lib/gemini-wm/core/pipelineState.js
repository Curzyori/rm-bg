function finiteOrFallback(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function createAcceptedPipelineState({
    initialSelection = null
} = {}) {
    const selectedTrial = initialSelection?.selectedTrial ?? null;
    if (!selectedTrial) return null;

    return {
        config: initialSelection.config,
        position: initialSelection.position,
        alphaMap: initialSelection.alphaMap,
        source: initialSelection.source,
        adaptiveConfidence: initialSelection.adaptiveConfidence ?? null,
        templateWarp: initialSelection.templateWarp ?? null,
        alphaGain: finiteOrFallback(initialSelection.alphaGain, 1),
        decisionTier: initialSelection.decisionTier ?? null,
        subpixelShift: null,
        alphaMapSource: null,
        finalImageData: selectedTrial.imageData,
        originalSpatialScore: selectedTrial.originalSpatialScore,
        originalGradientScore: selectedTrial.originalGradientScore
    };
}

export function createPipelineStateCommit({
    current,
    result,
    source
} = {}) {
    const finalProcessedSpatialScore = finiteOrFallback(
        result?.spatialScore,
        finiteOrFallback(result?.processedSpatialScore, current?.finalProcessedSpatialScore)
    );
    const finalProcessedGradientScore = finiteOrFallback(
        result?.gradientScore,
        finiteOrFallback(result?.processedGradientScore, current?.finalProcessedGradientScore)
    );
    const originalSpatialScore = finiteOrFallback(
        result?.originalSpatialScore,
        current?.originalSpatialScore
    );
    const suppressionGain = finiteOrFallback(
        result?.suppressionGain,
        originalSpatialScore - finalProcessedSpatialScore
    );

    return {
        finalImageData: result?.imageData ?? current?.finalImageData,
        alphaMap: result?.alphaMap ?? current?.alphaMap,
        position: result?.position ?? current?.position,
        config: result?.config ?? current?.config,
        alphaGain: finiteOrFallback(result?.alphaGain, current?.alphaGain),
        alphaMapSource: result?.alphaMapSource ?? current?.alphaMapSource,
        originalSpatialScore,
        originalGradientScore: finiteOrFallback(
            result?.originalGradientScore,
            current?.originalGradientScore
        ),
        finalProcessedSpatialScore,
        finalProcessedGradientScore,
        suppressionGain,
        source: source ?? current?.source
    };
}

export function createInitialPipelineRuntimeState({
    acceptedState = null,
    processedMetrics = null
} = {}) {
    const finalProcessedSpatialScore = processedMetrics?.spatialScore;
    const finalProcessedGradientScore = processedMetrics?.gradientScore;
    const originalSpatialScore = acceptedState?.originalSpatialScore;

    return {
        finalImageData: acceptedState?.finalImageData,
        alphaMap: acceptedState?.alphaMap,
        position: acceptedState?.position,
        config: acceptedState?.config,
        alphaGain: acceptedState?.alphaGain,
        alphaMapSource: acceptedState?.alphaMapSource,
        originalSpatialScore,
        originalGradientScore: acceptedState?.originalGradientScore,
        finalProcessedSpatialScore,
        finalProcessedGradientScore,
        suppressionGain: originalSpatialScore - finalProcessedSpatialScore,
        source: acceptedState?.source
    };
}

export function createPipelineStateAccessors({
    get,
    set
} = {}) {
    const safeGet = typeof get === 'function' ? get : () => ({});
    const safeSet = typeof set === 'function' ? set : () => {};
    return {
        readPipelineState() {
            const state = safeGet();
            return {
                finalImageData: state.finalImageData,
                alphaMap: state.alphaMap,
                position: state.position,
                config: state.config,
                alphaGain: state.alphaGain,
                alphaMapSource: state.alphaMapSource,
                originalSpatialScore: state.originalSpatialScore,
                originalGradientScore: state.originalGradientScore,
                finalProcessedSpatialScore: state.finalProcessedSpatialScore,
                finalProcessedGradientScore: state.finalProcessedGradientScore,
                suppressionGain: state.suppressionGain,
                source: state.source
            };
        },
        applyPipelineState(state = {}) {
            safeSet({
                finalImageData: state.finalImageData,
                alphaMap: state.alphaMap,
                position: state.position,
                config: state.config,
                alphaGain: state.alphaGain,
                alphaMapSource: state.alphaMapSource,
                originalSpatialScore: state.originalSpatialScore,
                originalGradientScore: state.originalGradientScore,
                finalProcessedSpatialScore: state.finalProcessedSpatialScore,
                finalProcessedGradientScore: state.finalProcessedGradientScore,
                suppressionGain: state.suppressionGain,
                source: state.source
            });
        }
    };
}
