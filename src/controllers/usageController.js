const pool = require('../db.js');

exports.createUsage = async (req, res) => {
    try {
        const { userId, action, usedUnits } = req.body;
        if (!userId || !action || typeof usedUnits !== 'number') {
            return res.status(400).json({ error: 'userId, action, usedUnits required (usedUnits number)' });
        }

        const [result] = await pool.execute(
            `INSERT INTO UsageRecords (userId, action, usedUnits) VALUES (?, ?, ?)`,
            [userId, action, usedUnits]
        );

        const insertedId = result.insertId;
        const [rows] = await pool.execute(`SELECT * FROM UsageRecords WHERE id = ?`, [insertedId]);
        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};