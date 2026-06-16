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
  q?: string;
};

type PostWithRelations = Awaited<ReturnType<typeof loadPosts>>[number];

async function loadPosts() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: true,
      tags: { include: { tag: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      accessRequests: { include: { requester: true }, orderBy: { createdAt: "asc" } }
    }
  });
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  const selectedTag = searchParams.tag ?? "all";
  const query = (searchParams.q ?? "").trim().toLowerCase();

  const [users, posts, tags, subscriptions, followersCount] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    loadPosts(),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    currentUser ? prisma.subscription.findMany({ where: { followerId: currentUser.id } }) : Promise.resolve([]),
    currentUser ? prisma.subscription.count({ where: { followingId: currentUser.id } }) : Promise.resolve(0)
  ]);

  const followingIds = new Set(subscriptions.map((item) => item.followingId));
  const ownPostsCount = currentUser ? posts.filter((post) => post.authorId === currentUser.id).length : 0;
  const pendingRequests = currentUser
    ? posts.flatMap((post) =>
        post.authorId === currentUser.id
          ? post.accessRequests.map((request) => ({ ...request, postTitle: post.title }))
          : []
      )
    : [];

  const filteredPosts = posts.filter((post) => {
    const tagMatches = selectedTag === "all" || post.tags.some((item) => item.tag.name === selectedTag);
    if (!tagMatches) return false;
    if (!query) return true;
    const searchable = [
      post.title,
      post.author.name,
      ...post.tags.map((item) => item.tag.name),
      canReadPost(post, currentUser?.id) ? post.body : ""
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query);
  });

  const feed = filteredPosts.filter((post) => followingIds.has(post.authorId) && canReadPost(post, currentUser?.id));

  return (
    <main className="shell">
      <header className="appbar">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="bookmark" />
        </div>
        <div className="brand">
          <h1>Practice Blog</h1>
          <p>Учебный блог с подписками, комментариями и доступом по заявке</p>
        </div>

        {currentUser ? (
          <form className="global-search" action="/" method="get">
            <Icon name="search" />
            <input name="q" placeholder="Поиск по постам, тегам и авторам..." defaultValue={searchParams.q ?? ""} />
            {selectedTag !== "all" ? <input name="tag" type="hidden" value={selectedTag} /> : null}
          </form>
        ) : null}

        {currentUser ? (
          <form action={logout} className="account">
            <span className="avatar">{initials(currentUser.name)}</span>
            <span className="account-name">{currentUser.name}</span>
            <button className="icon-btn" type="submit" aria-label="Выйти">
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
            <section className="panel">
              <div className="section-heading">
                <h2>Пользователи</h2>
                <span>{users.length}</span>
              </div>
              <div className="user-list">
                {users
                  .filter((user) => user.id !== currentUser.id)
                  .map((user) => (
                    <form action={toggleSubscription} className="user-row" key={user.id}>
                      <input name="followingId" type="hidden" value={user.id} />
                      <span className="avatar avatar-small">{initials(user.name)}</span>
                      <span className="user-meta">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </span>
                      <button className={followingIds.has(user.id) ? "btn subtle" : "btn compact"} type="submit">
                        {followingIds.has(user.id) ? "Отписаться" : "Подписаться"}
                      </button>
                    </form>
                  ))}
              </div>
            </section>

            <section className="panel about-panel">
              <Icon name="bookmark" />
              <h2>О проекте</h2>
              <p>
                Учебное приложение блога для практики. Пишите посты, подписывайтесь на авторов и управляйте доступом к
                закрытым материалам.
              </p>
            </section>
          </aside>

          <section className="content">
            <form action={createPost} className="composer">
              <div className="composer-head">
                <div>
                  <h2>Новый пост</h2>
                  <p>Опубликуйте материал или ограничьте доступ по заявке</p>
                </div>
                <button className="btn primary" type="submit">
                  <Icon name="send" />
                  Опубликовать
                </button>
              </div>
              <div className="composer-grid">
                <label className="field-block title-field">
                  <span>Заголовок</span>
                  <input className="field" name="title" placeholder="Введите заголовок поста..." required minLength={3} />
                </label>
                <label className="field-block visibility-field">
                  <span>Видимость</span>
                  <select className="field" name="visibility" defaultValue="PUBLIC">
                    <option value="PUBLIC">Публичный</option>
                    <option value="REQUEST_ONLY">Только по запросу</option>
                  </select>
                </label>
                <label className="field-block wide">
                  <span>Текст поста</span>
                  <textarea className="textarea" name="body" placeholder="Напишите текст поста..." required minLength={5} />
                </label>
                <label className="field-block tags-field">
                  <span>Теги</span>
                  <input className="field" name="tags" placeholder="nextjs, prisma, практика" />
                </label>
                <p className="form-hint">Теги разделяются запятыми. Закрытые посты видны автору и одобренным читателям.</p>
              </div>
            </form>

            <nav className="tagbar" aria-label="Фильтр по тегам">
              <a className={selectedTag === "all" ? "chip selected" : "chip"} href={query ? `/?q=${encodeURIComponent(query)}` : "/"}>
                Все теги
              </a>
              {tags.length ? (
                tags.map((tag) => {
                  const href = `/?tag=${encodeURIComponent(tag.name)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
                  return (
                    <a className={selectedTag === tag.name ? "chip selected" : "chip"} href={href} key={tag.id}>
                      {tag.name}
                    </a>
                  );
                })
              ) : (
                <span className="empty-inline">Теги появятся после публикации постов</span>
              )}
            </nav>

            <div className="feed-stack">
              {filteredPosts.length ? (
                filteredPosts.map((post) => <PostCard currentUserId={currentUser.id} post={post} key={post.id} />)
              ) : (
                <EmptyState title="Посты не найдены" text="Измените поисковый запрос или создайте первую публикацию." />
              )}
            </div>
          </section>

          <aside className="rail rail-right">
            <section className="panel">
              <div className="section-heading">
                <h2>Лента подписок</h2>
                <span>{feed.length}</span>
              </div>
              <div className="mini-feed">
                {feed.length ? (
                  feed.slice(0, 4).map((post) => (
                    <article className="mini-post" key={post.id}>
                      <span className="avatar avatar-small">{initials(post.author.name)}</span>
                      <div>
                        <strong>{post.author.name}</strong>
                        <p>{post.title}</p>
                        <StatusPill post={post} userId={currentUser.id} />
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState compact title="Лента пуста" text="Подпишитесь на автора, чтобы собрать персональную ленту." />
                )}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Заявки доступа</h2>
                <span>{pendingRequests.length}</span>
              </div>
              <div className="request-list">
                {pendingRequests.length ? (
                  pendingRequests.slice(0, 5).map((request) => (
                    <form action={reviewAccessRequest} className="access-request-row" key={request.id}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <span className="avatar avatar-small">{initials(request.requester.name)}</span>
                      <span className="request-meta">
                        <strong>{request.requester.name}</strong>
                        <span>{request.postTitle}</span>
                        <StatusText status={request.status} />
                      </span>
                      <span className="request-actions">
                        <button className="decision approve" name="decision" type="submit" value="APPROVED" aria-label="Одобрить">
                          <Icon name="check" />
                        </button>
                        <button className="decision reject" name="decision" type="submit" value="REJECTED" aria-label="Отклонить">
                          <Icon name="x" />
                        </button>
                      </span>
                    </form>
                  ))
                ) : (
                  <EmptyState compact title="Нет заявок" text="Новые запросы к закрытым постам появятся здесь." />
                )}
              </div>
            </section>

            <section className="panel stats-panel">
              <h2>Статистика</h2>
              <dl>
                <div>
                  <dt>Мои посты</dt>
                  <dd>{ownPostsCount}</dd>
                </div>
                <div>
                  <dt>Подписчики</dt>
                  <dd>{followersCount}</dd>
                </div>
                <div>
                  <dt>Подписки</dt>
                  <dd>{followingIds.size}</dd>
                </div>
              </dl>
            </section>
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
          <Icon name="bookmark" />
        </div>
        <h2>Practice Blog</h2>
        <p>Войдите или создайте пользователя, чтобы открыть посты, подписки, комментарии и заявки доступа.</p>
      </div>
      <div className="auth-grid">
        <form action={login} className="auth-card">
          <h2>Вход</h2>
          <label className="field-block">
            <span>Email</span>
            <input className="field" name="email" placeholder="Email" defaultValue="pavel@example.com" required />
          </label>
          <label className="field-block">
            <span>Пароль</span>
            <input className="field" name="password" placeholder="Пароль" type="password" defaultValue="123456" required />
          </label>
          <button className="btn primary full" type="submit">
            Войти
          </button>
          <p className="form-hint">Тестовые пользователи: pavel@example.com, anna@example.com, ilya@example.com.</p>
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

function PostCard({ post, currentUserId }: { post: PostWithRelations; currentUserId: number }) {
  const readable = canReadPost(post, currentUserId);
  const isOwnPost = post.authorId === currentUserId;
  const accessState = getAccessState(post, currentUserId);

  return (
    <article className={readable ? "post-card" : "post-card locked"}>
      <header className="post-head">
        <span className="avatar">{initials(post.author.name)}</span>
        <div>
          <strong>{post.author.name}</strong>
          <span>{formatDate(post.createdAt)}</span>
        </div>
        <StatusPill post={post} userId={currentUserId} />
      </header>

      <div className="post-body">
        <h3>{post.title}</h3>
        {readable ? (
          <p>{post.body}</p>
        ) : (
          <div className="locked-box">
            <Icon name="lock" />
            <p>Пост скрыт. Отправьте запрос автору, чтобы прочитать полный текст.</p>
          </div>
        )}
      </div>

      <div className="tag-row">
        {post.tags.length ? (
          post.tags.map((item) => (
            <span className="tag" key={item.tagId}>
              {item.tag.name}
            </span>
          ))
        ) : (
          <span className="empty-inline">Без тегов</span>
        )}
      </div>

      {readable ? (
        <>
          {isOwnPost ? (
            <details className="edit-panel">
              <summary>Редактировать публикацию</summary>
              <form action={updatePost} className="edit-form">
                <input name="postId" type="hidden" value={post.id} />
                <label className="field-block">
                  <span>Заголовок</span>
                  <input className="field" name="title" defaultValue={post.title} required />
                </label>
                <label className="field-block">
                  <span>Текст</span>
                  <textarea className="textarea compact-textarea" name="body" defaultValue={post.body} required />
                </label>
                <div className="edit-row">
                  <select className="field" name="visibility" defaultValue={post.visibility}>
                    <option value="PUBLIC">Публичный</option>
                    <option value="REQUEST_ONLY">Только по запросу</option>
                  </select>
                  <input className="field" name="tags" defaultValue={post.tags.map((item) => item.tag.name).join(", ")} />
                  <button className="btn subtle" type="submit">
                    Сохранить
                  </button>
                  <button className="btn danger" formAction={deletePost} formNoValidate type="submit">
                    Удалить
                  </button>
                </div>
              </form>
            </details>
          ) : null}

          <section className="comments">
            <div className="comments-head">
              <strong>Комментарии ({post.comments.length})</strong>
            </div>
            <form action={addComment} className="comment-form">
              <input name="postId" type="hidden" value={post.id} />
              <input className="field" name="text" placeholder="Написать комментарий..." required />
              <button className="btn subtle" type="submit">
                Добавить
              </button>
            </form>
            <div className="comment-list">
              {post.comments.length ? (
                post.comments.map((item) => (
                  <div className="comment" key={item.id}>
                    <span className="avatar avatar-small">{initials(item.author.name)}</span>
                    <div>
                      <strong>{item.author.name}</strong>
                      <p>{item.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-inline">Комментариев пока нет</p>
              )}
            </div>
          </section>
        </>
      ) : (
        <form action={requestAccess} className="locked-actions">
          <input name="postId" type="hidden" value={post.id} />
          {accessState === "PENDING" ? <span className="status-note">Ожидает решения</span> : null}
          {accessState === "REJECTED" ? <span className="status-note rejected">Заявка отклонена, можно отправить повторно</span> : null}
          <button className="btn primary" type="submit">
            <Icon name="lock" />
            Запросить доступ
          </button>
        </form>
      )}

      {isOwnPost && post.accessRequests.length ? (
        <section className="inline-requests">
          <strong>Заявки к этому посту</strong>
          {post.accessRequests.map((request) => (
            <form action={reviewAccessRequest} className="inline-request-row" key={request.id}>
              <input name="requestId" type="hidden" value={request.id} />
              <span>{request.requester.name}</span>
              <StatusText status={request.status} />
              <button className="decision approve" name="decision" type="submit" value="APPROVED" aria-label="Одобрить">
                <Icon name="check" />
              </button>
              <button className="decision reject" name="decision" type="submit" value="REJECTED" aria-label="Отклонить">
                <Icon name="x" />
              </button>
            </form>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={compact ? "empty-state compact-empty" : "empty-state"}>
      <Icon name="bookmark" />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function StatusPill({ post, userId }: { post: PostWithRelations; userId: number }) {
  const state = getAccessState(post, userId);
  if (post.visibility === "PUBLIC") {
    return <span className="status-pill public">Публичный</span>;
  }
  if (state === "APPROVED") {
    return <span className="status-pill approved">Доступ одобрен</span>;
  }
  if (state === "PENDING") {
    return <span className="status-pill pending">Ожидает решения</span>;
  }
  return <span className="status-pill private">Только по запросу</span>;
}

function StatusText({ status }: { status: string }) {
  const label = status === "APPROVED" ? "Одобрено" : status === "REJECTED" ? "Отклонено" : "Ожидает решения";
  return <span className={`request-status ${status.toLowerCase()}`}>{label}</span>;
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

function getAccessState(
  post: {
    visibility: string;
    authorId: number;
    accessRequests: { requesterId: number; status: string }[];
  },
  userId?: number
) {
  if (post.visibility === "PUBLIC") return "PUBLIC";
  if (!userId) return "LOCKED";
  if (post.authorId === userId) return "APPROVED";
  return post.accessRequests.find((request) => request.requesterId === userId)?.status ?? "LOCKED";
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function Icon({ name }: { name: "bookmark" | "search" | "logout" | "send" | "lock" | "check" | "x" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (name === "bookmark") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M7 4.75C7 3.78 7.78 3 8.75 3h6.5C16.22 3 17 3.78 17 4.75V21l-5-3.25L7 21V4.75Z" fill="currentColor" />
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
  if (name === "send") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M20 4 9.5 14.5M20 4l-4.3 16-6.2-5.5L4 12l16-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M7 10V8a5 5 0 0 1 10 0v2M6.75 10h10.5c.97 0 1.75.78 1.75 1.75v6.5c0 .97-.78 1.75-1.75 1.75H6.75C5.78 20 5 19.22 5 18.25v-6.5C5 10.78 5.78 10 6.75 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="m5 12.5 4.2 4.2L19 6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
