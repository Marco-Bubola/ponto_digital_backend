const mongoose = require('mongoose');

const absenceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['atestado_medico', 'falta_justificada', 'falta_injustificada', 'licenca', 'ferias'],
    default: 'falta_justificada'
  },
  status: {
    type: String,
    enum: ['pendente', 'aprovado', 'rejeitado'],
    default: 'pendente'
  },
  attachment: {
    url: String,
    filename: String,
    uploadedAt: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Absence', absenceSchema);
