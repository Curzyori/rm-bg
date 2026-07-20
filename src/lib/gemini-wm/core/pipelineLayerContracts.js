export const PIPELINE_LAYER_ORDER = Object.freeze([
    'detection',
    'alpha',
    'repair',
    'evaluation'
]);

export const PIPELINE_LAYER_CONTRACTS = Object.freeze({
    detection: Object.freeze({
        layer: 'detection',
        owns: 'candidate-localization-and-evidence',
        inputFields: Object.freeze([
            'originalImageData',
            'resolvedConfig',
            'position',
            'alpha48',
            'alpha96',
            'alpha96Variants',
            'allowAdaptiveSearch',
            'alphaGainCandidates',
            'alphaPriorityGains'
        ]),
        outputFields: Object.freeze([
            'selectedTrial',
            'source',
            'decisionTier',
            'adaptiveConfidence',
            'standardSpatialScore',
            'standardGradientScore'
        ]),
        moduleAnchors: Object.freeze([
            'pipelineDetectionCandidate',
            'pipelineInitialContext',
            'pipelineInitialSelection',
            'candidateSelector'
        ]),
        testAnchors: Object.freeze([
            'pipelineDetectionCandidate.test',
            'pipelineInitialContext.test',
            'pipelineInitialSelection.test',
            'candidateEvaluation.test'
        ])
    }),
    alpha: Object.freeze({
        layer: 'alpha',
        owns: 'alpha-map-selection-and-alpha-fit',
        inputFields: Object.freeze([
            'acceptedPipelineState',
            'runtimeBootstrap',
            'alpha96',
            'getAlphaMap',
            'alpha96Variants',
            'alphaGain',
            'alphaMapSource'
        ]),
        outputFields: Object.freeze([
            'alphaTrialEvents',
            'alphaAdjustmentStages',
            'alphaGain',
            'alphaMap',
            'subpixelShift',
            'pipelineState'
        ]),
        moduleAnchors: Object.freeze([
            'pipelineAlphaTraceContract',
            'pipelineAlphaTrial',
            'pipelineAlphaStageSpecs',
            'pipelineAcceptedExecutor',
            'pipelineRuntime'
        ]),
        testAnchors: Object.freeze([
            'pipelineAlphaTraceContract.test',
            'pipelineAlphaTrial.test',
            'pipelineAlphaStageSpecs.test',
            'pipelineAcceptedExecutor.test',
            'pipelineRuntime.test'
        ])
    }),
    repair: Object.freeze({
        layer: 'repair',
        owns: 'texture-repair-and-artifact-gated-cleanup',
        inputFields: Object.freeze([
            'pipelineState',
            'passState',
            'cleanupFlags',
            'repairCleanupConfig',
            'visualPostProcessingEnabled'
        ]),
        outputFields: Object.freeze([
            'repairTrial',
            'passState',
            'passes',
            'source',
            'finalImageData',
            'finalProcessedSpatialScore',
            'finalProcessedGradientScore'
        ]),
        moduleAnchors: Object.freeze([
            'pipelineRepairTrial',
            'pipelineRepairStageSpecs',
            'pipelineRepairGates',
            'pipelineAcceptedExecutor'
        ]),
        testAnchors: Object.freeze([
            'pipelineRepairTrial.test',
            'pipelineRepairStageSpecs.test',
            'pipelineRepairGates.test',
            'pipelineAcceptedExecutor.test'
        ])
    }),
    evaluation: Object.freeze({
        layer: 'evaluation',
        owns: 'decision-path-and-risk-gated-arbitration',
        inputFields: Object.freeze([
            'detectionCandidate',
            'alphaTrial',
            'repairTrial',
            'selectedTrial',
            'alphaTrialEvents',
            'residualVisibility'
        ]),
        outputFields: Object.freeze([
            'decisionPath',
            'evaluationDecision',
            'blockedGate',
            'riskFlags',
            'selectionDebug',
            'meta'
        ]),
        moduleAnchors: Object.freeze([
            'pipelineDecisionPath',
            'candidateEvaluation',
            'pipelineMeta',
            'pipelineFinalization',
            'pipelineResult'
        ]),
        testAnchors: Object.freeze([
            'pipelineDecisionPath.test',
            'candidateEvaluation.test',
            'pipelineMeta.test',
            'pipelineFinalization.test',
            'pipelineResult.test'
        ])
    })
});

export function getPipelineLayerContract(layer) {
    return PIPELINE_LAYER_CONTRACTS[layer] ?? null;
}

export function createPipelineLayerContractSummary() {
    return PIPELINE_LAYER_ORDER.map((layer) => {
        const contract = getPipelineLayerContract(layer);
        return {
            layer,
            owns: contract.owns,
            inputCount: contract.inputFields.length,
            outputCount: contract.outputFields.length,
            moduleAnchors: [...contract.moduleAnchors],
            testAnchors: [...contract.testAnchors]
        };
    });
}
