const express = require('express');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tickets
 * Listar tickets/ocorrências
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const user = await User.findById(req.userId);

    let query = {};

    // Filtrar por empresa
    if (user.role === 'hr' || user.role === 'manager') {
      query.companyId = user.companyId;
    }

    // Employee vê apenas seus próprios tickets
    if (user.role === 'employee') {
      query.userId = req.userId;
    }

    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .populate('userId', 'name email department')
      .populate('resolvedBy', 'name')
      .populate('responses.userId', 'name')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/tickets
 * Criar novo ticket
 */
router.post('/', auth, async (req, res) => {
  try {
    const { subject, description, priority, category } = req.body;
    const user = await User.findById(req.userId);

    const ticket = new Ticket({
      userId: req.userId,
      companyId: user.companyId,
      subject,
      description,
      priority,
      category
    });

    await ticket.save();

    res.status(201).json({
      message: 'Ticket criado com sucesso',
      ticket
    });
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/tickets/:id/responses
 * Adicionar resposta ao ticket
 */
router.post('/:id/responses', auth, async (req, res) => {
  try {
    const { message } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    ticket.responses.push({
      userId: req.userId,
      message
    });

    // Se não estava em análise, marcar como em análise
    if (ticket.status === 'aberto') {
      ticket.status = 'em_analise';
    }

    await ticket.save();
    await ticket.populate('responses.userId', 'name');

    res.json({
      message: 'Resposta adicionada com sucesso',
      ticket
    });
  } catch (error) {
    console.error('Erro ao adicionar resposta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/tickets/:id/resolve
 * Marcar ticket como resolvido
 */
router.put('/:id/resolve', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolvido',
        resolvedBy: req.userId,
        resolvedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    res.json({
      message: 'Ticket marcado como resolvido',
      ticket
    });
  } catch (error) {
    console.error('Erro ao resolver ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
