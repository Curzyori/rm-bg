import {
    normalizeAlphaAdjustmentStageForTrace,
    normalizeAlphaTrialEventForTrace
} from './pipelineAlphaTraceContract.js';

export function createPipelineTraceRecorder() {
    const alphaAdjustmentStages = [];
    const alphaTrialEvents = [];

    const recordAlphaTrialEvent = (event) => {
        const normalizedEvent = normalizeAlphaTrialEventForTrace(event);
        if (!normalizedEvent) return;
        alphaTrialEvents.push(normalizedEvent);
    };

    const recordAlphaAdjustmentStage = (stagePayload) => {
        const normalizedStage = normalizeAlphaAdjustmentStageForTrace(stagePayload);
        if (!normalizedStage) return;
        alphaAdjustmentStages.push(normalizedStage);
    };

    return {
        alphaAdjustmentStages,
        alphaTrialEvents,
        recordAlphaAdjustmentStage,
        recordAlphaTrialEvent
    };
}
