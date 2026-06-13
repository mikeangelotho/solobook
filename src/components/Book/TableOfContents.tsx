import { For, createMemo } from "solid-js";
import { workspaceStore } from "~/lib/workspaceStore";

export default function TableOfContents() {
  const { navigateTo, activeBook } = workspaceStore;
  const chapters = createMemo(() => activeBook()?.chapters ?? []);

  return (
    <div class="max-w-2xl mx-auto pt-16 pb-12 px-8 md:py-12">
      <h2 class="text-3xl font-bold text-gray-900 mb-8">Contents</h2>

      <div class="space-y-6">
        <For each={chapters()}>
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
