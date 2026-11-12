# Demo script

Follows the spec's bullets in order. Before you start:

```bash
npm run seed
npm run dev
```

Have Ollama running, and (for step 3) the face service from the README. Make sure `DEMO_MODE=1` is in `.env` so the login page shows the **demo: log in as…** buttons. Every demo password is `demo123`; the manager's is `admin123`.

| Account | Set up so that… |
|---|---|
| `admin` | the super-user (SU) |
| `alice` | RC with 3 purchases: her next purchase makes her VIP |
| `victor` | VIP (VC): sees 10% off prices |
| `wendy` | RC with 2 warnings: one more blocked comment suspends her |
| `bob` | RC with $0.50: any purchase is rejected, fined $1 and suspends him |
| `sam` | already suspended with a balance of -$2.00 |

Book state: *Pride and Prejudice* is on the to-order list, *Calculus Made Easy* is on the no-order list, and *Moby-Dick* has 3 low ratings (one more puts it on the no-order list).

The chat box is the **ask the clerk** tab at the bottom right of every page. Every reply is labelled **Answered from store files (RAG)** (with the file name and match score), **Answered by the LLM**, or **Declined**. The first AI answer after starting Ollama can take 10 to 30 seconds while the model loads.

---

## 1. Four kinds of users

1. Open http://localhost:5173 without logging in: you are a **visitor (VS)**. The nav shows Catalog, My shelf, Log in.
2. Go to **Log in**. Point out the demo row, password login, face login and "New here?" registration.
3. Register a new account (any name, username, 6+ character password). You land on the account page as a **member (RC) with $0**. Log out.

## 2. Top 3 on the home page

1. As a visitor, the home page shows **most read this month**: the 3 most purchased + viewed books (*Pride and Prejudice*, *Frankenstein*, *Sherlock Holmes*).
2. Log in as **admin**: the same popular top 3 (SU sees general activity).
3. Log out, log in as **alice**: the note now says **picked for you**. She has bought and viewed Verne, Stevenson and Melville adventure books, so she gets *Around the World in Eighty Days* (Verne), *Dr. Jekyll and Mr. Hyde* (Stevenson) and a popular book to fill the gap. Books she owns are left out.

## 3. Chat box, by role

Ask exactly these:

**As a visitor**
- `What are your opening hours?` → RAG, *hours-and-policies.md*
- `Can I get a refund?` → RAG
- `Who wrote Frankenstein?` → LLM
- `What was the store revenue this month?` → Declined (finance is SU-only)

**As alice (RC)**
- `What is my balance and what have I bought?` → LLM with her own facts ($66.00, three books)
- `What is Victor's balance?` → Declined (other customers)

**As victor (VC)**
- `How much have I saved as a VIP?` → LLM with his discount and savings

**As admin (SU)**
- `What was the revenue from book sales and how much in fines?` → LLM with the finance report ($104.80 and $7.00)
- `Which customers are suspended?` → Sam Okafor
- `What is on the no-order list?` → *Calculus Made Easy*
- `How do I become a VIP?` → RAG (store files work for every role)

## 4. Face login

1. Log in as **alice** (demo button), open **Account**, scroll to **Face login**, click **Enrol my face**, allow the camera, click **Take 20 pictures**. It shows **training…** for a minute or two, then "Your face is enrolled".
2. Log out. On the login page click **Log in with my face**, look at the camera. You are logged in as Alice, with the confidence shown.
3. Have someone else try (or cover the camera): "We didn't recognise you (best guess N% sure…)".
4. Stop the face service and try again: the page says the service is not running and password login still works. (Same for no camera.)

## 5. SU adds a book

1. Log in as **admin** → **Manage store** → **Add a book**.
2. Click **Add to catalog** with the year empty or as `abc`: a clear error, nothing saved.
3. Fill in title `The Secret Garden`, author `Frances Hodgson Burnett`, category `Children's`, year `1911`, price `9.50`, a description, and optionally upload a cover. Without a cover a plain cloth cover is generated.
4. Click **See it**: the book page is live and the book shows on the catalog and home shelves.

## 6. Browse and search

1. **Catalog**: pick category **Science**; then author **H. G. Wells**; then years **1800** to **1850**.
2. Keyword `whale` → *Moby-Dick*. Keyword `zzzz` → "No books match that search…".
3. **Search by picture**: upload `static/covers/36.jpg` (or a phone photo of any cover). The AI describes it ("the AI saw: … War of the Worlds…") and the top 3 by similarity are shown, with *The War of the Worlds* first. Try `static/covers/345.jpg` → *Dracula*.

## 7. Money, fines and suspension

1. Log in as **victor**, open any book: the price is struck through with **your VIP price** (10% off). Open **Account**, deposit `-5` (rejected), then `20` (accepted, balance updates).
2. Log in as **bob** ($0.50), open *Pride and Prejudice*, click **Buy this book**: "Not enough funds… A $1 fine was charged, your balance is now -$0.50, and your account is suspended." He is logged out.
3. Try to log in as **bob** again: refused, suspended.
4. Log in as **admin** → **Customers**: bob and sam are highlighted as suspended and **Reopen** is disabled. Click Reopen on sam anyway → "balance must be above $0". Deposit `5` for sam → "You can reopen the account now" → **Reopen**.
5. Log in as **sam**: works.

## 8. Ratings, comments and order lists

1. As a visitor open *Pride and Prejudice*: weighted average, **on the to-order list**, buyers' reviews first with **✓ verified purchase** (Victor bought it).
2. As a visitor open *Moby-Dick* (3 low ratings, no list). Give it **1 star**, comment `Too long.` → the review shows as by "Visitor" and the book is now **on the no-order list**.
3. Post again as the same visitor with 2 stars: it **replaces** the old review (one per person per book).
4. Log in as **admin** → **Order lists** shows *Pride and Prejudice* (to-order) and *Calculus Made Easy* and *Moby-Dick* (no-order). These are computed on the fly.

## 9. Taboo words and warnings

The seeded list is `crap, dang, darn, heck, stupid`.

1. As **alice**, on any book, post 4 stars with `Darn good fun, what the heck.` → posted as `* good fun, what the *.` with "2 words replaced by *".
2. As **wendy** (2 warnings), post `darn heck darn stupid book` → blocked, "you received a warning (3 so far)… your account is now suspended". She is logged out.
3. As **victor** (VIP), post that blocked comment 3 times: the third time says he is no longer a VIP and warnings are reset. His account page now shows member, no discount.
4. As **admin** → **Taboo words**: add `blimey`, try adding `darn` again (duplicate, rejected), remove `blimey`.

## 10. Promotion to VIP

1. Log in as **alice** (3 purchases, $66 balance). Buy any book she doesn't own, e.g. *Around the World in Eighty Days*.
2. The page says **congratulations!** She is now a VIP: the header says *VIP member*, the price shows **your VIP price**, and **Account** says she gets 10% off.

## 11. RAG versus LLM

Already shown in step 3. To show the decision itself, point at the **best match** score on each reply: store questions score above 0.6 and are answered from `data/store_info/*.md`; others fall through to the LLM. Open `data/store_info/hours-and-policies.md`, change the opening hours, save, and ask `What are your opening hours?` again: the answer changes straight away.

## 12. Creative feature: bookshelf and reading journal

1. As a visitor open **My shelf**: the note says nothing will be kept after the tab closes. Add *Dracula* to **Want to read**, move it to **Reading** with its little dropdown.
2. Under **Reading journal**, choose *Dracula*, write two sentences, **Save entry**, then **Ask for a reflection question**: one question appears under the entry ("think about: …").
3. Log in as **alice** and open **My shelf**: her saved shelf and her journal entry on *Moby-Dick* are there. Ask for a question, log out and back in: it is still there (saved to `data/shelves.json`). Nothing here is shown anywhere public.
4. From any book page, **Put it on my shelf** adds it to Want to read.

## 13. If something is down

- Stop Ollama, ask the chat a question → "The AI assistant is not running…"; picture search and reflection questions say the same, and everything else keeps working.
- Face service off or no camera → a clear message, password login still works.
- Reset at any time with `npm run seed` (restart not needed).
