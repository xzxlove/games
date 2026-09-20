import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindFullscreen } from '../dist/shared/fullscreen.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
function setup({ webkit = false, portrait = true, lock = async () => {}, native = true } = {}) {
  const calls = [], notices = [], attributes = new Map(), caption = {};
  const doc = new EventTarget(), view = new EventTarget(), target = {};
  const elementKey = webkit ? 'webkitFullscreenElement' : 'fullscreenElement';
  const change = webkit ? 'webkitfullscreenchange' : 'fullscreenchange';
  const orientation = { unlock() { calls.push('unlock'); } };
  if (lock) orientation.lock = function(value) {
    assert.equal(this, orientation);
    assert.equal(doc[elementKey], target, 'lock only after native fullscreen is active');
    calls.push(value);
    return lock();
  };
  view.screen = { orientation };
  view.matchMedia = () => ({ matches: portrait });
  doc.defaultView = view;
  doc.documentElement = target;
  function setFullscreen(element) {
    doc[elementKey] = element;
    doc.dispatchEvent(new Event(change));
  }
  if (native) target[webkit ? 'webkitRequestFullscreen' : 'requestFullscreen'] = function() {
    assert.equal(this, target);
    calls.push('enter');
    setFullscreen(target);
    // Legacy WebKit returns void instead of a promise.
    return webkit ? undefined : Promise.resolve();
  };
  doc[webkit ? 'webkitExitFullscreen' : 'exitFullscreen'] = function() {
    assert.equal(this, doc);
    calls.push('exit');
    setFullscreen(null);
    return Promise.resolve();
  };
  const button = new EventTarget();
  button.ownerDocument = doc;
  button.setAttribute = (key, value) => attributes.set(key, value);
  button.querySelector = () => caption;
  bindFullscreen(button, { notify: message => notices.push(message) });
  return { calls, notices, attributes, caption, doc, view, target, setFullscreen, click: () => button.dispatchEvent(new Event('click')) };
}

test('fullscreen enters landscape and restores orientation and button text on exit', async () => {
  const ui = setup();
  assert.deepEqual(ui.calls, []);
  ui.click();
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape']);
  assert.equal(ui.attributes.get('aria-pressed'), 'true');
  assert.equal(ui.caption.textContent, '退出全屏');
  ui.click();
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape', 'exit', 'unlock']);
  assert.equal(ui.attributes.get('aria-label'), '进入全屏');
  assert.equal(ui.caption.textContent, '全屏');
});

test('browser-driven exit releases the lock, and another entry requests landscape again', async () => {
  const ui = setup();
  ui.click();
  await settle();
  ui.setFullscreen(null);
  assert.equal(ui.calls.at(-1), 'unlock');
  assert.equal(ui.attributes.get('aria-pressed'), 'false');
  ui.click();
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape', 'unlock', 'enter', 'landscape']);
});

test('legacy WebKit fullscreen events also acquire and release landscape', async () => {
  const ui = setup({ webkit: true });
  ui.click();
  await settle();
  ui.setFullscreen(null);
  assert.deepEqual(ui.calls, ['enter', 'landscape', 'unlock']);
  assert.equal(ui.caption.textContent, '全屏');
});

test('unsupported and rejected orientation locks keep fullscreen and explain manual rotation', async () => {
  for (const lock of [null, async () => { throw new Error('NotSupportedError'); }]) {
    const ui = setup({ lock });
    ui.click();
    await settle();
    assert.equal(ui.doc.fullscreenElement, ui.target);
    assert.equal(ui.attributes.get('aria-pressed'), 'true');
    assert.equal(ui.notices.length, 1);
    assert.match(ui.notices[0], /横过来/);
  }
  const landscape = setup({ portrait: false, lock: null });
  landscape.click();
  await settle();
  assert.deepEqual(landscape.notices, []);
});

test('missing or denied native fullscreen does not lock orientation or claim fullscreen', async () => {
  for (const native of [false, true]) {
    const ui = setup({ native });
    if (native) ui.target.requestFullscreen = async () => { throw new Error('Denied'); };
    ui.click();
    await settle();
    assert.deepEqual(ui.calls, []);
    assert.equal(ui.attributes.get('aria-pressed'), 'false');
    assert.equal(ui.notices.length, 1);
  }
});

test('a pending orientation request never blocks exit or shows a stale failure notice', async () => {
  let rejectLock;
  const ui = setup({ lock: () => new Promise((resolve, reject) => { rejectLock = reject; }) });
  ui.click();
  await settle();
  ui.click();
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape', 'exit', 'unlock']);
  rejectLock(new Error('AbortError'));
  await settle();
  assert.deepEqual(ui.notices, []);
});

test('rapid repeated clicks cannot send duplicate native fullscreen requests', async () => {
  const ui = setup();
  let entered;
  ui.target.requestFullscreen = () => {
    ui.calls.push('enter');
    return new Promise(resolve => { entered = () => { ui.setFullscreen(ui.target); resolve(); }; });
  };
  ui.click();
  ui.click();
  assert.deepEqual(ui.calls, ['enter']);
  entered();
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape']);
});

test('leaving the page releases orientation and a restored fullscreen page reacquires it', async () => {
  const ui = setup();
  ui.click();
  await settle();
  ui.view.dispatchEvent(new Event('pagehide'));
  ui.view.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.deepEqual(ui.calls, ['enter', 'landscape', 'unlock', 'landscape']);
});
