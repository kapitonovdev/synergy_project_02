const { PrismaClient } = require("../lib/generated/prisma");
const { createHash } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password, salt = "practice-salt") {
  return `${salt}:${createHash("sha256").update(`${salt}:${password}`).digest("hex")}`;
}

async function main() {
  await prisma.purchase.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Администратор", email: "admin@example.com", role: "ADMIN", passwordHash: hashPassword("123456") }
  });
  const reader = await prisma.user.create({
    data: { name: "Павел Капитонов", email: "reader@example.com", role: "USER", passwordHash: hashPassword("123456") }
  });

  const books = await Promise.all([
    prisma.book.create({ data: { title: "Чистый код", author: "Роберт Мартин", category: "Разработка", year: 2008, price: 740, status: "AVAILABLE" } }),
    prisma.book.create({ data: { title: "JavaScript. Подробное руководство", author: "Дэвид Флэнаган", category: "Разработка", year: 2020, price: 920, status: "AVAILABLE" } }),
    prisma.book.create({ data: { title: "Грокаем алгоритмы", author: "Адитья Бхаргава", category: "Алгоритмы", year: 2016, price: 620, status: "RENTED" } }),
    prisma.book.create({ data: { title: "Дизайн привычных вещей", author: "Дон Норман", category: "UX", year: 2013, price: 680, status: "AVAILABLE" } }),
    prisma.book.create({ data: { title: "Предметно-ориентированное проектирование", author: "Эрик Эванс", category: "Архитектура", year: 2003, price: 1050, status: "HIDDEN" } })
  ]);

  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  await prisma.rental.create({ data: { userId: reader.id, bookId: books[2].id, endsAt: soon, reminded: false } });
  await prisma.purchase.create({ data: { userId: reader.id, bookId: books[0].id, price: books[0].price } });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
