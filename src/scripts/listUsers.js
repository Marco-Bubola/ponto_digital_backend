/**
 * Script para listar todos os usuários cadastrados
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ponto_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = await User.find().populate('companyId');
    const company = await Company.findOne({ cnpj: '12345678000190' });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USUÁRIOS CADASTRADOS NO SISTEMA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n🏢 Empresa: ${company ? company.name : 'N/A'}`);
    console.log(`📧 Domínio: ${company ? company.emailDomain : 'N/A'}\n`);

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 CPF: ${user.cpf}`);
      console.log(`   👤 Role: ${user.role.toUpperCase()}`);
      console.log(`   🏢 Departamento: ${user.department || 'N/A'}`);
      console.log(`   💼 Cargo: ${user.position || 'N/A'}`);
      console.log(`   📱 Telefone: ${user.phone || 'N/A'}`);
      console.log(`   ✅ Status: ${user.isActive ? 'Ativo' : 'Inativo'}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nTotal: ${users.length} usuário(s) cadastrado(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Mostrar credenciais para teste
    const hrUser = users.find(u => u.role === 'hr');
    const employeeUser = users.find(u => u.role === 'employee');

    console.log('🔑 CREDENCIAIS PARA TESTE:\n');
    
    if (hrUser) {
      console.log('1️⃣  PAINEL WEB RH (http://localhost:3001)');
      console.log(`   Email: ${hrUser.email}`);
      console.log('   Senha: rh123456\n');
    }

    if (employeeUser) {
      console.log('2️⃣  APP MOBILE DE PONTO (Flutter)');
      console.log(`   Email: ${employeeUser.email}`);
      console.log(`   CPF: ${employeeUser.cpf}`);
      console.log('   Senha: venda123 (ou senha configurada)\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

listUsers();
