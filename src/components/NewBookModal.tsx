import { createSignal, createEffect, onCleanup, Show } from "solid-js";

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, author: string) => void;
}

export default function NewBookModal(props: NewBookModalProps) {
  const [title, setTitle] = createSignal("");
  const [author, setAuthor] = createSignal("");
  const [titleError, setTitleError] = createSignal("");
  let titleInputRef: HTMLInputElement | undefined;

  // Focus title input when modal opens
  createEffect(() => {
    if (props.isOpen) {
      // Reset form state on open
      setTitle("");
      setAuthor("");
      setTitleError("");
      // Focus after render
      requestAnimationFrame(() => {
        titleInputRef?.focus();
      });
    }
  });

  // Close on Escape key
  createEffect(() => {
    if (!props.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    if (!title().trim()) {
      setTitleError("Title is required");
      titleInputRef?.focus();
      return;
    }

    setTitleError("");
    props.onCreate(title().trim(), author().trim());
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleBackdropClick}
      >
        {/* Modal card */}
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 transform transition-all duration-200 scale-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-book-title"
        >
          {/* Header */}
          <h2 id="new-book-title" class="text-lg font-bold text-gray-900 mb-5">
            Create New Book
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} class="space-y-4">
            {/* Title field */}
            <div>
              <label
                for="book-title"
                class="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Title <span class="text-red-500">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="book-title"
                type="text"
                value={title()}
                onInput={(e) => {
                  setTitle(e.currentTarget.value);
                  if (titleError()) setTitleError("");
                }}
                placeholder="Enter book title"
                class={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                  titleError()
                    ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                    : "border-gray-200 focus:ring-[#0066ff]/20 focus:border-[#0066ff]"
                }`}
              />
              <Show when={titleError()}>
                <p class="mt-1.5 text-xs text-red-500">{titleError()}</p>
              </Show>
            </div>

            {/* Author field */}
            <div>
              <label
                for="book-author"
                class="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Author
              </label>
              <input
                id="book-author"
                type="text"
                value={author()}
                onInput={(e) => setAuthor(e.currentTarget.value)}
                placeholder="Enter author name (optional)"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-colors"
              />
            </div>

            {/* Buttons */}
            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={props.onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-2 text-sm font-medium bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
