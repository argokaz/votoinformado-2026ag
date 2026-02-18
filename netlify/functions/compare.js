// VotoInformado 2026 — Función: Comparación de Planes de Gobierno
// Compara propuestas de 2-3 partidos usando sus planes oficiales y Gemini

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
  throw new Error('No se encontró parties.json');
}

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
    const { partyIds, partyNames } = JSON.parse(event.body || '{}');

    if (!partyIds || partyIds.length < 2) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Se necesitan al menos 2 partidos' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({ error: 'API key no configurada.', response: '⚠️ Configura GEMINI_API_KEY en Netlify.' })
      };
    }

    const data = loadPartiesData();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context for selected parties
    let context = '';
    for (const partyId of partyIds) {
      const party = data.parties.find(p => p.id === partyId);
      if (!party) continue;

      context += `\n\n════════════════════════\n`;
      context += `PARTIDO: ${party.name}\n`;
      context += `CANDIDATO: ${party.candidate}\n`;
      context += `IDEOLOGÍA: ${party.ideology}\n`;
      context += `════════════════════════\n`;

      // Include summary + first relevant chunks
      context += party.summary.substring(0, 2000) + '\n';

      // Add a few more chunks from later in the document
      const lateChunks = (party.chunks || []).slice(10, 20);
      lateChunks.forEach(chunk => {
        context += `[Pág. ${chunk.page}] ${chunk.text.substring(0, 400)}\n\n`;
      });
    }

    const prompt = `Eres VotoInformado, el asistente electoral oficial para las Elecciones Perú 2026.

PLANES DE GOBIERNO DE LOS PARTIDOS SELECCIONADOS:
${context}

TAREA: Elabora una COMPARACIÓN COMPLETA Y OBJETIVA de los planes de gobierno de: ${partyNames.join(', ')}.

Estructura tu respuesta así:

## 🔍 Comparación: ${partyNames.join(' vs. ')}

### 📊 Resumen de Posturas Ideológicas
[Diferencias y similitudes fundamentales]

### 🔒 Seguridad Ciudadana
[Qué propone cada partido — cita textual cuando sea posible]

### 💰 Economía y Empleo
[Propuestas económicas de cada uno]

### 🏥 Salud
[Propuestas en salud pública y acceso]

### 📚 Educación
[Propuestas educativas]

### 🌿 Medio Ambiente
[Posiciones sobre minería, ambiente y recursos naturales]

### 🏛️ Lucha Anticorrupción
[Mecanismos propuestos contra la corrupción]

### ⚡ Propuestas más originales o diferenciadoras
[Lo que hace único a cada plan]

### ✅ Conclusión para el votante
[Cuál sería el perfil de votante de cada partido, de forma objetiva y sin juzgar]

INSTRUCCIONES:
- Sé completamente imparcial y objetivo
- Cita textualmente cuando sea posible: "texto exacto" — [Partido, Pág. X]
- Señala cuando un partido no tiene propuestas claras sobre un tema
- Responde en español claro y accesible`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response })
    };

  } catch (err) {
    console.error('Error en función compare:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, response: 'Error al comparar partidos: ' + err.message })
    };
  }
};
