
const BASE_URL = "https://api.frankfurter.app";

/**
 * exchange rate to convert 1 unit of `fromCurrency` into
 * `toCurrency`, as of right now. Returns 1 if the currencies match
 * @param {string} fromCurrency 
 * @param {string} toCurrency R"
 * @returns {Promise<number>}
 */

async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const url = `${BASE_URL}/latest?from=${fromCurrency}&to=${toCurrency}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rates[toCurrency];

  if (typeof rate !== "number") {
    throw new Error(`No exchange rate found for ${fromCurrency} -> ${toCurrency}`);
  }

  return rate;
}

module.exports = { getExchangeRate };