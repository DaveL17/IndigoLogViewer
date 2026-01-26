# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Indigo Log Viewer is a standalone, vanilla JavaScript web application for viewing Indigo smart home automation log files. It has **no build system, no package manager, and no framework dependencies**. The only external dependency is Chart.js 4.5.0 loaded from CDN.

## Running the App

Open `log_viewer_app.html` directly in a browser (double-click or File > Open). No server, build step, or installation required.

## Architecture

### File Structure

- `log_viewer_app.html` — Single entry point; all UI markup lives here
- `js/log_viewer_app.js` — Core application logic (virtual scrolling, file loading, filtering, sorting, keyboard navigation)
- `js/modals.js` — Modal dialogs (log entry detail, file info list/chart views, about) and Chart.js integration
- `js/toasts.js` — Toast notification system
- `js/config.js` — Constants: APP_VERSION, APP_NAME, AUTHOR
- `css/log_viewer_app.css` — All styles including light/dark theme via CSS custom properties

### Script Load Order (matters for dependencies)

1. `modals.js` (declares `logChart`, `LogChartViewer`)
2. `toasts.js`
3. `config.js`
4. `log_viewer_app.js` (depends on all above)

### Key Patterns

**State management**: Global variables — `allLogEntries[]`, `filteredEntries[]`, `availableClasses` (Set), `availableDates[]`, `selectedClasses` (Set), `loadedFileInfo[]`. User preferences (theme, column widths) persisted to `localStorage`.

**Virtual scrolling**: Only visible rows are rendered. Row height is 32px with a 10-row buffer above/below viewport. Rows positioned via `transform: translateY()`.

**Log entry format**: Expects tab-delimited `YYYY-MM-DD HH:MM:SS.fff\tClass\tMessage`. Multi-line entries (continuation lines without timestamps) are supported.

**File loading**: Uses FileReader API with retry logic (up to 3 attempts, exponential backoff). Files are filtered to match Indigo log patterns (`YYYY-MM-DD Events.*` or `plugin.log*`). Folder loading is non-recursive.

**Filtering pipeline**: Date range → class filter (checkbox dropdown) → text search (literal, case-insensitive, 300ms debounce) → sort → render virtual list.

**Theming**: Light/dark themes controlled by `data-theme` attribute on `<html>`. CSS custom properties handle all color values. Theme choice saved to `localStorage` key `theme`.

**Security**: All user content is passed through `escapeHtml()` before rendering.

## Browser Compatibility

Primary target: Safari 18.6. Also loads in Chrome and Firefox but not fully tested there. Not designed for small screens.
