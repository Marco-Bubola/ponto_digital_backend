const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  date: { type: String },
  start: { type: String },
  end: { type: String },
  description: { type: String },
  cpf: { type: String },
  status: { type: String, enum: ['Pendente','Aprovado','Rejeitado'], default: 'Pendente' },
  attachment: {
    originalname: String,
    mimetype: String,
    size: Number
  }
}, { timestamps: true });

adjustmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Adjustment', adjustmentSchema);
