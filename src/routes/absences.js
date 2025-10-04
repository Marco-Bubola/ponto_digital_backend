const express = require('express');
const Absence = require('../models/Absence');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/absences
 * Listar faltas/ausências
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const user = await User.findById(req.userId);

    let query = {};

    // Filtrar por empresa para HR e Manager
    if (user.role === 'hr' || user.role === 'manager') {
      query.companyId = user.companyId;
    }

    // Admin vê tudo
    // Employee vê apenas suas próprias faltas
    if (user.role === 'employee') {
      query.userId = req.userId;
    }

    if (status) {
      query.status = status;
    }

    const absences = await Absence.find(query)
      .populate('userId', 'name email department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(absences);
  } catch (error) {
    console.error('Erro ao buscar ausências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/absences
 * Criar nova solicitação de falta
 */
router.post('/', auth, async (req, res) => {
  try {
    const { date, reason, type, attachment } = req.body;
    const user = await User.findById(req.userId);

    const absence = new Absence({
      userId: req.userId,
      companyId: user.companyId,
      date,
      reason,
      type,
      attachment
    });

    await absence.save();

    res.status(201).json({
      message: 'Solicitação de ausência criada com sucesso',
      absence
    });
  } catch (error) {
    console.error('Erro ao criar ausência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/absences/:id
 * Aprovar ou rejeitar falta
 */
router.put('/:id', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    const absence = await Absence.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        reviewNotes
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!absence) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }

    res.json({
      message: `Ausência ${status}`,
      absence
    });
  } catch (error) {
    console.error('Erro ao atualizar ausência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/absences/stats
 * Estatísticas de ausências
 */
router.get('/stats', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    let query = {};
    if (user.role === 'hr' || user.role === 'manager') {
      query.companyId = user.companyId;
    }

    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      Absence.countDocuments({ ...query, status: 'pendente' }),
      Absence.countDocuments({ ...query, status: 'aprovado' }),
      Absence.countDocuments({ ...query, status: 'rejeitado' })
    ]);

    res.json({
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
