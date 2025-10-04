// Script para criar dados de teste para Ausências e Tickets
const mongoose = require('mongoose');
const Absence = require('../models/Absence');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Company = require('../models/Company');

async function createTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ponto_digital');
    console.log('✅ Conectado ao MongoDB');

    // Buscar empresa e usuários
    const company = await Company.findOne({ name: 'Tech Solutions Ltda' });
    if (!company) {
      console.log('❌ Empresa não encontrada');
      process.exit(1);
    }

    const employees = await User.find({ 
      companyId: company._id, 
      role: 'employee' 
    });

    if (employees.length === 0) {
      console.log('❌ Nenhum funcionário encontrado');
      process.exit(1);
    }

    console.log(`\n📊 Criando dados de teste para ${employees.length} funcionários...\n`);

    // Criar ausências de teste
    const absences = [
      {
        userId: employees[0]._id,
        companyId: company._id,
        date: new Date('2025-01-15'),
        reason: 'Consulta médica de rotina',
        type: 'atestado_medico',
        status: 'pendente',
        attachment: {
          filename: 'atestado_medico.pdf',
          url: '/uploads/atestados/atestado_medico.pdf',
          uploadedAt: new Date()
        }
      },
      {
        userId: employees[1] ? employees[1]._id : employees[0]._id,
        companyId: company._id,
        date: new Date('2025-01-10'),
        reason: 'Acompanhamento familiar ao médico',
        type: 'falta_justificada',
        status: 'aprovado',
        reviewedAt: new Date(),
        reviewNotes: 'Aprovado - situação familiar'
      },
      {
        userId: employees[0]._id,
        companyId: company._id,
        date: new Date('2025-01-20'),
        reason: 'Problema pessoal urgente',
        type: 'falta_justificada',
        status: 'pendente'
      }
    ];

    await Absence.deleteMany({}); // Limpar dados antigos
    await Absence.insertMany(absences);
    console.log(`✅ ${absences.length} ausências criadas`);

    // Criar tickets de teste
    const tickets = [
      {
        userId: employees[0]._id,
        companyId: company._id,
        subject: 'Erro no registro de saída',
        description: 'O sistema não está registrando meu horário de saída corretamente. Ontem marquei saída às 18h mas aparece 17h no sistema.',
        priority: 'alta',
        status: 'aberto',
        category: 'ponto',
        responses: []
      },
      {
        userId: employees[1] ? employees[1]._id : employees[0]._id,
        companyId: company._id,
        subject: 'Dúvida sobre banco de horas',
        description: 'Gostaria de saber como consultar meu saldo de horas extras acumuladas e quando posso usar.',
        priority: 'baixa',
        status: 'resolvido',
        category: 'duvida',
        responses: [
          {
            userId: employees[0]._id,
            message: 'Você pode consultar seu banco de horas no menu Relatórios do aplicativo. Para usar, precisa solicitar com 48h de antecedência.',
            createdAt: new Date()
          }
        ],
        resolvedAt: new Date()
      },
      {
        userId: employees[0]._id,
        companyId: company._id,
        subject: 'Aplicativo travando ao registrar ponto',
        description: 'Nas últimas 3 vezes que tentei registrar o ponto pela manhã, o app travou e precisei reiniciar. Isso está causando atraso nos meus registros.',
        priority: 'alta',
        status: 'em_analise',
        category: 'sistema',
        responses: [
          {
            userId: employees[0]._id,
            message: 'Estamos analisando o problema. Por favor, nos informe a versão do seu aplicativo e modelo do celular.',
            createdAt: new Date()
          }
        ]
      },
      {
        userId: employees[2] ? employees[2]._id : employees[0]._id,
        companyId: company._id,
        subject: 'Sugestão de melhoria no app',
        description: 'Seria útil ter uma notificação lembrando de registrar o ponto de saída, pois às vezes esqueço.',
        priority: 'média',
        status: 'aberto',
        category: 'sugestao',
        responses: []
      }
    ];

    await Ticket.deleteMany({}); // Limpar dados antigos
    await Ticket.insertMany(tickets);
    console.log(`✅ ${tickets.length} tickets criados`);

    console.log('\n🎉 Dados de teste criados com sucesso!\n');
    console.log('📋 Resumo:');
    console.log(`   - ${absences.length} ausências (${absences.filter(a => a.status === 'pendente').length} pendentes)`);
    console.log(`   - ${tickets.length} tickets (${tickets.filter(t => t.status === 'aberto').length} abertos, ${tickets.filter(t => t.status === 'em_analise').length} em análise, ${tickets.filter(t => t.status === 'resolvido').length} resolvidos)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createTestData();
