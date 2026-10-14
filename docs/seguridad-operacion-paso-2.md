# Seguridad y operación — paso 2

## Acceso

La API requiere inicio de sesión. No existe un modo anónimo de desarrollo ni
una contraseña predeterminada. El primer administrador se crea desde la terminal
del servidor; después puede gestionar usuarios en `/usuarios`.

| Rol | Permisos |
| --- | --- |
| consulta | Consultar inventario, reportes y ejecutar cálculos/análisis |
| operador | Lo anterior y cargar/reemplazar ensayos |
| administrador | Lo anterior, modificar estándares, borrar registros y gestionar usuarios |

Los backups, costos de IA y diagnóstico operativo están reservados al administrador.
Una nueva ruta de escritura queda bloqueada hasta tener una política explícita.
El backend comprueba los permisos aunque se invoque directamente desde otro cliente.

Las contraseñas se guardan con scrypt (N=32768, r=8, p=3) y una sal aleatoria,
siguiendo una de las configuraciones de [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Las sesiones persisten en
PostgreSQL con un identificador opaco cuyo hash se almacena en la base. La cookie
es HttpOnly y SameSite=Strict; en producción también Secure. El token CSRF vive en
memoria en el navegador, nunca en localStorage. Caducan por inactividad y por plazo
absoluto. Cambiar rol, estado o contraseña revoca todas las sesiones del usuario;
no se permite quitar al último administrador habilitado.

Hay límites persistentes para intentos de ingreso, solicitudes y análisis IA.
Las llamadas API del frontend usan el mismo origen; las pantallas de importación
y gestión se restringen según el rol. CORS acepta una lista explícita de orígenes.
El backend escucha por defecto en 127.0.0.1.

## Activación sobre una base existente

La guía siguiente describe la activación en una instalación nueva. En la
notebook de desarrollo se aplicaron las migraciones y se creó una cuenta local
el 13/10/2026, después de verificar un backup y su restauración aislada. Ver
[Desarrollo en la notebook](desarrollo-notebook.md). Las credenciales PostgreSQL
existentes se conservaron.

1. Detener el backend y reservar una ventana de mantenimiento. Conservar el
   código anterior y `backend/.env` en una ubicación protegida.
2. Completar `backend/.env` tomando como referencia `.env.example`. Conservar las
   credenciales necesarias para obtener un backup inicial. Configurar los
   usuarios de migración, backup y restauración por separado.
3. En Windows, proteger una carpeta dedicada con `protect-backups.ps1`. Si se
   configura un espejo, proteger también esa carpeta. Ejecutar el script como
   la identidad que ejecutará el backend, o concederle explícitamente permisos.
4. Desde `backend/`, ejecutar:

   ```powershell
   npm run backup:create
   npm run backup:verify -- --file "ruta-del-backup.dump"
   npm run backup:restore-test -- --file "ruta-del-backup.dump" --cleanup
   npm run db:status
   npm run db:migrate
   ```

   El backup inicial funciona antes de tener las nuevas tablas operativas.
   Una restauración de prueba siempre crea una base `stc_restore_test_*`; el
   programa no acepta elegir la base de producción como destino. Necesita una
   cuenta de mantenimiento con CREATEDB. `--cleanup` elimina solo esa base
   creada por la prueba. Sin ese argumento queda disponible para inspección.

5. Crear una cuenta PostgreSQL de aplicación, por ejemplo `stc_app`, sin permisos
   de superusuario, CREATEDB, CREATEROLE ni CREATE sobre el esquema. Definir su
   contraseña con `psql \password stc_app`, sin escribirla como argumento en
   comandos. Aplicar `backend/scripts/grant-runtime.sql` como propietario de la
   base (`psql --set ON_ERROR_STOP=1 --file backend/scripts/grant-runtime.sql`).
   El administrador de PostgreSQL debe revisar cualquier permiso CREATE
   heredado de PUBLIC; esta entrega no lo revoca automáticamente porque puede
   afectar otras aplicaciones de la misma base.
6. Actualizar PG_USER/PG_PASSWORD para usar la cuenta de aplicación. Crear el
   primer usuario STC desde la raíz:

   ```powershell
   .\create-user.ps1 -Username admin -Role administrador
   ```

   La contraseña se solicita sin mostrarla ni incorporarla a los argumentos.
   Migraciones y creación de usuarios no registran contraseñas en su salida.
7. Ejecutar pruebas, iniciar y comprobar:

   ```powershell
   # En backend/: npm test
   # En frontend/: npm test; npm run build
   .\start-dev.ps1
   .\check-stack.ps1
   ```

   En desarrollo, abrir `http://127.0.0.1:5173/ingresar`. Para un servidor de
   producción configurar NODE_ENV=production, APP_ORIGIN=https://su-dominio y
   un proxy TLS delante del backend. Si ese proxy está en el mismo equipo, usar
   STC_TRUST_PROXY=loopback y mantener HOST=127.0.0.1. El backend sirve el build
   del frontend en producción. Una base remota requiere PG_SSL=true y una CA
   confiable; PG_SSL_CA admite el certificado PEM para la conexión de Node, y
   los clientes PostgreSQL nativos deben tener su certificado raíz configurado.

   `start-dev.ps1` deja los logs en `backend/data/logs`. En producción, usar un
   servicio/supervisor que capture los logs y reinicie el proceso cuando corresponda;
   las carpetas de logs y configuración también deben tener acceso restringido.

El backend no acepta solicitudes si faltan credenciales, tablas de origen,
migraciones válidas o un administrador. En producción también rechaza cuentas
de base de datos con los privilegios elevados anteriores. Las migraciones usan
checksum, bloqueo compartido y una transacción por archivo. Nunca editar un
archivo ya aplicado: los siguientes cambios requieren otra migración.

La migración inicial conserva los datos y recoge el DDL que antes ejecutaban las
rutas. Si una base anterior incumple una restricción existente, la migración se
revierte y debe corregirse esa inconsistencia antes de continuar. No crea los
datos/tablas de origen del sistema STC: una instalación vacía debe restaurarlos.

## Backups y recuperación

Los backups completos son archivos custom de pg_dump con manifiesto SHA-256.
Se verifica el catálogo antes de publicar el archivo. Las sesiones y los
contadores de acceso se excluyen del contenido, para que una restauración no
reactive sesiones antiguas. Un espejo es opcional; la retención no borra archivos
automáticamente.

Las importaciones, modificaciones de usuarios/estándares y borrados registran una
solicitud de backup en la misma transacción. El trabajador la retoma después de
un reinicio, respeta el período de quietud y el intervalo mínimo y hace backups
periódicos incluso si no se realizan cargas. Los fallos conservan la solicitud
para reintentar y quedan visibles para el administrador. Una versión de cambios
evita perder las solicitudes recibidas mientras se ejecuta un backup.

Herramientas disponibles en `backend/`:

- `npm run backup:create`: backup completo bajo demanda.
- `npm run backup:verify -- --file <archivo.dump>`: tamaño, checksum y catálogo.
- `npm run backup:restore-test -- --file <archivo.dump> [--cleanup]`: restauración
  aislada, comprobación de tablas y registro de evidencia `.restore-test.json`.

STC_PG_TOOL_MODE=podman usa herramientas del contenedor indicado, sin depender
del proyecto anterior. STC_PG_TOOL_MODE=native usa herramientas locales, con
STC_PG_BIN_DIR opcional. La versión de las herramientas debe ser compatible con
la del servidor. PG_BACKUP_USER debe poder leer todas las tablas incluidas en el
backup completo; no asignar esa necesidad como privilegios DDL al usuario runtime.

Ante una recuperación real, mantener el servicio detenido, verificar el backup,
restaurarlo primero en la base aislada e inspeccionar datos de inventario,
estándares y ensayos. El cambio de PG_DATABASE al destino validado y el arranque
son pasos explícitos del despliegue. La herramienta no sobrescribe la base actual.
Los manifiestos detectan corrupción; no autentican archivos de terceros. Usar
backups propios y ubicaciones con acceso restringido.

## Diagnóstico y comprobaciones

`/api/health/live` indica que el proceso responde; `/api/health` comprueba la
conexión y la disponibilidad. Son públicos y no revelan rutas internas ni
credenciales. `/api/operations/status` y `/api/dashboard/backups` requieren
administrador. Los errores internos se devuelven con un mensaje seguro y un
identificador de solicitud. Los logs registran método, ruta sin parámetros,
estado e identidad; la auditoría de escrituras persiste en PostgreSQL. El cierre
del proceso deja de aceptar solicitudes, cancela el backup y cierra el pool.

Las pruebas automatizadas cubren la cadena Express en memoria, roles, sesiones,
CSRF, límites, último administrador, migraciones y reintentos/recuperación de
backups con herramientas simuladas. No conectan a la base existente. La prueba
de restauración PostgreSQL real se ejecuta durante la activación descrita arriba.

Referencias: [seguridad de Express](https://expressjs.com/en/advanced/best-practice-security/),
[scrypt de Node.js](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback),
[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) y
[pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).
