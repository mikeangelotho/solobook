import { createSignal, onMount, onCleanup } from "solid-js";
import { parseMarkdownFile, type ParsedChapter } from "~/lib/markdown";
import { workspaceStore } from "~/lib/workspaceStore";

export default function DragOverlay() {
  const [isDragging, setIsDragging] = createSignal(false);
  let dragCounter = 0;

  const processFiles = async (files: FileList) => {
    const mdFiles = Array.from(files).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".markdown") || f.type === "text/markdown"
    );
    if (mdFiles.length === 0) return;

    const parsedChapters: ParsedChapter[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      const text = await mdFiles[i].text();
      parsedChapters.push(parseMarkdownFile(text, mdFiles[i].name, i));
    }

    if (workspaceStore.state.activeBookId === null) {
      // Workspace mode: create a new book from dropped files
      workspaceStore.createBook("Untitled Book");
    }
    // In both cases, set chapters on the active book
    // (createBook above already set it as active; setChapters also auto-renames "Untitled Book")
    workspaceStore.setChapters(parsedChapters);
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
