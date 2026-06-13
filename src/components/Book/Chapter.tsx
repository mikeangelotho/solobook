import { createMemo } from "solid-js";
import { workspaceStore } from "~/lib/workspaceStore";

interface ChapterProps {
  index: number;
}

export default function Chapter(props: ChapterProps) {
  const { activeBook } = workspaceStore;
  const chapters = createMemo(() => activeBook()?.chapters ?? []);

  const chapter = createMemo(() => chapters()[props.index]);

  const processedHtml = createMemo(() => {
    if (!chapter()) return "";
    let html = chapter().html;
    chapter().headings.forEach((h) => {
      html = html.replace(
        new RegExp(`(<h${h.level}>${escapeRegex(h.text)}</h${h.level}>)`),
        `<h${h.level} id="${h.id}">$1</h${h.level}>`
      );
    });
    return html;
  });

  return (
    <article class="max-w-2xl mx-auto py-12 px-8">
      <div class="mb-8">
        <span class="text-sm font-mono text-gray-400">
          Chapter {props.index + 1} of {chapters().length}
        </span>
      </div>

      <div
        class="reader-prose max-w-none
          prose prose-gray
          prose-headings:font-bold prose-headings:text-gray-900 prose-headings:font-sans
          prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12 prose-h1:font-normal prose-h1:leading-tight
          prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-12
          prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-9
          prose-p:leading-relaxed prose-p:mb-5
          prose-a:text-[#0066ff] prose-a:no-underline hover:prose-a:underline
          prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-[#c7254e]
          prose-pre:bg-[#1a1a1a] prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-5
          prose-blockquote:border-l-[#0066ff] prose-blockquote:text-gray-600 prose-blockquote:italic
          prose-ul:text-gray-700 prose-ol:text-gray-700
          prose-li:mb-1
          prose-img:rounded-lg prose-img:shadow-md
          prose-hr:border-gray-200"
        innerHTML={processedHtml()}
      />
    </article>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
