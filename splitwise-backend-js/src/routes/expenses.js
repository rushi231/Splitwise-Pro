const { Router } = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");

const { appendEvent, getBalances } = require("../services/ledgerService");
const { simplifyDebts } = require("../services/debtSimplification");

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

expensesRouter.post("/",requireAuth, async (req, res) => {
  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { groupId, splits, totalAmountCents, idempotencyKey, ...rest } = parsed.data;
  const createdBy = req.user.id;
  // Splits must sum exactly to the total - no silent rounding.
  const splitSum = splits.reduce((sum, s) => sum + s.amountCents, 0);
  if (splitSum !== totalAmountCents) {
    return res.status(400).json({
      error: `Splits sum to ${splitSum} cents but total is ${totalAmountCents} cents`,
    });
  }

  try {
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
      // Duplicate idempotency key - the write already happened.
      // Treat as success rather than erroring the client out.
      return res.status(200).json({ message: "Already processed" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.get("/groups/:groupId/balances", async (req, res) => {
  try {
    const balances = await getBalances(req.params.groupId);
    return res.json({ balances });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.get("/groups/:groupId/settle-up", async (req, res) => {
  try {
    const balances = await getBalances(req.params.groupId);
    const suggestions = simplifyDebts(balances);
    return res.json({ suggestions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

expensesRouter.delete("/groups/:groupId/expenses/:eventId", requireAuth, async (req, res) => {
  try {
    const {groupId, eventId } = req.params;
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
    // Step 1: cancel the old expense
    await appendEvent({
      groupId,
      type: "expense_deleted",
      payload: { targetEventId: eventId },
      createdBy,
      idempotencyKey: `delete-${eventId}`,
    });

    // Step 2: record the new version as a fresh expense
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
module.exports = { expensesRouter };
