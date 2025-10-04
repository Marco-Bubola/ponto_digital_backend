/**
 * Script para criar funcionário de vendas para teste no app mobile
 * Execute: node src/scripts/createTestEmployee.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

async function createTestEmployee() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ponto_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');

    // Buscar empresa Tech Solutions
    const company = await Company.findOne({ cnpj: '12345678000190' });
    
    if (!company) {
      console.log('❌ Empresa Tech Solutions não encontrada. Execute createHRUser.js primeiro.');
      process.exit(1);
    }

    console.log('✅ Empresa encontrada:', company.name);

    // Criar funcionário de vendas para teste no app mobile
    const employeeEmail = 'joao.silva@techsolutions.com.br';
    const employeeCPF = '12345678901';
    
    let employee = await User.findOne({ $or: [{ email: employeeEmail }, { cpf: employeeCPF }] });

    if (employee) {
      console.log('\n⚠️  Funcionário já existe:', employeeEmail);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 CREDENCIAIS PARA APP MOBILE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${employee.email}`);
      console.log(`CPF:      ${employee.cpf}`);
      console.log(`Senha:    venda123 (se não mudou)`);
      console.log(`Nome:     ${employee.name}`);
      console.log(`Cargo:    ${employee.position}`);
      console.log(`Depto:    ${employee.department}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      const password = 'venda123'; // Senha padrão para teste
      const hashedPassword = await bcrypt.hash(password, 12);

      employee = new User({
        name: 'João Silva',
        email: employeeEmail,
        password: hashedPassword,
        cpf: employeeCPF, // CPF de teste
        companyId: company._id,
        role: 'employee', // Funcionário comum (não RH)
        department: 'Vendas',
        position: 'Vendedor',
        phone: '(11) 98765-1234',
        isActive: true
      });

      await employee.save();
      
      console.log('\n✅ Funcionário de vendas criado com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 CREDENCIAIS PARA APP MOBILE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${employeeEmail}`);
      console.log(`CPF:      ${employee.cpf}`);
      console.log(`Senha:    ${password}`);
      console.log(`Nome:     ${employee.name}`);
      console.log(`Cargo:    ${employee.position}`);
      console.log(`Depto:    ${employee.department}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Use estas credenciais no app de ponto do celular!');
    }

    console.log('\n📋 RESUMO DO SISTEMA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏢 Empresa: ${company.name}`);
    console.log(`📧 Domínio de email: ${company.emailDomain}`);
    console.log(`🔗 CNPJ: ${company.cnpj}`);
    console.log('');
    console.log('👥 CONTAS DISPONÍVEIS:');
    console.log('');
    console.log('1️⃣  CONTA RH (Painel Web):');
    console.log('   Email: rh@techsolutions.com.br');
    console.log('   Senha: rh123456');
    console.log('   Acesso: http://localhost:3001');
    console.log('');
    console.log('2️⃣  CONTA FUNCIONÁRIO (App Mobile):');
    console.log(`   Email: ${employee.email}`);
    console.log(`   CPF: ${employee.cpf}`);
    console.log('   Senha: venda123');
    console.log('   Acesso: App Flutter de Ponto Digital');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Erro ao criar funcionário:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar script
createTestEmployee();
