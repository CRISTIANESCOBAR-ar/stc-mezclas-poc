# Propuesta de UI para Uster

Análisis del código actual de Uster.vue y del contenedor App.vue. No incluye
observación de un turno real ni validación visual en distintos dispositivos;
las consecuencias de distribución deben comprobarse con un prototipo.
Esta propuesta no modifica la pantalla ni las reglas de negocio.

## Aclaraciones del laboratorio

Los ensayos de esta unidad contienen siempre 10 husos; en otras unidades pueden
ser 20, también fijos. Sus identificadores vienen del TBL y guían la transcripción
del título medido desde una planilla. Se conservarán orden y cantidad de husos.
Esto es independiente del número de ensayos visibles en la bandeja de archivos.

Se mantienen los indicadores PAR/TBL/Imp.: PAR contiene el encabezado y TBL las
mediciones disponibles. Se conserva la lógica actual de mediciones ausentes
por sensores dañados. La observación sobre los filtros se refería a Mostrar todos /
No guardados / Guardados, no a esos indicadores.

## Objetivo

## Revisión de persistencia al reabrir ensayos

El código actual guarda Estiraje y Pasador en `tb_uster_par`, pero `selectRow`
solo los recupera de `scanList`. Esa lista se reconstruye desde los archivos
y no recupera esos campos de PostgreSQL. Por eso sobreviven en memoria después
de guardar, pero desaparecen al recargar o reescanear. La API `/uster/par` ya
expone esos campos; el problema es que la pantalla no los consulta al reabrir.

Los títulos se leen de la columna 9 del TBL. Al pulsar Guardar se escriben
primero en PostgreSQL y después se intenta modificar el TBL. No se escriben
en cada pulsación. La escritura local puede fallar aunque la base haya guardado.
Al reabrir, la pantalla vuelve a confiar en el archivo y no recupera los títulos
confirmados en PostgreSQL. El tipo de material también combina archivo,
detección automática y valores temporales en memoria.

Riesgos concretos:

- Guardar de nuevo un ensayo reemplaza encabezado y detalle completos. Estiraje
  y Pasador vacíos pueden reemplazar valores existentes; un TBL desactualizado
  puede reemplazar títulos más recientes de la base.
- La escritura del TBL omite los títulos vacíos: vaciar un título puede borrar
  el dato en la base y conservar el valor anterior en el archivo.
- Las posiciones de escritura se calculan por índice de fila. Si el archivo
  cambió desde su lectura, debe detectarse antes de sobrescribirlo.
- La edición de tipo de material modifica `scanList` antes de guardar. Por eso
  los valores temporales y los confirmados no quedan claramente separados.
- Cambiar filtro o ensayo descarta entradas sin comprobar cambios pendientes.
- Los timeouts no cancelan la operación ni prueban que no se guardó; reenviar
  sin consultar puede reemplazar el mismo ensayo.

### Contrato recomendado para corregirlo

Primera parte implementada: `GET /api/uster/tests/:testnr` recupera encabezado
y detalle en una misma sentencia SQL. Al seleccionar un ensayo marcado guardado,
la pantalla compara cantidad y orden de husos, recupera Estiraje/Pasador/material
y mediciones/títulos confirmados. Nulos de PostgreSQL no se rellenan con datos
viejos del TBL. La carga o un conflicto bloquean Guardar y la edición manual.
Las pruebas incluyen reapertura, archivo desactualizado y 10/20 husos. No se
modificaron datos existentes ni el mecanismo actual de escritura local.
Segunda parte implementada: el borrador manual tiene una copia de referencia
para detectar cambios y descartarlos. Cambiar ensayo, filtro, carpeta o salir
protege cambios pendientes. La navegación se bloquea durante un guardado.
`PATCH /api/uster/tests/:testnr/manual` actualiza únicamente Estiraje, Pasador,
material y títulos, en una transacción con la solicitud de backup. Usa la versión
PostgreSQL `xmin` del encabezado para rechazar actualizaciones obsoletas y
verifica la cantidad y orden de husos. No modifica mediciones, lote ni fecha del
equipo. Los vacíos explícitos se guardan como nulos; la escritura TBL también
limpia un título vaciado. No requiere migración de esquema.

Sigue pendiente reforzar la sincronización TBL con detección de cambios externos
y reintento solo del archivo local, y separar visualmente Guardar/Guardar y siguiente.
La versión protege este flujo de correcciones; no sustituye un control completo
de conflictos para una futura reimportación explícita o escrituras externas.

1. Ensayo nuevo: PAR aporta encabezado, TBL aporta husos/mediciones y títulos
   disponibles. La UI completa Estiraje/Pasador/material/títulos en un borrador.
2. Ensayo guardado: recuperar encabezado y detalle de PostgreSQL al seleccionarlo.
   Es la fuente del último estado confirmado. Consultar por TESTNR, con una
   respuesta consistente de encabezado y detalle, sin descargar todos los ensayos.
3. Comparar identificadores y orden de husos con el TBL. Si coinciden, mostrar
   títulos confirmados, incluidos nulos, sin rellenarlos silenciosamente con
   valores viejos del archivo. Si no coinciden, informar conflicto antes de editar.
4. Mantener archivo original, dato confirmado y borrador separados. Cancelar
   vuelve al confirmado; recargar o cambiar selección debe advertir solo si
   existen cambios. Una consulta fallida no se interpreta como ensayo nuevo.
5. Actualizar datos manuales con una operación específica, en lugar de reemplazar
   todas las mediciones al corregir Estiraje o Pasador. Una reimportación completa
   debe ser explícita. Usar una versión del registro para detectar cambios de
   otro operador; no resolverlos sobrescribiendo silenciosamente.
6. Conservar inicialmente la escritura del TBL por compatibilidad con el trabajo
   actual. Mostrar su resultado separado del de PostgreSQL; permitir reintentar
   solo la sincronización local. Verificar que el archivo no cambió y emparejar
   husos antes de escribir. Definir si vaciar un título es una acción permitida
   y sincronizarla explícitamente, sin omitirla.
7. Recuperar la consulta de guardados antes de cambios visuales. Probar reapertura
   tras recarga, TBL antiguo, valores nulos, 10/20 husos, discrepancias de husos,
   error de red y guardado en base con fallo de escritura local.

No hace falta introducir todos estos cambios de una vez. Primero recuperar el
estado confirmado; después separar edición y reimportación; finalmente integrar
la nueva UI. No modificar PAR ni inventar valores históricos para completar
registros cuyos campos nunca fueron guardados.

## Objetivo de presentación

Facilitar el ciclo detectar → identificar → completar → revisar → guardar,
conservar la velocidad del teclado y hacer inequívoco qué ensayo y qué datos
está procesando el operador. 1368 × 768 sigue siendo un caso de validación,
pero no debe determinar anchos, cantidad de filas ni tamaño de tipografía.

## Hallazgos del código

| Hallazgo | Consecuencia | Propuesta |
| --- | --- | --- |
| Grid fijo 440/220/270 px; solo cambia el espacio entre columnas en pantalla estrecha | El contenido no se redistribuye según el espacio disponible | Bandeja y detalle flexible; una columna cuando no caben |
| Vista completa oculta por debajo de `md` | Una ventana pequeña o zoom puede bloquear el uso | Mantener acceso al contenido y reorganizarlo |
| Bandeja de archivos calculada para diez filas y filas ficticias | El tamaño de la bandeja no depende de los archivos encontrados | Bandeja flexible; conservar los 10/20 husos del TBL en la tabla de carga |
| Texto mayormente de 12 px e inputs de título reducidos al enfocar | Lectura y edición comprimidas; geometría cambia al trabajar | Texto base 14–16 px y foco sin alterar medidas |
| `.PAR`, `.TBL` e `Imp.` separados con checks | Son una guía operativa conocida del laboratorio | Conservar indicadores y significado; mejorar etiquetas accesibles |
| Tres checkboxes que se excluyen entre sí | La interacción no corresponde a opciones independientes | Un selector de estado con contadores |
| Activar filtros llama a clearSelection | Se descartan campos manuales sin aviso | Mantener selección o advertir solo si hay cambios |
| checkExistingTests devuelve [] ante fallos; el endpoint también puede devolver existing vacío ante error | Puede confundirse indisponibilidad con inexistencia del ensayo | Estado «No verificado», reintentar y bloquear reemplazos hasta verificar |
| canSave considera selección y presencia de filas o texto | El botón no explica integridad, validación o cambios pendientes | Disponibilidad derivada de validación y mensaje con causas |
| Guardar y Eliminar comparten prominencia y la vista no consulta rol para Eliminar | El operador puede descubrir una prohibición solo tras intentar borrar | Guardar destacado; borrado en menú administrativo |
| Guardar actualiza PostgreSQL y después intenta escribir TBL | Son dos resultados independientes, sin atomicidad entre ambos | Confirmación persistente de base y archivo por separado |
| Guardado limpia títulos y avanza automáticamente | Dificulta revisar el resultado y entender la transición | Opción explícita «Guardar y siguiente» y recibo visible |
| Cambio de ensayo llama a carga asíncrona sin guardia de selección | Posible resultado viejo en una selección nueva; verificar al refactorizar | Cancelación de lectura o identificador de selección |
| Timeout HTTP construido con setTimeout sin cancelar fetch | El aviso de timeout no prueba que el servidor no guardó | Estado incierto y consulta de confirmación antes de reenviar |
| Normalización de títulos limita y recorta entrada | Una corrección silenciosa puede cambiar el valor intentado | Mensaje junto al campo; no cambiar límites existentes sin validarlos |
| Metadatos mezclan lectura y edición en una tabla Dato/Valor | No se distingue lo importado de lo que hay que completar | Resumen de identidad y formulario de campos manuales |
| TBL despliega 27 columnas técnicas de una vez | Exceso de información durante carga | Vista esencial y acceso a todas las mediciones |

## Distribución recomendada

Cabecera: Uster, carpeta seleccionada, estado de acceso, seleccionar/cambiar
carpeta y actualizar. Mostrar el nombre de carpeta; la ruta o explicación del
navegador queda en detalles. El estado de escritura debe ser visible.

Columna izquierda: bandeja de archivos detectados. Buscar por ensayo, máquina
o lote; filtro Pendientes / Guardados / Con problemas / Todos con contadores.
Cada fila identifica ensayo, máquina, título nominal y estado. Añadir fecha y
lote cuando el escaneo los pueda obtener de forma fiable. Es una bandeja de la
carpeta, no un historial completo de la base.

Área principal: identidad del ensayo seleccionada siempre visible, seguida de
campos manuales agrupados y tabla editable por huso. Debe distinguir claramente
el título nominal en Ne, el título medido y su unidad, y la desviación relativa.
Antes de elegir etiquetas, comprobar si el dato manual se introduce en tex:
el código actual convierte Ne a tex para evaluar la tolerancia.

Mostrar el número de títulos completados y las advertencias. No decidir que
todos sean obligatorios sin validar esa regla del laboratorio. Una advertencia
de calidad no equivale a un archivo inválido: registrar un resultado fuera de
tolerancia puede ser precisamente el propósito del ensayo.

Detalles secundarios: datos del archivo, observaciones y tabla completa de
mediciones. Usar encabezados legibles y unidades; conservar los códigos de
exportación y los valores originales. Posible agrupación: irregularidad,
pilosidad e imperfecciones. No agregar gráficos sin una decisión que ayuden a tomar.

Barra de acciones contextual: Guardar ensayo, Guardar y siguiente, Descartar
cambios y resultado de la última operación. Fija solo cuando haya espacio y
sin tapar filas o controles al usar zoom. Eliminar queda en Más acciones para
administrador y exige identificar exactamente el ensayo a borrar.

## Estados y mensajes

Separar estado de origen (carpeta accesible, solo lectura, falta autorización),
integridad (PAR/TBL presentes y compatibles), consulta (verificado/no verificado),
edición (sin cambios/con cambios) y persistencia (guardando/guardado/error/incierto).
La etiqueta principal resume la siguiente acción y el detalle expone la causa.

Ejemplos: «Falta archivo TBL», «No se pudo verificar en la base», «Cambios sin
guardar», «Guardado en la base; archivo local pendiente». No llamar «Pendiente»
a un ensayo cuyo estado remoto se desconoce.

Errores de campo junto al campo; confirmación de guardado cerca de la acción.
Reservar modales para descarte o borrado. Anunciar cambios de estado con regiones
accesibles sin mover el foco; mantener texto además del color. Un fallo de red
no debe limpiar datos manuales ni disparar un reintento automático de escritura.

## Teclado y adaptación

Conservar Enter y flechas en títulos; Tab y Shift+Tab deben seguir funcionando.
La bandeja debe poder operarse por teclado y mostrar selección y foco distintos.
No robar el foco al actualizar la carpeta. El salto tras guardar debe indicar
el nuevo número de ensayo. Copiar/pegar varias filas es una mejora posterior:
requiere verificar cantidad, orden de husos, formato numérico y previsualizar.

En escritorio ancho: bandeja y detalle. En ventana intermedia: bandeja más
compacta o conmutador Bandeja/Ensayo. En teléfono: una vista a la vez, priorizando
consulta; validar compatibilidad real de selección de archivos antes de prometer
la misma importación. El scroll horizontal pertenece a la tabla extensa, no a
todo el formulario. Densidad cómoda por defecto y compacta opcional.

La carpeta persistida es comodidad del navegador, no identidad del operador:
en equipos compartidos debe mostrarse quién está activo y limpiar borradores
al cambiar sesión. No persistir datos de ensayos localmente sin una política
de recuperación y separación por usuario.

## Implementación gradual y criterios de aceptación

1. Prototipo de bandeja + edición con datos ficticios, sin tocar PostgreSQL ni TBL.
   Incluir carga inicial, ensayo incompleto, error de verificación, edición y éxito.
2. Validar el recorrido real con el operador, unidades y reglas de obligatoriedad.
3. Extraer parser, servicio de API, acceso a carpeta y estado de edición. Integrar
   el diseño mediante los mismos contratos de importación y permisos.
4. Probar cambios de selección rápidos, cambios sin guardar, red caída, timeout
   y guardado en base con escritura local fallida. Solo después agregar carga
   múltiple, pegado o gráficos.

Validar 1368 × 768, 1920 × 1080, ventana estrecha y zoom 125/150/200 %. Debe
ser posible completar y guardar solo con teclado; ver identidad y unidad al
editar; conservar entradas ante fallos; distinguir archivo incompleto, dato
inválido y calidad fuera de tolerancia. Medir tiempo y errores por ensayo con
una muestra real antes/después, sin inventar porcentajes de mejora.

Referencias: [Reflow, W3C](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
y [mensajes de estado, W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
