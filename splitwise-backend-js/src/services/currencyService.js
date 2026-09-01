const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BASE_URL = "https://api.frankfurter.app";

async function fetchWithRetry(url, { retries = 3, timeout = 5000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry) {
        throw new Error(`Currency API request failed with status ${response.status}`);
      }
      if (attempt === retries) {
        throw new Error(`Currency API failed after ${retries + 1} attempts`);
      }

      const delay = 1000 * 2 ** attempt;
      console.log(`Currency API returned ${response.status}. Retrying in ${delay}ms...`);
      await sleep(delay);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        if (attempt === retries) throw new Error(`Currency API timed out after ${retries + 1} attempts`);
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      if (error instanceof TypeError) {
        if (attempt === retries) throw error;
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      throw error;
    }
  }
}

async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const url = `${BASE_URL}/latest?from=${fromCurrency}&to=${toCurrency}`;
  const data = await fetchWithRetry(url);

  const rate = data.rates[toCurrency];
  if (typeof rate !== "number") {
    throw new Error(`No exchange rate found for ${fromCurrency} -> ${toCurrency}`);
  }

  return rate;
}

module.exports = { getExchangeRate };