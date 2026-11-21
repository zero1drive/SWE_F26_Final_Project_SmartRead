# SmartRead: use-case scenarios (Phase II design report source)

Every scenario below describes what the **built app** does, taken from the code in this repo. Messages in quotes are the exact text the app shows. Use-case IDs UC-01 to UC-18 match our Phase I SRS (`Report_1_Group_Z_Revised.docx`).

Each use case has four parts, so it can feed every section of the design report:

| Part | Feeds report section |
|---|---|
| **Normal scenario** / **Exceptional scenarios** | §2 scenarios |
| **Collaboration**: objects and numbered messages | §1 and §2 collaboration / sequence diagrams |
| **Petri net** (UC-03, UC-04, UC-07, UC-13) | §2 Petri nets (the assignment asks for 3 or more) |
| **Data (E-R)**: entities read (R) and written (W) | §3 E-R diagram |
| **Methods**: functions to write pseudo-code for | §4 detailed design |

To reproduce any scenario, run `npm run seed` and `npm run dev`, then use the demo accounts in `DEMO.md`. All passwords are `demo123`; admin's is `admin123`.

---

## 0. Shared reference

### 0.1 Objects (classes) for the collaboration diagrams

| Object | File | Role |
|---|---|---|
| **Browser UI** (pages) | `src/routes/*/+page.svelte`, `src/lib/components/*.svelte` | What the user clicks; ChatBox, FaceEnrol, Shelf |
| **Camera** | `src/lib/camera.ts` | Webcam: `startCamera`, `grabFrame`, `stopCamera` |
| **SessionHook** | `src/hooks.server.ts` | Runs on every request: works out who the user is |
| **Page controllers** | `src/routes/*/+page.server.ts`, `+server.ts` | `load()` and form actions (buy, review, addBook…) |
| **Rules** | `src/lib/server/rules.ts` | Every business rule (pure functions) |
| **ChatPipeline** | `src/lib/server/chat.ts` | Permission check → RAG → LLM |
| **AIClient** | `src/lib/server/ai.ts` | Talks to Ollama: `chat`, `embed`, `describeImage` |
| **Recommender** | `src/lib/server/recommend.ts` | `popular`, `personal` |
| **Reports** | `src/lib/server/reports.ts` | `orderLists`, `financeReport` (computed, never stored) |
| **Auth** | `src/lib/server/auth.ts` | Password hashing, session tokens |
| **CoverMaker** | `src/lib/server/cover.ts` | Generates an SVG cover |
| **DataStore** | `src/lib/server/db.ts` | `read(name)` / `write(name, value)` over `data/*.json` |
| **FaceService** | `face/server.py` (Python, port 8001) | YOLO enrol / train / identify |
| **Ollama** | external, port 11434 | `gemma3:4b` (chat + vision), `nomic-embed-text` (embeddings) |

The normal path for a request: Browser UI → SessionHook → Page controller → (Rules / ChatPipeline / Recommender / Reports) → DataStore → JSON file, with AIClient → Ollama and the face proxy → FaceService where needed.

### 0.2 Entities for the E-R diagram

| Entity | Stored in | Key | Attributes |
|---|---|---|---|
| **User** | `data/users.json` | PK `username` | name, passwordHash ("salt:hash", scrypt), role (SU/RC/VC), balance, warnings, suspended |
| **Book** | `data/books.json` | PK `id` | title, author, category, year, price, description, cover |
| **LedgerEntry** | `data/ledger.json` | composite (`at`, `username`) | type (deposit/purchase/fine), amount (always positive), FK username → User, FK bookId → Book (optional) |
| **View** | `data/views.json` | composite (`at`, `bookId`) | FK username → User (null = visitor), FK bookId → Book |
| **Review** | `data/reviews.json` | composite (`bookId`, `author`): one per person per book | stars (1–5), comment, at; author = username or `visitor:<id>` |
| **TabooWord** | `data/taboo.json` | PK `word` | (lowercase string) |
| **Shelf** | `data/shelves.json` | PK `username` (FK → User) | books: map bookId → want/reading/finished |
| **JournalEntry** | inside Shelf | PK `id` | at, FK bookId → Book, text, question (optional) |
| **Session** | `data/sessions.json` | PK `token` | FK username → User |
| **EmbeddingCache** | `data/embeddings.json` | PK `key` (`store:<file>:<n>` or `book:<id>`) | hash, model, vector |
| **StoreInfoFile** | `data/store_info/*.md` | PK filename | paragraphs (RAG source) |
| **FaceSample** | `data/faces/<username>/*.jpg` | (username, frame no.) | 128×128 JPEG; git-ignored |

**Relationships:** User 1–N LedgerEntry, User 1–N Review, Book 1–N Review, Book 1–N View, User 0–N View, User 1–1 Shelf, Shelf 1–N JournalEntry, Book 1–N JournalEntry, User 1–N Session, User 1–N FaceSample. A *purchase* (User M–N Book) is a LedgerEntry with `type = purchase`.

**Derived, not stored** (show as derived in the E-R / data notes): purchase count and total spent (`purchaseHistory`), whether a reviewer bought the book, the weighted average rating, the to-order/no-order lists, and the finance report. Visitors have no stored entity: a visitor is a `visitor` cookie id, and their shelf lives in the browser's `sessionStorage`.

### 0.3 Rule constants (`src/lib/server/rules.ts`)

`FINE = 1`, `VC_DISCOUNT = 0.1`, `PROMOTE_AFTER_PURCHASES = 3`, `PROMOTE_AFTER_SPENT = 200`, `TABOO_BLOCK_OVER = 3`, `WARNINGS_LIMIT = 2`, `PURCHASER_WEIGHT = 2`, `ORDER_LIST_MIN_RATINGS = 3`, `NO_ORDER_BELOW = 2`, `TO_ORDER_ABOVE = 4`, `MAX_DEPOSIT = 10000`, `RAG_MIN_SCORE = 0.6`, `PICTURE_MATCHES = 3`, `FACE_MIN_CONFIDENCE = 0.8`, `FACE_FRAMES = 20`.

---

## Supporting flows (used by several use cases)

These are not SRS use cases, but every use case depends on them, so the diagrams and pseudo-code need them.

### S-1 Identify the user on every request
**Normal:** SessionHook reads the `session` cookie → looks up the token in Session → finds the User → if not suspended, sets `locals.user`. It also gives every browser a `visitor` cookie id (kept for 1 year) so visitors can have one review per book.
**Exceptional:** no cookie, an unknown token or a deleted user → `locals.user = null` (treated as a visitor). **A suspended user → `locals.user = null`**, so a user suspended mid-session is logged out at their next click.
**Methods:** `handle` (hooks.server.ts), `read`, `newToken`, layout `load`.

### S-2 Register
**Normal:** Log in page → "New here?" → username, name, password → `register` action → new User (role RC, balance 0, warnings 0) → session started → redirected to Account with a welcome note.
**Exceptional:**
- Bad username → "Usernames are 3 to 20 lowercase letters, numbers or underscores, starting with a letter or number."
- Empty name → "Tell us your name."
- Password under 6 characters → "Passwords need at least 6 characters."
- Username taken → "That username is taken."

**Methods:** `register`, `hashPassword`, `startSession`.

### S-3 Password login, demo login, logout
**Normal:** username + password → `checkPassword` (scrypt, timing-safe compare) → not suspended → `startSession` (token saved in Session, 7-day httpOnly cookie) → home page. Demo login (only when `DEMO_MODE=1`) is one click per seeded account. Logout deletes the Session row and the cookie.
**Exceptional:**
- Fields empty → "Enter your username and password."
- Wrong username or password → "That username and password do not match."
- Suspended → "This account is suspended. Ask the store manager to deposit funds and reopen it." (this also applies to demo and face login)
- Demo mode off → "Demo login is turned off."

**Methods:** `login`, `demo`, `logout`, `startSession`, `checkPassword`, `newToken`.

### S-4 Record a book view
**Normal:** a book page opens → the browser POSTs `/book/<id>/view` → a View row is appended (username, or null for a visitor). Views feed UC-01 and UC-02.
**Exceptional:** an unknown book → 404 "no such book", and nothing is stored.
**Methods:** view `POST`, `read`, `write`.

---

## UC-01 Personalized book recommendations
**Actors:** RC, VC. **Precondition:** logged in, active account. **Where:** home page (`src/routes/+page.server.ts`).

**Normal scenario** (alice):
1. Alice opens the home page.
2. The home `load()` sees a logged-in RC/VC and calls `personal(username, books, views, ledger)`.
3. The Recommender builds two score tables from her history: each **view** adds 1 and each **purchase** adds 3 to that book's category and author.
4. Every book she does **not** own gets score = category score + 2 × author score; books scoring 0 are dropped, and the rest are sorted by score, highest first.
5. If fewer than 3 remain, the list is filled with the most popular books she doesn't own.
6. The page shows the top 3 under **"picked for you"**. Alice gets *Around the World in Eighty Days* (Verne), *Dr. Jekyll and Mr. Hyde* (Stevenson) and one popular book.

**Exceptional scenarios:**
- **E1 No history** (e.g. a newly registered user): the score tables are empty, so `popular()` is used and the note says "most read this month" (`personalised: false`).
- **E2 History points at only a few authors/categories:** fewer than 3 books score above 0, so popular books fill the gap (step 5).
- **E3 She owns almost everything:** only the books she doesn't own are shown, so there may be fewer than 3.
- **E4 The account was suspended mid-session:** S-1 makes her a visitor, so she gets UC-02.

**Collaboration:** User → Browser UI: open "/" · Browser UI → SessionHook: request · SessionHook → DataStore: read sessions, users · SessionHook → Home controller: locals.user · Home controller → DataStore: read books, views, ledger · Home controller → Recommender: personal(...) · Recommender → Recommender: popular(...) (fill) · Home controller → Browser UI: top 3 + note.
**Data:** R User, Book, View, LedgerEntry.
**Methods:** home `load`, `personal`, `popular`.

## UC-02 General book recommendations
**Actors:** SU, VS. **Where:** home page.

**Normal scenario:**
1. A visitor (or admin) opens the home page.
2. `load()` sees no user (or the SU) and calls `popular(books, views, ledger)`.
3. Every view adds 1 and every purchase adds 3 to that book's score.
4. Books are sorted by score and the top 3 are shown under "most read this month": *Pride and Prejudice*, *Frankenstein*, *Sherlock Holmes* in the seed data.

**Exceptional scenarios:**
- **E1 No activity at all** (empty views and ledger): every score is 0, the sort keeps catalog order, and the first 3 books are shown.
- **E2 Fewer than 3 books in the catalog:** all of them are shown.

**Collaboration:** Browser UI → Home controller: open "/" · Home controller → DataStore: read books, views, ledger · Home controller → Recommender: popular() · Home controller → Browser UI: top 3.
**Data:** R Book, View, LedgerEntry.
**Methods:** home `load`, `popular`.

## UC-03 Interact with the chat box
**Actors:** VS, RC, VC, SU. **Where:** the "ask the clerk" tab on every page (`ChatBox.svelte` → `POST /chat` → `chat.ts answer()`).

**What each role may learn** (built by `roleContext`):

| Role | Facts given to the model |
|---|---|
| VS | store information only ("a visitor… no account") |
| RC | + own balance, warnings, purchases and total, how far from VIP |
| VC | + own discount (10%) and savings so far |
| SU | + finance report (revenue, fines, deposits, balances held, sales per book), all customers, both order lists |

**Normal scenario** (visitor asks "What are your opening hours?"):
1. The user types a question and presses send. ChatBox posts `{question}` to `/chat`.
2. `answer()` trims the question and checks it isn't empty or too long.
3. `roleContext(user)` builds the facts this role may see.
4. `isRestricted(q, user)` checks the question for finance words, words about other customers, or another customer's name next to an account word.
5. Not restricted and not personal → RAG path (UC-15/16): the best match scores 0.77 ≥ 0.6, so the answer comes from the store files.
6. The reply `{answer, source, files, score}` is shown with the label **"Answered from store files (RAG)"**, the file names and the score. For UC-17 it is labelled **"Answered by the LLM"**.

**Exceptional scenarios:**
- **E1 Empty question:** "Please type a question first." (checked in the browser and on the server).
- **E2 Over 1000 characters:** "That question is too long; please keep it under 1000 characters."
- **E3 A restricted question from a non-SU** (e.g. "What was the store revenue this month?", "What is Victor's balance?"): declined **before any model is called**, with "Sorry, I can't share information about the store's finances or about other customers. I'm happy to help with books, your own account, or how the store works." and the label **Declined**.
- **E4 A restricted question from the SU:** allowed, skips RAG and goes straight to the LLM with the finance facts (UC-17).
- **E5 A personal question from a member** ("What is my balance?"): skips RAG and is answered by the LLM from their own facts.
- **E6 Ollama off:** "The AI assistant is not running (could not reach Ollama). Everything else in the store still works."
- **E6a Model missing:** "The AI model is not installed. Run "ollama pull …"".
- **E6b Too slow** (over 120 s): "The AI model took too long to answer. Try again in a moment."
- **E7 The SmartRead server itself is down:** the browser shows "The store server did not answer. Is it still running?"

**Collaboration:** User → ChatBox: type question · ChatBox → Chat endpoint: POST /chat · Chat endpoint → ChatPipeline: answer(q, user) · ChatPipeline → DataStore: read users, ledger, books · ChatPipeline → Reports: financeReport(), orderLists() (SU only) · ChatPipeline → ChatPipeline: isRestricted · [RAG] ChatPipeline → AIClient: embed, chat · AIClient → Ollama · ChatPipeline → ChatBox: Reply.

**Petri net (chat routing):**
- **Places:** P1 Question typed · P2 Validated · P3 Facts built · P4 Restricted · P5 Declined · P6 Personal/SU-live · P7 RAG candidate · P8 Scored · P9 Answer RAG · P10 Answer LLM · P11 AI error.
- **Transitions:**
  - T1 validate: P1 → P2; on failure → P11-style error reply.
  - T2 build facts: P2 → P3.
  - T3 restricted & not SU: P3 → P5.
  - T4 restricted & SU: P3 → P6.
  - T5 personal question: P3 → P6.
  - T6 otherwise: P3 → P7.
  - T7 embed & score: P7 → P8.
  - T8 score ≥ 0.6: P8 → P9.
  - T9 score < 0.6 or no store files: P8 → P10.
  - T10 ask LLM: P6 → P10.
  - T11 Ollama down: P7/P6 → P11.
- One token per question. P5, P9, P10 and P11 are end places, and exactly one of them ends up marked.

**Data:** R User, LedgerEntry, Book, Review, StoreInfoFile, EmbeddingCache; W EmbeddingCache.
**Methods:** ChatBox `ask`, chat `POST`, `answer`, `roleContext`, `isRestricted`, `financeReport`, `orderLists`, `purchaseHistory`, `usd`.

## UC-04 Biometric (face) login
**Actors:** RC, VC, SU. **Precondition:** the user has enrolled their face; a camera is present; the face service is running.

**Normal scenario A: enrol** (alice, while logged in):
1. Account page (the admin page for the SU) → **Face login** → **Enrol my face**. `startCamera` asks for camera permission and shows the video.
2. **Take 20 pictures**: `grabFrame` crops the centre square to 224×224 JPEG, 20 times.
3. The browser POSTs `{images}` to `/face`. The proxy checks the user is logged in and has at least 5 frames, then sends `{username, images}` to FaceService `/enroll`.
4. FaceService deletes any old photos, saves up to 40 frames as 128×128 JPEGs in `data/faces/alice/`, and starts training in a background thread.
5. `train()` → `build_dataset()`: each enrolled user becomes a class, split 80/20 into train and val. It adds an `_unknown` class of 50 images (scrambled tiles and random noise), so there are always at least 2 classes. It then trains YOLO `yolo11n-cls` for 8 epochs on the CPU and reloads the model.
6. The browser checks `/face` `status` until training ends → "Your face is enrolled. Next time, choose "Log in with my face"."

**Normal scenario B: log in:**
1. Log in page → **Log in with my face** → the camera starts and one frame is grabbed.
2. The frame is posted to the `?/face` action → FaceService `/identify` → `{name, confidence}` (top-1 class).
3. The controller checks confidence ≥ 0.8, that `name` is a real user (not `_unknown`), and that the account isn't suspended.
4. `startSession` → "Welcome back, Alice Moreno (93% sure)." → home page.

**Exceptional scenarios:**
- **E1 No camera or permission denied:** "No camera found, or permission was denied. You can still log in with your password." For a browser with no camera API: "This browser cannot use a camera."
- **E2 Face service not running:** at login, "The face login service is not running. Please log in with your password."; at enrolment, "The face login service is not running (start it with the command in README.md). Password login still works."
- **E3 Nobody enrolled yet:** "No faces have been enrolled yet."
- **E4 Low confidence or a stranger** (top class `_unknown` or confidence < 0.8): "We didn't recognise you (best guess N% sure, we need 80%). Try again in better light, or use your password."
- **E5 Recognised but suspended:** "Recognised <name>, but: This account is suspended. Ask the store manager to deposit funds and reopen it."
- **E6 Enrolling while not logged in:** "Log in with your password first, then enrol your face."
- **E7 Fewer than 5 frames:** "Not enough camera frames were captured."
- **E8 Already training:** "Already training; try again in a minute."
- **E9 Training crashes:** "Training failed: <reason>", reported through `status`. The old model keeps working.
- **E10 A corrupt image:** "That image could not be read."
- **E11 No picture received:** "No camera picture was received."
- **Alternative:** password login (S-3) always remains available. Voice login is not built (the spec allows face and/or voice).

**Collaboration:** User → FaceEnrol: click · FaceEnrol → Camera: startCamera, grabFrame ×20 · FaceEnrol → Face proxy: POST /face · Face proxy → FaceService: /enroll · FaceService → FaceSample store: save frames · FaceService → FaceService: train() (thread) · FaceEnrol → Face proxy: GET /face (status, repeated) — then for login: Login page → Camera: grabFrame · Login page → Login controller: ?/face · Login controller → FaceService: /identify · Login controller → DataStore: read users · Login controller → Auth: newToken · Login controller → DataStore: write sessions.

**Petri net (enrol + identify):**
- **Places:**
  - Enrolment: E0 Not enrolled · E1 Frames captured · E2 Training · E3 Model ready.
  - Login: L0 Frame captured · L1 Classified · L2 Accepted · L3 Rejected · L4 Session open.
- **Transitions:** capture (E0 → E1) · enrol (E1 → E2; blocked while E2 holds a token) · train-ok (E2 → E3) · train-fail (E2 → E0 or the previous E3) · identify (L0 + E3 → L1 + E3; the model token is read, not used up) · accept, when confidence ≥ 0.8, the user exists and isn't suspended (L1 → L2) · reject (L1 → L3) · start session (L2 → L4).

**Data:** R User; W FaceSample, Session.
**Methods:** `startCamera`, `grabFrame`, `stopCamera`, `sleep`, FaceEnrol `open`/`capture`, login page `faceLogin`, face proxy `GET`/`POST`, login `face` action, `startSession`; Python: `decode`, `enroll`, `train`, `build_dataset`, `scramble`, `noise`, `load_model`, `status`, `identify`.

## UC-05 Add books to the catalog
**Actor:** SU. **Where:** Manage store → Add a book (`admin` `addBook`).

**Normal scenario:**
1. Admin fills in title, author, category, year, price and description, and optionally picks a cover image.
2. `requireSU` checks the role.
3. The fields are validated (see the exceptions).
4. A duplicate check is done on title + author, ignoring case.
5. A new id `b<time in base 36>` is created. An uploaded cover is saved as `static/covers/<id>.jpg|png|webp`; otherwise `makeCover` writes a plain cloth-style SVG.
6. The Book is appended to `books.json` → "Added "The Secret Garden" to the catalog." with a **See it** link. The book shows straight away in the catalog, on the home shelves and in search.

**Exceptional scenarios:**
- **E1 Missing title / author / category:** "The book needs a title." / "The book needs an author." / "Choose or type a category."
- **E2 Bad year** (empty, `abc`, negative or in the future): "Enter a year like 1865."
- **E3 Bad price** (≤ 0, not a number, more than 2 decimals): "Enter a price above $0, like 9.99."
- **E4 Description under 10 characters:** "Write a sentence or two of description."
- **E5 Duplicate:** "That book is already in the catalog."
- **E6 Wrong cover type:** "Covers must be JPEG, PNG or WebP images."
- **E7 Cover over 5 MB:** "That cover is over 5 MB; try a smaller image."
- **E8 Not the SU:** 403 "Only the store manager can open this page."
- **E9 Cancel:** the SU leaves the page and nothing is saved.
- **E10 Disk write fails:** SvelteKit shows its error page and the book is not added.
- The values typed so far are kept in the form after every error.

**Collaboration:** SU → Admin page: submit form · Admin page → Admin controller: ?/addBook · Admin controller → Admin controller: requireSU · Admin controller → DataStore: read books · Admin controller → CoverMaker: makeCover (no upload) · Admin controller → file system: save cover · Admin controller → DataStore: write books.
**Data:** R/W Book.
**Methods:** `addBook`, `requireSU`, `makeCover`, `money`.

## UC-06 Browse and search books
**Actors:** all. **Where:** Catalog (`catalog/+page.server.ts`) and book pages.

**Normal scenario A: browse / keyword search:**
1. The user picks a category, an author, a from/to year range and/or types a keyword. These go into the URL (`?category=&author=&from=&to=&q=`).
2. `load()` keeps the books that match **all** of the chosen filters. The keyword is a case-insensitive substring of title + author + description.
3. Results are sorted by year and shown. Clicking one opens the book page (S-4 records the view).

**Normal scenario B: search by picture:**
1. The user uploads a cover photo or an inside figure (`picture` action).
2. `describeImage` asks the vision model to describe it ("the AI saw: …").
3. Every book is embedded as "title by author. category, year. description" (cached in EmbeddingCache), and the description is embedded as a query.
4. Books are ranked by cosine similarity and the top 3 are shown with scores. `static/covers/36.jpg` → *The War of the Worlds* first.

**Exceptional scenarios:**
- **E1 No match:** "No books match that search. Try fewer words or clear a filter." The filters stay so the user can change them.
- **E2 No file:** "Choose a picture of a cover or a figure first."
- **E3 Not an image:** "That file is not an image. Try a JPEG or PNG."
- **E4 Over 8 MB:** "That image is over 8 MB; try a smaller one."
- **E5 AI down:** "<AI message> Keyword search still works."
- **E6 Image can't be processed:** "We could not read that image. Try another picture or search by keywords."
- **E7 Unknown book id in the URL:** 404 "We do not have that book."

**Collaboration:** User → Catalog page: filters / upload · Catalog page → Catalog controller: load(url) or ?/picture · Catalog controller → DataStore: read books · Catalog controller → AIClient: describeImage, embed · Catalog controller → ChatPipeline: cachedVectors · AIClient → Ollama · Catalog controller → Catalog page: results / matches.
**Data:** R Book, EmbeddingCache; W EmbeddingCache, View.
**Methods:** catalog `load`, `picture`, `describeImage`, `embed`, `cachedVectors`, `cosine`, book `load`.

## UC-07 Manage funds and purchase books
**Actors:** RC, VC; SU for deposits on behalf of customers and for reopening. **Where:** Account (`deposit`), book page (`buy`), admin Customers (`deposit`, `reopen`).

**Normal scenario A: deposit:**
1. Customer → Account → enters an amount → `deposit`.
2. `validateDeposit` accepts it → the balance increases → a LedgerEntry `deposit` is written → "Deposited $20.00. Your balance is now $<n>."

**Normal scenario B: purchase** (victor, VIP):
1. The book page shows the list price struck through and **your VIP price** (`priceFor`: 10% off for a VC).
2. **Buy this book** (or **Buy another copy** if he already owns it) → `buy`: one click, one copy, no cart.
3. `purchase(account, price, history)`: cost = `priceFor(role, price)`. Cost ≤ balance, so the balance goes down by the cost.
4. The promotion check runs (UC-14).
5. The User is saved, and a LedgerEntry `purchase` with the amount actually paid is written → "Bought for $X. Your balance is now $Y."

**Normal scenario C: SU reopens** (sam, suspended at -$2.00):
1. Admin → Customers: suspended accounts are highlighted and **Reopen** is disabled while the balance is ≤ 0.
2. The SU deposits $5 for sam → "Deposited $5.00 for Sam Okafor. Balance is now $3.00. You can reopen the account now."
3. **Reopen** → `canReopen` (suspended AND balance > 0) → `suspended = false` → "Reopened Sam Okafor's account. They can log in again."

**Exceptional scenarios:**
- **E1 Deposit not a number or empty:** "Enter an amount in dollars, like 25 or 12.50."; ≤ 0 (e.g. `-5`): "A deposit has to be more than $0."; over $10,000: "Deposits are limited to $10000 at a time."; more than 2 decimals: "Use at most two decimal places."
- **E2 Insufficient funds, balance stays ≥ 0:** the purchase is **rejected**, a $1 fine is charged, and a LedgerEntry `fine` is written → "Not enough funds: this costs $X and you have $Y. A $1 fine was charged; your balance is now $Z."
- **E3 Insufficient funds, balance goes negative** (bob, $0.50): rejected, fined → -$0.50 → **suspended** → "Not enough funds: … A $1 fine was charged, your balance is now -$0.50, and your account is suspended. Ask the store manager to reopen it after a deposit." Through S-1 he is logged out at his next click, and his next login is refused.
- **E4 Visitor clicks buy:** "Log in to buy books." (visitors see a "Log in to buy" link instead of the button).
- **E5 SU tries to buy:** "The manager account cannot buy books."
- **E6 The book was removed:** "That book is gone."
- **E7 SU reopens too early:** "<name>'s balance must be above $0 before reopening." A deposit that still leaves the balance ≤ 0 adds "The balance must be above $0 to reopen."
- **E8 SU deposit for an unknown customer:** "No such customer."
- **E9 SU opens Account:** redirected to the admin page. A visitor opening Account → the login page.
- **Consistency (SR-23):** the User and LedgerEntry writes happen one after the other in the same request, with no waiting in between, so no other request can see them out of step.

**Collaboration (purchase):** Customer → Book page: Buy · Book page → Book controller: ?/buy · Book controller → DataStore: read books, ledger · Book controller → Rules: purchaseHistory, purchase (→ priceFor, shouldPromote) · Book controller → DataStore: write users · Book controller → DataStore: write ledger (purchase or fine) · Book controller → Book page: message (+ promoted).

**Petri net (account money states):**
- **Places:** A Active (balance ≥ 0) · R Purchase requested · C Charged · F Fined · S Suspended · V VIP · O Reopen-ready.
- **Transitions:**
  - request: A → R.
  - pay, when cost ≤ balance: R → C → A.
  - promote, when count > 3 or spent > $200 and role is RC: C → V (the account stays active).
  - fine, when cost > balance: R → F.
  - fine-ok, when new balance ≥ 0: F → A.
  - suspend, when new balance < 0: F → S.
  - deposit-by-SU: S → S while balance ≤ 0; S → O when balance > 0.
  - reopen: O → A.
  - deposit: A → A.
- A token in S blocks the login transitions (S-3, UC-04).

**Data:** R/W User, LedgerEntry; R Book.
**Methods:** account `load`/`deposit`, book `load`/`buy`/`purchasersOf`, admin `load`/`deposit`/`reopen`, `purchase`, `priceFor`, `shouldPromote`, `validateDeposit`, `canReopen`, `purchaseHistory`, `money`, `usd`.

## UC-08 Submit a book comment
## UC-09 Submit a book rating
These are one form and one action (`book/[id]` `review`): a review is **stars (required) + comment (optional)**. The SRS splits them into two use cases, so the scenarios are listed once and marked by which use case they belong to.

**Actors:** VS, RC, VC, SU.

**Normal scenario** (alice, 4 stars, "Darn good fun, what the heck."):
1. Book page → pick stars → write a comment → **Post review**.
2. `validRating` accepts an integer from 1 to 5 (UC-09).
3. The comment is trimmed and checked for length.
4. `moderate(comment, taboo)` (UC-12): 2 taboo words ≤ 3, so they are replaced → "* good fun, what the *."
5. The author is the username (or `visitor:<cookie id>`). Any earlier review by the same author on this book is **removed** and the new one is saved: one review per person per book (UC-09).
6. "Thanks. Your review is up, with 2 words replaced by *." (or "Thanks, your review is up.").
7. The page reloads: reviews from **buyers come first with "✓ verified purchase"**, then newest first (UC-08 weighting). The average shown is the **weighted average**, where buyers' stars count ×2, and the order-list tag is recomputed (UC-10).

**Exceptional scenarios:**
- **E1 (UC-09) No stars or out of range:** "Choose between 1 and 5 stars." The comment text is kept in the form.
- **E2 (UC-08) Comment over 2000 characters:** "Please keep comments under 2000 characters."
- **E3 (UC-08) Empty comment:** accepted as a **rating only**. This is our documented decision: the comment is optional, but a comment can't be posted without stars.
- **E4 Book removed:** "That book is gone."
- **E5 (UC-08) More than 3 taboo words:** blocked → UC-13.
- **E6 A visitor posts again:** the same `visitor` cookie id, so the old review is replaced. It shows as by "Visitor".

**Collaboration:** User → Book page: submit review · Book page → Book controller: ?/review · Book controller → Rules: validRating, moderate · [blocked] Book controller → Rules: addWarning · Book controller → DataStore: read/write reviews (and users if warned) · Book controller → Book page: message · Book controller (load) → Rules: weightedAverage, orderList.
**Data:** R Book, TabooWord, LedgerEntry; R/W Review; W User (warning).
**Methods:** book `review`, book `load`, `purchasersOf`, `validRating`, `moderate`, `addWarning`, `weightedAverage`, `orderList`.

## UC-10 Update book ordering lists (automatic)
**Trigger:** any change to a book's ratings. **Design choice:** the lists are **computed every time they're read, never stored**, so they are always up to date and can't drift out of step.

**Normal scenario** (a visitor gives *Moby-Dick* its 4th rating, 1 star):
1. The book page `load()` (or the admin page, or the SU's chat facts) gathers the book's reviews and marks which reviewers bought the book.
2. `orderList(ratings)`: more than 3 raw ratings? Yes (4). `weightedAverage` < 2 → **no-order**; > 4 → **to-order**.
3. The book page shows "on the no-order list". Admin → **Order lists** shows *Calculus Made Easy* and *Moby-Dick* (no-order) and *Pride and Prejudice* (to-order). The SU can also ask the chat "What is on the no-order list?".

**Exceptional scenarios:**
- **E1 3 or fewer ratings:** on neither list, whatever the average.
- **E2 Weighted average from 2 to 4 inclusive** (exactly 2.0 or 4.0 too): on neither list.
- **E3 No ratings:** the average is null and no average line is shown.
- **E4 A rating is replaced or the ratings rise:** the book leaves the list automatically on the next read.

**Collaboration:** Admin controller → Reports: orderLists() · Reports → DataStore: read ledger, reviews, books · Reports → Rules: weightedAverage, orderList.
**Data:** R Review, LedgerEntry, Book (lists are derived).
**Methods:** `orderLists`, `orderList`, `weightedAverage`, book `load`, admin `load`.

## UC-11 Maintain the taboo-word list
**Actor:** SU. **Where:** Manage store → Taboo words.

**Normal scenario:**
1. The admin page shows the current list (seeded with `crap, dang, darn, heck, stupid`).
2. **Add** `blimey` → `addTaboo`: trimmed, lowercased, checked → added and the list sorted → "Added "blimey"."
3. **Remove** `blimey` → `removeTaboo` → "Removed "blimey"."
4. The change applies to the very next comment (UC-12 reads the list each time).

**Exceptional scenarios:**
- **E1 Empty:** "Type a word to add."
- **E2 Several words or spaces:** "Add one word at a time, without spaces."
- **E3 Duplicate** (e.g. `darn`): ""darn" is already on the list."
- **E4 Editing a word** = remove the old word + add the new one. There's no separate edit form; this is a design decision.
- **E5 Not the SU:** 403 "Only the store manager can open this page."

**Collaboration:** SU → Admin page · Admin page → Admin controller: ?/addTaboo | ?/removeTaboo · Admin controller → Admin controller: requireSU · Admin controller → DataStore: read/write taboo.
**Data:** R/W TabooWord.
**Methods:** `addTaboo`, `removeTaboo`, `requireSU`, admin `load`.

## UC-12 Censor taboo words (automatic)
**Trigger:** a review is submitted (UC-08).

**Normal scenario:**
1. `moderate(text, taboo)` builds one pattern for all the taboo words: **whole words only, case-insensitive, Unicode letters and digits count as word characters**.
2. It counts **every occurrence**, so "darn darn" = 2.
3. If the count is ≤ 3, every match is replaced by a single `*` and the result is returned with the count.

**Exceptional scenarios:**
- **E1 No taboo words in the text, or an empty list:** the text is unchanged and the count is 0.
- **E2 A taboo word inside a longer word** ("hecking", "darned"): not matched, not censored.
- **E3 Different case** ("DARN"): matched.
- **E4 Count > 3:** the text is not returned (`blocked: true`) → UC-13.

**Collaboration:** Book controller → DataStore: read taboo · Book controller → Rules: moderate(text, taboo) · Rules → Book controller: {count, blocked, text}.
**Data:** R TabooWord.
**Methods:** `moderate`, `escapeRegex`.

## UC-13 Block comments and apply warnings (automatic)
**Trigger:** `moderate` returns `blocked: true` (more than 3 taboo words).

**Normal scenario** (wendy, RC with 2 warnings, posts "darn heck darn stupid book"):
1. The whole review is blocked, rating included. Nothing is saved to `reviews.json`.
2. `addWarning(wendy)`: warnings become 3 > 2 and she is an RC → **suspended**.
3. Her User row is saved → "Your comment had 4 words from our taboo list, so it was blocked and you received a warning (3 so far). That is more than 2 warnings, so your account is now suspended."
4. Through S-1 she is logged out, and she can't log in until the SU reopens her account (UC-07 C).

**Exceptional / alternative scenarios:**
- **E1 RC with 0 or 1 warnings:** blocked, warning +1, no other change → "…you received a warning (N so far)."
- **E2 VC goes over 2 warnings** (victor posts the blocked comment 3 times): **demoted to RC and warnings reset to 0** → "…That is more than 2 warnings, so you are no longer a VIP member. Your warnings have been reset." His Account then shows "member", with no discount.
- **E3 Visitor:** blocked → "Your comment had N words from our taboo list, so it was blocked." Visitors have no account, so no warning is tracked.
- **E4 SU:** blocked and the warning is counted, but no suspension or demotion rule applies to the SU.
- **E5 3 or fewer taboo words:** not this use case (UC-12 censors and publishes).

**Collaboration:** Book controller → Rules: moderate → blocked · Book controller → Rules: addWarning(user) · Book controller → DataStore: write users · Book controller → Book page: warning message · (next request) SessionHook → treats the suspended user as a visitor.

**Petri net (warnings):**
- **Places:** RC₀, RC₁, RC₂ (RC with 0/1/2 warnings) · RC-Suspended · VC₀, VC₁, VC₂ · Comment submitted · Published · Blocked.
- **Transitions:**
  - censor-ok, when count ≤ 3: Comment → Published.
  - block, when count > 3: Comment → Blocked.
  - warn-RC: Blocked + RCₙ → RCₙ₊₁ (n = 0, 1); Blocked + RC₂ → RC-Suspended.
  - warn-VC: Blocked + VCₙ → VCₙ₊₁ (n = 0, 1); Blocked + VC₂ → RC₀ (demoted, reset).
  - promote (UC-14): RCₙ → VCₙ (warnings are kept).
  - reopen (UC-07): RC-Suspended → RC₂ (warnings are not reset).
- The user's token sits in exactly one account place at a time.

**Data:** R TabooWord; R/W User.
**Methods:** book `review`, `moderate`, `addWarning`, `handle`.

## UC-14 Promote an RC to VIP (automatic)
**Trigger:** a **successful** purchase (inside `purchase`).

**Normal scenario** (alice: 3 purchases, $66 balance, buys *Around the World in Eighty Days*):
1. `purchaseHistory` counts her purchase entries **before** this one: 3.
2. After paying, `shouldPromote('RC', 3 + 1, spent + cost)`: 4 > 3 → true.
3. Her role becomes VC in the same save as the balance change.
4. The book page shows **"congratulations! … you are now a VIP member: 10% off every book from here on."** The header says *VIP member*, prices show **your VIP price**, and Account says she gets 10% off.

**Exceptional / alternative scenarios:**
- **E1 Still not eligible** (≤ 3 purchases and ≤ $200 spent): stays RC. Account shows how many purchases or how many dollars are left until VIP.
- **E2 The purchase was rejected** (insufficient funds): no promotion check. Fines never count toward the totals.
- **E3 Already a VC:** `shouldPromote` only applies to RCs, so nothing changes.
- **E4 Promotion by spending:** a single purchase that takes the total paid over $200 also promotes. "Spent" means the amount actually paid, after any discount.
- **E5 A demoted ex-VIP** (UC-13 E2): promoted again by the same rule on their next purchase, because their history is still above 3.

**Collaboration:** Book controller → Rules: purchaseHistory(ledger, user) · Book controller → Rules: purchase → shouldPromote · Book controller → DataStore: write users (role VC) · Book controller → Book page: promoted = true.
**Data:** R LedgerEntry; W User.
**Methods:** `purchase`, `shouldPromote`, `purchaseHistory`, account `load` (`purchasesLeft`, `spendLeft`).

## UC-15 Prepare local information for RAG (internal)
**Trigger:** each chat question that goes down the RAG path.

**Normal scenario:**
1. `storeChunks()` reads every `.md` file in `data/store_info/` (about, faq, hours-and-policies, team), sorted by name.
2. Each file is split into paragraphs at blank lines; `#` headings are dropped, and each paragraph is prefixed with the file's title.
3. `cachedVectors()` gives each paragraph a cache key `store:<file>:<n>` and a SHA-1 hash of its text. Only paragraphs whose text or embedding model changed are re-embedded (`embed(..., 'search_document')`), and the results are saved in `data/embeddings.json`.
4. The vectors are handed to UC-16. Editing a file takes effect on the very next question; no restart is needed.

**Exceptional scenarios:**
- **E1 Folder missing or no `.md` files:** no chunks → the question goes to the LLM, and the answer ends with "(No local store information is available right now, so this answer is from the LLM only.)"
- **E2 One file can't be read** (e.g. permissions): it is skipped and the other files are still used.
- **E3 `embeddings.json` deleted:** rebuilt automatically (it's only a cache).
- **E4 Embedding model changed in `.env`:** every vector is rebuilt.
- **E5 Ollama down:** UC-03 E6.

**Collaboration:** ChatPipeline → file system: read store_info/*.md · ChatPipeline → DataStore: read embeddings · ChatPipeline → AIClient: embed(missing) · AIClient → Ollama · ChatPipeline → DataStore: write embeddings.
**Data:** R StoreInfoFile; R/W EmbeddingCache.
**Methods:** `storeChunks`, `cachedVectors`, `hash`, `embed`, `models`.

## UC-16 Answer a question using RAG (automatic)
**Trigger:** an allowed, non-personal question in UC-03.

**Normal scenario** ("Can I get a refund?"):
1. The question is embedded (`search_query`), and each store paragraph is scored by `cosine` similarity.
2. The best score is ≥ 0.6 (`RAG_MIN_SCORE`), so up to 3 paragraphs scoring ≥ 0.6 are taken.
3. The model is told: "Answer the customer's question using ONLY the store notes below… If the notes don't answer it, say so."
4. The reply is `source: 'rag'` with the file names and the best score → labelled **"Answered from store files (RAG)"** with *hours-and-policies.md* and the score.

**Exceptional scenarios:**
- **E1 Best score < 0.6:** not a store question → UC-17. The score is still shown, so the decision is visible.
- **E2 The paragraphs don't contain the answer:** the model says the notes don't answer it (instructed in the prompt).
- **E3 The chat model fails after retrieval:** the best matching paragraph is shown as-is, still labelled RAG.
- **E4 A restricted question:** never gets here (UC-03 E3).
- **E5 No store information:** UC-15 E1.

**Collaboration:** ChatPipeline → AIClient: embed([q]) · ChatPipeline → AIClient: cosine ×N · ChatPipeline → AIClient: chat(notes + q) · AIClient → Ollama · ChatPipeline → ChatBox: Reply(rag).
**Data:** R StoreInfoFile, EmbeddingCache.
**Methods:** `answer`, `embed`, `cosine`, `chat`, `call`.

## UC-17 Answer a question using the LLM (automatic)
**Trigger:** an allowed question that scored below 0.6, a personal member question, an SU finance/customer question, or no store files available.

**Normal scenario** ("Who wrote Frankenstein?", score 0.46):
1. The system prompt gets the role facts (UC-03 table), all the store notes and the catalog (title by author), plus: "never invent account details… For any other question, answer it directly from your own knowledge."
2. `chat()` → Ollama `gemma3:4b` (temperature 0.3).
3. The reply is `source: 'llm'` with the best RAG score → labelled **"Answered by the LLM"**: "Mary Shelley wrote *Frankenstein*."
4. SU example: "What was the revenue from book sales and how much in fines?" → $104.80 and $7.00 from the finance report facts.

**Exceptional scenarios:**
- **E1 Ollama off, model missing or timeout:** UC-03 E6, E6a, E6b. The label is an error and nothing is made up.
- **E2 No store files:** the answer ends with the "No local store information is available right now…" note (UC-15 E1).
- **E3 A restricted question from a non-SU:** never sent to the LLM (UC-03 E3).
- **E4 A member asks about another customer:** declined by `isRestricted` (name + account word). The role facts also tell the model never to reveal other customers.

**Collaboration:** ChatPipeline → ChatPipeline: roleContext · ChatPipeline → ChatPipeline: storeChunks · ChatPipeline → DataStore: read books · ChatPipeline → AIClient: chat(system + q) · AIClient → Ollama · ChatPipeline → ChatBox: Reply(llm).
**Data:** R User, LedgerEntry, Book, Review, StoreInfoFile.
**Methods:** `answer`, `roleContext`, `chat`, `call`, `financeReport`, `orderLists`.

## UC-18 Digital bookshelf and reading journal (creative feature)
**Actors:** VS, RC, VC, SU. **Where:** My shelf (`shelf/+page.svelte`, `shelf/+page.server.ts`); "Put it on my shelf" on every book page.

**Normal scenario A: member** (alice):
1. **My shelf** → `load()` returns the catalog and her saved Shelf from `shelves.json`.
2. Add a book: choose it and a shelf (**Want to read / Reading / Finished**) → `addBook`. Or click **Put it on my shelf** on a book page (`/shelf?add=<id>` → Want to read).
3. Move it with its dropdown, or choose **Remove** (`move`).
4. **Reading journal:** choose a book on the shelf, write text → **Save entry** (`saveEntry`). **edit** reloads an entry into the form; **delete** removes it.
5. After every change the whole shelf is POSTed to `?/save`. The server's `clean()` keeps only books that exist and valid shelf names, drops empty entries and limits the sizes. It is then saved under her username → "Entry saved."
6. **Ask for a reflection question** → `?/reflect` sends the entry text + book title to the LLM: "exactly ONE open-ended reflection question…". The question is shown under the entry ("think about: …") and saved privately with it → "Here is a question to think about. It is saved privately with your entry."
7. She logs out and back in: the shelf, journal and question are still there. Nothing is shown publicly.

**Normal scenario B: visitor:**
1. **My shelf** shows: "You're browsing as a visitor, so this shelf and journal live only in this browser tab and **won't be kept**…"
2. Same steps 2–4 and 6, but `save` writes to the browser's `sessionStorage` instead of the server, so everything disappears when the tab closes.

**Exceptional scenarios:**
- **E1 Add with no book chosen:** "Choose a book to add."
- **E2 A journal entry with no book:** "Choose which book this entry is about."
- **E3 An empty journal entry:** "Write something before saving."
- **E4 Reflection on empty text:** "Write something in the entry first, then ask for a question."
- **E5 Entry too long** (> 5000 characters): "That entry is too long to send."
- **E6 AI down:** "<AI message> Your journal still works; only reflection questions are unavailable."
- **E7 Server save refused:**
  - Not logged in: "Log in to save your shelf to your account."
  - Unreadable data: "That shelf could not be read."
  - Invalid data: "That shelf could not be saved."
  - Any other failure: "Could not save."
- **E8 The browser blocks `sessionStorage`** (visitor): the shelf still works until the page is left.
- **E9 Editing an entry's text:** its old reflection question is cleared, since it no longer fits.
- **E10 A book removed from the catalog:** `clean()` drops it from shelves and journals on the next save.

**Collaboration (member, reflect):** User → Shelf page: Ask for a reflection question · Shelf page → Shelf controller: ?/reflect · Shelf controller → AIClient: chat(entry) · AIClient → Ollama · Shelf controller → Shelf page: question · Shelf page → Shelf controller: ?/save · Shelf controller → Shelf controller: clean · Shelf controller → DataStore: write shelves.
**Data:** R Book; R/W Shelf, JournalEntry (members); visitors: browser `sessionStorage` only.
**Methods:** shelf `load`, `clean`, `save` action, `reflect` action; page functions `post`, `save`, `addBook`, `move`, `saveEntry`, `edit`, `remove`, `reflect`, `onMount`.

---

## Appendix A: decisions where the SRS said "To Be Confirmed"

| SRS item | Decision built into the app |
|---|---|
| UC-01 new customer | No history → popular books |
| UC-02 no activity | Catalog order |
| UC-03 permission matrix | Table in UC-03 |
| UC-07 insufficient funds | Purchase **rejected**, then $1 fine; balance < 0 → suspended |
| UC-08 weight on comments | Buyers' reviews listed first with "✓ verified purchase" |
| UC-08 visitor tracking | `visitor` cookie id; no warnings for visitors |
| UC-09 weighting / replacing | Buyer ×2; one review per person per book, a new one replaces the old |
| UC-10 average used / membership | Weighted average; lists computed live, so membership updates by itself |
| UC-12 counting | Every occurrence, whole words, case-insensitive |
| UC-13 VC threshold / reset | Same limit (> 2); a demoted VC's warnings reset to 0; reopening does not reset warnings |
| UC-14 count / spending | Individual purchases; amount actually paid |
| UC-15 format / refresh | Markdown paragraphs; re-embedded when the text hash changes |
| UC-18 public journals | Not included; journals and questions are private |

## Appendix B: method index (check that every method gets pseudo-code in §4)

| File | Methods | Use cases |
|---|---|---|
| `src/hooks.server.ts` | handle | S-1, all |
| `src/lib/server/db.ts` | read, write | all |
| `src/lib/server/auth.ts` | hashPassword, checkPassword, newToken | S-2, S-3, UC-04 |
| `src/lib/server/rules.ts` | money, priceFor, shouldPromote, purchase, validateDeposit, canReopen, escapeRegex, moderate, addWarning, weightedAverage, orderList, validRating, purchaseHistory, usd | UC-07–UC-14 |
| `src/lib/server/recommend.ts` | popular, personal | UC-01, UC-02 |
| `src/lib/server/reports.ts` | orderLists, financeReport | UC-03, UC-10 |
| `src/lib/server/chat.ts` | hash, cachedVectors, storeChunks, roleContext, isRestricted, answer | UC-03, UC-15–UC-17, UC-06 |
| `src/lib/server/ai.ts` | call, chat, embed, describeImage, cosine, models | UC-03, UC-06, UC-15–UC-18 |
| `src/lib/server/cover.ts` | makeCover | UC-05 |
| `src/routes/+layout.server.ts`, `+page.server.ts` | layout load, home load | S-1, UC-01, UC-02 |
| `src/routes/login/+page.server.ts` | startSession, load, login, register, demo, face, logout | S-2, S-3, UC-04 |
| `src/routes/account/+page.server.ts` | load, deposit | UC-07, UC-14 |
| `src/routes/book/[id]/+page.server.ts` | purchasersOf, load, buy, review | UC-07–UC-14 |
| `src/routes/book/[id]/view/+server.ts` | POST | S-4 |
| `src/routes/catalog/+page.server.ts` | load, picture | UC-06 |
| `src/routes/admin/+page.server.ts` | requireSU, load, addBook, addTaboo, removeTaboo, deposit, reopen | UC-05, UC-07, UC-10, UC-11 |
| `src/routes/shelf/+page.server.ts` | load, clean, save, reflect | UC-18 |
| `src/routes/chat/+server.ts` | POST | UC-03 |
| `src/routes/face/+server.ts` | GET, POST | UC-04 |
| `src/lib/camera.ts` | startCamera, stopCamera, grabFrame, sleep | UC-04 |
| `src/lib/components/ChatBox.svelte` | ask, scroll | UC-03 |
| `src/lib/components/FaceEnrol.svelte` | open, capture (+ status polling) | UC-04 |
| `src/routes/login/+page.svelte` | faceLogin | UC-04 |
| `src/routes/shelf/+page.svelte` | onMount, post, save, addBook, move, saveEntry, edit, remove, reflect | UC-18 |
| `face/server.py` | decode, load_model, scramble, noise, build_dataset, train, status, enroll, identify | UC-04 |
