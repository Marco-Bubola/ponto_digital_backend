const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/employees
 * Listar funcionários (RH/Manager vê apenas da própria empresa, Admin vê todos)
 */
router.get('/', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const { companyId, search, department, isActive } = req.query;
    
    // Filtros
    const filters = {};
    
    // RH e Manager só veem funcionários da própria empresa
    if (req.user.role === 'hr' || req.user.role === 'manager') {
      filters.companyId = req.user.companyId;
    } else if (companyId) {
      // Admin pode filtrar por empresa específica
      filters.companyId = companyId;
    }
    
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) {
      filters.department = department;
    }
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    const employees = await User.find(filters)
      .select('-password -faceEncodingData')
      .populate('companyId', 'name cnpj emailDomain')
      .sort({ name: 1 });
    
    res.json({ employees });
  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({ error: 'Erro ao listar funcionários' });
  }
});

/**
 * GET /api/employees/:id
 * Obter detalhes de um funcionário
 */
router.get('/:id', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-password -faceEncodingData')
      .populate('companyId', 'name cnpj emailDomain');
    
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    // RH e Manager só podem ver funcionários da própria empresa
    if ((req.user.role === 'hr' || req.user.role === 'manager') && 
        employee.companyId._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json({ employee });
  } catch (error) {
    console.error('Erro ao obter funcionário:', error);
    res.status(500).json({ error: 'Erro ao obter funcionário' });
  }
});

/**
 * POST /api/employees
 * Criar novo funcionário com email corporativo
 */
router.post('/', auth, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const { name, cpf, department, position, phone, role } = req.body;
    
    // Validações
    if (!name || !cpf || !department) {
      return res.status(400).json({ 
        error: 'Nome, CPF e departamento são obrigatórios' 
      });
    }
    
    // Verificar se CPF já existe
    const existingUser = await User.findOne({ cpf });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Já existe um funcionário com este CPF' 
      });
    }
    
    // Buscar empresa
    const companyId = req.user.role === 'hr' ? req.user.companyId : req.body.companyId;
    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    // Gerar email corporativo baseado no departamento
    // Exemplo: vendas@empresa.com, marketing@empresa.com, rh@empresa.com
    const departmentSlug = department.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
    
    const email = `${departmentSlug}@${company.emailDomain}`;
    
    // Verificar se email já existe
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      // Se já existe, adicionar número sequencial
      let counter = 1;
      let newEmail = email;
      while (await User.findOne({ email: newEmail })) {
        newEmail = `${departmentSlug}${counter}@${company.emailDomain}`;
        counter++;
      }
      email = newEmail;
    }
    
    // Gerar senha temporária (será enviada por email em produção)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    
    // Criar funcionário
    const employee = new User({
      name,
      email,
      password: hashedPassword,
      cpf,
      companyId,
      department,
      position: position || department,
      phone,
      role: role || 'employee',
      isActive: true
    });
    
    await employee.save();
    
    // Retornar dados (incluindo senha temporária para o RH informar)
    res.status(201).json({
      message: 'Funcionário criado com sucesso',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        cpf: employee.cpf,
        department: employee.department,
        position: employee.position,
        phone: employee.phone,
        role: employee.role,
        company: {
          id: company._id,
          name: company.name,
          emailDomain: company.emailDomain
        }
      },
      temporaryPassword: tempPassword // Senha temporária para informar ao funcionário
    });
  } catch (error) {
    console.error('Erro ao criar funcionário:', error);
    res.status(500).json({ error: 'Erro ao criar funcionário' });
  }
});

/**
 * PUT /api/employees/:id
 * Atualizar funcionário
 */
router.put('/:id', auth, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const { name, department, position, phone, isActive, role } = req.body;
    
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    // RH só pode editar funcionários da própria empresa
    if (req.user.role === 'hr' && employee.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Atualizar campos permitidos
    if (name) employee.name = name;
    if (department) employee.department = department;
    if (position) employee.position = position;
    if (phone) employee.phone = phone;
    if (isActive !== undefined) employee.isActive = isActive;
    if (role && req.user.role === 'admin') employee.role = role; // Apenas admin pode mudar role
    
    await employee.save();
    
    const updatedEmployee = await User.findById(employee._id)
      .select('-password -faceEncodingData')
      .populate('companyId', 'name cnpj emailDomain');
    
    res.json({
      message: 'Funcionário atualizado com sucesso',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    res.status(500).json({ error: 'Erro ao atualizar funcionário' });
  }
});

/**
 * DELETE /api/employees/:id
 * Desativar funcionário (soft delete)
 */
router.delete('/:id', auth, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    // RH só pode desativar funcionários da própria empresa
    if (req.user.role === 'hr' && employee.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Soft delete - apenas desativa
    employee.isActive = false;
    await employee.save();
    
    res.json({
      message: 'Funcionário desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar funcionário:', error);
    res.status(500).json({ error: 'Erro ao desativar funcionário' });
  }
});

/**
 * GET /api/employees/stats/dashboard
 * Estatísticas para o dashboard do RH
 */
router.get('/stats/dashboard', auth, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const companyId = req.user.role === 'hr' ? req.user.companyId : req.query.companyId;
    
    const totalEmployees = await User.countDocuments({ 
      companyId, 
      isActive: true,
      role: { $ne: 'hr' }
    });
    
    const totalInactive = await User.countDocuments({ 
      companyId, 
      isActive: false 
    });
    
    // Estatísticas por departamento
    const byDepartment = await User.aggregate([
      { 
        $match: { 
          companyId: require('mongoose').Types.ObjectId(companyId),
          isActive: true 
        } 
      },
      { 
        $group: { 
          _id: '$department', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      totalEmployees,
      totalInactive,
      byDepartment
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

module.exports = router;
