#!/usr/bin/env node
// scripts/reclassify-ukr-literature.mjs
//
// One-shot cleanup: the `ukr-literature` category had accumulated lots of
// foreign authors (Stephen King, Dan Brown, Jane Austen, …) because the
// ingest heuristic was loose. This pass keeps ONLY authors identified as
// Ukrainian there and moves everyone else to a genre-appropriate bucket.
//
// Rules:
//   • If the author is in UKRAINIAN_AUTHORS → keep `ukr-literature`.
//   • If the author is in FOREIGN_GENRE → use the mapped target.
//   • Otherwise (no explicit verdict) we're conservative and leave the
//     book where it was (ukr-literature). Better to leave a stray in
//     place than move a Ukrainian author out by mistake.
//
// Usage: node scripts/reclassify-ukr-literature.mjs [--apply]
//   Without --apply it prints a summary, no files touched.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const CATEGORIES_PATH = join(ROOT, 'src', 'data', 'categories.json');

// Authors confirmed as Ukrainian (classics + modern). Aliases and
// transliteration variants all listed explicitly — we don't normalize.
const UKRAINIAN_AUTHORS = new Set([
  'Андрій Кокотюха',
  'Андрій Анатолійович Кокотюха',
  'Андрей Анатольевич Кокотюха',
  'Люко Дашвар',
  'Наталка Сняданко',
  'Олесь Ільченко',
  'Олесь Гончар',
  'Светлана Талан',
  'Галина Пагутяк',
  'Олена Печорна',
  'Євген Положій',
  'Христина Лукащук',
  'Василь Шкляр',
  'Максим Кідрук',
  'Володимир Лис',
  'Лариса Денисенко',
  'Галина Костянтинівна Вдовиченко',
  'Галина Вдовиченко',
  'Євген Пилипович Гуцало',
  'Владислав Івченко',
  'Наталя Тисовська',
  'Маріанна Малина',
  'Агатангел Кримський',
  'Наталка Шевченко',
  'Сергей Викторович Жадан',
  'Валентин Стецюк',
  'Наталка Доляк',
  'Юрій Винничук',
  'Юрий Винничук',
  'Юрій Павлович Винничук',
  'Віктор Поліщук',
  'Жанна Куява',
  'Станіслав Тельнюк',
  'Віталій Іванович Петльований',
  'Наталія Довгопол',
  'Николай Васильевич Билкун',
  'Віктор Савченко',
  'Дарина Гнатко',
  'Олександр Боргардт',
  'Марія Маргуліс',
  'Христина Холод',
  'Володимир Кирилович Винниченко',
  'Світлана Горбань',
  'Юрій Логвин',
  'Юрiй Логвин',
  'Олексій Кацай',
  'Сергій Ухачевський',
  'Володимир Іванович Милько',
  'Тетяна Белімова',
  'Михайло Михайлович Коцюбинський',
  'Михайло Коцюбинський',
  'Іван Дубінін',
  'Олександр Дерманський',
  'Тетяна Савченко',
  "Левко Лук'яненко",
  'Ірина Львова',
  'Володимир Арєнєв',
  'Любко Дереш',
  'Петро Михайлович Лущик',
  'Міла Іванцова',
  'Марина Троян',
  'Валентин Л. Чемерис',
  'Ірен Роздобудько',
  'Олександр Вільчинський',
  'Юрій Даценко',
  'Валентина Люліч',
  'Іван Франко',
  'Сергій Недоруб',
  'Олексій Волков',
  'Олексій Михайлович Волков',
  'Олексій Жупанський',
  'Майк Гервасійович Йогансен',
  'Андрій Подволоцький',
  'Сергій Батурин',
  'Тимур Литовченко',
  'Андрій Котовський',
  'Ірина Славінська',
  'Панас Мирний',
  'Осип Васильович Турянський',
  'Анна Хома',
  'Осип Назарук',
  'Андрiй Якович Чайковський',
  'Марина Соколян',
  'Павло Архипович Загребельний',
  'Євген Куртяк',
  'Семен Дмитриевич Скляренко',
  'Василий Дмитриевич Кожелянко',
  'Володимир Єшкілєв',
  'Микола Данилович Руденко',
  'Сергій Плохій',
  'І. С. Нечуй-Левицький',
  'Oльга Юліанівна Кобилянська',
  'Пантелеймон Олександрович Куліш',
  'Григорій Бабенко',
  'Євген Дудар',
  'Юрій Михайлович Мушкетик',
  'Дмитро Джангіров',
  'Тетяна Панасенко',
  'Владимир Николаевич Сосюра',
  'Николай Ввсильевич Гоголь',
  'Николай Васильевич Гоголь',
  'Юрій Сорока',
  'І. А. Коляда',
  'Наталя Паняєва',
  'Світлана Поваляєва',
  'Александр Васильевич Скрипник',
  'Наталія Павлівна Кушнєрова',
]);

// Foreign authors → target category. Fallback for unlisted foreigns
// is `classic`, but listing them explicitly is better — especially
// for thrillers/children/sci-fi that shouldn't land as classic.
const FOREIGN_GENRE = {
  // Thriller / Detective / Crime
  'Стівен Кінг': 'fiction',
  'Жан-Крістоф Ґранже': 'detective',
  'Жан-Крістоф Крістоф Ґранже': 'detective',
  'Ден Браун': 'detective',
  'Джон Ґрішем': 'detective',
  'Артур Конан Дойл': 'detective',
  'Ю Несбьо': 'detective',
  'Тесс Ґеррітсен': 'detective',
  'Тесс Ґеррітсе': 'detective',
  'Кріс Тведт': 'detective',
  'Джейн Гарпер': 'detective',
  'Пола Гоукінз': 'detective',
  'Гоукінз Пола': 'detective',
  'Гарлан Кобен': 'detective',
  'Луиза Пенни': 'detective',
  'Жоель Діккер': 'detective',
  'Донато Каррізі': 'detective',
  'Денніс Лігейн': 'detective',
  'Ендрю Мейн': 'detective',
  'Клої Еспозіто': 'detective',
  'Нэнси Спрингер': 'detective',
  'Ненси Спрингер': 'detective',
  'Жорж Сіменон': 'detective',
  'Жорж Сименон': 'detective',
  'Фіона Бартон': 'detective',
  'Алекс Фінлі': 'detective',
  'Ліян Моріарті': 'detective',
  'Джеймс Паттерсон': 'detective',
  'Джессіка Беррі': 'detective',
  'Лінвуд Барклей': 'detective',
  'Ларс Кеплер': 'detective',
  'Агата Крісті': 'detective',
  'Аґата Крісті': 'detective',
  'Керол Джонстоун': 'detective',
  'Ігнасіо Карденас Акунья': 'detective',
  'Ґіліян Флінн': 'detective',
  'Зиґмунт Мілошевський': 'detective',
  'Вільям Кент Крюґер': 'detective',
  'Джин Філліпс': 'detective',
  'С. Дж. Тюдор': 'detective',
  'Даніель Коул': 'detective',
  'Саманта Давнінг': 'detective',
  'Сьюзен Гілл': 'detective',
  'Лі Чайлд': 'detective',
  'Марек Краєвський': 'detective',
  'Трюде Тайґе': 'detective',
  'Франк Тільє': 'detective',
  'Ульф Квенслер': 'detective',
  'Нуала Еллвуд': 'detective',
  'Урсула Познанскі': 'detective',
  'Стюарт Тертон': 'detective',
  'Алан Бредлі': 'detective',
  'Стейсі Віллінґем': 'detective',
  'Рут Веа': 'detective',
  'Шари Лапена': 'detective',
  'Томас Гарріс': 'detective',
  'Мішель Бюссі': 'detective',
  'Трюльс Вюллер': 'detective',
  'Еміліос Солому': 'detective',
  'Меган Миранда': 'detective',
  'Мішель Френсіс': 'detective',
  'Роберт Ґалбрейт': 'detective',
  'Джеймс Фенімор Купер': 'classic',
  'Фенімор Купер': 'classic',

  // Sci-fi / Fantasy / Modern fiction
  'Джоан Кетлін Ролінґ': 'fiction',
  'Харукі Муракамі': 'fiction',
  'Люк Бессон': 'fiction',
  'Сапковський Анджей': 'fiction',
  'Жуль Верн': 'fiction',
  'Дана Шварц': 'fiction',
  'Йон Колфер': 'fiction',
  'Роберт Джордан': 'fiction',
  'Томас Тімайєр': 'fiction',
  'Патрік Несс': 'fiction',
  'Джон П. Стрелекі': 'fiction',
  'Рафал Дембський': 'fiction',
  'Вероніка Рот': 'fiction',
  'Бернар Вербер': 'fiction',
  'Майкл Флінн': 'fiction',
  'Стефані Майєр': 'fiction',
  'Френк Герберт': 'fiction',
  'Террі Пратчетт': 'fiction',
  'Клайв Баркер': 'fiction',
  'Філіп К. Дік': 'fiction',
  'Патрік Сенекаль': 'fiction',
  'Джо Гілл': 'fiction',
  'Клер Норт': 'fiction',
  'Анджей Земянський': 'fiction',
  'Вілбур Сміт': 'fiction',
  'Герберт Джордж Веллс': 'fiction',
  'Вільям Пол Янг': 'fiction',
  'Ева-Марія Люнд': 'fiction',
  'Фред Унгер': 'fiction',
  'Олдос Гакслі': 'fiction',
  'Клеменс Мішлон': 'fiction',
  'Павліна Пулу': 'fiction',
  'Летиція Коломбані': 'fiction',
  'Жозеф Роні': 'fiction',
  'Жаклін Сільвестр': 'fiction',
  'Роберт Уэйд': 'fiction',
  'Кейт Мосс': 'fiction',
  'Елізабет Костова': 'fiction',

  // Children
  'Льюїс Керрол': 'children',
  'Роберт Лоуренс Стайн': 'children',
  'Енн Дігбі': 'children',
  'Кріс Рідел': 'children',
  'Дженніфер Белл': 'children',
  'Донна Барба Іґера': 'children',
  'Люис Стейплз Клайв': 'children',
  'Клайв Стейплз Люїс': 'children',
  'Люїс Стейплз Клайв': 'children',

  // Romance
  'Джозі Сільвер': 'romance',
  'Мона Кастен': 'romance',
  'Януш Вишневський': 'romance',
  'Мері Ловсон': 'romance',

  // Business / Psychology
  'Генрі Форд': 'business',
  'Саймон Сінек': 'business',
  'ЙОНА БЕРҐЕР': 'business',
  'Дейл Карнегі': 'psychology',
  'Epix Фромм': 'psychology',
  'Зиґмунд Фройд': 'psychology',
  'Томас Еріксон': 'psychology',
  'Джозеф Кемпбелл': 'psychology',

  // Science
  'Річард Докінз': 'science',
  'Лоуренс М. Краусс': 'science',
  'Роберт М. Сапольські': 'science',
  'Рудольф Ташнер': 'science',

  // History / Non-fiction narrative
  'Вінстон Черчілль': 'history',
  'Ерік Ларсон': 'history',
  'Саймон Шустер': 'history',
  'Виктор Суворов': 'history',
  'Роберто Савіано': 'history',
  'Евгений Наконечный': 'history',
  'Поліна Жеребцова': 'history',

  // World classics (default bucket for pre-1950 foreign literature)
  'Вільям Фолкнер': 'classic',
  'Марк Твен': 'classic',
  'Арчибальд Джозеф Кронін': 'classic',
  'Арчибальд Кронін': 'classic',
  'Чарлз Діккенс': 'classic',
  'Чарльз Діккенс': 'classic',
  'Джейн Остін': 'classic',
  'Генрі Джеймс': 'classic',
  'Еріх Марія Ремарк': 'classic',
  'Луї-Фердінан Селін': 'classic',
  'Альфред Деблін': 'classic',
  'Джером Девід Селінджер': 'classic',
  'Генрик Сенкевич': 'classic',
  'ГЕНРИК СЕНКЕВИЧ': 'classic',
  'Шарлотта Бронте': 'classic',
  'Лусі Мод Монтгомері': 'classic',
  'Люсі Мод Монтгомері': 'classic',
  'Чарльз Буковскі': 'classic',
  'Вірджинія Вулф': 'classic',
  'Дафна дю Мор’є': 'classic',
  'Гомер': 'classic',
  'Теодор Драйзер': 'classic',
  'Світлана Алексієвич': 'classic',
  'Пол Бенджамин Остер': 'classic',
  'Бегбедер Фредерік': 'classic',
  'Марґеріт Юрсенар': 'classic',
  'Артур Гейлі': 'fiction',
  'Артур Хейлі': 'fiction',
  'Джон Роберт Фаулз': 'classic',
  'Ґюнтер Ґрас': 'classic',
  'Курт Воннеґут': 'classic',
  'Дадзай Осаму': 'classic',
  'Віктор Платонович Некрасов': 'classic',
  'Карлос Руис Сафон': 'classic',
  'Френсіс Скотт Фіцджеральд': 'classic',
  'Френсис Скотт Кэй Фицджеральд': 'classic',
  'Томас Пінчон': 'classic',
  'Генріх Манн': 'classic',
  'Сол Беллоу': 'classic',
  'Джузеппе Томазі ді Лампедуза': 'classic',
  'Джон Ернст Стейнбек': 'classic',
  'Джон Стейнбек': 'classic',
  'О. Генрі': 'classic',
  'Володимир Сорокін': 'classic',
  'Меша Селімович': 'classic',
  'Девід Мітчелл': 'classic',
  'Кара Делевінь': 'classic',
  'Івлін Во': 'classic',
  'Юкіо Місіма': 'classic',
  'Сей-шьонаґон': 'classic',
  'Алессандро Мандзоні': 'classic',
  'Федір Михайлович Достоєвський': 'classic',
  'Ґеорґ Гайм': 'classic',
  'Тадеуш Доленга-Мостович': 'classic',
  'Проспер Меріме': 'classic',
  'Ґрем Ґрін': 'classic',
  'Тоні Моррісон': 'classic',
  'Девід Герберт Лоуренс': 'classic',
  'Роберт Вільям Чемберс': 'classic',
  'Владімір НЕФФ': 'classic',
  'Владімір Нефф': 'classic',
  'Кормак Маккарті': 'classic',
  'Пола Маклейн': 'classic',
  'Вашингтон Ірвінг': 'classic',
  'Сомерсет Моем': 'classic',
  'Вільям Сомерсет Моем': 'classic',
  'Вільям Самерсіт Моем': 'classic',
  'Моріо Кіта': 'classic',
  'Лео Перуц': 'classic',
  'П’єр Самсон': 'classic',
  'Джек Лондон': 'classic',
  'Ентоні Берджес': 'classic',
  'Джон Дос Пассос': 'classic',
  'Семюел Беккет': 'classic',
  'Ллойд Джонс': 'classic',
  'Генріх Мелвілл': 'classic',
  'Сельма Лаґерльоф': 'classic',
  'Кнут Гамсун': 'classic',
  'Ентоні Троллоп': 'classic',
  'Hermann Hesse': 'classic',
  'Ірвін Шоу': 'classic',
  'Эдгар Аллан По': 'classic',
  'Едґар Аллан По': 'classic',
  'Джонатан Свіфт': 'classic',
  'Хуліо Кортасар': 'classic',
  'Борис Віан': 'classic',
  'Томас Майн Рід': 'classic',
  'Гі де Мопассан': 'classic',
  'Гюстав Флобер': 'classic',
  'Джозеф Геллер': 'classic',
  'Хуан Рульфо': 'classic',
  'Томас Гарді': 'classic',
  'Роберт Кувер': 'classic',
  'Джон Гарднер': 'classic',
  'Оскар Вайлд': 'classic',
  'Дітер Нолль': 'classic',
  'Мануела Ґретковська': 'classic',
  'Джованни Боккаччо': 'classic',
  'Владислав Лозинський': 'classic',
  'Алеш Штеґер': 'classic',
  'Даниэль Дефо': 'classic',
  'Хосе Доносо': 'classic',
  'Амелі Нотомб': 'classic',
  'Італо Звево': 'classic',
  'Брем Стокер': 'classic',
  'Озрен Кебо': 'classic',
  'Едмон Ростан': 'classic',
  'Ернст Юнґер': 'classic',
  'Маріо Варґас Льйоса': 'classic',
  "ДіБіСі П'єр": 'classic',
  'Джон Фанте': 'classic',
  'Боб Ділан': 'classic',
  'Діно Буццаті': 'classic',
  'Олександр Дюма': 'classic',
  'Генрі Міллер': 'classic',
  'Джером Клапка Джером': 'classic',
  'Жан Фуке': 'classic',
  'Джеймс Джойс': 'classic',
  'Нестор Ґарсія Канкліні': 'classic',
  'Андре Жід': 'classic',
  'Крістіан Крахт': 'classic',
  'Ґарриет Бичер-Стоу': 'classic',
  'Річард Бах': 'classic',
  'Джуліан Барнз': 'classic',
  'Айріс Мердок': 'classic',
  'Алістер Кроулі': 'classic',
  'Вільям Мейкпіс Теккерей': 'classic',
  'Ґустав Майрінк': 'classic',
  'Михаїл Опанасович Булгаков': 'classic',
  'Василь Биков': 'classic',
  'Биков Володимирович Василь': 'classic',
  'Марчін Швьонтковський': 'fiction',
  'Владимир Николаевич Войнович': 'classic',
  'Олександр Медведєв': 'classic',
  'Тесс': 'classic',
  'Кен Фоллетт': 'fiction',
};

// ── runtime ──────────────────────────────────────────────────────────

const apply = process.argv.includes('--apply');

const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const books = index.books || index;

const moves = []; // { slug, author, from, to }
for (const b of books) {
  if (b.category !== 'ukr-literature') continue;
  const a = b.author;
  if (UKRAINIAN_AUTHORS.has(a)) continue;
  const target = FOREIGN_GENRE[a];
  if (!target) continue; // conservative: leave untouched
  moves.push({ slug: b.slug, author: a, from: b.category, to: target });
}

// Summary by (author, to)
const byPair = {};
for (const m of moves) {
  const k = `${m.author}\t${m.to}`;
  byPair[k] = (byPair[k] || 0) + 1;
}
console.log(`Planned moves: ${moves.length} of ${books.filter((b) => b.category === 'ukr-literature').length} books in ukr-literature\n`);
const pairs = Object.entries(byPair).sort((a, b) => b[1] - a[1]);
for (const [k, n] of pairs) {
  const [a, t] = k.split('\t');
  console.log(`  ${String(n).padStart(3)}  ${a}  →  ${t}`);
}

// Unclassified foreign-ish authors — report so we can iterate.
const leftovers = new Set();
for (const b of books) {
  if (b.category !== 'ukr-literature') continue;
  const a = b.author;
  if (!UKRAINIAN_AUTHORS.has(a) && !FOREIGN_GENRE[a]) leftovers.add(a);
}
if (leftovers.size > 0) {
  console.log(`\nLeft in ukr-literature (no verdict in either list):`);
  for (const a of [...leftovers].sort()) console.log(`  • ${a}`);
}

if (!apply) {
  console.log(`\n(dry-run — pass --apply to write changes)`);
  process.exit(0);
}

// ── apply ────────────────────────────────────────────────────────────

const moveBySlug = new Map(moves.map((m) => [m.slug, m]));

// 1. Rewrite index
for (const b of books) {
  const m = moveBySlug.get(b.slug);
  if (m) b.category = m.to;
}
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`wrote ${INDEX_PATH}`);

// 2. Rewrite individual book JSON files
let updatedFiles = 0;
for (const file of readdirSync(BOOKS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const path = join(BOOKS_DIR, file);
  const b = JSON.parse(readFileSync(path, 'utf8'));
  const m = moveBySlug.get(b.slug);
  if (!m) continue;
  b.category = m.to;
  writeFileSync(path, JSON.stringify(b, null, 2) + '\n', 'utf8');
  updatedFiles++;
}
console.log(`updated ${updatedFiles} book files`);

// 3. Recompute category bookCounts from scratch
const cats = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf8'));
const catCounts = {};
for (const b of books) catCounts[b.category] = (catCounts[b.category] || 0) + 1;
for (const c of cats) c.bookCount = catCounts[c.slug] || 0;
writeFileSync(CATEGORIES_PATH, JSON.stringify(cats, null, 2) + '\n', 'utf8');
console.log(`wrote ${CATEGORIES_PATH}`);

console.log('\ndone.');
