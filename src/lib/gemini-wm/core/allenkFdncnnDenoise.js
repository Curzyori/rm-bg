const ALLENK_FDNCNN_MODEL = Object.freeze({
    name: 'FDnCNN Color FP16',
    upstream: 'allenk/GeminiWatermarkTool',
    license: 'MIT',
    runtime: 'NCNN',
    inputBlob: 0,
    outputBlob: 20,
    inputLayout: '[R, G, B, sigma] CHW float32',
    outputLayout: '[R, G, B] CHW float32',
    defaultSigma: 25,
    defaultStrength: 0.85,
    defaultPadding: 16,
    maxSigma: 150,
    maxStrength: 3
});

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function reflect101(index, length) {
    if (length <= 1) return 0;
    let value = Math.round(index);
    while (value < 0 || value >= length) {
        value = value < 0 ? -value : (length * 2 - value - 2);
    }
    return value;
}

function createGaussianKernel(sigma, radius = Math.ceil(sigma * 3)) {
    const safeSigma = Math.max(0.01, sigma);
    const safeRadius = Math.max(1, Math.round(radius));
    const kernel = new Float32Array(safeRadius * 2 + 1);
    let sum = 0;

    for (let i = -safeRadius; i <= safeRadius; i++) {
        const value = Math.exp(-(i * i) / (2 * safeSigma * safeSigma));
        kernel[i + safeRadius] = value;
        sum += value;
    }

    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    return { kernel, radius: safeRadius };
}

function gaussianBlurFloatMap(source, width, height, sigma, radius = Math.ceil(sigma * 3)) {
    if (!source || width <= 0 || height <= 0 || !Number.isFinite(sigma) || sigma <= 0) {
        return new Float32Array(source || 0);
    }

    const { kernel, radius: r } = createGaussianKernel(sigma, radius);
    const temp = new Float32Array(source.length);
    const output = new Float32Array(source.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let dx = -r; dx <= r; dx++) {
                const xx = reflect101(x + dx, width);
                sum += source[y * width + xx] * kernel[dx + r];
            }
            temp[y * width + x] = sum;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let dy = -r; dy <= r; dy++) {
                const yy = reflect101(y + dy, height);
                sum += temp[yy * width + x] * kernel[dy + r];
            }
            output[y * width + x] = sum;
        }
    }

    return output;
}

function inferSquareSize(alphaMap) {
    const size = Math.round(Math.sqrt(alphaMap?.length || 0));
    return size > 0 && size * size === alphaMap.length ? size : 0;
}

function resizeSquareAlphaMapArea(sourceAlpha, sourceSize, targetWidth, targetHeight = targetWidth) {
    if (!sourceAlpha || sourceSize <= 0 || targetWidth <= 0 || targetHeight <= 0) {
        return new Float32Array(0);
    }
    if (sourceSize === targetWidth && sourceSize === targetHeight) {
        return new Float32Array(sourceAlpha);
    }

    const output = new Float32Array(targetWidth * targetHeight);
    const scaleX = sourceSize / targetWidth;
    const scaleY = sourceSize / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        const yStart = y * scaleY;
        const yEnd = (y + 1) * scaleY;
        const y0 = Math.floor(yStart);
        const y1 = Math.ceil(yEnd);

        for (let x = 0; x < targetWidth; x++) {
            const xStart = x * scaleX;
            const xEnd = (x + 1) * scaleX;
            const x0 = Math.floor(xStart);
            const x1 = Math.ceil(xEnd);

            let sum = 0;
            let areaSum = 0;
            for (let sy = y0; sy < y1; sy++) {
                if (sy < 0 || sy >= sourceSize) continue;
                const wy = Math.max(0, Math.min(yEnd, sy + 1) - Math.max(yStart, sy));
                for (let sx = x0; sx < x1; sx++) {
                    if (sx < 0 || sx >= sourceSize) continue;
                    const wx = Math.max(0, Math.min(xEnd, sx + 1) - Math.max(xStart, sx));
                    const area = wx * wy;
                    sum += sourceAlpha[sy * sourceSize + sx] * area;
                    areaSum += area;
                }
            }

            output[y * targetWidth + x] = areaSum > 0 ? sum / areaSum : 0;
        }
    }

    return output;
}

function resizeSquareAlphaMapLinear(sourceAlpha, sourceSize, targetWidth, targetHeight = targetWidth) {
    if (!sourceAlpha || sourceSize <= 0 || targetWidth <= 0 || targetHeight <= 0) {
        return new Float32Array(0);
    }
    if (sourceSize === targetWidth && sourceSize === targetHeight) {
        return new Float32Array(sourceAlpha);
    }

    const output = new Float32Array(targetWidth * targetHeight);
    const scaleX = sourceSize / targetWidth;
    const scaleY = sourceSize / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        const sourceY = (y + 0.5) * scaleY - 0.5;
        const y0 = Math.floor(sourceY);
        const y1 = y0 + 1;
        const wy = sourceY - y0;

        for (let x = 0; x < targetWidth; x++) {
            const sourceX = (x + 0.5) * scaleX - 0.5;
            const x0 = Math.floor(sourceX);
            const x1 = x0 + 1;
            const wx = sourceX - x0;

            const topLeft = sourceAlpha[clamp(y0, 0, sourceSize - 1) * sourceSize + clamp(x0, 0, sourceSize - 1)] || 0;
            const topRight = sourceAlpha[clamp(y0, 0, sourceSize - 1) * sourceSize + clamp(x1, 0, sourceSize - 1)] || 0;
            const bottomLeft = sourceAlpha[clamp(y1, 0, sourceSize - 1) * sourceSize + clamp(x0, 0, sourceSize - 1)] || 0;
            const bottomRight = sourceAlpha[clamp(y1, 0, sourceSize - 1) * sourceSize + clamp(x1, 0, sourceSize - 1)] || 0;
            const top = topLeft * (1 - wx) + topRight * wx;
            const bottom = bottomLeft * (1 - wx) + bottomRight * wx;

            output[y * targetWidth + x] = top * (1 - wy) + bottom * wy;
        }
    }

    return output;
}

function resizeSquareAlphaMapOpenCv(sourceAlpha, sourceSize, targetWidth, targetHeight = targetWidth) {
    return targetWidth > sourceSize
        ? resizeSquareAlphaMapLinear(sourceAlpha, sourceSize, targetWidth, targetHeight)
        : resizeSquareAlphaMapArea(sourceAlpha, sourceSize, targetWidth, targetHeight);
}

const ALLENK_ELLIPSE_5X5 = Object.freeze([
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0]
]);

function dilateAllenkEllipse5x5(values, width, height) {
    const output = new Float32Array(values.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let maxValue = 0;
            for (let ky = 0; ky < 5; ky++) {
                for (let kx = 0; kx < 5; kx++) {
                    if (!ALLENK_ELLIPSE_5X5[ky][kx]) continue;
                    const sx = x + kx - 2;
                    const sy = y + ky - 2;
                    if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
                    maxValue = Math.max(maxValue, values[sy * width + sx] || 0);
                }
            }
            output[y * width + x] = maxValue;
        }
    }

    return output;
}

function createAllenkOpenCvGradientMask({ alphaMap, width, height, strength }) {
    if (!alphaMap || width <= 0 || height <= 0 || alphaMap.length < width * height) {
        return new Float32Array(0);
    }

    const gradient = new Float32Array(width * height);
    let minGradient = Number.POSITIVE_INFINITY;
    let maxGradient = Number.NEGATIVE_INFINITY;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const top = reflect101(y - 1, height);
            const bottom = reflect101(y + 1, height);
            const left = reflect101(x - 1, width);
            const right = reflect101(x + 1, width);
            const gx = (
                -alphaMap[top * width + left] -
                2 * alphaMap[y * width + left] -
                alphaMap[bottom * width + left] +
                alphaMap[top * width + right] +
                2 * alphaMap[y * width + right] +
                alphaMap[bottom * width + right]
            );
            const gy = (
                -alphaMap[top * width + left] -
                2 * alphaMap[top * width + x] -
                alphaMap[top * width + right] +
                alphaMap[bottom * width + left] +
                2 * alphaMap[bottom * width + x] +
                alphaMap[bottom * width + right]
            );
            const value = Math.sqrt(gx * gx + gy * gy);
            gradient[y * width + x] = value;
            minGradient = Math.min(minGradient, value);
            maxGradient = Math.max(maxGradient, value);
        }
    }

    if (!Number.isFinite(minGradient) || maxGradient <= minGradient) {
        return new Float32Array(width * height);
    }

    const normalized = new Float32Array(width * height);
    const scale = 1 / (maxGradient - minGradient);
    for (let i = 0; i < normalized.length; i++) {
        normalized[i] = Math.sqrt(clamp((gradient[i] - minGradient) * scale, 0, 1));
    }

    const expanded = dilateAllenkEllipse5x5(normalized, width, height);
    const blurred = gaussianBlurFloatMap(expanded, width, height, 2);
    const safeStrength = Number.isFinite(strength) ? Math.max(0, strength) : 1;

    for (let i = 0; i < blurred.length; i++) {
        blurred[i] = clamp(blurred[i] * safeStrength, 0, 1);
    }

    return blurred;
}

function normalizeAllenkFdncnnOptions(options = {}) {
    const sigma = Number.isFinite(options.sigma)
        ? clamp(options.sigma, 0, ALLENK_FDNCNN_MODEL.maxSigma)
        : ALLENK_FDNCNN_MODEL.defaultSigma;
    const strength = Number.isFinite(options.strength)
        ? clamp(options.strength, 0, ALLENK_FDNCNN_MODEL.maxStrength)
        : ALLENK_FDNCNN_MODEL.defaultStrength;
    const padding = Number.isFinite(options.padding)
        ? Math.max(0, Math.round(options.padding))
        : ALLENK_FDNCNN_MODEL.defaultPadding;

    return { sigma, strength, padding };
}

function createAllenkGradientMask({
    alphaMap,
    width,
    height = width,
    strength = ALLENK_FDNCNN_MODEL.defaultStrength
} = {}) {
    const sourceSize = inferSquareSize(alphaMap);
    const resizedAlphaMap = sourceSize > 0
        ? resizeSquareAlphaMapOpenCv(alphaMap, sourceSize, width, height)
        : alphaMap;

    return createAllenkOpenCvGradientMask({
        alphaMap: resizedAlphaMap,
        width,
        height,
        strength
    });
}

function calculateAllenkPaddedRoi({ imageWidth, imageHeight, region, padding = ALLENK_FDNCNN_MODEL.defaultPadding } = {}) {
    if (!region || imageWidth <= 0 || imageHeight <= 0 || region.width <= 0 || region.height <= 0) {
        return null;
    }

    const safePadding = Math.max(0, Math.round(padding));
    const x = clamp(Math.round(region.x - safePadding), 0, imageWidth);
    const y = clamp(Math.round(region.y - safePadding), 0, imageHeight);
    const right = clamp(Math.round(region.x + region.width + safePadding), 0, imageWidth);
    const bottom = clamp(Math.round(region.y + region.height + safePadding), 0, imageHeight);
    const width = right - x;
    const height = bottom - y;

    if (width < 4 || height < 4) return null;

    return {
        x,
        y,
        width,
        height,
        inner: {
            x: clamp(Math.round(region.x - x), 0, width),
            y: clamp(Math.round(region.y - y), 0, height),
            width: clamp(Math.round(region.width), 0, width),
            height: clamp(Math.round(region.height), 0, height)
        }
    };
}

function calculateAllenkVirtualPaddedRoi({
    imageWidth,
    imageHeight,
    region,
    padding = ALLENK_FDNCNN_MODEL.defaultPadding,
    targetWidth = null,
    targetHeight = null
} = {}) {
    if (!region || imageWidth <= 0 || imageHeight <= 0 || region.width <= 0 || region.height <= 0) {
        return null;
    }

    const safePadding = Math.max(0, Math.round(padding));
    const x = Math.round(region.x - safePadding);
    const y = Math.round(region.y - safePadding);
    const defaultWidth = Math.round(region.width + safePadding * 2);
    const defaultHeight = Math.round(region.height + safePadding * 2);
    const width = Number.isInteger(targetWidth) && targetWidth > 0 ? targetWidth : defaultWidth;
    const height = Number.isInteger(targetHeight) && targetHeight > 0 ? targetHeight : defaultHeight;

    if (width < 4 || height < 4) return null;

    const visibleX = clamp(x, 0, imageWidth);
    const visibleY = clamp(y, 0, imageHeight);
    const visibleRight = clamp(x + width, 0, imageWidth);
    const visibleBottom = clamp(y + height, 0, imageHeight);
    const visibleWidth = visibleRight - visibleX;
    const visibleHeight = visibleBottom - visibleY;
    if (visibleWidth <= 0 || visibleHeight <= 0) return null;

    return {
        x,
        y,
        width,
        height,
        inner: {
            x: clamp(Math.round(region.x - x), 0, width),
            y: clamp(Math.round(region.y - y), 0, height),
            width: clamp(Math.round(region.width), 0, width),
            height: clamp(Math.round(region.height), 0, height)
        },
        visible: {
            x: visibleX,
            y: visibleY,
            width: visibleWidth,
            height: visibleHeight,
            offsetX: visibleX - x,
            offsetY: visibleY - y
        }
    };
}

function calculateAllenkRuntimeRoi({
    imageWidth,
    imageHeight,
    region,
    padding = ALLENK_FDNCNN_MODEL.defaultPadding,
    targetWidth = null,
    targetHeight = null
} = {}) {
    const padded = calculateAllenkPaddedRoi({ imageWidth, imageHeight, region, padding });
    if (!padded) return null;

    const safeTargetWidth = Number.isInteger(targetWidth) && targetWidth > 0 ? targetWidth : null;
    const safeTargetHeight = Number.isInteger(targetHeight) && targetHeight > 0 ? targetHeight : null;
    if (
        !safeTargetWidth ||
        !safeTargetHeight ||
        imageWidth < safeTargetWidth ||
        imageHeight < safeTargetHeight ||
        padded.width > safeTargetWidth ||
        padded.height > safeTargetHeight
    ) {
        return padded;
    }

    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    const x = clamp(Math.round(centerX - safeTargetWidth / 2), 0, imageWidth - safeTargetWidth);
    const y = clamp(Math.round(centerY - safeTargetHeight / 2), 0, imageHeight - safeTargetHeight);

    return {
        x,
        y,
        width: safeTargetWidth,
        height: safeTargetHeight,
        inner: {
            x: clamp(Math.round(region.x - x), 0, safeTargetWidth),
            y: clamp(Math.round(region.y - y), 0, safeTargetHeight),
            width: clamp(Math.round(region.width), 0, safeTargetWidth),
            height: clamp(Math.round(region.height), 0, safeTargetHeight)
        }
    };
}

function extractAllenkVirtualImageData({
    imageData,
    roi,
    imageX = 0,
    imageY = 0,
    canvasWidth = imageData?.width || 0,
    canvasHeight = imageData?.height || 0
} = {}) {
    if (
        !imageData?.data ||
        !roi ||
        imageData.width <= 0 ||
        imageData.height <= 0 ||
        roi.width <= 0 ||
        roi.height <= 0 ||
        canvasWidth <= 0 ||
        canvasHeight <= 0
    ) {
        return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    }

    const width = Math.max(1, Math.round(roi.width));
    const height = Math.max(1, Math.round(roi.height));
    const output = new Uint8ClampedArray(width * height * 4);
    const sourceStride = imageData.data.length >= imageData.width * imageData.height * 4 ? 4 : 3;

    for (let y = 0; y < height; y++) {
        const globalY = clamp(Math.round(roi.y + y), 0, canvasHeight - 1);
        const localY = clamp(globalY - Math.round(imageY), 0, imageData.height - 1);
        for (let x = 0; x < width; x++) {
            const globalX = clamp(Math.round(roi.x + x), 0, canvasWidth - 1);
            const localX = clamp(globalX - Math.round(imageX), 0, imageData.width - 1);
            const src = (localY * imageData.width + localX) * sourceStride;
            const dst = (y * width + x) * 4;
            output[dst] = imageData.data[src] || 0;
            output[dst + 1] = imageData.data[src + 1] || 0;
            output[dst + 2] = imageData.data[src + 2] || 0;
            output[dst + 3] = sourceStride >= 4 ? (imageData.data[src + 3] ?? 255) : 255;
        }
    }

    const ImageDataCtor = typeof imageData.constructor === 'function' && imageData.constructor !== Object
        ? imageData.constructor
        : typeof ImageData === 'function'
            ? ImageData
            : null;
    if (ImageDataCtor) {
        return new ImageDataCtor(output, width, height);
    }

    return { width, height, data: output };
}

function embedAllenkRoiWeights({ roiWeights, roiWidth, roiHeight, paddedRoi, blurSigma = 1 } = {}) {
    if (!roiWeights || !paddedRoi?.inner || roiWidth <= 0 || roiHeight <= 0) {
        return new Float32Array(0);
    }

    const weights = new Float32Array(paddedRoi.width * paddedRoi.height);
    const inner = paddedRoi.inner;

    for (let y = 0; y < roiHeight; y++) {
        const py = inner.y + y;
        if (py < 0 || py >= paddedRoi.height) continue;

        for (let x = 0; x < roiWidth; x++) {
            const px = inner.x + x;
            if (px < 0 || px >= paddedRoi.width) continue;
            weights[py * paddedRoi.width + px] = clamp(roiWeights[y * roiWidth + x] || 0, 0, 1);
        }
    }

    return gaussianBlurFloatMap(weights, paddedRoi.width, paddedRoi.height, blurSigma);
}

function buildAllenkFdncnnInput({ imageData, sigma = ALLENK_FDNCNN_MODEL.defaultSigma } = {}) {
    if (!imageData?.data || imageData.width <= 0 || imageData.height <= 0) {
        return new Float32Array(0);
    }

    const { width, height, data } = imageData;
    const pixelCount = width * height;
    const input = new Float32Array(pixelCount * 4);
    const sigmaNorm = clamp(sigma, 0, ALLENK_FDNCNN_MODEL.maxSigma) / 255;
    const stride = data.length >= pixelCount * 4 ? 4 : 3;

    for (let i = 0; i < pixelCount; i++) {
        const src = i * stride;
        input[i] = (data[src] || 0) / 255;
        input[pixelCount + i] = (data[src + 1] || 0) / 255;
        input[pixelCount * 2 + i] = (data[src + 2] || 0) / 255;
        input[pixelCount * 3 + i] = sigmaNorm;
    }

    return input;
}

function convertAllenkFdncnnOutputToRgba({ output, width, height, alpha = 255 } = {}) {
    if (!output || width <= 0 || height <= 0) {
        return new Uint8ClampedArray(0);
    }

    const pixelCount = width * height;
    const rgba = new Uint8ClampedArray(pixelCount * 4);

    for (let i = 0; i < pixelCount; i++) {
        rgba[i * 4] = Math.round(clamp(output[i] || 0, 0, 1) * 255);
        rgba[i * 4 + 1] = Math.round(clamp(output[pixelCount + i] || 0, 0, 1) * 255);
        rgba[i * 4 + 2] = Math.round(clamp(output[pixelCount * 2 + i] || 0, 0, 1) * 255);
        rgba[i * 4 + 3] = alpha;
    }

    return rgba;
}

function getLocalMeanRgb(data, width, height, x, y, channel) {
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            sum += data[(yy * width + xx) * 4 + channel];
            count++;
        }
    }
    return count > 0 ? sum / count : data[(y * width + x) * 4 + channel];
}

function lumaAt(data, idx) {
    return 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
}

function buildAllenkSourceStructureGuard(data, width, height) {
    const guard = new Float32Array(width * height);
    const sample = (x, y) => {
        const xx = clamp(x, 0, width - 1);
        const yy = clamp(y, 0, height - 1);
        return lumaAt(data, (yy * width + xx) * 4);
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const gx =
                -sample(x - 1, y - 1) - 2 * sample(x - 1, y) - sample(x - 1, y + 1) +
                sample(x + 1, y - 1) + 2 * sample(x + 1, y) + sample(x + 1, y + 1);
            const gy =
                -sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1) +
                sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1);
            const gradient = Math.sqrt(gx * gx + gy * gy);
            guard[y * width + x] = clamp((gradient - 48) / (160 - 48), 0, 1);
        }
    }

    return guard;
}

function blendAllenkDenoisedRoi({
    originalData,
    denoisedData,
    weights,
    width = 0,
    height = 0,
    preserveHighpassStrength = 0,
    protectStructure = false
} = {}) {
    if (!originalData || !denoisedData || !weights || originalData.length !== denoisedData.length) {
        return new Uint8ClampedArray(originalData || 0);
    }

    const output = new Uint8ClampedArray(originalData);
    const pixelCount = Math.min(weights.length, Math.floor(originalData.length / 4));
    const canUseSpatialContext = (
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0 &&
        width * height <= pixelCount
    );
    const canPreserveHighpass = (
        Number.isFinite(preserveHighpassStrength) &&
        preserveHighpassStrength > 0 &&
        canUseSpatialContext
    );
    const structureGuard = protectStructure && canUseSpatialContext
        ? buildAllenkSourceStructureGuard(originalData, width, height)
        : null;

    for (let pixel = 0; pixel < pixelCount; pixel++) {
        const rawWeight = clamp(weights[pixel] || 0, 0, 1);
        const structureFactor = structureGuard
            ? Math.max(0.08, 1 - (structureGuard[pixel] || 0) * 0.92)
            : 1;
        const weight = rawWeight * structureFactor;
        if (weight <= 0) continue;

        const idx = pixel * 4;
        const x = canPreserveHighpass ? pixel % width : 0;
        const y = canPreserveHighpass ? Math.floor(pixel / width) : 0;
        const highpassGain = canPreserveHighpass
            ? Math.min(0.28, weight * preserveHighpassStrength)
            : 0;
        for (let c = 0; c < 3; c++) {
            const blended = (
                originalData[idx + c] * (1 - weight) + denoisedData[idx + c] * weight
            );
            const highpass = highpassGain > 0
                ? clamp(originalData[idx + c] - getLocalMeanRgb(originalData, width, height, x, y, c), -14, 14)
                : 0;
            output[idx + c] = Math.round(clamp(blended + highpass * highpassGain, 0, 255));
        }
    }

    return output;
}

export {
    ALLENK_FDNCNN_MODEL,
    blendAllenkDenoisedRoi,
    buildAllenkFdncnnInput,
    calculateAllenkPaddedRoi,
    calculateAllenkRuntimeRoi,
    calculateAllenkVirtualPaddedRoi,
    convertAllenkFdncnnOutputToRgba,
    createAllenkGradientMask,
    embedAllenkRoiWeights,
    extractAllenkVirtualImageData,
    normalizeAllenkFdncnnOptions
};
