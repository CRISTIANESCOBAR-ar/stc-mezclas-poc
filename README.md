# STC Mezclas

Aplicación Vue 3/Vite + Express/PostgreSQL para inventario, mezclas, ensayos,
trazabilidad y reportes. Las pantallas y API requieren sesión y permisos.

Para seguir probando en la notebook, consultar
[Desarrollo local](docs/desarrollo-notebook.md): cuenta local y sesión larga,
sin depender de Microsoft durante esta etapa.

Antes del primer arranque en una instalación nueva, completar configuración, verificar un backup,
aplicar migraciones y crear el primer administrador siguiendo
[Seguridad y operación](docs/seguridad-operacion-paso-2.md).

- Desarrollo: `start-dev.ps1`, luego `http://127.0.0.1:5173/ingresar`.
- Estado: `check-stack.ps1`.
- Pruebas: `npm test` en backend y frontend.
- Compilación: `npm run build` en frontend.
- Verificación completa: `npm run check` desde la raíz.
- Separación de módulos y tareas pendientes: [Mantenibilidad](docs/mantenibilidad-paso-3.md).
- Reglas de cálculo e importación: [Confiabilidad](docs/confiabilidad-paso-1.md).

En producción el backend sirve el build del frontend, detrás de un proxy HTTPS.
No subir archivos `.env`, contraseñas ni backups al repositorio.
