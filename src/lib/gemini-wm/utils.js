export function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const statusMessage = typeof document !== 'undefined'
    ? document.getElementById('statusMessage')
    : null;
export function setStatusMessage(message = '', type = '') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.display = message ? 'block' : 'none';
    const colorMap = { warn: 'text-warn', success: 'text-success' };
    statusMessage.classList.remove(...Object.values(colorMap));
    if (colorMap[type]) statusMessage.classList.add(colorMap[type]);
}

const loadingOverlay = typeof document !== 'undefined'
    ? document.getElementById('loadingOverlay')
    : null;
export function showLoading(text = null) {
    if (!loadingOverlay) return;
    loadingOverlay.style.display = 'flex';
    const textEl = loadingOverlay.querySelector('p');
    if (textEl && text) textEl.textContent = text;
}

export function hideLoading() {
    if (!loadingOverlay) return;
    loadingOverlay.style.display = 'none';
}
