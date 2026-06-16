const { PrismaClient } = require("../lib/generated/prisma");
const { createHash } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password, salt = "practice-salt") {
  return `${salt}:${createHash("sha256").update(`${salt}:${password}`).digest("hex")}`;
}

async function main() {
  await prisma.place.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  const pavel = await prisma.user.create({
    data: { name: "Павел Капитонов", email: "pavel@example.com", passwordHash: hashPassword("123456") }
  });
  const maria = await prisma.user.create({
    data: { name: "Мария Орлова", email: "maria@example.com", passwordHash: hashPassword("123456") }
  });
  const dmitry = await prisma.user.create({
    data: { name: "Дмитрий Волков", email: "dmitry@example.com", passwordHash: hashPassword("123456") }
  });

  await prisma.trip.create({
    data: {
      authorId: pavel.id,
      title: "Казань за три дня",
      location: "Казань, Республика Татарстан",
      imageLabel: "Кремль и набережная",
      imageUrl: "https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=1200&q=80",
      cost: 28500,
      safetyScore: 9,
      body: "Маршрут подходит для короткого городского путешествия: много пеших зон, удобный транспорт и насыщенная культурная программа.",
      places: { create: ["Казанский Кремль", "Баумана", "Центр семьи Казан"].map((name) => ({ name })) }
    }
  });

  await prisma.trip.create({
    data: {
      authorId: maria.id,
      title: "Выходные в Санкт-Петербурге",
      location: "Санкт-Петербург",
      imageLabel: "Невский и каналы",
      imageUrl: "",
      cost: 34100,
      safetyScore: 8,
      body: "Запись содержит рекомендации по перемещению, стоимости проживания и местам, которые стоит бронировать заранее.",
      places: { create: ["Эрмитаж", "Новая Голландия", "Исаакиевский собор"].map((name) => ({ name })) }
    }
  });

  await prisma.trip.create({
    data: {
      authorId: dmitry.id,
      title: "Поездка в Сочи",
      location: "Сочи, Краснодарский край",
      imageLabel: "Море и горы",
      imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      cost: 46200,
      safetyScore: 8,
      body: "Маршрут совмещает прогулки у моря, подъем в горы и спокойный темп передвижения между районами.",
      places: { create: ["Дендрарий", "Роза Хутор", "Морской вокзал"].map((name) => ({ name })) }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
