# Bilibili Playback Rate Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a loadable Chrome MV3 extension that replaces Bilibili's native playback-rate menu with `0.25x` through `4x` options in `0.25x` increments.

**Architecture:** Keep the extension static and build-free. Put testable rate/menu behavior in `src/rate-menu-core.js`, expose it as `globalThis.BilibiliPlaybackRateMenu`, and register it before `content.js` through `manifest.json`.

**Tech Stack:** Chrome Manifest V3, vanilla JavaScript, DOM APIs, Node.js built-in test runner.

---

## File Structure

- Create `package.json`: project scripts for Node tests.
- Create `manifest.json`: Chrome extension metadata and content script registration.
- Create `content.js`: Bilibili page integration, observer setup, and browser global wiring.
- Create `src/rate-menu-core.js`: classic browser script with pure functions for rate generation, formatting, menu patching, selected state, and video speed application.
- Create `styles.css`: small menu sizing fix for the longer native menu.
- Create `tests/rate-menu-core.test.mjs`: Node tests with a minimal DOM stub.

## Task 1: Test Rate Generation

**Files:**
- Create: `package.json`
- Create: `tests/rate-menu-core.test.mjs`
- Create: `src/rate-menu-core.js`

- [ ] **Step 1: Create the initial test file**

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const corePath = path.resolve("src/rate-menu-core.js");
const coreSource = fs.readFileSync(corePath, "utf8");

function loadCoreApi(extraSandbox = {}) {
  const sandbox = { ...extraSandbox };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(coreSource, sandbox, { filename: corePath });
  return sandbox.BilibiliPlaybackRateMenu;
}

test("buildPlaybackRates returns 4x down to 0.25x in 0.25 steps", () => {
  const { buildPlaybackRates } = loadCoreApi();
  const rates = buildPlaybackRates();

  assert.equal(rates.length, 16);
  assert.equal(rates[0], 4);
  assert.equal(rates.at(-1), 0.25);

  for (let index = 1; index < rates.length; index += 1) {
    assert.equal(Number((rates[index - 1] - rates[index]).toFixed(2)), 0.25);
  }
});

test("formatRateLabel removes unnecessary decimals", () => {
  const { formatRateLabel } = loadCoreApi();

  assert.equal(formatRateLabel(4), "4x");
  assert.equal(formatRateLabel(3.75), "3.75x");
  assert.equal(formatRateLabel(1.5), "1.5x");
  assert.equal(formatRateLabel(1), "1x");
  assert.equal(formatRateLabel(0.25), "0.25x");
});
```

- [ ] **Step 2: Create minimal package metadata**

```json
{
  "name": "bilibili-playback-rate-menu",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 3: Create an empty core script**

```javascript
(function attachBilibiliPlaybackRateMenu(global) {
  function buildPlaybackRates() {
    return [];
  }

  function formatRateLabel(rate) {
    return `${rate}x`;
  }

  global.BilibiliPlaybackRateMenu = {
    buildPlaybackRates,
    formatRateLabel,
  };
})(globalThis);
```

- [ ] **Step 4: Run test to verify RED**

Run: `npm test`

Expected: FAIL because `buildPlaybackRates()` returns `0` entries.

- [ ] **Step 5: Implement rate generation**

```javascript
const MIN_RATE = 0.25;
const MAX_RATE = 4;
const RATE_STEP = 0.25;

function buildPlaybackRates() {
  const rates = [];
  for (let rate = MAX_RATE; rate >= MIN_RATE; rate = Number((rate - RATE_STEP).toFixed(2))) {
    rates.push(rate);
  }
  return rates;
}

function formatRateLabel(rate) {
  return `${Number(rate.toFixed(2))}x`;
}
```

- [ ] **Step 6: Run test to verify GREEN**

Run: `npm test`

Expected: PASS.

## Task 2: Test Menu Patching and Click Behavior

**Files:**
- Modify: `tests/rate-menu-core.test.mjs`
- Modify: `src/rate-menu-core.js`

- [ ] **Step 1: Add minimal DOM stubs and menu tests**

```javascript
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.parentElement = null;
    this.listeners = new Map();
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach((name) => this.classList.values.add(name)),
      remove: (...names) => names.forEach((name) => this.classList.values.delete(name)),
      contains: (name) => this.classList.values.has(name),
    };
  }

  replaceChildren(...children) {
    this.children = children;
    for (const child of children) child.parentElement = this;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  click() {
    this.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  }
}

function createFakeDocument() {
  const result = new FakeElement("div");
  const menu = new FakeElement("ul");
  const root = {
    querySelector(selector) {
      if (selector === ".bpx-player-ctrl-playbackrate-result") return result;
      return null;
    },
  };
  menu.closest = (selector) => (selector === ".bpx-player-ctrl-playbackrate" ? root : null);
  return {
    result,
    menu,
    createElement: (tagName) => new FakeElement(tagName),
  };
}

test("patchPlaybackRateMenu replaces menu items and applies clicked rate", () => {
  const { patchPlaybackRateMenu } = loadCoreApi();
  const fake = createFakeDocument();
  const appliedRates = [];

  const didPatch = patchPlaybackRateMenu(fake.menu, {
    document: fake,
    onRateChange: (rate) => appliedRates.push(rate),
  });

  assert.equal(didPatch, true);
  assert.equal(fake.menu.dataset.biliRateMenuPatched, "true");
  assert.equal(fake.menu.children.length, 16);
  assert.equal(fake.menu.children[0].dataset.value, "4");
  assert.equal(fake.menu.children.at(-1).dataset.value, "0.25");

  fake.menu.children[1].click();

  assert.deepEqual(appliedRates, [3.75]);
  assert.equal(fake.result.textContent, "3.75x");
  assert.equal(fake.menu.children[1].classList.contains("bpx-state-active"), true);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test`

Expected: FAIL because `patchPlaybackRateMenu` is missing.

- [ ] **Step 3: Implement menu patching**

```javascript
const PATCHED_ATTR = "biliRateMenuPatched";
const SELECTED_CLASSES = ["bpx-state-active", "bpx-player-ctrl-playbackrate-menu-item-active"];

function patchPlaybackRateMenu(menu, options = {}) {
  if (!menu || menu.dataset?.[PATCHED_ATTR] === "true") return false;

  const doc = options.document ?? menu.ownerDocument ?? document;
  const rates = options.rates ?? buildPlaybackRates();
  const items = rates.map((rate) => {
    const item = doc.createElement("li");
    item.className = "bpx-player-ctrl-playbackrate-menu-item";
    item.dataset.value = String(rate);
    item.textContent = formatRateLabel(rate);
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedRate(menu, rate, options);
    });
    return item;
  });

  menu.replaceChildren(...items);
  menu.dataset[PATCHED_ATTR] = "true";
  return true;
}

function setSelectedRate(menu, rate, options = {}) {
  const numericRate = Number(rate);
  const label = formatRateLabel(numericRate);
  const root = menu.closest?.(".bpx-player-ctrl-playbackrate");
  const result = root?.querySelector?.(".bpx-player-ctrl-playbackrate-result");
  if (result) result.textContent = label;

  for (const item of Array.from(menu.children ?? [])) {
    const isSelected = Number(item.dataset?.value) === numericRate;
    for (const className of SELECTED_CLASSES) {
      item.classList?.[isSelected ? "add" : "remove"]?.(className);
    }
  }

  options.onRateChange?.(numericRate);
}

global.BilibiliPlaybackRateMenu = {
  buildPlaybackRates,
  formatRateLabel,
  patchPlaybackRateMenu,
  setSelectedRate,
};
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test`

Expected: PASS.

## Task 3: Add Extension Integration

**Files:**
- Create: `manifest.json`
- Create: `content.js`
- Create: `styles.css`
- Modify: `src/rate-menu-core.js`

- [ ] **Step 1: Add content script exports for browser global use**

```javascript
function applyPlaybackRateToVideos(rate, root = document) {
  const videos = Array.from(root.querySelectorAll?.("video") ?? []);
  for (const video of videos) {
    video.playbackRate = rate;
  }
  return videos.length;
}

const BilibiliPlaybackRateMenu = {
  buildPlaybackRates,
  formatRateLabel,
  patchPlaybackRateMenu,
  setSelectedRate,
  applyPlaybackRateToVideos,
};

global.BilibiliPlaybackRateMenu = BilibiliPlaybackRateMenu;
```

- [ ] **Step 2: Add a test for applying video rates**

```javascript
test("applyPlaybackRateToVideos updates every video in the root", () => {
  const { applyPlaybackRateToVideos } = loadCoreApi();
  const videos = [{ playbackRate: 1 }, { playbackRate: 1 }];
  const root = {
    querySelectorAll(selector) {
      return selector === "video" ? videos : [];
    },
  };

  const count = applyPlaybackRateToVideos(2.25, root);

  assert.equal(count, 2);
  assert.deepEqual(videos.map((video) => video.playbackRate), [2.25, 2.25]);
});
```

- [ ] **Step 3: Run test to verify RED**

Run: `npm test`

Expected: FAIL because `applyPlaybackRateToVideos` is missing from the loaded API.

- [ ] **Step 4: Add `applyPlaybackRateToVideos` to the global API**

```javascript
global.BilibiliPlaybackRateMenu = {
  buildPlaybackRates,
  formatRateLabel,
  patchPlaybackRateMenu,
  setSelectedRate,
  applyPlaybackRateToVideos,
};
```

- [ ] **Step 5: Run test to verify GREEN**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Create `content.js`**

```javascript
(() => {
  const api = window.BilibiliPlaybackRateMenu;
  if (!api) return;

  const MENU_SELECTOR = ".bpx-player-ctrl-playbackrate-menu";

  function patchAllMenus() {
    for (const menu of document.querySelectorAll(MENU_SELECTOR)) {
      api.patchPlaybackRateMenu(menu, {
        document,
        onRateChange: (rate) => api.applyPlaybackRateToVideos(rate, document),
      });
    }
  }

  const observer = new MutationObserver(() => patchAllMenus());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  patchAllMenus();
})();
```

- [ ] **Step 7: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Bilibili Playback Rate Menu",
  "version": "0.1.0",
  "description": "Expand Bilibili's native playback-rate menu from 0.25x to 4x in 0.25x steps.",
  "content_scripts": [
    {
      "matches": ["https://www.bilibili.com/*"],
      "js": ["src/rate-menu-core.js", "content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 8: Create `styles.css`**

```css
.bpx-player-ctrl-playbackrate-menu {
  max-height: min(70vh, 460px);
  overflow-y: auto;
}
```

## Task 4: Verify and Commit

**Files:**
- Verify all created extension files.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Validate manifest JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"`

Expected: `manifest ok`.

- [ ] **Step 3: Verify expected file list**

Run: `git status --short`

Expected: `content.js`, `manifest.json`, `package.json`, `src/rate-menu-core.js`, `styles.css`, `tests/rate-menu-core.test.mjs`, and this plan file are listed before commit.

- [ ] **Step 4: Commit implementation**

```powershell
git add manifest.json content.js styles.css package.json src/rate-menu-core.js tests/rate-menu-core.test.mjs docs/superpowers/plans/2026-05-06-bilibili-playback-rate-menu.md
git commit -m "feat: add bilibili playback rate menu extension"
```
