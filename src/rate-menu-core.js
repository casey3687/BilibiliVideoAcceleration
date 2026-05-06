(function attachBilibiliPlaybackRateMenu(global) {
  const MIN_RATE = 0.25;
  const MAX_RATE = 4;
  const RATE_STEP = 0.25;
  const PATCHED_ATTR = "biliRateMenuPatched";
  const SELECTED_CLASSES = ["bpx-state-active", "bpx-player-ctrl-playbackrate-menu-item-active"];

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

  function isMenuCurrent(menu, rates) {
    const children = Array.from(menu.children ?? []);
    if (children.length !== rates.length) return false;
    return rates.every((rate, index) => Number(children[index]?.dataset?.value) === rate);
  }

  function patchPlaybackRateMenu(menu, options = {}) {
    if (!menu) return false;
    const doc = options.document ?? menu.ownerDocument ?? global.document;
    const rates = options.rates ?? buildPlaybackRates();
    if (menu.dataset?.[PATCHED_ATTR] === "true" && isMenuCurrent(menu, rates)) return false;

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

  function applyPlaybackRateToVideos(rate, root = global.document) {
    const videos = Array.from(root.querySelectorAll?.("video") ?? []);
    for (const video of videos) {
      video.playbackRate = rate;
    }
    return videos.length;
  }

  global.BilibiliPlaybackRateMenu = {
    buildPlaybackRates,
    formatRateLabel,
    patchPlaybackRateMenu,
    setSelectedRate,
    applyPlaybackRateToVideos,
  };
})(globalThis);
