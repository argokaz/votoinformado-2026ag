# 🗳️ VotoInformado 2026 — Elecciones Generales Perú

Plataforma de información electoral basada en IA para las **Elecciones Generales del Perú del 12 de Abril 2026**.

## ✨ Funcionalidades

- **💬 Consulta el Plan de Gobierno** — Pregunta sobre cualquier propuesta y recibe respuestas con citas exactas de los documentos oficiales del JNE
- **🗳️ Quiz Electoral** — Descubre qué partido se alinea con tus valores respondiendo 10 preguntas
- **👤 Candidatos** — Perfiles completos de los 34 candidatos presidenciales con historial judicial
- **🌐 Investigación Web** — Busca noticias e investigaciones actualizadas sobre candidatos
- **⚖️ Comparador** — Compara los planes de hasta 3 partidos lado a lado
- **✅ Verificador de Factibilidad** — Analiza si una propuesta de campaña es económicamente viable

## 🚀 Despliegue en Netlify (paso a paso)

### Opción A — Desde GitHub (recomendado)

1. **Sube el proyecto a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "VotoInformado 2026 — inicial"
   git remote add origin https://github.com/TU_USUARIO/votoinformado-2026.git
   git push -u origin main
   ```

2. **Conecta con Netlify:**
   - Ve a [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import an existing project"
   - Selecciona tu repositorio de GitHub
   - Build command: `echo 'Build complete'`
   - Publish directory: `.` (punto)
   - Haz clic en "Deploy site"

3. **Configura la variable de entorno:**
   - En Netlify: Site settings → Environment variables → Add variable
   - Nombre: `GEMINI_API_KEY`
   - Valor: `AIzaSyCMq_BGOD7Ka6gciYkLwv30hcI2eWIXTcA`
   - Haz clic en "Deploy site" nuevamente para aplicar

### Opción B — Drag & Drop (más rápido)

1. Ve a [app.netlify.com](https://app.netlify.com)
2. Arrastra la carpeta `votoinformado` al área de drop
3. Configura la variable de entorno (ver paso 3 de Opción A)

## ⚠️ Notas importantes

- **Seguridad del API key:** Mueve el `GEMINI_API_KEY` a las variables de entorno de Netlify. No dejes la clave en el código.
- **Tamaño del repositorio:** La carpeta `data/parties.json` (~8 MB) y los PDFs en `planes/` (~50 MB) pueden superar los límites del plan gratuito de Git LFS. Considera usar Netlify Large Media o subir los PDFs a otro CDN.
- **Para repositorios con PDFs grandes:** usa `git lfs track "planes/*.pdf"` antes de hacer commit.

## 🗂️ Estructura del proyecto

```
votoinformado/
├── index.html              ← Aplicación principal (SPA)
├── netlify.toml            ← Configuración de Netlify
├── package.json            ← Dependencias Node.js
├── .env.example            ← Ejemplo de variables de entorno
├── data/
│   └── parties.json        ← Texto extraído de todos los PDFs (8 MB)
├── planes/                 ← PDFs de los 34 planes de gobierno
│   ├── renovacion_popular.pdf
│   ├── fuerza_popular.pdf
│   └── ... (34 archivos)
└── netlify/
    └── functions/
        ├── chat.js         ← Consultas a planes de gobierno (Gemini)
        ├── investigate.js  ← Búsqueda web de candidatos (Gemini + Google Search)
        ├── compare.js      ← Comparación de planes (Gemini)
        └── factibility.js  ← Verificador de factibilidad (Gemini)
```

## 🛠️ Desarrollo local

```bash
# Instalar dependencias
npm install

# Instalar Netlify CLI
npm install -g netlify-cli

# Crear archivo .env con tu API key
cp .env.example .env

# Iniciar servidor de desarrollo
netlify dev
# La app estará en http://localhost:8888
```

## 📊 Fuente de datos

Los planes de gobierno son documentos oficiales presentados ante el **Jurado Nacional de Elecciones (JNE)** por los 34 partidos políticos inscritos para las Elecciones Generales 2026. Toda la información proviene de [Voto Informado JNE](https://votoinformado.jne.gob.pe).

---
*Desarrollado para promover el voto informado en las Elecciones Generales del Perú 2026 · 12 de Abril*
