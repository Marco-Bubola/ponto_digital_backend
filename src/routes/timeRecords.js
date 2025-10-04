const express = require('express');
const TimeRecord = require('../models/TimeRecord');
const { auth, deviceAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/time-records
 * Registrar novo ponto
 */
router.post('/', auth, deviceAuth, async (req, res) => {
  try {
    const { type, latitude, longitude, faceImageUrl } = req.body;

    const timeRecord = new TimeRecord({
      userId: req.userId,
      type,
      location: { latitude, longitude },
      deviceInfo: {
        deviceId: req.deviceId,
        deviceName: req.header('X-Device-Name') || 'Unknown',
        platform: req.header('X-Platform') || 'Unknown',
        appVersion: req.header('X-App-Version') || '1.0.0'
      },
      validation: {
        faceRecognition: {
          status: faceImageUrl ? 'success' : 'skipped',
          imageUrl: faceImageUrl
        },
        geolocation: {
          status: 'success' // Implementar validação real
        },
        deviceAuth: {
          status: 'success'
        }
      },
      overallStatus: 'valid'
    });

    await timeRecord.save();

    res.status(201).json({
      message: 'Ponto registrado com sucesso',
      record: timeRecord
    });

  } catch (error) {
    console.error('Erro ao registrar ponto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/time-records
 * Listar registros de ponto do usuário (ou de qualquer funcionário se for RH/Admin)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, userId } = req.query;
    
    // Se userId for fornecido e o usuário for RH/Admin, buscar registros do funcionário especificado
    // Caso contrário, buscar apenas registros do próprio usuário logado
    let targetUserId = req.userId;
    
    if (userId && (req.user.role === 'hr' || req.user.role === 'admin' || req.user.role === 'manager')) {
      targetUserId = userId;
    }
    
    const query = { userId: targetUserId };
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await TimeRecord.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TimeRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;