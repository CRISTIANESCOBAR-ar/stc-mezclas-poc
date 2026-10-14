# Uster Cardas y Manuares

Se aplicaron los criterios de Uster conservando identidad por equipo y ensayo,
la clasificación de máquinas, el orden por turno/ronda y las tres repeticiones
manuales. No se agregaron Estiraje/Pasador porque no pertenecen a esta vista.

- Anchos adaptables con límites; se compactan en ventanas pequeñas y se apilan
  cuando no caben dos columnas. Mediciones tienen desplazamiento horizontal local.
- Observaciones se muestran en varias líneas. El formulario de tres títulos
  conserva su navegación por teclado y sus estadísticas actuales.
- Avisos flotantes con Heroicons, azul claro para recuperación y Tippy.
- Carpeta recordada visible antes del escaneo; estado inicial separado de lectura.
- Escaneo reutiliza `usterScan.js`, con ocho lecturas simultáneas y progreso PAR.
  El estado remoto se consulta para las identidades compuestas; errores bloquean
  el guardado en vez de interpretarse como ensayos pendientes.
- GET de ensayo recupera encabezado, mediciones y títulos en un solo snapshot.
  Verifica cantidad/orden del TBL antes de editar un ensayo confirmado.
- PATCH manual modifica solo las tres repeticiones, con versión `xmin`, transacción
  y solicitud de backup. La importación inicial y la importación en lote mantienen
  sus contratos; corregir un guardado no reimporta las mediciones.
- Borrador de títulos separado; descarte restaura la referencia. Cambio de ensayo,
  filtro, carpeta y navegación protege los cambios pendientes.

No requiere migraciones ni modifica registros existentes automáticamente. Los
ensayos históricos sin títulos mantienen esos campos vacíos. No se escribe TBL
en esta vista: los títulos manuales de cinta se conservan en su tabla PostgreSQL.
