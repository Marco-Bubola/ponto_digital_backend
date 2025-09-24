const express = require('express');

const router = express.Router();

/**
 * GET /api/companies
 * Listar empresas (placeholder)
 */
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Companies endpoint - to be implemented' });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;