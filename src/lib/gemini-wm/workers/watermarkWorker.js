import { WatermarkEngine } from '../core/watermarkEngine.js';
import { canvasToBlob } from '../core/canvasBlob.js';

let enginePromise = null;

function getEngine() {
    if (!enginePromise) {
        enginePromise = WatermarkEngine.create();
    }
    return enginePromise;
}

function asErrorPayload(error) {
    if (!error) return { message: 'Unknown error' };
    return {
        message: error.message || String(error),
        stack: error.stack || null
    };
}

self.addEventListener('message', async (event) => {
    const payload = event.data;
    if (!payload || typeof payload.type !== 'string') return;

    if (payload.type === 'ping') {
        self.postMessage({
            id: payload.id,
            ok: true,
            result: {
                ready: true
            }
        });
        return;
    }

    if (payload.type !== 'process-image') return;

    const { id, inputBuffer, mimeType, options } = payload;
    try {
        const engine = await getEngine();
        const inputBlob = new Blob([inputBuffer], { type: mimeType || 'image/png' });
        const imageBitmap = await createImageBitmap(inputBlob);
        const canvas = await engine.removeWatermarkFromImage(imageBitmap, options || {});
        if (typeof imageBitmap.close === 'function') {
            imageBitmap.close();
        }

        const pngBlob = await canvasToBlob(canvas, 'image/png', {
            nullBlobMessage: 'Failed to encode PNG blob'
        });
        const processedBuffer = await pngBlob.arrayBuffer();

        self.postMessage({
            id,
            ok: true,
            result: {
                processedBuffer,
                mimeType: 'image/png',
                meta: canvas.__watermarkMeta || null
            }
        }, [processedBuffer]);
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: asErrorPayload(error)
        });
    }
});
