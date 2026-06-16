"use client";

import { FormEvent, useMemo, useState } from "react";

type User = {
  id: number;
  name: string;
  role: string;
  subscriptions: number[];
};

type Post = {
  id: number;
  authorId: number;
  title: string;
  body: string;
  visibility: "public" | "request";
  tags: string[];
  comments: { id: number; authorId: number; text: string }[];
};

const initialUsers: User[] = [
  { id: 1, name: "Павел Капитонов", role: "Автор", subscriptions: [2] },
  { id: 2, name: "Анна Иванова", role: "Frontend", subscriptions: [1] },
  { id: 3, name: "Илья Смирнов", role: "Backend", subscriptions: [1, 2] }
];

const initialPosts: Post[] = [
  {
    id: 1,
    authorId: 1,
    title: "Архитектура учебного блога",
    body: "Реализованы пользователи, теги, лента подписок, комментарии и разные уровни видимости постов.",
    visibility: "public",
    tags: ["nextjs", "prisma", "practice"],
    comments: [{ id: 1, authorId: 2, text: "Структура понятная, можно подключать постоянное хранение." }]
  },
  {
    id: 2,
    authorId: 2,
    title: "Скрытый пост только по запросу",
    body: "Такие публикации видны автору и используются для приватных заметок или ограниченного доступа.",
    visibility: "request",
    tags: ["privacy", "blog"],
    comments: []
  }
];

const emptyDraft = {
  title: "",
  body: "",
  visibility: "public" as Post["visibility"],
  tags: ""
};

export default function BlogPage() {
  const [users, setUsers] = useState(initialUsers);
  const [currentUserId, setCurrentUserId] = useState(1);
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState("all");

  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];
  const tags = useMemo(() => Array.from(new Set(posts.flatMap((post) => post.tags))).sort(), [posts]);
  const visiblePosts = useMemo(() => {
    return posts
      .filter((post) => post.visibility === "public" || post.authorId === currentUser.id)
      .filter((post) => selectedTag === "all" || post.tags.includes(selectedTag));
  }, [currentUser.id, posts, selectedTag]);
  const subscriptionFeed = visiblePosts.filter((post) => currentUser.subscriptions.includes(post.authorId));

  function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPost = {
      id: editingId ?? Date.now(),
      authorId: currentUser.id,
      title: draft.title.trim(),
      body: draft.body.trim(),
      visibility: draft.visibility,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      comments: editingId ? posts.find((post) => post.id === editingId)?.comments ?? [] : []
    };

    if (!nextPost.title || !nextPost.body) {
      return;
    }

    setPosts((items) => (editingId ? items.map((post) => (post.id === editingId ? nextPost : post)) : [nextPost, ...items]));
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function editPost(post: Post) {
    setEditingId(post.id);
    setDraft({
      title: post.title,
      body: post.body,
      visibility: post.visibility,
      tags: post.tags.join(", ")
    });
  }

  function removePost(postId: number) {
    setPosts((items) => items.filter((post) => post.id !== postId));
  }

  function toggleSubscription(targetUserId: number) {
    setUsers((items) =>
      items.map((user) => {
        if (user.id !== currentUser.id) return user;
        const hasSubscription = user.subscriptions.includes(targetUserId);
        return {
          ...user,
          subscriptions: hasSubscription
            ? user.subscriptions.filter((id) => id !== targetUserId)
            : [...user.subscriptions, targetUserId]
        };
      })
    );
  }

  function addComment(postId: number, text: string) {
    const value = text.trim();
    if (!value) return;
    setPosts((items) =>
      items.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, { id: Date.now(), authorId: currentUser.id, text: value }] }
          : post
      )
    );
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brand">
          <h1>Practice Blog</h1>
          <p>Посты, подписки, теги, комментарии и ограниченная видимость публикаций.</p>
        </div>
        <label className="user-switcher">
          Пользователь
          <select value={currentUserId} onChange={(event) => setCurrentUserId(Number(event.target.value))}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid">
        <aside className="panel">
          <h2>Пользователи</h2>
          {users
            .filter((user) => user.id !== currentUser.id)
            .map((user) => {
              const subscribed = currentUser.subscriptions.includes(user.id);
              return (
                <div className="profile-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.role}</span>
                  </div>
                  <button className={subscribed ? "btn secondary" : "btn"} onClick={() => toggleSubscription(user.id)}>
                    {subscribed ? "Отписаться" : "Подписаться"}
                  </button>
                </div>
              );
            })}
        </aside>

        <section>
          <form className="composer" onSubmit={savePost}>
            <h2>{editingId ? "Редактирование поста" : "Новый пост"}</h2>
            <div className="form-grid">
              <input
                className="field"
                placeholder="Заголовок"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
              <textarea
                className="textarea"
                placeholder="Текст публикации"
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
              <div className="row">
                <select
                  className="field"
                  value={draft.visibility}
                  onChange={(event) => setDraft({ ...draft, visibility: event.target.value as Post["visibility"] })}
                >
                  <option value="public">Публичный пост</option>
                  <option value="request">Только по запросу</option>
                </select>
                <input
                  className="field"
                  placeholder="Теги через запятую"
                  value={draft.tags}
                  onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                />
                <button className="btn" type="submit">
                  {editingId ? "Сохранить" : "Опубликовать"}
                </button>
              </div>
            </div>
          </form>

          <div className="row" style={{ marginBottom: 14 }}>
            <button className={selectedTag === "all" ? "btn" : "btn secondary"} onClick={() => setSelectedTag("all")}>
              Все теги
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                className={selectedTag === tag ? "btn" : "btn secondary"}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={users.find((user) => user.id === post.authorId)?.name ?? "Пользователь"}
              currentUser={currentUser}
              canManage={post.authorId === currentUser.id}
              onEdit={() => editPost(post)}
              onRemove={() => removePost(post.id)}
              onComment={(text) => addComment(post.id, text)}
              users={users}
            />
          ))}
        </section>

        <aside className="panel">
          <h2>Лента подписок</h2>
          <div className="stack">
            {subscriptionFeed.length ? (
              subscriptionFeed.map((post) => (
                <article key={post.id}>
                  <strong>{post.title}</strong>
                  <div className="meta">{users.find((user) => user.id === post.authorId)?.name}</div>
                </article>
              ))
            ) : (
              <p className="muted">Подпишитесь на автора, чтобы собрать персональную ленту.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function PostCard({
  post,
  author,
  currentUser,
  canManage,
  onEdit,
  onRemove,
  onComment,
  users
}: {
  post: Post;
  author: string;
  currentUser: User;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onComment: (text: string) => void;
  users: User[];
}) {
  const [comment, setComment] = useState("");

  return (
    <article className="post">
      <header>
        <div>
          <h3>{post.title}</h3>
          <div className="meta">
            {author} · {post.visibility === "public" ? "публичный" : "только по запросу"}
          </div>
        </div>
        {canManage && (
          <div className="row">
            <button className="btn secondary" onClick={onEdit}>
              Изменить
            </button>
            <button className="btn danger" onClick={onRemove}>
              Удалить
            </button>
          </div>
        )}
      </header>
      <p>{post.body}</p>
      <div className="tags">
        {post.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <section className="comments">
        <strong>Комментарии</strong>
        {post.comments.map((item) => (
          <div className="comment" key={item.id}>
            <div className="meta">{users.find((user) => user.id === item.authorId)?.name ?? currentUser.name}</div>
            {item.text}
          </div>
        ))}
        <form
          className="row"
          style={{ marginTop: 10 }}
          onSubmit={(event) => {
            event.preventDefault();
            onComment(comment);
            setComment("");
          }}
        >
          <input
            className="field"
            placeholder="Добавить комментарий"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <button className="btn secondary" type="submit">
            Добавить
          </button>
        </form>
      </section>
    </article>
  );
}
