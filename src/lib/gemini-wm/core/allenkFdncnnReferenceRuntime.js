import {
    buildAllenkFdncnnInput,
    convertAllenkFdncnnOutputToRgba
} from './allenkFdncnnDenoise.js';
import { halfToFloat } from './allenkFdncnnNcnnModel.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function readUInt16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readFloat32LE(bytes, offset) {
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(0, true);
}

function calculateSegmentMacs(segment, width, height) {
    return width * height *
        segment.outputChannels *
        segment.inputChannels *
        segment.kernelW *
        segment.kernelH;
}

function calculateLayoutMacs(segments, width, height) {
    return segments.reduce((sum, segment) => sum + calculateSegmentMacs(segment, width, height), 0);
}

function decodeSegmentWeights(segment, weightBin) {
    const weights = new Float32Array(segment.weightCount);
    for (let i = 0; i < segment.weightCount; i++) {
        weights[i] = halfToFloat(readUInt16LE(weightBin, segment.weightOffset + i * 2));
    }

    const bias = new Float32Array(segment.biasCount);
    for (let i = 0; i < segment.biasCount; i++) {
        bias[i] = readFloat32LE(weightBin, segment.biasOffset + i * 4);
    }

    return { weights, bias };
}

function runSamePaddingConvolution({
    input,
    width,
    height,
    segment,
    weights,
    bias
}) {
    const outputChannels = segment.outputChannels;
    const inputChannels = segment.inputChannels;
    const output = new Float32Array(width * height * outputChannels);
    const kernelW = segment.kernelW;
    const kernelH = segment.kernelH;
    const padX = segment.padW;
    const padY = segment.padH;
    const relu = segment.activationType === 1;
    const plane = width * height;

    for (let oc = 0; oc < outputChannels; oc++) {
        const outputBase = oc * plane;
        const biasValue = bias[oc] || 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = biasValue;
                for (let ic = 0; ic < inputChannels; ic++) {
                    const inputBase = ic * plane;
                    const weightBase = (((oc * inputChannels) + ic) * kernelH) * kernelW;
                    for (let ky = 0; ky < kernelH; ky++) {
                        const sy = y + ky - padY;
                        if (sy < 0 || sy >= height) continue;
                        for (let kx = 0; kx < kernelW; kx++) {
                            const sx = x + kx - padX;
                            if (sx < 0 || sx >= width) continue;
                            sum += input[inputBase + sy * width + sx] * weights[weightBase + ky * kernelW + kx];
                        }
                    }
                }
                output[outputBase + y * width + x] = relu ? Math.max(0, sum) : sum;
            }
        }
    }

    return output;
}

function createAllenkFdncnnReferenceRuntime({
    weightBin,
    weightLayout,
    maxMacs = 50_000_000
} = {}) {
    if (!weightBin || !weightLayout?.segments?.length) {
        throw new Error('Missing allenk FDnCNN weight bin or layout');
    }

    const bin = weightBin instanceof Uint8Array ? weightBin : new Uint8Array(weightBin);
    const decodedSegments = weightLayout.segments.map((segment) => ({
        segment,
        ...decodeSegmentWeights(segment, bin)
    }));

    return {
        id: 'allenk-fdncnn-pure-js-reference',
        status: 'debug-only',
        maxMacs,
        estimateMacs(width, height) {
            return calculateLayoutMacs(weightLayout.segments, width, height);
        },
        execute(input, width, height) {
            const macs = calculateLayoutMacs(weightLayout.segments, width, height);
            if (macs > maxMacs) {
                const error = new Error(`allenk FDnCNN pure JS reference refused ${macs} MACs; max=${maxMacs}`);
                error.code = 'ALLENK_FDNCNN_REFERENCE_MAC_LIMIT';
                error.macs = macs;
                error.maxMacs = maxMacs;
                throw error;
            }

            let current = input;
            for (const decoded of decodedSegments) {
                current = runSamePaddingConvolution({
                    input: current,
                    width,
                    height,
                    segment: decoded.segment,
                    weights: decoded.weights,
                    bias: decoded.bias
                });
            }

            for (let i = 0; i < current.length; i++) {
                current[i] = clamp(current[i], 0, 1);
            }

            return {
                output: current,
                macs,
                runtime: this.id
            };
        },
        denoiseImageData({ imageData, sigma } = {}) {
            const input = buildAllenkFdncnnInput({ imageData, sigma });
            const result = this.execute(input, imageData.width, imageData.height);
            return {
                ...result,
                imageData: {
                    width: imageData.width,
                    height: imageData.height,
                    data: convertAllenkFdncnnOutputToRgba({
                        output: result.output,
                        width: imageData.width,
                        height: imageData.height
                    })
                }
            };
        }
    };
}

export {
    calculateLayoutMacs,
    calculateSegmentMacs,
    createAllenkFdncnnReferenceRuntime,
    decodeSegmentWeights,
    runSamePaddingConvolution
};
