// VotoInformado 2026 — Función: Investigación Web de Candidatos
// Usa Gemini 2.0 Flash con Google Search grounding para buscar información actualizada

const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    const { question } = JSON.parse(event.body || '{}');
    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta la pregunta' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({
          error: 'API key no configurada.',
          response: '⚠️ Se necesita configurar GEMINI_API_KEY en las variables de entorno de Netlify.'
        })
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.0 Flash with Google Search grounding for web search
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} }],
    });

    const searchPrompt = `Eres un periodista de investigación peruana especializado en las Elecciones 2026.

CONSULTA: ${question}

Busca información actualizada en internet sobre esta consulta relacionada con las Elecciones Generales del Perú 2026.

Por favor:
1. Presenta los hechos verificados de forma objetiva y neutral
2. Menciona las fuentes (medios de comunicación, documentos oficiales)
3. Distingue entre investigaciones en curso, sentencias firmes y acusaciones sin resolución
4. Incluye fechas y contexto relevante
5. Si hay investigaciones o condenas, especifica el delito, el órgano investigador y el estado actual
6. Sé imparcial — no juzgues ni tomes partido
7. Responde en español claro para el ciudadano peruano promedio

Nota: Esta información es para ayudar a los ciudadanos a votar informados. Presenta solo hechos, no opiniones.`;

    const result = await model.generateContent(searchPrompt);
    const response = result.response.text();

    // Extract grounding metadata if available
    const groundingMeta = result.response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title,
      url: chunk.web?.uri
    })).filter(s => s.url) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response, sources })
    };

  } catch (err) {
    console.error('Error en función investigate:', err);

    // Fallback if Google Search grounding fails (model not available)
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const { question } = JSON.parse(event.body || '{}');
      const fallbackResult = await fallbackModel.generateContent(
        `Eres un asistente de VotoInformado para las Elecciones Perú 2026.
        El usuario pregunta: "${question}"

        IMPORTANTE: No tienes acceso a internet en este momento.
        Responde basándote en tu conocimiento hasta tu fecha de corte, aclarando que la información puede no estar actualizada.
        Menciona que para información actualizada deben consultar medios como El Comercio, La República, RPP, IDL-Reporteros, o el portal del JNE.

        Proporciona lo que sabes sobre este candidato/partido y sus antecedentes conocidos.`
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          response: '⚠️ Nota: La búsqueda en tiempo real no está disponible. Información basada en conocimiento previo:\n\n' + fallbackResult.response.text() + '\n\n📰 Para información actualizada, consulta: El Comercio, La República, RPP, IDL-Reporteros o portal.jne.gob.pe',
          sources: []
        })
      };
    } catch (fallbackErr) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Error: ' + err.message,
          response: 'Error al buscar información. ' + err.message
        })
      };
    }
  }
};
