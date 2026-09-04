import { request } from "./client";

export function signup({ email, password, displayName }) {
  return request("/users/signup", {
    method: "POST",
    body: { email, password, displayName },
  });
}

export function login({ email, password }) {
  return request("/users/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout() {
  return request("/users/logout", { method: "POST" });
}


export async function getCurrentUser() {
  const data = await request("/users/me");
  return data.user;
}