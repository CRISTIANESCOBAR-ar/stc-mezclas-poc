# Pruebas en la notebook

El entorno actual funciona con PostgreSQL local y una cuenta STC local. La
integración con Microsoft Entra ID y las políticas para puestos compartidos se
prepararán antes del despliegue corporativo.

El entorno fue activado el 13/10/2026: las dos migraciones se aplicaron después
de un backup completo y una restauración real en una base temporal. Esa base
temporal se eliminó al finalizar; los datos de inventario y ensayos existentes
se conservaron. Se comprobó el ingreso, la sesión y las consultas de inventario,
estándares, Uster, TensoRapid y HVI a través del frontend.

Configuración del entorno local:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
STC_SESSION_HOURS=24
STC_SESSION_IDLE_MINUTES=480
```

La cuenta `desarrollo` tiene permisos de administrador para probar los flujos.
Su contraseña aleatoria se guarda en `backend/data/acceso-local.txt`, dentro de
una carpeta protegida y excluida de Git. No existe un acceso anónimo ni una
contraseña predeterminada. `npm run dev:account` crea esta cuenta después de
aplicar las migraciones; solo funciona con backend y PostgreSQL locales y nunca
en producción. Una ejecución posterior conserva la cuenta y su contraseña.

Abrir `http://127.0.0.1:5173/ingresar` e ingresar una vez. La sesión puede durar
24 horas y vence antes si pasan 8 horas sin actividad. Cerrar la pestaña no
equivale a cerrar la sesión; el botón Salir la revoca. Cambiar entre localhost y
127.0.0.1 usa cookies distintas: para las pruebas, usar siempre 127.0.0.1.

En Uster, seleccionar nuevamente la carpeta de archivos PAR/TBL al cambiar
de localhost a 127.0.0.1: el navegador guarda la autorización por origen.
El filtro Guardados muestra los ensayos de esa carpeta que ya están en la base;
no carga por sí mismo el historial completo de PostgreSQL.

Para volver a iniciar los servicios desde la raíz:

```powershell
.\start-dev.ps1
.\check-stack.ps1
```

PostgreSQL debe estar activo. `start-dev.ps1` no reinicia la base ni ejecuta
migraciones automáticamente. Los logs quedan en `backend/data/logs`.

En el servidor corporativo se usará el inicio de sesión de Microsoft y la
asignación de los tres roles acordados. Las terminales de laboratorio compartidas
necesitarán cierre de sesión al cambio de operario/turno y una inactividad más
corta; la sesión larga de la notebook es una configuración local de desarrollo.
Antes del despliegue, deshabilitar la cuenta `desarrollo` y retirar el archivo
de su contraseña del equipo de producción.
