const { pool } = require("../db/pool");

/**
 * Append an event to the ledger. Idempotency is enforced at the DB level
 * via a UNIQUE constraint on idempotency_key - if a client retries a
 * request  with the same key, this
 * throws a unique_violation instead of double-writing the expense.
 *
 * Callers should catch the unique_violation (pg error code 23505) and
 * treat it as a success (the write already happened).
 *

 */
async function appendEvent({ groupId, type, payload, createdBy, idempotencyKey }) {
  const result = await pool.query(
    `INSERT INTO ledger_events (group_id, type, payload, created_by, idempotency_key)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, group_id, type, payload, created_by, idempotency_key, created_at`,
    [groupId, type, JSON.stringify(payload), createdBy, idempotencyKey]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    groupId: row.group_id,
    type: row.type,
    payload: row.payload,
    createdBy: row.created_by,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

/**
 * Derive current balances for a group by replaying its full event
 * history. 
 *
 * 
 *
 * @param {string} groupId
 * @returns {Promise<import('../models/ledger').BalanceSheet>}
 */
async function getBalances(groupId) {
  const result = await pool.query(
    `SELECT id, type, payload FROM ledger_events
     WHERE group_id = $1
     ORDER BY created_at ASC`,
    [groupId]
  );

  const balances = {};
  const bump = (userId, deltaCents) => {
    balances[userId] = (balances[userId] ?? 0) + deltaCents;
  };

  // Track which expense_added events have been reversed by an
  // expense_deleted event, so we can skip them below.
  const deletedEventIds = new Set();
  for (const row of result.rows) {
    if (row.type === "expense_deleted") {
      deletedEventIds.add(row.payload.targetEventId);
    }
  }

  for (const row of result.rows) {
    if (row.type === "expense_added" && !deletedEventIds.has(row.id)) {
      const payload = row.payload;
      // The payer is owed the full amount...
      bump(payload.paidBy, payload.totalAmountCents);
      // and each participant owes their share (including the
      // payer, if they're also a participant  nets out correctly).
      for (const share of payload.splits) {
        bump(share.userId, -share.amountCents);
      }
    }

    if (row.type === "settlement") {
      const payload = row.payload;
      // Paying down a debt payer's net balance goes up (less owed),
      // receiver's net balance goes down (they've been paid back).
      bump(payload.fromUserId, payload.amountCents);
      bump(payload.toUserId, -payload.amountCents);
    }
  }

  return balances;
}



async function seeHistory(groupId) {
  const result = await pool.query(
    `SELECT id, type, payload, created_at FROM ledger_events
     WHERE group_id = $1
     ORDER BY created_at ASC`,
    [groupId]
  );

  const deletedEventIds = new Set();

  for (const row of result.rows) {
    if (row.type === "expense_deleted") {
      deletedEventIds.add(row.payload.targetEventId);
    }
  }

  const expenses = [];

  for (const row of result.rows) {
    if (row.type === "expense_added" && !deletedEventIds.has(row.id)) {
      expenses.push({
        id: row.id,
        type: row.type,
        ...row.payload,
        createdAt: row.created_at,
      });
    }
  }

  return expenses;
}
module.exports = { appendEvent, getBalances, seeHistory };