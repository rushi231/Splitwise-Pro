const { Router } = require("express");
const { z } = require("zod");
const { appendEvent, getBalances, seeHistory } = require("../services/ledgerService");
const { simplifyDebts } = require("../services/debtSimplification");
const { requireAuth } = require("../middleware/auth");
const { pool } = require("../db/pool");

const expensesRouter = Router();

const addExpenseSchema = z.object({
  groupId: z.string().uuid(),
  description: z.string().min(1),
  totalAmountCents: z.number().int().positive(),
  currency: z.string().length(3),
  paidBy: z.string().uuid(),
  splits: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amountCents: z.number().int().nonnegative(),
      })
    )
    .min(1),
  idempotencyKey: z.string().min(1),
});

async function isGroupMember(groupId, userId) {
  const result = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return result.rowCount > 0;
}

expensesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { groupId, splits, totalAmountCents, idempotencyKey, ...rest } = parsed.data;
  const createdBy = req.user.id;

  const splitSum = splits.reduce((sum, s) => sum + s.amountCents, 0);
  if (splitSum !== totalAmountCents) {
    return res.status(400).json({
      error: `Splits sum to ${splitSum} cents but total is ${totalAmountCents} cents`,
    });
  }

  try {
    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const event = await appendEvent({
      groupId,
      type: "expense_added",
      payload: { ...rest, totalAmountCents, splits },
      createdBy,
      idempotencyKey,
    });
    return res.status(201).json(event);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(200).json({ message: "Already processed" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.get("/groups/:groupId/balances", requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const balances = await getBalances(groupId);
    return res.json({ balances });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.get("/groups/:groupId/settle-up", requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const balances = await getBalances(groupId);
    const suggestions = simplifyDebts(balances);
    return res.json({ suggestions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.get("/groups/:groupId", requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const expenses = await seeHistory(groupId);
    return res.json({ expenses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.put("/groups/:groupId/expenses/:eventId", requireAuth, async (req, res) => {
  const { groupId, eventId } = req.params;

  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { splits, totalAmountCents, idempotencyKey, ...rest } = parsed.data;
  const createdBy = req.user.id;

  const splitSum = splits.reduce((sum, s) => sum + s.amountCents, 0);
  if (splitSum !== totalAmountCents) {
    return res.status(400).json({
      error: `Splits sum to ${splitSum} cents but total is ${totalAmountCents} cents`,
    });
  }

  try {
    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    await appendEvent({
      groupId,
      type: "expense_deleted",
      payload: { targetEventId: eventId },
      createdBy,
      idempotencyKey: `delete-${eventId}`,
    });

    const newEvent = await appendEvent({
      groupId,
      type: "expense_added",
      payload: { ...rest, totalAmountCents, splits },
      createdBy,
      idempotencyKey,
    });

    return res.status(201).json(newEvent);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(200).json({ message: "Already processed" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.delete("/groups/:groupId/expenses/:eventId", requireAuth, async (req, res) => {
  try {
    const { groupId, eventId } = req.params;

    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const event = await appendEvent({
      groupId,
      type: "expense_deleted",
      payload: { targetEventId: eventId },
      createdBy: req.user.id,
      idempotencyKey: `delete-${eventId}`,
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { expensesRouter };