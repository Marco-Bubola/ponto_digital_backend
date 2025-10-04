const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['baixa', 'média', 'alta'],
    default: 'média'
  },
  status: {
    type: String,
    enum: ['aberto', 'em_analise', 'resolvido', 'fechado'],
    default: 'aberto'
  },
  category: {
    type: String,
    enum: ['ponto', 'sistema', 'duvida', 'reclamacao', 'sugestao', 'outro'],
    default: 'outro'
  },
  responses: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);
