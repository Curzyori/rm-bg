const ALPHA_STAGE_PATTERNS = Object.freeze([
    /alpha/i,
    /recalibration/i,
    /over-subtraction/i,
    /subpixel/i,
    /new-margin-96-variant/i,
    /power-profile/i,
    /residual-rebalance/i,
    /anti-template/i
]);

const REPAIR_STAGE_PATTERNS = Object.freeze([
    /cleanup/i,
    /edge/i,
    /repair/i,
    /flat.*fill/i,
    /prior/i,
    /halo/i,
    /boundary/i,
    /quantized/i,
    /mid-core/i,
    /background/i
]);

function finiteOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function compactObject(object) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined && value !== null)
    );
}

function stageMatches(stage, patterns) {
    return patterns.some((pattern) => pattern.test(stage));
}

function normalizeStageList(alphaAdjustmentStages) {
    return Array.isArray(alphaAdjustmentStages)
        ? alphaAdjustmentStages
            .map((stage) => (typeof stage === 'string' ? { stage } : stage))
            .filter((stage) => stage && typeof stage.stage === 'string')
        : [];
}

function classifyRepairStages(alphaAdjustmentStages) {
    return normalizeStageList(alphaAdjustmentStages).filter((stage) => {
        const name = stage.stage;
        return stageMatches(name, REPAIR_STAGE_PATTERNS) && !(
            stageMatches(name, ALPHA_STAGE_PATTERNS) &&
            !/repair|cleanup|flat.*fill|prior|halo|boundary|quantized|mid-core|background/i.test(name)
        );
    });
}

function inferRepairStrategy(stageName) {
    const name = String(stageName ?? '');
    if (/luma-edge/i.test(name)) return 'luma-edge';
    if (/edge-cleanup/i.test(name)) return 'edge-cleanup';
    if (/known-48-flat/i.test(name)) return 'known-48-flat-fill';
    if (/new-margin-96-flat/i.test(name)) return 'new-margin-96-flat-fill';
    if (/flat.*fill/i.test(name)) return 'flat-fill';
    if (/smooth-located-estimated-prior/i.test(name)) return 'smooth-located-prior';
    if (/small-margin-prior/i.test(name)) return 'small-margin-prior';
    if (/small-located-prior/i.test(name)) return 'small-located-prior';
    if (/prior/i.test(name)) return 'estimated-prior';
    if (/dark-halo/i.test(name)) return 'dark-halo-repair';
    if (/canonical-96-positive-halo/i.test(name)) return 'canonical-96-positive-halo-repair';
    if (/halo/i.test(name)) return 'halo-repair';
    if (/boundary/i.test(name)) return 'boundary-repair';
    if (/quantized/i.test(name)) return 'quantized-body-correction';
    if (/mid-core/i.test(name)) return 'mid-core-bias-correction';
    if (/background/i.test(name)) return 'background-cleanup';
    return 'repair';
}

export function createRepairTrialFromStages({
    alphaTrial = null,
    source = null,
    alphaAdjustmentStages = null,
    processedSpatialScore = null,
    processedGradientScore = null,
    suppressionGain = null,
    residualVisibility = null
} = {}) {
    const repairStages = classifyRepairStages(alphaAdjustmentStages);
    if (repairStages.length === 0) {
        return {
            id: `${alphaTrial?.id ?? 'alpha:none'}:repair:none`,
            alphaTrialId: alphaTrial?.id ?? null,
            source: null,
            repairType: 'none',
            applied: false,
            params: null,
            scores: null,
            artifacts: null,
            gates: null,
            provenance: null
        };
    }

    return {
        id: `${alphaTrial?.id ?? 'alpha:none'}:repair:${repairStages.map((stage) => stage.stage).join('+')}`,
        alphaTrialId: alphaTrial?.id ?? null,
        source,
        repairType: inferRepairStrategy(repairStages.at(-1)?.stage),
        applied: true,
        params: repairStages.map((stage) => compactObject({
            stage: stage.stage,
            repairStrategy: typeof stage.repairStrategy === 'string'
                ? stage.repairStrategy
                : inferRepairStrategy(stage.stage),
            fromAlphaGain: finiteOrNull(stage.fromAlphaGain),
            toAlphaGain: finiteOrNull(stage.toAlphaGain),
            beforeSpatialScore: finiteOrNull(stage.beforeSpatialScore),
            beforeGradientScore: finiteOrNull(stage.beforeGradientScore),
            afterSpatialScore: finiteOrNull(stage.afterSpatialScore),
            afterGradientScore: finiteOrNull(stage.afterGradientScore),
            suppressionGain: finiteOrNull(stage.suppressionGain),
            cost: finiteOrNull(stage.cost)
        })),
        scores: {
            processedSpatial: finiteOrNull(processedSpatialScore),
            processedGradient: finiteOrNull(processedGradientScore),
            suppressionGain: finiteOrNull(suppressionGain)
        },
        artifacts: residualVisibility ?? null,
        gates: {
            stageCount: repairStages.length,
            stages: repairStages.map((stage) => stage.stage)
        },
        provenance: {
            stageCount: repairStages.length,
            strategies: [...new Set(repairStages.map((stage) => (
                typeof stage.repairStrategy === 'string'
                    ? stage.repairStrategy
                    : inferRepairStrategy(stage.stage)
            )))]
        }
    };
}

export function createRepairTrialContractSummary(repairTrial = null) {
    return {
        id: repairTrial?.id ?? null,
        alphaTrialId: repairTrial?.alphaTrialId ?? null,
        source: repairTrial?.source ?? null,
        repairType: repairTrial?.repairType ?? null,
        applied: repairTrial?.applied === true,
        stageCount: repairTrial?.gates?.stageCount ?? 0,
        strategyCount: Array.isArray(repairTrial?.provenance?.strategies)
            ? repairTrial.provenance.strategies.length
            : 0
    };
}
