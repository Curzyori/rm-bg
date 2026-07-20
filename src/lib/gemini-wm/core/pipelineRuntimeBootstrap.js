import {
    createFirstPassMetrics,
    createRegionCorrelationMetrics
} from './pipelineMetrics.js';
import { createFirstPassPipelinePassState } from './pipelinePassState.js';
import { createRepairCleanupFlags } from './pipelineRepairGates.js';
import {
    createInitialPipelineRuntimeState,
    createPipelineStateAccessors
} from './pipelineState.js';

export function createAcceptedPipelineRuntimeBootstrap({
    nowMs = Date.now,
    acceptedPipelineState,
    selectedTrial,
    debugTimings = null,
    debugTimingsEnabled = false,
    cleanupConfig = {}
} = {}) {
    const cleanupFlags = createRepairCleanupFlags({
        selectedTrial,
        position: acceptedPipelineState.position,
        source: acceptedPipelineState.source,
        previewEdgeCleanupMaxSize: cleanupConfig.previewEdgeCleanupMaxSize,
        known48EdgeCleanupMinSize: cleanupConfig.known48EdgeCleanupMinSize,
        known48EdgeCleanupMaxSize: cleanupConfig.known48EdgeCleanupMaxSize,
        v2SmallEdgeCleanupSize: cleanupConfig.v2SmallEdgeCleanupSize,
        v2SmallEdgeCleanupSizeTolerance: cleanupConfig.v2SmallEdgeCleanupSizeTolerance
    });

    const firstPassMetricsStartedAt = nowMs();
    const firstPassMetrics = createFirstPassMetrics({
        imageData: acceptedPipelineState.finalImageData,
        alphaMap: acceptedPipelineState.alphaMap,
        position: acceptedPipelineState.position,
        originalSpatialScore: acceptedPipelineState.originalSpatialScore,
        originalGradientScore: acceptedPipelineState.originalGradientScore
    });
    if (debugTimingsEnabled && debugTimings) {
        debugTimings.firstPassMetricsMs = nowMs() - firstPassMetricsStartedAt;
        debugTimings.extraPassMs = 0;
    }

    const passState = createFirstPassPipelinePassState({ firstPassMetrics });

    const finalMetricsStartedAt = nowMs();
    const processedMetrics = createRegionCorrelationMetrics({
        imageData: acceptedPipelineState.finalImageData,
        alphaMap: acceptedPipelineState.alphaMap,
        position: acceptedPipelineState.position
    });
    if (debugTimingsEnabled && debugTimings) {
        debugTimings.finalMetricsMs = nowMs() - finalMetricsStartedAt;
    }

    let pipelineState = createInitialPipelineRuntimeState({
        acceptedState: acceptedPipelineState,
        processedMetrics
    });
    const {
        readPipelineState,
        applyPipelineState
    } = createPipelineStateAccessors({
        get: () => pipelineState,
        set: (state) => {
            pipelineState = state;
        }
    });

    return {
        cleanupFlags,
        firstPassMetrics,
        processedMetrics,
        passState,
        readPipelineState,
        applyPipelineState
    };
}
