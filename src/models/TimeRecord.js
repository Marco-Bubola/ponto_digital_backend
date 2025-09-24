const mongoose = require('mongoose');

const timeRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['entrada', 'pausa', 'retorno', 'saida'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  deviceInfo: {
    deviceId: {
      type: String,
      required: true
    },
    deviceName: String,
    platform: String, // iOS, Android, etc.
    appVersion: String
  },
  validation: {
    faceRecognition: {
      status: {
        type: String,
        enum: ['success', 'failed', 'skipped'],
        required: true
      },
      confidence: Number,
      imageUrl: String
    },
    geolocation: {
      status: {
        type: String,
        enum: ['success', 'failed', 'skipped'],
        required: true
      },
      distanceFromWorkplace: Number,
      workLocationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkLocation'
      }
    },
    deviceAuth: {
      status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
      }
    }
  },
  overallStatus: {
    type: String,
    enum: ['valid', 'invalid', 'pending_review'],
    required: true
  },
  isSynced: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para otimização
timeRecordSchema.index({ userId: 1, timestamp: -1 });
timeRecordSchema.index({ timestamp: -1 });
timeRecordSchema.index({ overallStatus: 1 });

// Método para verificar se o registro é válido
timeRecordSchema.methods.isValid = function() {
  return this.validation.faceRecognition.status === 'success' &&
         this.validation.geolocation.status === 'success' &&
         this.validation.deviceAuth.status === 'success';
};

// Método estático para buscar registros por período
timeRecordSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('TimeRecord', timeRecordSchema);