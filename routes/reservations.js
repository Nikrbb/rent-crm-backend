const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// получить все брони
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT r.*, p.name as spot_name, u.username 
      FROM reservations r
      JOIN parking_spots p ON r.spot_id = p.id
      JOIN users u ON r.user_id = u.id
      ORDER BY r.start_date
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// добавить бронь
router.post('/', auth, async (req, res) => {
    const { spot_id, user_id, start_date, end_date } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO reservations (spot_id, user_id, start_date, end_date) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [spot_id, user_id, start_date, end_date]
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
});

// изменить бронь
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    try {
        const result = await pool.query(
            `UPDATE reservations SET start_date=$1, end_date=$2, updated_at=NOW() 
       WHERE id=$3 RETURNING *`,
            [start_date, end_date, id]
        );

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
});

// удалить бронь
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        // нужно сохранить в историю перед удалением
        const old = await pool.query('SELECT * FROM reservations WHERE id=$1', [
            id,
        ]);
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
});

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
