import { For, Show, createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function Appendix() {
  const { getAppendix } = bookStore;

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
