import type { RemoveOptions, WatermarkMeta } from './index.js';

export interface ConsoleLike {
    log?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
}

export interface BrowserRuntimeProcessResult {
    processedBlob: Blob | null;
    processedMeta: (WatermarkMeta & {
        processorPath?: string;
    }) | null;
}

export interface BrowserRuntimeProcessor {
    processWatermarkBlob(blob: Blob, options?: Omit<RemoveOptions, 'engine'>): Promise<BrowserRuntimeProcessResult>;
    removeWatermarkFromBlob(blob: Blob, options?: Omit<RemoveOptions, 'engine'>): Promise<Blob | null>;
    dispose?(): void;
}

export interface CreateBrowserRuntimeProcessorOptions {
    logger?: ConsoleLike;
    createEngine?: () => PromiseLike<import('./index.js').WatermarkEngine> | import('./index.js').WatermarkEngine;
    defaultOptions?: Omit<RemoveOptions, 'engine'>;
    dispose?(): void;
}

export function createBrowserRuntimeProcessor(
    options?: CreateBrowserRuntimeProcessorOptions
): BrowserRuntimeProcessor;
