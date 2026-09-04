import { useCallback, useEffect, useState } from "react";
import * as expensesApi from "../api/expenses";

// Loads a group's expenses, balances, and settle-up suggestions.
// balances is a flat { userId: netCents } map and suggestions are
// { fromUserId, toUserId, amountCents } - both keyed by raw user IDs,
export function useGroupFinances(groupId) {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [settleUp, setSettleUp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const [expensesData, balancesData, settleUpData] = await Promise.all([
        expensesApi.listExpenses(groupId),
        expensesApi.getBalances(groupId),
        expensesApi.getSettleUpSuggestions(groupId),
      ]);
      setExpenses(expensesData);
      setBalances(balancesData);
      setSettleUp(settleUpData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  //  DONT FORGET. addExpense expects the full payload including groupId, since the
  // backend takes groupId from the request body rather than the URL.
  const addExpense = useCallback(
    async (payload) => {
      await expensesApi.addExpense({ ...payload, groupId });
      await refetch(); // balances depend on the new expense, so re-pull everything
    },
    [groupId, refetch],
  );

  const deleteExpense = useCallback(
    async (expenseEventId) => {
      await expensesApi.deleteExpense(groupId, expenseEventId);
      await refetch();
    },
    [groupId, refetch],
  );

  return { expenses, balances, settleUp, loading, error, refetch, addExpense, deleteExpense };
}