const { Router } = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");
const { hashPassword, verifyPassword, generateToken, requireAuth } = require("../middleware/auth");

const usersRouter = Router();

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const signupSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

usersRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, displayName, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [email, displayName, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);

    return res.status(201).json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

usersRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      `SELECT id, email, display_name, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];


    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

usersRouter.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "none",
    secure: process.env.NODE_ENV === "production",
  });
  return res.json({ message: "Logged out" });
});

usersRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, display_name FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { usersRouter };
