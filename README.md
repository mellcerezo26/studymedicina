# MedStudy

MedStudy es un prototipo web para estudiantes de medicina. Permite guardar y eliminar documentos PDF, organizarlos por materias propias y transformarlos con Gemini en resúmenes, preguntas interactivas y flashcards. Incluye un calendario simple de actividades y exámenes.

## Tecnologías

- React, TypeScript y Vite
- React Router y CSS responsive
- Netlify Functions
- Gemini mediante Netlify AI Gateway
- Netlify Blobs para PDFs y Netlify Database para metadatos

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
netlify dev --port 8889
```

`npm run dev` inicia únicamente Vite. Para probar carga de PDFs, base de datos y generación con IA se recomienda `netlify dev`, que emula las funciones y servicios de Netlify.

No se necesitan claves en el código. En producción, Netlify AI Gateway inyecta de forma segura la configuración de Gemini en las funciones.

Los PDFs tienen un máximo de 4 MB. Netlify Functions admite 6 MB por petición bufferizada; el margen restante cubre la codificación base64 del transporte y la envoltura multipart para que el archivo llegue completo a la función y a Gemini.

## Comandos

- `npm run dev`: servidor Vite
- `npm run build`: compilación de producción
- `npm run preview`: previsualización del build
