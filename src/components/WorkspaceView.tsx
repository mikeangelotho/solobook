import { Show, For } from "solid-js";
import type { Book } from "~/lib/workspaceStore";
import BookCard from "./BookCard";

interface WorkspaceViewProps {
  books: Book[];
  onNewBook: () => void;
  onOpenBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
}

export default function WorkspaceView(props: WorkspaceViewProps) {
  return (
    <div class="px-4 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 max-w-6xl mx-auto">
      {/* Header */}
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Your Books</h1>
        <button
          class="bg-[#0066ff] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0052cc] transition-colors"
          onClick={props.onNewBook}
        >
          New Book
        </button>
      </div>

      {/* Content */}
      <Show
        when={props.books.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div class="text-6xl mb-6 opacity-40">📚</div>
            <h2 class="text-xl font-medium text-gray-600 mb-2">No books yet</h2>
            <p class="text-sm text-gray-400 mb-6 max-w-sm">
              Create your first book to get started.
            </p>
            <button
              class="bg-[#0066ff] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#0052cc] transition-colors"
              onClick={props.onNewBook}
            >
              Create your first book
            </button>
          </div>
        }
      >
        {/* Book grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={props.books}>
            {(book) => (
              <BookCard
                book={book}
                onOpen={() => props.onOpenBook(book.id)}
                onDelete={() => props.onDeleteBook(book.id)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
