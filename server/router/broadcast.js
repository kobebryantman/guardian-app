/**
 * POST /api/broadcast
 */
const { Router } = require('express');
const { requireAuth } = require('../utils/auth');
const { forEachClient } = require('../service/state');

const router = Router();
router.use(requireAuth);

router.post('/', (req, res) => {
  let sent = 0;
  forEachClient((info) => {
    if (info.ws.readyState === 1) { info.ws.send(JSON.stringify({ type: 'broadcast', ...req.body })); sent++; }
  });
  res.json({ ok: true, sent });
});

module.exports = router;
