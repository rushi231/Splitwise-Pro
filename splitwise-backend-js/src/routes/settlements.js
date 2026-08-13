const { Router } = require("express");
const { z } = require("zod");
const { appendEvent } = require("../services/ledgerService");
const { requireAuth } = require("../middleware/auth");

const settlementsRouter = Router();

const addSettlementSchema = z.object({
  groupId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  idempotencyKey: z.string().min(1),
});

settlementsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = addSettlementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { groupId, toUserId, amountCents, currency, idempotencyKey } = parsed.data;

  try {
    const event = await appendEvent({
      groupId,
      type: "settlement",
      payload: {
        fromUserId: req.user.id,
        toUserId,
        amountCents,
        currency,
      },
      createdBy: req.user.id,
      idempotencyKey,
    });
    return res.status(201).json(event);
  } catch (err) {
    if (err.code === "23505") {
      // Duplicate idempotency key - the write already happened.
      return res.status(200).json({ message: "Already processed" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { settlementsRouter };