# Book Classification Schema (for Agent sub-agents)

## Your task
You classify Ukrainian-library books into a 2-level category tree. You will be given a batch of ~50 books as JSON (each with title, author, year, existingDescription, bodyPreview — first ~2KB of the book's actual text, optional). Return classification for every book.

## Top-level categories (pick EXACTLY ONE per book)

| Slug | Name | Use for |
|---|---|---|
| `literature-ukr` | Сучасна українська проза | Modern prose by Ukrainian authors, 1960+ |
| `literature-foreign` | Сучасна зарубіжна проза | Modern prose in Ukrainian translation from foreign authors |
| `classics` | Класика | Pre-1960 literary prose/drama, canonical works |
| `fantasy` | Фантастика та фентезі | Fantasy, sci-fi, horror, dystopia, urban fantasy |
| `poetry` | Поезія | Poetry books (any era, any language) |
| `children` | Дитяча література | Books for children under 12 |
| `teen` | Підліткова література | YA / books for 12-18 |
| `history` | Історія та біографії | History, memoirs, biographies, war docs |
| `nonfiction` | Нонфікшн та публіцистика | Essays, politics, philosophy, culture, linguistics |
| `self-help` | Саморозвиток та психологія | Psychology, motivation, health, relationships |
| `business-science` | Бізнес та наука | Business, economics, science, tech, reference |
| `other` | Інше | Non-Ukrainian language OR genuinely unclassifiable |

## Sub-categories

### literature-ukr (укр.)
- `novels` — Романи (full-length Ukrainian novels)
- `stories` — Оповідання та повісті (short/medium prose)
- `historical` — Історична проза (fiction set in past)
- `war` — Воєнна проза (WW2, russo-ukrainian war fiction)
- `sentimental` — Жіноча/сентиментальна (romance, chick-lit)
- `detectives` — Детективи та трилери
- `humor` — Гумор і сатира

### literature-foreign (зарубіжна)
- `novels` — Романи (long foreign novels)
- `stories` — Оповідання та повісті
- `historical` — Історична проза
- `detectives` — Детективи та трилери
- `sentimental` — Жіноча/сентиментальна

### classics
- `ukrainian` — Українська класика (Shevchenko, Franko, Lesia Ukrainka, 1800s-mid-1900s)
- `foreign` — Зарубіжна класика (Dostoevsky, Dickens, Dumas, Hemingway, pre-1960)
- `antique` — Антична (Ancient Greek/Roman/medieval)
- `poetry-classic` — Класична поезія (poetry pre-1960)

### fantasy
- `fantasy` — Фентезі (magic, dragons, elves, urban fantasy, romantasy)
- `sci-fi` — Наукова фантастика (space, AI, cyberpunk, hard SF)
- `mystery-horror` — Містика і горор (horror, supernatural)
- `dystopia` — Постапокаліпсис і антиутопія
- `adventure` — Пригоди (classical adventure prose)

### poetry
- `ukrainian-modern` — Сучасна укр. поезія (post-1960 Ukrainian poets)
- `world` — Світова поезія (foreign poetry in translation)
- `folk-songs` — Пісні та фольклор (folk songs, dumas, epic)

### children
- `fairytales` — Казки та міфи (folk + authored fairytales)
- `prose` — Дитяча проза (stories for kids)
- `poems` — Дитячі вірші
- `adventures` — Пригоди для дітей
- `educational` — Пізнавальне та енциклопедії
- `classics` — Класика дитячої літератури

### teen
- `prose` — Підліткова проза
- `fantasy` — YA фентезі/фантастика
- `detectives` — YA детективи
- `nonfiction` — YA нонфікшн

### history
- `ukraine` — Історія України
- `world` — Світова історія
- `russo-ukrainian-war` — Війна з 2014 (Maidan, ATO, 2022+)
- `memoirs` — Мемуари, щоденники, спогади
- `biographies` — Біографії
- `documents` — Документи, архіви, збірники документів (OUN, UPA, official)

### nonfiction
- `essays` — Публіцистика, есеї
- `politics` — Політика, суспільство, соціологія
- `religion-philosophy` — Релігія, філософія, теологія
- `culture` — Культурологія, мистецтво, кіно
- `linguistics` — Мовознавство, літературознавство

### self-help
- `psychology` — Популярна психологія
- `motivation` — Саморозвиток, звички, продуктивність
- `relationships` — Стосунки, родина, батьківство
- `health` — Здоров'я (physical + mental)

### business-science
- `business` — Бізнес, економіка, менеджмент, маркетинг
- `science-tech` — Наука, IT, технології, інженерія
- `reference` — Словники, довідники, підручники

### other
- `foreign-language` — Book's text/title is primarily in a non-Ukrainian language (English, Russian, Polish). Use detectedLanguage to confirm.
- `uncategorized` — Genuinely unclassifiable after review

## Language detection

Return one of: `uk`, `ru`, `en`, `pl`, `other`. Base on `bodyPreview` (most reliable) or fall back to title/author. If `bodyPreview` is empty or clearly a title-page-only snippet, trust `title` + `author`.

Any detection ≠ `uk` → force `topCategory: "other", subCategory: "foreign-language"` UNLESS:
- It's a classical translation into Ukrainian (e.g. Dostoevsky's title in Ukrainian, preview in Ukrainian) — then use `classics / foreign` or `literature-foreign / novels`.
- It's a Ukrainian book with just a title in Latin transliteration but body in Cyrillic — check preview carefully.

## Classification priorities (in order)

1. **Language check** — if not Ukrainian, almost always goes to `other/foreign-language`.
2. **Poetry** — if preview/title looks like verse (line breaks every ~40-50 chars, rhyme pattern, "вірш/поезія/сонет" in metadata), use `poetry`.
3. **Children/Teen** — if meant for kids (fairytale structure, simple language, "казка/дитяча/малюку" markers), use `children` or `teen`.
4. **Classic vs Modern** — year < 1960 + canonical author → `classics`. Modern prose → `literature-ukr` or `literature-foreign`.
5. **History** — non-fiction about historical events → `history` (not `classics` even if old).
6. **Nonfiction vs Fiction** — essays, analysis, philosophy → `nonfiction`; detective stories, love stories → fiction categories.

## Output format

You MUST write the results as JSON to the specified output file. Format:

```json
[
  {
    "slug": "book-slug-here",
    "topCategory": "literature-ukr",
    "subCategory": "novels",
    "detectedLanguage": "uk",
    "confidence": "high",
    "reasoning": "Modern Ukrainian novel by Жадан, urban theme"
  },
  ...
]
```

- `confidence`: `high` (preview confirms), `medium` (metadata-based, plausible), `low` (guess, no clear signal)
- `reasoning`: ONE short sentence (under 100 chars). Keep it tight.

Process EVERY book in the input batch. Do not skip. If truly unclear, use `other / uncategorized` with confidence `low`.
