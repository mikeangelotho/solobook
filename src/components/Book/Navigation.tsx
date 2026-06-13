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
