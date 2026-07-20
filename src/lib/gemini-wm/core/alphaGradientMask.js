const EPSILON = 1e-8;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function gaussianKernel1D(sigma) {
    if (!Number.isFinite(sigma) || sigma <= 0) return null;

    const radius = Math.max(1, Math.ceil(sigma * 3));
    const kernel = new Float32Array(radius * 2 + 1);
    let sum = 0;

    for (let i = -radius; i <= radius; i++) {
        const value = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel[i + radius] = value;
        sum += value;
    }

    if (sum <= EPSILON) return null;

    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    return { kernel, radius };
}

function blurHorizontal(values, width, height, kernelInfo) {
    const out = new Float32Array(values.length);
    const { kernel, radius } = kernelInfo;

    for (let y = 0; y < height; y++) {
        const rowBase = y * width;
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const sx = clamp(x + k, 0, width - 1);
                sum += values[rowBase + sx] * kernel[k + radius];
            }
            out[rowBase + x] = sum;
        }
    }

    return out;
}

function blurVertical(values, width, height, kernelInfo) {
    const out = new Float32Array(values.length);
    const { kernel, radius } = kernelInfo;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const sy = clamp(y + k, 0, height - 1);
                sum += values[sy * width + x] * kernel[k + radius];
            }
            out[y * width + x] = sum;
        }
    }

    return out;
}

function gaussianBlur(values, width, height, sigma) {
    const kernelInfo = gaussianKernel1D(sigma);
    if (!kernelInfo) return new Float32Array(values);

    return blurVertical(
        blurHorizontal(values, width, height, kernelInfo),
        width,
        height,
        kernelInfo
    );
}

function dilate(values, width, height, radius) {
    if (!Number.isFinite(radius) || radius <= 0) return new Float32Array(values);

    const roundedRadius = Math.max(1, Math.round(radius));
    const radiusSquared = roundedRadius * roundedRadius;
    const out = new Float32Array(values.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let maxValue = 0;
            for (let dy = -roundedRadius; dy <= roundedRadius; dy++) {
                for (let dx = -roundedRadius; dx <= roundedRadius; dx++) {
                    if (dx * dx + dy * dy > radiusSquared) continue;
                    const sx = x + dx;
                    const sy = y + dy;
                    if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
                    maxValue = Math.max(maxValue, values[sy * width + sx]);
                }
            }
            out[y * width + x] = maxValue;
        }
    }

    return out;
}

export function createAlphaGradientMask({
    alphaMap,
    width,
    height = width,
    strength = 1,
    gamma = 0.5,
    dilateRadius = 2,
    blurSigma = 2
}) {
    if (!alphaMap || width <= 0 || height <= 0 || alphaMap.length < width * height) {
        return new Float32Array(0);
    }

    const gradient = new Float32Array(width * height);
    let minGradient = Number.POSITIVE_INFINITY;
    let maxGradient = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const gx =
                -alphaMap[i - width - 1] - 2 * alphaMap[i - 1] - alphaMap[i + width - 1] +
                alphaMap[i - width + 1] + 2 * alphaMap[i + 1] + alphaMap[i + width + 1];
            const gy =
                -alphaMap[i - width - 1] - 2 * alphaMap[i - width] - alphaMap[i - width + 1] +
                alphaMap[i + width - 1] + 2 * alphaMap[i + width] + alphaMap[i + width + 1];
            const value = Math.sqrt(gx * gx + gy * gy);
            gradient[i] = value;
            minGradient = Math.min(minGradient, value);
            maxGradient = Math.max(maxGradient, value);
        }
    }

    if (!Number.isFinite(minGradient) || maxGradient <= minGradient + EPSILON) {
        return new Float32Array(width * height);
    }

    const normalized = new Float32Array(width * height);
    const exponent = Number.isFinite(gamma) && gamma > 0 ? gamma : 1;
    for (let i = 0; i < normalized.length; i++) {
        const value = (gradient[i] - minGradient) / (maxGradient - minGradient);
        normalized[i] = Math.pow(clamp(value, 0, 1), exponent);
    }

    const expanded = dilate(normalized, width, height, dilateRadius);
    const blurred = gaussianBlur(expanded, width, height, blurSigma);
    const safeStrength = Number.isFinite(strength) ? Math.max(0, strength) : 1;

    for (let i = 0; i < blurred.length; i++) {
        blurred[i] = clamp(blurred[i] * safeStrength, 0, 1);
    }

    return blurred;
}

export function getAlphaGradientWeight(mask, index, floor = 0.35) {
    if (!mask || index < 0 || index >= mask.length) {
        return clamp(floor, 0, 1);
    }

    return Math.max(clamp(floor, 0, 1), clamp(mask[index], 0, 1));
}
