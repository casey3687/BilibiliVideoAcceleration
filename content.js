(() => {
  const api = window.BilibiliPlaybackRateMenu;
  if (!api) return;

  const MENU_SELECTOR = ".bpx-player-ctrl-playbackrate-menu";
  let scheduled = false;

  function patchAllMenus() {
    for (const menu of document.querySelectorAll(MENU_SELECTOR)) {
      api.patchPlaybackRateMenu(menu, {
        document,
        onRateChange: (rate) => api.applyPlaybackRateToVideos(rate, document),
      });
      api.syncMenuMaxHeightToVideo(menu, document);
    }
  }

  function schedulePatchAllMenus() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchAllMenus();
    });
  }

  const observer = new MutationObserver(() => schedulePatchAllMenus());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedulePatchAllMenus, { passive: true });
  window.addEventListener("scroll", schedulePatchAllMenus, { passive: true });

  patchAllMenus();
})();
