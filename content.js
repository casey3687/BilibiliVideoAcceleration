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
