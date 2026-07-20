import { getVeoTextWatermarkTemplates } from './veoTextWatermarkTemplates.js';

const DEFAULT_MIN_NCC = 0.62;
const DEFAULT_VOTE_RATIO = 0.6;
const DEFAULT_ACTIVE_THRESHOLD = 0.02;
const DEFAULT_MARGIN_RADIUS_MIN = 4;
const DEFAULT_MARGIN_RADIUS_SCALE = 0.35;
const STABLE_LOW_CONTRAST_VOTE_RATIO = 0.8;
const STABLE_LOW_CONTRAST_MEAN_NCC_SCALE = 0.68;

function clampInteger(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
}

function lumaAt(data, idx) {
    return (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255;
}

function buildIntegerRange(center, radius, min, max) {
    const safeMin = Math.max(min, Math.round(center - radius));
    const safeMax = Math.min(max, Math.round(center + radius));
    const values = [];
    for (let value = safeMin; value <= safeMax; value++) {
        values.push(value);
    }
    return values;
}

export function computeRectangularSpatialCorrelation({
    imageData,
    alphaMap,
    region,
    activeThreshold = DEFAULT_ACTIVE_THRESHOLD
}) {
    if (!imageData || !alphaMap || !region) return 0;
    const width = region.width ?? region.size;
    const height = region.height ?? region.size;
    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        alphaMap.length !== width * height ||
        region.x < 0 ||
        region.y < 0 ||
        region.x + width > imageData.width ||
        region.y + height > imageData.height
    ) {
        return 0;
    }

    let imageSum = 0;
    let templateSum = 0;
    let count = 0;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const template = alphaMap[row * width + col] || 0;
            if (Math.abs(template) <= activeThreshold) continue;
            const idx = ((region.y + row) * imageData.width + region.x + col) * 4;
            imageSum += lumaAt(imageData.data, idx);
            templateSum += template;
            count++;
        }
    }
    if (count <= 1) return 0;

    const imageMean = imageSum / count;
    const templateMean = templateSum / count;
    let numerator = 0;
    let imageEnergy = 0;
    let templateEnergy = 0;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const template = alphaMap[row * width + col] || 0;
            if (Math.abs(template) <= activeThreshold) continue;
            const idx = ((region.y + row) * imageData.width + region.x + col) * 4;
            const imageDelta = lumaAt(imageData.data, idx) - imageMean;
            const templateDelta = template - templateMean;
            numerator += imageDelta * templateDelta;
            imageEnergy += imageDelta * imageDelta;
            templateEnergy += templateDelta * templateDelta;
        }
    }

    const denominator = Math.sqrt(imageEnergy * templateEnergy);
    return denominator > 0 ? numerator / denominator : 0;
}

export function scoreVeoTextTemplateAt(imageData, template, x, y) {
    const ncc = computeRectangularSpatialCorrelation({
        imageData,
        alphaMap: template.detectorMap,
        region: {
            x,
            y,
            width: template.width,
            height: template.height
        }
    });
    return {
        ncc,
        confidence: Math.max(0, ncc)
    };
}

export function resolveVeoTextSearchCandidates({
    width,
    height,
    templates = getVeoTextWatermarkTemplates(),
    marginRadiusX = null,
    marginRadiusY = null
} = {}) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return [];
    }

    const candidates = [];
    for (const template of templates) {
        if (!template || template.width > width || template.height > height) continue;
        const radiusX = Number.isFinite(marginRadiusX)
            ? marginRadiusX
            : Math.max(DEFAULT_MARGIN_RADIUS_MIN, Math.round(Math.min(template.width, template.height) * DEFAULT_MARGIN_RADIUS_SCALE));
        const radiusY = Number.isFinite(marginRadiusY)
            ? marginRadiusY
            : Math.max(DEFAULT_MARGIN_RADIUS_MIN, Math.round(Math.min(template.width, template.height) * DEFAULT_MARGIN_RADIUS_SCALE));
        const centerRight = template.marginRight;
        const centerBottom = template.marginBottom;
        const rightMargins = buildIntegerRange(centerRight, radiusX, 0, width - template.width);
        const bottomMargins = buildIntegerRange(centerBottom, radiusY, 0, height - template.height);

        for (const marginRight of rightMargins) {
            for (const marginBottom of bottomMargins) {
                const x = width - marginRight - template.width;
                const y = height - marginBottom - template.height;
                if (x < 0 || y < 0 || x + template.width > width || y + template.height > height) {
                    continue;
                }
                candidates.push({
                    id: `${template.id}:${x}:${y}`,
                    watermarkKind: 'veo-text',
                    template,
                    x,
                    y,
                    width: template.width,
                    height: template.height,
                    marginRight,
                    marginBottom
                });
            }
        }
    }
    return candidates;
}

function summarizeVeoTextScores(frameScores) {
    if (!frameScores.length) {
        return {
            frames: 0,
            meanNcc: 0,
            maxNcc: 0,
            votes: 0
        };
    }
    let meanNcc = 0;
    let maxNcc = Number.NEGATIVE_INFINITY;
    for (const score of frameScores) {
        meanNcc += score.ncc;
        maxNcc = Math.max(maxNcc, score.ncc);
    }
    return {
        frames: frameScores.length,
        meanNcc: meanNcc / frameScores.length,
        maxNcc,
        votes: 0
    };
}

function isDefaultTemplateCandidate(summary) {
    const candidate = summary?.candidate;
    const template = candidate?.template;
    return (
        template &&
        candidate.marginRight === template.marginRight &&
        candidate.marginBottom === template.marginBottom
    );
}

function hasStableLowContrastEvidence(summary, effectiveMinNcc, minVoteRatio) {
    if (!isDefaultTemplateCandidate(summary)) return false;
    const requiredVoteRatio = Math.max(minVoteRatio, STABLE_LOW_CONTRAST_VOTE_RATIO);
    const requiredMeanNcc = effectiveMinNcc * STABLE_LOW_CONTRAST_MEAN_NCC_SCALE;
    return (
        summary.voteRatio >= requiredVoteRatio &&
        summary.maxNcc >= effectiveMinNcc &&
        summary.meanNcc >= requiredMeanNcc
    );
}

function formatVeoTextCandidateSummary(summary) {
    return {
        candidateId: summary.candidate.id,
        templateId: summary.candidate.template.id,
        x: summary.candidate.x,
        y: summary.candidate.y,
        width: summary.candidate.width,
        height: summary.candidate.height,
        marginRight: summary.candidate.marginRight,
        marginBottom: summary.candidate.marginBottom,
        meanNcc: summary.meanNcc,
        maxNcc: summary.maxNcc,
        votes: summary.votes,
        voteRatio: summary.voteRatio
    };
}

function selectVeoTextCandidateSummaries(summaries, limit = 20) {
    const selected = new Map();
    for (const summary of summaries.slice(0, limit)) {
        selected.set(summary.candidate.id, summary);
    }
    for (const summary of summaries) {
        if (isDefaultTemplateCandidate(summary)) {
            selected.set(summary.candidate.id, summary);
        }
    }
    return [...selected.values()].map(formatVeoTextCandidateSummary);
}

function createEmptyVeoTextDetection({ frameCount = 0, minNcc, candidates = [], frameWinners = [] }) {
    return {
        watermarkKind: 'veo-text',
        isConfident: false,
        position: null,
        alphaMap: null,
        template: null,
        summary: {
            frameCount,
            minNcc,
            candidates,
            frameWinners
        }
    };
}

function buildVeoTextDetectionResult({
    frames,
    perCandidate,
    frameWinners,
    minNcc,
    minVoteRatio
}) {
    const summaries = [...perCandidate.values()]
        .map((entry) => ({
            candidate: entry.candidate,
            ...summarizeVeoTextScores(entry.scores),
            votes: entry.votes,
            voteRatio: frames.length > 0 ? entry.votes / frames.length : 0
        }))
        .sort((left, right) => {
            if (right.votes !== left.votes) return right.votes - left.votes;
            return right.meanNcc - left.meanNcc;
        });

    const best = summaries[0] || null;
    if (!best) {
        return createEmptyVeoTextDetection({
            frameCount: frames.length,
            minNcc,
            candidates: [],
            frameWinners
        });
    }

    const effectiveMinNcc = Number.isFinite(best.candidate.template.minNcc)
        ? Math.min(minNcc, best.candidate.template.minNcc)
        : minNcc;
    const isConfident = (
        best.meanNcc >= effectiveMinNcc &&
        best.voteRatio >= minVoteRatio
    ) || hasStableLowContrastEvidence(best, effectiveMinNcc, minVoteRatio);
    const position = {
        x: best.candidate.x,
        y: best.candidate.y,
        width: best.candidate.width,
        height: best.candidate.height
    };
    const template = {
        id: best.candidate.template.id,
        width: best.candidate.template.width,
        height: best.candidate.template.height,
        cleanup: { ...best.candidate.template.cleanup }
    };

    return {
        watermarkKind: 'veo-text',
        position,
        alphaMap: best.candidate.template.alphaMap,
        alphaSeed: {
            seedGain: best.candidate.template.observedSeedScale || 1,
            estimates: [],
            estimateCount: 0,
            source: 'template-default'
        },
        template,
        candidate: {
            id: best.candidate.id,
            label: best.candidate.template.id,
            x: best.candidate.x,
            y: best.candidate.y,
            width: best.candidate.width,
            height: best.candidate.height,
            marginRight: best.candidate.marginRight,
            marginBottom: best.candidate.marginBottom
        },
        isConfident,
        summary: {
            frameCount: frames.length,
            minNcc: effectiveMinNcc,
            minVoteRatio,
            best: {
                candidateId: best.candidate.id,
                templateId: best.candidate.template.id,
                x: best.candidate.x,
                y: best.candidate.y,
                width: best.candidate.width,
                height: best.candidate.height,
                marginRight: best.candidate.marginRight,
                marginBottom: best.candidate.marginBottom,
                meanNcc: best.meanNcc,
                maxNcc: best.maxNcc,
                votes: best.votes,
                voteRatio: best.voteRatio
            },
            candidates: selectVeoTextCandidateSummaries(summaries),
            frameWinners
        }
    };
}

async function maybeYieldToMainThread(yieldToMainThread) {
    if (typeof yieldToMainThread === 'function') {
        await yieldToMainThread();
    }
}

export function detectVeoTextWatermarkFromFrames({
    frames,
    width,
    height,
    templates = getVeoTextWatermarkTemplates(),
    minNcc = DEFAULT_MIN_NCC,
    minVoteRatio = DEFAULT_VOTE_RATIO,
    marginRadiusX = null,
    marginRadiusY = null
} = {}) {
    if (!Array.isArray(frames) || frames.length === 0) {
        return createEmptyVeoTextDetection({ minNcc });
    }

    const candidates = resolveVeoTextSearchCandidates({
        width,
        height,
        templates,
        marginRadiusX,
        marginRadiusY
    });
    const perCandidate = new Map(candidates.map((candidate) => [candidate.id, {
        candidate,
        scores: [],
        votes: 0
    }]));
    const frameWinners = [];

    for (const frame of frames) {
        let winner = null;
        for (const candidate of candidates) {
            const score = scoreVeoTextTemplateAt(frame.imageData, candidate.template, candidate.x, candidate.y);
            const scored = {
                timestamp: frame.timestamp,
                ncc: score.ncc,
                confidence: score.confidence
            };
            perCandidate.get(candidate.id).scores.push(scored);
            if (!winner || score.confidence > winner.confidence) {
                winner = {
                    candidateId: candidate.id,
                    templateId: candidate.template.id,
                    timestamp: frame.timestamp,
                    x: candidate.x,
                    y: candidate.y,
                    ncc: score.ncc,
                    confidence: score.confidence
                };
            }
        }
        if (winner) {
            frameWinners.push(winner);
            const entry = perCandidate.get(winner.candidateId);
            if (entry) entry.votes++;
        }
    }

    return buildVeoTextDetectionResult({
        frames,
        perCandidate,
        frameWinners,
        minNcc,
        minVoteRatio
    });
}

export async function detectVeoTextWatermarkFromFramesAsync({
    frames,
    width,
    height,
    templates = getVeoTextWatermarkTemplates(),
    minNcc = DEFAULT_MIN_NCC,
    minVoteRatio = DEFAULT_VOTE_RATIO,
    marginRadiusX = null,
    marginRadiusY = null,
    yieldEveryCandidates = 96,
    yieldToMainThread = null
} = {}) {
    if (!Array.isArray(frames) || frames.length === 0) {
        await maybeYieldToMainThread(yieldToMainThread);
        return createEmptyVeoTextDetection({ minNcc });
    }

    const candidates = resolveVeoTextSearchCandidates({
        width,
        height,
        templates,
        marginRadiusX,
        marginRadiusY
    });
    const perCandidate = new Map(candidates.map((candidate) => [candidate.id, {
        candidate,
        scores: [],
        votes: 0
    }]));
    const frameWinners = [];
    const safeYieldEveryCandidates = Math.max(1, Math.round(yieldEveryCandidates || 96));
    let scoredCandidateCount = 0;

    for (const frame of frames) {
        let winner = null;
        for (const candidate of candidates) {
            const score = scoreVeoTextTemplateAt(frame.imageData, candidate.template, candidate.x, candidate.y);
            const scored = {
                timestamp: frame.timestamp,
                ncc: score.ncc,
                confidence: score.confidence
            };
            perCandidate.get(candidate.id).scores.push(scored);
            if (!winner || score.confidence > winner.confidence) {
                winner = {
                    candidateId: candidate.id,
                    templateId: candidate.template.id,
                    timestamp: frame.timestamp,
                    x: candidate.x,
                    y: candidate.y,
                    ncc: score.ncc,
                    confidence: score.confidence
                };
            }

            scoredCandidateCount++;
            if (scoredCandidateCount % safeYieldEveryCandidates === 0) {
                await maybeYieldToMainThread(yieldToMainThread);
            }
        }
        if (winner) {
            frameWinners.push(winner);
            const entry = perCandidate.get(winner.candidateId);
            if (entry) entry.votes++;
        }
        await maybeYieldToMainThread(yieldToMainThread);
    }

    return buildVeoTextDetectionResult({
        frames,
        perCandidate,
        frameWinners,
        minNcc,
        minVoteRatio
    });
}

export function createSyntheticVeoTextWatermarkImageData({
    width,
    height,
    template,
    position,
    backgroundValue = 48
}) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let idx = 0; idx < data.length; idx += 4) {
        data[idx] = backgroundValue;
        data[idx + 1] = backgroundValue;
        data[idx + 2] = backgroundValue;
        data[idx + 3] = 255;
    }
    for (let row = 0; row < position.height; row++) {
        for (let col = 0; col < position.width; col++) {
            const alpha = template.alphaMap[row * position.width + col] || 0;
            const idx = ((position.y + row) * width + position.x + col) * 4;
            for (let channel = 0; channel < 3; channel++) {
                data[idx + channel] = Math.round(alpha * 255 + (1 - alpha) * data[idx + channel]);
            }
        }
    }
    return { width, height, data };
}
