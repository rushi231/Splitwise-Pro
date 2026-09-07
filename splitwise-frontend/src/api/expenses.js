import { request } from "./client";


export async function listExpenses(groupId) {
  const data = await request(`/expenses/groups/${groupId}`);
  return data.expenses;
}


export function addExpense(payload) {
  return request("/expenses", {
    method: "POST",
    body: { ...payload, idempotencyKey: crypto.randomUUID() },
  });
}

export function deleteExpense(groupId, expenseEventId) {
  return request(`/expenses/groups/${groupId}/expenses/${expenseEventId}`, {
    method: "DELETE",
  });
}

export async function getBalances(groupId) {
  const data = await request(`/expenses/groups/${groupId}/balances`);
  return data.balances;
}

export async function getSettleUpSuggestions(groupId) {
  const data = await request(`/expenses/groups/${groupId}/settle-up`);
  return data.suggestions;
}