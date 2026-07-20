import { getEmbeddedAlphaMap } from './embeddedAlphaMaps.js';

const OUTLINE_SIZE = 96;
const SUPPORT_ALPHA_THRESHOLD = 0.025;
const SUPPORT_DILATE_RADIUS = 2;
const PRIOR_DILATE_RADIUS = 1;
const CONTOUR_SEARCH_RADIUS = 3;
const GRADIENT_THRESHOLD_RATIO = 0.12;
const GRADIENT_RIDGE_RATIO = 0.68;
const RESIDUAL_THRESHOLD_SCALE = 0.2;
const MIN_RESIDUAL_THRESHOLD = 1.25;
const REPAIR_STRENGTH = 0.75;
const MIN_MASK_PIXELS = 32;
const MAX_MASK_RATIO = 0.1;
const MIN_SCORE_IMPROVEMENT = 0.12;

let cachedPlan = null;

function morph(values, radius, mode, size) {
    const output = new Float32Array(values.length);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let resolved = mode === 'max' ? 0 : 1;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = x + dx;
                    const sy = y + dy;
                    const value = sx >= 0 && sy >= 0 && sx < size && sy < size
                        ? values[sy * size + sx]
                        : 0;
                    resolved = mode === 'max'
                        ? Math.max(resolved, value)
                        : Math.min(resolved, value);
                }
            }
            output[y * size + x] = resolved;
        }
    }
    return output;
}

function median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) * 0.5;
}

function createContourPlan() {
    if (cachedPlan) return cachedPlan;

    const alphaMap = getEmbeddedAlphaMap('96-20260520');
    if (!alphaMap) return null;

    const size = OUTLINE_SIZE;
    const supportBase = Float32Array.from(
        alphaMap,
        (value) => value >= SUPPORT_ALPHA_THRESHOLD ? 1 : 0
    );
    const support = morph(supportBase, SUPPORT_DILATE_RADIUS, 'max', size);
    const gradientX = new Float32Array(size * size);
    const gradientY = new Float32Array(size * size);
    const gradient = new Float32Array(size * size);

    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            const index = y * size + x;
            gradientX[index] = alphaMap[index + 1] - alphaMap[index - 1];
            gradientY[index] = alphaMap[index + size] - alphaMap[index - size];
            gradient[index] = Math.hypot(gradientX[index], gradientY[index]);
        }
    }

    let maxGradient = 0;
    for (const value of gradient) maxGradient = Math.max(maxGradient, value);
    if (maxGradient <= 1e-6) return null;

    const priorBase = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = y * size + x;
            const value = gradient[index];
            if (value < maxGradient * GRADIENT_THRESHOLD_RATIO) continue;

            let localMaximum = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const sx = x + dx;
                    const sy = y + dy;
                    if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
                    localMaximum = Math.max(localMaximum, gradient[sy * size + sx]);
                }
            }
            if (value >= localMaximum * GRADIENT_RIDGE_RATIO) priorBase[index] = 1;
        }
    }

    const prior = morph(priorBase, PRIOR_DILATE_RADIUS, 'max', size);
    const allowed = morph(prior, CONTOUR_SEARCH_RADIUS, 'max', size);
    const normals = new Array(size * size).fill(null);
    for (let index = 0; index < normals.length; index++) {
        const length = Math.hypot(gradientX[index], gradientY[index]);
        if (length > 1e-5) {
            normals[index] = [gradientX[index] / length, gradientY[index] / length];
        }
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = y * size + x;
            if (!allowed[index] || normals[index]) continue;

            let nearest = null;
            let nearestDistance = Infinity;
            for (let radius = 1; radius <= 5 && !nearest; radius++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const sx = x + dx;
                        const sy = y + dy;
                        if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
                        const candidate = normals[sy * size + sx];
                        const distance = dx * dx + dy * dy;
                        if (candidate && distance < nearestDistance) {
                            nearest = candidate;
                            nearestDistance = distance;
                        }
                    }
                }
            }
            normals[index] = nearest;
        }
    }

    cachedPlan = { size, prior, allowed, support, normals };
    return cachedPlan;
}

function extractRegion(imageData, position) {
    const data = new Uint8ClampedArray(position.width * position.height * 4);
    for (let row = 0; row < position.height; row++) {
        const sourceStart = ((position.y + row) * imageData.width + position.x) * 4;
        const sourceEnd = sourceStart + position.width * 4;
        data.set(imageData.data.subarray(sourceStart, sourceEnd), row * position.width * 4);
    }
    return { width: position.width, height: position.height, data };
}

function writeRegion(imageData, position, region) {
    for (let row = 0; row < position.height; row++) {
        const sourceStart = row * position.width * 4;
        const targetStart = ((position.y + row) * imageData.width + position.x) * 4;
        imageData.data.set(
            region.data.subarray(sourceStart, sourceStart + position.width * 4),
            targetStart
        );
    }
}

function sample(region, x, y, channel) {
    const sx = Math.max(0, Math.min(region.width - 1, x));
    const sy = Math.max(0, Math.min(region.height - 1, y));
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const x1 = Math.min(region.width - 1, x0 + 1);
    const y1 = Math.min(region.height - 1, y0 + 1);
    const wx = sx - x0;
    const wy = sy - y0;
    const read = (px, py) => region.data[(py * region.width + px) * 4 + channel];
    const top = read(x0, y0) * (1 - wx) + read(x1, y0) * wx;
    const bottom = read(x0, y1) * (1 - wx) + read(x1, y1) * wx;
    return top * (1 - wy) + bottom * wy;
}

function predictExterior(region, plan, x, y, normal, channel) {
    let total = 0;
    let count = 0;
    for (const sign of [-1, 1]) {
        for (const distance of [3, 4, 5, 6]) {
            const sx = x + normal[0] * sign * distance;
            const sy = y + normal[1] * sign * distance;
            const px = Math.max(0, Math.min(plan.size - 1, Math.round(sx)));
            const py = Math.max(0, Math.min(plan.size - 1, Math.round(sy)));
            if (plan.support[py * plan.size + px]) continue;
            total += sample(region, sx, sy, channel);
            count++;
        }
    }
    return count > 0 ? total / count : sample(region, x, y, channel);
}

function pixelLuminance(region, x, y) {
    return sample(region, x, y, 0) * 0.2126 +
        sample(region, x, y, 1) * 0.7152 +
        sample(region, x, y, 2) * 0.0722;
}

function predictedLuminance(region, plan, x, y, normal) {
    return predictExterior(region, plan, x, y, normal, 0) * 0.2126 +
        predictExterior(region, plan, x, y, normal, 1) * 0.7152 +
        predictExterior(region, plan, x, y, normal, 2) * 0.0722;
}

export function repairDarkOutlineContour(imageData, position) {
    if (
        !imageData?.data ||
        position?.width !== OUTLINE_SIZE ||
        position?.height !== OUTLINE_SIZE ||
        position.x < 0 ||
        position.y < 0 ||
        position.x + position.width > imageData.width ||
        position.y + position.height > imageData.height
    ) {
        return { accepted: false, reason: 'invalid-region', maskPixels: 0 };
    }

    const plan = createContourPlan();
    if (!plan) return { accepted: false, reason: 'missing-plan', maskPixels: 0 };

    const baseline = extractRegion(imageData, position);
    const residualByPixel = new Float32Array(plan.size * plan.size);
    const noiseResiduals = [];

    for (let y = 0; y < plan.size; y++) {
        for (let x = 0; x < plan.size; x++) {
            const index = y * plan.size + x;
            const normal = plan.normals[index];
            if (!plan.allowed[index] || !normal) continue;
            const residual = Math.abs(
                pixelLuminance(baseline, x, y) -
                predictedLuminance(baseline, plan, x, y, normal)
            );
            residualByPixel[index] = residual;
            if (!plan.support[index]) noiseResiduals.push(residual);
        }
    }

    if (noiseResiduals.length < MIN_MASK_PIXELS) {
        return { accepted: false, reason: 'insufficient-noise-reference', maskPixels: 0 };
    }

    const center = median(noiseResiduals);
    const robustSigma = 1.4826 * median(
        noiseResiduals.map((value) => Math.abs(value - center))
    );
    const residualThreshold = Math.max(
        MIN_RESIDUAL_THRESHOLD,
        (center + 2.75 * robustSigma) * RESIDUAL_THRESHOLD_SCALE
    );
    const mask = new Float32Array(plan.size * plan.size);
    let maskPixels = 0;
    let baselineResidualTotal = 0;

    for (let index = 0; index < mask.length; index++) {
        if (
            plan.prior[index] &&
            plan.normals[index] &&
            residualByPixel[index] >= residualThreshold
        ) {
            mask[index] = 1;
            maskPixels++;
            baselineResidualTotal += residualByPixel[index];
        }
    }

    if (maskPixels < MIN_MASK_PIXELS) {
        return { accepted: false, reason: 'weak-residual', maskPixels, residualThreshold };
    }
    if (maskPixels > plan.size * plan.size * MAX_MASK_RATIO) {
        return { accepted: false, reason: 'mask-too-large', maskPixels, residualThreshold };
    }

    const candidate = {
        width: baseline.width,
        height: baseline.height,
        data: new Uint8ClampedArray(baseline.data)
    };
    let candidateResidualTotal = 0;
    for (let y = 0; y < plan.size; y++) {
        for (let x = 0; x < plan.size; x++) {
            const index = y * plan.size + x;
            if (!mask[index]) continue;
            const targetIndex = index * 4;
            const normal = plan.normals[index];
            for (let channel = 0; channel < 3; channel++) {
                const predicted = predictExterior(baseline, plan, x, y, normal, channel);
                candidate.data[targetIndex + channel] = Math.round(
                    baseline.data[targetIndex + channel] * (1 - REPAIR_STRENGTH) +
                    predicted * REPAIR_STRENGTH
                );
            }
            candidateResidualTotal += Math.abs(
                pixelLuminance(candidate, x, y) -
                predictedLuminance(baseline, plan, x, y, normal)
            );
        }
    }

    const baselineScore = baselineResidualTotal / maskPixels;
    const candidateScore = candidateResidualTotal / maskPixels;
    if (candidateScore > baselineScore * (1 - MIN_SCORE_IMPROVEMENT)) {
        return {
            accepted: false,
            reason: 'insufficient-improvement',
            maskPixels,
            residualThreshold,
            baselineScore,
            candidateScore
        };
    }

    writeRegion(imageData, position, candidate);
    return {
        accepted: true,
        reason: null,
        maskPixels,
        residualThreshold,
        baselineScore,
        candidateScore,
        strength: REPAIR_STRENGTH
    };
}
