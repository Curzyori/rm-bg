export async function canvasToBlob(
    canvas,
    type = 'image/png',
    {
        unavailableMessage = 'Canvas blob export API is unavailable',
        nullBlobMessage = 'Failed to encode image blob'
    } = {}
) {
    if (typeof canvas?.convertToBlob === 'function') {
        return await canvas.convertToBlob({ type });
    }

    if (typeof canvas?.toBlob === 'function') {
        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error(nullBlobMessage));
                }
            }, type);
        });
    }

    throw new Error(unavailableMessage);
}
