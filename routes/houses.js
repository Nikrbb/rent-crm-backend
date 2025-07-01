const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Получить все дома
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM houses ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить дом
router.post(
    '/',
    auth,
    [
        body('name').isString().notEmpty().withMessage('name обязателен'),
        body('address').optional().isString(),
        body('photo_url')
            .optional()
            .isURL()
            .withMessage('photo_url должен быть корректным URL'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }

        const { name, address = null, photo_url = null } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO houses (name, address, photo_url) VALUES ($1, $2, $3) RETURNING *',
                [name, address, photo_url]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// Обновить дом
router.put(
    '/:id',
    auth,
    [
        param('id').isInt().withMessage('id должен быть целым числом'),
        body('name')
            .optional()
            .isString()
            .notEmpty()
            .withMessage('name должен быть строкой'),
        body('address').optional().isString(),
        body('photo_url')
            .optional()
            .isURL()
            .withMessage('photo_url должен быть корректным URL'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }

        const { id } = req.params;
        const { name, address, photo_url } = req.body;

        try {
            const result = await pool.query(
                `UPDATE houses
                 SET name = COALESCE($1, name),
                     address = COALESCE($2, address),
                     photo_url = COALESCE($3, photo_url)
                 WHERE id = $4
                 RETURNING *`,
                [name, address, photo_url, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Дом не найден' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// Удалить дом
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
            await pool.query('DELETE FROM houses WHERE id = $1', [id]);
            res.json({ message: 'Дом удалён' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

module.exports = router;
