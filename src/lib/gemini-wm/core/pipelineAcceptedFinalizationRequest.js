export function createAcceptedPipelineFinalizationRequest({
    acceptedPipelineRun,
    pipelineTraceRecorder = {},
    resultContext = {},
    originalImageData = null,
    initialSelection = null,
    resolvedConfig = null
} = {}) {
    return {
        pipelineState: acceptedPipelineRun.readPipelineState(),
        passState: acceptedPipelineRun.passState,
        traceState: {
            alphaAdjustmentStages: pipelineTraceRecorder.alphaAdjustmentStages,
            alphaTrialEvents: pipelineTraceRecorder.alphaTrialEvents
        },
        resultContext,
        originalImageData,
        initialSelection,
        resolvedConfig
    };
}
