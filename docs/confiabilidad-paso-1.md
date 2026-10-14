# Confiabilidad: optimizador, números e importaciones

## Criterio de cálculo

La calidad de una mezcla se calcula como `sum(valor × kg) / sum(kg)`.
El peso de cada fardo se obtiene del peso total del lote dividido por su stock
original. Si ese peso no existe, se puede usar un `PESO_MEDIO` positivo conocido.
No se inventa un peso de 1 kg ni se reemplaza el cálculo por un promedio simple.
Al pasar de stock total a stock disponible, el peso total se escala en la misma
proporción. El peso medio del fardo es kg/fardos, una razón física, no un promedio
de calidades.

Los tres algoritmos (`standard`, `stability`, `stability-strict`) usan el mismo
criterio para buscar, validar y mostrar los promedios de calidad. Se comprueban
los objetivos activados antes de consumir stock. El optimizador sigue siendo
heurístico: que no encuentre una receta no demuestra que ninguna combinación
matemática posible exista.

Los cupos y porcentajes de tolerancia se mantienen por cantidad de fardos.
`stability` conserva la tolerancia informativa; `standard` y `stability-strict`
respetan el cupo configurado. Los límites absolutos y los objetivos activados se
respetan en los tres modos.

Un lote sin peso válido o sin una medición necesaria para una regla activa se
excluye con un motivo explícito. Las estadísticas de variables no supervisadas
excluyen mediciones ausentes del numerador y del denominador; si no hay mediciones,
devuelven `null`. Los ceros válidos se conservan.

Las agrupaciones de inventario muestran promedios ponderados y conservan sus
componentes: se envían los lotes originales al optimizador, evitando que el
promedio de un grupo oculte un fardo/lote rechazado. Las proyecciones de compra
usan kg para los promedios e inversas de mezcla; el peso de compras futuras sigue
siendo una estimación basada en el peso medio disponible.

## Normalización e importación

- Se aceptan decimales con coma/punto y formatos completos `1.234,56` y `1,234.56`.
  Un único separador se interpreta como decimal: `1.234` significa 1,234, no 1234.
- Vacío, ausencia y `-` se representan como `null`; cadenas como `12abc`, valores
  infinitos y fechas imposibles se rechazan. No se toma un prefijo numérico.
- HVI, HVI crudo, Uster, Cardas y TensoRapid validan el lote completo antes de
  adquirir una conexión o borrar detalles. No se acepta un reemplazo vacío.
- Una falla durante la escritura revierte la transacción. HVI crudo serializa
  reemplazos del mismo archivo mediante bloqueo de su cabecera.
- En Cardas, omitir títulos manuales los conserva; enviar explícitamente `[]`
  los elimina. Títulos inválidos no provocan un borrado.
- TensoRapid acepta el formato de equipo `huso/ensayos` (ej. `62/5`), verifica
  que el huso coincida y guarda el número de ensayos en su columna INTEGER.
- El parser HVI es compartido entre navegador y pruebas. Reconoce tablas TSV y
  bloques `Lot ID`, informa errores de filas y conserva MUESTRA/ENTRADA. La pantalla
  HVI crudo mantiene su filtro de ENTRADA.

## Verificación

Desde `backend/`: `npm test`. Incluye casos con pesos diferentes, rechazo de
lotes, cupos, objetivos incompatibles, stock disponible, números locales,
fechas, parsers y rutas de importación con una base simulada. Las pruebas de
regresión conservan ejemplos de las fallas corregidas para detectar reapariciones.

Desde `frontend/`: `npm test` y `npm run build`. Las pruebas de inventario cargan
datos por la API simulada y verifican ponderación, agrupación, envío de lotes
originales y exclusión de rechazados usando el optimizador real.

Estas pruebas no escriben en PostgreSQL ni ejecutan backups. La validación con
archivos de equipo y datos reales, y las pruebas de concurrencia con PostgreSQL,
deben hacerse en un entorno de prueba antes de desplegar.
