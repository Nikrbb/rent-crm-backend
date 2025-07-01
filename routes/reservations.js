const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

// получить все брони
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
       SELECT r.*, p.name AS spot_name, a.address AS apartment_address, u.username
      FROM reservations r
      LEFT JOIN parking_spots p ON r.spot_id = p.id
      LEFT JOIN apartments a ON r.apartment_id = a.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.start_date
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// добавить бронь
router.post(
    '/',
    auth,
    [
        body('spot_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('spot_id должен быть целым числом или null'),
        body('apartment_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('apartment_id должен быть целым числом или null'),
        body('start_date')
            .isISO8601()
            .withMessage('start_date должен быть датой ISO'),
        body('end_date')
            .isISO8601()
            .withMessage('end_date должен быть датой ISO'),
        body('car_info').optional().isString(),
        body('phone_info').optional().isString(),
        body('notes').optional().isString(),
        body().custom((body) => {
            if (new Date(body.end_date) < new Date(body.start_date)) {
                throw new Error('end_date не может быть меньше start_date');
            }
            return true;
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array().map((e) => e.msg),
            });
        }

        const {
            spot_id = null,
            apartment_id = null,
            start_date,
            end_date,
            phone_info = null,
            car_info = null,
            notes = null,
        } = req.body;
        const user_id = req.user.user_id;

        try {
            const result = await pool.query(
                `INSERT INTO reservations 
         (spot_id, apartment_id, user_id, start_date, end_date, phone_info, car_info, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
                [
                    spot_id,
                    apartment_id,
                    user_id,
                    start_date,
                    end_date,
                    phone_info,
                    car_info,
                    notes,
                ]
            );

            // пишем в историю
            await pool.query(
                `INSERT INTO reservations_history 
       (reservation_id, spot_id, user_id, start_date, end_date, change_type) 
       VALUES ($1, $2, $3, $4, $5, 'created')`,
                [result.rows[0].id, spot_id, user_id, start_date, end_date]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// изменить бронь
router.put(
    '/:id',
    auth,
    [
        param('id').isInt().withMessage('id должен быть целым числом'),
        body('spot_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('spot_id должен быть целым числом или null'),
        body('apartment_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('apartment_id должен быть целым числом или null'),
        body('start_date')
            .optional()
            .isISO8601()
            .withMessage('start_date должен быть датой ISO'),
        body('end_date')
            .optional()
            .isISO8601()
            .withMessage('end_date должен быть датой ISO'),
        body('phone_info').optional().isString(),
        body('car_info').optional().isString(),
        body('notes').optional().isString(),
        body().custom((body) => {
            if (new Date(body.end_date) < new Date(body.start_date)) {
                throw new Error('end_date не может быть меньше start_date');
            }
            return true;
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array().map((e) => e.msg),
            });
        }

        const { id } = req.params;
        const {
            spot_id = null,
            apartment_id = null,
            start_date,
            end_date,
            phone_info = null,
            car_info = null,
            notes = null,
        } = req.body;
        try {
            const result = await pool.query(
                `UPDATE reservations
                    SET
                    spot_id = COALESCE($1, spot_id),
                    apartment_id = COALESCE($2, apartment_id),
                    start_date = COALESCE($3, start_date),
                    end_date = COALESCE($4, end_date),
                    phone_info = COALESCE($5, phone_info),
                    car_info = COALESCE($6, car_info),
                    notes = COALESCE($7, notes),
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = $8
                    RETURNING *`,
                [
                    spot_id,
                    apartment_id,
                    start_date,
                    end_date,
                    phone_info,
                    car_info,
                    notes,
                    id,
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Бронь не найдена' });
            }

            await pool.query(
                `INSERT INTO reservations_history 
       (reservation_id, spot_id, user_id, start_date, end_date, change_type) 
       VALUES ($1, $2, $3, $4, $5, 'updated')`,
                [
                    result.rows[0].id,
                    result.rows[0].spot_id,
                    result.rows[0].user_id,
                    start_date,
                    end_date,
                ]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// удалить бронь
router.delete(
    '/:id',
    auth,
    [param('id').isInt().withMessage('id должен быть целым числом')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array().map((e) => e.msg),
            });
        }
        const { id } = req.params;
        try {
            // нужно сохранить в историю перед удалением
            const old = await pool.query(
                'SELECT * FROM reservations WHERE id=$1',
                [id]
            );

            if (old.rows.length === 0) {
                return res.status(404).json({ error: 'Бронь не найдена' });
            }

            if (old.rows.length) {
                await pool.query(
                    `INSERT INTO reservations_history 
         (reservation_id, spot_id, user_id, start_date, end_date, change_type) 
         VALUES ($1,$2,$3,$4,$5,'deleted')`,
                    [
                        old.rows[0].id,
                        old.rows[0].spot_id,
                        old.rows[0].user_id,
                        old.rows[0].start_date,
                        old.rows[0].end_date,
                    ]
                );
            }
            await pool.query('DELETE FROM reservations WHERE id=$1', [id]);
            res.json({ message: 'Бронь удалена' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// история
router.get('/history', auth, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT h.*, u.username, p.name as spot_name
      FROM reservations_history h
      LEFT JOIN users u ON h.user_id = u.id
      LEFT JOIN parking_spots p ON h.spot_id = p.id
      ORDER BY h.changed_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
