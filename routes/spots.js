const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM parking_spots ORDER BY id'
        );
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post(
    '/',
    auth,
    [
        body('name').isString().notEmpty().withMessage('name обязателен'),
        body('location').optional().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }
        const { name, location } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO parking_spots (name, location) VALUES ($1, $2) RETURNING *',
                [name, location]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

router.delete(
    '/:id',
    auth,
    [param('id').isInt().withMessage('id должен быть целым числом')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM parking_spots WHERE id = $1', [id]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

module.exports = router;
