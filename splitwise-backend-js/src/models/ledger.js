
// All money is stored as integer cents to avoid floating point
// rounding bugs. Never use a decimal number for money.

/**
 * A single person's share of an expense.
 * @typedef {Object} SplitShare
 * @property {string} userId
 * @property {number} amountCents - exact amount this user owes, in cents.
 *   All splits for an expense must sum to the expense total.
 */

/**
 * Payload for an "expense_added" ledger event.
 * @typedef {Object} ExpenseAddedPayload
 * @property {string} description
 * @property {number} totalAmountCents
 * @property {string} currency
 * @property {string} paidBy - userId who fronted the money
 * @property {SplitShare[]} splits - who owes what share of this expense
 */

/**
 * Payload for an "expense_deleted" ledger event.
 * @typedef {Object} ExpenseDeletedPayload
 * @property {string} targetEventId - the expense_added event being reversed
 * @property {string} [reason]
 */

/**
 * Payload for a "settlement" ledger event (someone paying someone back).
 * @typedef {Object} SettlementPayload
 * @property {string} fromUserId - who is paying
 * @property {string} toUserId - who is receiving
 * @property {number} amountCents
 * @property {string} currency
 */

/**
 * A row from the ledger_events table.
 * @typedef {Object} LedgerEvent
 * @property {string} id
 * @property {string} groupId
 * @property {"expense_added"|"expense_deleted"|"settlement"} type
 * @property {ExpenseAddedPayload|ExpenseDeletedPayload|SettlementPayload} payload
 * @property {string} createdBy
 * @property {string} idempotencyKey
 * @property {string} createdAt
 */

/**
 * Net balances after replaying all events for a group.
 * An object mapping userId -> net balance in cents.
 * Positive = that user is owed money overall.
 * Negative = that user owes money overall.
 * @typedef {Object.<string, number>} BalanceSheet
 */

module.exports = {};
