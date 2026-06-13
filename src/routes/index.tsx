import Sidebar from "~/components/Sidebar";
import MainContent from "~/components/MainContent";
import DragOverlay from "~/components/DragOverlay";

export default function Home() {
  return (
    <div class="flex min-h-screen bg-white">
      <Sidebar />
      <MainContent />
      <DragOverlay />
    </div>
  );
}
