/**
 * Script para criar empresa e usuário RH inicial
 * Execute: node src/scripts/createHRUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

async function createHRUser() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ponto_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');

    // Criar ou buscar empresa
    let company = await Company.findOne({ cnpj: '12345678000190' });
    
    if (!company) {
      company = new Company({
        name: 'Tech Solutions Ltda',
        cnpj: '12345678000190',
        email: 'contato@techsolutions.com.br',
        emailDomain: 'techsolutions.com.br', // Domínio para emails corporativos
        phone: '(11) 3000-0000',
        address: {
          street: 'Av. Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100'
        },
        isActive: true
      });
      
      await company.save();
      console.log('✅ Empresa criada:', company.name);
    } else {
      // Atualizar empresa existente com emailDomain se não tiver
      if (!company.emailDomain) {
        company.emailDomain = 'techsolutions.com.br';
        await company.save();
        console.log('✅ Empresa atualizada com emailDomain');
      }
      console.log('✅ Empresa já existe:', company.name);
    }

    // Criar usuário RH
    const hrEmail = `rh@${company.emailDomain}`;
    let hrUser = await User.findOne({ email: hrEmail });

    if (!hrUser) {
      const password = 'rh123456'; // Senha padrão - DEVE ser alterada em produção!
      const hashedPassword = await bcrypt.hash(password, 12);

      hrUser = new User({
        name: 'RH Admin',
        email: hrEmail,
        password: hashedPassword,
        cpf: '11111111111', // CPF fictício único
        companyId: company._id,
        role: 'hr',
        department: 'Recursos Humanos',
        position: 'Gerente de RH',
        phone: '(11) 99999-0000',
        isActive: true
      });

      await hrUser.save();
      console.log('\n✅ Usuário RH criado com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 CREDENCIAIS DE ACESSO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${hrEmail}`);
      console.log(`Senha:    ${password}`);
      console.log(`Empresa:  ${company.name}`);
      console.log(`Role:     RH (Recursos Humanos)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  IMPORTANTE: Altere esta senha no primeiro acesso!');
    } else {
      console.log('\n⚠️  Usuário RH já existe:', hrEmail);
    }

    // Criar alguns funcionários de exemplo
    const departments = ['Vendas', 'Marketing', 'TI', 'Financeiro'];
    
    for (const dept of departments) {
      const deptSlug = dept.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const email = `${deptSlug}@${company.emailDomain}`;
      
      const existingEmployee = await User.findOne({ email });
      
      if (!existingEmployee) {
        const tempPassword = 'func123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        
        const employee = new User({
          name: `Funcionário ${dept}`,
          email,
          password: hashedPassword,
          cpf: `${Math.floor(Math.random() * 100000000000)}`,
          companyId: company._id,
          role: 'employee',
          department: dept,
          position: `Analista de ${dept}`,
          phone: `(11) 9${Math.floor(Math.random() * 100000000)}`,
          isActive: true
        });
        
        await employee.save();
        console.log(`✅ Funcionário criado: ${email} (senha: ${tempPassword})`);
      }
    }

    console.log('\n✅ Setup completo!');
    console.log('\n🚀 Próximos passos:');
    console.log('1. Acesse http://localhost:3001');
    console.log(`2. Faça login com: ${hrEmail} / rh123456`);
    console.log('3. Gerencie funcionários pelo painel RH');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário RH:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar script
createHRUser();
