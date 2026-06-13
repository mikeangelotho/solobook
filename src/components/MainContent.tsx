import { Show, createMemo } from "solid-js";
import { bookStore } from "~/lib/bookStore";
import Cover from "./Book/Cover";
import TableOfContents from "./Book/TableOfContents";
import Chapter from "./Book/Chapter";
import Appendix from "./Book/Appendix";
import Navigation from "./Book/Navigation";
import ProgressBar from "./Book/ProgressBar";

export default function MainContent() {
  const { state } = bookStore;

  return (
    <main class="flex-1 min-h-screen relative">
      <Show when={state.chapters.length > 0}>
        <ProgressBar />
      </Show>

      <Show
        when={state.chapters.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center min-h-[80vh] text-center px-8">
            <div class="text-6xl mb-6 opacity-40">📄</div>
            <h2 class="text-xl font-medium text-gray-600 mb-2">No chapters yet</h2>
            <p class="text-sm text-gray-400 max-w-sm">
              Add markdown files using the button in the sidebar, or drag & drop them anywhere on this page.
            </p>
          </div>
        }
      >
        <Show when={state.currentSection === "cover"}>
          <Cover />
        </Show>
        <Show when={state.currentSection === "toc"}>
          <TableOfContents />
        </Show>
        <Show when={state.currentSection === "appendix"}>
          <Appendix />
        </Show>
        <Show when={typeof state.currentSection === "number"}>
          <Chapter index={state.currentSection as number} />
        </Show>
      </Show>

      <Show when={state.chapters.length > 0}>
        <Navigation />
      </Show>
    </main>
  );
}
