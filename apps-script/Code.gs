/**
 * Backend del formulario "Registro de Votantes".
 * Recibe cada envío y lo agrega como una fila en la pestaña "Registros"
 * de tu Google Sheet.
 *
 * CÓMO INSTALARLO
 * ---------------
 * 1. Abre tu hoja "Listado de Votantes" en Google Sheets.
 * 2. Menú: Extensiones → Apps Script.
 * 3. Borra lo que haya y pega TODO este archivo. Guarda (💾).
 * 4. Implementar → Nueva implementación → tipo "Aplicación web".
 *      - Ejecutar como: Yo (tu cuenta)
 *      - Quién tiene acceso: Cualquiera
 *    → Implementar → Autoriza los permisos → copia la "URL de la aplicación web".
 * 5. Pega esa URL en el archivo config.js del repo (window.ENDPOINT_URL).
 *
 * Nota: si luego cambias este código, usa "Implementar → Gestionar
 * implementaciones → Editar (lápiz) → Nueva versión" para que aplique.
 */

const SHEET_ID = '1hTnCuIuA8YAmA6KzUY1VaOJZUn91bKy6iDJlvty3i4A';
const TAB = 'Registros';
const HEADERS = [
  'Marca temporal', 'Líder', 'Cédula líder', 'Celular líder',
  'Votante', 'Cédula votante', 'Lugar de expedición', 'Celular votante',
  'Municipio', 'Puesto de votación', 'Profesión'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(20000); // evita choques si dos líderes envían a la vez
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(TAB);
    if (!sh) sh = ss.insertSheet(TAB);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);

    sh.appendRow([
      new Date(),
      data.liderNombre || '',
      data.liderCedula || '',
      data.liderCelular || '',
      data.votanteNombre || '',
      data.votanteCedula || '',
      data.lugarExpedicion || '',
      data.votanteCelular || '',
      data.municipio || '',
      data.puesto || '',
      data.profesion || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Endpoint de Registro de Votantes activo.');
}
