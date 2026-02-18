// VotoInformado 2026 — Función: Consulta de Planes de Gobierno
// Usa Gemini 1.5 Flash para responder preguntas basadas en los planes oficiales del JNE

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

let partiesData = null;

function loadPartiesData() {
  if (partiesData) return partiesData;
  // Path relative to project root in Netlify
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
  throw new Error('No se encontró el archivo parties.json');
}

function simpleSearch(text, chunks, maxChunks = 8) {
  const words = text.toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Score each chunk
  const scored = chunks.map(chunk => {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    words.forEach(word => {
      const count = (chunkLower.match(new RegExp(word, 'g')) || []).length;
      score += count;
    });
    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(s => s.chunk);
}

exports.handler = async (event, context) => {
  // CORS headers
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
    const { question, partyId, mode } = JSON.parse(event.body || '{}');
    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta la pregunta' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({ error: 'API key no configurada. Agrega GEMINI_API_KEY en las variables de entorno de Netlify.' })
      };
    }

    const data = loadPartiesData();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Select parties to search
    let partiesToSearch = data.parties;
    if (partyId && partyId !== '') {
      partiesToSearch = data.parties.filter(p => p.id === partyId);
    }

    // Build context from relevant chunks
    let context = '';
    const allCitations = [];

    for (const party of partiesToSearch) {
      const relevantChunks = simpleSearch(question, party.chunks || [], partyId ? 12 : 3);
      if (relevantChunks.length > 0) {
        context += `\n\n══════════════════════════════════════════\n`;
        context += `PLAN DE GOBIERNO: ${party.name}\n`;
        context += `Candidato presidencial: ${party.candidate}\n`;
        context += `Ideología: ${party.ideology}\n`;
        context += `══════════════════════════════════════════\n`;
        relevantChunks.forEach(chunk => {
          context += `[Página ${chunk.page}]\n${chunk.text}\n\n`;
          allCitations.push({ party: party.name, partyId: party.id, page: chunk.page });
        });
      } else if (!partyId && party.summary) {
        // Fallback: use summary if no chunks match
        context += `\n\n— ${party.name} (${party.candidate}) —\n${party.summary.substring(0, 400)}\n`;
      }
    }

    if (!context.trim()) {
      context = 'No se encontraron secciones específicas relacionadas con la consulta en los planes de gobierno disponibles.';
    }

    const prompt = `Eres VotoInformado, el asistente oficial para las Elecciones Generales del Perú 2026.
Tu función es ayudar a los ciudadanos peruanos a tomar decisiones informadas basadas EXCLUSIVAMENTE en los planes de gobierno oficiales registrados ante el Jurado Nacional de Elecciones (JNE).

DOCUMENTOS DEL PLAN DE GOBIERNO DISPONIBLES:
${context}

PREGUNTA DEL CIUDADANO: "${question}"

INSTRUCCIONES CRÍTICAS (sigue estas reglas siempre):
1. SOLO responde con información que aparezca en los documentos proporcionados arriba.
2. Para cada dato importante, cita TEXTUALMENTE el plan con comillas: "texto exacto" — [Nombre del Partido, Pág. X]
3. Si la información solicitada NO aparece en los documentos, dí claramente: "No encontré información sobre este tema en el plan de gobierno de [partido]."
4. Si se pregunta por múltiples partidos, compara sus propuestas de forma imparcial.
5. Responde en español peruano claro y accesible para cualquier ciudadano.
6. Usa formato estructurado con encabezados y bullets cuando sea útil.
7. Sé objetivo y neutral — no favorezcas ni critiques a ningún partido.
8. Si no hay contexto de ningún partido, indícalo claramente.

Responde de manera completa pero concisa, siempre fundamentado en los documentos.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Deduplicate citations
    const seen = new Set();
    const citations = allCitations.filter(c => {
      const key = `${c.partyId}-${c.page}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response, citations })
    };

  } catch (err) {
    console.error('Error en función chat:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno: ' + err.message, response: 'Ocurrió un error al procesar tu consulta. Intenta nuevamente.' })
    };
  }
};
