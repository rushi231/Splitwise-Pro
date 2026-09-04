import { request } from "./client";

export function recordSettlement({ groupId, toUserId, amountCents, currency }) {
  return request("/settlements", {
    method: "POST",
    body: { groupId, toUserId, amountCents, currency, idempotencyKey: crypto.randomUUID() },
  });
}