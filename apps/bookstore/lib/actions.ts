"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, hashPassword, requireAdmin, requireUser, setSession, verifyPassword } from "./auth";
import { prisma } from "./db";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function register(formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  if (!name || !email || password.length < 6) return;

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password), role: "USER" }
  });
  setSession(user.id);
  redirect("/");
}

export async function login(formData: FormData) {
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) return;

  setSession(user.id);
  redirect("/");
}

export async function logout() {
  clearSession();
  redirect("/");
}

export async function buyBook(formData: FormData) {
  const user = await requireUser();
  const bookId = Number(formData.get("bookId"));
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.status === "HIDDEN") return;

  await prisma.purchase.create({ data: { userId: user.id, bookId: book.id, price: book.price } });
  revalidatePath("/");
}

export async function rentBook(formData: FormData) {
  const user = await requireUser();
  const bookId = Number(formData.get("bookId"));
  const period = stringValue(formData, "period");
  const days = period === "14" ? 14 : period === "90" ? 90 : 30;
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + days);
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.status === "HIDDEN") return;

  await prisma.$transaction([
    prisma.rental.create({ data: { userId: user.id, bookId: book.id, endsAt } }),
    prisma.book.update({ where: { id: book.id }, data: { status: "RENTED" } })
  ]);
  revalidatePath("/");
}

export async function updateBook(formData: FormData) {
  await requireAdmin();
  const bookId = Number(formData.get("bookId"));
  const price = Number(formData.get("price"));
  const status = stringValue(formData, "status");
  if (!bookId || !Number.isFinite(price)) return;

  await prisma.book.update({ where: { id: bookId }, data: { price, status } });
  revalidatePath("/");
}

export async function markReminderSent(formData: FormData) {
  await requireAdmin();
  const rentalId = Number(formData.get("rentalId"));
  if (!rentalId) return;

  await prisma.rental.update({ where: { id: rentalId }, data: { reminded: true } });
  revalidatePath("/");
}
