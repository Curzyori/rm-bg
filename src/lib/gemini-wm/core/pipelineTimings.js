export function createTailDebugTimings({
    nowMs,
    totalStartedAt,
    previewEdgeCleanupElapsedMs = 0,
    smallPreviewRefinementStartedAt,
    locatedAggressiveStartedAt,
    smoothPriorStartedAt,
    newMargin96VariantRescueStartedAt,
    known48AntiTemplateRescueStartedAt,
    powerProfileRescueStartedAt,
    positiveResidualRebalanceStartedAt,
    smallMarginPriorRepairStartedAt,
    smallLocatedPriorRepairStartedAt,
    boundaryRepairRescueStartedAt,
    darkHaloRescueStartedAt,
    quantizedBodyCorrectionStartedAt,
    midCoreBiasStartedAt
} = {}) {
    return {
        previewEdgeCleanupMs: previewEdgeCleanupElapsedMs,
        smallPreviewRefinementMs: nowMs() - smallPreviewRefinementStartedAt,
        locatedAggressiveRemovalMs: nowMs() - locatedAggressiveStartedAt,
        smoothPriorCleanupMs: nowMs() - smoothPriorStartedAt,
        newMargin96VariantRescueMs: known48AntiTemplateRescueStartedAt - newMargin96VariantRescueStartedAt,
        known48AntiTemplateRescueMs: powerProfileRescueStartedAt - known48AntiTemplateRescueStartedAt,
        powerProfileRescueMs: positiveResidualRebalanceStartedAt - powerProfileRescueStartedAt,
        positiveResidualRebalanceMs: smallMarginPriorRepairStartedAt - positiveResidualRebalanceStartedAt,
        smallMarginPriorRepairMs: smallLocatedPriorRepairStartedAt - smallMarginPriorRepairStartedAt,
        smallLocatedPriorRepairMs: boundaryRepairRescueStartedAt - smallLocatedPriorRepairStartedAt,
        boundaryRepairRescueMs: darkHaloRescueStartedAt - boundaryRepairRescueStartedAt,
        darkHaloRescueMs: quantizedBodyCorrectionStartedAt - darkHaloRescueStartedAt,
        quantizedBodyCorrectionMs: midCoreBiasStartedAt - quantizedBodyCorrectionStartedAt,
        midCoreBiasCorrectionMs: nowMs() - midCoreBiasStartedAt,
        totalMs: nowMs() - totalStartedAt
    };
}
