import { createSignal } from "solid-js";
import Sidebar from "~/components/Sidebar";
import MainContent from "~/components/MainContent";
import DragOverlay from "~/components/DragOverlay";
import NewBookModal from "~/components/NewBookModal";
import { workspaceStore } from "~/lib/workspaceStore";

export default function Home() {
  const [isNewBookModalOpen, setIsNewBookModalOpen] = createSignal(false);

  const handleNewBook = (title: string, author: string) => {
    workspaceStore.createBook(title, author);
    setIsNewBookModalOpen(false);
  };

  return (
    <div class="flex min-h-screen bg-white">
      <Sidebar onNewBook={() => setIsNewBookModalOpen(true)} />
      <MainContent onNewBook={() => setIsNewBookModalOpen(true)} />
      <DragOverlay />
      <NewBookModal
        isOpen={isNewBookModalOpen()}
        onClose={() => setIsNewBookModalOpen(false)}
        onCreate={handleNewBook}
      />
    </div>
  );
}
