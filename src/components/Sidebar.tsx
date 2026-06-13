import { For, Show, createSignal, createMemo } from "solid-js";
import { workspaceStore } from "~/lib/workspaceStore";
import { parseMarkdownFile, type ParsedChapter } from "~/lib/markdown";

interface SidebarProps {
  onNewBook?: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const { state, activeBook, books, setChapters, reorderChapter, removeChapter, navigateTo, setActiveBook, returnToWorkspace, setMeta } = workspaceStore;
  const chapters = createMemo(() => activeBook()?.chapters ?? []);
  const isWorkspaceMode = createMemo(() => state.activeBookId === null);
  const [isOpen, setIsOpen] = createSignal(false);
  const [isEditingMeta, setIsEditingMeta] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editAuthor, setEditAuthor] = createSignal("");
  let fileInputEl: HTMLInputElement | undefined;

  const processFiles = async (files: FileList | File[]) => {
    const mdFiles = Array.from(files).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".markdown") || f.type === "text/markdown"
    );
    if (mdFiles.length === 0) return;

    const parsedChapters: ParsedChapter[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      const text = await mdFiles[i].text();
      parsedChapters.push(parseMarkdownFile(text, mdFiles[i].name, i));
    }
    setChapters(parsedChapters);
  };

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) processFiles(input.files);
  };

  const handleUploadClick = () => {
    if (fileInputEl) fileInputEl.click();
  };

  const moveUp = (index: number) => {
    if (index > 0) reorderChapter(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index < chapters().length - 1) reorderChapter(index, index + 1);
  };

  const totalWords = () => chapters().reduce((sum, ch) => sum + ch.wordCount, 0);
  const readingTime = () => Math.ceil(totalWords() / 250);

  const handleBookClick = (id: string) => {
    setActiveBook(id);
    setIsOpen(false);
  };

  const handleBackToLibrary = () => {
    returnToWorkspace();
    setIsOpen(false);
  };

  const bookWordCount = (book: { chapters: ParsedChapter[] }) =>
    book.chapters.reduce((sum: number, ch: ParsedChapter) => sum + ch.wordCount, 0);

  const handleEnterEditMode = () => {
    const book = activeBook();
    if (book) {
      setEditTitle(book.meta.title);
      setEditAuthor(book.meta.author);
      setIsEditingMeta(true);
    }
  };

  const handleSaveMeta = () => {
    if (editTitle().trim()) {
      setMeta("title", editTitle().trim());
      setMeta("author", editAuthor().trim() || "Unknown");
    }
    setIsEditingMeta(false);
  };

  const handleCancelEdit = () => {
    setIsEditingMeta(false);
  };

  return (
    <>
      {/* Mobile hamburger toggle */}
      <button
        class="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm"
        onClick={() => setIsOpen(!isOpen())}
      >
        <span class="text-lg">{isOpen() ? "✕" : "☰"}</span>
      </button>

      {/* Mobile backdrop */}
      <Show when={isOpen()}>
        <div
          class="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      </Show>

      <aside
        class={`fixed md:sticky top-0 left-0 h-screen w-[280px] bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-200
          ${isOpen() ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Header */}
        <div class="px-5 py-5 border-b border-gray-200">
          <h1 class="text-xl font-semibold text-gray-900">SoloBook</h1>
          <Show when={isWorkspaceMode()} fallback={
            <Show when={isEditingMeta()} fallback={
              <p
                class="text-xs text-gray-500 mt-1 truncate cursor-pointer hover:text-[#0066ff] transition-colors"
                onClick={handleEnterEditMode}
                title="Click to edit"
              >
                {activeBook()?.meta.title ?? "Untitled"}
              </p>
            }>
              <div class="mt-2 space-y-1.5">
                <input
                  type="text"
                  value={editTitle()}
                  onInput={(e) => setEditTitle(e.currentTarget.value)}
                  placeholder="Title"
                  class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0066ff] focus:border-[#0066ff]"
                />
                <input
                  type="text"
                  value={editAuthor()}
                  onInput={(e) => setEditAuthor(e.currentTarget.value)}
                  placeholder="Author"
                  class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0066ff] focus:border-[#0066ff]"
                />
                <div class="flex gap-1.5">
                  <button
                    class="flex-1 bg-[#0066ff] text-white px-2 py-1 rounded text-xs font-medium hover:bg-[#0052cc] transition-colors"
                    onClick={handleSaveMeta}
                  >
                    Save
                  </button>
                  <button
                    class="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Show>
          }>
            <p class="text-xs text-gray-500 mt-1">Your Library</p>
          </Show>
        </div>

        {/* --- Workspace mode --- */}
        <Show when={isWorkspaceMode()}>
          {/* Book list */}
          <div class="flex-1 overflow-y-auto py-2">
            <Show when={books().length > 0} fallback={
              <div class="px-5 py-8 text-center text-sm text-gray-400">
                No books yet. Create one to get started.
              </div>
            }>
              <For each={books()}>
                {(book) => (
                  <button
                    class="w-full text-left px-5 py-3 flex flex-col gap-0.5 text-sm hover:bg-gray-50 transition-colors"
                    onClick={() => handleBookClick(book.id)}
                  >
                    <span class="font-medium text-gray-900 truncate">{book.meta.title}</span>
                    <span class="text-xs text-gray-400">
                      {book.chapters.length} {book.chapters.length === 1 ? "chapter" : "chapters"} · {bookWordCount(book).toLocaleString()} words
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>

          {/* New Book button */}
          <Show when={props.onNewBook}>
            <div class="px-4 py-3 border-t border-gray-100">
              <button
                class="w-full bg-[#0066ff] text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-[#0052cc] transition-colors flex items-center justify-center gap-1.5"
                onClick={() => { props.onNewBook?.(); setIsOpen(false); }}
              >
                <span class="text-base leading-none">+</span>
                <span>New Book</span>
              </button>
            </div>
          </Show>
        </Show>

        {/* --- Book mode --- */}
        <Show when={!isWorkspaceMode()}>
          {/* Back to Library button */}
          <div class="px-4 py-3 border-b border-gray-100">
            <button
              class="w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
              onClick={handleBackToLibrary}
            >
              <span>←</span>
              <span>Back to Library</span>
            </button>
          </div>

          {/* Upload button */}
          <div class="px-4 py-3 border-b border-gray-100">
            <button
              class="w-full bg-[#0066ff] text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-[#0052cc] transition-colors flex items-center justify-center gap-1.5"
              onClick={handleUploadClick}
            >
              <span class="text-base leading-none">+</span>
              <span>Add files</span>
            </button>
            <input
              ref={fileInputEl}
              type="file"
              multiple
              accept=".md,.markdown,text/markdown"
              class="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Chapter list */}
          <div class="flex-1 overflow-y-auto py-2">
            <Show when={chapters().length > 0}>
              <For each={chapters()}>
                {(chapter, index) => (
                  <button
                    class={`w-full text-left px-5 py-2.5 flex items-center gap-3 text-sm transition-colors group
                      ${state.currentSection === index() ? "bg-[#e6f2ff] text-[#0066ff]" : "hover:bg-gray-50 text-gray-700"}`}
                    onClick={() => { navigateTo(index()); setIsOpen(false); }}
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
          <Show when={chapters().length > 0}>
            <div class="px-5 py-4 border-t border-gray-200 text-xs text-gray-500 space-y-1.5">
              <div class="flex justify-between">
                <span>Chapters:</span>
                <span class="font-medium text-gray-700">{chapters().length}</span>
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
        </Show>
      </aside>
    </>
  );
}
