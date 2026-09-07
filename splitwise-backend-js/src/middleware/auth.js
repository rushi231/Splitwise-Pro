const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
const TOKEN_EXPIRY = "7d";


async function hashPassword(plaintextPassword) {
  const saltRounds = 10;
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


function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { hashPassword, verifyPassword, generateToken, requireAuth };
