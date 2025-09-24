const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de autenticação JWT
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.userId = user._id;
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Middleware para verificar se dispositivo está autorizado
 */
const deviceAuth = async (req, res, next) => {
  try {
    const deviceId = req.header('X-Device-ID');

    if (!deviceId) {
      return res.status(401).json({ error: 'ID do dispositivo necessário' });
    }

    if (!req.user.isDeviceAuthorized(deviceId)) {
      return res.status(401).json({ error: 'Dispositivo não autorizado' });
    }

    req.deviceId = deviceId;
    next();

  } catch (error) {
    console.error('Erro na autenticação do dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Middleware para verificar permissões de administrador
 */
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Permissão de administrador necessária' });
    }
    next();
  } catch (error) {
    console.error('Erro na verificação de admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { auth, deviceAuth, adminAuth };