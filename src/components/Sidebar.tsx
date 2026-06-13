import { For, Show } from "solid-js";
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
