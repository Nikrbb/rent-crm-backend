const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// получить всех пользователей (без пароля)
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username FROM users ORDER BY id'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// создать пользователя
router.post(
    '/',
    auth,
    [
        body('username')
            .isString()
            .notEmpty()
            .withMessage('username обязателен'),
        body('password')
            .isString()
            .isLength({ min: 6 })
            .withMessage('пароль минимум 6 символов'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }

        const { username, password } = req.body;

        try {
            const hash = await bcrypt.hash(password, 10);

            const result = await pool.query(
                'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
                [username, hash]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// изменить пользователя
router.put(
    '/:id',
    auth,
    [
        param('id').isInt().withMessage('id должен быть целым числом'),
        body('username').optional().isString(),
        body('password').optional().isString().isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }

        const { id } = req.params;
        const { username, password } = req.body;

        try {
            let hash = null;

            if (password) {
                hash = await bcrypt.hash(password, 10);
            }

            const result = await pool.query(
                `UPDATE users
         SET username = COALESCE($1, username),
             password = COALESCE($2, password)
         WHERE id = $3
         RETURNING id, username`,
                [username, hash, id]
            );

            if (result.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: 'Пользователь не найден' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// удалить пользователя
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
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
            res.json({ message: 'Пользователь удалён' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

module.exports = router;
