import { Show } from "solid-js";
import { bookStore } from "~/lib/bookStore";

export default function Cover() {
  const { state, navigateTo } = bookStore;

  const totalWords = () =>
    state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return (
    <div class="min-h-[80vh] flex flex-col items-center justify-center text-center px-8">
      <div class="w-16 h-0.5 bg-[#0066ff] mx-auto mb-10" />

      <h1 class="text-4xl font-normal text-gray-900 mb-3 leading-tight">
        {state.meta.title}
      </h1>
      <Show when={state.meta.author && state.meta.author !== "Unknown"}>
        <p class="text-lg text-gray-500 mb-2">by {state.meta.author}</p>
      </Show>

      <div class="w-16 h-0.5 bg-gray-200 mx-auto mt-10 mb-8" />

      <div class="text-sm text-gray-400 space-y-1">
        <p>{state.chapters.length} chapters • {totalWords().toLocaleString()} words</p>
        <p>~{Math.ceil(totalWords() / 250)} min read</p>
      </div>

      <button
        class="mt-12 px-8 py-3 bg-[#0066ff] text-white rounded-md hover:bg-[#0052cc] transition-colors font-medium text-sm"
        onClick={() => navigateTo("toc")}
      >
        Begin Reading →
      </button>
    </div>
  );
}
