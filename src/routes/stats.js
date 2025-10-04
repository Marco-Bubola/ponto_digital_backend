/**
 * Rotas para estatísticas e dashboard
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeRecord = require('../models/TimeRecord');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

/**
 * GET /api/stats/dashboard
 * Estatísticas do dashboard (filtradas por empresa para RH/Manager)
 */
router.get('/dashboard', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const { companyId } = req.query;
    
    // Definir filtro de empresa
    let companyFilter = {};
    if (req.user.role === 'hr' || req.user.role === 'manager') {
      // RH e Manager veem apenas dados da própria empresa
      companyFilter.companyId = req.user.companyId;
    } else if (companyId) {
      // Admin pode filtrar por empresa específica
      companyFilter.companyId = companyId;
    }

    // Total de funcionários
    const totalEmployees = await User.countDocuments({
      ...companyFilter,
      role: 'employee',
      isActive: true
    });

    // Funcionários ativos hoje (registraram ponto)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await TimeRecord.distinct('userId', {
      timestamp: { $gte: today },
      ...(companyFilter.companyId && { 
        userId: { 
          $in: await User.find(companyFilter).distinct('_id') 
        } 
      })
    });

    // Funcionários em trabalho (último registro foi 'entrada' ou 'retorno')
    const workingNow = await TimeRecord.aggregate([
      ...(companyFilter.companyId ? [{
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      }, {
        $match: {
          'user.companyId': companyFilter.companyId
        }
      }] : []),
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$userId',
          lastRecord: { $first: '$type' }
        }
      },
      {
        $match: {
          lastRecord: { $in: ['entrada', 'retorno'] }
        }
      }
    ]);

    // Funcionários em pausa
    const onBreak = await TimeRecord.aggregate([
      ...(companyFilter.companyId ? [{
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      }, {
        $match: {
          'user.companyId': companyFilter.companyId
        }
      }] : []),
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$userId',
          lastRecord: { $first: '$type' }
        }
      },
      {
        $match: {
          lastRecord: 'pausa'
        }
      }
    ]);

    // Registros de ponto do mês atual
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthRecords = await TimeRecord.countDocuments({
      timestamp: { $gte: monthStart },
      ...(companyFilter.companyId && { 
        userId: { 
          $in: await User.find(companyFilter).distinct('_id') 
        } 
      })
    });

    // Estatísticas por departamento
    const byDepartment = await User.aggregate([
      {
        $match: {
          ...companyFilter,
          role: 'employee',
          isActive: true,
          department: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Registros por dia da semana (últimos 7 dias)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recordsByDay = await TimeRecord.aggregate([
      {
        $match: {
          timestamp: { $gte: weekAgo },
          ...(companyFilter.companyId && { 
            userId: { 
              $in: await User.find(companyFilter).distinct('_id') 
            } 
          })
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Se for admin, incluir informações de empresas
    let companiesStats = null;
    if (req.user.role === 'admin') {
      const companies = await Company.find();
      companiesStats = await Promise.all(
        companies.map(async (company) => ({
          _id: company._id,
          name: company.name,
          employeeCount: await User.countDocuments({ 
            companyId: company._id, 
            role: 'employee' 
          }),
          activeToday: await TimeRecord.distinct('userId', {
            timestamp: { $gte: today },
            userId: { 
              $in: await User.find({ companyId: company._id }).distinct('_id') 
            }
          }).then(arr => arr.length)
        }))
      );
    }

    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeToday: activeToday.length,
        workingNow: workingNow.length,
        onBreak: onBreak.length,
        monthRecords,
        byDepartment,
        recordsByDay,
        ...(companiesStats && { companies: companiesStats })
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message 
    });
  }
});

/**
 * GET /api/stats/employee/:id
 * Estatísticas de um funcionário específico
 */
router.get('/employee/:id', auth, requireRole(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Funcionário não encontrado' 
      });
    }

    // Verificar permissão
    if ((req.user.role === 'hr' || req.user.role === 'manager') && 
        employee.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }

    // Registros do mês atual
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthRecords = await TimeRecord.find({
      userId: employee._id,
      timestamp: { $gte: monthStart }
    }).sort({ timestamp: 1 });

    // Total de horas trabalhadas no mês
    let totalHours = 0;
    for (let i = 0; i < monthRecords.length; i += 4) {
      if (monthRecords[i + 3]) { // Se tem saída
        const entrada = monthRecords[i].timestamp;
        const saida = monthRecords[i + 3].timestamp;
        totalHours += (saida - entrada) / (1000 * 60 * 60);
      }
    }

    // Dias trabalhados
    const daysWorked = new Set(
      monthRecords.map(r => r.timestamp.toISOString().split('T')[0])
    ).size;

    res.json({
      success: true,
      stats: {
        employee: {
          name: employee.name,
          department: employee.department,
          position: employee.position
        },
        monthRecords: monthRecords.length,
        totalHours: totalHours.toFixed(2),
        daysWorked,
        averageHoursPerDay: daysWorked > 0 ? (totalHours / daysWorked).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do funcionário:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message 
    });
  }
});

module.exports = router;
