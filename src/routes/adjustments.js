const express = require('express');
const geminiService = require('../services/geminiService');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/adjustments/generate-justification
 * Gerar justificativa com IA
 */
router.post('/generate-justification', auth, async (req, res) => {
  try {
    const { userInput, recordType, date } = req.body;

    if (!userInput || !recordType) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: userInput, recordType' 
      });
    }

    const justification = await geminiService.generateJustification(
      userInput,
      recordType,
      new Date(date || Date.now())
    );

    res.json({
      message: 'Justificativa gerada com sucesso',
      justification,
      originalInput: userInput
    });

  } catch (error) {
    console.error('Erro ao gerar justificativa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/adjustments
 * Listar solicitações de ajuste (placeholder)
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Adjustments endpoint - to be implemented' });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;