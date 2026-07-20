function finiteOrFallback(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function createEmptyPipelinePassState() {
    return {
        passCount: 0,
        attemptedPassCount: 0,
        passStopReason: null,
        passes: null
    };
}

export function createFirstPassPipelinePassState({
    firstPassMetrics = null
} = {}) {
    return {
        passCount: 1,
        attemptedPassCount: 1,
        passStopReason: firstPassMetrics?.passStopReason ?? null,
        passes: [firstPassMetrics?.passRecord]
    };
}

export function applyPipelinePassOutcome({
    current,
    outcome
} = {}) {
    const passIncrement = Math.max(0, finiteOrFallback(outcome?.passIncrement, 0));
    return {
        passCount: finiteOrFallback(current?.passCount, 0) + passIncrement,
        attemptedPassCount: finiteOrFallback(current?.attemptedPassCount, 0) + passIncrement,
        passStopReason: outcome?.passStopReason ?? current?.passStopReason ?? null,
        passes: current?.passes ?? null
    };
}
