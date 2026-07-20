const NCNN_BINARY_PARAM_MAGIC = 7767517;
const NCNN_LAYER_TYPES = Object.freeze({
    6: 'Convolution',
    16: 'Input'
});
const NCNN_WEIGHT_FP16_STORAGE_TAG = 0x01306b47;

function readInt32LE(buffer, offset) {
    if (offset + 4 > buffer.length) {
        throw new Error(`Unexpected end of NCNN param at byte ${offset}`);
    }
    return buffer.readInt32LE
        ? buffer.readInt32LE(offset)
        : new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getInt32(0, true);
}

function readUInt32LE(buffer, offset) {
    if (offset + 4 > buffer.length) {
        throw new Error(`Unexpected end of NCNN bin at byte ${offset}`);
    }
    return buffer.readUInt32LE
        ? buffer.readUInt32LE(offset)
        : new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getUint32(0, true);
}

function normalizeBuffer(buffer) {
    if (buffer instanceof Uint8Array) return buffer;
    return new Uint8Array(buffer);
}

function parseParamPairs(buffer, cursor) {
    const params = {};
    let offset = cursor;

    while (offset < buffer.length) {
        const key = readInt32LE(buffer, offset);
        offset += 4;
        if (key === -233) {
            return { params, offset };
        }

        const value = readInt32LE(buffer, offset);
        offset += 4;
        params[key] = value;
    }

    throw new Error('NCNN layer params were not terminated by -233');
}

function getNcnnLayerTypeName(typeIndex) {
    return NCNN_LAYER_TYPES[typeIndex] || `LayerType${typeIndex}`;
}

function normalizeConvolutionParams(params = {}) {
    return {
        numOutput: params[0] ?? 0,
        kernelW: params[1] ?? 0,
        dilationW: params[2] ?? 1,
        strideW: params[3] ?? 1,
        padW: params[4] ?? 0,
        biasTerm: params[5] ?? 0,
        weightDataSize: params[6] ?? 0,
        activationType: params[9] ?? 0,
        kernelH: params[11] ?? params[1] ?? 0,
        dilationH: params[12] ?? params[2] ?? 1,
        strideH: params[13] ?? params[3] ?? 1,
        padH: params[14] ?? params[4] ?? 0
    };
}

function parseAllenkFdncnnParam(bufferLike) {
    const buffer = normalizeBuffer(bufferLike);
    let offset = 0;

    const magic = readInt32LE(buffer, offset);
    offset += 4;
    if (magic !== NCNN_BINARY_PARAM_MAGIC) {
        throw new Error(`Unsupported NCNN binary param magic: ${magic}`);
    }

    const layerCount = readInt32LE(buffer, offset);
    offset += 4;
    const blobCount = readInt32LE(buffer, offset);
    offset += 4;
    const layers = [];

    for (let i = 0; i < layerCount; i++) {
        const typeIndex = readInt32LE(buffer, offset);
        offset += 4;
        const bottomCount = readInt32LE(buffer, offset);
        offset += 4;
        const topCount = readInt32LE(buffer, offset);
        offset += 4;
        const bottoms = [];
        const tops = [];

        for (let b = 0; b < bottomCount; b++) {
            bottoms.push(readInt32LE(buffer, offset));
            offset += 4;
        }
        for (let t = 0; t < topCount; t++) {
            tops.push(readInt32LE(buffer, offset));
            offset += 4;
        }

        const parsed = parseParamPairs(buffer, offset);
        offset = parsed.offset;

        const type = getNcnnLayerTypeName(typeIndex);
        const layer = {
            index: i,
            typeIndex,
            type,
            bottoms,
            tops,
            params: parsed.params
        };
        if (type === 'Convolution') {
            layer.convolution = normalizeConvolutionParams(parsed.params);
        }
        layers.push(layer);
    }

    return {
        magic,
        layerCount,
        blobCount,
        layers,
        bytesRead: offset,
        byteLength: buffer.length
    };
}

function halfToFloat(half) {
    const sign = (half & 0x8000) ? -1 : 1;
    const exponent = (half >> 10) & 0x1f;
    const fraction = half & 0x03ff;

    if (exponent === 0) {
        return sign * Math.pow(2, -14) * (fraction / 1024);
    }
    if (exponent === 0x1f) {
        return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY;
    }
    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function buildAllenkFdncnnWeightLayout(param, binLike) {
    const bin = normalizeBuffer(binLike);
    let offset = 0;
    let inputChannels = 4;
    const segments = [];

    for (const layer of param.layers) {
        if (layer.type !== 'Convolution') {
            continue;
        }

        const conv = layer.convolution;
        const expectedWeightCount = conv.numOutput * inputChannels * conv.kernelW * conv.kernelH;
        if (expectedWeightCount !== conv.weightDataSize) {
            throw new Error(
                `Unexpected weight count for layer ${layer.index}: expected ${expectedWeightCount}, got ${conv.weightDataSize}`
            );
        }

        const storageTag = readUInt32LE(bin, offset);
        if (storageTag !== NCNN_WEIGHT_FP16_STORAGE_TAG) {
            throw new Error(`Unexpected NCNN weight storage tag at layer ${layer.index}: 0x${storageTag.toString(16)}`);
        }
        const weightOffset = offset + 4;
        const weightBytes = conv.weightDataSize * 2;
        const biasOffset = weightOffset + weightBytes;
        const biasCount = conv.biasTerm ? conv.numOutput : 0;
        const biasBytes = biasCount * 4;

        if (biasOffset + biasBytes > bin.length) {
            throw new Error(`NCNN weights exceed bin length at layer ${layer.index}`);
        }

        segments.push({
            layerIndex: layer.index,
            type: layer.type,
            inputChannels,
            outputChannels: conv.numOutput,
            kernelW: conv.kernelW,
            kernelH: conv.kernelH,
            strideW: conv.strideW,
            strideH: conv.strideH,
            padW: conv.padW,
            padH: conv.padH,
            activationType: conv.activationType,
            storageTag,
            weightOffset,
            weightBytes,
            weightCount: conv.weightDataSize,
            biasOffset,
            biasBytes,
            biasCount
        });

        offset = biasOffset + biasBytes;
        inputChannels = conv.numOutput;
    }

    return {
        storage: 'fp16-weights-fp32-bias',
        byteLength: bin.length,
        bytesRead: offset,
        segments
    };
}

function summarizeAllenkFdncnnModel(param, weightLayout = null) {
    const convolutionLayers = param.layers.filter((layer) => layer.type === 'Convolution');
    const reluLayers = convolutionLayers.filter((layer) => layer.convolution?.activationType === 1);
    const outputLayer = convolutionLayers[convolutionLayers.length - 1] || null;

    return {
        layerCount: param.layerCount,
        blobCount: param.blobCount,
        convolutionLayerCount: convolutionLayers.length,
        reluConvolutionLayerCount: reluLayers.length,
        inputBlob: 0,
        outputBlob: outputLayer?.tops?.[0] ?? null,
        inputChannels: weightLayout?.segments?.[0]?.inputChannels ?? 4,
        hiddenChannels: convolutionLayers[0]?.convolution?.numOutput ?? null,
        outputChannels: outputLayer?.convolution?.numOutput ?? null,
        kernel: convolutionLayers[0]
            ? `${convolutionLayers[0].convolution.kernelW}x${convolutionLayers[0].convolution.kernelH}`
            : null,
        bytesRead: weightLayout?.bytesRead ?? null,
        weightBinBytes: weightLayout?.byteLength ?? null
    };
}

export {
    NCNN_BINARY_PARAM_MAGIC,
    NCNN_WEIGHT_FP16_STORAGE_TAG,
    buildAllenkFdncnnWeightLayout,
    halfToFloat,
    parseAllenkFdncnnParam,
    summarizeAllenkFdncnnModel
};
