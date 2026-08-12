const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// set JWT_SECRET as an env var to something long
// and random. 
// anyone who knows this default could forge tokens.
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
const TOKEN_EXPIRY = "7d";


async function hashPassword(plaintextPassword) {
  const saltRounds = 10; // higher = slower to hash but harder to brute-force
  return bcrypt.hash(plaintextPassword, saltRounds);
}

 
async function verifyPassword(plaintextPassword, storedHash) {
  return bcrypt.compare(plaintextPassword, storedHash);
}


function generateToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Express middleware that requires a valid JWT on the request.
 * Reads it from the "Authorization: Bearer <token>" header.
 * On success, attaches req.user = { id, email } so downstream
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; 

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next(); // valid token - let the request continue to the actual route
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { hashPassword, verifyPassword, generateToken, requireAuth };
