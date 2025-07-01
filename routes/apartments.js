const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// получить все квартиры
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, h.name AS house_name, h.address AS house_address
      FROM apartments a
      LEFT JOIN houses h ON a.house_id = h.id
      ORDER BY a.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// получить все квартиры по house_id
router.get('/house/:houseId', auth, async (req, res) => {
  const { houseId } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.*, h.name AS house_name, h.address AS house_address
       FROM apartments a
       LEFT JOIN houses h ON a.house_id = h.id
       WHERE a.house_id = $1
       ORDER BY a.id`,
      [houseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// добавить квартиру
router.post(
  '/',
  auth,
  [
    body('house_id').isInt().withMessage('house_id должен быть целым числом'),
    body('number').isString().notEmpty().withMessage('number обязателен'),
    body('note').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map((e) => e.msg) });
    }

    const { house_id, number, note = null } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO apartments (house_id, number, note)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [house_id, number, note]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// обновить квартиру
router.put(
  '/:id',
  auth,
  [
    param('id').isInt().withMessage('id должен быть целым числом'),
    body('house_id').optional().isInt(),
    body('number').optional().isString(),
    body('note').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map((e) => e.msg) });
    }

    const { id } = req.params;
    const { house_id, number, note } = req.body;

    try {
      const result = await pool.query(
        `UPDATE apartments
         SET house_id = COALESCE($1, house_id),
             number = COALESCE($2, number),
             note = COALESCE($3, note)
         WHERE id = $4
         RETURNING *`,
        [house_id, number, note, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Квартира не найдена' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// удалить квартиру
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
      await pool.query('DELETE FROM apartments WHERE id = $1', [id]);
      res.json({ message: 'Квартира удалена' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

module.exports = router;
