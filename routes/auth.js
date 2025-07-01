const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// регистрация
router.post(
    '/register',
    [
        body('username')
            .isString()
            .notEmpty()
            .withMessage('username обязателен'),
        body('password')
            .isLength({ min: 4 })
            .withMessage('Пароль минимум 4 символа'),
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
            // проверка существования
            const exists = await pool.query(
                'SELECT * FROM users WHERE username=$1',
                [username]
            );
            if (exists.rows.length > 0) {
                return res
                    .status(400)
                    .json({ error: 'Пользователь уже существует' });
            }

            // хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
                [username, hashedPassword]
            );

            res.status(201).json({
                message: 'Пользователь создан',
                user: {
                    id: result.rows[0].id,
                    username: result.rows[0].username,
                },
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// вход
router.post(
    '/login',
    [body('username').isString().notEmpty(), body('password').notEmpty()],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ errors: errors.array().map((e) => e.msg) });
        }
        const { username, password } = req.body;

        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE username=$1',
                [username]
            );

            if (result.rows.length === 0) {
                return res
                    .status(401)
                    .json({ error: 'Неверный логин или пароль' });
            }

            const user = result.rows[0];

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res
                    .status(401)
                    .json({ error: 'Неверный логин или пароль' });
            }

            // генерируем токен
            const token = jwt.sign(
                { user_id: user.id, username: user.username },
                process.env.JWT_SECRET || 'supersecret',
                { expiresIn: '2h' }
            );

            res.json({ token });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

module.exports = router;
