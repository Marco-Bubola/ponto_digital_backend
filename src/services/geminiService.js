const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Gera justificativa profissional para solicitação de ajuste de ponto
   * @param {string} userInput - Descrição informal do usuário
   * @param {string} recordType - Tipo do registro (entrada, saida, etc.)
   * @param {Date} date - Data do registro
   * @returns {Promise<string>} - Justificativa profissional gerada
   */
  async generateJustification(userInput, recordType, date) {
    try {
      const prompt = `
        Você é um assistente especializado em gerar justificativas profissionais para solicitações de ajuste de ponto em empresas.
        
        Contexto:
        - Tipo de registro: ${recordType}
        - Data: ${date.toLocaleDateString('pt-BR')}
        - Descrição informal do colaborador: "${userInput}"
        
        Instruções:
        1. Transforme a descrição informal em uma justificativa profissional e respeitosa
        2. Use linguagem corporativa adequada
        3. Seja conciso mas completo
        4. Inclua pedido de compreensão ao final
        5. Mantenha tom formal mas não excessivamente rebuscado
        6. Máximo de 200 palavras
        
        Exemplo de saída esperada:
        "Prezado(a) gestor(a), solicito respeitosamente o ajuste do registro de [tipo] do dia [data], pois [justificativa clara e profissional]. Agradeço a compreensão."
        
        Gere apenas a justificativa, sem explicações adicionais:
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();

    } catch (error) {
      console.error('Erro ao gerar justificativa com Gemini:', error);
      
      // Fallback: justificativa genérica baseada no tipo
      const fallbackJustifications = {
        entrada: `Prezado(a) gestor(a), solicito respeitosamente o ajuste do registro de entrada do dia ${date.toLocaleDateString('pt-BR')}, devido a uma situação imprevista que impediu a marcação no horário correto. Agradeço a compreensão.`,
        saida: `Prezado(a) gestor(a), solicito respeitosamente o ajuste do registro de saída do dia ${date.toLocaleDateString('pt-BR')}, pois inadvertidamente esqueci de realizar a marcação ao final do expediente. Agradeço a compreensão.`,
        pausa: `Prezado(a) gestor(a), solicito respeitosamente o ajuste do registro de pausa do dia ${date.toLocaleDateString('pt-BR')}, devido a uma situação que impossibilitou a marcação no momento adequado. Agradeço a compreensão.`,
        retorno: `Prezado(a) gestor(a), solicito respeitosamente o ajuste do registro de retorno do dia ${date.toLocaleDateString('pt-BR')}, pois houve um imprevisto que afetou a marcação no horário correto. Agradeço a compreensão.`
      };

      return fallbackJustifications[recordType] || fallbackJustifications.entrada;
    }
  }

  /**
   * Analisa o sentimento e urgência de uma justificativa
   * @param {string} text - Texto para análise
   * @returns {Promise<Object>} - Análise do sentimento e urgência
   */
  async analyzeJustification(text) {
    try {
      const prompt = `
        Analise o seguinte texto de justificativa de ajuste de ponto e retorne um JSON com:
        - sentiment: "positive", "neutral", "negative"
        - urgency: "low", "medium", "high"
        - category: categoria da justificativa (ex: "esquecimento", "problema_tecnico", "emergencia", etc.)
        
        Texto: "${text}"
        
        Responda apenas com o JSON, sem explicações:
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        return JSON.parse(response.text().trim());
      } catch (parseError) {
        return {
          sentiment: "neutral",
          urgency: "medium",
          category: "geral"
        };
      }

    } catch (error) {
      console.error('Erro ao analisar justificativa:', error);
      return {
        sentiment: "neutral",
        urgency: "medium",
        category: "geral"
      };
    }
  }
}

module.exports = new GeminiService();