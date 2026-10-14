# TensoRapid

La vista adopta los criterios de Uster/Cardas: anchos limitados y adaptables,
tablas compactas, scroll horizontal local, Tippy y avisos flotantes con Heroicons.
El aviso de recuperación usa azul claro. La carpeta se identifica antes de leerla;
el escaneo tiene contador PAR y utiliza ocho lecturas en paralelo. Se eliminó
la recuperación de una lista antigua desde localStorage para no mostrar estados
de guardado o borradores desactualizados.

El estado se consulta a PostgreSQL mientras se leen los PAR. Una consulta fallida
no clasifica los ensayos como pendientes. Al abrir un guardado, encabezado y
mediciones se recuperan en un mismo snapshot. Se conserva el formato huso/repeticiones
y los ceros reales en la vista de resultados.

El dato manual de esta vista es el vínculo Uster. Su borrador permanece en la
fila y tiene referencia confirmada. Cambiar filtro/carpeta o navegar protege
los cambios; Descartar restaura los vínculos. La navegación entre filas puede
conservar varios borradores de vínculos, como en el recorrido de carga original.

PATCH `/api/tensorapid/tests/:testnr/link` modifica únicamente el vínculo, con
versión `xmin`, validación de existencia del ensayo Uster y coincidencia de husos.
La operación tiene transacción y solicitud de backup. Corregir un guardado no
reimporta ni reasigna mediciones. La importación inicial conserva el recorrido
previo de validación de husos; no se altera su decisión de corrección asistida.

Observaciones del PAR se presentan en varias líneas. Eliminar se muestra solo
al administrador, además del control de permisos del servidor. No requiere
migraciones ni cambia registros históricos automáticamente.

## Control cruzado

Bajo la tabla de mediciones se muestran título nominal Ne, lote, máquina y
husos de TensoRapid frente al ensayo Uster indicado, con Coincide/Difiere/Sin dato.
TensoRapid usa PAR/TBL locales cuando están disponibles; la base sirve de respaldo.
Uster usa el encabezado y detalle ya importados. La fuente se explica en el panel;
no se solicita otra autorización de carpeta para Uster.

La consulta sigue la selección y el número Uster con una breve espera para evitar
consultas por cada tecla, y descarta respuestas de selecciones anteriores. No
reescribe archivos ni reasigna husos. Las diferencias de numeración se muestran
como discrepancias documentales, no como prueba de muestras físicas distintas.
La coincidencia tampoco garantiza una pareja única de ensayos. Esta etapa agrega
el panel de revisión; conserva las validaciones actuales de guardado y vínculo.

La bandeja ahora renderiza como máximo 50 ensayos por página, conservando todos
los registros y el avance por teclado hacia la página del siguiente pendiente.
Abrir un guardado tiene límite de consulta de 15 segundos. La lectura de archivos
locales del control cruzado corre aparte, con límite de 10 segundos por lectura;
no mantiene el formulario en Abriendo ensayo. Respuestas de lecturas anteriores
se descartan. Se probó redimensionado 1368×768 → 800×600 → 1368×768 con 2.000
guardados ficticios, ensayo seleccionado y un PAR deliberadamente sin respuesta;
la vista mantuvo 50 filas y respondió sin errores JavaScript.
