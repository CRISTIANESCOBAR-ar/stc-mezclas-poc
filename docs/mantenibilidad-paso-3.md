# Mantenibilidad — paso 3

## Diagnóstico

Las reglas numéricas y de stock ya están en `shared/`; el optimizador está en
un servicio independiente. Configuración, autenticación y migraciones también
tienen módulos propios. Esa separación debe conservarse.

Los puntos que todavía dificultan los cambios son:

- Pantallas de ensayos muy grandes. HVI tiene aproximadamente 145 KB;
  ResumenEnsayos 133 KB y Uster 110 KB. Mezclan presentación, importación,
  estadísticas y exportaciones, lo que amplía el riesgo de cada modificación.
- Rutas de ensayos que contienen SQL, transformación de filas y transacciones.
  Cambiar PostgreSQL por otra fuente requiere intervenir esas rutas.
- Llamadas HTTP repartidas entre pantallas y servicios, con lectura de errores
  repetida. Existían además dos transportes: Axios y fetch.
- PLAN.md conserva el alcance original de la PoC, anterior a ensayos y seguridad.
  README y los documentos de cada paso describen el estado actual.
- Había 779 archivos de dependencias instaladas versionados, pese a la regla
  `node_modules/` de `.gitignore`. Ignorar archivos no retira los ya versionados.

## Primera parte implementada

- `apiClient.js`: lectura JSON y errores con estado HTTP e identificador de
  solicitud. Usa `apiFetch`, que conserva sesión, CSRF y cierre por expiración.
  No reintenta automáticamente escrituras.
- `api.js` y `dataService.js` usan ese cliente. Conservan sus exportaciones y
  formatos de retorno para no cambiar a sus consumidores. Los servicios de
  `api.js` conservan su límite de diez segundos.
- `npm run check` desde la raíz ejecuta pruebas del backend, pruebas del frontend
  y compilación del frontend. No inicia el servidor ni modifica la base de datos.
- Pruebas del contrato JSON, errores y envío de importaciones con CSRF.
- Se retiraron esos 779 archivos del índice de Git con `git rm --cached`.
  Permanecen instalados en la notebook; las instalaciones se reproducen mediante
  los `package-lock.json` de backend y frontend y `npm ci`.

Los fetch directos de las demás pantallas siguen usando el transporte seguro
`apiFetch`; su migración a `requestJson` se hará junto a cada extracción de pantalla.

## Siguientes partes, en orden

1. Separar Uster: parser puro, servicio de ensayos, estado de pantalla mediante
   un composable y componentes de tabla/gráficos. Es un buen primer módulo por
   sus contratos de importación y las pruebas existentes del backend.
2. Aplicar la misma separación a TensoRapid y HVI, conservando sus diferencias
   de formato. Evitar un parser genérico que oculte reglas propias de cada equipo.
3. Extraer SQL de rutas a repositorios de ensayos y coordinar importaciones desde
   servicios. Las rutas deben validar entrada, invocar un servicio y responder.
4. Separar estadísticas y exportaciones de ResumenEnsayos y dashboards.
5. Incorporar reglas de lint gradualmente en los módulos separados y automatizar
   `npm run check` en integración continua cuando se defina el repositorio remoto.

Cada extracción debe mantener URLs, respuestas, ponderaciones, permisos y
transacciones. Las pruebas deben cubrir ejemplos observables del módulo antes
y después, no su organización interna. No se plantea reescribir toda la aplicación
ni migrarla a TypeScript de una sola vez.
