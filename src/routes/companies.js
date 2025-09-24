const express = require('express');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/companies
 * Listar empresas
 */
router.get('/', auth, async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true });
    res.json(companies);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/companies
 * Criar nova empresa
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, cnpj, email, phone, address } = req.body;
    
    const company = new Company({
      name,
      cnpj,
      email,
      phone,
      address
    });
    
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;