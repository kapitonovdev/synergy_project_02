# synergy_project_02

Монорепозиторий для производственной практики по профилю «Веб-разработка».

## Состав

- `apps/blog` - приложение блога с пользователями, постами, подписками, тегами и комментариями.
- `apps/bookstore` - web-версия книжного магазина с пользовательским и административным интерфейсами.
- `apps/travel-diary` - дневник путешествий с публикациями пользователей, изображениями, стоимостью и списком мест.

## Стек

- Next.js App Router
- TypeScript
- Prisma
- SQLite

## Подготовка БД

```bash
pnpm install
pnpm --dir apps/blog prisma:generate
pnpm --dir apps/blog db:push
pnpm --dir apps/blog db:seed
pnpm --dir apps/bookstore prisma:generate
pnpm --dir apps/bookstore db:push
pnpm --dir apps/bookstore db:seed
pnpm --dir apps/travel-diary prisma:generate
pnpm --dir apps/travel-diary db:push
pnpm --dir apps/travel-diary db:seed
```

Каждое приложение хранит собственную Prisma-схему и SQLite-файл в папке `prisma`.

## Запуск

```bash
pnpm dev:blog
pnpm dev:bookstore
pnpm dev:travel
```

Порты:

- Blog: `http://127.0.0.1:3001`
- Bookstore: `http://127.0.0.1:3002`
- Travel Diary: `http://127.0.0.1:3003`

UI работает с реальными SQLite-данными через Prisma Client, server actions и простые cookie-сессии.

## Назначение

Проект подготовлен для практических кейсов технологической (проектно-технологической) практики:

1. Кейс 3 - блог.
2. Кейс 4 - книжный магазин.
3. Кейс 5 - дневник путешествий.
