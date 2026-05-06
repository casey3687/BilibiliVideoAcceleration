# Bilibili Playback Rate Menu Extension Design

## Goal

Build a Chrome Manifest V3 extension that expands Bilibili's native playback rate menu so the original "倍速" button offers every speed from `0.25x` through `4x` in `0.25x` increments.

## Scope

The extension targets Bilibili video pages under `https://www.bilibili.com/*`. It modifies the existing Bilibili player playback-rate menu when the player is present. It does not add a separate floating controller, background service workflow, account integration, or persistent settings UI.

## User Experience

Users keep using Bilibili's existing playback-rate control:

- Open a Bilibili video page.
- Hover or open the native "倍速" control.
- See the expanded rate list: `4x`, `3.75x`, `3.5x`, down to `0.25x`.
- Click a rate item.
- The active video playback speed changes immediately, and the visible rate label updates to the selected value.

The menu order follows Bilibili's current high-to-low style, with faster rates at the top.

## Architecture

The extension consists of:

- `manifest.json`: Manifest V3 metadata and content script registration.
- `content.js`: DOM observer, menu replacement, click handling, and video playback-rate synchronization.
- `styles.css`: Small visual fixes for the longer native menu if needed.

No build step is required. The folder can be loaded directly through Chrome's extension developer mode.

## Content Script Behavior

`content.js` runs on `https://www.bilibili.com/*` at `document_idle`.

It performs these actions:

1. Generate the rate list from `4` down to `0.25`, subtracting `0.25` per item.
2. Watch the document with `MutationObserver` because Bilibili renders and rebuilds the player asynchronously.
3. Locate `.bpx-player-ctrl-playbackrate-menu`.
4. Replace the menu's children with generated `li.bpx-player-ctrl-playbackrate-menu-item` elements.
5. Attach click handlers that:
   - Read the selected rate.
   - Set `playbackRate` on the active `<video>` element, and on any other visible page videos as a fallback.
   - Update `.bpx-player-ctrl-playbackrate-result` to the selected text.
   - Mark the selected menu item with Bilibili-compatible selected state when practical.

The script tags patched menus with an internal `data-*` marker so repeated observer events do not duplicate entries or handlers.

## DOM Compatibility

Primary selectors come from the user-provided Bilibili player snippet:

- `.bpx-player-ctrl-playbackrate`
- `.bpx-player-ctrl-playbackrate-result`
- `.bpx-player-ctrl-playbackrate-menu`
- `.bpx-player-ctrl-playbackrate-menu-item`

If Bilibili rebuilds the menu after navigation, playlist switching, or watch-later item changes, the observer patches the new menu again.

## Error Handling

If no player or no menu is present, the script exits quietly and keeps observing. If no `<video>` element is available at click time, the menu label still updates only after a video is found on a later interaction. Console output is minimal and only used for clear extension-level failures during development.

## Testing Plan

Manual verification:

1. Load the extension through `chrome://extensions` developer mode.
2. Open the provided Bilibili watch-later video URL.
3. Open the native "倍速" menu.
4. Confirm options cover `4x` through `0.25x` in `0.25x` steps.
5. Click several values, including `4x`, `1x`, and `0.25x`.
6. Confirm `document.querySelector("video").playbackRate` matches the selected value.
7. Switch to another video in the watch-later list and confirm the patched menu returns.

Local static verification:

1. Validate `manifest.json` parses as JSON.
2. Confirm generated rate values are exactly 16 entries from `4` to `0.25`.
3. Confirm no build artifacts are required.
