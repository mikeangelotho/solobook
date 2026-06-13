import { createSignal, createMemo, Show } from "solid-js";
import type { Book } from "~/lib/workspaceStore";

interface BookCardProps {
  book: Book;
  onOpen: () => void;
  onDelete: () => void;
}

export default function BookCard(props: BookCardProps) {
  const [showConfirm, setShowConfirm] = createSignal(false);

  const chapterCount = createMemo(() => props.book.chapters.length);

  const totalWords = createMemo(() =>
    props.book.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
  );

  const formattedWords = createMemo(() => {
    const words = totalWords();
    if (words >= 1000) {
      return `${(words / 1000).toFixed(1)}k`;
    }
    return words.toString();
  });

  const lastModified = createMemo(() => {
    const date = new Date(props.book.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setShowConfirm(false);
    props.onDelete();
  };

  const cancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div class="group relative border border-gray-200 rounded-xl p-5 bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-200 hover:-translate-y-0.5">
      {/* Title */}
      <h3 class="text-lg font-bold text-gray-900 truncate mb-3" title={props.book.meta.title}>
        {props.book.meta.title}
      </h3>

      {/* Author */}
      <Show when={props.book.meta.author && props.book.meta.author !== "Unknown"}>
        <p class="text-sm text-gray-500 truncate mb-3">{props.book.meta.author}</p>
      </Show>

      {/* Stats row */}
      <div class="flex items-center gap-3 text-xs text-gray-400 mb-4">
        <span class="flex items-center gap-1">
          <span class="font-medium text-gray-500">{chapterCount()}</span>
          <span>{chapterCount() === 1 ? "chapter" : "chapters"}</span>
        </span>
        <span class="text-gray-300">·</span>
        <span class="flex items-center gap-1">
          <span class="font-medium text-gray-500">{formattedWords()}</span>
          <span>words</span>
        </span>
        <span class="text-gray-300">·</span>
        <span>{lastModified()}</span>
      </div>

      {/* Action buttons */}
      <div class="flex items-center gap-2">
        <button
          class="flex-1 bg-[#0066ff] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0052cc] transition-colors"
          onClick={props.onOpen}
        >
          Open
        </button>
        <button
          class="px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          onClick={handleDeleteClick}
        >
          Delete
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <Show when={showConfirm()}>
        <div class="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-5 z-10">
          <p class="text-sm font-medium text-gray-900 mb-1">Delete this book?</p>
          <p class="text-xs text-gray-500 mb-4 text-center">This action cannot be undone.</p>
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={confirmDelete}
            >
              Delete
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={cancelDelete}
            >
              Cancel
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
