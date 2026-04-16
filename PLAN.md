# Mezclas PoC plan
- [Completado] Crear repo separado `stc-mezclas-poc` con `frontend/` Vue 3 + Vite y `backend/` Node/Express.
- [Completado] Objetivo: reproducir el resultado actual de `/inventario` usando la misma fuente PostgreSQL actual (sin datos mock).
- [Completado] Copiar las credenciales reales de conexión de la DB (.env y config) desde el proyecto padre original.
- [Completado] Reconectar los repositorios reales a la DB y asegurar que `tb_est_mp` y `tb_config_tolerancias` puedan ser consultados correctamente evaluando nombres de columnas y decimales.
- [Completado] La PoC incluye solo `/inventario` y `/configuracion-estandares`.
- [Completado] Asegurar que el contrato del JSON de PostgreSQL fluya al frontend como en la versión completa.
- Verificar paridad de funcionamiento.
- Preparar repositorios/servicios para cambiar después PostgreSQL por API Oracle sin rehacer UI ni optimizador.