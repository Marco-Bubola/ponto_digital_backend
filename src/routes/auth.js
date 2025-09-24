const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Registro de novo usuário
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, cpf, companyId } = req.body;

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { cpf }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Usuário já existe com este email ou CPF' 
      });
    }

    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const user = new User({
      name,
      email,
      password: hashedPassword,
      cpf,
      companyId
    });

    await user.save();

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/auth/login
 * Login do usuário
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;

    // Buscar usuário
    const user = await User.findOne({ email }).populate('companyId');
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    // Autorizar dispositivo se necessário
    if (deviceId && !user.isDeviceAuthorized(deviceId)) {
      try {
        user.addAuthorizedDevice(deviceId, deviceName);
        await user.save();
      } catch (deviceError) {
        return res.status(400).json({ error: deviceError.message });
      }
    }

    // Atualizar último login
    user.lastLoginAt = new Date();
    await user.save();

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.companyId
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/auth/me
 * Obter dados do usuário logado
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('companyId')
      .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/auth/logout
 * Logout do usuário (invalidar token)
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Em uma implementação mais robusta, você adicionaria o token a uma blacklist
    // Por agora, apenas confirmamos o logout
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;