// server.js
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());

app.get('/users', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
