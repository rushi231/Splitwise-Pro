import { request } from "./client";


export async function listGroups() {
  const data = await request("/groups");
  return data.groups;
}

export async function createGroup({ name, defaultCurrency }) {
  const data = await request("/groups", {
    method: "POST",
    body: { name, defaultCurrency },
  });
  return data.group;
}

// GET /groups/:id/members returns a RAW array
export async function listMembers(groupId) {
  const rows = await request(`/groups/${groupId}/members`);
  return rows.map((row) => ({
    userId: row.id,
    displayName: row.display_name,
    email: row.email,
  }));
}

// add the user with their email 
export function addMember(groupId, { email }) {
  return request(`/groups/${groupId}/members`, {
    method: "POST",
    body: { email },
  });
}

export function listRecurringExpenses(groupId) {
  return request(`/groups/${groupId}/recurring-expenses`);
}

export function createRecurringExpense(groupId, payload) {
  return request(`/groups/${groupId}/recurring-expenses`, {
    method: "POST",
    body: payload,
  });
}