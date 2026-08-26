const { pool } = require("../db/pool");
const { appendEvent } = require("../services/ledgerService");

async function processRecurringExpenses() {
  const dueResult = await pool.query(
    `SELECT * FROM recurring_expenses
     WHERE active = true AND next_run_at <= now()`
  );

  for (const recurring of dueResult.rows) {
    try {
      const splits = recurring.split_rule;

      const idempotencyKey = `recurring-${recurring.id}-${recurring.next_run_at.toISOString()}`;

      await appendEvent({
        groupId: recurring.group_id,
        type: "expense_added",
        payload: {
          description: recurring.description,
          totalAmountCents: recurring.amount_cents,
          currency: recurring.currency,
          paidBy: recurring.paid_by,
          splits,
        },
        createdBy: recurring.paid_by,
        idempotencyKey,
      });

      const nextRunAt = new Date(recurring.next_run_at);
      if (recurring.interval === "weekly") {
        nextRunAt.setDate(nextRunAt.getDate() + 7);
      } else {
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      }

      await pool.query(
        `UPDATE recurring_expenses SET next_run_at = $1 WHERE id = $2`,
        [nextRunAt, recurring.id]
      );

      console.log(`Processed recurring expense ${recurring.id} ("${recurring.description}")`);
    } catch (err) {
      if (err.code === "23505") {
        console.log(`Recurring expense ${recurring.id} already processed for this cycle`);
        continue;
      }
      console.error(`Failed to process recurring expense ${recurring.id}:`, err);
    }
  }
}

module.exports = { processRecurringExpenses };