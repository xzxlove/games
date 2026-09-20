export function registerOffline({ activateUpdate = false } = {}) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const url = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(url, { updateViaCache: 'none' }).then(registration => {
    const activate = () => { if (activateUpdate && registration.waiting) registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' }); };
    activate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', activate));
  }).catch(() => {});
}
