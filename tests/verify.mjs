import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runStoryV2Suite, V21_CINEMATIC_FILES } from './story-v2.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const rawCssRefs = [...indexHtml.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g)].map(m => m[1]);
const rawJsRefs = [...indexHtml.matchAll(/<script\s+defer\s+src="([^"]+)"\s*><\/script>/g)].map(m => m[1]);
assert(rawCssRefs.every(r => r.includes("?v=")), "All stylesheet links in index.html must carry ?v= cache-busting query string");
assert(rawJsRefs.every(r => r.includes("?v=")), "All deferred script tags in index.html must carry ?v= cache-busting query string");
const packageVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
assert([...rawCssRefs, ...rawJsRefs].every(ref => new URL(ref, 'https://local.invalid').searchParams.get('v') === packageVersion),
  'Every stylesheet/module cache key must match the release version');
const cssFiles = rawCssRefs.map(r => r.split("?")[0]);
const jsFiles = rawJsRefs.map(r => r.split("?")[0]);

assert.strictEqual(new Set(cssFiles).size, cssFiles.length, "Stylesheets must not load twice");
assert.strictEqual(new Set(jsFiles).size, jsFiles.length, "Game modules must not load twice");
for (const rel of ['styles/base.css', 'styles/mobile.css', 'styles/presentation.css', 'styles/narrative.css']) {
  assert(cssFiles.includes(rel), 'Missing required stylesheet: ' + rel);
}
for (const rel of ['src/core/env.js', 'src/data/story-v2.js', 'src/render/relic_sprites.js', 'src/game/director.js', 'src/ui/menus.js',
  'src/ui/presentation.js', 'src/game/combat.js', 'src/game/spawner.js', 'src/game/boss_ai.js', 'src/game/update.js', 'src/ui/shop.js', 'src/render/vfx_overlays.js', 'src/render/renderer.js']) {
  assert(jsFiles.includes(rel), 'Missing required module: ' + rel);
}
assert(jsFiles.indexOf('src/data/story-v2.js') < jsFiles.indexOf('src/game/director.js'), 'Story data must load before its director');

for (const rel of [...cssFiles, ...jsFiles, "manifest.json", "assets/icon.svg"]) {
  assert(fs.existsSync(path.join(ROOT, rel)), "Missing modular project file: " + rel);
}

const cssCombined = cssFiles.map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const code = jsFiles.map(f => {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  new vm.Script(src, { filename: f });
  return src;
}).join("\n\n");
const html = indexHtml + "\n<style>\n" + cssCombined + "\n</style>";

new vm.Script(code, { filename: "spire_modular_bundle.js" });

function readJpegPngDims(absPath) {
  const buf = fs.readFileSync(absPath);
  // PNG signature
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), fmt: "png" };
  }
  // JPEG SOF0/SOF2 scan
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      if (marker === 0xff) { off++; continue; }
      if (marker === 0xd8 || marker === 0xd9) { off += 2; continue; }
      const segLen = buf.readUInt16BE(off + 2);
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7), fmt: "jpg" };
      }
      off += 2 + segLen;
    }
  }
  throw new Error("Unsupported image header: " + absPath);
}

function makeCtx(stats, drawCalls = null) {
  return new Proxy({
    arc(x, y, r) {
      if (typeof r !== "number" || Number.isNaN(r) || r < 0) {
        throw new Error(`IndexSizeError: arc radius (${r}) is negative or NaN.`);
      }
    },
    ellipse(x, y, rx, ry) {
      if (typeof rx !== "number" || typeof ry !== "number" || Number.isNaN(rx) || Number.isNaN(ry) || rx < 0 || ry < 0) {
        throw new Error(`IndexSizeError: ellipse radii (${rx}, ${ry}) invalid.`);
      }
    },
    drawImage(img, ...args) {
      if (!img) throw new Error("TypeError: drawImage called with null image");
      for (const v of args) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          throw new Error(`TypeError: drawImage numeric arg invalid: ${v}`);
        }
      }
      if (args.length === 8 && typeof img.width === "number" && typeof img.height === "number" && img.width > 0 && img.height > 0) {
        const [sx, sy, sw, sh, , , dw, dh] = args;
        if (sx < -0.01 || sy < -0.01 || sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0 || sx + sw > img.width + 0.01 || sy + sh > img.height + 0.01) {
          throw new Error(`IndexSizeError: drawImage source out of bounds (${sx},${sy},${sw},${sh}) vs (${img.width}x${img.height})`);
        }
      }
      if (drawCalls) drawCalls.push({ img, args });
    },
    createRadialGradient: () => {
      if (stats) stats.radialGradients++;
      return { addColorStop() {} };
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: txt => ({ width: Math.max(12, String(txt || "").length * 14) })
  }, {
    get(target, prop) { return prop in target ? target[prop] : () => {}; },
    set(target, prop, val) {
      if (stats && prop === "shadowBlur" && val > 0) stats.shadowBlurs++;
      target[prop] = val;
      return true;
    }
  });
}

function makeEl(tag = "div", stats = null, drawCalls = null, owner = null) {
  const listeners = {};
  const children = [];
  let ownText = '';
  const el = {
    tagName: tag.toUpperCase(), nodeType: 1, parentNode: null, parentElement: null,
    width: tag.toLowerCase() === "canvas" ? 300 : undefined,
    height: tag.toLowerCase() === "canvas" ? 150 : undefined,
    style: { setProperty(k, v) { this[k] = String(v); }, getPropertyValue(k) { return this[k] || ''; }, removeProperty(k) { delete this[k]; } },
    dataset: {}, children, childNodes: children, scrollTop: 0, scrollHeight: 200,
    disabled: false, hidden: false, checked: false, value: '', href: '', download: '', _html: '', _attrs: {}, _src: '',
    complete: false, naturalWidth: 0, naturalHeight: 0,
    get src() { return this._src; },
    set src(value) {
      this._src = String(value || '');
      if (this.tagName !== 'IMG') return;
      const dims = owner && owner.assetDimsMap[this._src.split('?')[0]];
      this.complete = !!dims; this.naturalWidth = dims ? dims.w : 0; this.naturalHeight = dims ? dims.h : 0;
      if (dims) this.dispatch('load');
    },
    get id() { return this._attrs.id || ''; },
    set id(v) { this._attrs.id = String(v); if (owner) owner.els[String(v)] = this; },
    get innerHTML() { return this._html; },
    set innerHTML(v) {
      this._html = String(v); ownText = ''; this.replaceChildren();
      const stack = [this];
      const tokens = this._html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
      const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
      for (const token of tokens) {
        if (token.startsWith('<!--') || token.startsWith('<!')) continue;
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (token.startsWith('<')) {
          const m = token.match(/^<([\w-]+)/); if (!m) continue;
          const child = makeEl(m[1], m[1] === 'canvas' ? stats : null, drawCalls, owner);
          const attrs = token.slice(m[0].length, -1);
          for (const x of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) child.setAttribute(x[1], x[2] ?? x[3] ?? x[4] ?? '');
          stack[stack.length - 1].appendChild(child);
          if (!voidTags.test(m[1]) && !token.endsWith('/>')) stack.push(child);
        } else stack[stack.length - 1]._appendText(token.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' '));
      }
    },
    get textContent() { return ownText + children.map(c => c.textContent || '').join(''); },
    set textContent(v) { this.replaceChildren(); ownText = String(v ?? ''); this._html = ownText; },
    _appendText(v) { ownText += v; },
    get className() { return Array.from(this.classList._s).join(' '); },
    set className(v) { this.classList._s = new Set(String(v || '').split(/\s+/).filter(Boolean)); },
    classList: {
      _s: new Set(), add(...c) { c.forEach(v => this._s.add(v)); }, remove(...c) { c.forEach(v => this._s.delete(v)); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; }
    },
    get firstChild() { return children[0] || null; }, get firstElementChild() { return children[0] || null; },
    get lastChild() { return children[children.length - 1] || null; },
    get offsetParent() {
      let n = this; while (n) { if (n.hidden || n.classList.contains('hidden') || n.style.display === 'none') return null; n = n.parentNode; }
      return this.parentElement || null;
    },
    appendChild(ch) { if (ch.parentNode) ch.parentNode.removeChild(ch); ch.parentNode = this; ch.parentElement = this; children.push(ch); return ch; },
    append(...items) { items.forEach(ch => typeof ch === 'string' ? this._appendText(ch) : this.appendChild(ch)); },
    replaceChildren(...items) { for (const ch of [...children]) this.removeChild(ch); items.forEach(ch => this.appendChild(ch)); },
    removeChild(ch) { const i = children.indexOf(ch); if (i >= 0) children.splice(i, 1); ch.parentNode = null; ch.parentElement = null; return ch; },
    getAttribute(k) { if (k === 'class') return this.className || null; return Object.hasOwn(this._attrs, k) ? this._attrs[k] : null; },
    hasAttribute(k) { return this.getAttribute(k) !== null; },
    setAttribute(k, v) {
      const value = String(v); this._attrs[k] = value;
      if (k === 'id') this.id = value;
      else if (k === 'class') this.className = value;
      else if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      else if (['src', 'href', 'value', 'type', 'role', 'title', 'tabIndex'].includes(k)) this[k] = value;
      else if (k === 'hidden') this.hidden = true;
      else if (k === 'disabled') this.disabled = true;
      else if (k === 'checked') this.checked = true;
    },
    removeAttribute(k) { delete this._attrs[k]; if (k === 'hidden') this.hidden = false; if (k === 'disabled') this.disabled = false; },
    select() {}, focus() { if (owner && owner.document) owner.document.activeElement = this; }, blur() { if (owner && owner.document) owner.document.activeElement = owner.document.body; },
    click() { if (!this.disabled) this.dispatch('click', { detail: 0 }); },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }, contains(ch) { return ch === this || children.some(c => c.contains(ch)); },
    getBoundingClientRect() {
      const viewport = owner && owner.document && owner.document.defaultView;
      const width = this.width || (viewport && viewport.innerWidth) || (owner && owner.viewport.width) || 1440;
      const height = this.height || (viewport && viewport.innerHeight) || (owner && owner.viewport.height) || 900;
      return { left: 0, top: 0, right: width, bottom: height, width, height };
    },
    animate(keyframes, options = {}) {
      const animation = {
        target: this, keyframes, options, playState: 'running', currentTime: 0,
        effect: { target: this, getTiming: () => typeof options === 'number' ? { duration: options } : options },
        play() { this.playState = 'running'; }, pause() { this.playState = 'paused'; },
        cancel() { this.playState = 'idle'; this.currentTime = null; },
        finish() { this.playState = 'finished'; if (this.onfinish) this.onfinish(); }
      };
      if (owner) owner.animations.push(animation);
      return animation;
    },
    getAnimations() { return owner ? owner.animations.filter(a => a.target === this && a.playState !== 'idle') : []; },
    matches(sel) {
      return sel.split(',').some(raw => {
        let s = raw.trim().split(/\s+/).pop();
        for (const negated of s.matchAll(/:not\(([^)]+)\)/g)) if (this.matches(negated[1])) return false;
        s = s.replace(/:not\([^)]+\)/g, '');
        const tagMatch = s.match(/^[a-zA-Z][\w-]*/); if (tagMatch && this.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
        const idMatch = s.match(/#([\w-]+)/); if (idMatch && this.id !== idMatch[1]) return false;
        for (const m of s.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(m[1])) return false;
        for (const m of s.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) if (this.getAttribute(m[1]) === null || (m[2] && this.getAttribute(m[1]) !== m[2])) return false;
        return true;
      });
    },
    querySelectorAll(sel) { const out = []; function visit(n) { for (const c of n.children) { if (c.matches(sel)) out.push(c); visit(c); } } visit(this); return out; },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    closest(sel) { let n = this; while (n) { if (n.matches(sel)) return n; n = n.parentNode; } return null; },
    _listeners: listeners,
    addEventListener(ev, fn, options) { (listeners[ev] = listeners[ev] || []).push({ fn, capture: options === true || !!(options && options.capture) }); },
    removeEventListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(record => record.fn !== fn); },
    dispatch(ev, obj = {}) {
      const e = Object.assign({ type: ev, target: this, currentTarget: this, bubbles: !['load', 'error', 'focus', 'blur', 'scroll'].includes(ev),
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this._stop = true; },
        stopImmediatePropagation() { this._stop = this._immediate = true; } }, obj);
      const ancestors = []; for (let n = this.parentNode; n; n = n.parentNode) ancestors.push(n);
      const deliver = (node, capture) => {
        e.currentTarget = node;
        for (const record of node._listeners[ev] || []) {
          if (record.capture !== capture) continue;
          record.fn(e); if (e._immediate) break;
        }
        if (!capture && !e._immediate && typeof node['on' + ev] === 'function') node['on' + ev](e);
      };
      for (const ancestor of [...ancestors].reverse()) { deliver(ancestor, true); if (e._stop) return !e.defaultPrevented; }
      deliver(this, true); if (!e._immediate) deliver(this, false);
      if (e.bubbles && !e._stop) for (const ancestor of ancestors) { deliver(ancestor, false); if (e._stop) break; }
      return !e.defaultPrevented;
    },
    dispatchEvent(e) { return this.dispatch(e.type, e); },
    getContext: () => makeCtx(stats, drawCalls),
    toDataURL: tag.toLowerCase() === 'canvas' ? () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : undefined,
    scrollIntoView() {}, setPointerCapture() {}, releasePointerCapture() {}
  };
  return el;
}

// Measure real asset dimensions once so MockImage mirrors real disk images!
const assetDimsMap = {};
const spireAssetsDir = path.join(ROOT, "assets/spire");
function collectAssetDimensions(dir) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) collectAssetDimensions(abs);
    else if (/\.(png|jpg|jpeg)$/i.test(name)) assetDimsMap[path.relative(ROOT, abs).split(path.sep).join('/')] = readJpegPngDims(abs);
  }
}
collectAssetDimensions(spireAssetsDir);
for (const k of Object.keys(assetDimsMap)) {
  if (/^assets\/spire\/v[23]\/.+\.jpg$/i.test(k)) {
    const pngAlias = k.slice(0, -4) + ".png";
    if (!assetDimsMap[pngAlias]) assetDimsMap[pngAlias] = assetDimsMap[k];
  }
}

function createEnv(mobile, w, h, dprVal = 2, audioMode = "running", preferences = {}) {
  const els = {};
  const animations = [];
  const owner = { els, document: null, animations, assetDimsMap, viewport: { width: w, height: h } };
  const stored = new Map();
  const localStorage = { getItem: k => stored.has(k) ? stored.get(k) : null,
    setItem: (k, v) => stored.set(String(k), String(v)), removeItem: k => stored.delete(k), clear: () => stored.clear() };
  const stats = { radialGradients: 0, shadowBlurs: 0, downloads: [], clipboardText: "", oscStarted: 0 };
  const directorDraws = [];
  const gameDraws = [];
  const winListeners = {};
  const animationFrames = new Map(); let nextAnimationFrame = 0;
  let nowClock = 1000;

  class MockImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.width = 0;
      this.height = 0;
      this.onload = null;
      this.onerror = null;
      this._src = "";
    }
    set src(val) {
      this._src = String(val || "");
      const clean = this._src.split("?")[0];
      const d = assetDimsMap[clean] || (clean.includes("_sheet") ? { w: 1024, h: 256 } : (clean.includes("port_") ? { w: 550, h: 768 } : (clean.includes("cut_") || clean.includes("vista") ? { w: 1376, h: 768 } : { w: 256, h: 256 })));
      this.naturalWidth = d.w;
      this.naturalHeight = d.h;
      this.width = d.w;
      this.height = d.h;
      this.complete = true;
      if (typeof this.onload === "function") this.onload();
    }
    get src() { return this._src; }
  }

  class MockAudioContext {
    constructor() {
      this.state = audioMode === "suspended" ? "suspended" : "running";
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      if (audioMode === "reject") return Promise.reject(new Error("NotAllowedError"));
      this.state = "running";
      return Promise.resolve();
    }
    createOscillator() {
      if (this.state !== "running") throw new Error("AudioContext not running!");
      return {
        type: "sine",
        frequency: {
          setValueAtTime(v) { if (!Number.isFinite(v) || v <= 0) throw new Error("Invalid freq: " + v); },
          exponentialRampToValueAtTime() {}
        },
        connect() {},
        start() { stats.oscStarted++; },
        stop() {}
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime(v) { if (!Number.isFinite(v) || v <= 0) throw new Error("Invalid gain: " + v); },
          exponentialRampToValueAtTime(v) { if (!Number.isFinite(v) || v <= 0) throw new Error("Invalid ramp gain: " + v); },
          linearRampToValueAtTime() {}
        },
        connect() {}
      };
    }
  }

  const sandbox = {
    Math, Date, Object, Array, Set, Map, Number, String, Boolean, JSON, Error, Promise, RegExp, console,
    parseInt, parseFloat, isNaN, isFinite,
    localStorage,
    matchMedia: query => ({ matches: query.includes('pointer') ? mobile : query.includes('reduced-motion') && !!preferences.reducedMotion, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: el => el.style,
    Image: MockImage,
    setTimeout: (fn, ms = 0) => { if (!(ms >= 5000)) fn(); return 1; },
    clearTimeout: () => {},
    Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
    URL: { createObjectURL: () => "blob:mock-log-url", revokeObjectURL: () => {} },
    performance: { now: () => nowClock },
    _advanceClock: ms => { nowClock += ms; return nowClock; },
    requestAnimationFrame: fn => { const id = ++nextAnimationFrame; animationFrames.set(id, fn); return id; },
    cancelAnimationFrame: id => animationFrames.delete(id),
    _flushAnimationFrame: () => { const batch = [...animationFrames.values()]; animationFrames.clear(); batch.forEach(fn => fn(nowClock)); },
    navigator: {
      userAgent: mobile ? "MockMobileSafari/17.0" : "MockDesktopChrome/125.0",
      maxTouchPoints: mobile ? 5 : 0,
      clipboard: { writeText: txt => { stats.clipboardText = txt; return Promise.resolve(); } }
    },
    window: {
      innerWidth: w || (mobile ? 390 : 1440),
      innerHeight: h || (mobile ? 844 : 900),
      devicePixelRatio: dprVal,
      AudioContext: MockAudioContext,
      localStorage,
      matchMedia: query => ({ matches: query.includes('pointer') ? mobile : query.includes('reduced-motion') && !!preferences.reducedMotion, addEventListener() {}, removeEventListener() {} }),
      addEventListener(ev, fn, capture) { (winListeners[ev] = winListeners[ev] || []).push({ fn, capture: capture === true || !!(capture && capture.capture) }); },
      removeEventListener(ev, fn) { winListeners[ev] = (winListeners[ev] || []).filter(r => r.fn !== fn); },
      dispatch(ev, obj = {}) {
        const e = Object.assign({ type: ev, target: null, preventDefault() { this.defaultPrevented = true; },
          stopPropagation() { this._stop = true; }, stopImmediatePropagation() { this._stop = this._immediate = true; } }, obj);
        for (const record of [...(winListeners[ev] || [])].sort((a,b) => Number(b.capture) - Number(a.capture))) {
          record.fn(e); if (e._immediate) break;
        }
      }
    },
    document: {
      hidden: false,
      body: makeEl("body", null, null, owner),
      documentElement: makeEl("html", null, null, owner),
      activeElement: null,
      _docListeners: {},
      execCommand: () => true,
      addEventListener(ev, fn) { (this._docListeners[ev] = this._docListeners[ev] || []).push(fn); },
      dispatch(ev, obj) { (this._docListeners[ev] || []).forEach(fn => fn(obj)); },
      getElementById(id) {
        return els[id] || null;
      },
      querySelector(sel) { return this.body.querySelector(sel); },
      querySelectorAll(sel) { return this.body.querySelectorAll(sel); },
      createElement(tag) {
        const el = makeEl(tag, null, null, owner);
        if (tag === "a") {
          el.click = function () { stats.downloads.push({ href: this.href, download: this.download }); };
        }
        return el;
      }
    }
  };
  owner.document = sandbox.document;
  sandbox.document.body.innerHTML = indexHtml;
  sandbox.document.activeElement = sandbox.document.body;
  sandbox.document.defaultView = sandbox.window;
  sandbox.window.document = sandbox.document;
  const visualListeners = {};
  sandbox.window.visualViewport = {
    _width: null, _height: null, scale: 1, offsetLeft: 0, offsetTop: 0,
    get width() { return this._width ?? sandbox.window.innerWidth; }, set width(v) { this._width = v; },
    get height() { return this._height ?? sandbox.window.innerHeight; }, set height(v) { this._height = v; },
    addEventListener(type, fn) { (visualListeners[type] = visualListeners[type] || []).push(fn); },
    removeEventListener(type, fn) { visualListeners[type] = (visualListeners[type] || []).filter(item => item !== fn); },
    dispatch(type) { for (const fn of visualListeners[type] || []) fn({ type }); }
  };
  // The game canvas is the only drawing surface whose performance calls count.
  els.cv.getContext = () => makeCtx(stats, gameDraws);
  sandbox.globalThis = sandbox;
  if (mobile) sandbox.window.ontouchstart = null;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  vm.runInContext(`
    function __primeTrueEnding() {
      for (const key of ['jinyu','astria','jialan','qingyu']) { grantSpireMemento(key); rememberSpireMemento(key); }
    }
    function __drainDirector(preferred = 'refuse') {
      const visited = [];
      for (let guard = 0; guard < 300 && SpireDirector.isActive(); guard++) {
        const current = SpireDirector.getState();
        const sceneImage = document.querySelector('.story-scene-image');
        visited.push({ eventId: current.eventId, text: current.text, kind: current.kind,
          artPath: current.artPath, artFormat: current.artFormat, artScale: current.artScale,
          cameraMaxScale: current.cameraMaxScale, renderedImageWidth: sceneImage ? parseFloat(sceneImage.style.width) : 0 });
        if (current.choices && current.choices.length) {
          const available = current.choices.filter(c => !c.disabled && c.enabled !== false);
          const option = available.find(c => c.id === preferred || String(c.id).endsWith('.' + preferred)) ||
            available.find(c => /continue|proceed|ready|enter|confirm/.test(c.id)) ||
            available.find(c => c.id === 'back') || available[0];
          if (!option) throw new Error('No enabled narrative option at ' + current.eventId);
          if (SpireDirector.choose(option.id) === false) throw new Error('Narrative option rejected: ' + option.id);
        } else SpireDirector.advanceOrSkip(true);
      }
      if (SpireDirector.isActive()) throw new Error('Narrative did not finish within 300 events: ' + JSON.stringify(SpireDirector.getState()));
      return visited;
    }
    function __spawnPendingBoss() {
      player.weapons = []; player.hp = player.maxHp = 99999;
      for (let k = 0; k < 30; k++) update(0.05);
      return enemies.find(e => e.type === 'boss');
    }
    function __defeatStoryBoss() {
      const boss = __spawnPendingBoss();
      if (!boss) throw new Error('Missing story boss on floor ' + wave);
      hurtEnemy(boss, boss.maxHp + 99999, true, null, false, { undodgeable: true });
      if (boss.d5LastStandT > 0) throw new Error('Phase 1 must never trigger D5 Last Stand');
      __drainDirector();
      if (boss.storyStage !== 2 || boss.hp <= 0) throw new Error('Boss did not enter phase two');
      hurtEnemy(boss, boss.maxHp + 99999, true, null, false, { undodgeable: true });
      if (diff && diff.id === 5 && boss.d5LastStandT > 0) {
        for (let k = 0; k < 105; k++) { player.hp = player.maxHp = 99999; update(0.10); }
        hurtEnemy(boss, boss.maxHp + 99999, true, null, false, { undodgeable: true });
      }
      if (wave < MAX_WAVE) {
        if (state !== 'wave' || !spireFloorFlow.bossDefeated) {
          throw new Error('Early story boss defeat on floor ' + wave + ' must keep wave active to farm mobs');
        }
        finishWave();
      }
      __drainDirector();
      return boss;
    }
  `, sandbox);
  return { sandbox, els, stats, directorDraws, gameDraws, animations };
}

// ============================================================================
// Suite 1: 16-Floor Fixed Non-Random Boss Architecture & Scene Progression
// ============================================================================
{
  const { sandbox: s } = createEnv(false, 1440, 900, 2);
  assert.strictEqual(vm.runInContext("APP_VERSION", s), `v${packageVersion}`, "APP_VERSION must identify the current release");
  assert.strictEqual(vm.runInContext("MAX_WEAPON_TIER", s), 5, "MAX_WEAPON_TIER must be 5");
  assert.strictEqual(vm.runInContext("MAX_WAVE", s), 16, "MAX_WAVE must be strictly 16 floors");
  assert.strictEqual(vm.runInContext("menuStage", s), "home", "Game must boot onto clean Main Title Screen (menuStage === 'home')");
  assert.strictEqual(vm.runInContext("bootIntegrityPassed && document.getElementById('bootGate').classList.contains('hidden') && SpireBootGate.verifyModules().ok", s), true, "SpireBootGate must verify all 20 modules and hide #bootGate once ready");
  assert.strictEqual(vm.runInContext(`(() => {
    bootIntegrityPassed = false;
    player = null;
    startGame('allrounder', { mode: 'story' });
    const blocked = (player === null && state === 'menu');
    bootIntegrityPassed = true;
    return blocked;
  })()`, s), true, "SpireBootGate must block startGame() when bootIntegrityPassed is false");

  // Verify v2.1.2: 32 weapons x 2 evolutions = 64 unique evolutions, T4+T4 -> T5 merge + 2-choice evolution modal,
  // HD baked sprites across all 32 weapons, softened W1-W5 early difficulty with preserved 2.0x late cap,
  // boosted melee base damage, MONSTER_SPD_MUL = 0.80, RANGED_ENEMY_COUNT_MUL = 0.80, stick range >= 130, and Retina floorBakeScale >= 1.60
  const v140Audit = vm.runInContext(`(() => {
    const wIds = Object.keys(WEAPONS);
    if (wIds.length !== 42) return { ok: false, reason: 'Expected 42 weapons, got ' + wIds.length };
    const staffIds = wIds.filter(k => WEAPONS[k].isStaff);
    if (staffIds.length !== 6) return { ok: false, reason: 'Expected 6 staff weapons, got ' + staffIds.length };
    const evoIds = new Set();
    for (const id of wIds) {
      const w = WEAPONS[id];
      if (!Array.isArray(w.evos) || w.evos.length !== 2) return { ok: false, reason: 'Weapon missing 2 evos: ' + id };
      for (const ev of w.evos) {
        if (!ev.id || !ev.name || !ev.desc || !ev.color || evoIds.has(ev.id)) return { ok: false, reason: 'Bad/dup evo on ' + id };
        evoIds.add(ev.id);
        const cv = getBakedWeaponSprite(id, 5, ev.id);
        if (!cv || cv.width !== 192 || cv.height !== 192) return { ok: false, reason: 'Failed HD sprite bake for ' + id };
      }
    }
    if (evoIds.size !== 84) return { ok: false, reason: 'Expected 84 unique evolutions, got ' + evoIds.size };
    if (!(getMidLateWaveHpMul(1) < 0.80 && getMidLateWaveHpMul(4) < 1.0 && getMidLateWaveHpMul(8) > 1.25 && getMidLateWaveHpMul(10) >= 1.70 && Math.abs(getMidLateWaveHpMul(16) - 3.0) <= 1e-6)) {
      return { ok: false, reason: 'Bad midLateHpMul curve' };
    }
    if (!(getMidLateWaveDmgMul(1) < 0.80 && getMidLateWaveDmgMul(4) < 1.0 && getMidLateWaveDmgMul(8) > 1.3 && getMidLateWaveDmgMul(10) >= 1.70 && Math.abs(getMidLateWaveDmgMul(16) - 2.45) <= 1e-6)) {
      return { ok: false, reason: 'Bad midLateDmgMul curve' };
    }
    if (!(DIFFS[0].hpMul <= 0.45 && DIFFS[0].dmgMul <= 0.45)) {
      return { ok: false, reason: 'Expected halved D0 casual difficulty curve' };
    }
    if (MONSTER_HP_BASE_MUL !== 1.44 || BOSS_HP_MUL !== 4.80 || LATE_BOSS_HP_MUL !== 9.60 || MONSTER_SPD_MUL !== 0.80 || RANGED_ENEMY_COUNT_MUL !== 0.80 || WEAPONS.stick.range < 130 || WEAPONS.stick.dmg < 18 || WEAPONS.katana.dmg < 30) {
      return { ok: false, reason: 'Bad v2.1.5 balance constants' };
    }
    const sheath = ITEMS.find(it => it.id === 'fox_parry_sheath');
    if (!sheath || sheath.tier !== 4 || sheath.maxCount !== 1) {
      return { ok: false, reason: 'Missing T4 unique melee deflect relic fox_parry_sheath' };
    }
    const probeP = { meleeBonus: 0, atkSpd: 0, dodge: 0, dodgeCap: 0.80, meleeBulletCutChance: 0 };
    sheath.apply(probeP);
    if (Math.abs(probeP.meleeBulletCutChance - 0.175) > 1e-6) {
      return { ok: false, reason: 'Expected fox_parry_sheath meleeBulletCutChance to be 0.175 (-50%), got ' + probeP.meleeBulletCutChance };
    }

    // Test T4 + T4 -> T5 merge & 2-choice evolution modal + multi-form elongated/oblique terrain blocks
    if (
      typeof getWaveDuration !== 'function' ||
      getWaveDuration(1) !== 30 ||
      getWaveDuration(2) !== 35 ||
      getWaveDuration(3) !== 40 ||
      getWaveDuration(4) !== 45 ||
      getWaveDuration(5) !== 50 ||
      getWaveDuration(6) !== 55 ||
      getWaveDuration(7) !== 60 ||
      getWaveDuration(8) !== 60 ||
      getWaveDuration(16) !== 60 ||
      getWaveDuration(25) !== 60
    ) {
      return { ok: false, reason: 'Bad getWaveDuration progression (expected 30s + 5s/floor capped at 60s)' };
    }
    startGame('allrounder', { mode: 'endless' });
    __drainDirector();
    if (waveTime !== 30 || waveMaxTime !== 30) {
      return { ok: false, reason: 'Expected Wave 1 duration to start at 30s, got ' + waveTime };
    }
    const seenForms = new Set();
    for (let sRun = 0; sRun < 6; sRun++) {
      spawnArenaTerrains();
      if (terrains.length < 4) return { ok: false, reason: 'Expected >=4 random terrain blocks, got ' + terrains.length };
      for (const tr of terrains) {
        if (tr.form) seenForms.add(tr.form);
        drawSingleTerrain(tr, true);
      }
    }
    if (seenForms.size < 3) return { ok: false, reason: 'Expected diverse architectural block terrain forms, got ' + [...seenForms].join(',') };
    createEnemy(260, 260, 'swarmer');
    const swSample = enemies[enemies.length - 1];
    const chSample = createEnemy(340, 260, 'chaser');
    if (!swSample || swSample.r < 15 || !chSample || chSample.r < 20) {
      return { ok: false, reason: 'Expected enlarged readable monster radii in v2.1.5' };
    }
    openShop(true);
    player.weapons = [makeWeapon('katana', 4), makeWeapon('katana', 4)];
    mergeSlot(0);
    const modalOpen = !document.getElementById('evoModal').classList.contains('hidden');
    const choiceCards = document.getElementById('evoChoices').children.length;
    applyWeaponEvolution(player.weapons[0], 1);
    checkPendingWeaponEvolutions();
    const modalClosed = document.getElementById('evoModal').classList.contains('hidden');
    const evolvedOk = player.weapons[0].tier === 5 && player.weapons[0].evo === WEAPONS.katana.evos[1].id;

    // Touchscreen / pen-driver desktop laptop (1280x720 @ 150% DPI) must stay in desktop UI mode under 'auto' AND keep crisp Retina floorBakeScale >= 1.35 on the +20% enlarged 2640x1800 arena while strictly capping floorCanvas <= 3840px (<4096 GPU texture limit, zero flicker!)
    isTouch = true;
    setUIPref('auto');
    const autoTouchDesktopOk = uiMode === 'desktop';
    setUIPref('desktop');
    const touchDesktopSharp = autoTouchDesktopOk && uiMode === 'desktop' && WORLD.w === 2640 && WORLD.h === 1800 && camZoom >= 1.14 && floorBakeScale >= 1.35 && floorCanvas.width <= 3840 && floorCanvas.height <= 3840;
    isTouch = false;
    setUIPref('auto');

    // Verify lowered initial volumes (BGM 28% / SFX 32%), volume step buttons, mute-all (including beep SFX), and #audioModal
    const initVolOk = Math.abs(AudioBank.bgmVol - 0.28) < 1e-6 && Math.abs(AudioBank.sfxVol - 0.32) < 1e-6 && !AudioBank.bgmMuted;
    openAudioModal();
    const audioModalOpened = isAudioModalOpen();
    adjustBgmVolume(-10);
    adjustSfxVolume(10);
    const steppedVolOk = Math.round(AudioBank.bgmVol * 100) === 18 && Math.round(AudioBank.sfxVol * 100) === 42 &&
      document.getElementById('bgmVolVal').textContent === '18%' && document.getElementById('sfxVolVal').textContent === '42%';
    toggleSpireAudio(); // mute all
    const mutedOk = AudioBank.bgmMuted === true && document.getElementById('hudAudioBtn').textContent.includes('🔇');
    resetAudioDefaults();
    closeAudioModal();
    const resetAudioOk = !isAudioModalOpen() && !AudioBank.bgmMuted && Math.round(AudioBank.bgmVol * 100) === 28 && Math.round(AudioBank.sfxVol * 100) === 32;

    return {
      ok: modalOpen && choiceCards === 2 && modalClosed && evolvedOk && touchDesktopSharp && initVolOk && audioModalOpened && steppedVolOk && mutedOk && resetAudioOk,
      reason: JSON.stringify({ modalOpen, choiceCards, modalClosed, evolvedOk, touchDesktopSharp, initVolOk, audioModalOpened, steppedVolOk, mutedOk, resetAudioOk })
    };
  })()`, s);
  assert.strictEqual(v140Audit.ok, true, "v1.4.0 audit failed: " + v140Audit.reason);

  // Verify across multiple runs AND D5 difficulty that Waves 1..16 follow exact Act scenes and fixed non-random Bosses
  const climbAudit = vm.runInContext(`(() => {
    const expectedScene = w => (w <= 4 ? 'foundry' : (w <= 8 ? 'glacier' : (w <= 12 ? 'wasteland' : 'desert')));
    const expectedBoss = { 4: 'butcher', 8: 'frost_queen', 12: 'void_weaver', 16: 'solar_seraph' };
    const expectedMini = { 6: 'glacial_valkyrie', 10: 'shadow_stalker', 14: 'iron_warden' };
    for (const dIdx of [0, 2, 5]) {
      selectedDiff = dIdx;
      selectedScene = 'random';
      startGame('allrounder');
      if (typeof SpireDirector !== 'undefined') __drainDirector();
      for (let w = 1; w <= 16; w++) {
        wave = w;
        if (w === 16) __primeTrueEnding();
        beginWave();
        if (typeof SpireDirector !== 'undefined') {
          __drainDirector();
        }
        if (curScene.id !== expectedScene(w)) return { ok: false, reason: 'Wrong scene on wave ' + w + ': ' + curScene.id };
        // Advance spawns so any queued boss/mini_boss materializes
        player.weapons = []; player.hp = 99999; player.maxHp = 99999;
        for (let k = 0; k < 30; k++) update(0.05);
        const bosses = enemies.filter(e => e.type === 'boss').map(e => e.variant);
        const minis = enemies.filter(e => e.type === 'mini_boss').map(e => e.variant);
        const specials = enemies.filter(e => e.type === 'special_boss').length + relics.length;
        if (specials > 0) return { ok: false, reason: 'Random special relic/boss appeared during story climb wave ' + w };
        if (expectedBoss[w]) {
          if (bosses.length !== 1 || bosses[0] !== expectedBoss[w]) {
            return { ok: false, reason: 'Wave ' + w + ' expected single fixed boss ' + expectedBoss[w] + ', got ' + JSON.stringify(bosses) };
          }
          if (!enemies.find(e => e.type === 'boss').canPhase2) {
            return { ok: false, reason: 'Wave 16 Final Boss solar_seraph must guarantee Phase 2 awakening' };
          }
        } else if (bosses.length !== 0) {
          return { ok: false, reason: 'Non-boss wave ' + w + ' spawned boss: ' + JSON.stringify(bosses) };
        }
        if (expectedMini[w] && diff.midElite) {
          if (diff.dualElite && w >= 10) {
            if (minis.length !== 2 || !minis.includes(expectedMini[w])) {
              return { ok: false, reason: 'Wave ' + w + ' D5 expected deterministic dual commander including ' + expectedMini[w] + ', got ' + JSON.stringify(minis) };
            }
          } else if (minis.length !== 1 || minis[0] !== expectedMini[w]) {
            return { ok: false, reason: 'Wave ' + w + ' expected fixed commander ' + expectedMini[w] + ', got ' + JSON.stringify(minis) };
          }
        } else if (minis.length !== 0) {
          return { ok: false, reason: 'Unexpected mini_boss on wave ' + w + ': ' + JSON.stringify(minis) };
        }
      }
    }
    // Defeating the final second phase is required; timer completion cannot bypass a boss.
    selectedDiff = 1;
    startGame('allrounder'); __drainDirector();
    wave = 12; beginWave(); __drainDirector();
    finishWave();
    if (state !== 'wave') return { ok: false, reason: 'Boss floor allowed timer victory' };
    __defeatStoryBoss();
    const stateAfter12 = state;
    wave = 16; __primeTrueEnding(); beginWave(); __drainDirector('refuse');
    __defeatStoryBoss();
    const stateAfter16 = state;
    return { ok: true, stateAfter12, stateAfter16 };
  })()`, s);

  assert.strictEqual(climbAudit.ok, true, climbAudit.reason || "16-floor climb audit failed");
  assert(["shop", "crate", "levelup"].includes(climbAudit.stateAfter12), "Floor 12 must proceed to rewards/shop, not end the run (got " + climbAudit.stateAfter12 + ")");
  assert.strictEqual(climbAudit.stateAfter16, "end", "Completing Floor 16 must trigger final victory");
  assert.strictEqual(vm.runInContext("logErrCount", s), 0, "Zero runtime errors in Suite 1");
}

// ============================================================================
// Suite 2: V2 narrative, choices, progress, retry and preview invariants
// ============================================================================
runStoryV2Suite({ createEnv, vm, assert, ROOT, assetDimsMap });

// ============================================================================
// Suite 3: Crisp Retina battlefield pixels, frame pacing, sprite motion and render costs
// ============================================================================
{
  for (const sample of [
    { mobile: false, width: 1440, height: 900, native: 2, budget: 11200000, maxDpr: 2.25 },
    { mobile: false, width: 2560, height: 1440, native: 2, budget: 11200000, maxDpr: 2.25 },
    { mobile: true, width: 390, height: 844, native: 3, budget: 3600000, maxDpr: 1.75 },
    { mobile: true, width: 1024, height: 1366, native: 3, budget: 3600000, maxDpr: 1.75 }
  ]) {
    const { sandbox: s } = createEnv(sample.mobile, sample.width, sample.height, sample.native);
    const canvas = vm.runInContext('({ width: cv.width, height: cv.height, dpr, smoothing: ctx.imageSmoothingQuality })', s);
    // Integer backing-store dimensions can round each edge by half a pixel.
    const integerRoundingAllowance = canvas.width + canvas.height + 1;
    assert(canvas.width * canvas.height <= sample.budget + integerRoundingAllowance,
      `Battlefield pixel budget exceeded at ${sample.width}x${sample.height}@${sample.native}`);
    assert(canvas.dpr <= sample.maxDpr, `Battlefield DPR must stay bounded on ${sample.mobile ? 'touch' : 'desktop'} screens`);
    assert.strictEqual(canvas.smoothing, 'medium', 'Battlefield must use hardware-accelerated medium resampling to prevent Retina stall');
  }
  const { sandbox: s } = createEnv(false, 1440, 900, 2);
  const adaptation = vm.runInContext(`(() => {
    const initialScale = battleResolutionScale;
    for (let i = 0; i < 310; i++) recordBattleFrame(1000 / 60);
    const normalUnchanged = battleResolutionScale === initialScale;
    resetBattleFrameSample(); recordBattleFrame(180);
    for (let i = 0; i < 160; i++) recordBattleFrame(1000 / 60);
    const oneSpikeUnchanged = battleResolutionScale === initialScale;
    recordBattleFrame(500); // Hidden tab / loading stall must not poison a sample.
    for (let i = 0; i < 160; i++) recordBattleFrame(1000 / 60);
    const loadingStallUnchanged = battleResolutionScale === initialScale;

    startGame('allrounder', { mode: 'story' }); __drainDirector();
    SpireDirector.setPreferences({ textScale: 1.3 });
    const root = document.getElementById('spireNarrative');
    const snapshot = () => JSON.stringify({ world: WORLD, x: player.x, y: player.y, hp: player.hp,
      maxHp: player.maxHp, weapons: player.weapons, reading: SpireDirector.getPreferences(),
      cssTextScale: root.style.getPropertyValue('--story-text-scale') });
    const before = snapshot(), initialPixels = cv.width * cv.height;
    resetBattleFrameSample();
    for (let i = 0; i < 80; i++) recordBattleFrame(32);
    const preservesSharpness = battleResolutionScale < 1 && battleResolutionScale >= 0.76 && cv.width * cv.height < initialPixels && before === snapshot();
    resize();
    const resizeKeepsCrisp = ctx.imageSmoothingQuality === 'medium' && battleResolutionScale >= 0.76 && before === snapshot();
    for (let i = 0; i < 400; i++) recordBattleFrame(32);
    const boundedMinimum = battleResolutionScale >= 0.76 && dpr >= 1.2;

    resetBattleFrameSample(); for (let i = 0; i < 10; i++) recordBattleFrame(32);
    document.hidden = true; _advanceClock(100); loop(performance.now());
    const hiddenClearsSample = battleSampleFrames === 0 && battleSampleMs === 0;
    document.hidden = false;
    previousLoopMode = 'battle'; resetBattleFrameSample();
    for (let i = 0; i < 10; i++) recordBattleFrame(32);
    SpireDirector.replayEvent('opening.awakening'); _advanceClock(100); loop(performance.now());
    const narrativeClearsSample = battleSampleFrames === 0 && battleSampleMs === 0;
    SpireDirector.closeReplay();
    return { normalUnchanged, oneSpikeUnchanged, loadingStallUnchanged, preservesSharpness,
      resizeKeepsCrisp, boundedMinimum, hiddenClearsSample, narrativeClearsSample };
  })()`, s);
  for (const [key, value] of Object.entries(adaptation)) assert.strictEqual(value, true, 'Crisp Retina resolution invariant: ' + key);
}

{
  const { sandbox: s } = createEnv(false, 1440, 900, 2);
  const cadence = vm.runInContext(`(() => {
    const original = { update, draw, render: SpireDirector.render, active: SpireDirector.isActive,
      blocking: SpireDirector.isBlockingGameplay, state, last, framePacingRemainder, previousLoopMode };
    let updates = 0, draws = 0, elapsed = 0, mode = 'battle';
    const samples = [];
    try {
      update = dt => { updates++; elapsed += dt; };
      draw = () => { draws++; };
      SpireDirector.render = () => {};
      SpireDirector.isActive = () => mode === 'story';
      SpireDirector.isBlockingGameplay = () => mode === 'story';
      for (const hz of [60, 75, 90, 120, 144]) {
        for (mode of ['battle', 'menu', 'story']) {
          updates = draws = elapsed = 0;
          state = mode === 'menu' ? 'menu' : 'wave';
          const base = 1000;
          last = base; framePacingRemainder = 0; previousLoopMode = '';
          for (let tick = 1; tick <= hz * 2; tick++) loop(base + tick * 1000 / hz);
          samples.push({ hz, mode, updates, draws, elapsed });
        }
      }
      return samples;
    } finally {
      update = original.update; draw = original.draw;
      SpireDirector.render = original.render; SpireDirector.isActive = original.active;
      SpireDirector.isBlockingGameplay = original.blocking;
      state = original.state; last = original.last;
      framePacingRemainder = original.framePacingRemainder; previousLoopMode = original.previousLoopMode;
    }
  })()`, s);
  for (const sample of cadence) {
    if (sample.mode === 'battle') {
      assert(sample.updates >= 118 && sample.updates <= 122, `Battle cadence at ${sample.hz} Hz must stay within 60 +/- 1 updates/s; got ${sample.updates / 2}`);
      assert.strictEqual(sample.draws, sample.updates, `Battle draw/update must stay paired at ${sample.hz} Hz`);
      assert(Math.abs(sample.elapsed - 2) <= .04, `Battle simulation must preserve elapsed time at ${sample.hz} Hz; got ${sample.elapsed}s for 2s`);
    } else {
      assert.strictEqual(sample.draws, 0, `${sample.mode} must never repaint the covered battlefield at ${sample.hz} Hz`);
      const expected = sample.mode === 'story' ? 60 : 20;
      assert(Math.abs(sample.updates - expected) <= 2, `${sample.mode} must keep its intentional update budget at ${sample.hz} Hz`);
    }
  }
  const lazyMenu = vm.runInContext(`(() => {
    const roster = document.getElementById('classGrid');
    const homeLeavesRosterEmpty = menuStage === 'home' && roster.children.length === 0;
    openMenuStage('story');
    const box = document.getElementById('storyHeroShowcase');
    const image = box.querySelector('.prep-zero-portrait');
    const storyLeavesRosterEmpty = roster.children.length === 0;
    const buttons = Array.from(document.getElementById('storyDiffTabs').children);
    for (const button of buttons.slice(0, 3)) button.click();
    const imageSurvivesDifficulty = !!image && box.querySelector('.prep-zero-portrait') === image;
    openMenuStage('endless');
    const rosterBuildsOnDemand = roster.children.length === 6;
    openMenuStage('story');
    const imageSurvivesReturn = box.querySelector('.prep-zero-portrait') === image;
    return { homeLeavesRosterEmpty, storyLeavesRosterEmpty, imageSurvivesDifficulty, rosterBuildsOnDemand, imageSurvivesReturn };
  })()`, s);
  for (const [key, value] of Object.entries(lazyMenu)) assert.strictEqual(value, true, 'Lazy menu invariant: ' + key);
}

{
  const { sandbox: s, stats, gameDraws } = createEnv(false, 1440, 900, 2);
  assert(vm.runInContext("dpr >= 1.7 && dpr <= 2.25", s), "Desktop Retina battlefield must preserve crisp native DPR without blur");

  s.__battleDrawCount = () => gameDraws.length;
  const renderBudget = vm.runInContext(`(() => {
    const base = __battleDrawCount();
    _advanceClock(150); loop(performance.now());
    const menuNoDraw = __battleDrawCount() === base;
    startGame('allrounder', { mode: 'story' });
    const storyBase = __battleDrawCount();
    for (let i = 0; i < 4; i++) { _advanceClock(50); loop(performance.now()); }
    const storyNoDraw = __battleDrawCount() === storyBase;
    __drainDirector();
    const waveBase = __battleDrawCount();
    _advanceClock(20); loop(performance.now());
    const battleDraws = __battleDrawCount() > waveBase;
    const timeBeforeHidden = waveTime, drawsBeforeHidden = __battleDrawCount();
    document.hidden = true; _advanceClock(500); loop(performance.now());
    const hiddenDoesNoWork = waveTime === timeBeforeHidden && __battleDrawCount() === drawsBeforeHidden;
    document.hidden = false;
    pauseGame(); const paused = __battleDrawCount();
    _advanceClock(150); loop(performance.now());
    const pauseNoDraw = __battleDrawCount() === paused;
    resumeGame();
    return { menuNoDraw, storyNoDraw, battleDraws, hiddenDoesNoWork, pauseNoDraw };
  })()`, s);
  for (const [key, value] of Object.entries(renderBudget)) assert.strictEqual(value, true, 'Frame work budget: ' + key);

  const actionAudit = vm.runInContext(`(() => {
    startGame('brawler'); // Jinyu
    __drainDirector();
    const sheetsValid = ['zero', 'jinyu', 'astria', 'jialan', 'qingyu', 'eclipse'].every(k => {
      const shNorm = SpireAssets.getHeroSheet(k, false);
      const shFlash = SpireAssets.getHeroSheet(k, true);
      return shNorm && shFlash && shNorm.canvas && shFlash.canvas &&
        shNorm.canvas.width === 1024 && shNorm.canvas.height === 256 &&
        shFlash.canvas.width === 1024 && shFlash.canvas.height === 256 &&
        shNorm.cellW === 256 && shNorm.frames === 4;
    });

    // Test hero idle -> running stride -> sudden turn flip interpolation -> weapon attack pose Frame 3 + lunge
    player.weapons = []; enemies = []; trees = []; player._atkPoseT = 0;
    keys['a'] = true;
    for (let i = 0; i < 8; i++) { _advanceClock(40); update(0.04); draw(); }
    const flipLeft = player._visFlip;
    keys['a'] = false; keys['d'] = true;
    _advanceClock(20); update(0.02); draw(); // mid-turn smooth flip interpolation
    const midTurnFlip = player._visFlip;
    for (let i = 0; i < 12; i++) { _advanceClock(40); update(0.04); draw(); }
    keys['d'] = false;

    // Trigger melee & ranged attacks against a Boss -> must set _atkPoseT > 0 and render Frame 3 (sx = 768)
    const boss = createEnemy(player.x + 95, player.y, 'boss', 'butcher');
    boss.hp = 99999; boss.maxHp = 99999;
    player.weapons = [makeWeapon('katana', 3), makeWeapon('pistol', 3)];
    player.weapons[0].cd = 0; player.weapons[1].cd = 0;
    _advanceClock(20); update(0.02);
    const atkPoseTriggered = (player._atkPoseT || 0) > 0.05;
    draw();

    // Test Boss windup crouch & 3-ghost dash trail rendering across all 6 classes
    boss.lockedAim = 0; boss.dashT = 0.25;
    _advanceClock(35); draw();
    boss.lockedAim = undefined; boss.dashing = true; boss.vx = 520; boss.vy = 0;
    for (let i = 0; i < 6; i++) { _advanceClock(35); player.hp = player.maxHp; update(0.035); draw(); }

    // Test Soul Dash across all 6 classes + enemy projectile slicing + 4 Act Bosses' Signature Named Skills
    let dashArtsTested = 0;
    for (const cls of CLASSES.map(c => c.id)) {
      startGame(cls);
      __drainDirector();
      player.dashCd = 0;
      player.dashT = 0;
      keys['d'] = true;
      // Place an enemy bullet directly in front to verify dash projectile-slicing
      eBullets.push({ x: player.x + 28, y: player.y, vx: -120, vy: 0, dmg: 5, r: 5, color: '#ff3b6b' });
      const ebBefore = eBullets.length;
      const fired = triggerSoulDash();
      if (!fired) return { ok: false, reason: 'triggerSoulDash failed for ' + cls };
      for (let k = 0; k < 5; k++) { _advanceClock(35); update(0.035); draw(); }
      if (eBullets.length >= ebBefore) return { ok: false, reason: 'Soul Dash did not slice enemy projectile for ' + cls };
      keys['d'] = false;
      dashArtsTested++;
    }

    // Verify all 4 Fixed Act Bosses execute Signature Named Skills (windup telegraph + castLabel + burst execution)
    let sigBossesVerified = 0;
    for (const bVar of ['butcher', 'frost_queen', 'void_weaver', 'solar_seraph']) {
      enemies.length = 0; eBullets.length = 0; hazards.length = 0;
      const b = createEnemy(player.x + 190, player.y, 'boss', bVar);
      b.hp = 99999; b.maxHp = 99999;
      b.sigSkillT = 0.02;
      b.dashT = 9.0;
      _advanceClock(40); update(0.04); // enters sigWindupT
      if (!(b.sigWindupT > 0 && b.castLabel)) {
        return { ok: false, reason: 'Boss ' + bVar + ' did not enter signature skill windup' };
      }
      hudAcc = 1.0; update(0.02); draw(); // renders geometric telegraph + overhead badge + #bossCastSub
      // Advance past windup (0.88s) so signature pattern unleashes
      for (let k = 0; k < 22; k++) { _advanceClock(45); update(0.045); draw(); }
      if (b.sigWindupT !== 0) {
        return { ok: false, reason: 'Boss ' + bVar + ' signature windup did not finish cleanly' };
      }
      sigBossesVerified++;
    }

    // Verify 16x2 Boss Phase 1 & Phase 2 Cutout Portraits, 33% rates, 4.0s + 0.85s dissolve banner & 100% guaranteed Phase 2 portrait
    const portraitKeys = Object.keys(BOSS_PORTRAIT_DATA || {});
    const all32PortraitsReady = portraitKeys.length === 16 && portraitKeys.every(k => {
      const p1 = getBossAnimePortrait(k, false);
      const p2 = getBossAnimePortrait(k, true);
      return p1 && p2 && p1 !== p2 && p1.width === 440 && p1.height === 516 && p2.width === 440 && p2.height === 516;
    });
    const ratesValid = (
      RARE_PORTRAIT_RATE === 0.33 &&
      PHASE2_AWAKEN_RATE === 0.30 &&
      getPhase2AwakenRate(DIFFS[1]) === 0.30 &&
      getPhase2AwakenRate(DIFFS[2]) === 0.35 &&
      getPhase2AwakenRate(DIFFS[3]) === 0.40 &&
      getPhase2AwakenRate(DIFFS[4]) === 0.45 &&
      getPhase2AwakenRate(DIFFS[5]) === 0.50 &&
      BOSS_CUTSCENE_SHOW_SEC === 4.0
    );

    // Render Phase 1 & Phase 2 cut-in banners across entrance, 4s hold, and 0.85s dissolve fade-out
    endlessMode = true;
    startBossCutscene('final_boss', 'butcher', '绯红断刃剑姬 · 烬羽', '🕯️ 第 4 层守誓之主', '⚔️ 贴近风眼安全');
    const p1Dur = bossCutscene ? bossCutscene.maxT : 0;
    for (const stepDt of [0.10, 2.00, 2.30]) { _advanceClock(stepDt * 1000); update(stepDt); draw(); }
    bossCutscene = null;

    // Trigger Phase 2 in Endless Mode -> must 100% guarantee immediate mythic_phase2 portrait banner + +50% HP + +30% DMG + ZERO extra time inflation!
    endlessMode = true;
    player.waveMythicAwakened = false;
    const preP2WaveTime = waveTime;
    const p2Boss = createEnemy(player.x + 150, player.y, 'boss', 'frost_queen');
    const p1Hp = p2Boss.maxHp, p1Dmg = p2Boss.dmg;
    p2Boss.canPhase2 = true;
    hurtEnemy(p2Boss, p2Boss.maxHp + 99999, true);
    const p2StatsOk = (p2Boss.maxHp === Math.max(450, Math.round(p1Hp * 1.50)) && p2Boss.hp === p2Boss.maxHp && p2Boss.dmg === Math.round(p1Dmg * 1.30) && waveTime === preP2WaveTime);
    const p2Guaranteed = !!(p2StatsOk && bossCutscene && bossCutscene.mode === 'mythic_phase2' && bossCutscene.variant === 'frost_queen' && bossCutscene.maxT >= 4.8 && bossCutscene.maxT <= 4.9);
    for (const stepDt of [0.12, 2.00, 2.30]) { _advanceClock(stepDt * 1000); update(stepDt); draw(); }
    bossCutscene = null;

    return { ok: true, sheetsValid, flipLeft, midTurnFlip, atkPoseTriggered, floorScale: curFloorScale, dashArtsTested, sigBossesVerified, all32PortraitsReady, ratesValid, p1Dur, p2Guaranteed };
  })()`, s);

  assert.strictEqual(actionAudit.ok, true, actionAudit.reason || "Action & Boss Signature audit failed");
  assert.strictEqual(actionAudit.sheetsValid, true, "All 6 1024x256 4-frame hero sprite sheets (normal + hit-flash) must pre-bake cleanly");
  assert(actionAudit.flipLeft < -0.5 && Math.abs(actionAudit.midTurnFlip) < 0.95, "Hero turn-around must smoothly interpolate _visFlip instead of snapping");
  assert.strictEqual(actionAudit.atkPoseTriggered, true, "Weapon fire/slash must trigger hero _atkPoseT attack animation pose");
  assert.strictEqual(actionAudit.floorScale, 1.0, "Desktop floor texture must bake at crisp 1.0x native resolution");
  assert.strictEqual(actionAudit.dashArtsTested, 6, "All 6 heroes must execute their signature Soul Dash arts & slice projectiles");
  assert.strictEqual(actionAudit.sigBossesVerified, 4, "All 4 Fixed Act Bosses must telegraph and unleash their signature named skills");
  assert.strictEqual(actionAudit.all32PortraitsReady, true, "All 16 Bosses must provide distinct 440x516 Phase 1 & Phase 2 cutout portraits (32 total)");
  assert.strictEqual(actionAudit.ratesValid, true, "Phase 1 portrait rate must be 33% and Phase 2 awaken rate must scale D1=30% -> D5=50%, with 4.0s display");
  assert(actionAudit.p1Dur >= 4.8 && actionAudit.p1Dur <= 4.9, "Boss portrait cut-in banner must display for 4.0s plus smooth fade-out (~4.85s total)");
  assert.strictEqual(actionAudit.p2Guaranteed, true, "Triggering Phase 2 awakening must 100% guarantee displaying the Phase 2 portrait banner");

  // Confirm 4-frame sprite sheet slicing (sw=256, sh=256 across sx = 0, 256, 512, 768) actually executed on game canvas
  const seenFrameSx = new Set(
    gameDraws
      .filter(d => d.img && d.img.width === 1024 && d.img.height === 256 && d.args.length === 8 && d.args[2] === 256 && d.args[3] === 256)
      .map(d => d.args[0])
  );
  assert(seenFrameSx.has(768) && seenFrameSx.size >= 3, `Hero/Boss 4-frame sheet must slice distinct frames including attack frame sx=768 (saw sx=${JSON.stringify([...seenFrameSx])})`);
  assert.strictEqual(stats.radialGradients, 0, "Combat draw() must create ZERO per-frame radial gradients");
  assert.strictEqual(stats.shadowBlurs, 0, "Combat draw() must use ZERO expensive shadowBlur");
  assert.strictEqual(vm.runInContext("logErrCount", s), 0, "Zero runtime errors in Suite 3");
}

// ============================================================================
// Suite 4: Core Gameplay Systems + Main Screen Mode Split (Story=Protagonist Only / Endless=All Heroes) + Mobile Portrait & Landscape AVG/Cutscene
// ============================================================================
{
  const { sandbox: s } = createEnv(true, 390, 844, 3);
  const mobileInput = vm.runInContext(`(() => {
    startGame('allrounder', { mode: 'endless' });
    const touch = (id, x, y, target = cv) => ({ identifier: id, clientX: x, clientY: y, target });
    const emit = (type, touches, changedTouches = touches) => cv.dispatch(type, { touches, changedTouches });
    let finger = touch(11, 60, 650);
    emit('touchstart', [finger]); finger = touch(11, 105, 650); emit('touchmove', [finger]);
    const singleMoves = joy.active && joy.mag > .8 && joy.dx > .9;
    const zoomBeforeDash = camZoom;
    const dashFinger = touch(22, 340, 740, document.getElementById('dashTouchBtn'));
    emit('touchmove', [finger, dashFinger], [finger]);
    player.dashCd = player.dashT = 0; const dashed = triggerSoulDash();
    const secondHandDash = dashed && joy.active && joy.mag > 0 && camZoom === zoomBeforeDash;
    emit('touchcancel', []);
    const canceled = !joy.active && joy.mag === 0 && joy.dx === 0 && joy.dy === 0;

    finger = touch(31, 90, 600); emit('touchstart', [finger]);
    let second = touch(32, 230, 600); emit('touchstart', [finger, second], [second]);
    const zoomBeforePinch = camZoom;
    second = touch(32, 260, 600); emit('touchmove', [finger, second]);
    second = touch(32, 295, 600); emit('touchmove', [finger, second]);
    const pinchOnlyZooms = camZoom > zoomBeforePinch && !joy.active && joy.mag === 0;
    emit('touchend', [finger], [second]);
    const pinchReleaseDoesNotDrift = joy.mag === 0;
    emit('touchend', [], [finger]);
    finger = touch(41, 70, 650); emit('touchstart', [finger]); emit('touchmove', [touch(41, 110, 650)]);
    const freshTouchResumes = joy.active && joy.mag > 0;
    window.innerWidth = 844; window.innerHeight = 390; window.dispatch('resize'); _flushAnimationFrame();
    const rotateClearsJoystick = !joy.active && joy.mag === 0;

    const wheelLeavesZoom = target => { userZoomed = false; const before = camZoom; window.dispatch('wheel', { deltaY: 120, target }); return camZoom === before && !userZoomed; };
    const outsideBattlefieldDoesNotZoom = wheelLeavesZoom(document.body);
    userZoomed = false; const battleZoom = camZoom; window.dispatch('wheel', { deltaY: 120, target: cv });
    const battlefieldCanZoom = camZoom !== battleZoom && userZoomed;
    openSpireSettings();
    const settingsDoNotZoom = wheelLeavesZoom(document.getElementById('presentationBody'));
    const pauseDoesNotZoom = wheelLeavesZoom(cv);
    closePresentationModal(); resumeGame();
    SpireDirector.replayEvent('opening.awakening');
    const beforeStoryTouch = camZoom;
    emit('touchstart', [touch(51, 50, 200)]); emit('touchmove', [touch(51, 95, 200)]);
    emit('touchstart', [touch(51, 95, 200), touch(52, 160, 200)]);
    emit('touchmove', [touch(51, 95, 200), touch(52, 260, 200)]);
    const storyOwnsInput = !joy.active && joy.mag === 0 && camZoom === beforeStoryTouch && wheelLeavesZoom(cv);
    SpireDirector.closeReplay(); showStart();
    const menuDoesNotZoom = wheelLeavesZoom(cv);
    return { singleMoves, secondHandDash, canceled, pinchOnlyZooms, pinchReleaseDoesNotDrift,
      freshTouchResumes, rotateClearsJoystick, outsideBattlefieldDoesNotZoom, battlefieldCanZoom,
      settingsDoNotZoom, pauseDoesNotZoom, storyOwnsInput, menuDoesNotZoom };
  })()`, s);
  for (const [key, value] of Object.entries(mobileInput)) assert.strictEqual(value, true, 'Mobile input invariant: ' + key);
}

{
  const { sandbox: s } = createEnv(true, 390, 844, 3);
  const rotation = vm.runInContext(`(() => {
    startGame('allrounder', { mode: 'endless' });
    enemies = [{ x: 210, y: 330, lockedAim: .7, dashWarnLen: 280, dashStartX: 210, dashStartY: 330 }];
    bullets = [{ x: 230, y: 350, vx: 14, vy: -3 }]; eBullets = [{ x: 260, y: 340, vx: -9, vy: 2 }];
    mines = [{ x: 270, y: 360 }]; rings = [{ x: 300, y: 370, r: 60 }];
    beams = [{ x1: 100, y1: 200, x2: 220, y2: 300 }]; portals = [{ x: 400, y: 420 }];
    const snapshot = () => JSON.stringify({ world: WORLD, player: { x: player.x, y: player.y, hp: player.hp, weapons: player.weapons },
      enemies, bullets, eBullets, mines, rings, beams, portals, hazards, turrets, drops, trees, relics, sporeZones, spawns });
    const before = snapshot(), portraitWorld = WORLD.w < WORLD.h;
    window.innerWidth = 844; window.innerHeight = 390; window.dispatch('resize'); _flushAnimationFrame();
    const landscapeKeepsCombat = snapshot() === before && uiMode === 'mobile-landscape' && viewW === 844 && viewH === 390;
    window.innerWidth = 390; window.innerHeight = 740; window.dispatch('resize'); _flushAnimationFrame();
    const browserChromeKeepsCombat = snapshot() === before && uiMode === 'mobile-portrait';
    window.innerWidth = 844; window.innerHeight = 390; window.dispatch('resize'); _flushAnimationFrame();
    startGame('allrounder', { mode: 'endless' });
    const freshRunUsesOrientation = WORLD.w > WORLD.h;
    return { portraitWorld, landscapeKeepsCombat, browserChromeKeepsCombat, freshRunUsesOrientation };
  })()`, s);
  for (const [key, value] of Object.entries(rotation)) assert.strictEqual(value, true, 'Mobile rotation invariant: ' + key);
}

// Protagonist Zero 3-Outfit First-Entry Ritual & Uncropped Portrait / Sheet Sync Suite
{
  const { sandbox: s, stats } = createEnv(false, 1440, 900, 2);
  s.window.dispatch("pointerdown", {});

  const outfitCheck = vm.runInContext(`(() => {
    const initialUnchosen = hasChosenZeroOutfit() === false;
    handleStoryPortalClick();
    const modalOpenedFirstTime = !document.getElementById('outfitModal').classList.contains('hidden') && menuStage === 'home';
    const gridCount = document.getElementById('outfitModalGrid').children.length;

    const sheetChecks = {};
    for (const oid of ['witch', 'crimson', 'astral', 'default']) {
      selectZeroOutfitFromUI(oid, false);
      const sh = SpireAssets.getHeroSheet('allrounder', false);
      const sp = SpireAssets.getHeroSprite('allrounder', false);
      sheetChecks[oid] = !!(sh && sh.cellW === 256 && sh.cellH === 256 && sh.frames === 4 && sp && sp.w > 64 && getActiveZeroOutfitId() === oid);
    }
    selectZeroOutfitFromUI('witch', false);
    confirmZeroOutfitModal();
    const confirmedToStory = hasChosenZeroOutfit() === true &&
      document.getElementById('outfitModal').classList.contains('hidden') &&
      menuStage === 'story';
    const storyPortNode1 = document.querySelector('#storyHeroShowcase .prep-zero-portrait');
    const storyPortWitchOk = !!(storyPortNode1 && storyPortNode1.src.includes('port_zero_witch'));
    selectZeroOutfitFromUI('astral', true);
    const storyPortNode2 = document.querySelector('#storyHeroShowcase .prep-zero-portrait');
    const lazyNodePreserved = (storyPortNode1 === storyPortNode2 && storyPortNode2.src.includes('port_zero_astral'));

    openMenuStage('home');
    handleStoryPortalClick();
    const secondClickDirect = menuStage === 'story' && document.getElementById('outfitModal').classList.contains('hidden');

    selectZeroOutfitFromUI('crimson', true);
    startStoryMode();
    for (let guard = 0; guard < 40 && SpireDirector.isActive(); guard++) {
      const elL = document.querySelector('.story-portrait-left');
      if (elL && elL.src && elL.src.includes('port_zero_')) break;
      SpireDirector.advanceOrSkip(true);
    }
    __drainDirector();
    if (!(document.querySelector('.story-portrait-left') && document.querySelector('.story-portrait-left').src)) {
      SpireDirector.onShopEntered(1);
      for (let guard = 0; guard < 20 && SpireDirector.isActive(); guard++) {
        const elL = document.querySelector('.story-portrait-left');
        if (elL && elL.src && elL.src.includes('port_zero_')) break;
        SpireDirector.advanceOrSkip(true);
      }
      __drainDirector();
    }
    const avgLeftEl = document.querySelector('.story-portrait-left');
    const avgLeftSrc = (avgLeftEl && avgLeftEl.src) || '';
    const avgOutfitSynced = avgLeftSrc.includes('port_zero_crimson');
    const playerOutfitSynced = (player.outfit === 'crimson');
    draw();

    return {
      initialUnchosen, modalOpenedFirstTime, gridCount,
      allSheetsOk: Object.values(sheetChecks).every(Boolean),
      confirmedToStory, storyPortWitchOk, lazyNodePreserved, secondClickDirect,
      avgOutfitSynced, playerOutfitSynced
    };
  })()`, s);

  assert.strictEqual(outfitCheck.initialUnchosen, true, "Fresh profile must start with unchosen outfit ritual flag");
  assert.strictEqual(outfitCheck.modalOpenedFirstTime, true, "First click on Story Portal must open 3-outfit selection modal");
  assert.strictEqual(outfitCheck.gridCount, 3, "Outfit modal must display the 3 bespoke protagonist outfits");
  assert.strictEqual(outfitCheck.allSheetsOk, true, "All 3 protagonist outfits + classic white must resolve crisp 1024x256 4-frame sheets & sprites");
  assert.strictEqual(outfitCheck.confirmedToStory, true, "Confirming outfit modal must persist selection and transition to Story preparation");
  assert.strictEqual(outfitCheck.storyPortWitchOk, true, "Story preparation portrait must reflect chosen Witch outfit");
  assert.strictEqual(outfitCheck.lazyNodePreserved, true, "Switching outfits must update portrait src in-place without destroying DOM node");
  assert.strictEqual(outfitCheck.secondClickDirect, true, "Subsequent Story Portal clicks must enter Story preparation directly");
  assert.strictEqual(outfitCheck.avgOutfitSynced, true, "AVG story dialogue portrait must dynamically match chosen protagonist outfit");
  assert.strictEqual(outfitCheck.playerOutfitSynced, true, "Active player entity must carry chosen outfit ID");
  const baseCssText = fs.readFileSync(path.join(ROOT, "styles/base.css"), "utf8");
  assert(/\.outfit-pick-portrait[\s\S]{0,180}object-fit:\s*contain/.test(baseCssText), "Outfit modal portrait CSS must style .outfit-pick-portrait with object-fit: contain so full heads & hats never crop");
  assert.strictEqual(stats.radialGradients, 0, "Outfit suite must create ZERO per-frame radial gradients");
  assert.strictEqual(stats.shadowBlurs, 0, "Outfit suite must use ZERO shadowBlur");
  assert.strictEqual(vm.runInContext("logErrCount", s), 0, "Zero runtime errors in Outfit suite");
}

{
  const { sandbox: s } = createEnv(true, 390, 844, 3);
  const webview = vm.runInContext(`(() => {
    startGame('allrounder', { mode: 'endless' });
    const world = JSON.stringify(WORLD), px = player.x, py = player.y;
    const vv = window.visualViewport;
    vv.width = 390; vv.height = 611;
    vv.dispatch('resize'); vv.dispatch('resize'); _flushAnimationFrame();
    const visibleViewportApplied = viewW === 390 && viewH === 611 &&
      document.documentElement.style.getPropertyValue('--app-height') === '611px';
    const viewportKeepsArena = JSON.stringify(WORLD) === world && player.x === px && player.y === py;
    vv.scale = 1.5; vv.width = 260; vv.height = 410; vv.dispatch('resize'); _flushAnimationFrame();
    const browserPinchDoesNotResizeGame = viewW === window.innerWidth && viewH === window.innerHeight;
    vv.scale = 1; vv.width = 390; vv.height = 844; vv.dispatch('resize'); _flushAnimationFrame();
    const finger = { identifier: 71, clientX: 60, clientY: 650, target: cv };
    cv.dispatch('touchstart', { touches: [finger], changedTouches: [finger] });
    cv.dispatch('touchmove', { touches: [{ ...finger, clientX: 110 }], changedTouches: [{ ...finger, clientX: 110 }] });
    keys.w = true; document.hidden = true; document.dispatch('visibilitychange', {});
    const hiddenClearsInput = state === 'paused' && !joy.active && joy.mag === 0 && !keys.w;
    document.hidden = false; document.dispatch('visibilitychange', {});
    const foregroundRemainsPaused = state === 'paused' && !joy.active;
    resumeGame();
    const resumeIsNeutral = state === 'wave' && !joy.active && joy.mag === 0;
    cv.dispatch('touchstart', { touches: [finger], changedTouches: [finger] });
    cv.dispatch('touchmove', { touches: [{ ...finger, clientX: 110 }], changedTouches: [{ ...finger, clientX: 110 }] });
    const freshTouchWorks = joy.active && joy.mag > 0;
    return { visibleViewportApplied, viewportKeepsArena, browserPinchDoesNotResizeGame,
      hiddenClearsInput, foregroundRemainsPaused, resumeIsNeutral, freshTouchWorks };
  })()`, s);
  for (const [key, value] of Object.entries(webview)) assert.strictEqual(value, true, 'Mobile WebView invariant: ' + key);
}

{
  const { sandbox: s, els, stats, directorDraws: mobDirDraws } = createEnv(true, 390, 844, 3);
  s.window.dispatch("pointerdown", {});

  const coreCheck = vm.runInContext(`(() => {
    // 0) Verify Main Screen -> Story Mode locks strictly to protagonist ('allrounder'), Endless Mode allows all 6 heroes
    const bootOnHome = menuStage === 'home' && !document.getElementById('menuHomeView').classList.contains('hidden');
    openMenuStage('story');
    const storyViewShown = menuStage === 'story' && !document.getElementById('menuStoryView').classList.contains('hidden');
    // Attempt to pass non-protagonist into story mode -> must clamp strictly to 'allrounder'
    startGame('brawler', { mode: 'story' });
    const storyLockedToZero = (player.cls === 'allrounder' && endlessMode === false);

    // Render Mobile Portrait (390x844) Opening Cutscene -> Act I Curtain -> Floor 1 AVG Dialogue
    for (let i = 0; i < 8; i++) { SpireDirector.update(0.12); SpireDirector.render(); }
    SpireDirector.advanceOrSkip(true); // -> Act I Curtain on 390x844 portrait
    SpireDirector.update(0.15); SpireDirector.render();
    SpireDirector.advanceOrSkip(true); // -> Floor 1 AVG Dialogue on 390x844 portrait
    for (let i = 0; i < 8; i++) { SpireDirector.update(0.10); SpireDirector.render(); }
    __drainDirector();

    // Switch to Mobile Landscape (844x390) and verify AVG & Cutscene render cleanly without errors
    window.innerWidth = 844; window.innerHeight = 390;
    resize();
    replayOpeningCutscene();
    SpireDirector.update(0.15); SpireDirector.render();
    SpireDirector.advanceOrSkip(true);
    window.innerWidth = 390; window.innerHeight = 844;
    resize();

    // Return to Start Menu -> must reset to Main Title Screen ('home'), then enter Endless Mode and pick other heroes
    showStart();
    const returnedHome = menuStage === 'home';
    openMenuStage('endless');
    const endlessRosterCount = document.getElementById('classGrid').children.length;
    const diffBtnsCount = document.getElementById('diffTabs').children.length;
    const sceneBtnsCount = document.getElementById('sceneTabs').children.length;

    // v2.7.0: Verify multi-level Hero Dossier Tabs ('traits' <-> 'combat') & Prep Tabs ('diff' <-> 'scene')
    setHeroDossierTab('combat');
    const combatHtmlOk = document.getElementById('endlessHeroShowcase').innerHTML.includes('STARTING ARMAMENTS');
    setHeroDossierTab('traits');
    const traitsHtmlOk = document.getElementById('endlessHeroShowcase').innerHTML.includes('trait-chip-grid');

    setEndlessPrepTab('scene');
    const scenePaneShown = !document.getElementById('endlessScenePane').classList.contains('hidden') &&
      document.getElementById('endlessDiffPane').classList.contains('hidden');
    setEndlessPrepTab('diff');
    const diffPaneRestored = !document.getElementById('endlessDiffPane').classList.contains('hidden') &&
      document.getElementById('endlessScenePane').classList.contains('hidden');

    // v2.7.0: Verify keyboard 1..6 & ArrowRight character tab switching in Endless Mode
    window.dispatch('keydown', { key: '3', preventDefault() {} });
    const keyDigitHero = selectedEndlessCls;
    window.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });
    const keyArrowHero = selectedEndlessCls;

    selectEndlessHero('ranger');
    startEndlessMode();
    const endlessRangerOk = (player.cls === 'ranger' && endlessMode === true && !SpireDirector.isBlockingGameplay());
    openShop(true);
    const endlessShopTitle = document.getElementById('shopTitle').textContent;

    // 1) Real Uncapped Damage (No Anti-Oneshot Lock) & Zero Player Invuln
    wave = 4; beginWave();
    player.maxHp = 100; player.hp = 100; player.armor = 0; player.dodge = 0; player.shield = 0; player.invuln = 0;
    enemies.length = 0; // ensure no closeGuard triggers during pure hit test
    hurtPlayer(65);
    const hpAfterBossNuke = player.hp;
    const invulnAfterHit = player.invuln;
    hurtPlayer(10);
    const consecutiveHitRegistered = player.hp < hpAfterBossNuke;

    // 2) Codex all 5 tabs render cleanly with 6 heroes, 4 Spire scenes, 32 weapons, 75 items
    openCodex('weapons'); const wCnt = document.getElementById('codexGrid').children.length;
    setCodexTab('items'); const iCnt = document.getElementById('codexGrid').children.length;
    setCodexTab('heroes'); const hCnt = document.getElementById('codexGrid').children.length;
    setCodexTab('monsters'); const mCnt = document.getElementById('codexGrid').children.length;
    setCodexTab('world'); setCodexFilter('scene'); const sCnt = document.getElementById('codexGrid').children.length;
    closeCodex();

    // 3) Death Wave-Retry on Story Mode Floor 8 restores exact Floor 8 Boss ('frost_queen') & pre-wave state
    selectedDiff = 2;
    SpireSave.clear(); // This fixture starts a fresh run; saved-run confirmation is tested separately.
    startStoryMode();
    __drainDirector();
    player.mats = 88;
    wave = 8; beginWave();
    __drainDirector();
    const preHp = player.maxHp;
    player.mats += 50;
    player.dodge = 0; player.armor = 0; player.shield = 0; player.invuln = 0;
    // Deal 4 consecutive hits without needing to clear invuln manually (zero i-frames!)
    for (let k = 0; k < 4; k++) { hurtPlayer(999); }
    __drainDirector();
    const diedCleanly = state === 'end';
    retryFailedWave();
    __drainDirector();
    for (let k = 0; k < 25; k++) { pendingBossCutscene = null; bossCutscene = null; update(0.05); }
    pendingBossCutscene = null;
    bossCutscene = null;
    draw();
    const magCircleDrawn = typeof player._visMagR === 'number' && player._visMagR >= 120;
    const retryBoss = enemies.find(e => e.type === 'boss');
    const retryOk = state === 'wave' && wave === 8 && player.cls === 'allrounder' && !endlessMode && player.mats === 88 && player.hp === preHp && retryBoss && retryBoss.variant === 'frost_queen' && magCircleDrawn;

    // 4) Single terrain element per map (including Boss terrain skills)
    let singleTerrainOk = true;
    for (const sid of ['foundry', 'glacier', 'wasteland', 'desert']) {
      curScene = SCENES.find(sc => sc.id === sid) || SCENES[0];
      spawnArenaTerrains();
      spawnBossTerrain('lava', 1200, 1200);
      spawnBossTerrain('swamp', 1350, 1350);
      const kinds = new Set(terrains.map(t => t.kind));
      if (terrains.length === 0 || kinds.size !== 1) singleTerrainOk = false;
    }

    // 5) Reworked Frost Terrain (D1 baseline unchanged): 5s progressive slow -> 1s freeze -> thaw; 1s exit grace; monster -20% slow & never frozen
    selectedDiff = 1;
    diff = DIFFS[1];
    endlessMode = true;
    selectedScene = 'glacier';
    wave = 2;
    beginWave();
    curScene = SCENES.find(sc => sc.id === 'glacier') || curScene;
    player.weapons = [];
    player.noSlow = false;
    player.maxHp = 500; player.hp = 500;
    player.frostGauge = 0; player.frostLeaveGrace = 0; player.iceFreezeT = 0; player.frostThawImmT = 0;
    enemies.length = 0; eBullets.length = 0; bullets.length = 0; spawns.length = 0;
    terrains.length = 0;
    terrains.push(ensureTerrainGeometry({ kind: 'ice_sheet', shape: 'square_slab', x: player.x, y: player.y, r: 220, rot: 0, pulse: 0 }));
    const iceMob = createEnemy(player.x + 36, player.y, 'chaser');
    iceMob.hp = 99999; iceMob.maxHp = 99999; iceMob.dmg = 0;
    diff = DIFFS[1]; selectedDiff = 1;
    for (let k = 0; k < 50; k++) {
      spawnAcc = 99;
      iceMob.x = player.x + 36; iceMob.y = player.y;
      update(0.05);
    }
    const midGauge = player.frostGauge;
    // On D1 (4.0s trigger -> fillRate = 1.25/s), 2.5s accumulates 3.125/5.00
    const midSlowOk = midGauge > 2.95 && midGauge < 3.30 && player.terrainSpdMul < 0.90 && player.terrainSpdMul >= 0.80 && player.iceFreezeT === 0;
    const mobSlow20Ok = Math.abs((iceMob._terrainSpdMul || 1) - 0.80) < 0.001 && iceMob.freezeT === 0;
    // Leave terrain: 0.8s within 1s grace must hold frostGauge; +0.6s after grace must decay
    terrains.length = 0;
    for (let k = 0; k < 16; k++) { spawnAcc = 99; update(0.05); }
    const graceHeldOk = Math.abs(player.frostGauge - midGauge) < 0.02;
    for (let k = 0; k < 12; k++) { spawnAcc = 99; update(0.05); }
    const decayAfterGraceOk = player.frostGauge < midGauge - 0.45;
    // Accumulate on D1 (4.0s): max slow right before 5.0 gauge is strictly capped at -20% (>= 0.80) -> freeze 1.0s -> thaw
    terrains.push(ensureTerrainGeometry({ kind: 'ice_sheet', shape: 'square_slab', x: player.x, y: player.y, r: 220, rot: 0, pulse: 0 }));
    player.frostGauge = 4.90;
    spawnAcc = 99; update(0.05);
    const maxSlowCap20Ok = player.iceFreezeT === 0 && player.terrainSpdMul >= 0.80 && player.terrainSpdMul <= 0.81;
    for (let k = 0; k < 3; k++) { spawnAcc = 99; update(0.05); }
    const frozeAtD1Ok = maxSlowCap20Ok && player.iceFreezeT > 0.80 && player.frostGauge === 0;
    draw();
    terrains.length = 0;
    for (let k = 0; k < 28; k++) { spawnAcc = 99; update(0.05); }
    const thawedAfter1sOk = player.iceFreezeT === 0;
    // Verify D1=4.0s..D5=2.0s ladder & D5 freezes in 2.0s (40 * 0.05s)
    const iceLadderOk = (
      getIceFreezeTriggerSec(DIFFS[1]) === 4.0 &&
      getIceFreezeTriggerSec(DIFFS[2]) === 3.5 &&
      getIceFreezeTriggerSec(DIFFS[3]) === 3.0 &&
      getIceFreezeTriggerSec(DIFFS[4]) === 2.5 &&
      getIceFreezeTriggerSec(DIFFS[5]) === 2.0
    );
    diff = DIFFS[5]; selectedDiff = 5;
    player.frostGauge = 0; player.frostLeaveGrace = 0; player.iceFreezeT = 0; player.frostThawImmT = 0;
    terrains.push(ensureTerrainGeometry({ kind: 'ice_sheet', shape: 'square_slab', x: player.x, y: player.y, r: 220, rot: 0, pulse: 0 }));
    for (let k = 0; k < 41; k++) { spawnAcc = 99; update(0.05); }
    const frozeAtD5In2sOk = player.iceFreezeT > 1.0 && player.frostGauge === 0;
    terrains.length = 0; player.iceFreezeT = 0;
    diff = DIFFS[1]; selectedDiff = 1;
    const frostTerrainOk = midSlowOk && mobSlow20Ok && graceHeldOk && decayAfterGraceOk && frozeAtD1Ok && thawedAfter1sOk && iceLadderOk && frozeAtD5In2sOk;

    // 6) Boss Venom-Spray VFX + Hidden Phase-2 Exclusive Skill
    endlessMode = true;
    wave = 12;
    beginWave();
    for (let k = 0; k < 20; k++) { pendingBossCutscene = null; bossCutscene = null; update(0.05); }
    pendingBossCutscene = null;
    bossCutscene = null;
    const vBoss = enemies.find(e => e.type === 'boss');
    vBoss.variant = 'plague_empress';
    vBoss.hp = 999999; vBoss.maxHp = 999999;
    vBoss.mythicPhase2 = false;
    vBoss.venomCd = 0.02;
    player.maxHp = 9999; player.hp = 9999;
    let sawVenomSpray = false, sawP2Twin = false;
    for (let k = 0; k < 30; k++) {
      update(0.05);
      if (vBoss.venomBreathT > 0) sawVenomSpray = true;
      draw();
    }
    vBoss.venomBreathT = 0; vBoss.venomWindupT = 0; vBoss.venomCd = 99;
    vBoss.mythicPhase2 = true;
    vBoss.p2SkillT = 0.02;
    for (let k = 0; k < 30; k++) {
      update(0.05);
      if (vBoss.venomTwin === true && vBoss.venomBreathT > 0) sawP2Twin = true;
      draw();
    }
    const fq = createEnemy(player.x + 150, player.y, 'boss', 'frost_queen');
    fq.hp = 999999; fq.maxHp = 999999;
    fq.beamSweepQuad = true; fq.beamWindupMax = 0.20; fq.beamWindupT = 0.10; fq.beamSweepMaxT = 1.80; fq.beamSweepA = 0;
    draw();
    update(0.12); // finishes windup -> activates beamSweepT
    const aStart = fq.beamSweepA;
    update(0.50);
    const quadRotDelta = fq.beamSweepA - aStart;
    if (!(fq.beamSweepT > 0 && quadRotDelta > 0.15 && quadRotDelta <= 0.30)) {
      return { ok: false, reason: 'Frost Queen quad cross beam rotates too fast for melee: delta=' + quadRotDelta };
    }
    const bossVenomAndP2Ok = sawVenomSpray && sawP2Twin;

    // 6b) Render all 4 new melee mobs & active telegraphs (blade_duelist whirlT, iron_guard, frost_knight, shadow_reaper, sand_worm burrow) cleanly in draw()
    const bd = createEnemy(player.x + 120, player.y, 'blade_duelist');
    bd.whirlT = 0.90; bd.whirlSpin = undefined; // exact first-frame state before fix
    const ig = createEnemy(player.x - 90, player.y, 'iron_guard');
    ig.cleaveWindup = 0.30;
    const fk = createEnemy(player.x, player.y + 110, 'frost_knight');
    fk.thrustWindup = 0.30;
    const sr = createEnemy(player.x, player.y - 110, 'shadow_reaper');
    sr.reapWindup = 0.30; sr._reapX = player.x + 40; sr._reapY = player.y;
    const swm = createEnemy(player.x + 150, player.y + 80, 'sand_worm');
    swm.burrowT = 0.45;
    draw();
    update(0.05);
    draw();

    // 7) Regression: Killing Story Boss mid-bullet-loop during overtime must NOT throw undefined.x
    endlessMode = false;
    wave = 8;
    beginWave();
    __drainDirector();
    for (let k = 0; k < 20; k++) { pendingBossCutscene = null; bossCutscene = null; update(0.05); }
    pendingBossCutscene = null;
    bossCutscene = null;
    overtime = true; waveTime = 0;
    const fqBoss = enemies.find(e => e.type === 'boss');
    fqBoss.mythicPhase2 = true;
    fqBoss.storyStage = 2;
    fqBoss.hp = 1;
    fqBoss.x = 1200; fqBoss.y = 1200;
    player.x = 950; player.y = 1200;
    bullets.length = 0;
    for (let bIdx = 0; bIdx < 5; bIdx++) {
      bullets.push({
        x: 1200, y: 1200, px: 1180, py: 1200, vx: 600, vy: 0,
        r: 12, dmg: 9999, life: 1.0, maxLife: 1.0, pierce: 0, bounces: 0,
        col: '#fff', crit: false, knock: 0
      });
    }
    update(0.016);
    const midBulletBossKillOk = (state === 'story' && bullets.length === 0);
    __drainDirector();

    // 8) Waves 1..10 tanky melee -15%, ranged unchanged, basic fodder melee increased correspondingly
    endlessMode = true;
    sceneMobEnabled = false;
    enemies.length = 0; spawns.length = 0;
    let tankEarly = 0, basicEarly = 0, rangedEarly = 0;
    let tankLate = 0, basicLate = 0, rangedLate = 0;
    const origRand = Math.random;
    let rSeed = 13579;
    Math.random = () => { rSeed = (rSeed * 16807) % 2147483647; return (rSeed - 1) / 2147483646; };
    wave = 8;
    for (let n = 0; n < 6000; n++) {
      const tp = pickWaveEnemyType(8);
      if (TANK_MELEE_TYPES.has(tp)) tankEarly++;
      else if (BASIC_FODDER_MELEE_TYPES.has(tp)) basicEarly++;
      else if (RANGED_ENEMY_TYPES.has(tp)) rangedEarly++;
    }
    rSeed = 13579;
    wave = 11;
    for (let n = 0; n < 6000; n++) {
      const tp = pickWaveEnemyType(8);
      if (TANK_MELEE_TYPES.has(tp)) tankLate++;
      else if (BASIC_FODDER_MELEE_TYPES.has(tp)) basicLate++;
      else if (RANGED_ENEMY_TYPES.has(tp)) rangedLate++;
    }
    Math.random = origRand;
    const tankRatio = tankEarly / Math.max(1, tankLate);
    const earlyTankShiftOk = (tankRatio > 0.81 && tankRatio < 0.89 && basicEarly > basicLate && rangedEarly === rangedLate);
    const needleShiftOk = (
      typeof NEEDLE_RANGED_MUL === 'number' &&
      Math.abs(NEEDLE_RANGED_MUL - 0.70) < 1e-6 &&
      typeof YELLOW_ARROW_MOB_MUL === 'number' &&
      Math.abs(YELLOW_ARROW_MOB_MUL - 0.80) < 1e-6 &&
      typeof YELLOW_RANGED_SPINNER_MUL === 'number' &&
      Math.abs(YELLOW_RANGED_SPINNER_MUL - 0.80) < 1e-6 &&
      typeof ELITE_MOB_COUNT_MUL === 'number' &&
      Math.abs(ELITE_MOB_COUNT_MUL - 0.70) < 1e-6 &&
      NEEDLE_RANGED_TYPES.has('frost_wisp') &&
      NEEDLE_RANGED_TYPES.has('shooter') &&
      NEEDLE_RANGED_TYPES.has('rad_scorpion') &&
      NEEDLE_RANGED_TYPES.has('sniper_bug') &&
      rangedEarly < (tankEarly + basicEarly)
    );

    // 7. 蚀界生存试炼（30s · 30% 怪物 · 沉浸提灯视野 · 天外贯星梭/地脉裂隙 · 必出紫色及以上武器+遗物秘匣）全链路回归测试
    selectedDiff = 2; // diff.midElite === true (Floor 6/10/14 为固定精英副官层)
    SpireSave.clear();
    startStoryMode();
    __drainDirector();
    wave = 1;
    pendingLevels = 0;
    pendingCrates = 0;
    finishWave();
    __drainDirector();
    while (state === 'levelup') {
      const b0 = document.getElementById('lvlBox').children[0];
      if (!b0) break;
      b0.click();
    }
    while (state === 'crate') {
      const c0 = document.getElementById('crateBox').children[0];
      const takeBtn = c0 && c0.querySelector('.take-btn');
      if (!takeBtn) break;
      takeBtn.click();
    }
    if (state !== 'shop') openShop(true);
    const eligOk = (
      canOfferSurvivalTrialForWave(2) === true &&
      canOfferSurvivalTrialForWave(3) === true &&
      canOfferSurvivalTrialForWave(4) === false &&
      canOfferSurvivalTrialForWave(5) === true &&
      canOfferSurvivalTrialForWave(6) === false &&
      canOfferSurvivalTrialForWave(8) === false &&
      canOfferSurvivalTrialForWave(10) === false &&
      canOfferSurvivalTrialForWave(12) === false
    );
    const barEl = document.getElementById('shopTrialBar');
    const barShownInShop = !!(barEl && !barEl.classList.contains('hidden'));
    survivalTrialQueued = false;
    toggleSurvivalTrial();
    const armedInShop = (survivalTrialQueued === true && barEl.classList.contains('is-armed'));

    nextWave();
    __drainDirector();
    const trialDurLadderOk = (
      typeof getSurvivalTrialDuration === 'function' &&
      getSurvivalTrialDuration(DIFFS[0]) === 30 &&
      getSurvivalTrialDuration(DIFFS[1]) === 30 &&
      getSurvivalTrialDuration(DIFFS[2]) === 34 &&
      getSurvivalTrialDuration(DIFFS[3]) === 38 &&
      getSurvivalTrialDuration(DIFFS[4]) === 41 &&
      getSurvivalTrialDuration(DIFFS[5]) === 45
    );
    const startedTrialOk = (
      trialDurLadderOk &&
      state === 'wave' &&
      survivalTrialWave === true &&
      survivalTrialQueued === false &&
      wave === 2 &&
      waveTime === 34 &&
      waveMaxTime === 34 &&
      player.r >= 24
    );

    // 验证怪物池仅限轻敏追猎怪（0 重装肉盾 / 0 远程弹幕怪 / 0 狂化精英），且迷雾外圈怪物 100% 被剔除不可透视
    const allowedTrialMobs = new Set(['chaser', 'stalker', 'swarmer', 'blade_duelist', 'magma_imp']);
    let trialPoolClean = true;
    for (let k = 0; k < 200; k++) {
      const tp = pickWaveEnemyType(8);
      if (!allowedTrialMobs.has(tp)) { trialPoolClean = false; break; }
    }
    const sampleE = createEnemy(player.x + 220, player.y, 'stalker');
    const noTrialElite = !!(sampleE && sampleE.elite === false);
    if (survivalTrialState) survivalTrialState.fogIntroP = 1.0;
    const farFogMob = createEnemy(Math.min(WORLD.w - 80, player.x + 620), player.y, 'chaser');
    draw();
    const fogOuterMobCulled = !!(farFogMob && !renderList.includes(farFogMob));

    // 验证魂灯瞬步扩圈、地脉裂缝瞬步无伤跨越、7类天外弹道与裂隙生成渲染、以及单次受击 <=31% 生命防秒杀保护
    player.maxHp = 100;
    player.hp = 100;
    player.shield = 0;
    player.armor = 0;
    player.dodge = 0;
    player.dashCd = 0;
    player.dashT = 0;
    triggerSoulDash();
    const boostTriggered = !!(survivalTrialState && survivalTrialState.lanternBoostT > 1.0);
    spawnSurvivalFissure(2);
    const fis0 = survivalFissures[0];
    if (fis0) {
      fis0.windupT = 0;
      fis0.activeT = 3.0;
      fis0.x1 = player.x - 90; fis0.y1 = player.y;
      fis0.x2 = player.x + 90; fis0.y2 = player.y;
    }
    player.dashT = 0.20;
    update(0.05);
    const dashLeapSafe = (player.hp === 100);
    spawnSurvivalCelestialVolley(2);
    spawnSurvivalCorridor(2);
    spawnSurvivalCrossJudgment(2);
    spawnSurvivalMeteorChain(2);
    spawnSurvivalAbyssVortex(2);
    draw();
    for (let step = 0; step < 24; step++) {
      update(0.05);
      draw();
    }
    const hasCelestialBullet = eBullets.some(b => b && b.isCelestial && (b.shape === 'celestial_lance' || b.isVortexTrap));
    // 验证敌方弹道尺寸与命中圈放大 +20%，且射向角色上半身躯干 (player.y - 22) 的弹道精准命中扣血（不再穿模不掉血）
    player.hp = 100;
    player.dashT = 0;
    player.dodge = 0;
    eBullets.push({
      x: player.x - 18, y: player.y - 22, px: player.x - 18, py: player.y - 22,
      vx: 420, vy: 0, life: 1.0, dmg: 12, r: 5.5, hitR: 4.8, color: '#ff3b6b', shape: 'orb'
    });
    const testUpperBullet = eBullets[eBullets.length - 1];
    update(0.06);
    const upperTorsoBulletHitOk = (player.hp < 100 && !eBullets.includes(testUpperBullet) && testUpperBullet._ebScaled === true && testUpperBullet.hitR > 5.7);

    player.maxHp = 100;
    player.hp = 100;
    player.armor = 0;
    player.shield = 0;
    player.dashT = 0;
    hurtPlayer(65, true);
    const antiOneshotTrialOk = (player.hp <= 40 && player.hp > 0 && survivalTrialHits >= 1);

    // 结算生存试炼并验证同幕锁定 1 次 + 试炼秘匣 100% 必出紫色(T3)/金色(T4)遗物与武器
    const matsBeforeComplete = player.mats;
    waveTime = 0;
    finishWave();
    const queuedBeforeDrain = ((player.survivalGoldCratesQueued || 0) + (player.survivalCratesQueued || 0)) >= 1;
    const matsAfterComplete = player.mats;
    __drainDirector();
    const actSealedOk = (
      player.survivalActsCleared &&
      player.survivalActsCleared[0] === true &&
      canOfferSurvivalTrialForWave(3) === false &&
      canOfferSurvivalTrialForWave(5) === true &&
      matsAfterComplete > matsBeforeComplete &&
      queuedBeforeDrain
    );

    let crateGuaranteeOk = true;
    const savedCrateWave = wave;
    for (let rollIdx = 0; rollIdx < 20; rollIdx++) {
      if (rollIdx < 10) {
        wave = 2; // 第1幕(W1~4)品质锁校验：生存秘匣保底 T2~T3、神话二阶段匣保底 T3，且 100% 禁出 T4 橙装！
      } else if (rollIdx === 10) {
        wave = 10; // 第3幕(W9~12)品质锁 + 满 6 把 1 阶白板武器槽位时的保底紫/金武器替换升级逻辑
        player.weapons = [
          { id: 'pistol', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 },
          { id: 'smg', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 },
          { id: 'shotgun', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 },
          { id: 'knife', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 },
          { id: 'stick', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 },
          { id: 'spear', tier: 1, cd: 0, angle: 0, recoil: 0, thrust: 0 }
        ];
      }
      pendingCrates = 1;
      player.mythicCratesQueued = (rollIdx === 8 || rollIdx === 9) ? 1 : 0;
      player.survivalGoldCratesQueued = (!player.mythicCratesQueued && rollIdx % 2 === 0) ? 1 : 0;
      player.survivalCratesQueued = (!player.mythicCratesQueued && rollIdx % 2 === 1) ? 1 : 0;
      showCrateMenu();
      const cards = document.getElementById('crateBox').children;
      if (cards.length < 2) { crateGuaranteeOk = false; break; }
      const c1Cls = cards[0].className || '';
      const c2Cls = cards[1].className || '';
      const c1Html = cards[0].innerHTML || '';
      const c2Html = cards[1].innerHTML || '';
      if (rollIdx < 8) {
        const act1NoOrange = !/\\bt4\\b/.test(c1Cls) && !/\\bt4\\b/.test(c2Cls);
        const c1BluePlusItem = (/\\bt[23]\\b/.test(c1Cls) && c1Html.includes('遗物'));
        const c2BluePlusWpn = (/\\bt[23]\\b/.test(c2Cls) && c2Html.includes('兵装'));
        if (!act1NoOrange || !c1BluePlusItem || !c2BluePlusWpn) { crateGuaranteeOk = false; break; }
      } else if (rollIdx < 10) {
        const act1MythicPurePurple = /\\bt3\\b/.test(c1Cls) && /\\bt3\\b/.test(c2Cls) && !/\\bt4\\b/.test(c1Cls) && !/\\bt4\\b/.test(c2Cls);
        if (!act1MythicPurePurple) { crateGuaranteeOk = false; break; }
      } else {
        const c1PurplePlusItem = (/\\bt[34]\\b/.test(c1Cls) && c1Html.includes('遗物'));
        const c2PurplePlusWpn = (/\\bt[34]\\b/.test(c2Cls) && c2Html.includes('兵装'));
        if (!c1PurplePlusItem || !c2PurplePlusWpn) { crateGuaranteeOk = false; break; }
        if (rollIdx === 19) {
          const takeWpnBtn = cards[1].querySelector('.take-btn');
          if (takeWpnBtn) takeWpnBtn.click();
          if (!player.weapons.some(w => w && w.tier >= 3)) { crateGuaranteeOk = false; break; }
        }
      }
    }
    wave = savedCrateWave;
    // 验证行商木牌 (coupon) 购买后立即实时重算当轮剩余商店卡与刷新花费，以及近战高等级射程显著短于远程武器
    player.shopDiscount = 0;
    player.mats = 9999;
    openShop(true);
    const couponDef = ITEMS.find(it => it && it.id === 'coupon');
    if (couponDef && shopOffers.length >= 2) {
      shopOffers[0] = { kind: 'item', item: couponDef, rawCost: 30, cost: 30, locked: false, sold: false };
      shopOffers[1] = { kind: 'item', item: ITEMS[0], rawCost: 50, cost: 50, locked: false, sold: false };
      rerollRawCost = 20;
      rerollCost = 20;
      buyOffer(0);
    }
    const liveShopDiscountOk = (
      player.shopDiscount >= 0.10 &&
      shopOffers[1] && shopOffers[1].cost === 45 &&
      rerollCost === 18
    );
    const meleeT4Range = calcWeaponEffectiveRange(WEAPONS.katana, 4, null, 80);
    const rangedT4Range = calcWeaponEffectiveRange(WEAPONS.rifle || WEAPONS.pistol, 4, null, 80);
    const meleeRangeGapOk = (meleeT4Range < 195 && rangedT4Range - meleeT4Range >= 150);

    const survivalTrialOk = (
      eligOk && barShownInShop && armedInShop && startedTrialOk &&
      trialPoolClean && noTrialElite && fogOuterMobCulled && boostTriggered && dashLeapSafe &&
      hasCelestialBullet && upperTorsoBulletHitOk && antiOneshotTrialOk && actSealedOk && crateGuaranteeOk &&
      liveShopDiscountOk && meleeRangeGapOk
    );

    // v2.1.9 ~ v2.1.10 专项校验：法杖与新道具 + 20%隐藏爆率封顶 + 试炼金币补偿翻倍 + 1~5层小怪血量-15% + 八荒血月斩预烘焙 + 赛后总结与点击详情 + 10/12层传送预警(D5=50%D1) + 护甲/吸血原版化 + 后期金币概率掉落
    const neutralP = { cls: 'allrounder', weapons: [{ id: 'pistol', tier: 1 }] };
    const neutralBoost = getArchetypeAffinityBoosts(neutralP);
    const committedStaffP = {
      cls: 'allrounder',
      weapons: [{ id: 'ember_staff', tier: 3 }, { id: 'frost_scepter', tier: 3 }, { id: 'storm_rod', tier: 3 }],
      staffVolley: 1, staffHaste: 0.25, elemBonus: 0.45, archmageMeteor: true
    };
    const staffBoost = getArchetypeAffinityBoosts(committedStaffP);
    const staffWpnMul = getWeaponArchetypeWeightMul('chrono_staff', staffBoost);
    const staffItemMul = getItemArchetypeWeightMul(ITEMS.find(x => x.id === 'archmage_crown'), staffBoost);
    const hiddenBoostOk = (
      neutralBoost.staff === 0 &&
      staffBoost.staff > 0.16 &&
      staffBoost.staff <= 0.20 + 1e-9 &&
      staffWpnMul > 1.16 && staffWpnMul <= 1.20 + 1e-9 &&
      staffItemMul > 1.16 && staffItemMul <= 1.20 + 1e-9
    );

    // 验证 1~5 层小怪血量降低 15%（0.85x），第 6 层起恢复 1.00x
    const earlyMobHpOk = (
      typeof getEarlyMobHpMul === 'function' &&
      Math.abs(getEarlyMobHpMul(1) - 0.85) < 1e-9 &&
      Math.abs(getEarlyMobHpMul(3) - 0.85) < 1e-9 &&
      Math.abs(getEarlyMobHpMul(5) - 0.85) < 1e-9 &&
      Math.abs(getEarlyMobHpMul(6) - 1.00) < 1e-9 &&
      Math.abs(getEarlyMobHpMul(12) - 1.00) < 1e-9
    );

    // 验证蚀界生存试炼金币补偿适度平滑且受击 >=3 次仍有保底赏金
    const trialCompLow = typeof calcSurvivalTrialGoldComp === 'function' ? calcSurvivalTrialGoldComp(3, 4, { harvest: 1 }) : { total: 0 };
    const trialCompFlawless = typeof calcSurvivalTrialGoldComp === 'function' ? calcSurvivalTrialGoldComp(3, 0, { harvest: 1 }) : { total: 0 };
    const trialGoldCompOk = (trialCompLow.total >= 42 && trialCompFlawless.total > trialCompLow.total);

    const wD1 = getBossTeleportWarnSec(1), wD2 = getBossTeleportWarnSec(2), wD3 = getBossTeleportWarnSec(3), wD4 = getBossTeleportWarnSec(4), wD5 = getBossTeleportWarnSec(5);
    const tpWarnLadderOk = (wD1 > wD2 && wD2 > wD3 && wD3 > wD4 && wD4 > wD5 && Math.abs(wD5 - wD1 * 0.50) < 1e-6);

    const armorCurveOk = (
      Math.abs(calcBrotatoArmorMitigation(0) - 0) < 1e-6 &&
      Math.abs(calcBrotatoArmorMitigation(20) - 0.50) < 1e-6 &&
      Math.abs(calcBrotatoArmorMitigation(100) - 0.60) < 1e-6 &&
      calcBrotatoArmorMitigation(-5) < 0
    );

    // 验证吸血仅直接攻击触发且受 0.12s ICD 限制
    beginWave();
    __drainDirector();
    player.dodge = 0;
    player.hp = 10; player.maxHp = 50; player.lifesteal = 1.0; player._lifestealCd = 0;
    const dummyE = createEnemy(player.x + 120, player.y, 'chaser');
    dummyE.hp = dummyE.maxHp = 9999;
    const _lsRand = Math.random;
    Math.random = () => 0.10;
    try {
      hurtEnemy(dummyE, 10, false, null, true, { isTurret: true, srcId: 'turret_gun' });
      var turretNoLs = (player.hp === 10);
      hurtEnemy(dummyE, 10, false, null, true, { srcId: 'ember_staff' });
      var directLsHealed = (player.hp === 11 && player._lifestealCd > 0.10);
      hurtEnemy(dummyE, 10, false, null, true, { srcId: 'ember_staff' });
      var icdBlockedSecond = (player.hp === 11);
    } finally {
      Math.random = _lsRand;
    }
    const lifestealRuleOk = (turretNoLs && directLsHealed && icdBlockedSecond);

    // 验证小怪不爆 bigCoin 金色大钻，而首领可爆 bigCoin
    drops.length = 0;
    wave = 10;
    for (let di = 0; di < 40; di++) dropCrystals(300, 300, 8, false);
    const mobNeverBigCoin = drops.every(d => d.kind !== 'mat' || d.bigCoin === false);
    drops.length = 0;
    dropCrystals(300, 300, 30, true);
    const bossHasBigCoin = drops.some(d => d.kind === 'mat' && d.bigCoin === true);

    // 验证八荒血月斩预烘焙精灵存在 & 赛后总结渲染双栏数据及点击查看武器/魔物详情弹窗
    const bmSprite = getBloodMoonWaveSprite();
    player.hp = 35; player.maxHp = 50; player.dodge = 0;
    hurtPlayer(12, true, 'void_weaver');
    renderEndRunSummary(false);
    const endSumHtml = document.getElementById('endSummaryPanel').innerHTML || '';
    const detailWpnOpened = openEndSummaryDetail('dealt', 'ember_staff') &&
      !document.getElementById('endDetailModal').classList.contains('hidden') &&
      (document.getElementById('endDetailBody').innerHTML || '').includes('赤烬魂灯杖');
    const detailMobOpened = openEndSummaryDetail('taken', 'void_weaver') &&
      !document.getElementById('endDetailModal').classList.contains('hidden') &&
      (document.getElementById('endDetailBody').innerHTML || '').includes('伽蓝');
    closeEndSummaryDetail();
    const detailClosed = document.getElementById('endDetailModal').classList.contains('hidden');
    const postGameSummaryOk = (!!bmSprite && endSumHtml.includes('赤烬魂灯杖') && endSumHtml.includes('伽蓝') && endSumHtml.includes('openEndSummaryDetail') && detailWpnOpened && detailMobOpened && detailClosed);
    const goldAndRangedBoostOk = (
      Math.abs(CRYSTAL_YIELD_MUL - 0.77) < 1e-9 &&
      Math.abs(getWaveMatRate(1) - 0.92 * 0.77) < 1e-9 &&
      Math.abs(WEAPONS.pistol.dmg - 22.55) < 1e-9 &&
      Math.abs(WEAPONS.smg.dmg - 8.58) < 1e-9 &&
      Math.abs(WEAPONS.sniper.dmg - 57.2) < 1e-9 &&
      Math.abs(WEAPONS.rocket.dmg - 46.2) < 1e-9 &&
      Math.abs(WEAPONS.emp_cannon.dmg - 41.8) < 1e-9 &&
      Math.abs(WEAPONS.stick.dmg - 18.0) < 1e-9 &&
      Math.abs(WEAPONS.ember_staff.dmg - 16.8) < 1e-9
    );
    // Floor 6-10 monster HP -10% overall (W5 & W11..16 unchanged)
    const midWave6To10HpOk = (
      Math.abs(getMidLateWaveHpMul(5) - 0.95) < 1e-9 &&
      Math.abs(getMidLateWaveHpMul(6) - 1.062) < 1e-9 &&
      Math.abs(getMidLateWaveHpMul(10) - 1.728) < 1e-9 &&
      getMidLateWaveHpMul(11) > 1.92 &&
      Math.abs(getMidLateWaveHpMul(16) - 3.00) < 1e-9
    );
    // D0 (-50% HP/DMG, -20% spawn), D1 pure baseline (1.00 / 1.00), D2-D4 scaled proportionally, D5 unchanged (1.70 / 1.50)
    const diffRebalanceOk = (
      DIFFS[0].hpMul <= 0.50 && DIFFS[0].dmgMul <= 0.50 && DIFFS[0].spawnMul <= 0.80 &&
      DIFFS[1].hpMul === 1.00 && DIFFS[1].dmgMul === 1.00 && DIFFS[1].spdMul === 0.98 && DIFFS[1].spawnMul === 1.05 && DIFFS[1].eliteRate === 0.05 && DIFFS[1].shopTax === 1.00 &&
      DIFFS[2].hpMul === 1.18 && DIFFS[2].dmgMul === 1.13 &&
      DIFFS[3].hpMul === 1.35 && DIFFS[3].dmgMul === 1.25 &&
      DIFFS[4].hpMul === 1.53 && DIFFS[4].dmgMul === 1.38 &&
      DIFFS[5].hpMul === 1.70 && DIFFS[5].dmgMul === 1.50 && DIFFS[5].spdMul === 1.08 && DIFFS[5].spawnMul === 1.27 && DIFFS[5].eliteRate === 0.144 && DIFFS[5].shopTax === 1.11 &&
      DIFFS[0].hpMul < DIFFS[1].hpMul && DIFFS[1].hpMul < DIFFS[2].hpMul && DIFFS[2].hpMul < DIFFS[3].hpMul && DIFFS[3].hpMul < DIFFS[4].hpMul && DIFFS[4].hpMul < DIFFS[5].hpMul &&
      DIFFS[0].dmgMul < DIFFS[1].dmgMul && DIFFS[1].dmgMul < DIFFS[2].dmgMul && DIFFS[2].dmgMul < DIFFS[3].dmgMul && DIFFS[3].dmgMul < DIFFS[4].dmgMul && DIFFS[4].dmgMul < DIFFS[5].dmgMul
    );
    // Differentiated Survival Trial telegraphs (distinct colors, chainStep metadata, full mist+world render pass)
    state = 'wave';
    survivalTrialWave = true;
    survivalSkyVolleys.length = 0;
    survivalFissures.length = 0;
    hazards.length = 0;
    eBullets.length = 0;
    const svTheme = getSurvivalTrialTheme();
    spawnSurvivalCelestialVolley(svTheme, 24);
    spawnSurvivalCorridor(svTheme, 24);
    spawnSurvivalFissure(svTheme, 24);
    spawnSurvivalCrossJudgment(svTheme, 24);
    spawnSurvivalMeteorChain(svTheme, 24);
    spawnSurvivalAbyssVortex(svTheme, 24);
    // Add an active incoming celestial lance bullet outside Soul Lantern rim to test both rim icon branches
    eBullets.push({ x: player.x + 360, y: player.y, vx: -420, vy: 0, r: 8, dmg: 18, color: svTheme.lanceCol, shape: 'celestial_lance', isCelestial: true, life: 2.5 });
    const lanceVolley = survivalSkyVolleys.find(v => v.kind === 'lance');
    const corridorVolley = survivalSkyVolleys.find(v => v.kind === 'corridor_beam');
    const crossHaz = hazards.find(h => h.style === 'cross_beam');
    const meteorChainHaz = hazards.filter(h => h.chainStep > 0);
    draw();
    survivalTrialWave = false;
    const distinctTelegraphsOk = Boolean(
      lanceVolley && corridorVolley && survivalFissures.length > 0 && crossHaz && meteorChainHaz.length >= 3 &&
      lanceVolley.color !== corridorVolley.color &&
      crossHaz.color !== survivalFissures[0].color &&
      meteorChainHaz.some(h => h.chainStep >= 2 && Number.isFinite(h.prevX) && Number.isFinite(h.prevY))
    );
    // 验证跨波累加刷新机制（首店 1 起，每次刷新 +2；仅第 3/6/9/12 回合降低 50%，其余回合降低 20%）
    player.shopDiscount = 0;
    player.freeRerolls = 0;
    player.shopVisits = 0;
    player.shopRerollRaw = 1;
    player.mats = 9999;
    wave = 1;
    openShop(true);
    const shop1InitOk = (rerollRawCost === 1 && rerollCost === 1 && player.shopVisits === 1);
    rerollShop(); // 1 -> 3
    rerollShop(); // 3 -> 5
    rerollShop(); // 5 -> 7
    rerollShop(); // 7 -> 9
    rerollShop(); // 9 -> 11
    const shop1AccumOk = (rerollRawCost === 11 && rerollCost === 11 && player.shopRerollRaw === 11);
    wave = 2;
    openShop(true); // 非 3/6/9/12 回合：降低 20% -> round(11 * 0.80) = 9
    const shop2NormalRecoverOk = (rerollRawCost === 9 && rerollCost === 9 && player.shopVisits === 2);
    wave = 3;
    openShop(true); // 第 3 回合：降低 50% -> round(9 * 0.50) = 5
    const shop3HalfRecoverOk = (rerollRawCost === 5 && rerollCost === 5 && player.shopVisits === 3);
    rerollShop(); // 5 -> 7
    const shop2StepOk = (rerollRawCost === 7 && rerollCost === 7);

    const pickupSweepMobBalanceOk = (
      BASE_PICKUP_MAGNET === 143 &&
      Math.abs(UNCOLLECTED_MAT_SWEEP_RATE - 0.50) < 1e-9 &&
      Math.abs(BOSS_SIZE_MUL - 1.20) < 1e-9 &&
      shop1InitOk && shop1AccumOk && shop2NormalRecoverOk && shop3HalfRecoverOk && shop2StepOk &&
      Math.abs(MOB_DMG_MUL - 0.90) < 1e-9 &&
      Math.abs(YELLOW_ARROW_MOB_MUL - 0.80) < 1e-9 &&
      Math.abs(ELITE_MOB_COUNT_MUL - 0.70) < 1e-9 &&
      Math.abs(YELLOW_RANGED_SPINNER_MUL - 0.80) < 1e-9
    );
    // D1 -> D5 progressive terrain impact (+0% -> +30%) & terrain size (+0% -> +50%), D1 strictly unchanged
    const terrainDiffScaleOk = (() => {
      if (!(
        Math.abs(getDiffTerrainImpactMul(DIFFS[0]) - 1.00) < 1e-9 &&
        Math.abs(getDiffTerrainImpactMul(DIFFS[1]) - 1.00) < 1e-9 &&
        Math.abs(getDiffTerrainImpactMul(DIFFS[2]) - 1.075) < 1e-9 &&
        Math.abs(getDiffTerrainImpactMul(DIFFS[3]) - 1.15) < 1e-9 &&
        Math.abs(getDiffTerrainImpactMul(DIFFS[4]) - 1.225) < 1e-9 &&
        Math.abs(getDiffTerrainImpactMul(DIFFS[5]) - 1.30) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[0]) - 1.00) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[1]) - 1.00) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[2]) - 1.125) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[3]) - 1.25) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[4]) - 1.375) < 1e-9 &&
        Math.abs(getDiffTerrainSizeMul(DIFFS[5]) - 1.50) < 1e-9
      )) return false;
      diff = DIFFS[1]; selectedDiff = 1;
      const d1EffSize = getEffectiveTerrainSizeMul();
      diff = DIFFS[5]; selectedDiff = 5;
      const d5EffSize = getEffectiveTerrainSizeMul();
      if (!(Math.abs(d1EffSize - 1.05) < 1e-9 && Math.abs(d5EffSize - 1.05 * 1.50) < 1e-9)) return false;
      for (const sid of ['foundry', 'glacier', 'wasteland', 'desert']) {
        curScene = SCENES.find(sc => sc.id === sid) || SCENES[0];
        spawnArenaTerrains();
        if (terrains.length < 4) return false;
      }
      return true;
    })();

    // D5-exclusive Boss Phase-2 10s Last Stand (invulnerable 10s, +20% attack speed, +10% maxHp heal per player hit, triggers ONLY once & ONLY on D5 Phase 2)
    const d5BossLastStandOk = (() => {
      endlessMode = true;
      state = 'wave';
      wave = 8;
      // 1) D4 Phase-2 Boss must NOT trigger Last Stand
      diff = DIFFS[4]; selectedDiff = 4;
      enemies.length = 0; trees.length = 0; eBullets.length = 0;
      const d4Boss = createEnemy(player.x + 180, player.y, 'boss', 'butcher');
      d4Boss.mythicPhase2 = true; d4Boss.canPhase2 = false; d4Boss.hp = 500; d4Boss.maxHp = 5000;
      hurtEnemy(d4Boss, 99999, true);
      if (d4Boss.hp > 0 || d4Boss._d5LastStandUsed) return false;

      // 2) D5 Phase-1 Boss transitions into Phase-2 without consuming Last Stand; lethal hit in Phase-2 triggers 10s Last Stand once
      diff = DIFFS[5]; selectedDiff = 5;
      enemies.length = 0;
      const d5Boss = createEnemy(player.x + 180, player.y, 'boss', 'butcher');
      d5Boss.canPhase2 = true; d5Boss.mythicPhase2 = false; d5Boss.hp = 500; d5Boss.maxHp = 5000;
      player.waveMythicAwakened = false;
      hurtEnemy(d5Boss, 99999, true);
      bossCutscene = null;
      if (!d5Boss.mythicPhase2 || d5Boss._d5LastStandUsed || d5Boss.d5LastStandT > 0) return false;

      d5Boss.maxHp = 6000; d5Boss.hp = 400;
      hurtEnemy(d5Boss, 99999, true);
      if (!(d5Boss._d5LastStandUsed === true && d5Boss.hp === 1 && Math.abs(d5Boss.d5LastStandT - 10.0) < 1e-6 && D5_LAST_STAND_ASPD_MUL === 1.20)) return false;
      if (!bossCutscene || bossCutscene.mode !== 'last_stand') return false;
      draw(); // Verify last_stand portrait banner renders cleanly with 0 radialGradient & 0 shadowBlur
      bossCutscene = null;

      // Invulnerability during 10s window
      hurtEnemy(d5Boss, 99999, true);
      if (d5Boss.hp !== 1) return false;

      // +10% maxHp heal per non-dodged hit on player (dodged hit & terrain hit must NOT heal Boss)
      player.maxHp = 1000; player.hp = 1000; player.armor = 0; player.shield = 0;
      player.dodge = 1.0; player.dodgeCap = 1.0;
      hurtPlayer(50, false, d5Boss);
      if (d5Boss.hp !== 1) return false;
      player.dodge = 0; player.dodgeCap = 0.80;
      hurtPlayer(50, false, 'terrain_lava');
      if (d5Boss.hp !== 1) return false;
      hurtPlayer(50, false, d5Boss);
      if (d5Boss.hp !== 1 + Math.round(6000 * 0.10)) return false;
      // Shield-absorbed hit by Boss also counts as damaging player -> heals +10%
      player.shield = 200;
      hurtPlayer(40, true, 'butcher');
      if (d5Boss.hp !== 1 + Math.round(6000 * 0.10) * 2) return false;
      draw();

      // Tick past 10s -> invulnerability expires, exposeT opens, and next lethal hit kills Boss permanently (never triggers twice!)
      d5Boss.x = player.x + 420; d5Boss.y = player.y;
      for (let k = 0; k < 105; k++) {
        player.hp = 1000;
        spawnAcc = 99;
        update(0.10);
      }
      if (d5Boss.d5LastStandT > 0 || !(d5Boss.exposeT > 0)) return false;
      hurtEnemy(d5Boss, 999999, true);
      return d5Boss.hp <= 0;
    })();

    // Innovative interactive counterplay mechanics across all 6 Bosses + clean 2D render pass
    const bossMechanicsOverhaulOk = (() => {
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      spireFloorFlow = null;
      endlessMode = true;
      state = 'wave';
      wave = 8; waveTime = 60; overtime = false; bossCutscene = null; pendingBossCutscene = null;
      diff = DIFFS[2]; selectedDiff = 2;
      enemies.length = 0; trees.length = 0; eBullets.length = 0; hazards.length = 0;
      player.weapons = []; player.maxHp = 5000; player.hp = 5000;

      // 1) Butcher Blood-Oath Duel Arena: completing inside grants player haste + Boss exposeT
      const b1 = createEnemy(1320, 900, 'boss', 'butcher');
      b1.hp = 50000; b1.maxHp = 50000; b1.arenaMechCd = 0.01;
      player.x = 1380; player.y = 900;
      update(0.05);
      if (!b1.duelRing) return false;
      draw();
      b1.duelRing.t = 0.03;
      update(0.05);
      if (b1.duelRing !== null || !(b1.exposeT >= 2.0)) return false;

      // 2) Frost Queen Twin Cryo-Obelisks: -14% DR per pillar (-28% for 2); shattering ALL pillars triggers 20s +20% True Armor Break & 20s respawn delay!
      enemies.length = 0; trees.length = 0;
      const bBase = createEnemy(900, 900, 'boss', 'butcher');
      bBase.hp = 50000; bBase.maxHp = 50000; bBase.dodge = 0; bBase.exposeT = 0; bBase.pylonBrokenT = 0;
      hurtEnemy(bBase, 1000, false, null, false, { noProc: true, undodgeable: true });
      const baseBossDmgTaken = 50000 - bBase.hp;
      enemies.length = 0; trees.length = 0;

      const b2 = createEnemy(1320, 900, 'boss', 'frost_queen');
      b2.hp = 50000; b2.maxHp = 50000; b2.dodge = 0; b2.arenaMechCd = 0.01;
      update(0.05);
      const pylons = trees.filter(t => t && t.isBossPylon && t.pylonKind === 'cryo_obelisk');
      if (pylons.length !== 2) return false;
      draw();
      const hpBeforePylonShatter = b2.hp;
      hurtTree(pylons[0], 99999);
      if (!(b2.hp < hpBeforePylonShatter && b2.exposeT >= 1.5 && (b2.pylonBrokenT || 0) === 0 && b2._pylonShieldCnt === 1)) return false;
      hurtTree(pylons[1], 99999);
      if (!(b2.pylonBrokenT === 20 && b2.pylonRespawnCd === 20 && b2._pylonShieldCnt === 0)) return false;

      // Verify true +20% Boss damage taken across the 20s broken-armor window (including after brief 1.85s exposeT expires!)
      b2.exposeT = 0;
      const hpBeforeVulnHit = b2.hp;
      hurtEnemy(b2, 1000, false, null, false, { noProc: true, undodgeable: true });
      const vulnBossDmgTaken = hpBeforeVulnHit - b2.hp;
      if (vulnBossDmgTaken !== Math.round(baseBossDmgTaken * 1.20)) return false;
      draw();

      // Advance 19.5s (< 20s): Boss must STILL be in +20% armor break and MUST NOT respawn pillars early!
      waveTime = 60; overtime = false;
      for (let step = 0; step < 195; step++) {
        player.hp = 5000; b2.hp = 50000; waveTime = 60;
        update(0.10);
      }
      const earlyPylons = trees.filter(t => t && t.isBossPylon && t.owner === b2 && t.hp > 0);
      if (earlyPylons.length !== 0 || !(b2.pylonBrokenT > 0.3 && b2.pylonRespawnCd > 0.3)) return false;

      // Advance past 20.0s mark and clear any mid-cast lock -> Boss must re-summon 2 brand-new Cryo-Obelisks!
      for (let step = 0; step < 8; step++) {
        player.hp = 5000; b2.hp = 50000; spawnAcc = 99;
        b2.dashing = false; b2.sigWindupT = 0; b2.p2WindupT = 0; b2.beamSweepT = 0;
        update(0.10);
      }
      const respawnedPylons = trees.filter(t => t && t.isBossPylon && t.owner === b2 && t.pylonKind === 'cryo_obelisk' && t.hp > 0);
      if (b2.pylonBrokenT !== 0 || b2.pylonRespawnCd !== 0 || respawnedPylons.length !== 2) return false;

      // 3) Void Weaver Chrono-Anchor + Dispel Pad counterplay
      enemies.length = 0; trees.length = 0;
      const b3 = createEnemy(1320, 900, 'boss', 'void_weaver');
      b3.hp = 50000; b3.maxHp = 50000; b3.arenaMechCd = 0.01;
      player.x = 1120; player.y = 900;
      update(0.05);
      if (!b3.chronoAnchor) return false;
      draw();
      player.x = b3.chronoAnchor.dx; player.y = b3.chronoAnchor.dy;
      update(0.05);
      if (b3.chronoAnchor !== null || !(b3.exposeT >= 1.8)) return false;

      // 4) Solar Seraph Eclipse Singularity + Golden Dawn Sanctuary Seals
      enemies.length = 0;
      const b4 = createEnemy(1320, 900, 'boss', 'solar_seraph');
      b4.hp = 50000; b4.maxHp = 50000; b4.arenaMechCd = 0.01;
      player.x = 1100; player.y = 900;
      update(0.05);
      if (!b4.eclipseSingularity || !Number.isFinite(b4.eclipseSingularity.s1x)) return false;
      draw();
      player.x = b4.eclipseSingularity.s1x;
      player.y = b4.eclipseSingularity.s1y;
      b4.eclipseSingularity.windupT = 0;
      b4.eclipseSingularity.t = 0.02;
      const hpBeforeNova = player.hp;
      update(0.05);
      if (b4.eclipseSingularity !== null || player.hp !== hpBeforeNova || !(b4.exposeT >= 2.0)) return false;

      // 5) Endless Bosses (mech_colossus & plague_empress) destructible pylons + render pass
      enemies.length = 0; trees.length = 0;
      const b5 = createEnemy(1220, 900, 'boss', 'mech_colossus');
      b5.hp = 50000; b5.maxHp = 50000; b5.arenaMechCd = 0.01;
      const b6 = createEnemy(1460, 900, 'boss', 'plague_empress');
      b6.hp = 50000; b6.maxHp = 50000; b6.arenaMechCd = 0.01;
      update(0.05);
      draw();
      const hasMagnetAndCocoon = trees.some(t => t && t.pylonKind === 'magnet_core') && trees.some(t => t && t.pylonKind === 'venom_cocoon');
      enemies.length = 0; trees.length = 0; eBullets.length = 0; hazards.length = 0;
      diff = DIFFS[2]; selectedDiff = 2;
      return hasMagnetAndCocoon;
    })();

    // Dual-form Elite Monsters (frenzy red +20% aspd/spd/hp vs deathrattle yellow 4-arrow burst) + Dynamic Boss Cast Pose/Phenomena
    const eliteFormsAndBossCastAnimOk = (() => {
      if (typeof applyEliteAffix !== 'function' || ELITE_FRENZY_BONUS_MUL !== 1.20 || typeof triggerBossActionPose !== 'function') return false;
      state = 'wave'; wave = 6; survivalTrialWave = false;
      enemies.length = 0; eBullets.length = 0;

      const origRand = Math.random;
      Math.random = () => 0.999999; // prevent random auto-elite on createEnemy so we can compare exact base stats
      const eFrenzy = createEnemy(1100, 900, 'shooter');
      const eDeath = createEnemy(1260, 900, 'shooter');
      Math.random = origRand;

      const baseSpd = eFrenzy.spd;
      applyEliteAffix(eFrenzy, 'frenzy');
      applyEliteAffix(eDeath, 'deathrattle');

      if (eFrenzy.eliteKind !== 'frenzy' || eDeath.eliteKind !== 'deathrattle') return false;
      if (Math.abs(eFrenzy.spd / baseSpd - 1.20) > 0.001 || Math.abs(eDeath.spd / baseSpd - 1.00) > 0.001) return false;
      if (eFrenzy.hp !== Math.round(eDeath.hp * 1.20) || eFrenzy.eliteAspdMul !== 1.20 || eDeath.eliteAspdMul !== 1.00) return false;

      // Verify frenzy elite ticks shotT 20% faster than deathrattle elite
      eFrenzy.shotT = 2.40;
      eDeath.shotT = 2.40;
      player.x = 1180; player.y = 650;
      update(0.50);
      if (Math.abs((2.40 - eFrenzy.shotT) - (2.40 - eDeath.shotT) * 1.20) > 0.02) return false;

      // Render pass for both elite forms (crimson vs golden tint + badges)
      draw();

      // Deathrattle gating: frenzy spawns 0 yellow arrows; deathrattle spawns 4 yellow lance arrows
      eBullets.length = 0;
      hurtEnemy(eFrenzy, 999999, true);
      if (eBullets.length !== 0) return false;
      hurtEnemy(eDeath, 999999, true);
      if (eBullets.length !== 4 || !eBullets.every(b => b.shape === 'lance' && b.color === '#fbbf24')) return false;

      // Dynamic Boss skill-casting pose & phenomena render pass across all 6 Bosses
      enemies.length = 0; eBullets.length = 0;
      for (const bv of ['frost_queen', 'void_weaver', 'solar_seraph', 'mech_colossus', 'plague_empress', 'butcher']) {
        const b = createEnemy(1320, 900, 'boss', bv);
        b.hp = 50000; b.maxHp = 50000;
        b.sigWindupT = 0.45; b.sigMaxW = 0.90;
        triggerBossActionPose(b, bv === 'mech_colossus' ? 'recoil' : (bv === 'butcher' ? 'slash' : 'cast_up'), 0.3, 0.5, '#fde68a');
        draw();
        if (!(b._actPoseT > 0)) return false;
        enemies.length = 0;
      }
      return true;
    })();

    // Late-game (W10-16+) heal pack drop curve (-30% base, then D1=1.00 -> D5=0.50 stepped reduction + ground crowd cap) + Floor 16 Boss 25% dodge + Boss HP HUD text
    const lateHealDropAndBoss16DodgeOk = (() => {
      if (typeof getEffectiveHealDropMul !== 'function' || typeof getGroundHealCrowdFactor !== 'function') return false;
      for (let wv = 1; wv <= 9; wv++) {
        for (let di = 0; di < DIFFS.length; di++) {
          if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[di]) - 1.00) > 1e-9) return false;
        }
      }
      for (const wv of [10, 12, 16, 18]) {
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[0]) - 0.70) > 1e-9) return false;
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[1]) - 0.70) > 1e-9) return false;
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[2]) - 0.6125) > 1e-9) return false;
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[3]) - 0.5250) > 1e-9) return false;
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[4]) - 0.4375) > 1e-9) return false;
        if (Math.abs(getEffectiveHealDropMul(wv, DIFFS[5]) - 0.3500) > 1e-9) return false;
      }
      drops.length = 0;
      if (getGroundHealCrowdFactor() !== 1.0) return false;
      for (let i = 0; i < 6; i++) drops.push({ x: 500 + i * 10, y: 500, kind: 'heal', bob: 0 });
      if (getGroundHealCrowdFactor() !== 0.5) return false;
      for (let i = 0; i < 5; i++) drops.push({ x: 600 + i * 10, y: 500, kind: 'heal', bob: 0 });
      if (getGroundHealCrowdFactor() !== 0) return false;
      drops.length = 0;

      // Floor 16 Boss stepped dodge verification: D0/D1 = 0%, D2..D5 -> 6.25% / 12.5% / 18.75% / 25%
      if (typeof getFloor16BossDodge !== 'function') return false;
      if (getFloor16BossDodge(DIFFS[0]) !== 0 || getFloor16BossDodge(DIFFS[1]) !== 0) return false;
      if (Math.abs(getFloor16BossDodge(DIFFS[2]) - 0.0625) > 1e-9) return false;
      if (Math.abs(getFloor16BossDodge(DIFFS[3]) - 0.1250) > 1e-9) return false;
      if (Math.abs(getFloor16BossDodge(DIFFS[4]) - 0.1875) > 1e-9) return false;
      if (Math.abs(getFloor16BossDodge(DIFFS[5]) - 0.2500) > 1e-9) return false;

      state = 'wave'; endlessMode = false; diff = DIFFS[1]; selectedDiff = 1;
      enemies.length = 0; texts.length = 0;
      wave = 8;
      const b8 = createEnemy(1320, 900, 'boss', 'frost_queen');
      if ((b8.dodge || 0) !== 0) return false;
      enemies.length = 0;
      wave = 16;
      const b16D1 = createEnemy(1320, 900, 'boss', 'solar_seraph');
      if ((b16D1.dodge || 0) !== 0) return false;
      enemies.length = 0;
      diff = DIFFS[5]; selectedDiff = 5;
      const b16 = createEnemy(1320, 900, 'boss', 'solar_seraph');
      if (Math.abs((b16.dodge || 0) - 0.25) > 1e-9) return false;
      enemies.push(b16);
      hudAcc = 1.0;
      update(0.05);
      const bossHpDom = document.getElementById('bossHpText');
      if (!bossHpDom || !String(bossHpDom.textContent || '').includes('%')) return false;

      const hp0 = b16.hp;
      const origRand = Math.random;
      Math.random = () => 0.12; // < 0.25 -> must dodge!
      hurtEnemy(b16, 500, false, 0);
      if (b16.hp !== hp0 || !texts.some(t => String(t.txt).includes('闪避'))) {
        Math.random = origRand;
        return false;
      }
      // DoT must NOT be dodged even when random < 0.25
      hurtEnemy(b16, 200, false, null, true, { isDot: true, dotColor: '#ff9f1c', noProc: true });
      if (!(b16.hp < hp0)) {
        Math.random = origRand;
        return false;
      }
      const hpAfterDot = b16.hp;
      Math.random = () => 0.80; // >= 0.25 -> normal attack hits!
      hurtEnemy(b16, 500, false, 0);
      Math.random = origRand;
      if (!(b16.hp < hpAfterDot)) return false;
      enemies.length = 0;

      // 5) 4-Chapter Stage-1 Classical Piano BGM + Boss Phase-2 Variation BGM auto-switching & shop/wave reset
      for (const [sid, s1Url, p2Url] of [
        ['foundry', 'assets/audio/scene_foundry_rain.wav', 'assets/audio/scene_foundry_phase2.wav'],
        ['glacier', 'assets/audio/scene_glacier_frost.wav', 'assets/audio/scene_glacier_phase2.wav'],
        ['wasteland', 'assets/audio/scene_wasteland_clock.wav', 'assets/audio/scene_wasteland_phase2.wav'],
        ['desert', 'assets/audio/scene_desert_eclipse.wav', 'assets/audio/scene_desert_phase2.wav']
      ]) {
        curScene = SCENES.find(sc => sc.id === sid) || SCENES[0];
        SpireAudio.syncScene(sid);
        if (SpireAudio.activeSceneId !== sid || SpireAudio.phase2Active !== false || AudioBank.currentBgmUrl !== s1Url) return false;
        const p2Boss = createEnemy(1320, 900, 'boss', 'butcher');
        p2Boss.canPhase2 = true;
        p2Boss.mythicPhase2 = false;
        player.waveMythicAwakened = false;
        if (!triggerBossMythicPhase2(p2Boss)) return false;
        if (SpireAudio.phase2Active !== true || AudioBank.currentBgmUrl !== p2Url) return false;
        openShop(true);
        if (SpireAudio.phase2Active !== false || AudioBank.currentBgmUrl !== s1Url) return false;
      }
      bossCutscene = null; pendingBossCutscene = null; spireFloorFlow = null;
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      state = 'wave'; waveTime = 60; overtime = false;
      return true;
    })();

    // Twin Boss / Dual Commander + Summoned Boss + Mythic Phase-2: ALL Boss Crates must be GRANTED DIRECTLY (no ground pickup needed, uncapped, preserved in Endless overtime)
    const twinBossSingleCrateOk = (() => {
      endlessMode = true;
      state = 'wave';
      wave = 20;
      diff = DIFFS[5]; selectedDiff = 5;
      enemies.length = 0; spawns.length = 0; drops.length = 0;
      pendingCrates = 0;
      player.bossCratesQueued = 0;
      player.mythicCratesQueued = 0;
      player.waveBossCrateDropped = false;
      const tb1 = createEnemy(player.x + 150, player.y, 'boss', 'butcher');
      const tb2 = createEnemy(player.x - 150, player.y, 'boss', 'frost_queen');
      tb1.canPhase2 = false; tb2.canPhase2 = false; tb1._d5LastStandUsed = true; tb2._d5LastStandUsed = true;
      hurtEnemy(tb1, tb1.maxHp + 999999, true);
      const qAfterFirst = player.bossCratesQueued || 0;
      hurtEnemy(tb2, tb2.maxHp + 999999, true);
      const qAfterSecond = player.bossCratesQueued || 0;
      const groundBossCrates = drops.filter(d => d.kind === 'crate' && d.isBoss).length;
      if (qAfterFirst !== 0 || qAfterSecond !== 1 || pendingCrates !== 1 || groundBossCrates !== 0) return false;

      // Dual mini_boss commanders must also grant ONLY 1 Boss Relic Crate directly (0 ground boss crates)
      enemies.length = 0; spawns.length = 0; drops.length = 0;
      pendingCrates = 0;
      player.bossCratesQueued = 0;
      player.waveBossCrateDropped = false;
      const mb1 = createEnemy(player.x + 140, player.y, 'mini_boss', 'vanguard');
      const mb2 = createEnemy(player.x - 140, player.y, 'mini_boss', 'pyro_lord');
      mb1.canPhase2 = false; mb2.canPhase2 = false;
      hurtEnemy(mb1, mb1.maxHp + 999999, true);
      hurtEnemy(mb2, mb2.maxHp + 999999, true);
      if (player.bossCratesQueued !== 1 || pendingCrates !== 1 || drops.some(d => d.kind === 'crate' && d.isBoss)) return false;

      // All 5 Summoned Altar Bosses (special_boss) must directly grant Boss Crates even when 3 regular crates are already queued, plus Mythic Phase-2 direct pod
      pendingCrates = 3; // Simulate 3 regular elite crates already queued
      player.bossCratesQueued = 0;
      player.mythicCratesQueued = 0;
      const variants = ['crimson_lord', 'golden_golem', 'mech_colossus', 'plague_empress', 'abyss_devourer'];
      for (let vi = 0; vi < variants.length; vi++) {
        const sb = createEnemy(player.x + 360, player.y + 220, 'special_boss', variants[vi]);
        sb.canPhase2 = false; sb._d5LastStandUsed = true;
        if (vi === 0) sb.mythicPhase2 = true; // Verify Mythic Phase-2 direct pod too
        hurtEnemy(sb, sb.maxHp + 999999, true);
      }
      if (player.bossCratesQueued !== 5 || player.mythicCratesQueued !== 1 || pendingCrates !== 9) return false;
      if (drops.some(d => d.kind === 'crate' && d.isBoss)) return false;

      // Endless Mode overtime summoned-boss kill -> immediate wave settlement MUST preserve Boss Crate & sweep ground regular crate
      wave = 19;
      beginWave();
      bossCutscene = null;
      enemies.length = 0; spawns.length = 0; drops.length = 0;
      pendingLevels = 0; pendingCrates = 0; player.bossCratesQueued = 0; player.mythicCratesQueued = 0;
      drops.push({ x: player.x + 420, y: player.y + 320, kind: 'crate', bob: 0 }); // Unpicked elite crate far away
      const otSummon = createEnemy(player.x + 420, player.y - 260, 'special_boss', 'golden_golem');
      otSummon.canPhase2 = false; otSummon._d5LastStandUsed = true;
      overtime = true; waveTime = 0;
      hurtEnemy(otSummon, otSummon.maxHp + 999999, true);
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      bossCutscene = null; pendingBossCutscene = null;
      update(0.016); // Triggers finishWave() -> settleSpireFloor() in Endless Mode!
      const settledOk = state === 'crate' && pendingCrates === 2 && player.bossCratesQueued === 1;
      // Restore clean wave state for subsequent checks
      pendingCrates = 0; player.bossCratesQueued = 0; player.mythicCratesQueued = 0;
      document.getElementById('crateMenu').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      wave = 20; state = 'wave'; beginWave();
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      bossCutscene = null; pendingBossCutscene = null;
      enemies.length = 0; spawns.length = 0; drops.length = 0;
      return settledOk;
    })();

    // v2.1.13: 4 Staff Spells + Survival True DMG (D1 10% -> D5 20%) + Colossal Black Hole + 5 Summon Altars + Dual-Boss Independent HP & Phase-2
    const v2113Ok = (() => {
      // 1) Survival Trial Unblockable True Damage Floor (D1=10% -> D5=20%, ignores dodge/armor/shield)
      if (Math.abs(getSurvivalTrueDmgFloorPct(1) - 0.10) > 1e-6) return false;
      if (Math.abs(getSurvivalTrueDmgFloorPct(5) - 0.20) > 1e-6) return false;
      survivalTrialWave = true;
      state = 'wave';
      selectedDiff = 1; diff = DIFFS[1];
      player.maxHp = 200; player.hp = 200; player.dodge = 0.90; player.armor = 999; player.shield = 120; player.invuln = 0;
      hurtPlayer(1, true, 'trap_sky_lance');
      if (player.hp > 180.01 || player.shield !== 120) return false; // 10% of 200 = 20 HP directly off HP, ignoring dodge/armor/shield!
      selectedDiff = 5; diff = DIFFS[5];
      player.hp = 200;
      hurtPlayer(1, true, 'trap_void_orb');
      if (player.hp > 160.01) return false; // 20% of 200 = 40 HP True Damage on D5!
      survivalTrialWave = false;
      player.dodge = 0; player.armor = 0; player.shield = 0; player.hp = 200;

      // 2) 5 Summon Boss Altars (including mech_colossus & plague_empress) & active in Story Mode
      if (!Array.isArray(SPECIAL_RELICS) || SPECIAL_RELICS.length !== 5) return false;
      const altarBossIds = SPECIAL_RELICS.map(r => r.bossId);
      if (!altarBossIds.includes('mech_colossus') || !altarBossIds.includes('plague_empress')) return false;
      const summMech = createEnemy(900, 700, 'special_boss', 'mech_colossus');
      const summEmp = createEnemy(1100, 700, 'special_boss', 'plague_empress');
      if (summMech.variant !== 'mech_colossus' || summEmp.variant !== 'plague_empress') return false;

      // 3) Dual Boss Independent Phase-2 Awakening & Independent HUD HP Bars
      enemies.length = 0; spawns.length = 0; spellZones.length = 0; bullets.length = 0; lightnings.length = 0; player.weapons = []; turrets.length = 0;
      const db1 = createEnemy(player.x + 180, player.y, 'boss', 'butcher');
      const db2 = createEnemy(player.x - 180, player.y, 'boss', 'frost_queen');
      db1.canPhase2 = true; db1.mythicPhase2 = false; db1.hp = Math.round(db1.maxHp * 0.72);
      db2.canPhase2 = true; db2.mythicPhase2 = false; db2.hp = Math.round(db2.maxHp * 0.41);
      if (!triggerBossMythicPhase2(db1)) return false;
      if (!triggerBossMythicPhase2(db2)) return false; // Second boss MUST ALSO awaken Phase 2 independently!
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      bossCutscene = null; pendingBossCutscene = null;
      if (!db1.mythicPhase2 || !db2.mythicPhase2) return false;
      db2.hp = Math.round(db2.maxHp * 0.45);
      hudAcc = 1.0;
      update(0.016);
      const bexEl = document.getElementById('bossExtraBars');
      if (!bexEl || bexEl.children.length < 1 || !bexEl.children[0].classList.contains('boss-sub-row') || !bexEl.textContent.includes('45%')) return false;

      // 4) 4 Staff True Spellcasting Skills + Canvas VFX render check
      enemies.length = 0; bullets.length = 0; spellZones.length = 0; lightnings.length = 0;
      const dummyA = createEnemy(player.x + 120, player.y, 'grunt');
      const dummyB = createEnemy(player.x + 195, player.y + 24, 'grunt');
      dummyA.hp = 99999; dummyA.maxHp = 99999;
      dummyB.hp = 99999; dummyB.maxHp = 99999;
      player.weapons = [
        { id: 'ember_staff', tier: 2, cd: 0 },
        { id: 'frost_scepter', tier: 2, cd: 0 },
        { id: 'storm_rod', tier: 2, cd: 0 },
        { id: 'chrono_staff', tier: 2, cd: 0 }
      ];
      update(0.02);
      const hasFireball = bullets.some(b => b.isFireball);
      const hasBlizzard = spellZones.some(z => z.kind === 'blizzard');
      const hasPoisonMist = spellZones.some(z => z.kind === 'poison_mist');
      const hasChainLightning = lightnings.length >= 2;
      if (!hasFireball || !hasBlizzard || !hasPoisonMist || !hasChainLightning) return 's4a:' + JSON.stringify({ hasFireball, hasBlizzard, hasPoisonMist, hasChainLightning });
      // Advance Chaos Meteor past 0.28s fall into rolling phase to spawn 'fire_patch' molten corridor
      const fb = bullets.find(b => b.isFireball);
      fb.meteorFallT = 0;
      update(0.05);
      if (!spellZones.some(z => z.kind === 'fire_patch')) return 's4b:' + JSON.stringify(spellZones.map(z => z.kind));

      // 5) Colossal Black Hole Gravity Skill (1.0s pre-suction warning + r >= 430 + suction nerfed by 60%)
      enemies.length = 0; terrains.length = 0; portals.length = 0;
      const bhBoss = createEnemy(900, 600, 'special_boss', 'abyss_devourer');
      bhBoss.arenaMechCd = 0.01;
      player.dashT = 0;
      player.x = 1260; player.y = 600;
      tickBossArenaMechanic(bhBoss, 0.02);
      if (!bhBoss.eclipseSingularity || bhBoss.eclipseSingularity.r < 430) return 's5a';
      if (!(bhBoss.eclipseSingularity.windupT >= 0.98)) return 's5b';
      // Ensure sanctuaries don't overlap player test position
      bhBoss.eclipseSingularity.s1x = 500; bhBoss.eclipseSingularity.s1y = 500;
      bhBoss.eclipseSingularity.s2x = 500; bhBoss.eclipseSingularity.s2y = 700;
      const distBefore = Math.hypot(bhBoss.x - player.x, bhBoss.y - player.y);
      // During the 1.0s warning phase, player must NOT be pulled yet!
      tickBossArenaMechanic(bhBoss, 0.50);
      draw(); // Verify 1.0s warning telegraph renders with 0 radialGradient & 0 shadowBlur!
      if (Math.abs(Math.hypot(bhBoss.x - player.x, bhBoss.y - player.y) - distBefore) > 1e-6) return 's5c';
      tickBossArenaMechanic(bhBoss, 0.50); // Finish the remaining 0.50s of the 1.0s warning
      if (bhBoss.eclipseSingularity.windupT !== 0) return 's5d';
      tickBossArenaMechanic(bhBoss, 0.20); // Now active suction ticks for 0.20s
      const distAfter = Math.hypot(bhBoss.x - player.x, bhBoss.y - player.y);
      const pulledDist = distBefore - distAfter;
      // Suction nerfed by 60% (* 0.40): ~15.9px pull in 0.20s (down from ~39.7px), noticeable yet escapable!
      if (!(pulledDist > 10 && pulledDist < 22)) return 's5e:' + pulledDist;
      bhBoss.sigWindupT = 0.5; bhBoss.sigMaxW = 0.9; bhBoss.sigKind = 'frost_prism';
      draw(); // Verify all new VFX (spellZones, blackHoleCore, sigWindupT, dual-boss overhead) render with 0 radialGradient & 0 shadowBlur!
      enemies.length = 0; spellZones.length = 0; bullets.length = 0;
      return true;
    })();

    // v2.1.14: D5 Floor 16 Guaranteed Phase-2 + Phase-2 Soul Fog + Last Stand Portrait & Fear (-15% Spd / +50% Dash CD) + Independent Structure Aspd (+20% Base = 1.20)
    const v2114Ok = (() => {
      // 1) Independent Structure Attack Speed (+20% base = 1.20, player atkSpd & techBonus must NOT affect turret fire rate!)
      player.weapons = [];
      player.atkSpd = 0;
      player.techBonus = 0;
      player.turretAspdBonus = 0;
      player.turretOverclockT = 0;
      const baseTurretAspd = getEffectiveTurretAspdMul(1);
      if (Math.abs(baseTurretAspd - 1.20) > 1e-6) return false;
      // Crank player atkSpd (+300%) and techBonus (+400%) -> turret attack speed MUST remain 1.20!
      player.atkSpd = 3.0;
      player.techBonus = 4.0;
      if (Math.abs(getEffectiveTurretAspdMul(1) - 1.20) > 1e-6) return false;
      // Dedicated turretAspdBonus (+32%) MUST scale turret attack speed cleanly
      player.turretAspdBonus = 0.32;
      if (Math.abs(getEffectiveTurretAspdMul(1) - +(1.20 * 1.32).toFixed(6)) > 1e-5) return false;
      player.atkSpd = 0; player.techBonus = 0; player.turretAspdBonus = 0;

      // 2) D5 Floor 16 Boss 100% Guaranteed Phase-2 (even in Endless Mode when Math.random is 0.9999) + Phase-2 Soul Fog
      endlessMode = true;
      state = 'wave';
      wave = 16;
      selectedDiff = 5; diff = DIFFS[5];
      enemies.length = 0;
      const origR = Math.random;
      Math.random = () => 0.999999;
      const f16Boss = createEnemy(player.x + 260, player.y, 'boss', 'solar_seraph');
      Math.random = origR;
      if (f16Boss.canPhase2 !== true) return false;
      waveTime = 60; overtime = false;
      if (isD5Floor16Phase2FogActive() !== false) return false;
      triggerBossMythicPhase2(f16Boss);
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      bossCutscene = null; pendingBossCutscene = null;
      if (!f16Boss.mythicPhase2 || isD5Floor16Phase2FogActive() !== true || isSoulFogActive() !== true) return 'v14_2a';
      update(0.5);
      if (!(survivalTrialState.fogIntroP > 0.40)) return 'v14_2b:' + survivalTrialState.fogIntroP;
      draw(); // Verify D5 Floor 16 Phase-2 Soul Fog + Boss Rim Compass render with 0 radialGradient & 0 shadowBlur!

      // 3) Last Stand Cut-in Portrait (works in Story Mode too!) + Player Fear (-15% Move Speed, +50% Dash Cooldown)
      endlessMode = false;
      player.spdMul = 1.0; player.noSlow = true; player.dashHasteT = 0; player.dashCdMul = 1; player.cls = 'allrounder';
      const spdBeforeFear = getEffectiveSpdMul();
      player.dashCd = 0; player.dashT = 0; bossCutscene = null;
      triggerSoulDash();
      const dashCdNormal = player.dashMaxCd;
      player.dashCd = 0; player.dashT = 0;

      f16Boss.hp = 10; f16Boss.dodge = 0;
      hurtEnemy(f16Boss, 99999, true);
      if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
      if (!bossCutscene && typeof pendingBossCutscene !== 'undefined' && pendingBossCutscene) {
        const pc = pendingBossCutscene; pendingBossCutscene = null;
        startBossCutscene(pc.mode, pc.variant, pc.title, pc.subtitle, pc.extraTag, pc.color, pc.accent, pc.dur, pc.extra);
      }
      if (!bossCutscene || bossCutscene.mode !== 'last_stand') return 'v14_3a';
      draw(); // Verify Story Mode Last Stand portrait renders cleanly!
      bossCutscene = null;
      if (!isBossLastStandFearActive()) return 'v14_3b';
      player.dashHasteT = 0;
      const spdDuringFear = getEffectiveSpdMul();
      if (Math.abs(spdDuringFear - spdBeforeFear * 0.85) > 1e-3) return 'v14_3c:' + spdDuringFear + '/' + spdBeforeFear;
      triggerSoulDash();
      const dashCdFeared = player.dashMaxCd;
      if (Math.abs(dashCdFeared - dashCdNormal * 1.50) > 1e-4) return 'v14_3d:' + dashCdFeared + '/' + dashCdNormal;

      player.noSlow = false; player.dashCd = 0; player.dashT = 0;
      enemies.length = 0; survivalTrialState.fogIntroP = 0;
      endlessMode = true;
      return true;
    })();

    const v219Breakdown = { hiddenBoostOk, earlyMobHpOk, trialGoldCompOk, tpWarnLadderOk, armorCurveOk, lifestealRuleOk, mobNeverBigCoin, bossHasBigCoin, postGameSummaryOk, goldAndRangedBoostOk, midWave6To10HpOk, diffRebalanceOk, distinctTelegraphsOk, pickupSweepMobBalanceOk, terrainDiffScaleOk, d5BossLastStandOk, bossMechanicsOverhaulOk, eliteFormsAndBossCastAnimOk, lateHealDropAndBoss16DodgeOk, twinBossSingleCrateOk, v2113Ok, v2114Ok };
    const v219Ok = Object.values(v219Breakdown).every(v => v === true);

    return {
      bootOnHome, storyViewShown, storyLockedToZero, returnedHome,
      endlessRosterCount, diffBtnsCount, sceneBtnsCount,
      combatHtmlOk, traitsHtmlOk, scenePaneShown, diffPaneRestored,
      keyDigitHero, keyArrowHero,
      endlessRangerOk, endlessShopTitle,
      hpAfterBossNuke, invulnAfterHit, consecutiveHitRegistered,
      wCnt, iCnt, hCnt, mCnt, sCnt, diedCleanly, retryOk,
      singleTerrainOk, frostTerrainOk, bossVenomAndP2Ok, midBulletBossKillOk, earlyTankShiftOk, needleShiftOk,
      survivalTrialOk, v219Ok, v219Breakdown
    };
  })()`, s);

  assert.strictEqual(coreCheck.bootOnHome, true, "Mobile & Desktop must boot onto uncluttered Main Title Screen");
  assert.strictEqual(coreCheck.storyViewShown, true, "Clicking Story Mode portal must open Story preparation stage");
  assert.strictEqual(coreCheck.storyLockedToZero, true, "Story Mode must strictly lock character to protagonist Zero ('allrounder')");
  assert.strictEqual(coreCheck.returnedHome, true, "showStart() must return cleanly to Main Title Screen");
  assert.strictEqual(coreCheck.endlessRosterCount, 6, "Endless Mode must expose all 6 Spire characters in symmetrical character tabs");
  assert.strictEqual(coreCheck.diffBtnsCount, 6, "Difficulty matrix must render 6 symmetrical D0..D5 buttons (3x2)");
  assert.strictEqual(coreCheck.sceneBtnsCount, 5, "Scene vista tabs must render 5 symmetrical cards (1 wide + 2x2)");
  assert.strictEqual(coreCheck.combatHtmlOk, true, "Hero dossier 'combat' tab must render armaments & Soul Dash specs");
  assert.strictEqual(coreCheck.traitsHtmlOk, true, "Hero dossier 'traits' tab must render structured positive/negative trait chips");
  assert.strictEqual(coreCheck.scenePaneShown, true, "Prep 'scene' tab must reveal #endlessScenePane and hide #endlessDiffPane");
  assert.strictEqual(coreCheck.diffPaneRestored, true, "Prep 'diff' tab must restore #endlessDiffPane cleanly");
  assert.strictEqual(coreCheck.keyDigitHero, "ranger", "Pressing '3' on Endless Mode must switch character tab to 3rd hero ('ranger')");
  assert.strictEqual(coreCheck.keyArrowHero, "engineer", "Pressing 'ArrowRight' on Endless Mode must advance character tab to 'engineer'");
  assert.strictEqual(coreCheck.endlessRangerOk, true, "Endless Mode must launch selected non-protagonist directly into endless run without story blocking");
  assert(coreCheck.endlessShopTitle.includes("无尽第 1 层"), `Endless Mode shop header must display endless floor label (got ${coreCheck.endlessShopTitle})`);
  assert(cssCombined.includes("@media") && cssCombined.includes("narrative"), "Narrative UI must include responsive styling; real viewport layout is reviewed separately in browser");
  assert.strictEqual(coreCheck.hpAfterBossNuke, 35, `Uncapped hit of 65 on 100 HP must leave 35 HP with no anti-oneshot lock (HP left: ${coreCheck.hpAfterBossNuke})`);
  assert.strictEqual(coreCheck.invulnAfterHit, 0, "Player must have ZERO invulnerability frames after taking damage");
  assert.strictEqual(coreCheck.consecutiveHitRegistered, true, "Back-to-back hits must immediately register damage without i-frame immunity");
  assert.strictEqual(coreCheck.wCnt, 42, "Codex must render 42 weapons (including 6 Staffs)");
  assert.strictEqual(coreCheck.iCnt, 172, "Codex must render 172 items");
  assert.strictEqual(coreCheck.hCnt, 6, "Codex must render 6 Spire heroes");
  assert.strictEqual(coreCheck.mCnt, 41, "Codex must render all 41 unique Spire monsters, commanders & bosses");
  assert.strictEqual(coreCheck.sCnt, 4, "Codex must render 4 Spire scenes");
  assert.strictEqual(coreCheck.diedCleanly, true, "Multi-hit lethal damage must transition to end state");
  assert.strictEqual(coreCheck.retryOk, true, "retryFailedWave() on Floor 8 must restore exact checkpoint and fixed Boss frost_queen");
  assert.strictEqual(coreCheck.singleTerrainOk, true, "Every scene must strictly spawn only ONE terrain element kind (including Boss terrain skills)");
  assert.strictEqual(coreCheck.frostTerrainOk, true, "Frost terrain must progressively slow player over 5s into 1s freeze, wait 1s after leaving before decaying, and slow monsters by 20% without freezing");
  assert.strictEqual(coreCheck.bossVenomAndP2Ok, true, "Venom Boss must cast pressurized venom breath spray and Boss hidden Phase-2 must unlock exclusive ultimate skill");
  assert.strictEqual(coreCheck.midBulletBossKillOk, true, "Killing Story Boss mid-bullet-loop must transition cleanly to story state without undefined.x crash");
  assert.strictEqual(coreCheck.earlyTankShiftOk, true, "Waves 1..10 must reduce tanky melee by 15%, keep ranged unchanged, and increase ordinary fodder mobs");
  assert.strictEqual(coreCheck.needleShiftOk, true, "White-needle ranged monsters must be reduced by 30% with freed weight transferred 1:1 to melee");
  assert.strictEqual(coreCheck.survivalTrialOk, true, "Survival Trial must enforce 40s duration, 7 trap types (+50% density/+20% dmg), opaque mist Soul Lantern culling 100% outer mobs, live coupon discount, upper-torso bullet hits, and Purple+ crates");
  assert.strictEqual(coreCheck.v219Ok, true, "v2.1.9+ checks failed: " + JSON.stringify(Object.entries(coreCheck.v219Breakdown).filter(([, v]) => v !== true)));
  assert(els.retryWaveBtn.textContent.includes("重试"), "Player defeat must offer a floor retry control");
  assert.strictEqual(stats.radialGradients, 0, "Mobile combat & UI suite must create ZERO per-frame radial gradients");
  assert.strictEqual(stats.shadowBlurs, 0, "Mobile combat & UI suite must use ZERO shadowBlur");
  assert.strictEqual(vm.runInContext("logErrCount", s), 0, "Zero runtime errors in Suite 4");

  // v2.1.15 Mobile Resilience Check: WebKit 2D Canvas exhaustion fallback + transient image error auto-retry + BootGate progressive unlock
  const mobResilience = vm.runInContext(`(() => {
    // 1) Simulate iOS Safari 2D context exhaustion: createElement('canvas').getContext('2d') returns null
    const origCreate = document.createElement.bind(document);
    let nullCtxActive = true;
    document.createElement = function (tag) {
      const el = origCreate(tag);
      if (String(tag).toLowerCase() === 'canvas' && nullCtxActive) {
        el.getContext = () => null;
      }
      return el;
    };
    let allMonstersReadyUnderExhaustion = true;
    try {
      const sampleTypes = ['chaser', 'charger', 'frost_knight', 'sand_worm', 'rad_scorpion', 'brute', 'juggernaut', 'spore_mother'];
      for (const tp of sampleTypes) {
        const sNorm = SpireAssets.getMonsterSprite({ type: tp, elite: false }, false);
        const sFlash = SpireAssets.getMonsterSprite({ type: tp, elite: false }, true);
        const sElite = SpireAssets.getMonsterSprite({ type: tp, elite: true, eliteKind: 'frenzy' }, false);
        if (!sNorm || !sNorm.canvas || !sFlash || !sFlash.canvas || !sElite || !sElite.canvas) {
          allMonstersReadyUnderExhaustion = false;
        }
      }
    } finally {
      nullCtxActive = false;
      document.createElement = origCreate;
    }

    // 2) Simulate transient cellular network drop on 1st attempt -> must auto-retry and succeed!
    const OrigImg = Image;
    let attempts = 0;
    globalThis.Image = class FlakyMobileImage extends OrigImg {
      set src(val) {
        attempts++;
        if (attempts === 1) {
          this._src = String(val || '');
          if (typeof this.onerror === 'function') this.onerror();
          return;
        }
        super.src = val;
      }
    };
    let retryRecovered = false;
    try {
      SpireAssets.loadImage('assets/spire/mob_sand_worm.png?test_flaky_1', img => {
        retryRecovered = !!(img && img.naturalWidth > 0);
      });
    } finally {
      globalThis.Image = OrigImg;
    }

    const versionedUrl = SpireAssets.resolve('assets/spire/mob_chaser.png');
    return {
      allMonstersReadyUnderExhaustion,
      retryRecovered,
      attemptsAtLeast2: attempts >= 2,
      hasVersionQuery: versionedUrl.includes('?v='),
      hasWarmWave: typeof SpireAssets.warmWave === 'function' && typeof SpireAssets.getBossSheet === 'function'
    };
  })()`, s);
  assert.strictEqual(mobResilience.allMonstersReadyUnderExhaustion, true, "Mobile monsters must still render real sprites (never degrade into colored balls) even when offscreen canvas getContext('2d') returns null");
  assert.strictEqual(mobResilience.retryRecovered, true, "SpireAssets.loadImage must auto-retry transient mobile network drops");
  assert.strictEqual(mobResilience.attemptsAtLeast2, true, "Transient failure must trigger retry attempt");
  assert.strictEqual(mobResilience.hasVersionQuery, true, "SpireAssets.resolve must append ?v= version tag to prevent broken partial cache");
  assert.strictEqual(mobResilience.hasWarmWave, true, "SpireAssets must expose warmWave and getBossSheet");

  // v2.1.16 Mobile Multi-Touch Move + Dash Non-Conflict Check
  const touchConflictCheck = vm.runInContext(`(() => {
    state = 'wave';
    bossCutscene = null;
    player.hp = player.maxHp;
    player.dashCd = 0;
    player.dashT = 0;
    player.vx = 0;
    player.vy = 0;
    // Simulate fleeing LEFT (moveA = PI) while nearest monster is to the RIGHT (lookA = 0)
    player.moveA = Math.PI;
    player.lookA = 0;
    joy.active = false;
    joy.lastAt = 0;
    const fired1 = triggerSoulDash();
    const fledLeftNotIntoBoss = fired1 && player.dashVx < -500;

    // Simulate active left-thumb joystick pointing UP-LEFT while right-thumb triggers dash via handleDashTouchClick
    player.dashCd = 0;
    player.dashT = 0;
    joy.active = true;
    joy.id = 11;
    joy.dx = -0.8;
    joy.dy = -0.6;
    joy.mag = 1;
    joy.lockedMove = true;
    _lastTouchDashAt = 0;
    const fired2 = handleDashTouchClick(null);
    const joyStillIntact = joy.active === true && joy.id === 11 && joy.dx === -0.8;
    const dashedAlongJoy = fired2 && player.dashVx < -400 && player.dashVy < -300;
    resetJoy();
    return { fledLeftNotIntoBoss, joyStillIntact, dashedAlongJoy };
  })()`, s);
  assert.strictEqual(touchConflictCheck.fledLeftNotIntoBoss, true, "Releasing thumb before tapping Dash must dash along player.moveA (escape direction), NEVER into nearest monster (player.lookA)");
  assert.strictEqual(touchConflictCheck.joyStillIntact, true, "Triggering mobile Dash while moving must keep active joystick untouched");
  assert.strictEqual(touchConflictCheck.dashedAlongJoy, true, "Mobile Dash while moving must dash along active joystick vector");

  // v2.1.21 Mobile Tap-Anywhere Narrative, Zero-Permanent-Canvas Sprite Loader & -20% Mob / +20% Gold Balance Check
  const narCssRaw = fs.readFileSync(path.join(ROOT, "styles/narrative.css"), "utf8");
  assert(
    narCssRaw.includes("body.m-ui .spire-narrative .story-next,body.m-ui .spire-narrative .story-cinematic-next{display:none!important}"),
    "Mobile narrative CSS must hide bottom-right .story-next and .story-cinematic-next buttons"
  );
  const v2121MobileCheck = vm.runInContext(`(() => {
    // 1) Verify mobile story tap-anywhere advances cinematic & dialogue without clicking .story-next / .story-cinematic-next
    SpireDirector.resetForNewRun();
    endlessMode = false;
    SpireDirector.onWaveStart(1);
    const narRoot = document.getElementById('spireNarrative');
    const cinCaption = narRoot.querySelector('.story-cinematic-caption');
    const cinP = cinCaption.querySelector('p');
    // Tap cinematic caption paragraph: 1st tap reveals full line, 2nd tap advances!
    SpireDirector.setPreferences({ instantText: true });
    const beforeKind = narRoot.getAttribute('data-kind');
    cinP.dispatch('click', { bubbles: true, detail: 1 });
    cinCaption.dispatch('click', { bubbles: true, detail: 1 });
    // Advance until dialogue scene and tap footer / speaker row (not .story-next!)
    let safety = 0;
    while (SpireDirector.isActive() && narRoot.getAttribute('data-kind') !== 'dialogue' && safety++ < 12) {
      narRoot.dispatch('click', { bubbles: true, detail: 1 });
    }
    const reachedDialogue = narRoot.getAttribute('data-kind') === 'dialogue';
    const dlgProgBefore = narRoot.querySelector('.story-line-count').textContent;
    const footerEl = narRoot.querySelector('.story-dialogue-footer');
    footerEl.dispatch('click', { bubbles: true, detail: 1 });
    const dlgProgAfter = narRoot.querySelector('.story-line-count').textContent;
    while (SpireDirector.isActive() && safety++ < 40) {
      narRoot.dispatch('click', { bubbles: true, detail: 1 });
    }

    // 2) Verify ensureSpriteEntry uses decoded HTMLImageElement directly (0 permanent offscreen <canvas>)
    const chaserSpr = SpireAssets.getMonsterSprite({ type: 'chaser', elite: false }, false);
    const normalUsesDirectImg = !!(chaserSpr && chaserSpr.canvas && chaserSpr.canvas.tagName !== 'CANVAS' && chaserSpr.rawImg === chaserSpr.canvas);
    const hasPendingApi = typeof SpireAssets.hasPendingHiLoads === 'function';

    // 3) Verify Mobile -20% Monster Count & +20% Monster Gold Yield vs Desktop
    wave = 1;
    survivalTrialWave = false;
    setUIPref('mobile');
    const mobBalOn = isMobileCombatBalance() === true && MOBILE_MOB_COUNT_MUL === 0.80 && MOBILE_GOLD_YIELD_MUL === 1.20;
    enemies.length = 0;
    const mobStalker = createEnemy(400, 400, 'stalker');
    const mobBoss = createEnemy(500, 500, 'boss', 'butcher');
    const mobMat = mobStalker.mat;
    const mobBossMat = mobBoss.mat;

    setUIPref('desktop');
    const deskBalOff = isMobileCombatBalance() === false;
    enemies.length = 0;
    const deskStalker = createEnemy(400, 400, 'stalker');
    const deskBoss = createEnemy(500, 500, 'boss', 'butcher');
    const deskMat = deskStalker.mat;
    const deskBossMat = deskBoss.mat;
    setUIPref('auto');

    return {
      beforeKind,
      reachedDialogue,
      footerTapAdvanced: dlgProgBefore !== dlgProgAfter,
      normalUsesDirectImg,
      hasPendingApi,
      mobBalOn,
      deskBalOff,
      goldPlus20Exact: Math.abs(mobMat - deskMat * 1.20) < 1e-6,
      bossMatUnchanged: mobBossMat === deskBossMat
    };
  })()`, s);
  assert.strictEqual(v2121MobileCheck.reachedDialogue, true, "Tapping anywhere on mobile #spireNarrative must advance through cinematic scenes into dialogue");
  assert.strictEqual(v2121MobileCheck.footerTapAdvanced, true, "Tapping dialogue footer (with .story-next hidden) must advance dialogue on mobile");
  assert.strictEqual(v2121MobileCheck.normalUsesDirectImg, true, "Monster normalView must draw decoded HTMLImageElement directly without allocating permanent 2D canvases");
  assert.strictEqual(v2121MobileCheck.hasPendingApi, true, "SpireAssets must expose hasPendingHiLoads()");
  assert.strictEqual(v2121MobileCheck.mobBalOn, true, "Mobile UI mode must activate MOBILE_MOB_COUNT_MUL=0.80 and MOBILE_GOLD_YIELD_MUL=1.20");
  assert.strictEqual(v2121MobileCheck.deskBalOff, true, "Desktop UI mode must keep isMobileCombatBalance()===false");
  assert.strictEqual(v2121MobileCheck.goldPlus20Exact, true, "Mobile non-boss monsters must yield +20% gold/crystal mat compared to desktop");
  assert.strictEqual(v2121MobileCheck.bossMatUnchanged, true, "Boss crystal reward must remain identical between mobile and desktop");

  // v2.1.22 Ice Terrain Overhead Label, Boss Pylon +20% 20s Armor Break & 20s Respawn, and Boss Cross/Line Beam Length Scaling (D1=1.00x -> D5=1.30x)
  const rendererRaw = fs.readFileSync(path.join(ROOT, "src/render/renderer.js"), "utf8");
  assert(!rendererRaw.includes("疾滑加速"), "Outdated '疾滑加速' ice terrain label must be completely removed from renderer.js");
  assert(rendererRaw.includes("🧊 寒晶方砖台 (寒缓冰封)"), "Ice terrain label in renderer.js must read '🧊 寒晶方砖台 (寒缓冰封)'");

  const v2122Check = vm.runInContext(`(() => {
    const m0 = getBossBeamLenMul(DIFFS[0]);
    const m1 = getBossBeamLenMul(DIFFS[1]);
    const m2 = getBossBeamLenMul(DIFFS[2]);
    const m3 = getBossBeamLenMul(DIFFS[3]);
    const m4 = getBossBeamLenMul(DIFFS[4]);
    const m5 = getBossBeamLenMul(DIFFS[5]);
    const ladderOk = (
      Math.abs(m0 - 1.00) < 1e-9 &&
      Math.abs(m1 - 1.00) < 1e-9 &&
      Math.abs(m2 - 1.075) < 1e-9 &&
      Math.abs(m3 - 1.15) < 1e-9 &&
      Math.abs(m4 - 1.225) < 1e-9 &&
      Math.abs(m5 - 1.30) < 1e-9
    );

    // Concrete reach check: frost_queen rotating 4-way cross beam (base 380px -> D5 494px) at 420px player distance
    const prevDiff = diff;
    startGame('allrounder', { mode: 'endless' });
    if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
    bossCutscene = null; pendingBossCutscene = null; spireFloorFlow = null;
    state = 'wave'; wave = 8; waveTime = 60; overtime = false;
    enemies.length = 0; spawns.length = 0;
    trees.length = 0; eBullets.length = 0; hazards.length = 0; terrains.length = 0; resetJoy();
    for (const k of Object.keys(keys)) keys[k] = false;
    const fq = createEnemy(700, 700, 'boss', 'frost_queen');
    fq.hp = fq.maxHp = 999999; fq.dodge = 0;
    player.x = 700 + 420;
    player.y = 700;
    player.dodge = 0;
    player.armor = 0;
    player.invuln = 0;
    player.hp = player.maxHp;

    diff = DIFFS[1]; selectedDiff = 1;
    fq.beamSweepQuad = true;
    fq.beamSweepT = 1.0;
    fq.beamSweepA = 0;
    fq._beamHitCd = 0;
    const hpBeforeD1 = player.hp;
    update(0.016);
    const d1MissedAt420 = (player.hp === hpBeforeD1);

    diff = DIFFS[5]; selectedDiff = 5;
    fq.beamSweepQuad = true;
    fq.beamSweepT = 1.0;
    fq.beamSweepA = 0;
    fq._beamHitCd = 0;
    player.x = 700 + 420;
    player.y = 700;
    player.invuln = 0;
    const hpBeforeD5 = player.hp;
    update(0.016);
    const d5HitAt420 = (player.hp < hpBeforeD5);

    // Boss Pylon Break: +20% true vulnerability for 20s & strict 20s respawn lock
    diff = DIFFS[1]; selectedDiff = 1;
    trees.length = 0;
    fq.pylonBrokenT = 0;
    fq.pylonRespawnCd = 0;
    spawnBossPylon(fq, 'cryo_obelisk', fq.x, fq.y - 176);
    spawnBossPylon(fq, 'cryo_obelisk', fq.x, fq.y + 176);
    const spawned2 = trees.filter(p => p && p.isBossPylon && p.hp > 0 && p.owner === fq).length === 2;
    for (const p of [...trees]) {
      if (p && p.isBossPylon && p.owner === fq) hurtTree(p, 999999);
    }
    if (typeof SpireDirector !== 'undefined') SpireDirector.abortActive();
    const broken20s = Math.abs(fq.pylonBrokenT - 20.0) < 1e-6 && Math.abs(fq.pylonRespawnCd - 20.0) < 1e-6;
    fq.hp = fq.maxHp = 100000;
    fq.exposeT = 0; fq.sunderT = 0;
    hurtEnemy(fq, 100, false, null, true);
    const baseTakenWithBreak = 100000 - fq.hp;
    fq.pylonBrokenT = 0;
    const hpMid = fq.hp;
    hurtEnemy(fq, 100, false, null, true);
    const baseTakenNormal = hpMid - fq.hp;
    const plus20Exact = Math.abs(baseTakenWithBreak - Math.round(baseTakenNormal * 1.20)) <= 1;

    diff = prevDiff;
    return { ladderOk, d1MissedAt420, d5HitAt420, spawned2, broken20s, plus20Exact };
  })()`, s);
  assert.strictEqual(v2122Check.ladderOk, true, "getBossBeamLenMul must scale linearly from 1.00x at D1 to 1.30x (+30%) at D5");
  assert.strictEqual(v2122Check.d1MissedAt420, true, "D1 frost_queen cross beam (380px) must NOT hit player standing at 420px");
  assert.strictEqual(v2122Check.d5HitAt420, true, "D5 frost_queen cross beam (494px, +30%) MUST hit player standing at 420px");
  assert.strictEqual(v2122Check.spawned2, true, "spawnBossArenaPillars must summon 2 cryo_obelisk pillars");
  assert.strictEqual(v2122Check.broken20s, true, "Breaking all pillars must set pylonBrokenT=20.0s and pylonRespawnCd=20.0s");
  assert.strictEqual(v2122Check.plus20Exact, true, "pylonBrokenT must increase boss damage taken by +20%");
}

// ============================================================================
// Suite 5: Standalone Single-File Offline Bundle (`烬塔残响_单文件离线版.html`) Verification
// ============================================================================
{
  const singlePath = path.join(os.tmpdir(), `spire_singlefile_verify_${process.pid}.html`);
  const tempBuilt = true;
  execFileSync(process.execPath, [path.join(ROOT, "scripts/build-singlefile.mjs"), "--out", singlePath], { stdio: "ignore" });
  try {
    assert(fs.existsSync(singlePath), "Single-file bundle HTML must exist");
    const singleHtml = fs.readFileSync(singlePath, "utf8");
    assert(!/<script\s+defer\s+src=/.test(singleHtml), "Single-file HTML must not leave external <script defer src=...> tags");
    assert(!/<link\s+rel="stylesheet"/.test(singleHtml), "Single-file HTML must not leave external stylesheet links");
    assert(!/\b(?:src|href)="assets\//.test(singleHtml), "Single-file HTML must inline all static HTML src/href asset references");

    const scripts = [...singleHtml.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.strictEqual(scripts.length, 2, "Single-file HTML should contain 2 inline <script> blocks (inline assets + game bundle)");
    new vm.Script(scripts[0], { filename: "singlefile_inline_assets.js" });
    new vm.Script(scripts[1], { filename: "singlefile_game_bundle.js" });

    const assetCheckBox = { window: {} };
    vm.createContext(assetCheckBox);
    vm.runInContext(scripts[0], assetCheckBox);
    const map = assetCheckBox.window.__SPIRE_INLINE_ASSETS__;
    assert(map && typeof map === "object", "window.__SPIRE_INLINE_ASSETS__ must be populated");
    for (const key of [
      "assets/spire/port_zero.jpg", "assets/spire/port_jinyu.jpg", "assets/spire/port_astria.jpg",
      "assets/spire/port_zero_witch.jpg", "assets/spire/port_zero_crimson.jpg", "assets/spire/port_zero_astral.jpg",
      "assets/spire/hero_zero_witch_sheet.png", "assets/spire/hero_zero_crimson_sheet.png", "assets/spire/hero_zero_astral_sheet.png",
      "assets/spire/port_jialan.jpg", "assets/spire/port_qingyu.jpg", "assets/spire/port_eclipse.jpg",
      "assets/spire/hero_zero_sheet.png", "assets/spire/hero_jinyu_sheet.png", "assets/spire/hero_astria_sheet.png",
      "assets/spire/hero_jialan_sheet.png", "assets/spire/hero_qingyu_sheet.png", "assets/spire/hero_eclipse_sheet.png",
      "assets/spire/scene_1_arena.jpg", "assets/spire/scene_2_arena.jpg", "assets/spire/scene_3_arena.jpg", "assets/spire/scene_4_arena.jpg",
      "assets/spire/v2/title-clean.png", "assets/spire/v2/wind-pavilion.png", "assets/spire/v2/player-defeat-clean.png",
      "assets/spire/v2/awakening-atlas.png", "assets/spire/v2/jinyu-atlas.png", "assets/spire/v2/endings-atlas.png",
      ...V21_CINEMATIC_FILES
    ]) {
      assert(typeof map[key] === "string" && map[key].startsWith("data:image/"), `Single-file bundle missing inline data URI for ${key}`);
    }
    for (const wavKey of [
      "assets/audio/scene_foundry_rain.wav",
      "assets/audio/scene_foundry_phase2.wav",
      "assets/audio/scene_glacier_frost.wav",
      "assets/audio/scene_glacier_phase2.wav",
      "assets/audio/scene_wasteland_clock.wav",
      "assets/audio/scene_wasteland_phase2.wav",
      "assets/audio/scene_desert_eclipse.wav",
      "assets/audio/scene_desert_phase2.wav"
    ]) {
      assert(typeof map[wavKey] === "string" && map[wavKey].startsWith("data:audio/"), `Single-file bundle must inline scene audio WAV asset: ${wavKey}`);
    }
  } finally {
    if (tempBuilt && fs.existsSync(singlePath)) fs.unlinkSync(singlePath);
  }
}

// Ensure every static assets/... literal in HTML, manifest, CSS, and JS modules exists on disk
{
  const scanFiles = [
    path.join(ROOT, "index.html"),
    path.join(ROOT, "manifest.json"),
    ...cssFiles.map(f => path.join(ROOT, f)),
    ...jsFiles.map(f => path.join(ROOT, f))
  ];
  for (const fp of scanFiles) {
    const raw = fs.readFileSync(fp, "utf8");
    const clean = fp.endsWith(".js")
      ? raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")
      : raw;
    for (const m of clean.matchAll(/["'`](assets\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?:\?[^"'`]*)?["'`]/g)) {
      const relAsset = m[1];
      let absAsset = path.join(ROOT, relAsset);
      if (!fs.existsSync(absAsset) && /^assets\/spire\/v[23]\/.+\.png$/i.test(relAsset)) {
        absAsset = path.join(ROOT, relAsset.slice(0, -4) + ".jpg");
      }
      assert(fs.existsSync(absAsset) && fs.statSync(absAsset).size > 0, `Referenced asset missing on disk in ${path.relative(ROOT, fp)}: ${relAsset}`);
    }
  }
}

// v2.2.0 专项回归：核心模块体量拆分、42兵装×84神话进化、138圣遗物金字塔分布、全遗物专属高清贴图与无错用斧头贴图、跨流派核心新机制验证
{
  const updLineCnt = fs.readFileSync(path.join(ROOT, "src/game/update.js"), "utf8").split("\n").length;
  const rndLineCnt = fs.readFileSync(path.join(ROOT, "src/render/renderer.js"), "utf8").split("\n").length;
  assert(updLineCnt < 3400, `update.js must stay modularized below 3400 lines (got ${updLineCnt})`);
  assert(rndLineCnt < 2600, `renderer.js must stay modularized below 2600 lines (got ${rndLineCnt})`);

  const env220 = createEnv(false, 1440, 900, 2);
  const v220Res = vm.runInContext(`(() => {
    const tCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const seenIds = new Set();
    for (const it of ITEMS) {
      if (!it || !it.id || seenIds.has(it.id)) return { ok: false, reason: 'Duplicate or missing item id: ' + (it && it.id) };
      seenIds.add(it.id);
      tCounts[it.tier] = (tCounts[it.tier] || 0) + 1;
      if (it.icon === '🪓') return { ok: false, reason: 'Item still uses mismatched axe emoji: ' + it.id };
      if (!RELIC_ART_SPECS[it.id]) return { ok: false, reason: 'Missing RELIC_ART_SPECS for item: ' + it.id };
      const url = getItemArtDataUrl(it.id, it.tier);
      if (!url || !url.startsWith('data:image/')) return { ok: false, reason: 'Failed getItemArtDataUrl for: ' + it.id };
    }
    for (const sup of CRATE_SUPPLIES) {
      if (!RELIC_ART_SPECS[sup.id] || !getItemArtDataUrl(sup.id, sup.tier).startsWith('data:image/')) {
        return { ok: false, reason: 'Missing supply art for: ' + sup.id };
      }
    }
    for (const cloakId of ['lumber', 'sniper_cloak', 'jetpack', 'bat', 'qingyu_hoodie']) {
      if (RELIC_ART_SPECS[cloakId][0] !== 'cloak') return { ok: false, reason: 'Cloak item not mapped to cloak archetype: ' + cloakId };
    }
    if (RELIC_ART_SPECS.whetstone[0] !== 'whetstone') return { ok: false, reason: 'whetstone not mapped to whetstone archetype' };
    if (tCounts[1] !== 44 || tCounts[2] !== 55 || tCounts[3] !== 49 || tCounts[4] !== 24) {
      return { ok: false, reason: 'Unexpected item tier pyramid: ' + JSON.stringify(tCounts) };
    }
    const newRelicIds = ['blade_gaiters', 'brass_recoil_spring', 'buckshot_bandolier', 'twin_feeder', 'azure_kote', 'crescent_tassel', 'dragon_piercer_ammo', 'asura_wardrum', 'kenshin_scroll', 'celestial_arsenal_box', 'silver_medal', 'glass_cannon_core', 'wisdom_scroll', 'lone_war_banner', 'vigilante_ring', 'mithril_alloy', 'abyss_twin_embryo', 'ironblood_grit', 'flow_metronome'];
    for (const nrId of newRelicIds) {
      if (!ITEMS.some(x => x.id === nrId)) return { ok: false, reason: 'Missing new balance relic: ' + nrId };
    }

    for (const [wid, wdef] of Object.entries(WEAPONS)) {
      for (const t of [1, 4, 5]) {
        const wUrl = getWeaponArtDataUrl(wid, t, t === 5 && wdef.evos && wdef.evos[0] ? wdef.evos[0].id : '');
        if (!wUrl || !wUrl.startsWith('data:image/')) return { ok: false, reason: 'Failed getWeaponArtDataUrl for: ' + wid + ' T' + t };
      }
    }
    const wVals = Object.values(WEAPONS);
    const primCnt = wVals.filter(w => w.set === 'primitive').length;
    const gunCnt = wVals.filter(w => w.set === 'gun').length;
    if (primCnt < 6 || gunCnt < 6) return { ok: false, reason: 'Expected >=6 primitive & gun weapons, got ' + primCnt + '/' + gunCnt };

    // 实战演练 6 把新兵装开火与法阵坍缩 + 核心新遗物数值转化与免死涅槃
    selectedDiff = 1;
    startGame('brawler', { mode: 'endless' });
    state = 'wave';
    bossCutscene = null;
    player.x = WORLD.w * 0.5;
    player.y = WORLD.h * 0.5;
    player.weapons = [
      makeWeapon('bone_boomerang', 3),
      makeWeapon('pulse_carbine', 3),
      makeWeapon('obsidian_flail', 3),
      makeWeapon('gale_twinbow', 3),
      makeWeapon('crimson_siphon_staff', 3),
      makeWeapon('singularity_scepter', 3)
    ];
    for (const w of player.weapons) w.cd = 0;
    enemies.length = 0;
    const dummy = createEnemy(player.x + 88, player.y, 'brute');
    dummy.maxHp = 9000; dummy.hp = 9000;

    // 1) 新遗物转化校验：疾风超导发条炉 + 青羽暗影连帽衫 + 鲜血契约圣印 + 金丝藏晶衬垫 + 逆命双生沙漏
    const baseDmg0 = getEffectiveDmgMul();
    player.spdMul = 1.30;
    ITEMS.find(x => x.id === 'wind_dynamo').apply(player);
    const spdDmg1 = getEffectiveDmgMul();
    const baseAspd0 = getEffectiveAtkSpd();
    player.dodge = 0.50;
    ITEMS.find(x => x.id === 'qingyu_hoodie').apply(player);
    const dodgeAspd1 = getEffectiveAtkSpd();
    ITEMS.find(x => x.id === 'blood_covenant').apply(player);
    const lsDmg1 = getEffectiveDmgMul();
    const hpBeforePad = player.maxHp;
    player.mats = 240;
    ITEMS.find(x => x.id === 'padding_lining').apply(player);
    syncSetHp();
    const hpAfterPad = player.maxHp;
    const slots0 = player.maxSlots;
    ITEMS.find(x => x.id === 'twin_hourglass').apply(player);
    const slots1 = player.maxSlots;

    // 2) 随身发条母盒：击碎地图器物原地生成炮台
    ITEMS.find(x => x.id === 'pocket_factory').apply(player);
    const propTree = { x: player.x - 90, y: player.y, r: 21, hp: 5, maxHp: 5, hitFlash: 0, sway: 0 };
    trees.push(propTree);
    const tBefore = turrets.length;
    hurtTree(propTree, 50);
    const pocketTurretOk = turrets.length === tBefore + 1;

    // 3) 绯红真祖圣爵（满血汲血转猩红血盾）+ 不死鸟涅槃血羽（免死浴火重生）
    ITEMS.find(x => x.id === 'crimson_grail').apply(player);
    player.lifesteal = 1.0;
    player.hp = player.maxHp;
    player._lifestealCd = 0;
    const oldRand = Math.random;
    Math.random = () => 0.01;
    try {
      hurtEnemy(dummy, 25, false, 0, true, { srcId: 'katana' });
    } finally {
      Math.random = oldRand;
    }
    const bloodShieldOk = (player._bloodShieldPool || 0) >= 1;

    ITEMS.find(x => x.id === 'phoenix_blood_feather').apply(player);
    player.dodge = 0;
    player.shield = 0;
    player._bloodShieldPool = 0;
    player.hp = 2;
    hurtPlayer(999, false, dummy);
    const phoenixSavedOk = state === 'wave' && player.hp >= Math.round(player.maxHp * 0.45);

    // 4) 推进帧循环（含玩家移动预判射击 shooter/mortar/crimson_lord），验证全部 6 把新兵装真实开火且 update/draw 0 报错
    const eShooter = createEnemy(player.x + 210, player.y - 40, 'shooter');
    const eMortar = createEnemy(player.x - 240, player.y + 30, 'mortar');
    const eCrimson = createEnemy(player.x + 250, player.y + 80, 'special_boss', 'crimson_lord');
    eShooter.hp = 9000; eShooter.shotT = 0.02;
    eMortar.hp = 9000; eMortar.shotT = 0.02;
    eCrimson.hp = 90000; eCrimson.meteorT = 0.02;
    keys['d'] = true;
    for (let step = 0; step < 35; step++) {
      player.hp = player.maxHp;
      update(0.05);
    }
    keys['d'] = false;
    draw();
    const dealtMap = (player.runStats && player.runStats.weaponDmg) || {};
    const allNewWpnsDealt = ['bone_boomerang', 'pulse_carbine', 'obsidian_flail', 'gale_twinbow', 'crimson_siphon_staff', 'singularity_scepter']
      .every(k => dealtMap[k] && dealtMap[k].dmg > 0);

    // 5) v2.2.2 吃伤乘区标签校验：冰棱同时标【远程+元素】、法杖标【法杖+元素】且绝不标远程、钉铳标【远程+工程】、流星锤标【近战+护甲+爆破】
    const icicleTags = renderWeaponScalingBadgesHtml(WEAPONS.icicle, 'icicle');
    const staffTags = renderWeaponScalingBadgesHtml(WEAPONS.ember_staff, 'ember_staff');
    const chronoTags = renderWeaponScalingBadgesHtml(WEAPONS.chrono_staff, 'chrono_staff');
    const nailTags = renderWeaponScalingBadgesHtml(WEAPONS.nailgun, 'nailgun');
    const flailTags = renderWeaponScalingBadgesHtml(WEAPONS.obsidian_flail, 'obsidian_flail');
    const glassesTags = renderRelicScopeBadgesHtml(ITEMS.find(x => x.id === 'glasses'));
    const scalingBadgesOk = (
      icicleTags.includes('远程') && icicleTags.includes('元素') &&
      staffTags.includes('法杖') && staffTags.includes('元素') && !staffTags.includes('🔫远程') &&
      chronoTags.includes('法杖') && chronoTags.includes('元素') && chronoTags.includes('工程') && chronoTags.includes('产建筑') &&
      nailTags.includes('远程') && nailTags.includes('工程') &&
      flailTags.includes('近战') && flailTags.includes('护甲') && flailTags.includes('爆破') &&
      glassesTags.includes('远程有效')
    );
    openShop(true);
    // 6) Brotato 式随身兵装点击浮窗校验：点击槽位绝不直接卖掉武器，而是弹出合成/回收浮窗
    player.weapons = [makeWeapon('icicle', 2), makeWeapon('icicle', 2), makeWeapon('katana', 3)];
    renderShop();
    const slot0 = document.getElementById('weaponSlots').children[0];
    slot0.click();
    const clickDidNotAutoSell = player.weapons.length === 3 && isWeaponSlotModalOpen();
    combineWeaponSlotFromModal(0);
    const modalMergedOk = player.weapons.length === 2 && player.weapons[0].tier === 3 && !isWeaponSlotModalOpen();
    const matsBeforeRec = player.mats;
    openWeaponSlotModal(1);
    recycleWeaponSlotFromModal(1);
    const modalRecycledOk = player.weapons.length === 1 && player.mats > matsBeforeRec && !isWeaponSlotModalOpen();
    const lastWeaponProtectedOk = recycleWeaponSlotFromModal(0) === false && player.weapons.length === 1;
    const brotatoSlotUxOk = clickDidNotAutoSell && modalMergedOk && modalRecycledOk && lastWeaponProtectedOk;

    openCodex('weapons');
    openCodex('items');
    closeCodex();

    // 7) 1~16层全维平衡专项校验：升级三阶刻印+晶石重铸、移除防秒杀锁真实伤害结算、统领与首领同级一阶段血量、远程武器最低安全射程保底
    player.lv = 12;
    player.mats = 200;
    pendingLevels = 1;
    showLevelUp();
    const lvlRerollBtn = document.getElementById('lvlRerollBtn');
    const matsBeforeLvlReroll = player.mats;
    if (lvlRerollBtn) lvlRerollBtn.click();
    const lvlCardsEls = Array.from(document.getElementById('lvlCards').children);
    const tieredLvlOk = Boolean(
      lvlRerollBtn &&
      player.mats < matsBeforeLvlReroll &&
      lvlCardsEls.length === 4 &&
      lvlCardsEls.every(c => /\\bt[23]\\b/.test(c.className || ''))
    );
    const rangedFloorOk = calcWeaponEffectiveRange(WEAPONS.shotgun, 1, null, -500) >= Math.round(WEAPONS.shotgun.range * 0.88);
    const savedWave7 = wave, savedState7 = state, savedDiff7 = diff;
    wave = 10; diff = DIFFS[1]; state = 'wave'; endlessMode = false; survivalTrialWave = false;
    enemies.length = 0; player.weapons = [];
    const testBoss10 = createEnemy(400, 400, 'boss', 'butcher');
    const testMini10 = createEnemy(600, 400, 'mini_boss', 'vanguard');
    const miniSameTierAsBossOk = (testMini10.maxHp === testBoss10.maxHp && testBoss10.maxHp >= 120000);
    enemies.length = 0;
    wave = 14;
    player.maxHp = 100; player.hp = 100; player.armor = 0; player.dodge = 0; player.shield = 0; player._bloodShieldPool = 0; player.phoenixFeather = 0;
    hurtPlayer(80, false, dummy);
    const noAntiOneshotCapOk = (player.hp === 20 && player.invuln === 0);

    // 8) 复刻《土豆兄弟》波次节拍防秒刷校验 + 近战独立阶梯领先 + T1/T2 机制下放校验
    waveTime = 20; overtime = false; spawnAcc = -2.0; spawns.length = 0; enemies.length = 0;
    for (let mi = 0; mi < 65; mi++) enemies.push({ x: 300, y: 300, r: 18, hp: 50, maxHp: 50, spd: 0, dmg: 1, type: 'chaser' });
    update(0.016); // 满怪时节拍触发必须重置 spawnAcc > 1.0s，绝不保留负数待命！
    const spawnAccResetWhenFull = spawnAcc > 1.0;
    enemies.length = 10; spawns.length = 0;
    update(0.016); // 清怪下一帧 (0.016s) 绝不立即秒补怪！
    const noInstantRespawnOnKill = spawns.length === 0;
    enemies.length = 0;
    const meleeTierLeadOk = calcWeaponTierScale(WEAPONS.katana, 1) > calcWeaponTierScale(WEAPONS.pistol, 1) * 1.15;
    const staffEarlyPoolOk = !WEAPONS.storm_rod.minTier && !WEAPONS.chrono_staff.minTier;
    // 9) 四维真实固定点伤 (flatMelee/flatRanged/flatElem/flatTech) + 防滚雪球硬上限校验
    startGame('allrounder', { mode: 'endless' });
    player.flatMelee = 10; player.flatRanged = 10; player.flatElem = 10; player.flatTech = 10;
    const flatAddKatana = calcWeaponFlatDmgAdd('katana', WEAPONS.katana, 2);
    const flatAddSmg = calcWeaponFlatDmgAdd('smg', WEAPONS.smg, 2);
    const flatAddStaff = calcWeaponFlatDmgAdd('ember_staff', WEAPONS.ember_staff, 2);
    const flatDualAxisOk = flatAddKatana > flatAddSmg * 1.35 && flatAddStaff > flatAddSmg * 1.5;
    player.dmgMul = 1.0; player.wisdomRamp = 0; player._waveElapsed = 0;
    ITEMS.find(x => x.id === 'wisdom_scroll').apply(player);
    const wisdomStartDmg = getEffectiveDmgMul();
    player._waveElapsed = 90;
    const wisdomCappedDmg = getEffectiveDmgMul();
    const wisdomCapOk = wisdomStartDmg < 0.90 && Math.abs(wisdomCappedDmg - 1.12) < 1e-6;
    player.dmgMul = 1.0; player.wisdomRamp = 0;
    player.spdMul = 2.2; player.lifesteal = 0.8; player.armor = 30; player.maxHp = 260;
    player.spdToDmg = true; player.lifestealToDmg = true; player.armorToDmg = 1; player.hpToDmg = 1;
    const convertCapOk = getEffectiveDmgMul() <= 1.35 + 1e-6;
    const bandolierPenOk = (() => {
      const pTmp = { rangedPelletsBonus: 0, dmgMul: 1.0, rangeBonus: 0 };
      ITEMS.find(x => x.id === 'infinite_bandolier').apply(pTmp);
      return pTmp.rangedPelletsBonus === 1 && pTmp.dmgMul < 0.82 && pTmp.rangeBonus <= -30;
    })();
    const brotatoPaceAndCurveOk = spawnAccResetWhenFull && noInstantRespawnOnKill && meleeTierLeadOk && staffEarlyPoolOk && flatDualAxisOk && wisdomCapOk && convertCapOk && bandolierPenOk;
    wave = savedWave7; state = savedState7; diff = savedDiff7;

    return {
      ok: spdDmg1 > baseDmg0 + 0.12 && spdDmg1 <= baseDmg0 + 0.22 && dodgeAspd1 > baseAspd0 + 0.24 && dodgeAspd1 <= baseAspd0 + 0.42 && lsDmg1 > spdDmg1 + 0.06
        && hpAfterPad >= hpBeforePad + 9 && slots1 === slots0 + 1
        && pocketTurretOk && bloodShieldOk && phoenixSavedOk && allNewWpnsDealt && scalingBadgesOk && brotatoSlotUxOk
        && tieredLvlOk && rangedFloorOk && miniSameTierAsBossOk && noAntiOneshotCapOk && brotatoPaceAndCurveOk,
      detail: { spdDmg1, baseDmg0, dodgeAspd1, baseAspd0, lsDmg1, hpBeforePad, hpAfterPad, slots0, slots1, pocketTurretOk, bloodShieldOk, phoenixSavedOk, allNewWpnsDealt, scalingBadgesOk, brotatoSlotUxOk, tieredLvlOk, rangedFloorOk, miniSameTierAsBossOk, noAntiOneshotCapOk, brotatoPaceAndCurveOk, spawnAccResetWhenFull, noInstantRespawnOnKill, meleeTierLeadOk, staffEarlyPoolOk, flatDualAxisOk, wisdomCapOk, convertCapOk, bandolierPenOk }
    };
  })()`, env220.sandbox);
  assert.strictEqual(v220Res.ok, true, "v2.2.0 full-archetype arsenal & relic suite failed: " + JSON.stringify(v220Res));
  assert.strictEqual(env220.stats.radialGradients, 0, "v2.2.0 relic/weapon art & combat used createRadialGradient: " + env220.stats.radialGradients);
  assert.strictEqual(env220.stats.shadowBlurs, 0, "v2.2.0 relic/weapon art & combat used shadowBlur: " + env220.stats.shadowBlurs);
}

console.log(`ALL 5 V${packageVersion} VERIFICATION SUITES PASSED! Modular files: ${cssFiles.length} CSS + ${jsFiles.length} JS | Total JS: ${(code.length / 1024).toFixed(1)} KB`);
