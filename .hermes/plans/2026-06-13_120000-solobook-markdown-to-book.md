# SoloBook — Markdown-to-Book App Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a SolidStart app that ingests markdown files (e.g. from Claude Projects) and arranges them into a navigable reference book with auto-generated cover, table of contents, and appendix.

**Architecture:** Client-side markdown processing with `marked` + `DOMPurify`. Book state managed via SolidJS `createStore`. Two-panel layout: persistent sidebar (chapter list, stats, upload) + main content area (preview/reader). Single-page app — no route changes between arrange and read modes.

**Tech Stack:** SolidStart 2.0 alpha, SolidJS 1.9, Tailwind CSS 4, Vite 7, `marked` (markdown→HTML), `dompurify` (XSS sanitization)

**Design System (from Variant B — Utilitarian Tool):**
- Layout: Sidebar (280px, left) + main content (flex-1)
- Sidebar: white bg, border-right, chapter list with active state highlight (#e6f2ff), stats footer
- Accent: `#0066ff` (blue)
- Reader typography: Georgia serif for body, system sans for UI chrome
- Code blocks: dark bg (#1a1a1a), light text
- Bottom nav: fixed, frosted glass (backdrop-blur), prev/next + current section label
- Progress bar: thin blue bar at top of reader
- Drag overlay: full-screen blue overlay on file drag
- Chapter list items: compact, monospace chapter numbers, word counts, hover actions

---

## Data Source Status

No external APIs. All data is user-provided markdown files processed entirely client-side. No fallback needed.

---

## Architecture Overview

```
User drops .md files
        ↓
  FileUpload component (drag/drop + file picker)
        ↓
  markdown.ts: parse each file → { title, headings[], content, links[] }
        ↓
  bookStore (createStore):
    - book: { title, author, chapters[], coverImage? }
    - toc: derived from all headings across chapters
    - appendix: derived from all links/references across chapters
    - currentSection: 'cover' | 'toc' | chapterIndex | 'appendix'
        ↓
  BookViewer renders current section:
    Cover → TableOfContents → Chapter 1..N → Appendix
        ↓
  Navigation: prev/next + sidebar TOC jump
```

---

## Phase 1: Dependencies & Project Setup

### Task 1: Install markdown parsing dependencies

**Objective:** Add `marked` and `dompurify` for safe markdown→HTML rendering.

**Files:**
- Modify: `package.json`

**Steps:**

```bash
cd /home/bippy/solobook
pnpm add marked dompurify
pnpm add -D @types/dompurify
```

**Verify:**
```bash
cat node_modules/marked/package.json | grep version
cat node_modules/dompurify/package.json | grep version
```

**Commit:**
```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add marked and dompurify for markdown processing"
```

---

### Task 2: Create path alias verification

**Objective:** Confirm the `~/*` path alias works for clean imports.

**Files:**
- Verify: `tsconfig.json` (already has `~/*` → `./src/*`)
- Verify: `vite.config.ts` (SolidStart handles this automatically)

**Steps:**

Just verify it's configured. SolidStart + the existing tsconfig already set this up. No changes needed.

**Verify:** Will be tested when we import using `~/lib/...` in later tasks.

---

## Phase 2: Markdown Processing Library

### Task 3: Create markdown parser utility

**Objective:** Build a module that parses a raw markdown string into a structured chapter object.

**Files:**
- Create: `src/lib/markdown.ts`

**Step 1: Write the parser module**

```typescript
// src/lib/markdown.ts
import { marked } from "marked";
import DOMPurify from "dompurify";

export interface ChapterHeading {
  level: number;
  text: string;
  id: string;
}

export interface ParsedChapter {
  id: string;
  title: string;
  rawMarkdown: string;
  html: string;
  headings: ChapterHeading[];
  links: { text: string; url: string }[];
  wordCount: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTitle(markdown: string, filename: string): string {
  // First H1 heading, or filename without extension
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return filename.replace(/\.md$/i, "").replace(/[-_]/g, " ");
}

function extractHeadings(markdown: string): ChapterHeading[] {
  const headings: ChapterHeading[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const text = match[2].trim();
      headings.push({
        level: match[1].length,
        text,
        id: slugify(text),
      });
    }
  }
  return headings;
}

function extractLinks(markdown: string): { text: string; url: string }[] {
  const links: { text: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }
  return links;
}

export function parseMarkdownFile(
  raw: string,
  filename: string,
  index: number
): ParsedChapter {
  const title = extractTitle(raw, filename);
  const headings = extractHeadings(raw);
  const links = extractLinks(raw);
  const wordCount = raw.split(/\s+/).filter(Boolean).length;

  // Configure marked for GitHub-compatible rendering
  const html = DOMPurify.sanitize(
    marked.parse(raw, { async: false }) as string,
    { ADD_ATTR: ["id", "target", "rel"] }
  );

  return {
    id: `chapter-${index}`,
    title,
    rawMarkdown: raw,
    html,
    headings,
    links,
    wordCount,
  };
}
```

**Step 2: Verify it compiles**

```bash
cd /home/bippy/solobook
npx tsc --noEmit src/lib/markdown.ts
```

Expected: No errors (or only unrelated project-level warnings).

**Commit:**
```bash
git add src/lib/markdown.ts
git commit -m "feat: add markdown parser utility"
```

---

### Task 4: Create book store (state management)

**Objective:** Centralized book state with reactive SolidJS store.

**Files:**
- Create: `src/lib/bookStore.ts`

**Step 1: Write the store**

```typescript
// src/lib/bookStore.ts
import { createStore, produce } from "solid-js/store";
import type { ParsedChapter } from "./markdown";

export type SectionId = "cover" | "toc" | number | "appendix";

export interface BookMeta {
  title: string;
  author: string;
  createdAt: string;
}

export interface BookState {
  meta: BookMeta;
  chapters: ParsedChapter[];
  currentSection: SectionId;
}

function createBookStore() {
  const [state, setState] = createStore<BookState>({
    meta: {
      title: "Untitled Book",
      author: "Unknown",
      createdAt: new Date().toISOString(),
    },
    chapters: [],
    currentSection: "cover",
  });

  // Derived: flat table of contents
  const getToc = () => {
    const entries: {
      chapterIndex: number;
      chapterTitle: string;
      heading: { level: number; text: string; id: string };
    }[] = [];
    state.chapters.forEach((ch, i) => {
      ch.headings.forEach((h) => {
        entries.push({ chapterIndex: i, chapterTitle: ch.title, heading: h });
      });
    });
    return entries;
  };

  // Derived: appendix (all links across chapters)
  const getAppendix = () => {
    const allLinks: {
      text: string;
      url: string;
      chapterTitle: string;
      chapterIndex: number;
    }[] = [];
    state.chapters.forEach((ch, i) => {
      ch.links.forEach((link) => {
        allLinks.push({ ...link, chapterTitle: ch.title, chapterIndex: i });
      });
    });
    return allLinks;
  };

  // Navigation
  const getSections = (): SectionId[] => {
    const sections: SectionId[] = ["cover", "toc"];
    state.chapters.forEach((_, i) => sections.push(i));
    sections.push("appendix");
    return sections;
  };

  const navigateTo = (section: SectionId) => {
    setState("currentSection", section);
    window.scrollTo(0, 0);
  };

  const navigateNext = () => {
    const sections = getSections();
    const idx = sections.indexOf(state.currentSection);
    if (idx < sections.length - 1) navigateTo(sections[idx + 1]);
  };

  const navigatePrev = () => {
    const sections = getSections();
    const idx = sections.indexOf(state.currentSection);
    if (idx > 0) navigateTo(sections[idx - 1]);
  };

  const setChapters = (chapters: ParsedChapter[]) => {
    setState("chapters", chapters);
    // Auto-set book title from first chapter if default
    if (chapters.length > 0 && state.meta.title === "Untitled Book") {
      setState("meta", "title", chapters[0].title);
    }
  };

  const setMeta = (key: keyof BookMeta, value: string) => {
    setState("meta", key, value);
  };

  const reorderChapter = (fromIndex: number, toIndex: number) => {
    setState(
      produce((draft) => {
        const [moved] = draft.chapters.splice(fromIndex, 1);
        draft.chapters.splice(toIndex, 0, moved);
      })
    );
  };

  const removeChapter = (index: number) => {
    setState(
      produce((draft) => {
        draft.chapters.splice(index, 1);
      })
    );
  };

  return {
    state,
    getToc,
    getAppendix,
    getSections,
    navigateTo,
    navigateNext,
    navigatePrev,
    setChapters,
    setMeta,
    reorderChapter,
    removeChapter,
  };
}

// Singleton store
export const bookStore = createBookStore();
```

**Commit:**
```bash
git add src/lib/bookStore.ts
git commit -m "feat: add book state store with navigation"
```

---

## Phase 3: Input Components

### Task 5: Create Sidebar component (permanent left panel)

**Objective:** Always-visible sidebar with chapter list, upload button, stats, and inline reorder actions.

**Files:**
- Create: `src/components/Sidebar.tsx`

**Step 1: Write the component**

```tsx
// src/components/Sidebar.tsx
import { For, Show, createSignal } from "solid-js";
import { bookStore } from "~/lib/bookStore";
import { parseMarkdownFile, type ParsedChapter } from "~/lib/markdown";

export default function Sidebar() {
  const { state, setChapters, reorderChapter, removeChapter, navigateTo } = bookStore;
  const fileInputRef = () => document.getElementById("sidebar-file-input") as HTMLInputElement;

  const processFiles = async (files: FileList | File[]) => {
    const mdFiles = Array.from(files).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".markdown") || f.type === "text/markdown"
    );
    if (mdFiles.length === 0) return;

    const chapters: ParsedChapter[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      const text = await mdFiles[i].text();
      chapters.push(parseMarkdownFile(text, mdFiles[i].name, i));
    }
    setChapters(chapters);
  };

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) processFiles(input.files);
  };

  const moveUp = (index: number) => {
    if (index > 0) reorderChapter(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index < state.chapters.length - 1) reorderChapter(index, index + 1);
  };

  const totalWords = () => state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const readingTime = () => Math.ceil(totalWords() / 250);

  return (
    <aside class="w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div class="px-5 py-5 border-b border-gray-200">
        <h1 class="text-xl font-semibold text-gray-900">SoloBook</h1>
        <p class="text-xs text-gray-500 mt-1">Markdown → Book</p>
      </div>

      {/* Upload button */}
      <div class="px-5 py-4 border-b border-gray-100">
        <button
          class="w-full bg-[#0066ff] text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-[#0052cc] transition-colors flex items-center justify-center gap-2"
          onClick={() => fileInputRef()?.click()}
        >
          <span class="text-lg leading-none">+</span>
          <span>Add markdown files</span>
        </button>
        <input
          id="sidebar-file-input"
          type="file"
          multiple
          accept=".md,.markdown,text/markdown"
          class="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Chapter list */}
      <div class="flex-1 overflow-y-auto py-2">
        <Show when={state.chapters.length > 0}>
          <For each={state.chapters}>
            {(chapter, index) => (
              <button
                class={`w-full text-left px-5 py-2.5 flex items-center gap-3 text-sm transition-colors group
                  ${state.currentSection === index() ? "bg-[#e6f2ff] text-[#0066ff]" : "hover:bg-gray-50 text-gray-700"}`}
                onClick={() => navigateTo(index())}
              >
                <span class={`text-xs font-mono font-semibold min-w-[20px] ${state.currentSection === index() ? "text-[#0066ff]" : "text-gray-400"}`}>
                  {String(index() + 1).padStart(2, "0")}
                </span>
                <span class="flex-1 truncate">{chapter.title}</span>
                <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {chapter.wordCount > 1000 ? `${(chapter.wordCount / 1000).toFixed(1)}k` : chapter.wordCount}
                </span>
                {/* Inline reorder actions */}
                <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    class="w-5 h-5 flex items-center justify-center rounded text-xs hover:bg-gray-200 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); moveUp(index()); }}
                  >↑</span>
                  <span
                    class="w-5 h-5 flex items-center justify-center rounded text-xs hover:bg-gray-200 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); moveDown(index()); }}
                  >↓</span>
                  <span
                    class="w-5 h-5 flex items-center justify-center rounded text-xs text-red-500 hover:bg-red-50 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); removeChapter(index()); }}
                  >✕</span>
                </div>
              </button>
            )}
          </For>
        </Show>
      </div>

      {/* Stats footer */}
      <Show when={state.chapters.length > 0}>
        <div class="px-5 py-4 border-t border-gray-200 text-xs text-gray-500 space-y-1.5">
          <div class="flex justify-between">
            <span>Chapters:</span>
            <span class="font-medium text-gray-700">{state.chapters.length}</span>
          </div>
          <div class="flex justify-between">
            <span>Total words:</span>
            <span class="font-medium text-gray-700">{totalWords().toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span>Reading time:</span>
            <span class="font-medium text-gray-700">~{readingTime()} min</span>
          </div>
        </div>
      </Show>
    </aside>
  );
}
```

**Commit:**
```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add permanent sidebar with chapter list and upload"
```

---

### Task 6: Create DragOverlay component

**Objective:** Full-screen blue overlay that appears when dragging files over the window.

**Files:**
- Create: `src/components/DragOverlay.tsx`

**Step 1: Write the component**

```tsx
// src/components/DragOverlay.tsx
import { createSignal, onMount, onCleanup } from "solid-js";
import { parseMarkdownFile, type ParsedChapter } from "~/lib/markdown";
import { bookStore } from "~/lib/bookStore";

export default function DragOverlay() {
  const [isDragging, setIsDragging] = createSignal(false);
  let dragCounter = 0;

  const processFiles = async (files: FileList) => {
    const mdFiles = Array.from(files).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".markdown") || f.type === "text/markdown"
    );
    if (mdFiles.length === 0) return;

    const chapters: ParsedChapter[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      const text = await mdFiles[i].text();
      chapters.push(parseMarkdownFile(text, mdFiles[i].name, i));
    }
    bookStore.setChapters(chapters);
  };

  onMount(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files) processFiles(e.dataTransfer.files);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    onCleanup(() => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    });
  });

  return (
    <div
      class={`fixed inset-0 bg-[#0066ff] z-[100] flex items-center justify-center transition-opacity duration-200 pointer-events-none
        ${isDragging() ? "opacity-95" : "opacity-0"}`}
    >
      <div class="text-white text-center">
        <div class="text-6xl mb-4">📄</div>
        <div class="text-2xl font-medium">Drop files to add chapters</div>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add src/components/DragOverlay.tsx
git commit -m "feat: add full-screen drag overlay for file drops"
```

---

## Phase 4: Book Viewer Components

### Task 7: Create Cover component

**Objective:** Render a minimal cover page with title, author, and metadata.

**Files:**
- Create: `src/components/Book/Cover.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/Cover.tsx
import { Show } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function Cover() {
  const { state, navigateTo } = bookStore;

  const totalWords = () =>
    state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return (
    <div class="min-h-[80vh] flex flex-col items-center justify-center text-center px-8">
      <div class="w-16 h-0.5 bg-[#0066ff] mx-auto mb-10" />

      <h1 class="text-4xl font-normal text-gray-900 mb-3 leading-tight">
        {state.meta.title}
      </h1>
      <Show when={state.meta.author && state.meta.author !== "Unknown"}>
        <p class="text-lg text-gray-500 mb-2">by {state.meta.author}</p>
      </Show>

      <div class="w-16 h-0.5 bg-gray-200 mx-auto mt-10 mb-8" />

      <div class="text-sm text-gray-400 space-y-1">
        <p>{state.chapters.length} chapters • {totalWords().toLocaleString()} words</p>
        <p>~{Math.ceil(totalWords() / 250)} min read</p>
      </div>

      <button
        class="mt-12 px-8 py-3 bg-[#0066ff] text-white rounded-md hover:bg-[#0052cc] transition-colors font-medium text-sm"
        onClick={() => navigateTo("toc")}
      >
        Begin Reading →
      </button>
    </div>
  );
}
```

**Commit:**
```bash
git add src/components/Book/Cover.tsx
git commit -m "feat: add book cover component"
```

---

### Task 8: Create TableOfContents component

**Objective:** Auto-generated TOC from all chapter headings, grouped by chapter.

**Files:**
- Create: `src/components/Book/TableOfContents.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/TableOfContents.tsx
import { For } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function TableOfContents() {
  const { state, navigateTo } = bookStore;

  return (
    <div class="max-w-2xl mx-auto py-12 px-8">
      <h2 class="text-3xl font-bold text-gray-900 mb-8">Contents</h2>

      <div class="space-y-6">
        <For each={state.chapters}>
          {(chapter, index) => (
            <div>
              <button
                class="text-left w-full group"
                onClick={() => navigateTo(index())}
              >
                <div class="flex items-baseline gap-3 mb-1">
                  <span class="text-sm font-mono text-gray-400">
                    {String(index() + 1).padStart(2, "0")}
                  </span>
                  <span class="text-lg font-semibold text-gray-800 group-hover:text-[#0066ff] transition-colors">
                    {chapter.title}
                  </span>
                </div>
              </button>

              {/* Sub-headings (h2, h3) indented */}
              <div class="ml-9 space-y-0.5">
                <For each={chapter.headings.filter((h) => h.level >= 2 && h.level <= 3)}>
                  {(heading) => (
                    <button
                      class={`block text-left text-sm text-gray-500 hover:text-[#0066ff] transition-colors truncate
                        ${heading.level === 3 ? "ml-4" : ""}`}
                      onClick={() => navigateTo(index())}
                    >
                      {heading.text}
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="mt-12 pt-6 border-t">
        <button
          class="text-[#0066ff] hover:text-[#0052cc] font-medium"
          onClick={() => navigateTo("appendix")}
        >
          Appendix: Collected Links →
        </button>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add src/components/Book/TableOfContents.tsx
git commit -m "feat: add table of contents component"
```

---

### Task 9: Create Chapter reader component

**Objective:** Render chapter markdown as styled HTML with heading anchors.

**Files:**
- Create: `src/components/Book/Chapter.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/Chapter.tsx
import { createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";

interface ChapterProps {
  index: number;
}

export default function Chapter(props: ChapterProps) {
  const { state } = bookStore;

  const chapter = createMemo(() => state.chapters[props.index]);

  // Add IDs to headings in HTML for anchor linking
  const processedHtml = createMemo(() => {
    if (!chapter()) return "";
    let html = chapter().html;
    // Add id attributes to h1-h6 tags for in-page navigation
    chapter().headings.forEach((h) => {
      html = html.replace(
        new RegExp(`(<h${h.level}>${escapeRegex(h.text)}</h${h.level}>)`),
        `<h${h.level} id="${h.id}">$1</h${h.level}>`
      );
    });
    return html;
  });

  return (
    <article class="max-w-2xl mx-auto py-12 px-8">
      <div class="mb-8">
        <span class="text-sm font-mono text-gray-400">
          Chapter {props.index + 1} of {state.chapters.length}
        </span>
      </div>

      <div
        class="reader-prose max-w-none
          prose prose-gray
          prose-headings:font-bold prose-headings:text-gray-900 prose-headings:font-sans
          prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12 prose-h1:font-normal prose-h1:leading-tight
          prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-12
          prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-9
          prose-p:leading-relaxed prose-p:mb-5
          prose-a:text-[#0066ff] prose-a:no-underline hover:prose-a:underline
          prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-[#c7254e]
          prose-pre:bg-[#1a1a1a] prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-5
          prose-blockquote:border-l-[#0066ff] prose-blockquote:text-gray-600 prose-blockquote:italic
          prose-ul:text-gray-700 prose-ol:text-gray-700
          prose-li:mb-1
          prose-img:rounded-lg prose-img:shadow-md
          prose-hr:border-gray-200"
        innerHTML={processedHtml()}
      />
    </article>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

**Note:** Tailwind Typography plugin (`@tailwindcss/typography`) is needed for `prose` classes. Install in the next task.

**Commit:**
```bash
git add src/components/Book/Chapter.tsx
git commit -m "feat: add chapter reader component"
```

---

### Task 10: Install Tailwind Typography plugin

**Objective:** Add `@tailwindcss/typography` for beautiful prose styling in chapters.

**Files:**
- Modify: `package.json`
- Modify: `src/app.css`

**Steps:**

```bash
cd /home/bippy/solobook
pnpm add @tailwindcss/typography
```

Then update `src/app.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

:root {
  --background-rgb: 214, 219, 220;
  --foreground-rgb: 0, 0, 0;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background-rgb: 0, 0, 0;
    --foreground-rgb: 255, 255, 255;
  }
}

body {
  background: rgb(var(--background-rgb));
  color: rgb(var(--foreground-rgb));
}
```

**Commit:**
```bash
git add package.json pnpm-lock.yaml src/app.css
git commit -m "feat: add tailwind typography plugin for prose styling"
```

---

### Task 11: Create Appendix component

**Objective:** Collected links/references from all chapters, grouped by source chapter.

**Files:**
- Create: `src/components/Book/Appendix.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/Appendix.tsx
import { For, Show, createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function Appendix() {
  const { getAppendix, navigateTo } = bookStore;

  const groupedLinks = createMemo(() => {
    const links = getAppendix();
    const groups: Record<number, { chapterTitle: string; links: typeof links }> = {};
    for (const link of links) {
      if (!groups[link.chapterIndex]) {
        groups[link.chapterIndex] = {
          chapterTitle: link.chapterTitle,
          links: [],
        };
      }
      groups[link.chapterIndex].links.push(link);
    }
    return Object.entries(groups).map(([idx, group]) => ({
      chapterIndex: Number(idx),
      ...group,
    }));
  });

  return (
    <div class="max-w-2xl mx-auto py-12 px-8">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">Appendix</h2>
      <p class="text-gray-500 mb-8">Collected references from all chapters</p>

      <Show
        when={groupedLinks().length > 0}
        fallback={
          <div class="text-center py-16 text-gray-400">
            <p class="text-lg">No links found in any chapter.</p>
            <p class="text-sm mt-2">
              Links in your markdown files will appear here automatically.
            </p>
          </div>
        }
      >
        <div class="space-y-8">
          <For each={groupedLinks()}>
            {(group) => (
              <div>
                <h3 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span class="text-sm font-mono text-gray-400">
                    Ch. {group.chapterIndex + 1}
                  </span>
                  {group.chapterTitle}
                </h3>
                <ul class="space-y-2">
                  <For each={group.links}>
                    {(link) => (
                      <li class="text-sm">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-[#0066ff] hover:underline break-all"
                        >
                          {link.text}
                        </a>
                        <span class="text-gray-400 ml-2 text-xs">
                          {link.url}
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
```

**Commit:**
```bash
git add src/components/Book/Appendix.tsx
git commit -m "feat: add appendix component with collected links"
```

---

### Task 12: Create Navigation component

**Objective:** Fixed bottom nav bar with prev/next buttons, current section label, and keyboard shortcuts.

**Files:**
- Create: `src/components/Book/Navigation.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/Navigation.tsx
import { createMemo, onMount, onCleanup } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function Navigation() {
  const { state, getSections, navigateNext, navigatePrev } = bookStore;

  const sections = createMemo(() => getSections());
  const currentIndex = createMemo(() => sections().indexOf(state.currentSection));

  const hasPrev = createMemo(() => currentIndex() > 0);
  const hasNext = createMemo(() => currentIndex() < sections().length - 1);

  const sectionLabel = createMemo(() => {
    const s = state.currentSection;
    if (s === "cover") return "Cover";
    if (s === "toc") return "Contents";
    if (s === "appendix") return "Appendix";
    if (typeof s === "number") return `Ch. ${s + 1}: ${state.chapters[s]?.title ?? ""}`;
    return "";
  });

  // Keyboard navigation
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "j") navigateNext();
      if (e.key === "ArrowLeft" || e.key === "k") navigatePrev();
    };
    document.addEventListener("keydown", handler);
    onCleanup(() => document.removeEventListener("keydown", handler));
  });

  return (
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-6 py-3 flex items-center justify-between z-40">
      <button
        class="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        onClick={navigatePrev}
        disabled={!hasPrev()}
      >
        ← Previous
      </button>

      <span class="text-sm text-gray-500 font-medium">{sectionLabel()}</span>

      <button
        class="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        onClick={navigateNext}
        disabled={!hasNext()}
      >
        Next →
      </button>
    </nav>
  );
}
```

**Commit:**
```bash
git add src/components/Book/Navigation.tsx
git commit -m "feat: add fixed bottom navigation bar with keyboard shortcuts"
```

---

### Task 13: Create ProgressBar component

**Objective:** Thin blue progress bar at the top of the reader showing reading progress.

**Files:**
- Create: `src/components/Book/ProgressBar.tsx`

**Step 1: Write the component**

```tsx
// src/components/Book/ProgressBar.tsx
import { createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function ProgressBar() {
  const { state, getSections } = bookStore;

  const progress = createMemo(() => {
    const sections = getSections();
    const idx = sections.indexOf(state.currentSection);
    if (idx < 0) return 0;
    return ((idx + 1) / sections.length) * 100;
  });

  return (
    <div class="fixed top-0 left-0 right-0 h-[3px] bg-gray-100 z-50">
      <div
        class="h-full bg-[#0066ff] transition-all duration-300 ease-out"
        style={{ width: `${progress()}%` }}
      />
    </div>
  );
}
```

**Commit:**
```bash
git add src/components/Book/ProgressBar.tsx
git commit -m "feat: add reading progress bar"
```

---

## Phase 5: Book Viewer Shell & Routing

### Task 14: Create MainContent component (right panel)

**Objective:** Main content area that renders the current section (empty state, cover, toc, chapter, or appendix).

**Files:**
- Create: `src/components/MainContent.tsx`

**Step 1: Write the component**

```tsx
// src/components/MainContent.tsx
import { Show, createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";
import Cover from "./Book/Cover";
import TableOfContents from "./Book/TableOfContents";
import Chapter from "./Book/Chapter";
import Appendix from "./Book/Appendix";
import Navigation from "./Book/Navigation";
import ProgressBar from "./Book/ProgressBar";

export default function MainContent() {
  const { state } = bookStore;

  const currentView = createMemo(() => {
    const section = state.currentSection;
    if (section === "cover") return <Cover />;
    if (section === "toc") return <TableOfContents />;
    if (section === "appendix") return <Appendix />;
    if (typeof section === "number") return <Chapter index={section} />;
    return <Cover />;
  });

  return (
    <main class="flex-1 min-h-screen relative">
      <Show when={state.chapters.length > 0}>
        <ProgressBar />
      </Show>

      <Show
        when={state.chapters.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center min-h-[80vh] text-center px-8">
            <div class="text-6xl mb-6 opacity-40">📄</div>
            <h2 class="text-xl font-medium text-gray-600 mb-2">No chapters yet</h2>
            <p class="text-sm text-gray-400 max-w-sm">
              Add markdown files using the button in the sidebar, or drag & drop them anywhere on this page.
            </p>
          </div>
        }
      >
        {currentView()}
      </Show>

      <Show when={state.chapters.length > 0}>
        <Navigation />
      </Show>
    </main>
  );
}
```

**Commit:**
```bash
git add src/components/MainContent.tsx
git commit -m "feat: add main content area with section routing"
```

---

### Task 15: Wire up the index route (two-panel layout)

**Objective:** Replace the default home page with the Variant B two-panel layout: sidebar + main content.

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Rewrite the index route**

```tsx
// src/routes/index.tsx
import Sidebar from "~/components/Sidebar";
import MainContent from "~/components/MainContent";
import DragOverlay from "~/components/DragOverlay";

export default function Home() {
  return (
    <div class="flex min-h-screen bg-white">
      <Sidebar />
      <MainContent />
      <DragOverlay />
    </div>
  );
}
```

**Commit:**
```bash
git add src/routes/index.tsx
git commit -m "feat: wire up two-panel layout with sidebar + main content"
```

---

## Phase 6: Polish & Verification

### Task 16: Clean up unused default files

**Objective:** Remove the default about route and 404 page references.

**Files:**
- Delete: `src/routes/[...404].tsx` (or keep as-is, it's fine)

**Steps:**

```bash
# The 404 page is fine to keep. Just clean up its content.
```

Optionally update `[...404].tsx` to remove the "About" link that goes nowhere.

**Commit:**
```bash
git add -A
git commit -m "chore: clean up default template references"
```

---

### Task 17: Update app.css for Variant B styling

**Objective:** Set up the design system — light theme, serif reader typography, system sans for UI chrome.

**Files:**
- Modify: `src/app.css`

**Step 1: Update styles**

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

:root {
  color-scheme: light;
  --color-accent: #0066ff;
  --color-accent-hover: #0052cc;
}

body {
  background: #ffffff;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Reader typography: serif body, sans UI */
.reader-prose {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 17px;
  line-height: 1.8;
  color: #333;
}

/* Smooth scrolling for in-page anchors */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar for sidebar */
aside::-webkit-scrollbar {
  width: 4px;
}
aside::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

/* Prose overrides for chapter content */
.prose {
  --tw-prose-body: #333;
  --tw-prose-headings: #1a1a1a;
  --tw-prose-links: #0066ff;
  --tw-prose-code: #c7254e;
  --tw-prose-pre-bg: #1a1a1a;
  --tw-prose-pre-code: #e8e8e8;
  --tw-prose-quote-borders: #0066ff;
}
```

**Commit:**
```bash
git add src/app.css
git commit -m "style: set Variant B design system — light theme, serif reader, blue accent"
```

---

### Task 18: End-to-end verification

**Objective:** Verify the full flow works: upload → arrange → read.

**Steps:**

1. Create test markdown files:
```bash
mkdir -p /tmp/solobook-test
cat > /tmp/solobook-test/chapter1.md << 'EOF'
# Introduction to Rust

Rust is a systems programming language.

## Memory Safety

Rust guarantees memory safety without garbage collection.

### Borrow Checker

The borrow checker enforces rules at compile time.

## Performance

Rust has zero-cost abstractions.

[The Rust Book](https://doc.rust-lang.org/book/)
[Crates.io](https://crates.io)
EOF

cat > /tmp/solobook-test/chapter2.md << 'EOF'
# Async Programming

Async/await in Rust.

## Futures

A Future represents a value that may not be ready yet.

## Tokio

Tokio is the most popular async runtime.

[Tokio Docs](https://tokio.rs)
EOF
```

2. Open `http://localhost:5000` in browser
3. Drag both files onto the upload zone
4. Verify:
   - [ ] Both files appear in the chapter list
   - [ ] Chapters can be reordered (↑↓)
   - [ ] Chapter can be removed (✕)
   - [ ] Book title auto-populates from first file's H1
   - [ ] "View Book" shows the cover
   - [ ] Cover shows correct chapter count and word count
   - [ ] "Begin Reading" → TOC shows all headings
   - [ ] Click chapter → markdown renders with proper styling
   - [ ] Prev/Next buttons work
   - [ ] Arrow keys navigate
   - [ ] Sidebar opens with ☰ and shows full TOC
   - [ ] Appendix shows all collected links grouped by chapter

---

## Risks & Tradeoffs

1. **Client-side only** — no persistence. Refreshing loses the book. Future: add localStorage save/load or export/import JSON.
2. **No PDF export in MVP** — would need `html2pdf.js` or server-side rendering. Defer to v2.
3. **Large files** — `marked` handles large markdown well, but 100+ chapter books may need virtualization. Unlikely for Claude Project exports.
4. **Heading ID collisions** — if two chapters have identical heading text, IDs collide. Low risk for typical content; can fix with chapter-prefixed IDs later.
5. **SolidStart 2.0 alpha** — some APIs may shift. Stick to core SolidJS primitives (createSignal, createStore) which are stable.

---

## Future Enhancements (Out of Scope for MVP)

- Export to PDF / EPUB
- Save/load book state to localStorage
- Dark mode toggle
- Search across all chapters
- Drag-to-reorder (instead of ↑↓ buttons)
- Paste markdown directly (not just file upload)
- URL import (fetch .md from a URL)
- Custom cover image upload
- Print-friendly CSS
