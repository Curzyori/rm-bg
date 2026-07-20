const DEFAULT_CLEARED_SPATIAL_RESIDUAL = 0.04;
const DEFAULT_CLEARED_GRADIENT_RESIDUAL = 0.12;
const DEFAULT_EARLY_ACCEPT_MAX_SOURCE_PRIORITY = 3;
const DEFAULT_EARLY_ACCEPT_MIN_SUPPRESSION_GAIN = 0.25;
const DEFAULT_BALANCED_GRADIENT_WEIGHT = 0.6;
const DEFAULT_BALANCED_NEAR_BLACK_WEIGHT = 3;
const DEFAULT_BALANCED_TEXTURE_WEIGHT = 0.7;
const DEFAULT_BALANCED_CLIPPING_WEIGHT = 2;
const DEFAULT_BALANCED_DARK_HALO_WEIGHT = 0.012;
const DEFAULT_BALANCED_ARTIFACT_WEIGHT = 0.35;
const DEFAULT_BALANCED_GRADIENT_REGRESSION_WEIGHT = 0.25;

function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function scoreOriginalEvidence({ spatial, gradient } = {}) {
    const resolvedSpatial = toFiniteNumber(spatial) ?? 0;
    const resolvedGradient = toFiniteNumber(gradient) ?? 0;
    let tier = 'none';

    if ((resolvedSpatial >= 0.3 && resolvedGradient >= 0.12) || resolvedGradient >= 0.45) {
        tier = 'strong';
    } else if (resolvedSpatial >= 0.15 || resolvedGradient >= 0.08) {
        tier = 'medium';
    } else if (resolvedSpatial >= 0.05 || resolvedGradient >= 0.03) {
        tier = 'weak';
    }

    return {
        tier,
        spatial: spatial ?? null,
        gradient: gradient ?? null,
        score: resolvedSpatial + Math.max(0, resolvedGradient) * 0.8
    };
}

export function originalEvidenceRank(tier) {
    if (tier === 'strong') return 3;
    if (tier === 'medium') return 2;
    if (tier === 'weak') return 1;
    return 0;
}

export function scoreResidual({
    processedSpatial,
    processedGradient,
    suppressionGain = null,
    artifactCost = 0,
    clearedSpatialResidual = DEFAULT_CLEARED_SPATIAL_RESIDUAL,
    clearedGradientResidual = DEFAULT_CLEARED_GRADIENT_RESIDUAL
} = {}) {
    const spatial = toFiniteNumber(processedSpatial);
    const gradient = toFiniteNumber(processedGradient);
    const spatialResidual = Math.abs(spatial ?? 0);
    const gradientResidual = Math.max(0, gradient ?? 0);
    const cost = toFiniteNumber(artifactCost) ?? 0;

    return {
        cleared: spatialResidual <= clearedSpatialResidual &&
            gradientResidual <= clearedGradientResidual,
        spatial,
        gradient,
        spatialResidual,
        gradientResidual,
        suppressionGain: toFiniteNumber(suppressionGain),
        artifactCost: cost,
        score: spatialResidual + gradientResidual * 0.6 + cost * 0.25
    };
}

export function scoreDamage({
    hardReject = false,
    nearBlackIncrease = 0,
    texturePenalty = 0,
    newlyClippedRatio = 0,
    halo = null
} = {}) {
    const resolvedNearBlackIncrease = toFiniteNumber(nearBlackIncrease) ?? 0;
    const resolvedTexturePenalty = toFiniteNumber(texturePenalty) ?? 0;
    const resolvedNewlyClippedRatio = toFiniteNumber(newlyClippedRatio) ?? 0;
    const reasons = [];

    if (hardReject === true) reasons.push('hard-reject');
    if (resolvedNearBlackIncrease > 0.05) reasons.push('near-black');
    if (resolvedTexturePenalty > 0.25) reasons.push('texture');
    if (resolvedNewlyClippedRatio > 0.03) reasons.push('clipping');

    return {
        safe: reasons.length === 0,
        penalty:
            Math.max(0, resolvedNearBlackIncrease) * 3 +
            resolvedTexturePenalty +
            resolvedNewlyClippedRatio * 8,
        reason: reasons.length > 0 ? reasons.join(',') : null,
        nearBlackIncrease: nearBlackIncrease ?? null,
        texturePenalty: texturePenalty ?? null,
        newlyClippedRatio: newlyClippedRatio ?? null,
        halo
    };
}

export function scoreBalancedVisualCandidate({
    processedSpatial,
    processedGradient,
    nearBlackIncrease = 0,
    texturePenalty = 0,
    newlyClippedRatio = 0,
    darkHaloLum = 0,
    visualArtifactCost = null,
    gradientIncrease = 0,
    gradientWeight = DEFAULT_BALANCED_GRADIENT_WEIGHT,
    nearBlackWeight = DEFAULT_BALANCED_NEAR_BLACK_WEIGHT,
    textureWeight = DEFAULT_BALANCED_TEXTURE_WEIGHT,
    clippingWeight = DEFAULT_BALANCED_CLIPPING_WEIGHT,
    darkHaloWeight = DEFAULT_BALANCED_DARK_HALO_WEIGHT,
    artifactWeight = DEFAULT_BALANCED_ARTIFACT_WEIGHT,
    gradientRegressionWeight = DEFAULT_BALANCED_GRADIENT_REGRESSION_WEIGHT
} = {}) {
    const spatial = toFiniteNumber(processedSpatial) ?? 0;
    const gradient = toFiniteNumber(processedGradient) ?? 0;
    const resolvedNearBlackIncrease = Math.max(0, toFiniteNumber(nearBlackIncrease) ?? 0);
    const resolvedTexturePenalty = Math.max(0, toFiniteNumber(texturePenalty) ?? 0);
    const resolvedNewlyClippedRatio = Math.max(0, toFiniteNumber(newlyClippedRatio) ?? 0);
    const resolvedDarkHaloLum = Math.max(0, toFiniteNumber(darkHaloLum) ?? 0);
    const resolvedVisualArtifactCost = Math.max(0, toFiniteNumber(visualArtifactCost) ?? 0);
    const resolvedGradientIncrease = Math.max(0, toFiniteNumber(gradientIncrease) ?? 0);

    const residualCost = Math.abs(spatial) + Math.max(0, gradient) * gradientWeight;
    const damageCost =
        resolvedNearBlackIncrease * nearBlackWeight +
        resolvedTexturePenalty * textureWeight +
        resolvedNewlyClippedRatio * clippingWeight +
        resolvedDarkHaloLum * darkHaloWeight +
        resolvedVisualArtifactCost * artifactWeight +
        resolvedGradientIncrease * gradientRegressionWeight;

    return {
        score: residualCost + damageCost,
        residualCost,
        damageCost,
        spatial,
        gradient,
        nearBlackIncrease: resolvedNearBlackIncrease,
        texturePenalty: resolvedTexturePenalty,
        newlyClippedRatio: resolvedNewlyClippedRatio,
        darkHaloLum: resolvedDarkHaloLum,
        visualArtifactCost: resolvedVisualArtifactCost,
        gradientIncrease: resolvedGradientIncrease
    };
}

export function buildRankingKey({
    sourcePriority = 9,
    originalEvidenceTier = 'none',
    damageSafe = false,
    residualScore = 0,
    alphaPriorityIndex = 99,
    damagePenalty = 0
} = {}) {
    return [
        sourcePriority,
        -originalEvidenceRank(originalEvidenceTier),
        damageSafe ? 0 : 1,
        Number((toFiniteNumber(residualScore) ?? 0).toFixed(6)),
        alphaPriorityIndex,
        Number((toFiniteNumber(damagePenalty) ?? 0).toFixed(6))
    ];
}

export function compareRankingKey(left, right) {
    const length = Math.max(left?.length ?? 0, right?.length ?? 0);
    for (let index = 0; index < length; index++) {
        const leftValue = left?.[index] ?? 0;
        const rightValue = right?.[index] ?? 0;
        if (leftValue !== rightValue) return leftValue - rightValue;
    }
    return 0;
}

export function shouldEarlyAccept({
    sourcePriority = 9,
    originalEvidence = null,
    residual = null,
    damage = null,
    maxSourcePriority = DEFAULT_EARLY_ACCEPT_MAX_SOURCE_PRIORITY,
    minSuppressionGain = DEFAULT_EARLY_ACCEPT_MIN_SUPPRESSION_GAIN
} = {}) {
    const resolvedSourcePriority = toFiniteNumber(sourcePriority) ?? 9;
    const suppressionGain = toFiniteNumber(residual?.suppressionGain) ?? 0;

    return resolvedSourcePriority <= maxSourcePriority &&
        originalEvidence?.tier === 'strong' &&
        residual?.cleared === true &&
        suppressionGain >= minSuppressionGain &&
        damage?.safe === true;
}
