const express = require('express');
const geminiService = require('../services/geminiService');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const Adjustment = require('../models/Adjustment');

// multer setup (memory or disk as preferred)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

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
    const items = await Adjustment.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/adjustments
 * Criar nova solicitação de ajuste (aceita multipart field 'attachment')
 */
router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { type, date, start, end, description, cpf } = req.body;

    // Validação mínima
    if (!type || (!date && !description)) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const adj = new Adjustment({
      userId: req.userId,
      type,
      date,
      start,
      end,
      description,
      cpf,
      attachment: req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : null
    });

    await adj.save();
    return res.status(201).json({ message: 'Solicitação criada', request: adj });
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro interno ao criar solicitação' });
  }
});

module.exports = router;