"use client";

import { useMemo, useState } from "react";

type Role = "user" | "admin";
type Status = "available" | "rented" | "hidden";

type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  year: number;
  price: number;
  status: Status;
  rentedUntil?: string;
};

const initialBooks: Book[] = [
  { id: 1, title: "Чистый код", author: "Роберт Мартин", category: "Разработка", year: 2008, price: 740, status: "available" },
  { id: 2, title: "JavaScript. Подробное руководство", author: "Дэвид Флэнаган", category: "Разработка", year: 2020, price: 920, status: "available" },
  { id: 3, title: "Грокаем алгоритмы", author: "Адитья Бхаргава", category: "Алгоритмы", year: 2016, price: 620, status: "rented", rentedUntil: "2026-08-16" },
  { id: 4, title: "Дизайн привычных вещей", author: "Дон Норман", category: "UX", year: 2013, price: 680, status: "available" },
  { id: 5, title: "Предметно-ориентированное проектирование", author: "Эрик Эванс", category: "Архитектура", year: 2003, price: 1050, status: "hidden" }
];

const statusLabels: Record<Status, string> = {
  available: "доступна",
  rented: "в аренде",
  hidden: "скрыта"
};

export default function BookstorePage() {
  const [role, setRole] = useState<Role>("user");
  const [books, setBooks] = useState(initialBooks);
  const [category, setCategory] = useState("all");
  const [author, setAuthor] = useState("all");
  const [sort, setSort] = useState("title");
  const [orders, setOrders] = useState<string[]>([]);

  const categories = useMemo(() => Array.from(new Set(books.map((book) => book.category))).sort(), [books]);
  const authors = useMemo(() => Array.from(new Set(books.map((book) => book.author))).sort(), [books]);
  const visibleBooks = useMemo(() => {
    return books
      .filter((book) => role === "admin" || book.status !== "hidden")
      .filter((book) => category === "all" || book.category === category)
      .filter((book) => author === "all" || book.author === author)
      .sort((a, b) => {
        if (sort === "year") return b.year - a.year;
        if (sort === "category") return a.category.localeCompare(b.category, "ru");
        if (sort === "author") return a.author.localeCompare(b.author, "ru");
        return a.title.localeCompare(b.title, "ru");
      });
  }, [author, books, category, role, sort]);

  const reminders = books.filter((book) => book.status === "rented" && book.rentedUntil);

  function rentBook(bookId: number, months: number) {
    const days = months === 0 ? 14 : months * 30;
    const due = new Date("2026-08-08");
    due.setDate(due.getDate() + days);
    setBooks((items) =>
      items.map((book) =>
        book.id === bookId ? { ...book, status: "rented", rentedUntil: due.toISOString().slice(0, 10) } : book
      )
    );
    setOrders((items) => [`Аренда оформлена до ${due.toLocaleDateString("ru-RU")}`, ...items]);
  }

  function buyBook(book: Book) {
    setOrders((items) => [`Покупка: ${book.title}, ${book.price} руб.`, ...items]);
  }

  function updateBook(bookId: number, patch: Partial<Book>) {
    setBooks((items) => items.map((book) => (book.id === bookId ? { ...book, ...patch } : book)));
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Bookstore Practice</h1>
          <p>Каталог книг с пользовательским и административным интерфейсами.</p>
        </div>
        <label className="row">
          Роль
          <select className="field" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        </label>
      </section>

      <section className="toolbar">
        <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="field" value={author} onChange={(event) => setAuthor(event.target.value)}>
          <option value="all">Все авторы</option>
          {authors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="field" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="title">Сортировка по названию</option>
          <option value="category">По категории</option>
          <option value="author">По автору</option>
          <option value="year">По году</option>
        </select>
      </section>

      <section className="layout">
        <div className="catalog">
          {visibleBooks.map((book) => (
            <article className="book" key={book.id}>
              <div>
                <span className={`status ${book.status}`}>{statusLabels[book.status]}</span>
                <h3>{book.title}</h3>
                <p className="meta">
                  {book.author} · {book.category} · {book.year}
                </p>
              </div>
              <strong>{book.price} руб.</strong>
              {book.rentedUntil && <p className="muted">Аренда до {new Date(book.rentedUntil).toLocaleDateString("ru-RU")}</p>}
              <div className="row">
                <button className="btn" onClick={() => buyBook(book)}>
                  Купить
                </button>
                <button className="btn secondary" onClick={() => rentBook(book.id, 0)}>
                  2 недели
                </button>
                <button className="btn secondary" onClick={() => rentBook(book.id, 1)}>
                  1 месяц
                </button>
                <button className="btn secondary" onClick={() => rentBook(book.id, 3)}>
                  3 месяца
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="panel">
          {role === "admin" ? (
            <>
              <h2>Панель администратора</h2>
              <div className="admin-list">
                {books.map((book) => (
                  <div className="admin-row" key={book.id}>
                    <strong>{book.title}</strong>
                    <input
                      className="field"
                      type="number"
                      value={book.price}
                      onChange={(event) => updateBook(book.id, { price: Number(event.target.value) })}
                    />
                    <select
                      className="field"
                      value={book.status}
                      onChange={(event) => updateBook(book.id, { status: event.target.value as Status })}
                    >
                      <option value="available">Доступна</option>
                      <option value="rented">В аренде</option>
                      <option value="hidden">Скрыта</option>
                    </select>
                  </div>
                ))}
              </div>
              <h2 style={{ marginTop: 18 }}>Напоминания</h2>
              {reminders.map((book) => (
                <div className="reminder" key={book.id}>
                  <strong>{book.title}</strong>
                  <p className="muted">Напомнить пользователю об окончании аренды: {book.rentedUntil}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              <h2>История операций</h2>
              {orders.length ? (
                orders.map((order) => (
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
    </main>
  );
}
