const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timeRecordRoutes = require('./routes/timeRecords');
const adjustmentRoutes = require('./routes/adjustments');
const companyRoutes = require('./routes/companies');
const employeeRoutes = require('./routes/employees');
const statsRoutes = require('./routes/stats');
const absenceRoutes = require('./routes/absences');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());
// CORS liberado para qualquer origem (desenvolvimento)
app.use(cors({
  origin: '*',
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ponto_digital', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/time-records', timeRecordRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/tickets', ticketRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    app: 'Ponto Digital API',
    version: '1.0.0'
  });
});

// Middleware de tratamento de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado!'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Ponto Digital API v1.0.0`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});