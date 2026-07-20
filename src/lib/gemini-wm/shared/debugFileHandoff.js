const DB_NAME = 'gwr-debug-file-handoff';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const LATEST_KEY = 'latest';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

function getFileExtension(file) {
    const name = typeof file?.name === 'string' ? file.name.toLowerCase() : '';
    const dotIndex = name.lastIndexOf('.');
    return dotIndex >= 0 ? name.slice(dotIndex) : '';
}

export function getDebugFileKind(file) {
    if (!file) return null;

    const type = typeof file.type === 'string' ? file.type.toLowerCase() : '';
    const extension = getFileExtension(file);

    if (type.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {
        return 'video';
    }
    if (IMAGE_TYPES.has(type) || IMAGE_EXTENSIONS.has(extension)) {
        return 'image';
    }
    return null;
}

export function pickDebugUploadFile(files) {
    const list = Array.from(files || []).filter(Boolean);
    return (
        list.find((file) => getDebugFileKind(file) === 'video')
        || list.find((file) => getDebugFileKind(file) === 'image')
        || null
    );
}

function openHandoffDb() {
    return new Promise((resolve, reject) => {
        const indexedDb = globalThis.indexedDB;
        if (!indexedDb) {
            reject(new Error('当前浏览器不支持本地文件暂存，请直接打开目标调试页后重新选择文件。'));
            return;
        }

        const request = indexedDb.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onerror = () => reject(request.error || new Error('无法打开本地文件暂存。'));
        request.onsuccess = () => resolve(request.result);
    });
}

export async function saveDebugFileHandoff(file, targetKind = getDebugFileKind(file)) {
    if (!file || !targetKind) {
        throw new Error('不支持的文件类型。');
    }

    const record = {
        id: LATEST_KEY,
        kind: targetKind,
        file,
        name: file.name || '',
        type: file.type || '',
        size: Number.isFinite(file.size) ? file.size : 0,
        updatedAt: Date.now()
    };

    const db = await openHandoffDb();
    await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('本地文件暂存失败。'));
        transaction.onabort = () => reject(transaction.error || new Error('本地文件暂存已取消。'));
    }).finally(() => db.close());
    return record;
}

export async function consumeDebugFileHandoff(expectedKind = null) {
    const db = await openHandoffDb();
    let matchedRecord = null;

    await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(LATEST_KEY);

        request.onsuccess = () => {
            const record = request.result || null;
            if (record && (!expectedKind || record.kind === expectedKind)) {
                matchedRecord = record;
                store.delete(LATEST_KEY);
            }
        };
        request.onerror = () => reject(request.error || new Error('读取本地文件暂存失败。'));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('读取本地文件暂存失败。'));
        transaction.onabort = () => reject(transaction.error || new Error('读取本地文件暂存已取消。'));
    }).finally(() => db.close());

    return matchedRecord;
}
