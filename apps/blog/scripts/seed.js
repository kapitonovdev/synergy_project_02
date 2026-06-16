const { PrismaClient } = require("../lib/generated/prisma");
const { createHash } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password, salt = "practice-salt") {
  return `${salt}:${createHash("sha256").update(`${salt}:${password}`).digest("hex")}`;
}

async function main() {
  await prisma.accessRequest.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const pavel = await prisma.user.create({
    data: { name: "Павел Капитонов", email: "pavel@example.com", passwordHash: hashPassword("123456") }
  });
  const anna = await prisma.user.create({
    data: { name: "Анна Иванова", email: "anna@example.com", passwordHash: hashPassword("123456") }
  });
  const ilya = await prisma.user.create({
    data: { name: "Илья Смирнов", email: "ilya@example.com", passwordHash: hashPassword("123456") }
  });

  await prisma.subscription.createMany({
    data: [
      { followerId: pavel.id, followingId: anna.id },
      { followerId: anna.id, followingId: pavel.id },
      { followerId: ilya.id, followingId: pavel.id }
    ]
  });

  const publicPost = await prisma.post.create({
    data: {
      authorId: pavel.id,
      title: "Архитектура учебного блога",
      body: "Реализованы пользователи, теги, лента подписок, комментарии и разные уровни видимости постов.",
      visibility: "PUBLIC",
      tags: {
        create: ["nextjs", "prisma", "practice"].map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } }
        }))
      }
    }
  });
  const requestPost = await prisma.post.create({
    data: {
      authorId: anna.id,
      title: "Скрытый пост только по запросу",
      body: "Такие публикации доступны после одобрения автором заявки на чтение.",
      visibility: "REQUEST_ONLY",
      tags: {
        create: ["privacy", "blog"].map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } }
        }))
      }
    }
  });

  await prisma.comment.create({ data: { postId: publicPost.id, authorId: anna.id, text: "Структура понятная, можно подключать постоянное хранение." } });
  await prisma.accessRequest.create({ data: { postId: requestPost.id, requesterId: pavel.id, status: "PENDING" } });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
