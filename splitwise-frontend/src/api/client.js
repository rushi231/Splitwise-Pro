//  API call in the app goes through
// `request()` below, so the base URL, credentials, JSON handling, and
// error shape are all handled in exactly one place.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Custom error class so callers can check `error.status`
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Make a request to the API. Auth is handled via an httpOnly cookie the
 * backend sets on login - `credentials: "include"` tells the browser to
 * send that cookie automatically, so there's no token to pass manually.
 *
 * @param {string} path 
 * @param {object} options
 * @param {string} [options.method] - defaults to GET
 * @param {object} [options.body] - will be JSON-stringified
 */
export async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || data?.message || "Something went wrong.";
    throw new ApiError(message, response.status);
  }

  return data;
}