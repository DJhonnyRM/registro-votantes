# Registro de Votantes

Formulario web sencillo para registrar votantes en campo (una persona por envío).
Reemplaza el Google Form largo por una interfaz corta, con validación y **datos del
líder que no se vuelven a escribir** en cada registro.

**Formulario:** https://djhonnyrm.github.io/registro-votantes/

## Qué mejora frente al Google Form anterior

- De **24 campos → 10**. Se quitó el bloque de datos duplicado y el bloque de
  "compromiso/seguimiento" (eso se lleva aparte en la hoja).
- El **líder se guarda en el dispositivo**: solo lo escribe una vez y queda fijo.
- Botón **"Registrar otro votante"**: limpia solo los datos del votante y deja
  el líder listo → registro en cadena, muy rápido desde el celular.
- **Pestaña "Mis votantes"**: cada líder entra con su cédula y puede **ver, editar
  o eliminar** los votantes a su nombre, y **actualizar sus propios datos** (nombre/
  celular) en todos sus registros a la vez.
- **Validación**: cédula y celular solo aceptan números; campos clave obligatorios.
  Las cédulas se guardan como **texto** (conservan ceros a la izquierda).
- El **total de votos por líder** ya no se escribe a mano: se cuenta solo en la hoja
  (una fila = un votante).

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
  `=CONTAR.SI(Registros!B:B; "Nombre del líder")`.
