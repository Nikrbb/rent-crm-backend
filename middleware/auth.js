const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Нет токена" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    req.user = decoded; // сюда кладём user_id и username
    next();
  } catch (err) {
    return res.status(403).json({ error: "Недействительный токен" });
  }
}

module.exports = authMiddleware;
