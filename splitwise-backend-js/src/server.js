const express = require("express");
require("dotenv").config();
const { expensesRouter } = require("./routes/expenses");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/expenses", expensesRouter);
// TODO: /groups, /users, /settlements routes
// TODO: auth middleware populate req.user, replace the manual

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`splitwise-backend listening on port ${port}`);
});
