# SoloBook Workspaces Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a workspace layer that lets users manage multiple books, view all books at a glance, and navigate workspace → book → chapters.

**Architecture:** Extend bookStore to manage multiple books instead of a single book. Add workspace-level UI (book grid/list view). Persist workspace state to localStorage so books survive page refresh. Sidebar switches between workspace view (book list) and book view (chapter list).

**Tech Stack:** SolidStart 2.0 alpha, SolidJS 1.9, Tailwind CSS 4, localStorage for persistence

---

## Data Model Changes

**Current:**
```typescript
interface BookState {
  meta: BookMeta;
  chapters: ParsedChapter[];
  currentSection: SectionId;
}
```

**New:**
```typescript
interface Book {
  id: string;
  meta: BookMeta;
  chapters: ParsedChapter[];
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceState {
  books: Book[];
  activeBookId: string | null; // null = workspace view
  currentSection: SectionId;
}
```

**Key changes:**
- `bookStore` becomes `workspaceStore` (or we keep the name but change the shape)
- Each book gets a unique ID
- `activeBookId` controls whether we're in workspace view (null) or book view (book ID)
- All navigation/chapter operations scope to the active book

---

## UI Flow

### Workspace View (when no book is active)
- **Sidebar:** Shows list of books (title, chapter count, word count, last modified)
- **Main content:** Grid of book cards with:
  - Book title
  - Chapter count
  - Total words
  - Last modified date
  - "Open" button → enters book view
  - "Delete" button (with confirmation)
- **Empty state:** "No books yet. Create your first book."

### Book View (when a book is active)
- **Sidebar:** Shows chapter list for active book (current behavior)
- **Main content:** Cover → TOC → Chapters → Appendix (current behavior)
- **Back button:** Returns to workspace view

### Creating a New Book
- "New Book" button in workspace view
- Opens modal or inline form: title, author (optional)
- Creates empty book, enters book view
- User uploads markdown files as before

---

## Implementation Tasks

### Phase 1: Data Model & Store Refactor

#### Task 1: Refactor bookStore to workspaceStore

**Objective:** Change the store shape from single-book to multi-book workspace.

**Files:**
- Modify: `src/lib/bookStore.ts` → `src/lib/workspaceStore.ts`
- Update all imports

**Changes:**
1. Define `Book` interface with id, meta, chapters, timestamps
2. Define `WorkspaceState` with books[], activeBookId, currentSection
3. Add derived getters: `activeBook()`, `books()`, `workspaceStats()`
4. Add workspace actions: `createBook()`, `deleteBook()`, `setActiveBook()`, `returnToWorkspace()`
5. Scope existing chapter actions to active book
6. Add localStorage persistence (save on change, load on init)

**Verification:**
- All existing chapter operations still work
- New workspace operations work
- Page refresh preserves books

---

#### Task 2: Add localStorage persistence

**Objective:** Save workspace state to localStorage so books survive refresh.

**Files:**
- Modify: `src/lib/workspaceStore.ts`

**Changes:**
1. On store init, load from `localStorage.getItem("solobook-workspace")`
2. On every state change, save to localStorage (debounced)
3. Handle parse errors gracefully (corrupt data → start fresh)

**Verification:**
- Create book, add chapters, refresh page → book still there
- Corrupt localStorage manually → app starts fresh without crashing

---

### Phase 2: Workspace UI Components

#### Task 3: Create BookCard component

**Objective:** Card component for workspace grid view showing book summary.

**Files:**
- Create: `src/components/BookCard.tsx`

**Design:**
- Title (large, bold)
- Stats row: chapters, words, last modified
- "Open" button (primary)
- "Delete" button (secondary, with confirmation)
- Hover effect: slight elevation

**Props:**
```typescript
interface BookCardProps {
  book: Book;
  onOpen: () => void;
  onDelete: () => void;
}
```

---

#### Task 4: Create WorkspaceView component

**Objective:** Main content area for workspace view — grid of BookCards.

**Files:**
- Create: `src/components/WorkspaceView.tsx`

**Layout:**
- Header: "Your Books" + "New Book" button
- Grid: 2-3 columns (responsive), BookCards
- Empty state: "No books yet. Create your first book."

**Empty state design:**
- Centered, minimal
- Large icon (📚)
- "No books yet"
- "Create your first book" button

---

#### Task 5: Create NewBookModal component

**Objective:** Modal form for creating a new book (title, author).

**Files:**
- Create: `src/components/NewBookModal.tsx`

**Fields:**
- Title (required)
- Author (optional)

**Behavior:**
- Opens when "New Book" clicked
- Submits → creates book, enters book view
- Cancel → closes modal

---

#### Task 6: Update Sidebar for workspace/book switching

**Objective:** Sidebar shows book list in workspace view, chapter list in book view.

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Changes:**
1. Check `activeBookId` to determine view mode
2. **Workspace mode:**
   - Header: "SoloBook" + "Your Library"
   - Book list (title, chapter count)
   - Click book → setActiveBook()
   - "New Book" button at bottom
3. **Book mode:**
   - Header: "SoloBook" + book title
   - "← Back to Library" button
   - Chapter list (current behavior)
   - Upload button (current behavior)
   - Stats footer (current behavior)

---

#### Task 7: Update MainContent for workspace/book routing

**Objective:** MainContent routes between WorkspaceView and BookView based on activeBookId.

**Files:**
- Modify: `src/components/MainContent.tsx`

**Changes:**
1. If `activeBookId === null` → render `<WorkspaceView />`
2. If `activeBookId` is set → render current book view (Cover/TOC/Chapter/Appendix)
3. Remove empty state (WorkspaceView handles it)

---

### Phase 3: Integration & Polish

#### Task 8: Wire up workspace flow in index route

**Objective:** Index route just renders Sidebar + MainContent + DragOverlay (already done, just verify).

**Files:**
- Verify: `src/routes/index.tsx`

**Note:** No changes needed — the routing logic is in MainContent.

---

#### Task 9: Add drag-and-drop to workspace view

**Objective:** Allow dropping files in workspace view to create a new book.

**Files:**
- Modify: `src/components/WorkspaceView.tsx` or `src/components/DragOverlay.tsx`

**Behavior:**
- If in workspace view and user drops files → create new book with those files
- If in book view and user drops files → add to active book (current behavior)

---

#### Task 10: Add book metadata editing

**Objective:** Allow editing book title/author from book view.

**Files:**
- Modify: `src/components/Sidebar.tsx` (book mode header)

**Changes:**
- Click book title in sidebar header → inline edit mode
- Or: "Edit metadata" button that opens modal

---

#### Task 11: E2E verification

**Objective:** Test full workspace flow.

**Steps:**
1. Open app → workspace view with empty state
2. Click "New Book" → modal opens
3. Enter title/author → creates book, enters book view
4. Upload markdown files → chapters appear in sidebar
5. Navigate through Cover → TOC → Chapters → Appendix
6. Click "← Back to Library" → returns to workspace view
7. Book card appears in grid
8. Create second book → grid shows 2 cards
9. Click "Open" on first book → enters book view
10. Refresh page → both books still there (localStorage)
11. Delete a book → confirmation, removed from grid
12. Mobile: hamburger menu, sidebar collapses, workspace view responsive

---

## Risks & Tradeoffs

1. **localStorage size limit** — ~5-10MB depending on browser. Large books with lots of markdown could hit this. Future: IndexedDB or server-side storage.
2. **No export/import** — users can't backup/transfer books yet. Future: JSON export/import.
3. **No search** — can't search across books yet. Future: full-text search.
4. **Breaks existing behavior** — users who already have chapters in the old single-book model will lose them. Migration: detect old format, convert to single book in workspace.

---

## Migration Strategy

If `localStorage` has old `bookStore` data (single book), convert it:
```typescript
const oldData = localStorage.getItem("solobook-book");
if (oldData) {
  const oldBook = JSON.parse(oldData);
  const newBook: Book = {
    id: "migrated-" + Date.now(),
    meta: oldBook.meta,
    chapters: oldBook.chapters,
    createdAt: oldBook.meta.createdAt,
    updatedAt: new Date().toISOString()
  };
  workspace.books = [newBook];
  localStorage.removeItem("solobook-book");
}
```

---

## Future Enhancements (Out of Scope)

- Book covers (upload image)
- Book tags/categories
- Book search
- Export to PDF/EPUB
- Cloud sync (optional backend)
- Book templates (pre-made structures)
- Collaboration (share books)
