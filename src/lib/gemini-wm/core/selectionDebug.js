function normalizeConfig(config) {
    if (!config || typeof config !== 'object') return null;
    const { logoSize, marginRight, marginBottom } = config;
    if (![logoSize, marginRight, marginBottom].every(Number.isFinite)) {
        return null;
    }
    return { logoSize, marginRight, marginBottom };
}

function normalizePosition(position) {
    if (!position || typeof position !== 'object') return null;
    const { x, y, width, height } = position;
    if (![x, y, width, height].every(Number.isFinite)) {
        return null;
    }
    return { x, y, width, height };
}

function normalizeNumber(value) {
    return Number.isFinite(value) ? value : null;
}

function normalizeResidual(residual) {
    if (!residual || typeof residual !== 'object') return null;
    return {
        cleared: residual.cleared === true,
        spatialResidual: normalizeNumber(residual.spatialResidual),
        gradientResidual: normalizeNumber(residual.gradientResidual),
        suppressionGain: normalizeNumber(residual.suppressionGain),
        artifactCost: normalizeNumber(residual.artifactCost),
        score: normalizeNumber(residual.score)
    };
}

function normalizeDamage(damage) {
    if (!damage || typeof damage !== 'object') return null;
    return {
        safe: damage.safe === true,
        penalty: normalizeNumber(damage.penalty),
        reason: typeof damage.reason === 'string' ? damage.reason : null,
        nearBlackIncrease: normalizeNumber(damage.nearBlackIncrease),
        texturePenalty: normalizeNumber(damage.texturePenalty),
        newlyClippedRatio: normalizeNumber(damage.newlyClippedRatio),
        halo: damage.halo ?? null
    };
}

function normalizeOriginalEvidence(originalEvidence) {
    if (!originalEvidence || typeof originalEvidence !== 'object') return null;
    return {
        tier: typeof originalEvidence.tier === 'string' ? originalEvidence.tier : 'none',
        spatial: normalizeNumber(originalEvidence.spatial),
        gradient: normalizeNumber(originalEvidence.gradient),
        score: normalizeNumber(originalEvidence.score)
    };
}

export function createSelectionDebugSummary({
    selectedTrial,
    selectionSource = null,
    initialConfig = null,
    initialPosition = null
} = {}) {
    if (!selectedTrial) return null;

    const candidateSource = typeof selectionSource === 'string' && selectionSource
        ? selectionSource
        : (typeof selectedTrial.source === 'string' ? selectedTrial.source : null);

    return {
        candidateSource,
        initialConfig: normalizeConfig(initialConfig),
        initialPosition: normalizePosition(initialPosition),
        finalConfig: normalizeConfig(selectedTrial.config),
        finalPosition: normalizePosition(selectedTrial.position),
        sourcePriority: normalizeNumber(selectedTrial.sourcePriority),
        alphaPriorityIndex: normalizeNumber(selectedTrial.alphaPriorityIndex),
        rankingKey: Array.isArray(selectedTrial.rankingKey) ? [...selectedTrial.rankingKey] : null,
        earlyAccept: selectedTrial.earlyAccept === true,
        originalEvidence: normalizeOriginalEvidence(selectedTrial.originalEvidence),
        residual: normalizeResidual(selectedTrial.residual),
        damage: normalizeDamage(selectedTrial.damage),
        texturePenalty: Number.isFinite(selectedTrial.texturePenalty) ? selectedTrial.texturePenalty : null,
        tooDark: selectedTrial.tooDark === true,
        tooFlat: selectedTrial.tooFlat === true,
        hardReject: selectedTrial.hardReject === true,
        usedCatalogVariant: selectedTrial.provenance?.catalogVariant === true,
        usedSizeJitter: selectedTrial.provenance?.sizeJitter === true,
        usedLocalShift: selectedTrial.provenance?.localShift === true,
        usedAdaptive: selectedTrial.provenance?.adaptive === true,
        usedPreviewAnchor: selectedTrial.provenance?.previewAnchor === true
    };
}
