const PRODUCTION_EVIDENCE_MIN_SPATIAL = 0.45;
const PRODUCTION_EVIDENCE_MIN_GRADIENT = 0.16;

function numberOr(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeConfig(config) {
    if (!config || typeof config !== 'object') return null;
    const { logoSize, marginRight, marginBottom } = config;
    if (![logoSize, marginRight, marginBottom].every(Number.isFinite)) return null;

    return {
        logoSize,
        marginRight,
        marginBottom,
        ...(typeof config.alphaVariant === 'string' && config.alphaVariant.length > 0
            ? { alphaVariant: config.alphaVariant }
            : {})
    };
}

function normalizePosition(position) {
    if (!position || typeof position !== 'object') return null;
    const { x, y, width, height } = position;
    if (![x, y, width, height].every(Number.isFinite)) return null;
    return { x, y, width, height };
}

function makeCandidateId(prefix, config, position, source) {
    const normalizedConfig = normalizeConfig(config);
    const normalizedPosition = normalizePosition(position);
    const configKey = normalizedConfig
        ? `${normalizedConfig.logoSize}/${normalizedConfig.marginRight}/${normalizedConfig.marginBottom}${normalizedConfig.alphaVariant ? `/${normalizedConfig.alphaVariant}` : ''}`
        : 'none';
    const positionKey = normalizedPosition
        ? `${normalizedPosition.x},${normalizedPosition.y},${normalizedPosition.width},${normalizedPosition.height}`
        : 'none';
    return `${prefix}:${configKey}:${positionKey}:${source || 'unknown'}`;
}

function hasProductionEvidenceScores({ spatialScore, gradientScore }) {
    return numberOr(spatialScore, -Infinity) >= PRODUCTION_EVIDENCE_MIN_SPATIAL &&
        numberOr(gradientScore, -Infinity) >= PRODUCTION_EVIDENCE_MIN_GRADIENT;
}

export function createDetectionCandidateFromSelectedTrial({
    selectedTrial = null,
    source = null,
    config = null,
    position = null,
    adaptiveConfidence = null,
    decisionTier = null
} = {}) {
    const resolvedConfig = normalizeConfig(config ?? selectedTrial?.config);
    const resolvedPosition = normalizePosition(position ?? selectedTrial?.position);
    const originalSpatial = finiteOrNull(selectedTrial?.originalSpatialScore);
    const originalGradient = finiteOrNull(selectedTrial?.originalGradientScore);

    return {
        id: makeCandidateId('det', resolvedConfig, resolvedPosition, source ?? selectedTrial?.source),
        source: source ?? selectedTrial?.source ?? null,
        decisionTier,
        config: resolvedConfig,
        position: resolvedPosition,
        alphaMapHint: resolvedConfig?.alphaVariant
            ? `${resolvedConfig.logoSize}-${resolvedConfig.alphaVariant}`
            : resolvedConfig?.logoSize ?? null,
        polarityHint: selectedTrial?.provenance?.darkPolarity === true ? 'dark' : 'white',
        evidence: {
            spatialScore: originalSpatial,
            gradientScore: originalGradient,
            confidence: finiteOrNull(adaptiveConfidence ?? selectedTrial?.adaptiveConfidence),
            productionEvidence: hasProductionEvidenceScores({
                spatialScore: originalSpatial,
                gradientScore: originalGradient
            }),
            originalEvidenceTier: selectedTrial?.originalEvidence?.tier ?? null
        },
        provenance: selectedTrial?.provenance ?? null
    };
}

export function createRejectedDetectionCandidate({
    reason = 'no-watermark-detected',
    source = 'skipped',
    decisionTier = 'insufficient',
    originalSpatialScore = null,
    originalGradientScore = null,
    adaptiveConfidence = null
} = {}) {
    return {
        id: `det:rejected:${reason}`,
        source,
        decisionTier,
        config: null,
        position: null,
        alphaMapHint: null,
        polarityHint: null,
        evidence: {
            spatialScore: finiteOrNull(originalSpatialScore),
            gradientScore: finiteOrNull(originalGradientScore),
            confidence: finiteOrNull(adaptiveConfidence),
            productionEvidence: hasProductionEvidenceScores({
                spatialScore: originalSpatialScore,
                gradientScore: originalGradientScore
            }),
            originalEvidenceTier: null
        },
        provenance: null
    };
}

export function createDetectionCandidateContractSummary(detectionCandidate = null) {
    return {
        id: detectionCandidate?.id ?? null,
        source: detectionCandidate?.source ?? null,
        decisionTier: detectionCandidate?.decisionTier ?? null,
        hasConfig: detectionCandidate?.config !== null && detectionCandidate?.config !== undefined,
        hasPosition: detectionCandidate?.position !== null && detectionCandidate?.position !== undefined,
        productionEvidence: detectionCandidate?.evidence?.productionEvidence === true
    };
}
