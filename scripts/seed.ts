// npm run seed  ->  resets data/ to the demo state described in DEMO.md.
// Covers are downloaded once from Project Gutenberg into static/covers/ and reused after that.
import fs from 'node:fs';
import path from 'node:path';
import { write } from '../src/lib/server/db.ts';
import type { Book, LedgerEntry, Review, User, View, Shelf } from '../src/lib/server/db.ts';
import { hashPassword } from '../src/lib/server/auth.ts';
import { makeCover } from '../src/lib/server/cover.ts';

const COVERS = path.resolve('static/covers');

// [gutenberg id, title, author, category, year, price, description]
const CATALOG: [number, string, string, string, number, number, string][] = [
  [1342, 'Pride and Prejudice', 'Jane Austen', 'Literature', 1813, 12, 'Elizabeth Bennet and the proud Mr. Darcy misjudge each other across a season of balls, letters and family embarrassments in Regency England.'],
  [1260, 'Jane Eyre', 'Charlotte Brontë', 'Literature', 1847, 13, 'An orphaned governess with a fierce sense of self takes a post at Thornfield Hall, where its brooding master keeps a secret in the attic.'],
  [768, 'Wuthering Heights', 'Emily Brontë', 'Literature', 1847, 11, 'On the Yorkshire moors, the foundling Heathcliff and Catherine Earnshaw share a love so wild it ruins two families over two generations.'],
  [98, 'A Tale of Two Cities', 'Charles Dickens', 'Literature', 1859, 12, 'London and Paris before and during the French Revolution, told through a doctor freed from the Bastille, his daughter and two men who love her.'],
  [1400, 'Great Expectations', 'Charles Dickens', 'Literature', 1861, 12, 'The orphan Pip receives a fortune from a mysterious benefactor and learns, slowly, what it costs to become a gentleman.'],
  [174, 'The Picture of Dorian Gray', 'Oscar Wilde', 'Literature', 1890, 10, 'A beautiful young man stays unchanged while his portrait ages and darkens with every cruelty he commits.'],
  [84, 'Frankenstein', 'Mary Shelley', 'Science Fiction', 1818, 10, 'A young scientist gives life to a creature built from the dead, then abandons it, and the creature comes looking for an answer.'],
  [35, 'The Time Machine', 'H. G. Wells', 'Science Fiction', 1895, 8, 'A Victorian inventor travels to the year 802,701 and finds humanity split into the gentle Eloi and the underground Morlocks.'],
  [36, 'The War of the Worlds', 'H. G. Wells', 'Science Fiction', 1898, 9, 'Martian cylinders land in the English countryside and their heat-rays and tripods overwhelm everything humanity can throw at them.'],
  [2701, 'Moby-Dick', 'Herman Melville', 'Adventure', 1851, 14, 'Ishmael signs on to the whaler Pequod, whose captain Ahab has sworn to hunt down the white whale that took his leg.'],
  [164, 'Twenty Thousand Leagues Under the Seas', 'Jules Verne', 'Adventure', 1870, 11, 'A professor and his companions are taken aboard the submarine Nautilus and tour the oceans with the enigmatic Captain Nemo.'],
  [103, 'Around the World in Eighty Days', 'Jules Verne', 'Adventure', 1873, 9, 'The precise Phileas Fogg wagers his fortune that he can circle the globe in eighty days, with his valet Passepartout in tow.'],
  [120, 'Treasure Island', 'Robert Louis Stevenson', 'Adventure', 1883, 9, 'Young Jim Hawkins finds a pirate map and sails for buried treasure, with the charming and dangerous Long John Silver aboard.'],
  [1661, 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'Mystery', 1892, 10, 'Twelve cases for the consulting detective of Baker Street, from a royal blackmail to a red-headed league.'],
  [2852, 'The Hound of the Baskervilles', 'Arthur Conan Doyle', 'Mystery', 1902, 9, 'A legend of a spectral hound haunts the Baskerville family, and Holmes sends Watson onto the moor to find the truth.'],
  [155, 'The Moonstone', 'Wilkie Collins', 'Mystery', 1868, 11, 'A cursed Indian diamond vanishes from a country house on the night of a birthday party, and several narrators try to explain how.'],
  [345, 'Dracula', 'Bram Stoker', 'Horror', 1897, 11, 'Told through diaries and letters, a band of friends tracks an ancient Transylvanian count who has come to London.'],
  [43, 'The Strange Case of Dr. Jekyll and Mr. Hyde', 'Robert Louis Stevenson', 'Horror', 1886, 7, 'A respected London doctor and a violent stranger named Hyde turn out to share a secret.'],
  [11, "Alice's Adventures in Wonderland", 'Lewis Carroll', "Children's", 1865, 8, 'Alice follows a white rabbit down a hole into a world of riddles, croquet with flamingos and a very bad-tempered queen.'],
  [2591, "Grimms' Fairy Tales", 'Jacob and Wilhelm Grimm', "Children's", 1812, 10, 'Sixty-two folk tales collected by the Brothers Grimm, including Hansel and Gretel, Rapunzel and Rumpelstiltskin.'],
  [1228, 'On the Origin of Species', 'Charles Darwin', 'Science', 1859, 15, "Darwin's argument that species change over generations through natural selection, built from decades of observation."],
  [944, 'The Voyage of the Beagle', 'Charles Darwin', 'Science', 1839, 13, "Darwin's journal of five years at sea, from the Cape Verde islands to the Galápagos, full of geology, animals and people."],
  [5001, 'Relativity: The Special and General Theory', 'Albert Einstein', 'Science', 1916, 12, 'Einstein explains special and general relativity for readers without advanced mathematics.'],
  [33283, 'Calculus Made Easy', 'Silvanus P. Thompson', 'Science', 1910, 9, 'A friendly, plain-spoken introduction to differential and integral calculus. "What one fool can do, another can."']
];

async function cover(id: number, title: string, author: string): Promise<string> {
  fs.mkdirSync(COVERS, { recursive: true });
  for (const ext of ['jpg', 'svg']) {
    if (fs.existsSync(path.join(COVERS, `${id}.${ext}`))) return `/covers/${id}.${ext}`;
  }
  try {
    const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`, {
      headers: { 'User-Agent': 'smartread-class-project-seed' }
    });
    const type = res.headers.get('content-type') ?? '';
    if (res.ok && type.startsWith('image/')) {
      fs.writeFileSync(path.join(COVERS, `${id}.jpg`), Buffer.from(await res.arrayBuffer()));
      console.log(`  downloaded cover ${id}`);
      return `/covers/${id}.jpg`;
    }
  } catch {
    // offline: fall through to a generated cover
  }
  fs.writeFileSync(path.join(COVERS, `${id}.svg`), makeCover(title, author, id));
  console.log(`  generated cover ${id}`);
  return `/covers/${id}.svg`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

async function main() {
  console.log('Seeding data/ ...');
  const books: Book[] = [];
  for (const [id, title, author, category, year, price, description] of CATALOG) {
    books.push({ id: String(id), title, author, category, year, price, description, cover: await cover(id, title, author) });
  }

  // Demo accounts. Every password is "demo123" except the super-user's.
  const u = (username: string, name: string, role: User['role'], extra: Partial<User> = {}): User => ({
    username,
    name,
    passwordHash: hashPassword(username === 'admin' ? 'admin123' : 'demo123'),
    role,
    balance: 0,
    warnings: 0,
    suspended: false,
    ...extra
  });
  const users: User[] = [
    u('admin', 'Store Manager', 'SU'),
    u('alice', 'Alice Moreno', 'RC'), // 3 purchases: one more makes her VC
    u('victor', 'Victor Chen', 'VC'), // VIP, gets 10% off
    u('wendy', 'Wendy Park', 'RC', { warnings: 2 }), // one more blocked comment suspends her
    u('bob', 'Bob Tanaka', 'RC'), // $0.50: any purchase is rejected with a $1 fine and suspends him
    u('sam', 'Sam Okafor', 'RC', { suspended: true }) // suspended, balance negative
  ];

  const ledger: LedgerEntry[] = [];
  const buy = (username: string, bookId: string, day: number, discount = 1) => {
    const b = books.find((x) => x.id === bookId)!;
    ledger.push({ at: daysAgo(day), username, type: 'purchase', amount: Math.round(b.price * discount * 100) / 100, bookId });
  };
  const deposit = (username: string, amount: number, day: number) => ledger.push({ at: daysAgo(day), username, type: 'deposit', amount });
  const fine = (username: string, day: number) => ledger.push({ at: daysAgo(day), username, type: 'fine', amount: 1 });

  deposit('alice', 100, 30);
  buy('alice', '164', 28); // Verne
  buy('alice', '120', 20); // Stevenson
  buy('alice', '2701', 12); // Melville
  deposit('victor', 150, 40);
  buy('victor', '1228', 38);
  buy('victor', '35', 33);
  buy('victor', '1661', 29);
  buy('victor', '5001', 25);
  buy('victor', '1342', 10, 0.9); // after promotion, so 10% off
  deposit('wendy', 40, 15);
  deposit('bob', 15.5, 20);
  buy('bob', '43', 18);
  buy('bob', '11', 10); // leaves $0.50
  deposit('sam', 5, 25);
  for (let day = 21; day > 14; day--) fine('sam', day); // seven rejected purchases: 5 - 7 = -2

  // Balances always agree with the ledger.
  for (const user of users) {
    user.balance = Math.round(
      ledger.filter((e) => e.username === user.username)
        .reduce((sum, e) => sum + (e.type === 'deposit' ? e.amount : -e.amount), 0) * 100
    ) / 100;
  }

  // Views: enough to make a clear "popular" top 3 and give alice/victor history.
  const views: View[] = [];
  const view = (username: string | null, bookId: string, times = 1) => {
    for (let i = 0; i < times; i++) views.push({ at: daysAgo(30 - i), username, bookId });
  };
  view(null, '1342', 9);
  view(null, '84', 7);
  view(null, '345', 6);
  view(null, '1661', 4);
  view(null, '11', 3);
  view('alice', '164', 2);
  view('alice', '103', 3);
  view('alice', '120');
  view('victor', '1228', 2);
  view('victor', '944');
  view('wendy', '1260', 2);
  view('wendy', '768');

  // Ratings. Purchasers count double in the weighted average.
  const reviews: Review[] = [];
  const rate = (author: string, bookId: string, stars: number, comment: string, day: number) =>
    reviews.push({ at: daysAgo(day), bookId, author, stars, comment });
  // Pride and Prejudice: on the to-order list (more than 3 ratings, average above 4)
  rate('victor', '1342', 5, 'Witty from the first line to the last. I reread it every winter.', 9);
  rate('alice', '1342', 5, 'Elizabeth Bennet is the best company.', 8);
  rate('wendy', '1342', 4, 'Slow start, wonderful finish.', 7);
  rate('visitor:seed1', '1342', 5, 'A classic for a reason.', 6);
  // Calculus Made Easy: on the no-order list (more than 3 ratings, average below 2)
  rate('alice', '33283', 1, 'Not easy at all for me.', 14);
  rate('wendy', '33283', 2, 'Dated examples.', 13);
  rate('bob', '33283', 1, 'Gave up on chapter three.', 12);
  rate('visitor:seed2', '33283', 2, 'Hard going.', 11);
  // Moby-Dick: three low ratings, so one more low rating puts it on the no-order list
  rate('wendy', '2701', 2, 'Far too many chapters about rope.', 10);
  rate('bob', '2701', 1, 'I wanted more whale.', 9);
  rate('visitor:seed3', '2701', 2, 'Long.', 8);
  // a few ordinary ones
  rate('alice', '164', 4, 'Captain Nemo is a great mystery of a man.', 25);
  rate('victor', '1228', 5, 'Patient, careful and still astonishing.', 30);
  rate('visitor:seed4', '84', 4, 'Much sadder than the films.', 5);

  const shelves: Record<string, Shelf> = {
    alice: {
      books: { '103': 'want', '164': 'finished', '2701': 'reading' },
      journal: [
        { id: 'j1', at: daysAgo(11), bookId: '2701', text: "Ahab's speech on the quarterdeck made me uneasy. Everyone cheers, but nobody asks whether the hunt is worth it." }
      ]
    }
  };

  write('books', books);
  write('users', users);
  write('ledger', ledger);
  write('views', views);
  write('reviews', reviews);
  write('taboo', ['darn', 'heck', 'dang', 'crap', 'stupid']);
  write('shelves', shelves);
  write('sessions', {});
  console.log(`Done: ${books.length} books, ${users.length} accounts.`);
}

main();
