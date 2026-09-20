// Keep orientation tied to the fullscreen session, including exits via Esc or browser UI.
export function bindFullscreen(button, { target = button.ownerDocument.documentElement, notify = () => {} } = {}) {
  const doc = button.ownerDocument, view = doc.defaultView;
  const orientation = view.screen?.orientation;
  const fullscreenElement = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  let changing = false, landscapeSession = null;

  function releaseOrientation() {
    if (!landscapeSession) return;
    const session = landscapeSession;
    landscapeSession = null;
    session.cancelled = true;
    if (session.requested) {
      try { orientation.unlock?.(); } catch { /* Some browsers expose an unsupported API. */ }
    }
  }

  async function requestLandscape() {
    const session = { requested: false, cancelled: false };
    landscapeSession = session;
    if (typeof orientation?.lock === 'function') {
      try {
        session.requested = true;
        await orientation.lock('landscape');
        return;
      } catch { /* Keep fullscreen available when orientation locking is unsupported. */ }
    }
    if (!session.cancelled && fullscreenElement() === target && view.matchMedia('(orientation: portrait)').matches) {
      notify('请将设备横过来游玩；如果画面没有旋转，请关闭系统的竖屏锁定。');
    }
  }

  function syncFullscreen() {
    const current = fullscreenElement(), active = Boolean(current);
    const label = active ? '退出全屏' : '进入全屏';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
    button.title = label;
    const caption = button.querySelector('span');
    if (caption) caption.textContent = active ? '退出全屏' : '全屏';
    if (current === target) {
      if (!landscapeSession) void requestLandscape();
    } else releaseOrientation();
  }

  button.addEventListener('click', async () => {
    if (changing) return;
    changing = true;
    try {
      if (fullscreenElement()) {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit) await exit.call(doc);
      } else {
        const enter = target.requestFullscreen || target.webkitRequestFullscreen;
        if (!enter) {
          notify('请将设备横过来，并用 Safari 的“添加到主屏幕”打开，获得更大的游玩画面。');
          return;
        }
        await enter.call(target);
      }
      syncFullscreen();
    } catch {
      notify('暂时无法进入全屏，请将设备横过来，或添加到主屏幕后游玩。');
    } finally { changing = false; }
  });
  doc.addEventListener('fullscreenchange', syncFullscreen);
  doc.addEventListener('webkitfullscreenchange', syncFullscreen);
  view.addEventListener('pagehide', releaseOrientation);
  view.addEventListener('pageshow', syncFullscreen);
  syncFullscreen();
}
