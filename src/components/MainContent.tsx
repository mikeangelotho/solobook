import { Show, createMemo } from "solid-js";
import { workspaceStore } from "~/lib/workspaceStore";
import Cover from "./Book/Cover";
import TableOfContents from "./Book/TableOfContents";
import Chapter from "./Book/Chapter";
import Appendix from "./Book/Appendix";
import Navigation from "./Book/Navigation";
import ProgressBar from "./Book/ProgressBar";
import WorkspaceView from "./WorkspaceView";

interface MainContentProps {
  onNewBook?: () => void;
}

export default function MainContent(props: MainContentProps) {
  const { state, activeBook } = workspaceStore;
  const chapters = createMemo(() => activeBook()?.chapters ?? []);

  return (
    <main class="flex-1 min-h-screen relative">
      <Show when={state.activeBookId === null}>
        <WorkspaceView
          books={workspaceStore.state.books}
          onNewBook={props.onNewBook ?? (() => {})}
          onOpenBook={(id) => workspaceStore.setActiveBook(id)}
          onDeleteBook={(id) => workspaceStore.deleteBook(id)}
        />
      </Show>

      <Show when={state.activeBookId !== null}>
        <Show when={chapters().length > 0}>
          <ProgressBar />
        </Show>

        <Show
          when={chapters().length > 0}
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

        <Show when={chapters().length > 0}>
          <Navigation />
        </Show>
      </Show>
    </main>
  );
}
