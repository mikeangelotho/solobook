import { createStore, produce } from "solid-js/store";
import type { ParsedChapter } from "./markdown";

export type SectionId = "cover" | "toc" | number | "appendix";

export interface BookMeta {
    title: string;
    author: string;
    createdAt: string;
}

export interface Book {
    id: string;
    meta: BookMeta;
    chapters: ParsedChapter[];
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceState {
    books: Book[];
    activeBookId: string | null;
    currentSection: SectionId;
}

export interface WorkspaceStats {
    totalBooks: number;
    totalChapters: number;
    totalWords: number;
}


const STORAGE_KEY = "solobook-workspace";
const OLD_STORAGE_KEY = "solobook-book";
const DEBOUNCE_MS = 300;

function generateId(): string {
    return `book_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// --- localStorage persistence ---

// Check if localStorage is actually writable (catches Brave Shields blocking it)
function checkStorageAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const testKey = "__solobook_test__";
        localStorage.setItem(testKey, "1");
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

const storageAvailable = checkStorageAvailable();

function loadFromStorage(): WorkspaceState | null {
    if (!storageAvailable) return null;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.books)) {
                return parsed as WorkspaceState;
            }
        }
    } catch {
        // Corrupt data — start fresh
        localStorage.removeItem(STORAGE_KEY);
    }
    return null;
}

function migrateOldBookStore(): Book | null {
    if (!storageAvailable) return null;
    
    try {
        const raw = localStorage.getItem(OLD_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed) return null;

        // Old format: could be a single book or an object with chapters
        const now = new Date().toISOString();
        const book: Book = {
            id: generateId(),
            meta: {
                title: parsed.meta?.title ?? parsed.title ?? "Migrated Book",
                author: parsed.meta?.author ?? parsed.author ?? "Unknown",
                createdAt: parsed.meta?.createdAt ?? parsed.createdAt ?? now,
            },
            chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
            createdAt: parsed.createdAt ?? now,
            updatedAt: parsed.updatedAt ?? now,
        };

        // Remove old key after successful migration
        localStorage.removeItem(OLD_STORAGE_KEY);
        return book;
    } catch {
        // Corrupt old data — just remove it
        localStorage.removeItem(OLD_STORAGE_KEY);
        return null;
    }
}

function createWorkspaceStore() {
    // Load persisted state or migrate from old format
    const persisted = loadFromStorage();
    const migratedBook = !persisted ? migrateOldBookStore() : null;

    const initialState: WorkspaceState = persisted ?? {
        books: migratedBook ? [migratedBook] : [],
        activeBookId: migratedBook ? migratedBook.id : null,
        currentSection: "cover" as SectionId,
    };

    const [state, setState] = createStore<WorkspaceState>(initialState);

    // Debounced save to localStorage
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    const saveToStorage = () => {
        if (!storageAvailable) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {
                // Storage full or unavailable — silently ignore
            }
        }, DEBOUNCE_MS);
    };

    // --- Derived getters ---

    const activeBook = (): Book | null => {
        if (!state.activeBookId) return null;
        return state.books.find((b) => b.id === state.activeBookId) ?? null;
    };

    const books = (): Book[] => {
        return [...state.books];
    };

    const workspaceStats = (): WorkspaceStats => {
        let totalChapters = 0;
        let totalWords = 0;
        for (const book of state.books) {
            totalChapters += book.chapters.length;
            for (const ch of book.chapters) {
                totalWords += ch.wordCount;
            }
        }
        return {
            totalBooks: state.books.length,
            totalChapters,
            totalWords,
        };
    };

    // --- Workspace actions ---

    const createBook = (title: string, author?: string): Book => {
        const now = new Date().toISOString();
        const book: Book = {
            id: generateId(),
            meta: {
                title,
                author: author ?? "Unknown",
                createdAt: now,
            },
            chapters: [],
            createdAt: now,
            updatedAt: now,
        };
        setState(
            produce((draft) => {
                draft.books.push(book);
                draft.activeBookId = book.id;
                draft.currentSection = "cover";
            }),
        );
        saveToStorage();
        return book;
    };

    const deleteBook = (id: string) => {
        setState(
            produce((draft) => {
                draft.books = draft.books.filter((b) => b.id !== id);
                if (draft.activeBookId === id) {
                    draft.activeBookId =
                        draft.books.length > 0 ? draft.books[0].id : null;
                    draft.currentSection = "cover";
                }
            }),
        );
        saveToStorage();
    };

    const setActiveBook = (id: string) => {
        const book = state.books.find((b) => b.id === id);
        if (book) {
            setState("activeBookId", id);
            setState("currentSection", "cover");
            saveToStorage();
        }
    };

    const returnToWorkspace = () => {
        setState("activeBookId", null);
        setState("currentSection", "cover");
        saveToStorage();
    };

    // --- Active-book-scoped actions ---

    const getActiveBookIndex = (): number => {
        if (!state.activeBookId) return -1;
        return state.books.findIndex((b) => b.id === state.activeBookId);
    };

    const updateActiveBook = (updater: (book: Book) => void) => {
        const idx = getActiveBookIndex();
        if (idx < 0) return;
        setState(
            produce((draft) => {
                const book = draft.books[idx];
                updater(book);
                book.updatedAt = new Date().toISOString();
            }),
        );
        saveToStorage();
    };

    const getToc = () => {
        const book = activeBook();
        if (!book) return [];
        const entries: {
            chapterIndex: number;
            chapterTitle: string;
            heading: { level: number; text: string; id: string };
        }[] = [];
        book.chapters.forEach((ch, i) => {
            ch.headings.forEach((h) => {
                entries.push({
                    chapterIndex: i,
                    chapterTitle: ch.title,
                    heading: h,
                });
            });
        });
        return entries;
    };

    const getAppendix = () => {
        const book = activeBook();
        if (!book) return [];
        const allLinks: {
            text: string;
            url: string;
            chapterTitle: string;
            chapterIndex: number;
        }[] = [];
        book.chapters.forEach((ch, i) => {
            ch.links.forEach((link) => {
                allLinks.push({
                    ...link,
                    chapterTitle: ch.title,
                    chapterIndex: i,
                });
            });
        });
        return allLinks;
    };

    const getSections = (): SectionId[] => {
        const book = activeBook();
        if (!book) return ["cover"];
        const sections: SectionId[] = ["cover", "toc"];
        book.chapters.forEach((_, i) => sections.push(i));
        sections.push("appendix");
        return sections;
    };

    const navigateTo = (section: SectionId) => {
        setState("currentSection", section);
        window.scrollTo(0, 0);
        saveToStorage();
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
        updateActiveBook((book) => {
            book.chapters = chapters;
            if (chapters.length > 0 && book.meta.title === "Untitled Book") {
                book.meta.title = chapters[0].title;
            }
        });
    };

    const setMeta = (key: keyof BookMeta, value: string) => {
        updateActiveBook((book) => {
            (book.meta as any)[key] = value;
        });
    };

    const reorderChapter = (fromIndex: number, toIndex: number) => {
        updateActiveBook((book) => {
            const [moved] = book.chapters.splice(fromIndex, 1);
            book.chapters.splice(toIndex, 0, moved);
        });
    };

    const removeChapter = (index: number) => {
        updateActiveBook((book) => {
            book.chapters.splice(index, 1);
        });
    };

    return {
        state,
        storageAvailable,
        // Derived getters
        activeBook,
        books,
        workspaceStats,
        // Workspace actions
        createBook,
        deleteBook,
        setActiveBook,
        returnToWorkspace,
        // Active-book-scoped actions
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

export const workspaceStore = createWorkspaceStore();
