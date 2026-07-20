import {
    computeRegionGradientCorrelation,
    computeRegionSpatialCorrelation
} from './adaptiveDetector.js';
import { calculateNearBlackRatio } from './candidateSelector.js';

const FIRST_PASS_SIGN_FLIP_GRADIENT_THRESHOLD = 0.08;
const FIRST_PASS_SIGN_FLIP_MIN_GRADIENT_DROP = 0.2;

export function shouldStopAfterFirstPass({
    originalSpatialScore,
    originalGradientScore,
    firstPassSpatialScore,
    firstPassGradientScore
}) {
    if (Math.abs(firstPassSpatialScore) <= 0.25) {
        return true;
    }

    return originalSpatialScore >= 0 &&
        firstPassSpatialScore < 0 &&
        firstPassGradientScore <= FIRST_PASS_SIGN_FLIP_GRADIENT_THRESHOLD &&
        (originalGradientScore - firstPassGradientScore) >= FIRST_PASS_SIGN_FLIP_MIN_GRADIENT_DROP;
}

export function createRegionCorrelationMetrics({
    imageData,
    alphaMap,
    position,
    includeNearBlackRatio = false
} = {}) {
    const region = { x: position.x, y: position.y, size: position.width };
    const metrics = {
        spatialScore: computeRegionSpatialCorrelation({
            imageData,
            alphaMap,
            region
        }),
        gradientScore: computeRegionGradientCorrelation({
            imageData,
            alphaMap,
            region
        })
    };
    if (includeNearBlackRatio) {
        metrics.nearBlackRatio = calculateNearBlackRatio(imageData, position);
    }
    return metrics;
}

export function createFirstPassMetrics({
    imageData,
    alphaMap,
    position,
    originalSpatialScore,
    originalGradientScore
} = {}) {
    const firstPassMetrics = createRegionCorrelationMetrics({
        imageData,
        alphaMap,
        position,
        includeNearBlackRatio: true
    });
    const clearedResidual = shouldStopAfterFirstPass({
        originalSpatialScore,
        originalGradientScore,
        firstPassSpatialScore: firstPassMetrics.spatialScore,
        firstPassGradientScore: firstPassMetrics.gradientScore
    });

    return {
        spatialScore: firstPassMetrics.spatialScore,
        gradientScore: firstPassMetrics.gradientScore,
        nearBlackRatio: firstPassMetrics.nearBlackRatio,
        clearedResidual,
        passStopReason: clearedResidual ? 'residual-low' : 'single-pass',
        passRecord: {
            index: 1,
            beforeSpatialScore: originalSpatialScore,
            beforeGradientScore: originalGradientScore,
            afterSpatialScore: firstPassMetrics.spatialScore,
            afterGradientScore: firstPassMetrics.gradientScore,
            improvement: Math.abs(originalSpatialScore) - Math.abs(firstPassMetrics.spatialScore),
            gradientDelta: firstPassMetrics.gradientScore - originalGradientScore,
            nearBlackRatio: firstPassMetrics.nearBlackRatio
        }
    };
}
