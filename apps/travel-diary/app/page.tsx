import { createTrip, login, logout, register } from "../lib/actions";
import { getCurrentUser } from "../lib/auth";
import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

type SearchParams = {
  scope?: string;
};

export default async function TravelDiaryPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  const scope = searchParams.scope ?? "all";
  const trips = currentUser
    ? await prisma.trip.findMany({
        where: scope === "mine" ? { authorId: currentUser.id } : undefined,
        include: { author: true, places: true },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Travel Diary Practice</h1>
          <p>Дневник путешествий с регистрацией, SQLite, изображениями, стоимостью и местами для посещения.</p>
        </div>
        {currentUser ? (
          <form action={logout} className="row">
            <strong>{currentUser.name}</strong>
            <a className={scope === "all" ? "btn" : "btn secondary"} href="/">
              Все путешествия
            </a>
            <a className={scope === "mine" ? "btn" : "btn secondary"} href="/?scope=mine">
              Мои записи
            </a>
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
            <input className="field" name="email" placeholder="Email" defaultValue="pavel@example.com" />
            <input className="field" name="password" placeholder="Пароль" type="password" defaultValue="123456" />
            <button className="btn" type="submit">
              Войти
            </button>
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
        <section className="layout">
          <aside className="panel">
            <h2>Новая запись</h2>
            <form action={createTrip} className="form">
              <input className="field" name="title" placeholder="Название путешествия" />
              <input className="field" name="location" placeholder="Местоположение" />
              <input className="field" name="imageLabel" placeholder="Описание изображения" />
              <input className="field" name="imageUrl" placeholder="URL изображения" />
              <input className="field" name="cost" placeholder="Стоимость путешествия" type="number" />
              <input className="field" name="safetyScore" placeholder="Оценка безопасности от 1 до 10" type="number" min="1" max="10" defaultValue="8" />
              <input className="field" name="places" placeholder="Места для посещения через запятую" />
              <textarea className="textarea" name="body" placeholder="Описание маршрута" />
              <button className="btn" type="submit">
                Добавить путешествие
              </button>
            </form>
          </aside>

          <section className="feed">
            {trips.map((trip) => (
              <article className="trip" key={trip.id}>
                {trip.imageUrl ? (
                  <img className="trip-image" src={trip.imageUrl} alt={trip.imageLabel} />
                ) : (
                  <div className="image">
                    <span>{trip.imageLabel}</span>
                    <span>{trip.location}</span>
                  </div>
                )}
                <div className="trip-body">
                  <h3>{trip.title}</h3>
                  <p className="meta">
                    Автор: {trip.author.name} · {trip.location}
                  </p>
                  <p>{trip.body}</p>
                  <div className="facts">
                    <div className="fact">
                      <strong>{trip.cost.toLocaleString("ru-RU")} руб.</strong>
                      <span className="muted">Стоимость</span>
                    </div>
                    <div className="fact">
                      <strong>{trip.safetyScore}/10</strong>
                      <span className="muted">Безопасность</span>
                    </div>
                    <div className="fact">
                      <strong>{trip.places.length}</strong>
                      <span className="muted">Мест в маршруте</span>
                    </div>
                  </div>
                  <div className="places">
                    {trip.places.map((place) => (
                      <span className="place" key={place.id}>
                        {place.name}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </section>
      )}
    </main>
  );
}
