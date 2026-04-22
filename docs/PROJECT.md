# Wiki Blister — документация проекта

Актуальность: поддерживайте этот файл после существенных правок (функции, деплой, UI, схема БД).

---

## Назначение

Веб-приложение: раз в сутки по московскому времени пользователь открывает **блистер** из пяти карточек популярных статей **русской Википедии**; карточки попадают в **коллекцию**. Данные аккаунта и прогресс хранятся в **Supabase** (вход по email и паролю).

---

## Стек

| Слой        | Технологии |
|------------|------------|
| Фронтенд   | React 19, TypeScript, Vite 6, React Router 7 |
| Бэкенд / БД | Supabase (Auth + Postgres), Row Level Security |
| Деплой     | Подходит Vercel (есть `vercel.json` для SPA) |

---

## Локальный запуск

```bash
npm install
cp .env.example .env   # заполнить ключи Supabase
npm run dev
```

После смены `.env` перезапустите `npm run dev`.

Команды:

- `npm run dev` — разработка (Vite, HMR)
- `npm run build` — проверка TypeScript и production-сборка в `dist/`
- `npm run preview` — локальный просмотр сборки

---

## Переменные окружения

Файл **`.env`** (в git не коммитится):

| Переменная | Описание |
|------------|----------|
| `VITE_SUPABASE_URL` | URL проекта: `https://<ref>.supabase.co` (без `/rest/v1/`) |
| `VITE_SUPABASE_ANON_KEY` | Ключ **anon public** из Supabase → Project Settings → API |

На **Vercel**: те же имена в Environment Variables для Production / Preview.

Если переменные не заданы, приложение показывает экран «Нужен Supabase».

---

## Supabase

1. Создать проект на [supabase.com](https://supabase.com).
2. В **SQL Editor** выполнить скрипт из репозитория: **`supabase/schema.sql`**  
   (таблица `user_state`, RLS, триггер на нового пользователя).
3. **Authentication → Providers → Email**: при разработке часто отключают подтверждение email, чтобы сразу можно было войти после регистрации.

### Таблица `user_state`

| Колонка       | Назначение |
|---------------|------------|
| `user_id`     | UUID, PK, связь с `auth.users` |
| `collection`  | JSONB — массив карточек коллекции |
| `todays_pack` | JSONB — `{ mskDate, cards }` или `null` |
| `updated_at`  | время обновления |

Доступ только к своей строке (политики RLS в `schema.sql`).

---

## Маршруты и доступ

| Путь | Доступ |
|------|--------|
| `/login`, `/register` | Без входа |
| `/`, `/collection`, `/profile` | Только после входа |

Сброс коллекции и «сегодняшнего пака» — кнопка на странице **Профиль** (синхронизируется с БД).

---

## Логика данных (кратко)

- **Блистер**: список популярных статей за доступный день из Wikimedia Pageviews API (с **рангом** и **числом просмотров**) → перемешивание → до 5 успешных summary из REST Википедии → назначение **редкости** → сохранение в `user_state`.
- **Редкость** (`common` … `mythic`): эвристика от ранга в дневном топе и просмотров (`src/lib/rarity.ts`, `rarityFromPopularity`). В паке из 5 гарантированно **не все** `common` (лучшая по рангу получает `rare`). У одной и той же статьи (`pageid`) в коллекции хранится **максимальная** из встречавшихся редкостей; текст и метаданные подтягиваются с последнего открытия.
- **Календарь**: дата по **Москве** (`src/lib/moscow.ts`).
- **Коллекция**: слияние по `pageid`, сортировка по `openedMskDate` и заголовку (`src/lib/storage.ts` — `mergeIntoCollection`).

Подробности реализации — в `src/lib/wikipedia.ts`, `src/context/GameStateContext.tsx`.

**Ачивки** (план): учёт редкостей и коллекции — отдельная задача; в JSON карточки уже есть поле `rarity`.

---

## UI и дизайн

Спецификация: ориентир **`wiki_blister_ui_tz_fixed.pdf`** (палитра, glass, типографика Inter + Manrope, glow сдержанный).

Стили: **`src/index.css`** — CSS-переменные `--wb-*` и классы **`wb-*`** (страницы, панели, кнопки liquid glass, навигация, карточки «ККИ»).

PNG-рамки по редкостям (требования к ассетам): **`docs/FRAME_PNG_REQUIREMENTS.md`**.

### Варианты фона приложения

Класс на корневом контейнере в **`src/App.tsx`** (и на экране отсутствия `.env` в **`AuthContext`**):

| Класс | Смысл (ТЗ) |
|-------|------------|
| `wb-app--bg-depth` | Глубина — спокойный градиент |
| `wb-app--bg-energy` | Энергия — градиент + лёгкие цветные ореолы (текущий выбор по умолчанию) |
| `wb-app--bg-focus` | Фокус — виньетка к центру |

Шрифты подключаются в **`index.html`** (Google Fonts).

---

## Структура каталогов (важное)

```
src/
  App.tsx
  main.tsx
  index.css
  components/     # CardTile, NavBar, PasswordInput, ProtectedRoute, ResetProgressButton
  context/        # AuthContext, GameStateContext
  layout/         # AppShell
  lib/            # moscow, storage, supabaseClient, wikipedia
  pages/          # Blister, Collection, Login, Register, Profile
  types.ts
supabase/
  schema.sql
docs/
  PROJECT.md      # этот файл
vercel.json
.env.example
```

---

## Журнал изменений (для агента / разработчика)

При значимых правках добавляйте строку **сверху** (дата по факту коммита).

| Дата       | Изменения |
|------------|-----------|
| 2026-04-23 | Добавлен `docs/FRAME_PNG_REQUIREMENTS.md` — ТЗ на PNG-оверлеи рамок по редкостям. |
| 2026-04-23 | Редкость карточек (5 уровней): правила от ранга/просмотров топа, гарантия ≥1 не-common в паке, слияние `max(rarity)` в коллекции; UI в стиле TCG, сетка 2×N, lightbox по тапу; тип `CardRarity`, модули `lib/rarity.ts`, обновлён `drawFiveCards`. |
| 2026-04-22 | Добавлен файл документации `docs/PROJECT.md`; зафиксированы стек, Supabase, UI-темы `wb-app--bg-*`, маршруты. |

---

## Контакты и лицензии

Википедия: контент статей и иллюстрации под лицензиями Викимедиа; приложение использует публичные API.
