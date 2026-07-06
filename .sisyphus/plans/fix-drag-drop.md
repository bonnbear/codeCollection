# Fix Drag & Drop — VSCode DragAndDropObserver Pattern

## TL;DR
> **Summary**: Replace flicker-prone naive drag handlers with VSCode's counter-based DragAndDropObserver pattern; add full-window drop overlay so users can drop files anywhere.
> **Deliverables**: Updated `index.html` (CSS + JS only)
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Single task, single file

## Context
### Original Request
用户反馈"拖拽不好用"，要求参考 VSCode 实现修复。

### Interview Summary
- Only `index.html` needs changes (CSS + JS)
- Root cause: naive `dragleave` fires on child element transitions, causing visual flicker
- VSCode uses `counter` field: `counter++` on dragenter, `counter--` on dragleave, only remove highlight when `counter === 0`
- User wants a full-window drop overlay (VSCode style) — drop anywhere on the window

### Metis Review (gaps addressed)
- Counter desync risk: reset counter on `drop`, `dragend`, and when drag leaves document/window
- Gate overlay on `dataTransfer.types.includes('Files')` to avoid triggering on text/URL drags
- Preserve `state.running` guard on all drop handlers
- Routing rule: use **active tab** to determine drop behavior (compress vs decompress)
- Keep `dataTransfer.files[].path` extraction (Electron-specific, already correct)

## Work Objectives
### Core Objective
Make drag-and-drop reliable and polished, following VSCode's DragAndDropObserver pattern.

### Deliverables
- Rewritten drag-and-drop logic in `index.html`
- Full-window drop overlay with visual feedback
- Counter-based enter/leave to eliminate flicker

### Definition of Done (verifiable conditions with commands)
- App launches without console errors
- Dragging files over window shows overlay
- Dropping on compress tab adds to source list
- Dropping .tar.lz4 on decompress tab sets archive path
- No flicker during drag hover

### Must Have
- Counter-based dragenter/dragleave (VSCode pattern)
- Full-window drop overlay
- `dataTransfer.types` includes `'Files'` gate
- `state.running` drop guard preserved
- Existing functionality unchanged

### Must NOT Have (guardrails)
- No changes to `worker.js`, `main.js`, `preload.js`, `package.json`
- No auto tab-switching (use active tab only)
- No new files or dependencies
- No breaking existing compress/decompress flow

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: none (no test framework in project)
- QA policy: Agent launches app, verifies DOM structure, checks console
- Evidence: .sisyphus/evidence/task-1-fix-dnd.png

## Execution Strategy
### Parallel Execution Waves
Wave 1: Single task — rewrite drag-and-drop in index.html

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| 1    | none      | F1-F4  |

### Agent Dispatch Summary
Wave 1: 1 task → `visual-engineering`

## TODOs

- [ ] 1. Rewrite drag-and-drop with VSCode pattern + full-window overlay

  **What to do**:
  
  **CSS Changes** (in `<style>` block):
  
  1. Replace `.dropzone` styles (lines 117-133) with enhanced version:
     ```css
     .dropzone {
       border: 2px dashed #5a5a5a;
       border-radius: 8px;
       padding: 28px 18px;
       text-align: center;
       color: var(--muted);
       background: var(--panel-2);
       margin-bottom: 10px;
       transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.15s ease;
       user-select: none;
       position: relative;
       cursor: default;
     }

     .dropzone-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.5; }
     .dropzone-text { font-size: 13px; }
     .dropzone-hint { font-size: 11px; margin-top: 4px; opacity: 0.6; }

     .dropzone.dragover {
       border-color: var(--accent-hover);
       background: rgba(14, 99, 156, 0.15);
       color: #c8e1ff;
       transform: scale(1.01);
     }
     .dropzone.dragover .dropzone-icon { opacity: 1; }
     ```

  2. Add full-window overlay CSS:
     ```css
     .global-drop-overlay {
       display: none;
       position: fixed;
       inset: 0;
       z-index: 10000;
       background: rgba(14, 99, 156, 0.12);
       backdrop-filter: blur(2px);
     }
     .global-drop-overlay.visible {
       display: flex;
       align-items: center;
       justify-content: center;
       pointer-events: none;
     }
     .global-drop-overlay .overlay-badge {
       background: var(--panel);
       border: 2px solid var(--accent);
       border-radius: 12px;
       padding: 24px 48px;
       color: #c8e1ff;
       font-size: 16px;
       font-weight: 600;
       box-shadow: 0 8px 32px rgba(0,0,0,0.5);
       pointer-events: none;
     }
     ```

  **HTML Changes** (in `<body>`):
  
  3. Replace `#compressDrop` content (line 343):
     ```html
     <div id="compressDrop" class="dropzone">
       <div class="dropzone-icon">📂</div>
       <div class="dropzone-text">拖拽文件/目录到这里</div>
       <div class="dropzone-hint">支持多选 · 也可拖到窗口任意位置</div>
     </div>
     ```

  4. Replace `#archiveDrop` content (line 372):
     ```html
     <div id="archiveDrop" class="dropzone">
       <div class="dropzone-icon">📦</div>
       <div class="dropzone-text">拖拽 .tar.lz4 文件到这里</div>
       <div class="dropzone-hint">也可拖到窗口任意位置</div>
     </div>
     ```

  5. Add overlay div right after `<div class="app">` open tag (after line 328):
     ```html
     <div id="globalDropOverlay" class="global-drop-overlay">
       <div class="overlay-badge" id="overlayBadge">释放以添加文件</div>
     </div>
     ```

  **JS Changes** (in `<script>` block):
  
  6. Add overlay element refs in `els` object:
     ```js
     globalDropOverlay: document.getElementById('globalDropOverlay'),
     overlayBadge: document.getElementById('overlayBadge'),
     ```

  7. **Replace** the entire `setupDropzone` function (lines 629-655) and the global window drag listeners (lines 800-809) with this VSCode-style implementation:

     ```js
     // ---- VSCode-style DragAndDropObserver ----
     // Uses counter to prevent child-element flicker
     // (see: microsoft/vscode src/vs/base/browser/dom.ts DragAndDropObserver)
     
     function isFileDrag(e) {
       if (!e.dataTransfer) return false;
       if (e.dataTransfer.types) {
         for (let i = 0; i < e.dataTransfer.types.length; i++) {
           if (e.dataTransfer.types[i] === 'Files' || e.dataTransfer.types[i] === 'application/x-moz-file') {
             return true;
           }
         }
       }
       return false;
     }
     
     function extractPaths(e) {
       return Array.from(e.dataTransfer?.files || [])
         .map((f) => f.path)
         .filter(Boolean);
     }
     
     function setupDropzone(el, onDropPaths) {
       let counter = 0;
       
       el.addEventListener('dragenter', (e) => {
         e.preventDefault();
         e.stopPropagation();
         counter++;
         if (counter === 1) {
           el.classList.add('dragover');
         }
       });
       
       el.addEventListener('dragover', (e) => {
         e.preventDefault();
         e.stopPropagation();
         if (e.dataTransfer) {
           e.dataTransfer.dropEffect = 'copy';
         }
       });
       
       el.addEventListener('dragleave', (e) => {
         e.preventDefault();
         e.stopPropagation();
         counter--;
         if (counter <= 0) {
           counter = 0;
           el.classList.remove('dragover');
         }
       });
       
       el.addEventListener('drop', (e) => {
         e.preventDefault();
         e.stopPropagation();
         counter = 0;
         el.classList.remove('dragover');
         if (state.running) return;
         const paths = extractPaths(e);
         if (paths.length > 0) onDropPaths(paths);
       });
       
       // Reset on dragend (drag cancelled / left window)
       el.addEventListener('dragend', () => {
         counter = 0;
         el.classList.remove('dragover');
       });
     }
     
     // ---- Full-window drop overlay (VSCode-style) ----
     
     let windowDragCounter = 0;
     
     function showOverlay() {
       const isCompress = state.tab === 'compress';
       els.overlayBadge.textContent = isCompress ? '释放以添加文件' : '释放以选择压缩包';
       els.globalDropOverlay.classList.add('visible');
     }
     
     function hideOverlay() {
       els.globalDropOverlay.classList.remove('visible');
     }
     
     window.addEventListener('dragenter', (e) => {
       if (!isFileDrag(e)) return;
       e.preventDefault();
       windowDragCounter++;
       if (windowDragCounter === 1 && !state.running) {
         showOverlay();
       }
     });
     
     window.addEventListener('dragover', (e) => {
       if (!isFileDrag(e)) return;
       e.preventDefault();
       if (e.dataTransfer) {
         e.dataTransfer.dropEffect = 'copy';
       }
     });
     
     window.addEventListener('dragleave', (e) => {
       if (!isFileDrag(e)) return;
       e.preventDefault();
       windowDragCounter--;
       if (windowDragCounter <= 0) {
         windowDragCounter = 0;
         hideOverlay();
       }
     });
     
     window.addEventListener('drop', (e) => {
       e.preventDefault();
       windowDragCounter = 0;
       hideOverlay();
       
       if (state.running) return;
       
       // Only process if not already handled by a dropzone (stopPropagation)
       const paths = extractPaths(e);
       if (paths.length === 0) return;
       
       if (state.tab === 'compress') {
         addSources(paths);
       } else {
         const first = paths[0];
         if (first) {
           state.archivePath = first;
           syncInputs();
         }
       }
     });
     
     // Safety: reset on dragend at window level
     window.addEventListener('dragend', () => {
       windowDragCounter = 0;
       hideOverlay();
     });
     ```

  8. Wire the dropzones (keep same position as lines 800-806, but using the new setupDropzone):
     ```js
     setupDropzone(els.compressDrop, (paths) => addSources(paths));
     setupDropzone(els.archiveDrop, (paths) => {
       const first = paths[0];
       if (!first) return;
       state.archivePath = first;
       syncInputs();
     });
     ```

  9. **Remove** old window drag prevention (the old lines 808-809):
     ```js
     // DELETE these two lines — replaced by full-window overlay handlers above
     // window.addEventListener('dragover', (e) => e.preventDefault());
     // window.addEventListener('drop', (e) => e.preventDefault());
     ```

  **Must NOT do**:
  - Don't modify worker.js, main.js, preload.js, package.json
  - Don't add auto tab-switching
  - Don't change the compress/decompress logic
  - Don't break existing path deduplication in `addSources()`

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: CSS + JS UI work in HTML file
  - Skills: [`frontend-ui-ux`] — UI/UX polish
  - Omitted: [`playwright`] — no automated browser testing setup in this project

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: F1-F4 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern source: VSCode `DragAndDropObserver` at `microsoft/vscode` `src/vs/base/browser/dom.ts:1981` — uses `counter` field, `counter++` on dragenter, `counter--` on dragleave, fires leave callback only when `counter === 0`, resets counter on drop
  - Target file: `electron-lz4-compressor/index.html` — ALL changes go here
  - CSS dropzone: lines 117-133
  - HTML dropzones: line 343 (`#compressDrop`), line 372 (`#archiveDrop`)
  - JS setupDropzone: lines 629-655
  - JS dropzone wiring: lines 800-806
  - JS global prevention: lines 808-809
  - JS state guard: line 644 (`if (state.running) return;`)
  - JS path extraction: lines 645-647 (`dataTransfer.files[].path`)
  - JS addSources: uses `platformKey` for dedup

  **Acceptance Criteria** (agent-executable only):
  - [ ] App starts without error: `npm start` exits normally after manual close
  - [ ] `#globalDropOverlay` element exists in DOM
  - [ ] `.dropzone` elements contain `.dropzone-icon`, `.dropzone-text`, `.dropzone-hint` children
  - [ ] No `TypeError` or `ReferenceError` in DevTools console on launch
  - [ ] Old naive `setupDropzone` (single dragleave → remove class) is fully replaced
  - [ ] `isFileDrag()` utility function exists to gate overlay on file-type drags only
  - [ ] `windowDragCounter` variable exists and is used for window-level counter tracking
  - [ ] CSS contains `.global-drop-overlay` and `.global-drop-overlay.visible` rules

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: Happy path — drop files on compress dropzone
    Tool: Bash (manual verification via code inspection)
    Steps: grep index.html for "counter++" and "counter--" in setupDropzone
    Expected: Both patterns found, confirming counter-based implementation
    Evidence: .sisyphus/evidence/task-1-fix-dnd-grep.txt

  Scenario: Overlay appears on window drag
    Tool: Bash (code inspection)
    Steps: grep index.html for "windowDragCounter" and "showOverlay" and "hideOverlay"
    Expected: All three patterns found
    Evidence: .sisyphus/evidence/task-1-fix-dnd-overlay.txt

  Scenario: Edge case — drag leaves window
    Tool: Bash (code inspection)
    Steps: grep index.html for "dragend" listener on window level
    Expected: Found, confirming safety reset
    Evidence: .sisyphus/evidence/task-1-fix-dnd-dragend.txt
  ```

  **Commit**: YES | Message: `fix(ui): replace naive drag-drop with VSCode counter-based pattern and full-window overlay` | Files: [`index.html`]

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
Single commit after task 1 completes and all QA passes.

## Success Criteria
- Drag-and-drop works without flicker
- Full-window overlay appears on file drag
- All existing compress/decompress functionality preserved
- Zero console errors on launch
