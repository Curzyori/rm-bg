import { compareRankingKey } from './watermarkScoring.js';

const FAMILY_ORDER = [
    'standard',
    'geometry',
    'polarity',
    'alpha',
    'aggressive'
];
const DEFAULT_RANKING_KEY = [99, 99, 99, 99, 99, 99];
const NEAR_EQUIVALENT_PIXEL_TOLERANCE = 1;
const NEAR_EQUIVALENT_ALPHA_GAIN_TOLERANCE = 0.05;

export function classifyCandidateFamily(trial) {
    const source = String(trial?.source ?? '');
    const provenance = trial?.provenance ?? {};

    if (provenance.topNConservative === true) return 'alpha';
    if (source.includes('aggressive-located')) return 'aggressive';
    if (
        provenance.outlineDark === true ||
        provenance.outlineLight === true ||
        provenance.darkPolarity === true
    ) {
        return 'polarity';
    }
    if (
        provenance.adaptive === true ||
        provenance.localShift === true ||
        provenance.sizeJitter === true ||
        provenance.previewAnchor === true
    ) {
        return 'geometry';
    }
    if (
        Number(trial?.alphaGain ?? 1) !== 1 ||
        String(trial?.config?.alphaVariant ?? '').length > 0
    ) {
        return 'alpha';
    }
    return 'standard';
}

export function createCandidateHypothesis(trial, index = 0) {
    const position = trial?.position;
    const config = trial?.config;
    if (
        !trial ||
        !position ||
        !config ||
        ![
            position.x,
            position.y,
            position.width,
            position.height
        ].every(Number.isFinite)
    ) {
        return null;
    }

    const alphaGain = Number.isFinite(trial.alphaGain) ? trial.alphaGain : 1;
    return {
        id: `candidate-${index}-${position.x}-${position.y}-${position.width}-${alphaGain}`,
        family: classifyCandidateFamily(trial),
        trial,
        config,
        position,
        alphaGain,
        alphaMap: trial.alphaMap ?? null,
        alphaProfile: config.alphaVariant ?? 'default',
        polarity: trial.provenance?.darkPolarity === true ? 'dark' : 'light',
        rankingKey: Array.isArray(trial.rankingKey)
            ? trial.rankingKey
            : DEFAULT_RANKING_KEY
    };
}

function areNearEquivalent(left, right) {
    return left.alphaProfile === right.alphaProfile &&
        left.polarity === right.polarity &&
        left.alphaMap === right.alphaMap &&
        Math.abs(left.alphaGain - right.alphaGain) <= NEAR_EQUIVALENT_ALPHA_GAIN_TOLERANCE &&
        Math.abs(left.position.x - right.position.x) <= NEAR_EQUIVALENT_PIXEL_TOLERANCE &&
        Math.abs(left.position.y - right.position.y) <= NEAR_EQUIVALENT_PIXEL_TOLERANCE &&
        Math.abs(left.position.width - right.position.width) <= NEAR_EQUIVALENT_PIXEL_TOLERANCE &&
        Math.abs(left.position.height - right.position.height) <= NEAR_EQUIVALENT_PIXEL_TOLERANCE;
}

export function dedupeCandidateHypotheses(hypotheses = []) {
    const sorted = hypotheses
        .filter(Boolean)
        .sort((left, right) => compareRankingKey(left.rankingKey, right.rankingKey));
    const deduped = [];
    for (const candidate of sorted) {
        if (!deduped.some((current) => areNearEquivalent(candidate, current))) {
            deduped.push(candidate);
        }
    }
    return deduped;
}

export function selectDiverseCandidateHypotheses(trials = [], { limit = 5 } = {}) {
    const resolvedLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
    const hypotheses = dedupeCandidateHypotheses(
        trials
            .map((trial, index) => createCandidateHypothesis(trial, index))
            .filter(Boolean)
    );
    const selected = [];

    for (const family of FAMILY_ORDER) {
        const candidate = hypotheses.find((item) => (
            item.family === family && !selected.includes(item)
        ));
        if (candidate) selected.push(candidate);
        if (selected.length === resolvedLimit) return selected;
    }

    for (const candidate of hypotheses) {
        if (!selected.includes(candidate)) selected.push(candidate);
        if (selected.length === resolvedLimit) break;
    }

    return selected;
}
