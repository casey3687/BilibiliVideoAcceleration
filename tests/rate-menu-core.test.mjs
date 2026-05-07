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

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.parentElement = null;
    this.listeners = new Map();
    this.style = {
      values: new Map(),
      getPropertyValue: (name) => this.style.values.get(name) ?? "",
      removeProperty: (name) => this.style.values.delete(name),
      setProperty: (name, value) => this.style.values.set(name, value),
    };
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

test("patchPlaybackRateMenu re-patches when Bilibili rewrites a tagged menu", () => {
  const { patchPlaybackRateMenu } = loadCoreApi();
  const fake = createFakeDocument();
  const staleItem = fake.createElement("li");
  staleItem.dataset.value = "2";
  staleItem.textContent = "2x";
  fake.menu.replaceChildren(staleItem);
  fake.menu.dataset.biliRateMenuPatched = "true";

  const didPatch = patchPlaybackRateMenu(fake.menu, { document: fake });

  assert.equal(didPatch, true);
  assert.equal(fake.menu.children.length, 16);
  assert.equal(fake.menu.children[0].dataset.value, "4");
  assert.equal(fake.menu.children.at(-1).dataset.value, "0.25");
});

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

test("syncMenuMaxHeightToVideo limits menu height to Bilibili video display height", () => {
  const { syncMenuMaxHeightToVideo } = loadCoreApi();
  const fake = createFakeDocument();
  const videos = [
    {
      currentSrc: "blob:https://other.example/video",
      getBoundingClientRect: () => ({ height: 720 }),
    },
    {
      src: "blob:https://www.bilibili.com/abc",
      getBoundingClientRect: () => ({ height: 480 }),
    },
  ];
  const root = {
    querySelectorAll(selector) {
      return selector === "video" ? videos : [];
    },
  };

  const height = syncMenuMaxHeightToVideo(fake.menu, root);

  assert.equal(height, 464);
  assert.equal(fake.menu.style.getPropertyValue("--bili-rate-menu-max-height"), "464px");
});

test("syncMenuMaxHeightToVideo limits menu height to space above the playback control", () => {
  const { syncMenuMaxHeightToVideo } = loadCoreApi();
  const fake = createFakeDocument();
  const videoWrap = {
    getBoundingClientRect: () => ({ top: 80, bottom: 460, height: 380 }),
  };
  const playbackControl = {
    getBoundingClientRect: () => ({ top: 410, bottom: 442, height: 32 }),
    querySelector(selector) {
      if (selector === ".bpx-player-ctrl-playbackrate-result") return fake.result;
      return null;
    },
  };
  const video = {
    src: "blob:https://www.bilibili.com/abc",
    closest(selector) {
      return selector === ".bpx-player-video-wrap" ? videoWrap : null;
    },
    getBoundingClientRect: () => ({ top: 80, bottom: 460, height: 380 }),
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "video" ? [video] : [];
    },
  };
  fake.menu.closest = (selector) => {
    if (selector === ".bpx-player-ctrl-playbackrate") return playbackControl;
    return null;
  };

  const height = syncMenuMaxHeightToVideo(fake.menu, root);

  assert.equal(height, 314);
  assert.equal(fake.menu.style.getPropertyValue("--bili-rate-menu-max-height"), "314px");
});

test("syncMenuMaxHeightToVideo uses stable rate label instead of expanded menu bounds", () => {
  const { syncMenuMaxHeightToVideo } = loadCoreApi();
  const fake = createFakeDocument();
  const videoWrap = {
    getBoundingClientRect: () => ({ top: 80, bottom: 460, height: 380 }),
  };
  const rateLabel = {
    getBoundingClientRect: () => ({ top: 410, bottom: 442, height: 32 }),
  };
  const expandedPlaybackControl = {
    getBoundingClientRect: () => ({ top: 120, bottom: 442, height: 322 }),
    querySelector(selector) {
      if (selector === ".bpx-player-ctrl-playbackrate-result") return rateLabel;
      return null;
    },
  };
  const video = {
    src: "blob:https://www.bilibili.com/abc",
    closest(selector) {
      return selector === ".bpx-player-video-wrap" ? videoWrap : null;
    },
    getBoundingClientRect: () => ({ top: 80, bottom: 460, height: 380 }),
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "video" ? [video] : [];
    },
  };
  fake.menu.closest = (selector) => {
    if (selector === ".bpx-player-ctrl-playbackrate") return expandedPlaybackControl;
    return null;
  };

  const height = syncMenuMaxHeightToVideo(fake.menu, root);

  assert.equal(height, 314);
  assert.equal(fake.menu.style.getPropertyValue("--bili-rate-menu-max-height"), "314px");
});
