"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, hashPassword, requireUser, setSession, verifyPassword } from "./auth";
import { prisma } from "./db";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function placesFromInput(input: string) {
  return input
    .split(",")
    .map((place) => place.trim())
    .filter(Boolean);
}

export async function register(formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  if (!name || !email || password.length < 6) return;

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password) }
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

export async function createTrip(formData: FormData) {
  const user = await requireUser();
  const title = stringValue(formData, "title");
  const location = stringValue(formData, "location");
  const imageLabel = stringValue(formData, "imageLabel") || "Фото путешествия";
  const imageUrl = stringValue(formData, "imageUrl");
  const body = stringValue(formData, "body");
  const cost = Number(formData.get("cost")) || 0;
  const safetyScore = Number(formData.get("safetyScore")) || 0;
  const places = placesFromInput(stringValue(formData, "places"));

  if (!title || !location || !body) return;

  await prisma.trip.create({
    data: {
      title,
      location,
      imageLabel,
      imageUrl: imageUrl || null,
      body,
      cost,
      safetyScore,
      authorId: user.id,
      places: { create: places.map((name) => ({ name })) }
    }
  });
  revalidatePath("/");
}
