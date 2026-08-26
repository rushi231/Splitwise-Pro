expensesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { groupId, splits, totalAmountCents, idempotencyKey, currency, ...rest } = parsed.data;
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

    const groupResult = await pool.query(
      `SELECT default_currency FROM groups WHERE id = $1`,
      [groupId]
    );
    const groupCurrency = groupResult.rows[0].default_currency;

    let payload = { ...rest, currency, totalAmountCents, splits };

    if (currency !== groupCurrency) {
      const exchangeRate = await getExchangeRate(currency, groupCurrency);
      const convertedAmountCents = Math.round(totalAmountCents * exchangeRate);

      payload = {
        ...payload,
        convertedAmountCents,
        convertedCurrency: groupCurrency,
        exchangeRate,
      };
    }

    const event = await appendEvent({
      groupId,
      type: "expense_added",
      payload,
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