import { buyBook, login, logout, markReminderSent, register, rentBook, updateBook } from "../lib/actions";
import { getCurrentUser } from "../lib/auth";
import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

type SearchParams = {
  category?: string;
  author?: string;
  sort?: string;
  q?: string;
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Доступна",
  RENTED: "В аренде",
  HIDDEN: "Скрыта"
};

const sortLabels: Record<string, string> = {
  title: "По названию",
  category: "По категории",
  author: "По автору",
  year: "По году"
};

const rentalOptions = [
  ["14", "2 недели"],
  ["30", "1 месяц"],
  ["90", "3 месяца"]
];

export default async function BookstorePage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  const category = searchParams.category ?? "all";
  const author = searchParams.author ?? "all";
  const sort = searchParams.sort ?? "title";
  const query = (searchParams.q ?? "").trim().toLowerCase();

  const [books, categories, authors, purchases, rentals] = await Promise.all([
    prisma.book.findMany(),
    prisma.book.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.book.findMany({ distinct: ["author"], select: { author: true }, orderBy: { author: "asc" } }),
    currentUser
      ? prisma.purchase.findMany({ where: { userId: currentUser.id }, include: { book: true }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    currentUser
      ? prisma.rental.findMany({ where: { userId: currentUser.id }, include: { book: true }, orderBy: { startsAt: "desc" } })
      : Promise.resolve([])
  ]);

  const visibleBooks = books
    .filter((book) => currentUser?.role === "ADMIN" || book.status !== "HIDDEN")
    .filter((book) => category === "all" || book.category === category)
    .filter((book) => author === "all" || book.author === author)
    .filter((book) => {
      if (!query) return true;
      return [book.title, book.author, book.category, String(book.year)].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sort === "year") return b.year - a.year;
      if (sort === "category") return a.category.localeCompare(b.category, "ru");
      if (sort === "author") return a.author.localeCompare(b.author, "ru");
      return a.title.localeCompare(b.title, "ru");
    });

  const reminderLimit = new Date();
  reminderLimit.setDate(reminderLimit.getDate() + 14);
  const reminders =
    currentUser?.role === "ADMIN"
      ? await prisma.rental.findMany({
          where: { reminded: false, endsAt: { lte: reminderLimit } },
          include: { book: true, user: true },
          orderBy: { endsAt: "asc" }
        })
      : [];

  const activeRentals = rentals.filter((rental) => rental.endsAt >= new Date());

  return (
    <main className="shell">
      <header className="appbar">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="book" />
        </div>
        <div className="brand">
          <h1>Bookstore Practice</h1>
          <p>Каталог, аренды, покупки и административное управление</p>
        </div>

        {currentUser ? (
          <form className="global-search" action="/" method="get">
            <Icon name="search" />
            <input name="q" placeholder="Поиск по названию, автору, категории..." defaultValue={searchParams.q ?? ""} />
            {category !== "all" ? <input name="category" type="hidden" value={category} /> : null}
            {author !== "all" ? <input name="author" type="hidden" value={author} /> : null}
            {sort !== "title" ? <input name="sort" type="hidden" value={sort} /> : null}
          </form>
        ) : null}

        {currentUser ? (
          <form action={logout} className="account">
            <span className="avatar">{initials(currentUser.name)}</span>
            <span className="account-copy">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role === "ADMIN" ? "Администратор" : "Пользователь"}</span>
            </span>
            <button className="icon-btn" type="submit">
              <Icon name="logout" />
              <span>Выйти</span>
            </button>
          </form>
        ) : null}
      </header>

      {!currentUser ? (
        <AuthScreen />
      ) : (
        <section className="workspace">
          <aside className="rail rail-left">
            <form className="panel filters" action="/" method="get">
              <div className="section-heading">
                <h2>Фильтры</h2>
                <span>{visibleBooks.length}</span>
              </div>
              <label className="field-block">
                <span>Категория</span>
                <select className="field" name="category" defaultValue={category}>
                  <option value="all">Все категории</option>
                  {categories.map((item) => (
                    <option key={item.category} value={item.category}>
                      {item.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span>Автор</span>
                <select className="field" name="author" defaultValue={author}>
                  <option value="all">Все авторы</option>
                  {authors.map((item) => (
                    <option key={item.author} value={item.author}>
                      {item.author}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span>Сортировка</span>
                <select className="field" name="sort" defaultValue={sort}>
                  <option value="title">По названию</option>
                  <option value="category">По категории</option>
                  <option value="author">По автору</option>
                  <option value="year">По году</option>
                </select>
              </label>
              {query ? <input name="q" type="hidden" value={query} /> : null}
              <button className="btn subtle full" type="submit">
                Применить
              </button>
            </form>

            <section className="panel about-panel">
              <Icon name="book" />
              <h2>Сценарий</h2>
              <p>
                Пользователь покупает и арендует книги, администратор управляет ценой, статусом и напоминаниями по
                срокам аренды.
              </p>
            </section>
          </aside>

          <section className="content">
            <div className="catalog-head">
              <div>
                <h2>Каталог книг</h2>
                <p>
                  {category === "all" ? "Все категории" : category} · {author === "all" ? "все авторы" : author} ·{" "}
                  {sortLabels[sort] ?? "По названию"}
                </p>
              </div>
              <span className="result-count">{visibleBooks.length} поз.</span>
            </div>

            <div className="catalog">
              {visibleBooks.length ? (
                visibleBooks.map((book) => <BookCard book={book} isAdmin={currentUser.role === "ADMIN"} key={book.id} />)
              ) : (
                <EmptyState title="Книги не найдены" text="Измените фильтры или поисковый запрос." />
              )}
            </div>
          </section>

          <aside className="rail rail-right">
            {currentUser.role === "ADMIN" ? (
              <AdminPanel books={books} reminders={reminders} />
            ) : (
              <UserPanel purchases={purchases} rentals={rentals} activeRentals={activeRentals} />
            )}
          </aside>
        </section>
      )}
    </main>
  );
}

function AuthScreen() {
  return (
    <section className="auth-shell">
      <div className="auth-copy">
        <div className="brand-mark large" aria-hidden="true">
          <Icon name="book" />
        </div>
        <h2>Bookstore Practice</h2>
        <p>Войдите как пользователь или администратор, чтобы проверить каталог, аренды, покупки и напоминания.</p>
      </div>
      <div className="auth-grid">
        <form action={login} className="auth-card">
          <h2>Вход</h2>
          <label className="field-block">
            <span>Email</span>
            <input className="field" name="email" placeholder="Email" defaultValue="reader@example.com" required />
          </label>
          <label className="field-block">
            <span>Пароль</span>
            <input className="field" name="password" placeholder="Пароль" type="password" defaultValue="123456" required />
          </label>
          <button className="btn primary full" type="submit">
            Войти
          </button>
          <p className="form-hint">Администратор: admin@example.com / 123456</p>
        </form>
        <form action={register} className="auth-card">
          <h2>Регистрация</h2>
          <label className="field-block">
            <span>Имя</span>
            <input className="field" name="name" placeholder="Имя" required />
          </label>
          <label className="field-block">
            <span>Email</span>
            <input className="field" name="email" placeholder="Email" required />
          </label>
          <label className="field-block">
            <span>Пароль</span>
            <input className="field" name="password" placeholder="Пароль от 6 символов" type="password" required minLength={6} />
          </label>
          <button className="btn subtle full" type="submit">
            Создать пользователя
          </button>
        </form>
      </div>
    </section>
  );
}

function BookCard({
  book,
  isAdmin
}: {
  book: { id: number; title: string; author: string; category: string; year: number; price: number; status: string };
  isAdmin: boolean;
}) {
  const isHidden = book.status === "HIDDEN";
  return (
    <article className={isHidden ? "book-row muted-book" : "book-row"}>
      <div className="book-main">
        <span className={`status ${book.status.toLowerCase()}`}>{statusLabels[book.status]}</span>
        <h3>{book.title}</h3>
        <p>
          {book.author} · {book.category} · {book.year}
        </p>
      </div>
      <div className="price-block">
        <span>Цена</span>
        <strong>{book.price.toLocaleString("ru-RU")} руб.</strong>
      </div>
      <div className="actions">
        <form action={buyBook}>
          <input name="bookId" type="hidden" value={book.id} />
          <button className="btn primary" type="submit" disabled={isHidden}>
            Купить
          </button>
        </form>
        <div className="rent-actions">
          {rentalOptions.map(([period, label]) => (
            <form action={rentBook} key={period}>
              <input name="bookId" type="hidden" value={book.id} />
              <input name="period" type="hidden" value={period} />
              <button className="btn subtle compact" type="submit" disabled={isHidden}>
                {label}
              </button>
            </form>
          ))}
        </div>
      </div>
      {isAdmin ? (
        <form action={updateBook} className="admin-inline">
          <input name="bookId" type="hidden" value={book.id} />
          <label>
            <span>Цена</span>
            <input className="field" name="price" type="number" defaultValue={book.price} />
          </label>
          <label>
            <span>Статус</span>
            <select className="field" name="status" defaultValue={book.status}>
              <option value="AVAILABLE">Доступна</option>
              <option value="RENTED">В аренде</option>
              <option value="HIDDEN">Скрыта</option>
            </select>
          </label>
          <button className="btn subtle" type="submit">
            Сохранить
          </button>
        </form>
      ) : null}
    </article>
  );
}

function UserPanel({
  purchases,
  rentals,
  activeRentals
}: {
  purchases: { id: number; price: number; createdAt: Date; book: { title: string } }[];
  rentals: { id: number; endsAt: Date; book: { title: string } }[];
  activeRentals: { id: number; endsAt: Date; book: { title: string } }[];
}) {
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Активные аренды</h2>
          <span>{activeRentals.length}</span>
        </div>
        <div className="list">
          {activeRentals.length ? (
            activeRentals.slice(0, 4).map((rental) => (
              <article className="operation-row rental" key={rental.id}>
                <Icon name="clock" />
                <div>
                  <strong>{rental.book.title}</strong>
                  <p>До {rental.endsAt.toLocaleDateString("ru-RU")}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState compact title="Нет аренд" text="Оформите аренду книги, чтобы увидеть срок возврата." />
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>История операций</h2>
          <span>{purchases.length + rentals.length}</span>
        </div>
        <div className="list">
          {purchases.length || rentals.length ? (
            [
              ...purchases.map((item) => ({
                id: `p-${item.id}`,
                title: item.book.title,
                meta: `Покупка · ${item.price.toLocaleString("ru-RU")} руб.`,
                kind: "purchase"
              })),
              ...rentals.map((item) => ({
                id: `r-${item.id}`,
                title: item.book.title,
                meta: `Аренда до ${item.endsAt.toLocaleDateString("ru-RU")}`,
                kind: "rental"
              }))
            ].map((operation) => (
              <article className={`operation-row ${operation.kind}`} key={operation.id}>
                <Icon name={operation.kind === "purchase" ? "cart" : "clock"} />
                <div>
                  <strong>{operation.title}</strong>
                  <p>{operation.meta}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState compact title="История пуста" text="Покупки и аренды появятся после действий в каталоге." />
          )}
        </div>
      </section>
    </>
  );
}

function AdminPanel({
  books,
  reminders
}: {
  books: { id: number; title: string; price: number; status: string }[];
  reminders: { id: number; endsAt: Date; book: { title: string }; user: { name: string } }[];
}) {
  return (
    <>
      <section className="panel admin-panel">
        <div className="section-heading">
          <h2>Администрирование</h2>
          <span>{books.length}</span>
        </div>
        <div className="admin-list">
          {books.map((book) => (
            <form action={updateBook} className="admin-row" key={book.id}>
              <input name="bookId" type="hidden" value={book.id} />
              <strong>{book.title}</strong>
              <input className="field" name="price" type="number" defaultValue={book.price} aria-label={`Цена ${book.title}`} />
              <select className="field" name="status" defaultValue={book.status} aria-label={`Статус ${book.title}`}>
                <option value="AVAILABLE">Доступна</option>
                <option value="RENTED">В аренде</option>
                <option value="HIDDEN">Скрыта</option>
              </select>
              <button className="btn subtle" type="submit">
                Сохранить
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Напоминания</h2>
          <span>{reminders.length}</span>
        </div>
        <div className="list">
          {reminders.length ? (
            reminders.map((rental) => (
              <form action={markReminderSent} className="reminder-row" key={rental.id}>
                <input name="rentalId" type="hidden" value={rental.id} />
                <Icon name="clock" />
                <div>
                  <strong>{rental.book.title}</strong>
                  <p>
                    {rental.user.name}: до {rental.endsAt.toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <button className="btn warning" type="submit">
                  Отметить
                </button>
              </form>
            ))
          ) : (
            <EmptyState compact title="Нет напоминаний" text="Ближайшие и просроченные аренды появятся здесь." />
          )}
        </div>
      </section>
    </>
  );
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={compact ? "empty-state compact-empty" : "empty-state"}>
      <Icon name="book" />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Icon({ name }: { name: "book" | "search" | "logout" | "cart" | "clock" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (name === "book") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M6.5 4.5h8.2A2.8 2.8 0 0 1 17.5 7.3V20H8.1A3.1 3.1 0 0 1 5 16.9V6a1.5 1.5 0 0 1 1.5-1.5Z" fill="currentColor" opacity=".22" />
        <path d="M7 4h8.2A2.8 2.8 0 0 1 18 6.8V20H8.2A3.2 3.2 0 0 1 5 16.8V6a2 2 0 0 1 2-2Zm0 0v12.6A1.4 1.4 0 0 0 8.4 18H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="m20 20-4.4-4.4m2.1-5.1a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M14 7V5.75C14 4.78 13.22 4 12.25 4h-5.5C5.78 4 5 4.78 5 5.75v12.5c0 .97.78 1.75 1.75 1.75h5.5c.97 0 1.75-.78 1.75-1.75V17M10 12h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 6h1.8l1.4 8.2a2 2 0 0 0 2 1.7h5.9a2 2 0 0 0 1.9-1.4L20 8H7.2M10 20h.01M17 20h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
