# MedStudy — guía del proyecto

## Arquitectura

La aplicación es una SPA de React/Vite. `src/App.tsx` contiene las rutas y las vistas del MVP; `src/styles.css` contiene el sistema visual responsive. Las rutas de cliente se resuelven con React Router y el fallback de `netlify.toml`.

Las funciones serverless están en `netlify/functions`. `materials.mts` lista, guarda y elimina materiales; almacena el binario en Netlify Blobs y el registro en Netlify Database. `events.mts` gestiona actividades y exámenes. `study.mts` recupera el PDF y solicita a Gemini una salida JSON para el modo elegido. Nunca se debe llevar la llamada de Gemini al navegador.

El esquema de datos vive en `db/schema.ts`. Todo cambio de esquema requiere una migración nueva en `netlify/database/migrations`; no se modifican migraciones ya desplegadas.

## Convenciones

- La interfaz y los mensajes al usuario se escriben en español.
- Se reutilizan `Shell`, `Page`, botones, estados y tarjetas existentes.
- Se mantienen los límites del MVP: sin autenticación real, gamificación, chatbot ni analítica.
- No se incorporan secretos ni claves con prefijo `VITE_`. La IA usa las credenciales inyectadas por Netlify AI Gateway solamente en funciones.
- Los PDFs se validan por su firma real, no solo por el MIME declarado por el navegador, y tienen un límite de 4 MB. El margen bajo el máximo bufferizado de 6 MB cubre base64 y multipart.

## Decisiones no obvias

La aplicación no precarga registros de usuario. Materiales, materias y eventos aparecen únicamente después de crearlos.
