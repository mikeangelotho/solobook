import { createStore, produce } from "solid-js/store";
import type { ParsedChapter } from "./markdown";

export type SectionId = "cover" | "toc" | number | "appendix";

export interface BookMeta {
  title: string;
  author: string;
  createdAt: string;
}

export interface BookState {
  meta: BookMeta;
  chapters: ParsedChapter[];
  currentSection: SectionId;
}

function createBookStore() {
  const [state, setState] = createStore<BookState>({
    meta: {
      title: "Untitled Book",
      author: "Unknown",
      createdAt: new Date().toISOString(),
    },
    chapters: [],
    currentSection: "cover",
  });

  const getToc = () => {
    const entries: {
      chapterIndex: number;
      chapterTitle: string;
      heading: { level: number; text: string; id: string };
    }[] = [];
    state.chapters.forEach((ch, i) => {
      ch.headings.forEach((h) => {
        entries.push({ chapterIndex: i, chapterTitle: ch.title, heading: h });
      });
    });
    return entries;
  };

  const getAppendix = () => {
    const allLinks: {
      text: string;
      url: string;
      chapterTitle: string;
      chapterIndex: number;
    }[] = [];
    state.chapters.forEach((ch, i) => {
      ch.links.forEach((link) => {
        allLinks.push({ ...link, chapterTitle: ch.title, chapterIndex: i });
      });
    });
    return allLinks;
  };

  const getSections = (): SectionId[] => {
    const sections: SectionId[] = ["cover", "toc"];
    state.chapters.forEach((_, i) => sections.push(i));
    sections.push("appendix");
    return sections;
  };

  const navigateTo = (section: SectionId) => {
    setState("currentSection", section);
    window.scrollTo(0, 0);
  };

  const navigateNext = () => {
    const sections = getSections();
    const idx = sections.indexOf(state.currentSection);
    if (idx < sections.length - 1) navigateTo(sections[idx + 1]);
  };

  const navigatePrev = () => {
    const sections = getSections();
    const idx = sections.indexOf(state.currentSection);
    if (idx > 0) navigateTo(sections[idx - 1]);
  };

  const setChapters = (chapters: ParsedChapter[]) => {
    setState("chapters", chapters);
    if (chapters.length > 0 && state.meta.title === "Untitled Book") {
      setState("meta", "title", chapters[0].title);
    }
  };

  const setMeta = (key: keyof BookMeta, value: string) => {
    setState("meta", key, value);
  };

  const reorderChapter = (fromIndex: number, toIndex: number) => {
    setState(
      produce((draft) => {
        const [moved] = draft.chapters.splice(fromIndex, 1);
        draft.chapters.splice(toIndex, 0, moved);
      })
    );
  };

  const removeChapter = (index: number) => {
    setState(
      produce((draft) => {
        draft.chapters.splice(index, 1);
      })
    );
  };

  return {
    state,
    getToc,
    getAppendix,
    getSections,
    navigateTo,
    navigateNext,
    navigatePrev,
    setChapters,
    setMeta,
    reorderChapter,
    removeChapter,
  };
}

export const bookStore = createBookStore();
