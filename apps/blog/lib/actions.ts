"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, hashPassword, requireUser, setSession, verifyPassword } from "./auth";
import { prisma } from "./db";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function tagsFromInput(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export async function register(formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");

  if (!name || !email || password.length < 6) {
    throw new Error("Укажите имя, email и пароль от 6 символов.");
  }

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

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Неверный email или пароль.");
  }

  setSession(user.id);
  redirect("/");
}

export async function logout() {
  clearSession();
  redirect("/");
}

export async function createPost(formData: FormData) {
  const user = await requireUser();
  const title = stringValue(formData, "title");
  const body = stringValue(formData, "body");
  const visibility = stringValue(formData, "visibility") === "REQUEST_ONLY" ? "REQUEST_ONLY" : "PUBLIC";
  const tags = tagsFromInput(stringValue(formData, "tags"));

  if (!title || !body) return;

  await prisma.post.create({
    data: {
      title,
      body,
      visibility,
      authorId: user.id,
      tags: {
        create: tags.map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } }
        }))
      }
    }
  });
  revalidatePath("/");
}

export async function updatePost(formData: FormData) {
  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  const title = stringValue(formData, "title");
  const body = stringValue(formData, "body");
  const visibility = stringValue(formData, "visibility") === "REQUEST_ONLY" ? "REQUEST_ONLY" : "PUBLIC";
  const tags = tagsFromInput(stringValue(formData, "tags"));
  const post = await prisma.post.findFirst({ where: { id: postId, authorId: user.id } });
  if (!post || !title || !body) return;

  await prisma.$transaction([
    prisma.postTag.deleteMany({ where: { postId } }),
    prisma.post.update({
      where: { id: postId },
      data: {
        title,
        body,
        visibility,
        tags: {
          create: tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } }
          }))
        }
      }
    })
  ]);
  revalidatePath("/");
}

export async function deletePost(formData: FormData) {
  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  await prisma.post.deleteMany({ where: { id: postId, authorId: user.id } });
  revalidatePath("/");
}

export async function toggleSubscription(formData: FormData) {
  const user = await requireUser();
  const followingId = Number(formData.get("followingId"));
  if (!followingId || followingId === user.id) return;

  const existing = await prisma.subscription.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId } }
  });
  if (existing) {
    await prisma.subscription.delete({ where: { followerId_followingId: { followerId: user.id, followingId } } });
  } else {
    await prisma.subscription.create({ data: { followerId: user.id, followingId } });
  }
  revalidatePath("/");
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  const text = stringValue(formData, "text");
  if (!postId || !text) return;

  await prisma.comment.create({ data: { postId, authorId: user.id, text } });
  revalidatePath("/");
}

export async function requestAccess(formData: FormData) {
  const user = await requireUser();
  const postId = Number(formData.get("postId"));
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId === user.id) return;

  await prisma.accessRequest.upsert({
    where: { postId_requesterId: { postId, requesterId: user.id } },
    update: { status: "PENDING" },
    create: { postId, requesterId: user.id }
  });
  revalidatePath("/");
}

export async function reviewAccessRequest(formData: FormData) {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  const decision = stringValue(formData, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const request = await prisma.accessRequest.findUnique({ where: { id: requestId }, include: { post: true } });
  if (!request || request.post.authorId !== user.id) return;

  await prisma.accessRequest.update({ where: { id: requestId }, data: { status: decision } });
  revalidatePath("/");
}
