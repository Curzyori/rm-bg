import {
    createDetectionCandidateFromSelectedTrial,
    createRejectedDetectionCandidate
} from './pipelineDetectionCandidate.js';
import { createAlphaTrialFromSelectedTrial } from './pipelineAlphaTrial.js';
import { createRepairTrialFromStages } from './pipelineRepairTrial.js';

function finiteOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createAcceptedDecisionPath({
    selectedTrial = null,
    selectionSource = null,
    source = null,
    decisionTier = null,
    config = null,
    position = null,
    adaptiveConfidence = null,
    alphaGain = 1,
    alphaMapSource = null,
    templateWarp = null,
    alphaAdjustmentStages = null,
    alphaTrialEvents = null,
    originalSpatialScore = null,
    originalGradientScore = null,
    processedSpatialScore = null,
    processedGradientScore = null,
    suppressionGain = null,
    residualVisibility = null
} = {}) {
    const detectionCandidate = createDetectionCandidateFromSelectedTrial({
        selectedTrial,
        source: selectionSource ?? source,
        config,
        position,
        adaptiveConfidence,
        decisionTier
    });
    const alphaTrial = createAlphaTrialFromSelectedTrial({
        selectedTrial,
        detectionCandidate,
        source,
        config,
        position,
        alphaGain,
        alphaMapSource,
        templateWarp,
        alphaAdjustmentStages,
        alphaTrialEvents,
        processedSpatialScore,
        processedGradientScore,
        suppressionGain
    });
    const repairTrial = createRepairTrialFromStages({
        alphaTrial,
        source,
        alphaAdjustmentStages,
        processedSpatialScore,
        processedGradientScore,
        suppressionGain,
        residualVisibility
    });
    const evaluation = {
        ...(selectedTrial?.evaluation ?? {}),
        pathId: `${detectionCandidate.id}->${alphaTrial.id}->${repairTrial.id}`,
        detectionId: detectionCandidate.id,
        alphaTrialId: alphaTrial.id,
        repairTrialId: repairTrial.id,
        eligible: selectedTrial?.evaluation?.eligible !== false,
        decision: 'accept',
        blockedGate: null,
        riskFlags: selectedTrial?.evaluation?.riskFlags ?? [],
        finalScores: {
            originalSpatial: finiteOrNull(originalSpatialScore ?? selectedTrial?.originalSpatialScore),
            originalGradient: finiteOrNull(originalGradientScore ?? selectedTrial?.originalGradientScore),
            processedSpatial: finiteOrNull(processedSpatialScore),
            processedGradient: finiteOrNull(processedGradientScore),
            suppressionGain: finiteOrNull(suppressionGain)
        },
        explanation: 'selected trial accepted by current production path'
    };

    return {
        version: 1,
        decision: 'accept',
        detectionSource: detectionCandidate.source,
        alphaSource: alphaTrial.source,
        repairSource: repairTrial.applied ? repairTrial.source : null,
        evaluationDecision: 'accepted',
        blockedGate: null,
        riskFlags: evaluation.riskFlags,
        detectionCandidate,
        alphaTrial,
        repairTrial,
        evaluation
    };
}

export function createRejectedDecisionPath({
    reason = 'no-watermark-detected',
    source = 'skipped',
    decisionTier = 'insufficient',
    originalSpatialScore = null,
    originalGradientScore = null,
    adaptiveConfidence = null
} = {}) {
    const detectionCandidate = createRejectedDetectionCandidate({
        reason,
        source,
        decisionTier,
        originalSpatialScore,
        originalGradientScore,
        adaptiveConfidence
    });
    const evaluation = {
        pathId: `${detectionCandidate.id}->reject`,
        detectionId: detectionCandidate.id,
        alphaTrialId: null,
        repairTrialId: null,
        eligible: false,
        decision: 'reject',
        blockedGate: reason,
        riskFlags: [],
        evidenceClass: detectionCandidate.evidence.productionEvidence
            ? 'evidence-without-selected-path'
            : 'insufficient-production-evidence',
        explanation: reason
    };

    return {
        version: 1,
        decision: 'reject',
        detectionSource: source,
        alphaSource: null,
        repairSource: null,
        evaluationDecision: 'rejected',
        blockedGate: reason,
        riskFlags: [],
        detectionCandidate,
        alphaTrial: null,
        repairTrial: null,
        evaluation
    };
}

export function createDecisionPathContractSummary(decisionPath = null) {
    return {
        version: decisionPath?.version ?? null,
        decision: decisionPath?.decision ?? null,
        detectionSource: decisionPath?.detectionSource ?? null,
        alphaSource: decisionPath?.alphaSource ?? null,
        repairSource: decisionPath?.repairSource ?? null,
        evaluationDecision: decisionPath?.evaluationDecision ?? null,
        blockedGate: decisionPath?.blockedGate ?? null,
        hasDetectionCandidate: decisionPath?.detectionCandidate !== null &&
            decisionPath?.detectionCandidate !== undefined,
        hasAlphaTrial: decisionPath?.alphaTrial !== null && decisionPath?.alphaTrial !== undefined,
        hasRepairTrial: decisionPath?.repairTrial !== null && decisionPath?.repairTrial !== undefined
    };
}
