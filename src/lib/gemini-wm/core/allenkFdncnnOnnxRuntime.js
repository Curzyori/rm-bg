import * as wasmOrt from 'onnxruntime-web/wasm';

import {
    buildAllenkFdncnnInput,
    convertAllenkFdncnnOutputToRgba
} from './allenkFdncnnDenoise.js';

function getNow() {
    return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

function normalizeShape(shape, fallback = null) {
    if (!Array.isArray(shape)) return fallback;
    const normalized = shape.map((value) => Number(value));
    return normalized.every((value) => Number.isInteger(value) && value > 0)
        ? normalized
        : fallback;
}

function validateImageShape(imageData, inputShape) {
    const expectedHeight = inputShape?.[2];
    const expectedWidth = inputShape?.[3];
    if (!imageData?.data || imageData.width <= 0 || imageData.height <= 0) {
        throw new Error('allenk FDnCNN ONNX runtime requires ImageData-like input');
    }
    if (imageData.width !== expectedWidth || imageData.height !== expectedHeight) {
        const error = new Error(
            `allenk FDnCNN ONNX runtime expected ${expectedWidth}x${expectedHeight}, got ${imageData.width}x${imageData.height}`
        );
        error.code = 'ALLENK_FDNCNN_ONNX_SHAPE_MISMATCH';
        error.expectedWidth = expectedWidth;
        error.expectedHeight = expectedHeight;
        error.actualWidth = imageData.width;
        error.actualHeight = imageData.height;
        throw error;
    }
}

async function createAllenkFdncnnOnnxRuntime({
    ort = null,
    modelBytes,
    session = null,
    executionProvider = 'wasm',
    inputName = 'fdncnn_input',
    outputName = 'fdncnn_output',
    inputShape = [1, 4, 72, 72],
    outputShape = [1, 3, 72, 72],
    graphOptimizationLevel = 'all',
    wasmPaths = null,
    numThreads = 'auto'
} = {}) {
    if (executionProvider === 'webgpu' && !ort) {
        throw new Error('allenk FDnCNN WebGPU runtime requires an injected onnxruntime-web/webgpu module');
    }
    const resolvedOrt = ort || wasmOrt;
    const resolvedInputShape = normalizeShape(inputShape, [1, 4, 72, 72]);
    const resolvedOutputShape = normalizeShape(outputShape, [1, 3, resolvedInputShape[2], resolvedInputShape[3]]);
    if (resolvedOrt.env?.wasm) {
        const canUseThreads = Boolean(globalThis.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined');
        const hardwareThreads = Number(globalThis.navigator?.hardwareConcurrency) || 1;
        const resolvedNumThreads = numThreads === 'auto'
            ? (canUseThreads ? Math.max(1, Math.min(4, Math.ceil(hardwareThreads / 2))) : 1)
            : Math.max(1, Math.round(Number(numThreads) || 1));
        resolvedOrt.env.wasm.numThreads = executionProvider === 'wasm' ? resolvedNumThreads : 1;
        resolvedOrt.env.wasm.proxy = false;
        if (wasmPaths) {
            resolvedOrt.env.wasm.wasmPaths = wasmPaths;
        }
    }
    if (executionProvider === 'webgpu' && resolvedOrt.env?.webgpu) {
        resolvedOrt.env.webgpu.powerPreference = 'high-performance';
    }

    const createStarted = getNow();
    const resolvedSession = session || await resolvedOrt.InferenceSession.create(modelBytes, {
        executionProviders: [executionProvider],
        graphOptimizationLevel
    });
    const createMs = getNow() - createStarted;

    return {
        id: `allenk-fdncnn-onnx-${executionProvider}`,
        status: 'prototype',
        executionProvider,
        inputName,
        outputName,
        inputShape: resolvedInputShape,
        outputShape: resolvedOutputShape,
        createMs,
        session: resolvedSession,
        numThreads: executionProvider === 'wasm'
            ? resolvedOrt.env?.wasm?.numThreads ?? null
            : null,
        estimateMacs(width, height) {
            // Matches the decoded allenk FDnCNN graph: 4->64, 18x 64->64, 64->3, all 3x3.
            return width * height * ((4 * 64 * 9) + (18 * 64 * 64 * 9) + (64 * 3 * 9));
        },
        async execute(input) {
            const tensor = new resolvedOrt.Tensor('float32', input, resolvedInputShape);
            const started = getNow();
            const outputs = await resolvedSession.run({ [inputName]: tensor });
            const runMs = getNow() - started;
            const outputTensor = outputs[outputName];
            if (!outputTensor?.data) {
                throw new Error(`allenk FDnCNN ONNX runtime did not return ${outputName}`);
            }
            return {
                output: outputTensor.data,
                outputShape: [...outputTensor.dims],
                runtime: this.id,
                runMs,
                macs: this.estimateMacs(resolvedInputShape[3], resolvedInputShape[2])
            };
        },
        async denoiseImageData({ imageData, sigma } = {}) {
            validateImageShape(imageData, resolvedInputShape);
            const input = buildAllenkFdncnnInput({ imageData, sigma });
            const result = await this.execute(input);
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
    createAllenkFdncnnOnnxRuntime,
    validateImageShape
};
