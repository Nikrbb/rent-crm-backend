// db.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:"); // база в памяти (можно указать файл)

// создаем таблицу и тестовые данные
db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
  stmt.run("Alice");
  stmt.run("Bob");
  stmt.finalize();
});

module.exports = db;
