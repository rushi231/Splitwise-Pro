const express = require("express");
require("dotenv").config();
const { usersRouter } = require("./routes/users");
const { groupsRouter } = require("./routes/groups");
const { expensesRouter } = require("./routes/expenses");
const { processRecurringExpenses } = require("./jobs/processRecurringExpenses");
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/expenses", expensesRouter);
app.use("/users", usersRouter);
app.use("/groups", groupsRouter);
// TODO: /groups, /users, /settlements routes
// TODO: auth middleware populate req.user, replace the manual

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`splitwise-backend listening on port ${port}`);
});

setInterval(() => {
  processRecurringExpenses().catch((err) => {
    console.error("Recurring expenses job failed:", err);
  });
}, 60 * 1000);