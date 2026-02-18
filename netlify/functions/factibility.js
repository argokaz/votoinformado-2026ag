// VotoInformado 2026 — Función: Verificador de Factibilidad
// Analiza la viabilidad de propuestas de campaña usando contexto económico peruano y Gemini

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

let partiesData = null;

function loadPartiesData() {
  if (partiesData) return partiesData;
  const possiblePaths = [
    path.join(__dirname, '../../data/parties.json'),
    path.join(process.cwd(), 'data/parties.json'),
    path.join(__dirname, '../../../data/parties.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      partiesData = JSON.parse(fs.readFileSync(p, 'utf8'));
      return partiesData;
    }
  }
  return null;
}

// Contexto económico del Perú 2025 (base para análisis de factibilidad)
const PERU_CONTEXT = `
CONTEXTO ECONÓMICO Y FISCAL DEL PERÚ (2025-2026):
- PBI: ~S/ 1.1 billones (aprox. USD 290 mil millones)
- Presupuesto General del Estado 2025: ~S/ 240 mil millones
- Déficit fiscal: ~2.8% del PBI
- Deuda pública: ~34% del PBI
- Crecimiento PBI 2024: ~2.7%
- Reservas Internacionales: ~USD 71 mil millones
- Gasto en salud: ~5.3% del PBI
- Gasto en educación: ~4% del PBI
- Informalidad laboral: ~72% de la PEA
- Pobreza: ~27% de la población (2024)
- Sueldo Mínimo Vital (RMV): S/ 1,025 (2024)
- Tasa de desempleo: ~6.5%
- Población: ~34 millones de habitantes
- Costo de un hospital de nivel III: ~S/ 200-500 millones
- El sistema de salud tiene ~2,000 establecimientos de salud
- Canon minero 2024: ~S/ 12 mil millones transferidos a regiones
- Recaudación tributaria total: ~S/ 130 mil millones anuales
`;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { question, partyId } = JSON.parse(event.body || '{}');

    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta la propuesta a analizar' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({ error: 'API key no configurada.', response: '⚠️ Configura GEMINI_API_KEY en Netlify.' })
      };
    }

    // Optionally get context from party's plan
    let partyContext = '';
    if (partyId) {
      try {
        const data = loadPartiesData();
        if (data) {
          const party = data.parties.find(p => p.id === partyId);
          if (party) {
            partyContext = `\nEsta propuesta pertenece al plan de gobierno de ${party.name} (${party.candidate}).\nResumen del partido:\n${party.summary.substring(0, 1000)}\n`;
          }
        }
      } catch (e) {
        // Ignore party data loading errors
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Eres el Verificador de Factibilidad de VotoInformado, un economista y analista de políticas públicas especializado en el Perú.

PROPUESTA A ANALIZAR: "${question}"
${partyContext}

${PERU_CONTEXT}

Tu tarea es analizar si esta propuesta es FACTIBLE en el contexto peruano.

Estructura tu análisis de la siguiente manera:

## FACTIBILIDAD: [PUNTAJE del 0 al 100]
(0 = imposible, 50 = posible pero con serias dificultades, 100 = completamente factible)

## ✅ ¿Es factible?
[Veredicto claro en 1-2 oraciones]

## 💰 Análisis Fiscal
[¿Cuánto costaría? ¿De dónde saldrían los fondos? ¿El presupuesto lo permite?]

## ⏱️ Análisis de Plazo
[¿Es realista en 5 años de gobierno?]

## ⚙️ Viabilidad Técnica e Institucional
[¿El Estado tiene la capacidad técnica y el personal? ¿Hay precedentes?]

## ⚠️ Principales Riesgos y Obstáculos
[¿Qué podría salir mal?]

## 🔄 Casos comparables
[¿Se ha intentado algo similar en Perú o en otros países? ¿Con qué resultado?]

## 💡 Para que sea más factible se necesitaría:
[Ajustes realistas a la propuesta]

INSTRUCCIONES:
- Basa tu análisis en datos económicos reales del Perú
- Sé honesto aunque el resultado sea negativo
- Distingue entre "políticamente deseable" y "económicamente factible"
- Usa cifras concretas cuando sea posible
- Responde en español claro para el ciudadano promedio`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response })
    };

  } catch (err) {
    console.error('Error en función factibility:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, response: 'Error al analizar factibilidad: ' + err.message })
    };
  }
};
