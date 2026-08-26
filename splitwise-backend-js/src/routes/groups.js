const { Router } = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const groupsRouter = Router();


groupsRouter.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().min(1),
  defaultCurrency: z.string().length(3).default("USD"),
});

groupsRouter.post("/", async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, defaultCurrency } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO groups (name, default_currency, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, default_currency, created_by, created_at`,
      [name, defaultCurrency, req.user.id]
    );
    const group = groupResult.rows[0];

    // The creator is automatically a member of their own group -
    // do this in the same transaction so we never end up with a
    // group that has no members if the second insert failed.
    await client.query(
      `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`,
      [group.id, req.user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      group: {
        id: group.id,
        name: group.name,
        defaultCurrency: group.default_currency,
        createdBy: group.created_by,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// List every group the current user belongs to.
groupsRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.default_currency, g.created_by, g.created_at
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    const groups = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      defaultCurrency: row.default_currency,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));

    return res.json({ groups });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

// Add a member to a group. Only existing members can add others to the group.
groupsRouter.post("/:groupId/members", async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { groupId } = req.params;
  const { userId } = parsed.data;

  try {
    const membershipCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.user.id]
    );
    if (membershipCheck.rowCount === 0) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    await pool.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, 
      [groupId, userId]
    );

    return res.status(201).json({ message: "Member added" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


groupsRouter.get("/:groupId/members", async (req, res) => {
  try {
    const { groupId } = req.params;

    const membershipCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.user.id]
    );

    if (membershipCheck.rowCount === 0) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const result = await pool.query(
      `SELECT u.id, u.display_name, u.email
       FROM users u
       JOIN group_members gm 
        ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
});

const addRecurringExpenseSchema = z.object({
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  interval: z.enum(["weekly", "monthly"]),
  paidBy: z.string().uuid(),
  splitRule: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amountCents: z.number().int().nonnegative(),
      })
    )
    .min(1),
});
  
groupsRouter.post("/:groupId/recurring-expenses", requireAuth,async(req,res) => {
    const parsed = addRecurringExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { groupId } = req.params;
    const {
      description,
      amountCents,
      currency,
      interval,
      paidBy,
      splitRule,
    } = parsed.data;

    try{
      const membershipCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.user.id]
    );
    
    if (membershipCheck.rowCount === 0) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const nextRunAt = new Date();
      if (interval === "weekly") {
        nextRunAt.setDate(nextRunAt.getDate() + 7);
      } else {
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      }
      
    const result = await pool.query(
      `INSERT INTO recurring_expenses
      (group_id, description, amount_cents, currency, interval, paid_by, split_rule, next_run_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, group_id, description, amount_cents, currency, interval, paid_by, split_rule, next_run_at`,
      [groupId, description, amountCents, currency, interval, paidBy, JSON.stringify(splitRule), nextRunAt]
    );
    return res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } 
  });










module.exports = { groupsRouter };
