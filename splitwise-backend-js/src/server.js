const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { usersRouter } = require("./routes/users");
const { groupsRouter } = require("./routes/groups");
const { expensesRouter } = require("./routes/expenses");
const { processRecurringExpenses } = require("./jobs/processRecurringExpenses");
const {settlementsRouter} = require("./routes/settlements");
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/expenses", expensesRouter);
app.use("/users", usersRouter);
app.use("/groups", groupsRouter);
app.use("/settlements", settlementsRouter);
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