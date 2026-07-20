import {
    evaluateRestorationCandidate,
    selectInitialCandidate
} from './candidateSelector.js';
import {
    createCandidateHypothesis,
    selectDiverseCandidateHypotheses
} from './pipelineCandidatePool.js';
import { calculateNearBlackRatio } from './restorationMetrics.js';

const AGGRESSIVE_FALLBACK_MAX_ABS_SPATIAL = 0.22;
const AGGRESSIVE_FALLBACK_MAX_NEAR_BLACK_INCREASE = 0.05;
const AGGRESSIVE_FALLBACK_MAX_NEAR_WHITE_INCREASE = 0.05;

function isSafeAggressiveFallbackSelection(selection) {
    const trial = selection?.selectedTrial;
    const spatial = Number(trial?.processedSpatialScore);
    return Boolean(trial) &&
        Number.isFinite(spatial) &&
        Math.abs(spatial) <= AGGRESSIVE_FALLBACK_MAX_ABS_SPATIAL &&
        trial.damage?.safe === true &&
        Number(trial.nearBlackIncrease ?? 0) <= AGGRESSIVE_FALLBACK_MAX_NEAR_BLACK_INCREASE &&
        Number(trial.nearWhiteIncrease ?? 0) <= AGGRESSIVE_FALLBACK_MAX_NEAR_WHITE_INCREASE;
}

function createSelectorRequest(input) {
    return {
        originalImageData: input.originalImageData,
        config: input.config,
        position: input.position,
        alpha48: input.alpha48,
        alpha96: input.alpha96,
        alpha96Variants: input.alpha96Variants,
        getAlphaMap: input.getAlphaMap,
        allowAdaptiveSearch: input.allowAdaptiveSearch,
        alphaGainCandidates: input.alphaGainCandidates,
        alphaPriorityGains: input.alphaPriorityGains
    };
}

function createConservativeTopNTrial(originalImageData, selection, maximumAllowedGain, origin) {
    const trial = selection?.selectedTrial;
    if (!trial?.alphaMap || !trial?.position || !trial?.config) return null;
    const baselineNearBlackRatio = calculateNearBlackRatio(originalImageData, trial.position);
    const maximumGain = Math.min(maximumAllowedGain, Number(trial.alphaGain ?? 1));
    const gains = [0.5, 0.35, 0.25, 0.15, 0.1]
        .filter((gain) => gain <= maximumGain + 0.0001);
    const candidates = gains.map((alphaGain) => evaluateRestorationCandidate({
        originalImageData,
        alphaMap: trial.alphaMap,
        position: trial.position,
        source: `${trial.source ?? selection.source ?? 'standard'}+top-n-conservative`,
        config: trial.config,
        baselineNearBlackRatio,
        adaptiveConfidence: trial.adaptiveConfidence ?? selection.adaptiveConfidence ?? null,
        alphaGain,
        provenance: {
            ...(trial.provenance ?? {}),
            topNConservative: true,
            topNOrigin: origin
        },
        includeImageData: false,
        sourcePriority: trial.sourcePriority ?? null,
        alphaPriorityIndex: trial.alphaPriorityIndex ?? null
    })).filter(Boolean);
    return candidates.find((candidate) => (
        Number(candidate.nearBlackIncrease ?? Infinity) < 0.04 &&
        Number(candidate.nearWhiteIncrease ?? Infinity) < 0.04
    )) ?? candidates.at(-1) ?? null;
}

function sameTrialIdentity(left, right) {
    if (!left || !right) return false;
    const leftPosition = left.position;
    const rightPosition = right.position;
    return left.alphaMap === right.alphaMap &&
        Math.abs(Number(left.alphaGain ?? 1) - Number(right.alphaGain ?? 1)) < 0.0001 &&
        leftPosition?.x === rightPosition?.x &&
        leftPosition?.y === rightPosition?.y &&
        leftPosition?.width === rightPosition?.width &&
        leftPosition?.height === rightPosition?.height;
}

export function collectInitialWatermarkCandidates(input = {}) {
    const selectCandidate = input.selectCandidate ?? selectInitialCandidate;
    const fixedSelection = selectCandidate({
        ...createSelectorRequest(input),
        allowAutomaticSearch: false,
        allowAggressiveStrongLocated: false
    });
    const automaticSelection = input.allowAdaptiveSearch === false
        ? fixedSelection
        : selectCandidate({
            ...createSelectorRequest(input),
            allowAutomaticSearch: true,
            allowAggressiveStrongLocated: true
        });
    const conservativeTrials = [
        createConservativeTopNTrial(input.originalImageData, fixedSelection, 0.5, 'fixed'),
        createConservativeTopNTrial(input.originalImageData, automaticSelection, 0.25, 'automatic')
    ]
        .filter(Boolean);
    const trials = [
        ...(fixedSelection?.candidatePool ?? []),
        fixedSelection?.selectedTrial,
        ...(automaticSelection?.candidatePool ?? []),
        automaticSelection?.selectedTrial,
        ...conservativeTrials
    ].filter(Boolean);

    const diverseHypotheses = selectDiverseCandidateHypotheses(trials, { limit: 5 });
    const fixedSelectedHypothesis = createCandidateHypothesis(
        fixedSelection?.selectedTrial,
        1000
    );
    const automaticSelectedHypothesis = createCandidateHypothesis(
        automaticSelection?.selectedTrial,
        1001
    );
    const preferredHypotheses = [
        fixedSelectedHypothesis,
        automaticSelectedHypothesis
    ].filter((hypothesis, index, values) => (
        hypothesis &&
        values.findIndex((candidate) => sameTrialIdentity(
            candidate?.trial,
            hypothesis.trial
        )) === index
    ));
    const retainedAlternatives = diverseHypotheses
        .filter((hypothesis) => !preferredHypotheses.some((preferred) => (
            sameTrialIdentity(preferred.trial, hypothesis.trial)
        )))
        .slice(0, Math.max(0, 5 - preferredHypotheses.length));
    const hypotheses = [...preferredHypotheses, ...retainedAlternatives]
        .map((hypothesis) => ({
            ...hypothesis,
            discoveryRole: hypothesis.trial?.provenance?.topNConservative === true
                ? 'conservative-derived'
                : sameTrialIdentity(hypothesis.trial, fixedSelection?.selectedTrial)
                    ? 'fixed-selected'
                    : sameTrialIdentity(hypothesis.trial, automaticSelection?.selectedTrial)
                        ? 'automatic-selected'
                        : automaticSelectedHypothesis?.family === 'aggressive'
                            ? 'aggressive-fallback-alternative'
                        : 'discovered-alternative'
        }));

    return {
        hypotheses,
        fixedSelection,
        automaticSelection
    };
}

export function selectInitialWatermarkCandidate({
    originalImageData,
    config,
    position,
    alpha48,
    alpha96,
    alpha96Variants = null,
    getAlphaMap = null,
    allowAdaptiveSearch = true,
    aggressiveLocatedFallback = true,
    alphaGainCandidates,
    alphaPriorityGains,
    selectCandidate = selectInitialCandidate
} = {}) {
    let initialSelection = selectCandidate({
        originalImageData,
        config,
        position,
        alpha48,
        alpha96,
        alpha96Variants,
        getAlphaMap,
        allowAdaptiveSearch,
        allowAutomaticSearch: false,
        alphaGainCandidates,
        alphaPriorityGains
    });

    if (
        !initialSelection.selectedTrial &&
        aggressiveLocatedFallback !== false
    ) {
        const aggressiveSelection = selectCandidate({
            originalImageData,
            config,
            position,
            alpha48,
            alpha96,
            alpha96Variants,
            getAlphaMap,
            allowAdaptiveSearch,
            allowAutomaticSearch: true,
            allowAggressiveStrongLocated: true,
            alphaGainCandidates,
            alphaPriorityGains
        });
        if (isSafeAggressiveFallbackSelection(aggressiveSelection)) {
            initialSelection = {
                ...aggressiveSelection,
                source: aggressiveSelection.source.includes('aggressive-located')
                    ? aggressiveSelection.source
                    : `${aggressiveSelection.source}+aggressive-located`,
                decisionTier: aggressiveSelection.decisionTier || 'direct-match'
            };
        }
    }

    return initialSelection;
}
