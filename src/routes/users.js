const express = require('express');
const router = express.Router();
const pool = require('../db');

function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0); 
  return { first, last };
}

router.get('/:id/current-usage', async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const { first, last } = getMonthRange();
    
    const [subs] = await pool.execute(
      `SELECT s.*, p.id as planId, p.name as planName, p.monthlyQuota, p.extraChargePerUnit
       FROM Subscriptions s
       JOIN Plans p ON p.id = s.planId
       WHERE s.userId = ? AND s.isActive = 1
       LIMIT 1`,
      [userId]
    );

    if (!subs || subs.length === 0) {
      return res.status(404).json({ error: 'Active subscription not found for user' });
    }
    const sub = subs[0];

    const [usageRows] = await pool.execute(
      `SELECT COALESCE(SUM(usedUnits),0) as totalUsed
       FROM UsageRecords
       WHERE userId = ? AND createdAt >= ? AND createdAt < ?`,
      [userId, first, last]
    );
    const totalUsed = Number(usageRows[0].totalUsed || 0);

    const monthlyQuota = Number(sub.monthlyQuota);
    const remaining = monthlyQuota - totalUsed;

    return res.json({
      userId,
      totalUnitsUsed: totalUsed,
      remainingUnits: remaining < 0 ? 0 : remaining,
      activePlan: {
        id: sub.planId,
        name: sub.planName,
        monthlyQuota: monthlyQuota,
        extraChargePerUnit: Number(sub.extraChargePerUnit)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/billing-summary', async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const { first, last } = getMonthRange();
    const [subs] = await pool.execute(
      `SELECT s.*, p.id as planId, p.name as planName, p.monthlyQuota, p.extraChargePerUnit
       FROM Subscriptions s
       JOIN Plans p ON p.id = s.planId
       WHERE s.userId = ? AND s.isActive = 1
       LIMIT 1`,
      [userId]
    );

    if (!subs || subs.length === 0) {
      return res.status(404).json({ error: 'Active subscription not found for user' });
    }
    const sub = subs[0];

    const [usageRows] = await pool.execute(
      `SELECT COALESCE(SUM(usedUnits),0) as totalUsed
       FROM UsageRecords
       WHERE userId = ? AND createdAt >= ? AND createdAt < ?`,
      [userId, first, last]
    );
    const totalUsed = Number(usageRows[0].totalUsed || 0);

    const monthlyQuota = Number(sub.monthlyQuota);
    let extraUnits = 0;
    if (totalUsed > monthlyQuota) {
      extraUnits = totalUsed - monthlyQuota;
    } else {
      extraUnits = 0;
    }

    const extraChargePerUnit = Number(sub.extraChargePerUnit);
    const rawExtraCharges = extraUnits * extraChargePerUnit;
    const extraCharges = Math.round(rawExtraCharges * 100) / 100;

    return res.json({
      userId,
      billingPeriod: {
        from: first.toISOString(),
        toExclusive: last.toISOString()
      },
      totalUsage: totalUsed,
      planQuota: monthlyQuota,
      extraUnits,
      extraChargePerUnit: Number(extraChargePerUnit.toFixed(2)),
      extraCharges: Number(extraCharges.toFixed(2)),
      activePlan: {
        id: sub.planId,
        name: sub.planName,
        monthlyQuota: monthlyQuota,
        extraChargePerUnit: Number(extraChargePerUnit.toFixed(2))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
