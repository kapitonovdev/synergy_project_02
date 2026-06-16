import { buyBook, login, logout, markReminderSent, register, rentBook, updateBook } from "../lib/actions";
import { getCurrentUser } from "../lib/auth";
import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

type SearchParams = {
  category?: string;
  author?: string;
  sort?: string;
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "доступна",
  RENTED: "в аренде",
  HIDDEN: "скрыта"
};

export default async function BookstorePage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  const category = searchParams.category ?? "all";
  const author = searchParams.author ?? "all";
  const sort = searchParams.sort ?? "title";
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

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Bookstore Practice</h1>
          <p>Каталог книг с пользовательским и административным интерфейсами на SQLite.</p>
        </div>
        {currentUser ? (
          <form action={logout} className="row">
            <strong>
              {currentUser.name} · {currentUser.role === "ADMIN" ? "Администратор" : "Пользователь"}
            </strong>
            <button className="btn secondary" type="submit">
              Выйти
            </button>
          </form>
        ) : null}
      </section>

      {!currentUser ? (
        <section className="auth-grid">
          <form action={login} className="panel form">
            <h2>Вход</h2>
            <input className="field" name="email" placeholder="Email" defaultValue="reader@example.com" />
            <input className="field" name="password" placeholder="Пароль" type="password" defaultValue="123456" />
            <button className="btn" type="submit">
              Войти
            </button>
            <p className="muted">Администратор: admin@example.com / 123456</p>
          </form>
          <form action={register} className="panel form">
            <h2>Регистрация</h2>
            <input className="field" name="name" placeholder="Имя" />
            <input className="field" name="email" placeholder="Email" />
            <input className="field" name="password" placeholder="Пароль от 6 символов" type="password" />
            <button className="btn secondary" type="submit">
              Создать пользователя
            </button>
          </form>
        </section>
      ) : (
        <>
          <form className="toolbar">
            <select className="field" name="category" defaultValue={category}>
              <option value="all">Все категории</option>
              {categories.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>
            <select className="field" name="author" defaultValue={author}>
              <option value="all">Все авторы</option>
              {authors.map((item) => (
                <option key={item.author} value={item.author}>
                  {item.author}
                </option>
              ))}
            </select>
            <select className="field" name="sort" defaultValue={sort}>
              <option value="title">Сортировка по названию</option>
              <option value="category">По категории</option>
              <option value="author">По автору</option>
              <option value="year">По году</option>
            </select>
            <button className="btn secondary" type="submit">
              Применить
            </button>
          </form>

          <section className="layout">
            <div className="catalog">
              {visibleBooks.map((book) => (
                <article className="book" key={book.id}>
                  <div>
                    <span className={`status ${book.status.toLowerCase()}`}>{statusLabels[book.status]}</span>
                    <h3>{book.title}</h3>
                    <p className="meta">
                      {book.author} · {book.category} · {book.year}
                    </p>
                  </div>
                  <strong>{book.price} руб.</strong>
                  <div className="row">
                    <form action={buyBook}>
                      <input name="bookId" type="hidden" value={book.id} />
                      <button className="btn" type="submit">
                        Купить
                      </button>
                    </form>
                    {[["14", "2 недели"], ["30", "1 месяц"], ["90", "3 месяца"]].map(([period, label]) => (
                      <form action={rentBook} key={period}>
                        <input name="bookId" type="hidden" value={book.id} />
                        <input name="period" type="hidden" value={period} />
                        <button className="btn secondary" type="submit">
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <aside className="panel">
              {currentUser.role === "ADMIN" ? (
                <>
                  <h2>Панель администратора</h2>
                  <div className="admin-list">
                    {books.map((book) => (
                      <form action={updateBook} className="admin-row" key={book.id}>
                        <input name="bookId" type="hidden" value={book.id} />
                        <strong>{book.title}</strong>
                        <input className="field" name="price" type="number" defaultValue={book.price} />
                        <select className="field" name="status" defaultValue={book.status}>
                          <option value="AVAILABLE">Доступна</option>
                          <option value="RENTED">В аренде</option>
                          <option value="HIDDEN">Скрыта</option>
                        </select>
                        <button className="btn secondary" type="submit">
                          Сохранить
                        </button>
                      </form>
                    ))}
                  </div>
                  <h2 style={{ marginTop: 18 }}>Напоминания</h2>
                  {reminders.length ? (
                    reminders.map((rental) => (
                      <form action={markReminderSent} className="reminder" key={rental.id}>
                        <input name="rentalId" type="hidden" value={rental.id} />
                        <strong>{rental.book.title}</strong>
                        <p className="muted">
                          {rental.user.name}: аренда до {rental.endsAt.toLocaleDateString("ru-RU")}
                        </p>
                        <button className="btn warning" type="submit">
                          Отметить как отправленное
                        </button>
                      </form>
                    ))
                  ) : (
                    <p className="muted">Нет активных напоминаний.</p>
                  )}
                </>
              ) : (
                <>
                  <h2>История операций</h2>
                  {[...purchases.map((item) => `Покупка: ${item.book.title}, ${item.price} руб.`), ...rentals.map((item) => `Аренда: ${item.book.title} до ${item.endsAt.toLocaleDateString("ru-RU")}`)].length ? (
                    [...purchases.map((item) => `Покупка: ${item.book.title}, ${item.price} руб.`), ...rentals.map((item) => `Аренда: ${item.book.title} до ${item.endsAt.toLocaleDateString("ru-RU")}`)].map((order) => (
                      <p className="reminder" key={order}>
                        {order}
                      </p>
                    ))
                  ) : (
                    <p className="muted">Оформите покупку или аренду, чтобы увидеть операцию.</p>
                  )}
                </>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
