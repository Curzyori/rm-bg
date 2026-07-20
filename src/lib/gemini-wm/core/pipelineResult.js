import {
    createAcceptedWatermarkMeta,
    createFailClosedWatermarkMeta,
    createRejectedWatermarkMeta,
} from './pipelineMeta.js';

export function createRejectedPipelineResult({
    imageData,
    debugTimings = {},
    reason = 'no-watermark-detected',
    adaptiveConfidence = null,
    originalSpatialScore = null,
    originalGradientScore = null,
    source = 'skipped',
    decisionTier = 'insufficient',
    selectionDebug = null
} = {}) {
    return {
        imageData,
        meta: createRejectedWatermarkMeta({
            reason,
            adaptiveConfidence,
            originalSpatialScore,
            originalGradientScore,
            source,
            decisionTier,
            selectionDebug
        }),
        debugTimings
    };
}

export function createAcceptedPipelineResult({
    finalImageData,
    debugTimings = {},
    selectedTrial = null,
    selectionSource = null,
    position = null,
    config = null,
    adaptiveConfidence = null,
    originalSpatialScore = null,
    originalGradientScore = null,
    finalProcessedSpatialScore = null,
    finalProcessedGradientScore = null,
    suppressionGain = null,
    residualVisibility = null,
    templateWarp = null,
    alphaGain = 1,
    passCount = 0,
    attemptedPassCount = 0,
    passStopReason = null,
    passes = null,
    source = 'standard',
    decisionTier = null,
    subpixelShift = null,
    alphaAdjustmentStages = null,
    alphaTrialEvents = null,
    alphaMapSource = null,
    selectionDebug = null,
    bestEffort = false,
    retryRecommended = null,
    qualityStatus = null,
    selectionConfidence = null,
    selectedCandidate = null,
    qualitySignals = null,
    candidateSummaries = null
} = {}) {
    return {
        imageData: finalImageData,
        meta: createAcceptedWatermarkMeta({
            selectedTrial,
            selectionSource,
            position,
            config,
            adaptiveConfidence,
            originalSpatialScore,
            originalGradientScore,
            processedSpatialScore: finalProcessedSpatialScore,
            processedGradientScore: finalProcessedGradientScore,
            suppressionGain,
            residualVisibility,
            templateWarp,
            alphaGain,
            passCount,
            attemptedPassCount,
            passStopReason,
            passes,
            source,
            decisionTier,
            subpixelShift,
            alphaAdjustmentStages,
            alphaTrialEvents,
            alphaMapSource,
            selectionDebug,
            bestEffort,
            retryRecommended,
            qualityStatus,
            selectionConfidence,
            selectedCandidate,
            qualitySignals,
            candidateSummaries
        }),
        debugTimings
    };
}

export function createAcceptedPipelineResultFromState({
    pipelineState = {},
    passState = {},
    traceState = {},
    resultContext = {},
    residualVisibility = null,
    selectionDebug = null
} = {}) {
    return createAcceptedPipelineResult({
        finalImageData: pipelineState.finalImageData,
        debugTimings: resultContext.debugTimings,
        selectedTrial: resultContext.selectedTrial,
        selectionSource: resultContext.selectionSource,
        position: pipelineState.position,
        config: pipelineState.config,
        adaptiveConfidence: resultContext.adaptiveConfidence,
        originalSpatialScore: pipelineState.originalSpatialScore,
        originalGradientScore: pipelineState.originalGradientScore,
        finalProcessedSpatialScore: pipelineState.finalProcessedSpatialScore,
        finalProcessedGradientScore: pipelineState.finalProcessedGradientScore,
        suppressionGain: pipelineState.suppressionGain,
        residualVisibility,
        templateWarp: resultContext.templateWarp,
        alphaGain: pipelineState.alphaGain,
        passCount: passState.passCount,
        attemptedPassCount: passState.attemptedPassCount,
        passStopReason: passState.passStopReason,
        passes: passState.passes,
        source: pipelineState.source,
        decisionTier: resultContext.decisionTier,
        subpixelShift: resultContext.subpixelShift,
        alphaAdjustmentStages: traceState.alphaAdjustmentStages,
        alphaTrialEvents: traceState.alphaTrialEvents,
        alphaMapSource: pipelineState.alphaMapSource,
        selectionDebug,
        bestEffort: resultContext.bestEffort,
        retryRecommended: resultContext.retryRecommended,
        qualityStatus: resultContext.qualityStatus,
        selectionConfidence: resultContext.selectionConfidence,
        selectedCandidate: resultContext.selectedCandidate,
        qualitySignals: resultContext.qualitySignals,
        candidateSummaries: resultContext.candidateSummaries
    });
}

export function createFailClosedPipelineResultFromState({
    originalImageData = null,
    pipelineState = {},
    passState = {},
    traceState = {},
    resultContext = {},
    residualVisibility = null,
    selectionDebug = null,
    reason = 'visible-residual-unsafe-damage',
    evidenceClass = 'unsafe-visible-residual'
} = {}) {
    return {
        imageData: originalImageData ?? pipelineState.finalImageData,
        meta: createFailClosedWatermarkMeta({
            selectedTrial: resultContext.selectedTrial,
            reason,
            evidenceClass,
            position: pipelineState.position,
            config: pipelineState.config,
            adaptiveConfidence: resultContext.adaptiveConfidence,
            originalSpatialScore: pipelineState.originalSpatialScore,
            originalGradientScore: pipelineState.originalGradientScore,
            processedSpatialScore: pipelineState.finalProcessedSpatialScore,
            processedGradientScore: pipelineState.finalProcessedGradientScore,
            suppressionGain: pipelineState.suppressionGain,
            residualVisibility,
            templateWarp: resultContext.templateWarp,
            alphaGain: pipelineState.alphaGain,
            passCount: passState.passCount,
            attemptedPassCount: passState.attemptedPassCount,
            passStopReason: passState.passStopReason,
            passes: passState.passes,
            source: pipelineState.source,
            decisionTier: resultContext.decisionTier,
            subpixelShift: resultContext.subpixelShift,
            alphaAdjustmentStages: traceState.alphaAdjustmentStages,
            alphaMapSource: pipelineState.alphaMapSource,
            selectionDebug
        }),
        debugTimings: resultContext.debugTimings
    };
}

export function createUnsafeVisibleResidualPipelineResultFromState(options = {}) {
    return createFailClosedPipelineResultFromState(options);
}
