#!/usr/bin/env python3
"""One-shot cleanup 2026-04-23:
1. Drop all ru-language books from index + individual JSON.
2. Reclassify `history` and `ukr-literature` sink-categories by author,
   reusing author → genre maps from reclassify-ukr-literature.mjs.
3. Unknown/anonymous books in `history` → `other` (can't be real history).
4. Recompute bookCount in categories.json.
"""
import io
import json
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
INDEX_PATH = ROOT / 'src' / 'data' / 'books-index.json'
BOOKS_DIR = ROOT / 'src' / 'data' / 'books'
CATEGORIES_PATH = ROOT / 'src' / 'data' / 'categories.json'

# --- Author lists (mirrored from reclassify-ukr-literature.mjs) ---

UKRAINIAN_AUTHORS = {
    'Андрій Кокотюха', 'Андрій Анатолійович Кокотюха', 'Андрей Анатольевич Кокотюха',
    'Люко Дашвар', 'Наталка Сняданко', 'Олесь Ільченко', 'Олесь Гончар',
    'Светлана Талан', 'Галина Пагутяк', 'Олена Печорна', 'Євген Положій',
    'Христина Лукащук', 'Василь Шкляр', 'Максим Кідрук', 'Володимир Лис',
    'Лариса Денисенко', 'Галина Костянтинівна Вдовиченко', 'Галина Вдовиченко',
    'Євген Пилипович Гуцало', 'Владислав Івченко', 'Наталя Тисовська',
    'Маріанна Малина', 'Агатангел Кримський', 'Наталка Шевченко',
    'Сергей Викторович Жадан', 'Валентин Стецюк', 'Наталка Доляк',
    'Юрій Винничук', 'Юрий Винничук', 'Юрій Павлович Винничук',
    'Віктор Поліщук', 'Жанна Куява', 'Станіслав Тельнюк',
    'Віталій Іванович Петльований', 'Наталія Довгопол', 'Николай Васильевич Билкун',
    'Віктор Савченко', 'Дарина Гнатко', 'Олександр Боргардт', 'Марія Маргуліс',
    'Христина Холод', 'Володимир Кирилович Винниченко', 'Світлана Горбань',
    'Юрій Логвин', 'Юрiй Логвин', 'Олексій Кацай', 'Сергій Ухачевський',
    'Володимир Іванович Милько', 'Тетяна Белімова', 'Михайло Михайлович Коцюбинський',
    'Михайло Коцюбинський', 'Іван Дубінін', 'Олександр Дерманський',
    'Тетяна Савченко', "Левко Лук'яненко", 'Ірина Львова', 'Володимир Арєнєв',
    'Любко Дереш', 'Петро Михайлович Лущик', 'Міла Іванцова', 'Марина Троян',
    'Валентин Л. Чемерис', 'Ірен Роздобудько', 'Олександр Вільчинський',
    'Юрій Даценко', 'Валентина Люліч', 'Іван Франко', 'Сергій Недоруб',
    'Олексій Волков', 'Олексій Михайлович Волков', 'Олексій Жупанський',
    'Майк Гервасійович Йогансен', 'Андрій Подволоцький', 'Сергій Батурин',
    'Тимур Литовченко', 'Андрій Котовський', 'Ірина Славінська', 'Панас Мирний',
    'Осип Васильович Турянський', 'Анна Хома', 'Осип Назарук',
    'Андрiй Якович Чайковський', 'Марина Соколян', 'Павло Архипович Загребельний',
    'Євген Куртяк', 'Семен Дмитриевич Скляренко', 'Василий Дмитриевич Кожелянко',
    'Володимир Єшкілєв', 'Микола Данилович Руденко', 'Сергій Плохій',
    'І. С. Нечуй-Левицький', 'Oльга Юліанівна Кобилянська',
    'Пантелеймон Олександрович Куліш', 'Григорій Бабенко', 'Євген Дудар',
    'Юрій Михайлович Мушкетик', 'Дмитро Джангіров', 'Тетяна Панасенко',
    'Владимир Николаевич Сосюра', 'Николай Ввсильевич Гоголь',
    'Николай Васильевич Гоголь', 'Юрій Сорока', 'І. А. Коляда',
    'Наталя Паняєва', 'Світлана Поваляєва', 'Александр Васильевич Скрипник',
    'Наталія Павлівна Кушнєрова',
    # Extras often seen in history sink
    'Михайло Грушевський', 'Михайло Сергійович Грушевський',
    'Петро Мірчук', 'Дмитро Донцов', 'Іван Багряний',
    'Володимир Винниченко', 'Леся Українка', 'Зиновій Книш',
    'Агатангел Юхимович Кримський',
}

FOREIGN_GENRE = {
    # Thriller / Detective / Crime
    'Стівен Кінг': 'fiction', 'КІНГ Стівен': 'fiction',
    'Жан-Крістоф Ґранже': 'detective', 'Жан-Крістоф Крістоф Ґранже': 'detective',
    'Ден Браун': 'detective', 'Джон Ґрішем': 'detective',
    'Артур Конан Дойл': 'detective', 'Ю Несбьо': 'detective',
    'Тесс Ґеррітсен': 'detective', 'Тесс Ґеррітсе': 'detective',
    'Кріс Тведт': 'detective', 'Джейн Гарпер': 'detective',
    'Пола Гоукінз': 'detective', 'Гоукінз Пола': 'detective',
    'Гарлан Кобен': 'detective', 'Луиза Пенни': 'detective',
    'Жоель Діккер': 'detective', 'Донато Каррізі': 'detective',
    'Денніс Лігейн': 'detective', 'Ендрю Мейн': 'detective',
    'Клої Еспозіто': 'detective', 'Нэнси Спрингер': 'detective',
    'Ненси Спрингер': 'detective', 'Жорж Сіменон': 'detective',
    'Жорж Сименон': 'detective', 'Фіона Бартон': 'detective',
    'Алекс Фінлі': 'detective', 'Ліян Моріарті': 'detective',
    'Джеймс Паттерсон': 'detective', 'Джессіка Беррі': 'detective',
    'Лінвуд Барклей': 'detective', 'Ларс Кеплер': 'detective',
    'Агата Крісті': 'detective', 'Аґата Крісті': 'detective',
    'КРІСТІ Аґата': 'detective',
    'Керол Джонстоун': 'detective', 'Ігнасіо Карденас Акунья': 'detective',
    'Ґіліян Флінн': 'detective', 'Зиґмунт Мілошевський': 'detective',
    'Вільям Кент Крюґер': 'detective', 'Джин Філліпс': 'detective',
    'С. Дж. Тюдор': 'detective', 'Даніель Коул': 'detective',
    'Саманта Давнінг': 'detective', 'Сьюзен Гілл': 'detective',
    'Лі Чайлд': 'detective', 'Марек Краєвський': 'detective',
    'Трюде Тайґе': 'detective', 'Франк Тільє': 'detective',
    'Ульф Квенслер': 'detective', 'Нуала Еллвуд': 'detective',
    'Урсула Познанскі': 'detective', 'Стюарт Тертон': 'detective',
    'Алан Бредлі': 'detective', 'Стейсі Віллінґем': 'detective',
    'Рут Веа': 'detective', 'Шари Лапена': 'detective',
    'Томас Гарріс': 'detective', 'Мішель Бюссі': 'detective',
    'Трюльс Вюллер': 'detective', 'Еміліос Солому': 'detective',
    'Меган Миранда': 'detective', 'Мішель Френсіс': 'detective',
    'Роберт Ґалбрейт': 'detective',
    'Флемінг Ієн': 'detective', 'Ієн Флемінг': 'detective',
    'Кен Бруен': 'detective', 'Мері Бертон': 'detective',
    'Фріда МакФадден': 'detective', 'Фріда Мак-Фадден': 'detective',
    'Ґреґорі Еш': 'detective', 'Шель Слоан': 'detective',
    'Дін Кунц': 'fiction',
    'Джеймс Фенімор Купер': 'classic', 'Фенімор Купер': 'classic',

    # Sci-fi / Fantasy / Modern fiction
    'Джоан Кетлін Ролінґ': 'fiction', 'Харукі Муракамі': 'fiction',
    'Люк Бессон': 'fiction', 'Сапковський Анджей': 'fiction',
    'Жуль Верн': 'fiction', 'Дана Шварц': 'fiction',
    'Йон Колфер': 'fiction', 'Роберт Джордан': 'fiction',
    'Томас Тімайєр': 'fiction', 'Патрік Несс': 'fiction',
    'Джон П. Стрелекі': 'fiction', 'Рафал Дембський': 'fiction',
    'Вероніка Рот': 'fiction', 'Бернар Вербер': 'fiction',
    'Майкл Флінн': 'fiction', 'Стефані Майєр': 'fiction',
    'Френк Герберт': 'fiction', 'Террі Пратчетт': 'fiction',
    'Клайв Баркер': 'fiction', 'Філіп К. Дік': 'fiction',
    'Патрік Сенекаль': 'fiction', 'Джо Гілл': 'fiction',
    'Клер Норт': 'fiction', 'Анджей Земянський': 'fiction',
    'Вілбур Сміт': 'fiction', 'Герберт Джордж Веллс': 'fiction',
    'Вільям Пол Янг': 'fiction', 'Ева-Марія Люнд': 'fiction',
    'Фред Унгер': 'fiction', 'Олдос Гакслі': 'fiction',
    'Клеменс Мішлон': 'fiction', 'Павліна Пулу': 'fiction',
    'Летиція Коломбані': 'fiction', 'Жозеф Роні': 'fiction',
    'Жаклін Сільвестр': 'fiction', 'Роберт Уэйд': 'fiction',
    'Кейт Мосс': 'fiction', 'Елізабет Костова': 'fiction',
    'Джеймс С. А. Корі': 'fiction',
    'Айн Ренд': 'fiction',
    'Лі Бардуґо': 'fiction',
    'Вікторія Авеярд': 'fiction',
    'Марчін Швьонтковський': 'fiction',
    'Кен Фоллетт': 'fiction',
    'Артур Гейлі': 'fiction', 'Артур Хейлі': 'fiction',

    # Children
    'Льюїс Керрол': 'children', 'Роберт Лоуренс Стайн': 'children',
    'Енн Дігбі': 'children', 'Кріс Рідел': 'children',
    'Дженніфер Белл': 'children', 'Донна Барба Іґера': 'children',
    'Люис Стейплз Клайв': 'children', 'Клайв Стейплз Люїс': 'children',
    'Люїс Стейплз Клайв': 'children',

    # Romance
    'Джозі Сільвер': 'romance', 'Мона Кастен': 'romance',
    'Януш Вишневський': 'romance', 'Мері Ловсон': 'romance',
    'Нора Робертс': 'romance',
    'Алі Гейзелвуд': 'romance',
    'Катаріна Маура': 'romance',
    'Пенелопа Дуглас': 'romance',
    'Кеті Регнері': 'romance',
    'Кора Рейлі': 'romance',
    'Кейті Роберт': 'romance',
    'Крістіна Лорен': 'romance',
    'Ребекка Яррос': 'romance',
    'Саллі Руні': 'fiction',
    'Лі Жако': 'romance',
    'Рон Мерседес': 'romance',

    # Business / Psychology
    'Генрі Форд': 'business', 'Саймон Сінек': 'business',
    'ЙОНА БЕРҐЕР': 'business',
    'Дейл Карнегі': 'psychology', 'Epix Фромм': 'psychology',
    'Зиґмунд Фройд': 'psychology', 'Томас Еріксон': 'psychology',
    'Джозеф Кемпбелл': 'psychology',

    # Science
    'Річард Докінз': 'science', 'Лоуренс М. Краусс': 'science',
    'Роберт М. Сапольські': 'science', 'Рудольф Ташнер': 'science',

    # History / Non-fiction narrative
    'Вінстон Черчілль': 'history', 'Ерік Ларсон': 'history',
    'Саймон Шустер': 'history', 'Виктор Суворов': 'history',
    'Роберто Савіано': 'history', 'Евгений Наконечный': 'history',
    'Поліна Жеребцова': 'history',
    'Бернард Корнвелл': 'history',

    # World classics
    'Вільям Фолкнер': 'classic', 'Марк Твен': 'classic',
    'Арчибальд Джозеф Кронін': 'classic', 'Арчибальд Кронін': 'classic',
    'Чарлз Діккенс': 'classic', 'Чарльз Діккенс': 'classic',
    'Джейн Остін': 'classic', 'Генрі Джеймс': 'classic',
    'Еріх Марія Ремарк': 'classic', 'Луї-Фердінан Селін': 'classic',
    'Альфред Деблін': 'classic', 'Джером Девід Селінджер': 'classic',
    'Генрик Сенкевич': 'classic', 'ГЕНРИК СЕНКЕВИЧ': 'classic',
    'Шарлотта Бронте': 'classic', 'Лусі Мод Монтгомері': 'classic',
    'Люсі Мод Монтгомері': 'classic', 'Чарльз Буковскі': 'classic',
    'Вірджинія Вулф': 'classic', 'Дафна дю Мор’є': 'classic',
    'Гомер': 'classic', 'Теодор Драйзер': 'classic',
    'Світлана Алексієвич': 'classic', 'Пол Бенджамин Остер': 'classic',
    'Бегбедер Фредерік': 'classic', 'Марґеріт Юрсенар': 'classic',
    'Джон Роберт Фаулз': 'classic', 'Ґюнтер Ґрас': 'classic',
    'Курт Воннеґут': 'classic', 'Дадзай Осаму': 'classic',
    'Віктор Платонович Некрасов': 'classic', 'Карлос Руис Сафон': 'classic',
    'Френсіс Скотт Фіцджеральд': 'classic',
    'Френсис Скотт Кэй Фицджеральд': 'classic',
    'Томас Пінчон': 'classic', 'Генріх Манн': 'classic',
    'Сол Беллоу': 'classic', 'Джузеппе Томазі ді Лампедуза': 'classic',
    'Джон Ернст Стейнбек': 'classic', 'Джон Стейнбек': 'classic',
    'О. Генрі': 'classic', 'Володимир Сорокін': 'classic',
    'Меша Селімович': 'classic', 'Девід Мітчелл': 'classic',
    'Кара Делевінь': 'classic', 'Івлін Во': 'classic',
    'Юкіо Місіма': 'classic', 'Сей-шьонаґон': 'classic',
    'Алессандро Мандзоні': 'classic',
    'Федір Михайлович Достоєвський': 'classic',
    'Ґеорґ Гайм': 'classic', 'Тадеуш Доленга-Мостович': 'classic',
    'Проспер Меріме': 'classic', 'Ґрем Ґрін': 'classic',
    'Тоні Моррісон': 'classic', 'Девід Герберт Лоуренс': 'classic',
    'Роберт Вільям Чемберс': 'classic', 'Владімір НЕФФ': 'classic',
    'Владімір Нефф': 'classic', 'Кормак Маккарті': 'classic',
    'Пола Маклейн': 'classic', 'Вашингтон Ірвінг': 'classic',
    'Сомерсет Моем': 'classic', 'Вільям Сомерсет Моем': 'classic',
    'Вільям Самерсіт Моем': 'classic', 'Моріо Кіта': 'classic',
    'Лео Перуц': 'classic', 'П’єр Самсон': 'classic',
    'Джек Лондон': 'classic', 'Ентоні Берджес': 'classic',
    'Джон Дос Пассос': 'classic', 'Семюел Беккет': 'classic',
    'Ллойд Джонс': 'classic', 'Генріх Мелвілл': 'classic',
    'Сельма Лаґерльоф': 'classic', 'Кнут Гамсун': 'classic',
    'Ентоні Троллоп': 'classic', 'Hermann Hesse': 'classic',
    'Ірвін Шоу': 'classic', 'Эдгар Аллан По': 'classic',
    'Едґар Аллан По': 'classic', 'Джонатан Свіфт': 'classic',
    'Хуліо Кортасар': 'classic', 'Борис Віан': 'classic',
    'Томас Майн Рід': 'classic', 'Гі де Мопассан': 'classic',
    'Гюстав Флобер': 'classic', 'Джозеф Геллер': 'classic',
    'Хуан Рульфо': 'classic', 'Томас Гарді': 'classic',
    'Роберт Кувер': 'classic', 'Джон Гарднер': 'classic',
    'Оскар Вайлд': 'classic', 'Дітер Нолль': 'classic',
    'Мануела Ґретковська': 'classic', 'Джованни Боккаччо': 'classic',
    'Владислав Лозинський': 'classic', 'Алеш Штеґер': 'classic',
    'Даниэль Дефо': 'classic', 'Хосе Доносо': 'classic',
    'Амелі Нотомб': 'classic', 'Італо Звево': 'classic',
    'Брем Стокер': 'classic', 'Озрен Кебо': 'classic',
    'Едмон Ростан': 'classic', 'Ернст Юнґер': 'classic',
    'Маріо Варґас Льйоса': 'classic', "ДіБіСі П'єр": 'classic',
    'Джон Фанте': 'classic', 'Боб Ділан': 'classic',
    'Діно Буццаті': 'classic', 'Олександр Дюма': 'classic',
    'Генрі Міллер': 'classic', 'Джером Клапка Джером': 'classic',
    'Жан Фуке': 'classic', 'Джеймс Джойс': 'classic',
    'Нестор Ґарсія Канкліні': 'classic', 'Андре Жід': 'classic',
    'Крістіан Крахт': 'classic', 'Ґарриет Бичер-Стоу': 'classic',
    'Річард Бах': 'classic', 'Джуліан Барнз': 'classic',
    'Айріс Мердок': 'classic', 'Алістер Кроулі': 'classic',
    'Вільям Мейкпіс Теккерей': 'classic', 'Ґустав Майрінк': 'classic',
    'Михаїл Опанасович Булгаков': 'classic', 'Василь Биков': 'classic',
    'Биков Володимирович Василь': 'classic',
    'Владимир Николаевич Войнович': 'classic',
    'Олександр Медведєв': 'classic', 'Тесс': 'classic',
    'В.СОМЕРСЕТ МОЕМ': 'classic',
    'Томас Росс': 'classic',
    'Річард Монтанари': 'detective',
    'Блейк Крауч': 'detective',
    'Джозеф Макелрой': 'classic',
    'Василий Иванович Ардаматский': 'classic',
    'Эдуард Ростовцев': 'detective',
    'Едуард Ростовцев': 'detective',
}

# Author strings that mean "no real author" — for those books in `history`
# or `ukr-literature`, dump into `other` (they're not real history / not
# ukr-lit just because someone left the metadata blank).
JUNK_AUTHORS = {
    '', 'Unknown', 'unknown', 'Пользователь Windows',
    'Невідомий автор', 'word', 'Calibre', 'Adobe Digital Editions',
}


def load_index():
    with open(INDEX_PATH, encoding='utf-8') as f:
        return json.load(f)


def save_index(idx):
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
        f.write('\n')


def update_individual_files(moves_by_slug, removed_slugs):
    """moves_by_slug: dict[slug -> new_category]. removed_slugs: set of ru slugs."""
    updated = 0
    removed = 0
    for name in os.listdir(BOOKS_DIR):
        if not name.endswith('.json'):
            continue
        slug = name[:-5]
        path = BOOKS_DIR / name
        if slug in removed_slugs:
            try:
                os.remove(path)
                removed += 1
            except OSError as e:
                print(f'  failed to remove {path}: {e}', file=sys.stderr)
            continue
        if slug in moves_by_slug:
            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)
                data['category'] = moves_by_slug[slug]
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.write('\n')
                updated += 1
            except Exception as e:
                print(f'  failed to update {path}: {e}', file=sys.stderr)
    return updated, removed


def main():
    idx = load_index()
    books = idx['books']
    print(f'Start: {len(books)} books')

    # --- Step 1: drop ru books ---
    ru_slugs = {b['slug'] for b in books if b.get('language') == 'ru'}
    books = [b for b in books if b.get('language') != 'ru']
    print(f'After ru drop: {len(books)} books ({len(ru_slugs)} removed)')

    # --- Step 2: reclassify history + ukr-literature by author ---
    moves = []  # (slug, from, to)
    for b in books:
        cat = b.get('category')
        if cat not in ('history', 'ukr-literature'):
            continue
        author = (b.get('author') or '').strip()

        # Junk author in these buckets → other
        if author in JUNK_AUTHORS:
            if cat != 'other':
                moves.append((b['slug'], cat, 'other'))
                b['category'] = 'other'
            continue

        # Ukrainian author → keep/set ukr-literature
        if author in UKRAINIAN_AUTHORS:
            if cat != 'ukr-literature':
                moves.append((b['slug'], cat, 'ukr-literature'))
                b['category'] = 'ukr-literature'
            continue

        # Foreign author with known target
        target = FOREIGN_GENRE.get(author)
        if target and cat != target:
            moves.append((b['slug'], cat, target))
            b['category'] = target

    # Summarize
    from collections import Counter
    print(f'\nReclassification moves: {len(moves)}')
    move_counter = Counter((m[1], m[2]) for m in moves)
    for (src, dst), n in move_counter.most_common():
        print(f'  {n:5d}  {src} → {dst}')

    # --- Step 3: recompute counters + save ---
    idx['books'] = books
    idx['total'] = len(books)
    save_index(idx)
    print(f'\nWrote {INDEX_PATH}')

    moves_by_slug = {m[0]: m[2] for m in moves}
    u, r = update_individual_files(moves_by_slug, ru_slugs)
    print(f'Individual files: updated {u}, removed {r}')

    with open(CATEGORIES_PATH, encoding='utf-8') as f:
        cats = json.load(f)
    cat_counts = Counter(b['category'] for b in books)
    for c in cats:
        c['bookCount'] = cat_counts.get(c['slug'], 0)
    with open(CATEGORIES_PATH, 'w', encoding='utf-8') as f:
        json.dump(cats, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'Wrote {CATEGORIES_PATH}')
    print('\nFinal category counts:')
    for c in sorted(cats, key=lambda x: -x['bookCount']):
        print(f'  {c["bookCount"]:5d}  {c["slug"]:18s}  {c["name"]}')


if __name__ == '__main__':
    main()
