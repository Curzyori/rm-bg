export const GWR_ORIGINAL_ASSET_REFRESH_MESSAGE = '无法获取原图，请刷新页面后重试';

export function showUserNotice(targetWindow = globalThis, message = '') {
  const normalizedMessage = typeof message === 'string' ? message.trim() : '';
  if (!normalizedMessage) {
    return false;
  }

  try {
    if (typeof targetWindow?.alert === 'function') {
      targetWindow.alert(normalizedMessage);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
