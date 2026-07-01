# Registro de Votantes

Formulario web sencillo para registrar votantes en campo (una persona por envío).
Reemplaza el Google Form largo por una interfaz corta, con validación y **datos del
líder que no se vuelven a escribir** en cada registro.

**Formulario:** https://djhonnyrm.github.io/registro-votantes/

## Modelo: una persona por registro

Cada envío registra a **una persona** con su **rol** (Líder Familiar / Líder
Comunitario / Votante), ligada a un **líder a cargo de los votos**, y con un
**compromiso opcional**. Reemplaza el Google Form de 6 secciones sin perder nada.

- **Rol**: si es **Votante**, con los datos personales basta. Los líderes acumulan
  votantes que se **cuentan solos** (adiós "total votos a su cargo" a mano).
- **Quién registra** se guarda en el dispositivo: **líder a cargo** + **responsable
  de diligenciar** (que no siempre es el líder; si va vacío, se asume el líder).
  No se reescriben en el siguiente registro → registro en cadena rápido.
- **Compromiso opcional**: ¿sí/no? + descripción, plazo, estado y fecha. El
  **estado del cumplimiento se puede editar después** desde "Mis votantes".
- **Pestaña "Mis votantes"**: cada líder entra con su cédula y puede **ver, editar
  o eliminar** sus registros, y **actualizar sus propios datos** (nombre/celular)
  en todos ellos a la vez.
- **Validación**: cédulas y teléfonos solo números y se guardan como **texto**
  (conservan ceros a la izquierda).
- **Roles, plazos y estados** son configurables en [`config.js`](config.js).
- **Borrar todo**: en el editor de Apps Script, ejecuta la función `limpiarRegistros`.

## Puesta en marcha (una sola vez)

### 1. Crear el backend (Google Apps Script)
1. Abre tu hoja **Listado de Votantes** en Google Sheets.
2. `Extensiones → Apps Script`.
3. Pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs) y guarda.
4. `Implementar → Nueva implementación → Aplicación web`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera**
   - `Implementar` → autoriza → **copia la URL** (`.../exec`).

### 2. Conectar el formulario
- Edita [`config.js`](config.js) y pega tu URL en `window.ENDPOINT_URL`.
- Guarda y sube el cambio (`git commit` + `git push`). En ~1 min queda activo.

### 3. Usar
- Comparte el enlace del formulario con cada líder.
- Cada envío crea una fila en la pestaña **Registros** de tu hoja.

## Datos y privacidad

- El formulario es una página estática (solo HTML). **No guarda nada por sí mismo**:
  cada envío va directo a tu Google Sheet privada.
- La página lleva `noindex` para no aparecer en buscadores.
- Contar votos por líder en la hoja: usa una tabla dinámica o
  `=CONTAR.SI(Registros!E:E; "cédula del líder")` (columna E = Cédula líder).
