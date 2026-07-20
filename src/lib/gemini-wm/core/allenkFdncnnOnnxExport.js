import { halfToFloat } from './allenkFdncnnNcnnModel.js';

const ONNX_IR_VERSION = 8;
const ONNX_OPSET_VERSION = 13;
const ONNX_TENSOR_FLOAT = 1;
const ONNX_ATTR_INTS = 7;

const WIRE_VARINT = 0;
const WIRE_LENGTH_DELIMITED = 2;

function normalizeBytes(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    return new Uint8Array(bytes);
}

function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function encodeVarint(value) {
    let next = BigInt(value);
    if (next < 0n) {
        throw new Error(`Cannot encode negative varint: ${value}`);
    }

    const bytes = [];
    while (next >= 0x80n) {
        bytes.push(Number((next & 0x7fn) | 0x80n));
        next >>= 7n;
    }
    bytes.push(Number(next));
    return Uint8Array.from(bytes);
}

function fieldKey(fieldNumber, wireType) {
    return encodeVarint((BigInt(fieldNumber) << 3n) | BigInt(wireType));
}

function varintField(fieldNumber, value) {
    return concatBytes([fieldKey(fieldNumber, WIRE_VARINT), encodeVarint(value)]);
}

function int64Field(fieldNumber, value) {
    return varintField(fieldNumber, BigInt(value));
}

function bytesField(fieldNumber, bytesLike) {
    const bytes = normalizeBytes(bytesLike);
    return concatBytes([
        fieldKey(fieldNumber, WIRE_LENGTH_DELIMITED),
        encodeVarint(bytes.length),
        bytes
    ]);
}

function stringField(fieldNumber, value) {
    return bytesField(fieldNumber, new TextEncoder().encode(String(value)));
}

function messageField(fieldNumber, message) {
    return bytesField(fieldNumber, message);
}

function message(parts) {
    return concatBytes(parts.filter(Boolean));
}

function float32RawData(values) {
    const out = new Uint8Array(values.length * 4);
    const view = new DataView(out.buffer);
    for (let i = 0; i < values.length; i++) {
        view.setFloat32(i * 4, values[i], true);
    }
    return out;
}

function readFloat32LE(bytes, offset) {
    const buffer = normalizeBytes(bytes);
    return new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getFloat32(0, true);
}

function readUInt16LE(bytes, offset) {
    const buffer = normalizeBytes(bytes);
    return new DataView(buffer.buffer, buffer.byteOffset + offset, 2).getUint16(0, true);
}

function createTensorProto({ name, dims, rawData }) {
    return message([
        ...dims.map((dim) => int64Field(1, dim)),
        varintField(2, ONNX_TENSOR_FLOAT),
        stringField(8, name),
        bytesField(9, rawData)
    ]);
}

function createShapeProto(dims) {
    return message(dims.map((dim) => messageField(1, message([int64Field(1, dim)]))));
}

function createValueInfoProto({ name, dims }) {
    const tensorType = message([
        varintField(1, ONNX_TENSOR_FLOAT),
        messageField(2, createShapeProto(dims))
    ]);
    const typeProto = message([messageField(1, tensorType)]);

    return message([
        stringField(1, name),
        messageField(2, typeProto)
    ]);
}

function createIntsAttribute(name, values) {
    return message([
        stringField(1, name),
        ...values.map((value) => int64Field(8, value)),
        varintField(20, ONNX_ATTR_INTS)
    ]);
}

function createNodeProto({ name, opType, inputs, outputs, attributes = [] }) {
    return message([
        ...inputs.map((input) => stringField(1, input)),
        ...outputs.map((output) => stringField(2, output)),
        stringField(3, name),
        stringField(4, opType),
        ...attributes.map((attribute) => messageField(5, attribute))
    ]);
}

function decodeSegmentWeightsToFloat32(bin, segment) {
    const values = new Array(segment.weightCount);
    for (let i = 0; i < segment.weightCount; i++) {
        values[i] = halfToFloat(readUInt16LE(bin, segment.weightOffset + i * 2));
    }
    return float32RawData(values);
}

function decodeSegmentBiasToFloat32(bin, segment) {
    const values = new Array(segment.biasCount);
    for (let i = 0; i < segment.biasCount; i++) {
        values[i] = readFloat32LE(bin, segment.biasOffset + i * 4);
    }
    return float32RawData(values);
}

function createInitializers({ bin, segments }) {
    const initializers = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        initializers.push({
            name: `conv${i + 1}.weight`,
            tensor: createTensorProto({
                name: `conv${i + 1}.weight`,
                dims: [
                    segment.outputChannels,
                    segment.inputChannels,
                    segment.kernelH,
                    segment.kernelW
                ],
                rawData: decodeSegmentWeightsToFloat32(bin, segment)
            })
        });
        initializers.push({
            name: `conv${i + 1}.bias`,
            tensor: createTensorProto({
                name: `conv${i + 1}.bias`,
                dims: [segment.biasCount],
                rawData: decodeSegmentBiasToFloat32(bin, segment)
            })
        });
    }

    return initializers;
}

function createNodes({ segments, inputName, outputName }) {
    const nodes = [];
    let previous = inputName;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const index = i + 1;
        const isLast = i === segments.length - 1;
        const convOutput = isLast ? outputName : `conv${index}.out`;
        const reluOutput = `relu${index}.out`;

        nodes.push(createNodeProto({
            name: `conv${index}`,
            opType: 'Conv',
            inputs: [
                previous,
                `conv${index}.weight`,
                `conv${index}.bias`
            ],
            outputs: [convOutput],
            attributes: [
                createIntsAttribute('kernel_shape', [segment.kernelH, segment.kernelW]),
                createIntsAttribute('pads', [segment.padH, segment.padW, segment.padH, segment.padW]),
                createIntsAttribute('strides', [segment.strideH, segment.strideW])
            ]
        }));

        if (!isLast && segment.activationType === 1) {
            nodes.push(createNodeProto({
                name: `relu${index}`,
                opType: 'Relu',
                inputs: [convOutput],
                outputs: [reluOutput]
            }));
            previous = reluOutput;
        } else {
            previous = convOutput;
        }
    }

    return nodes;
}

function createGraphProto({
    bin,
    name,
    segments,
    inputName,
    outputName,
    roiWidth,
    roiHeight
}) {
    const initializers = createInitializers({ bin, segments });
    const nodes = createNodes({ segments, inputName, outputName });
    const inputShape = [1, segments[0].inputChannels, roiHeight, roiWidth];
    const outputShape = [1, segments[segments.length - 1].outputChannels, roiHeight, roiWidth];

    return {
        nodeCount: nodes.length,
        initializerCount: initializers.length,
        bytes: message([
            ...nodes.map((node) => messageField(1, node)),
            stringField(2, name),
            ...initializers.map((initializer) => messageField(5, initializer.tensor)),
            messageField(11, createValueInfoProto({ name: inputName, dims: inputShape })),
            messageField(12, createValueInfoProto({ name: outputName, dims: outputShape }))
        ])
    };
}

function createOpsetImport(version = ONNX_OPSET_VERSION) {
    return message([int64Field(2, version)]);
}

function createModelProto({
    graph,
    irVersion = ONNX_IR_VERSION,
    opsetVersion = ONNX_OPSET_VERSION,
    producerName = 'gemini-watermark-remover',
    modelVersion = 1
}) {
    return message([
        int64Field(1, irVersion),
        stringField(2, producerName),
        int64Field(5, modelVersion),
        messageField(7, graph),
        messageField(8, createOpsetImport(opsetVersion))
    ]);
}

function exportAllenkFdncnnOnnx({
    bin,
    weightLayout,
    roiSize = 72,
    roiWidth = roiSize,
    roiHeight = roiSize,
    inputName = 'fdncnn_input',
    outputName = 'fdncnn_output',
    graphName = 'allenk_fdncnn_color',
    opsetVersion = ONNX_OPSET_VERSION,
    irVersion = ONNX_IR_VERSION
} = {}) {
    const segments = weightLayout?.segments || [];
    if (!segments.length) {
        throw new Error('allenk FDnCNN ONNX export requires weightLayout.segments');
    }
    if (!Number.isInteger(roiWidth) || roiWidth <= 0) {
        throw new Error(`Invalid ONNX ROI width: ${roiWidth}`);
    }
    if (!Number.isInteger(roiHeight) || roiHeight <= 0) {
        throw new Error(`Invalid ONNX ROI height: ${roiHeight}`);
    }

    const graph = createGraphProto({
        bin: normalizeBytes(bin),
        name: graphName,
        segments,
        inputName,
        outputName,
        roiWidth,
        roiHeight
    });
    const model = createModelProto({
        graph: graph.bytes,
        irVersion,
        opsetVersion
    });

    return {
        bytes: model,
        metadata: {
            format: 'onnx',
            tensorDataType: 'float32-raw-data',
            irVersion,
            opsetVersion,
            graphName,
            inputName,
            outputName,
            inputShape: [1, segments[0].inputChannels, roiHeight, roiWidth],
            outputShape: [1, segments[segments.length - 1].outputChannels, roiHeight, roiWidth],
            nodeCount: graph.nodeCount,
            convolutionNodeCount: segments.length,
            reluNodeCount: segments.filter((segment, index) => index < segments.length - 1 && segment.activationType === 1).length,
            initializerCount: graph.initializerCount,
            roiSize: roiWidth === roiHeight ? roiWidth : null,
            roiWidth,
            roiHeight
        }
    };
}

export {
    ONNX_IR_VERSION,
    ONNX_OPSET_VERSION,
    concatBytes,
    createIntsAttribute,
    createNodeProto,
    createTensorProto,
    encodeVarint,
    exportAllenkFdncnnOnnx,
    varintField
};
