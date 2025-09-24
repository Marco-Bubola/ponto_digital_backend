const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  cpf: {
    type: String,
    required: true,
    unique: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  profileImageUrl: {
    type: String,
    default: null
  },
  authorizedDevices: [{
    deviceId: String,
    deviceName: String,
    authorizedAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  faceEncodingData: {
    type: String, // Base64 encoded face data para reconhecimento
    default: null
  }
}, {
  timestamps: true
});

// Índices para otimização
userSchema.index({ email: 1 });
userSchema.index({ cpf: 1 });
userSchema.index({ companyId: 1 });

// Método para verificar se dispositivo está autorizado
userSchema.methods.isDeviceAuthorized = function(deviceId) {
  return this.authorizedDevices.some(device => device.deviceId === deviceId);
};

// Método para adicionar dispositivo autorizado
userSchema.methods.addAuthorizedDevice = function(deviceId, deviceName) {
  const maxDevices = 3; // Baseado nas constantes do app
  
  if (this.authorizedDevices.length >= maxDevices) {
    throw new Error(`Máximo de ${maxDevices} dispositivos permitidos`);
  }
  
  if (!this.isDeviceAuthorized(deviceId)) {
    this.authorizedDevices.push({
      deviceId,
      deviceName,
      authorizedAt: new Date()
    });
  }
};

module.exports = mongoose.model('User', userSchema);