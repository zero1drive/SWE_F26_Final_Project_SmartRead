# smartread

An AI-enabled bookstore for our software engineering class: SvelteKit + TypeScript, JSON files for storage, Ollama for the AI and a small Python/YOLO service for face login. Everything runs on one laptop and nothing costs money.

## Setup

You need Node.js 20 or newer and [Ollama](https://ollama.com) running (it sits in the system tray).

```bash
npm install
ollama pull gemma3:4b && ollama pull nomic-embed-text
cp .env.example .env
npm run seed
npm run dev
```

Open http://localhost:5173. (On Windows PowerShell, use `copy .env.example .env` for the third line.)

`npm run seed` resets everything in `data/` to the demo state at any time. `npm test` runs the business-rule tests. `DEMO.md` is the click-by-click demo script.

### Face login (optional, needs Python 3.10+)

The rest of the store works without this; the login page just says the face service is off.

```bash
cd face
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn server:app --port 8001
```

The first `pip install` downloads about 2 GB (PyTorch). The first enrolment also downloads the tiny `yolo11n-cls.pt` checkpoint. Face photos are saved in `data/faces/`, which is git-ignored so they never reach GitHub.

## Where things live

```
src/lib/server/rules.ts      every business rule and threshold (with tests in rules.test.ts)
src/lib/server/db.ts         read(name) / write(name, value) over data/*.json
src/lib/server/chat.ts       chat pipeline: permission check -> RAG -> LLM
src/lib/server/ai.ts         Ollama calls: chat, embed, describeImage
src/lib/server/recommend.ts  home page top 3
src/lib/server/reports.ts    finance report and order lists (computed, never stored)
src/routes/                  pages: home, catalog, book/[id], login, account, shelf, admin
face/server.py               YOLO enrol / train / identify
data/                        users, books, ledger, reviews, views, taboo, shelves (+ store_info/*.md for RAG)
scripts/seed.ts              demo data
```

**Changing a rule.** Every rule is a named constant at the top of `src/lib/server/rules.ts`: the $1 fine (`FINE`), the VIP discount (`VC_DISCOUNT`), promotion after more than 3 purchases or $200 (`PROMOTE_AFTER_PURCHASES`, `PROMOTE_AFTER_SPENT`), blocking comments with more than 3 taboo words (`TABOO_BLOCK_OVER`), the warning limit (`WARNINGS_LIMIT`), how much buyers' ratings count (`PURCHASER_WEIGHT`), the order-list thresholds (`ORDER_LIST_MIN_RATINGS`, `NO_ORDER_BELOW`, `TO_ORDER_ABOVE`), the RAG similarity cutoff (`RAG_MIN_SCORE`), and the face-login confidence (`FACE_MIN_CONFIDENCE`). So "what if it were 5 purchases?" is a one-line change; run `npm test` afterwards and update the test that pins the old number. The store's own facts for RAG are the Markdown files in `data/store_info/`; edit or add a file and the chat picks it up on the next question. The AI models are set in `.env`.

## Decisions we made where the spec was open

- **Purchases** are one click, one copy, no cart. A purchase that costs more than the balance is **rejected** and the $1 fine is charged; if that makes the balance negative, the account is suspended.
- **Purchase count** for promotion means individual purchases; **spent** means what was actually paid.
- **Suspended accounts** cannot log in (password, face or demo). The SU deposits money for them and can reopen once the balance is above $0. Reopening does not reset warnings.
- **Ratings**: one per person per book; a new one replaces the old. A comment is optional with a rating. Purchasers' ratings count double, and the order lists use this weighted average with "more than 3 ratings" counting raw ratings.
- **Taboo words** match whole words, ignoring case, counting every occurrence. Up to 3 are each replaced with `*`; more than 3 blocks the whole review (rating included) and gives the author one warning. Visitors are blocked but not tracked. A VC who goes over 2 warnings is demoted to RC with warnings reset; an RC is suspended.
- **Chat permissions**: visitors get store information; members also get their own balance, purchases and warnings; VIPs also get their discount and savings; the SU also gets the finance report, all customers and the order lists. Questions about finances or other customers are declined for non-SU users before any model is called. The SU's finance/customer questions, and members' "my balance" questions, skip RAG because they are about live data.
- **RAG**: questions are compared with paragraphs of `data/store_info/*.md` using `nomic-embed-text`; if the best match scores at least `RAG_MIN_SCORE` (0.6) the LLM answers from those paragraphs only and the reply is labelled with the file names. Embeddings are cached in `data/embeddings.json` (safe to delete).
- **Recommendations** count a purchase as 3 views. Members are scored by category and author overlap with what they viewed and bought (author counts double), books they own are excluded, and popular books fill any gap.
- **Face login** uses one class per enrolled user plus an `_unknown` class made from scrambled and noisy frames, so there are always at least two classes; anything under 80% confidence is rejected. The webcam frame is cropped to the centre, so face the camera. With very few people enrolled, a stranger can still look like the closest enrolled user; the threshold is the safeguard. Voice login is not included (the spec allows face and/or voice).
- **Bookshelf and journal** (our creative feature): members' shelves are saved to `data/shelves.json`; visitors' live in `sessionStorage` and disappear when the tab closes. Reflection questions are generated only on request and are never published.
- **Uploaded covers** are saved into `static/covers/`, which is served live by `npm run dev` (the demo setup). A production build would need covers moved out of `static/`.
- **Models**: `gemma3:4b` (chat and vision) and `nomic-embed-text` (embeddings). Swap them in `.env` if you have a better small model pulled.
