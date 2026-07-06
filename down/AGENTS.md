# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure & Build
- **Active Directory**: The core project is in `yt-downloader/`. The root `package.json` ("info-manager") appears to be a separate or legacy artifact.
- **Commands**: Execute all npm scripts inside `yt-downloader/`.
  - **Dev**: `npm run dev` (starts Vite + Electron).
  - **Build**: `npm run build` (runs `vue-tsc`, `vite build`, and `electron-builder`).
- **Binaries**: Development requires `yt-dlp` and `ffmpeg` binaries to be present in `yt-downloader/resources/`.
  - `electron-builder.json5` is configured to copy `resources/` to the production build (`extraResources`).

## Critical Implementation Details
- **IPC Bridge**: Communication relies on `window.electron` exposed via `preload.ts`.
  - Channels: `start-download` (invoke), `download-progress` (on), `download-log` (on).
- **Binary Execution**: `electron/main.ts` uses `cross-spawn` to run `yt-dlp`.
  - **Progress Parsing**: Strictly relies on regex `(\d{1,3}\.\d)%` matching stdout.
  - **FFmpeg Resolution**: Custom logic checks Bundled -> System Paths -> PATH.
- **Vue Frontend**: `App.vue` handles UI state; log auto-scrolling is implemented via `nextTick`.