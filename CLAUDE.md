# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

pyCarteggio is a PyQt5 + matplotlib desktop app for practicing Italian nautical chart plotting exercises ("carteggio nautico") on a fixed reference chart image (`Carta Nautica 5D_400dpi.png`, an AI-upscaled 2x version of the original 200dpi scan — see git history if the source is ever needed), used to prepare for the Italian boating license exam. UI text and docs are in Italian.

## Running

```
pip install -r requirements.txt
python main.py
```

Dependencies are only `matplotlib` and `PyQt5` (see `requirements.txt`). There is no test suite, linter, or build step configured beyond the Windows packaging described below.

## Packaging (Windows installer)

- `main.spec` — PyInstaller spec bundling `main.py` and the chart PNG into a single-folder app (`run_pyinstaller.bat` runs `pyinstaller main.spec`).
- `pycarteggio.iss` — Inno Setup script that wraps the PyInstaller output into a Windows installer. It hardcodes absolute Windows paths (`C:\PycharmProjects\pyCarteggio\...`), so it must be run from a checkout at that exact path, or edited first.
- `build/` and `dist/` are PyInstaller output directories, already checked in on this branch — treat them as generated artifacts, not source.

## Architecture

Everything lives in two files:

- **`main.py`** — the main window and all charting/drawing logic.
- **`scratchpad.py`** — `ScratchpadWindow`, a small floating notes + calculator popup (opened via the toolbar's "Note" action), independent of the chart logic.

### Coordinate system

The chart PNG is displayed via matplotlib `imshow` inside a Qt `FigureCanvas`; all drawing happens in image pixel coordinates. Two module-level constants pin a known pixel to a known lat/long (`START_PX`, `START_COORD`), plus pixel-per-arcminute scale factors (`PIXEL_PER_PRIME_LAT`, `PIXEL_PER_PRIME_LONG`) calibrated specifically for `Carta Nautica 5D_400dpi.png` at its exact pixel dimensions (12636×8264). `coord_to_px` / `px_to_coord` convert between the two using these constants — they only work for this specific chart image at this specific resolution. If the chart image is ever replaced or rescaled again, `START_PX` and both `PIXEL_PER_PRIME_*` constants (and `regions`/`REGIONS` in the web port) must be rescaled by the same factor, and the fixed marker sizes that are in pixel/data units rather than points (`DotPainter`'s `radius`, `CirclePainter`'s `CenterCross` `size`, and their JS equivalents) should scale too so markers keep the same real-world size on the chart.

`CoordElement` (degrees + decimal minutes) and `Coord` (lat/long pair) are the value types used throughout for displaying nautical coordinates in the `deg°minutes'` format.

`regions` is a dict of named preset zoom rectangles (in pixel space), populated into the region dropdown so users can jump to common exercise areas without manual panning.

### Drawing tools

Three tool classes, each owning its own matplotlib artist(s) and following the same small interface (`paint()`, `remove()`, `click_left(x, y)`, `click_right(x, y)`, `__repr__` for the sidebar label text):

- `DotPainter` — a single point/circle marker; both clicks just reposition it.
- `LinePainter` — left click sets point 1, right click sets point 2; the line is then extended to the full image extent (`IMAGE_EXTENT`, computed once from `imshow` at startup) and its representation shows both possible headings (a line has two ends, so the exam-taker picks the correct one).
- `CirclePainter` — left click sets center, right click sets a point defining the radius; has a nested `CenterCross` helper artist. Represents its radius in nautical miles by dividing by `PIXEL_PER_PRIME_LAT`.

`MyWindow.add_object()` is the shared factory: it instantiates the tool class, wraps it in a `GraphicListItem` (the sidebar row with Edit/Del buttons), and cycles through `color_list` so each new tool gets a distinct color. Clicking a sidebar row's "Edit" button (`change_edit`) reassigns `self.current_tool`/`self.current_label` so canvas clicks route to that tool again — only one tool is "active" (editable via canvas clicks) at a time.

`on_canvas_click` routes left/right mouse clicks on the canvas to whichever tool is currently active, but is a no-op while the matplotlib pan/zoom toolbar mode is engaged (`self.mpl_toolbar.mode`).

### Adding a new drawing tool

Implement the same interface as the existing painters (constructor taking `ax, color=...`; `paint()`, `remove()`, `click_left`, `click_right`, `__repr__`), then wire it up via `add_object()` in `MyWindow` and add a toolbox button, following the pattern of `add_point`/`add_line`/`add_circle`.

## Web version (`web/`)

`web/` is a standalone, dependency-free re-implementation of the same tool for browsers/tablets — plain HTML/CSS/JS (`index.html`, `style.css`, `app.js`), no build step, no framework. It is a parallel port, not a wrapper around the Python code — the two must be kept in sync manually if calibration constants, regions, or tool behavior change in `main.py`.

Serve it with any static file server, e.g. `cd web && python3 -m http.server 8000`. Opening `index.html` directly via `file://` still works for display, but the PNG/SVG export features use `canvas.toDataURL`/`toBlob`, which browsers taint (throw `SecurityError`) for canvases painted from a `file://`-loaded image — export requires serving over HTTP(S), including on a tablet on the LAN.

- All chart-pixel math (`START_PX`/`START_COORD`/`PIXEL_PER_PRIME_LAT`/`PIXEL_PER_PRIME_LONG`, `pxToCoord`, `REGIONS`) is ported 1:1 from `main.py`'s module-level constants — keep these two in sync if the reference chart ever changes.
- `DotTool`/`LineTool`/`CircleTool` in `app.js` mirror `DotPainter`/`LinePainter`/`CirclePainter`, but expose `primary(x,y)`/`secondary(x,y)` (image-space pixel coords) instead of `click_left`/`click_right`, and `draw(ctx, scale, bounds)` instead of `paint()`. All drawing happens through one canvas transform (`computeTransform()`/`redraw()` in `app.js`) so shape coordinates are plain image-pixel values, matching the matplotlib data-space semantics of the original. Marker sizes (`DOT_RADIUS`, `CROSS_SIZE`) are shared constants at the top of `app.js`, reused by both the canvas draw methods and the SVG exporter.
- **Touch input has no left/right mouse button**, so left/right-click is replaced by an explicit "①/②" mode toggle ("Prossimo tocco", shown only for `line`/`circle` tools) that selects which of `primary`/`secondary` the next tap invokes; it auto-advances after each tap. Real mouse clicks still map directly to left → `primary` / right → `secondary` (see `onPointerEnd` in `app.js`), bypassing the toggle. Two-finger pinch always pans+zooms; single-finger drag pans when "Sposta" (pan mode) is toggled on, when the middle mouse button is held (`forcePan` flag on the pointer, set in `pointerdown`), or does nothing while a tool is placing points via single taps.
- **"Zoom" toolbar button** (`zoomMode`/`zoomDrag` state, wired in the `pointerdown`/`pointermove`/`onPointerEnd` handlers and drawn at the end of `redraw()`) is a persistent toggle mirroring the original matplotlib rectangle-zoom tool: while active, a single-pointer drag draws a dashed selection rectangle (canvas device-pixel space) instead of placing points or panning, and releasing it calls `setView()` on that rectangle converted to image space via `canvasPxToImage`; a drag shorter than 10 device px is treated as a stray click and ignored. It stays on across multiple rectangles until the button is clicked again (matching the desktop app's "deselect before placing/editing" behavior noted in the README), is mutually exclusive with "Sposta" (enabling one disables the other), and a second pointer joining mid-drag (pinch) cancels the in-progress rectangle.
- The "Prossimo tocco" toggle only ever renders when the "Interfaccia touch" checkbox (`#touch-interface-checkbox`) is on, gated in `updateModeControls()` via the `touchInterfaceEnabled` flag; the preference persists across reloads in `localStorage` (`loadTouchInterfacePreference`, wrapped in try/catch since `localStorage` can throw in private-browsing contexts). It defaults to off since it's only needed on touch devices — mouse left/right-click works identically regardless of this setting.
- Gotcha already hit once: `[hidden]` must be forced with `[hidden] { display: none !important; }` in `style.css` — an ID-selector rule that sets `display` on a hidden element (e.g. `#scratchpad { display: flex }`) otherwise wins over the browser's default `[hidden]` rule even after JS sets `el.hidden = true`.
- The note/scratchpad panel (`#scratchpad`) is draggable by its header (`.scratchpad-header`'s `pointerdown`/`pointermove` handlers near the bottom of `app.js`): the first drag switches it from its CSS default `top`/`right` position to explicit `left`/`top` inline styles, clamped to the viewport (also reclamped on window `resize`).
- **Workspace persistence** (`serializeWorkspace`/`applyWorkspace`/`toolFromData` in `app.js`) round-trips the sidebar items (each tool's own fields plus `type`/`color`/`nextAction`), the notes text, and the current view as one JSON file, downloaded/re-read via `<a download>` and a hidden `<input type=file>` — there is no server-side storage, it's purely a local file. Loading replaces the current items after a confirmation prompt if any exist.
- **PNG export** just dumps the visible canvas framebuffer (`canvas.toBlob`) — literally the current pan/zoom crop with overlays composited in, at the canvas's device-pixel resolution. **SVG export** (`exportSVG`) instead crops the source chart image to the current view onto an offscreen canvas, embeds that crop as a base64 PNG `<image>`, and re-draws the tool overlays as real vector `<circle>`/`<line>` elements (reusing the same extension-to-`imageBounds` math as `LineTool.draw`) so annotations stay crisp/scalable — only the scanned chart background is raster. Exporting a large view (e.g. "Generale") produces a correspondingly huge base64-embedded SVG (tens to 100+ MB); browsers handle it fine, but some standalone SVG tools with strict XML parsers (e.g. `rsvg-convert`) reject any single attribute over ~10MB — zoom into a smaller region first if that matters.
- **"Istruzioni" button** opens `#instructions-backdrop` (a centered modal, `openInstructions`/`closeInstructions` in `app.js`), closable via its "✕" button, clicking the dimmed backdrop, or Escape. Its content is static HTML in `index.html` (no JS templating) with separate desktop-vs-touch sections; when a new input method, tool, or button is added to the app, update this modal's text too — it's the only in-app documentation and easily drifts out of sync otherwise.
