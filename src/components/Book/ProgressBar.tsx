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
