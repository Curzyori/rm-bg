type GlobalBlobLike = typeof globalThis extends {
    Blob: { prototype: infer TPrototype }
}
    ? TPrototype
    : {
        arrayBuffer(): Promise<ArrayBuffer>;
        readonly size: number;
        readonly type: string;
    };

export interface UserscriptRuntimeProcessResult {
    processedBlob: GlobalBlobLike;
    processedMeta: Record<string, unknown> | null;
}

export interface UserscriptRuntimeProcessor {
    initialize(): Promise<boolean>;
    processWatermarkBlob(
        blob: GlobalBlobLike,
        options?: Record<string, unknown>
    ): Promise<UserscriptRuntimeProcessResult>;
    removeWatermarkFromBlob(
        blob: GlobalBlobLike,
        options?: Record<string, unknown>
    ): Promise<GlobalBlobLike>;
    dispose(reason?: unknown): void;
}

export interface CreateUserscriptRuntimeProcessorOptions {
    workerCode?: string;
    env?: Record<string, unknown>;
    logger?: {
        log?: (...args: unknown[]) => void;
        warn?: (...args: unknown[]) => void;
        info?: (...args: unknown[]) => void;
    };
}

export function createUserscriptRuntimeProcessor(
    options?: CreateUserscriptRuntimeProcessorOptions
): UserscriptRuntimeProcessor;
