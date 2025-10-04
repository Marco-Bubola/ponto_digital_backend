/**
 * Rotas para gerenciamento de empresas (apenas ADMIN)
 */

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Listar todas as empresas (apenas ADMIN)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    
    // Buscar contagem de funcionários por empresa
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const employeeCount = await User.countDocuments({ companyId: company._id });
        const managerCount = await User.countDocuments({ companyId: company._id, role: 'manager' });
        
        return {
          ...company.toObject(),
          employeeCount,
          managerCount
        };
      })
    );

    res.json({
      success: true,
      companies: companiesWithStats
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar empresas',
      error: error.message 
    });
  }
});

// Buscar uma empresa específica
router.get('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empresa não encontrada' 
      });
    }

    // Buscar funcionários e coordenadores da empresa
    const employees = await User.find({ companyId: company._id }).select('-password');
    const managers = employees.filter(e => e.role === 'manager');
    const staff = employees.filter(e => e.role !== 'manager');

    res.json({
      success: true,
      company: {
        ...company.toObject(),
        managers,
        employees: staff,
        totalEmployees: employees.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar empresa',
      error: error.message 
    });
  }
});

// Criar nova empresa (apenas ADMIN)
router.post('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      name, 
      cnpj, 
      email, 
      emailDomain,
      phone, 
      address 
    } = req.body;

    // Validar campos obrigatórios
    if (!name || !cnpj || !emailDomain) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome, CNPJ e domínio de email são obrigatórios' 
      });
    }

    // Verificar se CNPJ já existe
    const existingCompany = await Company.findOne({ cnpj });
    if (existingCompany) {
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ já cadastrado' 
      });
    }

    // Criar empresa
    const company = new Company({
      name,
      cnpj,
      email: email || `contato@${emailDomain}`,
      emailDomain,
      phone,
      address: address || {},
      isActive: true
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      company
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar empresa',
      error: error.message 
    });
  }
});

// Atualizar empresa (apenas ADMIN)
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      name, 
      cnpj, 
      email, 
      emailDomain,
      phone, 
      address,
      isActive 
    } = req.body;

    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empresa não encontrada' 
      });
    }

    // Verificar se CNPJ já existe em outra empresa
    if (cnpj && cnpj !== company.cnpj) {
      const existingCompany = await Company.findOne({ cnpj });
      if (existingCompany) {
        return res.status(400).json({ 
          success: false, 
          message: 'CNPJ já cadastrado em outra empresa' 
        });
      }
    }

    // Atualizar campos
    if (name) company.name = name;
    if (cnpj) company.cnpj = cnpj;
    if (email) company.email = email;
    if (emailDomain) company.emailDomain = emailDomain;
    if (phone) company.phone = phone;
    if (address) company.address = address;
    if (typeof isActive !== 'undefined') company.isActive = isActive;

    await company.save();

    res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      company
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar empresa',
      error: error.message 
    });
  }
});

// Deletar empresa (apenas ADMIN)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empresa não encontrada' 
      });
    }

    // Verificar se há funcionários vinculados
    const employeeCount = await User.countDocuments({ companyId: company._id });
    
    if (employeeCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Não é possível excluir empresa com ${employeeCount} funcionário(s) vinculado(s). Remova ou transfira os funcionários primeiro.` 
      });
    }

    await Company.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Empresa excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao deletar empresa',
      error: error.message 
    });
  }
});

// Criar coordenador para uma empresa (apenas ADMIN)
router.post('/:id/managers', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, cpf, department, position, phone } = req.body;

    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empresa não encontrada' 
      });
    }

    // Validar campos obrigatórios
    if (!name || !cpf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome e CPF são obrigatórios' 
      });
    }

    // Verificar se CPF ou email já existe
    const existingUser = await User.findOne({ 
      $or: [{ cpf }, { email: email || `${cpf}@temp.com` }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'CPF ou email já cadastrado' 
      });
    }

    // Gerar senha temporária
    const tempPassword = `coord${Math.random().toString(36).slice(-6)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Gerar email se não fornecido
    const managerEmail = email || `coordenador@${company.emailDomain}`;

    // Criar coordenador
    const manager = new User({
      name,
      email: managerEmail,
      cpf,
      password: hashedPassword,
      companyId: company._id,
      role: 'manager',
      department: department || 'Gestão',
      position: position || 'Coordenador',
      phone,
      isActive: true
    });

    await manager.save();

    res.status(201).json({
      success: true,
      message: 'Coordenador criado com sucesso',
      manager: {
        ...manager.toObject(),
        password: undefined
      },
      tempPassword // Retornar senha temporária para informar ao coordenador
    });
  } catch (error) {
    console.error('Erro ao criar coordenador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar coordenador',
      error: error.message 
    });
  }
});

module.exports = router;
