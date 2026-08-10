/**
 * @typedef {Object} SettlementSuggestion
 * @property {string} fromUserId
 * @property {string} toUserId
 * @property {number} amountCents
 */

/**
 * Given net balances for a group, compute the minimum number of
 * transactions needed to settle everyone up.
 *
 "debt simplification" problem: instead of
 * A pays B $10, B pays C $10, C pays A $5 (3 transactions), we
 * collapse the group's net creditors/debtors and match them
 * directly, e.g. A pays C $5 (1 transaction).
 *
 * Approach: greedy max-flow matching. Repeatedly match the biggest
 * debtor with the biggest creditor, settle the smaller of the two
 * amounts, and repeat. This is O(n log n) and is *not* always
 * provably minimal in the strict graph-theoretic sense (minimum
 * transaction count is NP-hard in general - it reduces to a set
 * partition variant), but the greedy approach gives a very good
 * approximation and is what production tools like Splitwise use in
 * practice. 
 *
 * Rounding: since we're working in integer cents, sums are exact 
 * no floating point drift. If you extend this to multi-currency,

 *
 * @param {import('../models/ledger').BalanceSheet} balances
 * @returns {SettlementSuggestion[]}
 */
function simplifyDebts(balances) {
  // Split into creditors (owed money, positive balance) and debtors
  // (owe money, negative balance). Ignore anyone already at zero.
  const creditors = [];
  const debtors = [];

  for (const [userId, amount] of Object.entries(balances)) {
    if (amount > 0) creditors.push({ userId, amount });
    else if (amount < 0) debtors.push({ userId, amount: -amount });
  }

  // Sanity check: total credits should equal total debits. If they
  // don't, something upstream (event replay) has a bug - the ledger
  // must always net to zero across a closed group.
  const totalCredits = creditors.reduce((sum, c) => sum + c.amount, 0);
  const totalDebits = debtors.reduce((sum, d) => sum + d.amount, 0);
  if (totalCredits !== totalDebits) {
    throw new Error(
      `Ledger inconsistency: credits (${totalCredits}) != debits (${totalDebits}). ` +
        `This should never happen if events were replayed correctly.`
    );
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggestions = [];
  let i = 0; // pointer into debtors
  let j = 0; // pointer into creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      suggestions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: settleAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return suggestions;
}

module.exports = { simplifyDebts };
