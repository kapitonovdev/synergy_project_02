"use client";

import { FormEvent, useMemo, useState } from "react";

type User = {
  id: number;
  name: string;
};

type Trip = {
  id: number;
  userId: number;
  title: string;
  location: string;
  imageLabel: string;
  cost: number;
  safety: number;
  places: string[];
  body: string;
};

const users: User[] = [
  { id: 1, name: "Павел Капитонов" },
  { id: 2, name: "Мария Орлова" },
  { id: 3, name: "Дмитрий Волков" }
];

const initialTrips: Trip[] = [
  {
    id: 1,
    userId: 1,
    title: "Казань за три дня",
    location: "Казань, Республика Татарстан",
    imageLabel: "Кремль и набережная",
    cost: 28500,
    safety: 9,
    places: ["Казанский Кремль", "Баумана", "Центр семьи Казан"],
    body: "Маршрут подходит для короткого городского путешествия: много пеших зон, удобный транспорт и насыщенная культурная программа."
  },
  {
    id: 2,
    userId: 2,
    title: "Выходные в Санкт-Петербурге",
    location: "Санкт-Петербург",
    imageLabel: "Невский и каналы",
    cost: 34100,
    safety: 8,
    places: ["Эрмитаж", "Новая Голландия", "Исаакиевский собор"],
    body: "Запись содержит рекомендации по перемещению, стоимости проживания и местам, которые стоит бронировать заранее."
  }
];

const emptyDraft = {
  title: "",
  location: "",
  imageLabel: "",
  cost: "",
  safety: "8",
  places: "",
  body: ""
};

export default function TravelDiaryPage() {
  const [currentUserId, setCurrentUserId] = useState(1);
  const [trips, setTrips] = useState(initialTrips);
  const [draft, setDraft] = useState(emptyDraft);
  const [scope, setScope] = useState("all");
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];

  const visibleTrips = useMemo(() => {
    return trips.filter((trip) => scope === "all" || trip.userId === currentUser.id);
  }, [currentUser.id, scope, trips]);

  function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.location.trim() || !draft.body.trim()) {
      return;
    }
    setTrips((items) => [
      {
        id: Date.now(),
        userId: currentUser.id,
        title: draft.title.trim(),
        location: draft.location.trim(),
        imageLabel: draft.imageLabel.trim() || "Фото путешествия",
        cost: Number(draft.cost) || 0,
        safety: Number(draft.safety) || 0,
        places: draft.places
          .split(",")
          .map((place) => place.trim())
          .filter(Boolean),
        body: draft.body.trim()
      },
      ...items
    ]);
    setDraft(emptyDraft);
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Travel Diary Practice</h1>
          <p>Дневник путешествий с записями пользователей, изображениями, стоимостью и местами для посещения.</p>
        </div>
        <div className="row">
          <select className="field" value={currentUserId} onChange={(event) => setCurrentUserId(Number(event.target.value))}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select className="field" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">Все путешествия</option>
            <option value="mine">Мои записи</option>
          </select>
        </div>
      </section>

      <section className="layout">
        <aside className="panel">
          <h2>Новая запись</h2>
          <form className="form" onSubmit={createTrip}>
            <input
              className="field"
              placeholder="Название путешествия"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <input
              className="field"
              placeholder="Местоположение"
              value={draft.location}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            />
            <input
              className="field"
              placeholder="Описание изображения"
              value={draft.imageLabel}
              onChange={(event) => setDraft({ ...draft, imageLabel: event.target.value })}
            />
            <input
              className="field"
              placeholder="Стоимость путешествия"
              type="number"
              value={draft.cost}
              onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
            />
            <input
              className="field"
              placeholder="Оценка безопасности от 1 до 10"
              type="number"
              min="1"
              max="10"
              value={draft.safety}
              onChange={(event) => setDraft({ ...draft, safety: event.target.value })}
            />
            <input
              className="field"
              placeholder="Места для посещения через запятую"
              value={draft.places}
              onChange={(event) => setDraft({ ...draft, places: event.target.value })}
            />
            <textarea
              className="textarea"
              placeholder="Описание маршрута"
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            />
            <button className="btn" type="submit">
              Добавить путешествие
            </button>
          </form>
        </aside>

        <section className="feed">
          {visibleTrips.map((trip) => (
            <article className="trip" key={trip.id}>
              <div className="image">
                <span>{trip.imageLabel}</span>
                <span>{trip.location}</span>
              </div>
              <div className="trip-body">
                <h3>{trip.title}</h3>
                <p className="meta">
                  Автор: {users.find((user) => user.id === trip.userId)?.name} · {trip.location}
                </p>
                <p>{trip.body}</p>
                <div className="facts">
                  <div className="fact">
                    <strong>{trip.cost.toLocaleString("ru-RU")} руб.</strong>
                    <span className="muted">Стоимость</span>
                  </div>
                  <div className="fact">
                    <strong>{trip.safety}/10</strong>
                    <span className="muted">Безопасность</span>
                  </div>
                  <div className="fact">
                    <strong>{trip.places.length}</strong>
                    <span className="muted">Мест в маршруте</span>
                  </div>
                </div>
                <div className="places">
                  {trip.places.map((place) => (
                    <span className="place" key={place}>
                      {place}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
