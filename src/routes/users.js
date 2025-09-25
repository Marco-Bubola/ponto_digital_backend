const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/profile
 * Obter perfil do usuário logado
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('companyId')
      .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/users
 * Listar todos os usuários (apenas admin)
 */
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

/**
 * POST /api/users/devices
 * Autorizar um novo dispositivo para o usuário autenticado
 */
router.post('/devices', auth, async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId é necessário' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    try {
      user.addAuthorizedDevice(deviceId, deviceName || 'Unknown');
      await user.save();
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    res.status(201).json({ message: 'Dispositivo autorizado', deviceId });

  } catch (error) {
    console.error('Erro ao autorizar dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/users/devices
 * Listar dispositivos autorizados do usuário autenticado
 */
router.get('/devices', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ devices: user.authorizedDevices });
  } catch (error) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/users/devices/:deviceId
 * Remover dispositivo autorizado do usuário autenticado
 */
router.delete('/devices/:deviceId', auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const before = user.authorizedDevices.length;
    user.authorizedDevices = user.authorizedDevices.filter(d => d.deviceId !== deviceId);
    if (user.authorizedDevices.length === before) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }
    await user.save();
    res.json({ message: 'Dispositivo removido', deviceId });
  } catch (error) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});