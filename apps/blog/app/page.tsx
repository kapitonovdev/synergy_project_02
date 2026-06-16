import {
  addComment,
  createPost,
  deletePost,
  login,
  logout,
  register,
  requestAccess,
  reviewAccessRequest,
  toggleSubscription,
  updatePost
} from "../lib/actions";
import { getCurrentUser } from "../lib/auth";
import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

type SearchParams = {
  tag?: string;
};

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  const selectedTag = searchParams.tag ?? "all";
  const [users, posts, tags, subscriptions] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        tags: { include: { tag: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        accessRequests: { include: { requester: true }, orderBy: { createdAt: "asc" } }
      }
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    currentUser
      ? prisma.subscription.findMany({ where: { followerId: currentUser.id } })
      : Promise.resolve([])
  ]);
  const followingIds = new Set(subscriptions.map((item) => item.followingId));

  const filteredPosts = posts.filter((post) => {
    return selectedTag === "all" || post.tags.some((item) => item.tag.name === selectedTag);
  });
  const feed = filteredPosts.filter((post) => followingIds.has(post.authorId) && canReadPost(post, currentUser?.id));

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brand">
          <h1>Practice Blog</h1>
          <p>Регистрация, вход, посты, подписки, теги, комментарии и заявки доступа.</p>
        </div>
        {currentUser ? (
          <form action={logout} className="user-switcher">
            <span>{currentUser.name}</span>
            <button className="btn secondary" type="submit">
              Выйти
            </button>
          </form>
        ) : null}
      </section>

      {!currentUser ? (
        <section className="auth-grid">
          <form action={login} className="panel stack">
            <h2>Вход</h2>
            <input className="field" name="email" placeholder="Email" defaultValue="pavel@example.com" />
            <input className="field" name="password" placeholder="Пароль" type="password" defaultValue="123456" />
            <button className="btn" type="submit">
              Войти
            </button>
          </form>
          <form action={register} className="panel stack">
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
        <section className="grid">
          <aside className="panel">
            <h2>Пользователи</h2>
            {users
              .filter((user) => user.id !== currentUser.id)
              .map((user) => (
                <form action={toggleSubscription} className="profile-row" key={user.id}>
                  <input name="followingId" type="hidden" value={user.id} />
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button className={followingIds.has(user.id) ? "btn secondary" : "btn"} type="submit">
                    {followingIds.has(user.id) ? "Отписаться" : "Подписаться"}
                  </button>
                </form>
              ))}
          </aside>

          <section>
            <form action={createPost} className="composer">
              <h2>Новый пост</h2>
              <div className="form-grid">
                <input className="field" name="title" placeholder="Заголовок" />
                <textarea className="textarea" name="body" placeholder="Текст публикации" />
                <div className="row">
                  <select className="field" name="visibility" defaultValue="PUBLIC">
                    <option value="PUBLIC">Публичный пост</option>
                    <option value="REQUEST_ONLY">Только по запросу</option>
                  </select>
                  <input className="field" name="tags" placeholder="Теги через запятую" />
                  <button className="btn" type="submit">
                    Опубликовать
                  </button>
                </div>
              </div>
            </form>

            <div className="row" style={{ marginBottom: 14 }}>
              <a className={selectedTag === "all" ? "btn" : "btn secondary"} href="/">
                Все теги
              </a>
              {tags.map((tag) => (
                <a
                  className={selectedTag === tag.name ? "btn" : "btn secondary"}
                  href={`/?tag=${encodeURIComponent(tag.name)}`}
                  key={tag.id}
                >
                  {tag.name}
                </a>
              ))}
            </div>

            {filteredPosts.map((post) => (
              <article className="post" key={post.id}>
                <header>
                  <div>
                    <h3>{post.title}</h3>
                    <div className="meta">
                      {post.author.name} · {post.visibility === "PUBLIC" ? "публичный" : "только по запросу"}
                    </div>
                  </div>
                  {post.authorId === currentUser.id ? (
                    <form action={deletePost}>
                      <input name="postId" type="hidden" value={post.id} />
                      <button className="btn danger" type="submit">
                        Удалить
                      </button>
                    </form>
                  ) : null}
                </header>

                {canReadPost(post, currentUser.id) ? (
                  <>
                    <p>{post.body}</p>
                    <div className="tags">
                      {post.tags.map((item) => (
                        <span className="tag" key={item.tagId}>
                          {item.tag.name}
                        </span>
                      ))}
                    </div>

                    {post.authorId === currentUser.id ? (
                      <form action={updatePost} className="edit-box">
                        <input name="postId" type="hidden" value={post.id} />
                        <input className="field" name="title" defaultValue={post.title} />
                        <textarea className="textarea" name="body" defaultValue={post.body} />
                        <div className="row">
                          <select className="field" name="visibility" defaultValue={post.visibility}>
                            <option value="PUBLIC">Публичный пост</option>
                            <option value="REQUEST_ONLY">Только по запросу</option>
                          </select>
                          <input className="field" name="tags" defaultValue={post.tags.map((item) => item.tag.name).join(", ")} />
                          <button className="btn secondary" type="submit">
                            Сохранить
                          </button>
                        </div>
                      </form>
                    ) : null}

                    <section className="comments">
                      <strong>Комментарии</strong>
                      {post.comments.map((item) => (
                        <div className="comment" key={item.id}>
                          <div className="meta">{item.author.name}</div>
                          {item.text}
                        </div>
                      ))}
                      <form action={addComment} className="row" style={{ marginTop: 10 }}>
                        <input name="postId" type="hidden" value={post.id} />
                        <input className="field" name="text" placeholder="Добавить комментарий" />
                        <button className="btn secondary" type="submit">
                          Добавить
                        </button>
                      </form>
                    </section>
                  </>
                ) : (
                  <form action={requestAccess} className="access-box">
                    <p className="muted">Пост скрыт. Отправьте запрос автору, чтобы прочитать полный текст.</p>
                    <input name="postId" type="hidden" value={post.id} />
                    <button className="btn secondary" type="submit">
                      Запросить доступ
                    </button>
                  </form>
                )}

                {post.authorId === currentUser.id && post.accessRequests.length ? (
                  <section className="comments">
                    <strong>Заявки доступа</strong>
                    {post.accessRequests.map((request) => (
                      <form action={reviewAccessRequest} className="request-row" key={request.id}>
                        <input name="requestId" type="hidden" value={request.id} />
                        <span>
                          {request.requester.name}: {request.status.toLowerCase()}
                        </span>
                        <button className="btn secondary" name="decision" type="submit" value="APPROVED">
                          Одобрить
                        </button>
                        <button className="btn danger" name="decision" type="submit" value="REJECTED">
                          Отклонить
                        </button>
                      </form>
                    ))}
                  </section>
                ) : null}
              </article>
            ))}
          </section>

          <aside className="panel">
            <h2>Лента подписок</h2>
            <div className="stack">
              {feed.length ? (
                feed.map((post) => (
                  <article key={post.id}>
                    <strong>{post.title}</strong>
                    <div className="meta">{post.author.name}</div>
                  </article>
                ))
              ) : (
                <p className="muted">Подпишитесь на автора, чтобы собрать персональную ленту.</p>
              )}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

function canReadPost(
  post: {
    visibility: string;
    authorId: number;
    accessRequests: { requesterId: number; status: string }[];
  },
  userId?: number
) {
  if (post.visibility === "PUBLIC") return true;
  if (!userId) return false;
  if (post.authorId === userId) return true;
  return post.accessRequests.some((request) => request.requesterId === userId && request.status === "APPROVED");
}
