/**
 * Script para criar usuário ADMIN (super usuário)
 * Execute: node src/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ponto_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');

    // Buscar empresa Tech Solutions (ou criar uma fake para o admin)
    let company = await Company.findOne({ cnpj: '12345678000190' });
    
    if (!company) {
      console.log('⚠️  Empresa não encontrada, criando empresa padrão...');
      company = new Company({
        name: 'Sistema Ponto Digital',
        cnpj: '00000000000000',
        email: 'admin@pontodigital.com',
        emailDomain: 'pontodigital.com',
        phone: '(11) 0000-0000',
        isActive: true
      });
      await company.save();
    }

    // Verificar se já existe admin
    const existingAdmin = await User.findOne({ email: 'admin@pontodigital.com' });
    
    if (existingAdmin) {
      console.log('\n⚠️  Usuário ADMIN já existe!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 CREDENCIAIS DE ADMIN:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    admin@pontodigital.com');
      console.log('Senha:    admin123456');
      console.log('Role:     ADMIN (Super Usuário)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      const password = 'admin123456';
      const hashedPassword = await bcrypt.hash(password, 12);

      const admin = new User({
        name: 'Administrador do Sistema',
        email: 'admin@pontodigital.com',
        password: hashedPassword,
        cpf: '99999999999',
        companyId: company._id,
        role: 'admin', // Super usuário
        department: 'Administração',
        position: 'Administrador',
        phone: '(11) 99999-9999',
        isActive: true
      });

      await admin.save();
      
      console.log('\n✅ Usuário ADMIN criado com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 CREDENCIAIS DE ADMIN:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${admin.email}`);
      console.log(`Senha:    ${password}`);
      console.log('Role:     ADMIN (Super Usuário)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  IMPORTANTE: Altere esta senha no primeiro acesso!');
    }

    console.log('\n📋 HIERARQUIA DE ACESSOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  ADMIN (Super Usuário):');
    console.log('   - Gerencia todas as empresas');
    console.log('   - Cria coordenadores');
    console.log('   - Acessa todos os dados');
    console.log('');
    console.log('2️⃣  MANAGER (Coordenador):');
    console.log('   - Gerencia funcionários da sua empresa');
    console.log('   - Visualiza relatórios da empresa');
    console.log('   - Aprova ajustes de ponto');
    console.log('');
    console.log('3️⃣  HR (Recursos Humanos):');
    console.log('   - Gerencia funcionários da sua empresa');
    console.log('   - Cria novos funcionários');
    console.log('   - Gera relatórios');
    console.log('');
    console.log('4️⃣  EMPLOYEE (Funcionário):');
    console.log('   - Registra ponto no app mobile');
    console.log('   - Visualiza próprios registros');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Acesse http://localhost:3001');
    console.log('2. Login como ADMIN: admin@pontodigital.com / admin123456');
    console.log('3. Crie empresas e coordenadores pelo painel');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexão com MongoDB fechada');
    process.exit(0);
  }
}

createAdmin();
