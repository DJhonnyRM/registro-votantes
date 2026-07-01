/**
 * Backend del formulario "Registro de Votantes".
 * Guarda y administra registros en la pestaña "Registros" de tu Google Sheet.
 *
 * Acciones (llegan en el cuerpo JSON, campo "action"):
 *   - create        : agrega un votante nuevo.
 *   - list          : devuelve los votantes de un líder (por su cédula).
 *   - update        : modifica un votante existente (por su ID).
 *   - delete        : elimina un votante (por su ID).
 *   - updateLider   : actualiza nombre/celular del líder en TODOS sus registros.
 *
 * Cada fila guarda quién es el LÍDER (a nombre de quién van los votos) y
 * quién DILIGENCIÓ el formulario (responsable), que no siempre es el líder.
 *
 * INSTALAR / ACTUALIZAR
 * ---------------------
 * 1. Tu hoja → Extensiones → Apps Script.
 * 2. Reemplaza TODO por este archivo. Guarda (💾).
 * 3. (Opcional) Para borrar todos los registros: en el editor, elige la función
 *    "limpiarRegistros" en el menú desplegable de arriba y pulsa ▶ Ejecutar.
 * 4. Implementar → Gestionar implementaciones → ✏️ Editar →
 *    Versión: "Nueva versión" → Implementar.  (La URL /exec NO cambia.)
 */

const SHEET_ID = '1hTnCuIuA8YAmA6KzUY1VaOJZUn91bKy6iDJlvty3i4A';
const TAB = 'Registros';
const HEADERS = [
  'Marca temporal', 'Responsable (diligenció)', 'Cédula responsable',
  'Líder', 'Cédula líder', 'Celular líder',
  'Votante', 'Cédula votante', 'Lugar de expedición', 'Celular votante',
  'Municipio', 'Puesto de votación', 'Profesión', 'ID'
];
const COL_CEDULA_LIDER = 5;   // E
const COL_VOTANTE_INI  = 7;   // G  (7 columnas del votante: G..M)
const COL_ID           = 14;  // N
const N = HEADERS.length;
const TEXT_COLS = ['C:C', 'E:E', 'F:F', 'H:H', 'J:J']; // cédulas y celulares como texto

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  const head = sh.getRange(1, 1, 1, N).getValues()[0];
  if (sh.getLastRow() === 0 || head[COL_ID - 1] !== 'ID') {
    sh.getRange(1, 1, 1, N).setValues([HEADERS]);
    TEXT_COLS.forEach(function (c) { sh.getRange(c).setNumberFormat('@'); });
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Borra TODOS los registros y deja solo los encabezados. Ejecutar a mano. */
function limpiarRegistros() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  sh.clear();
  sh.getRange(1, 1, 1, N).setValues([HEADERS]);
  TEXT_COLS.forEach(function (c) { sh.getRange(c).setNumberFormat('@'); });
  sh.setFrozenRows(1);
  return 'Pestaña "Registros" limpia.';
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(20000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'create';
    let out;
    switch (action) {
      case 'create':      out = createRec_(body); break;
      case 'list':        out = listRecs_(body); break;
      case 'update':      out = updateRec_(body); break;
      case 'delete':      out = deleteRec_(body); break;
      case 'updateLider': out = updateLider_(body); break;
      default:            out = { ok: false, error: 'acción desconocida: ' + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'list') {
    return json_(listRecs_({ liderCedula: e.parameter.cedula }));
  }
  return ContentService.createTextOutput('Endpoint de Registro de Votantes activo.');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function createRec_(d) {
  const sh = sheet_();
  const id = Utilities.getUuid();
  // Si no se indica responsable, se asume que diligenció el mismo líder.
  const respNombre = d.responsableNombre || d.liderNombre || '';
  const respCedula = d.responsableCedula || d.liderCedula || '';
  sh.appendRow([
    new Date(), respNombre, respCedula,
    d.liderNombre || '', d.liderCedula || '', d.liderCelular || '',
    d.votanteNombre || '', d.votanteCedula || '', d.lugarExpedicion || '', d.votanteCelular || '',
    d.municipio || '', d.puesto || '', d.profesion || '', id
  ]);
  return { ok: true, id: id };
}

function listRecs_(d) {
  const sh = sheet_();
  const cedula = String(d.liderCedula || '').trim();
  if (!cedula) return { ok: false, error: 'Falta la cédula del líder.' };
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, lider: null, votantes: [] };

  const rows = sh.getRange(2, 1, last - 1, N).getValues();
  const tz = Session.getScriptTimeZone();
  let lider = null;
  const votantes = [];
  rows.forEach(function (r) {
    if (String(r[COL_CEDULA_LIDER - 1]).trim() !== cedula) return;
    if (!lider) lider = { liderNombre: r[3], liderCedula: String(r[4]), liderCelular: String(r[5]) };
    votantes.push({
      id: r[COL_ID - 1],
      responsable: r[1], responsableCedula: String(r[2]),
      votanteNombre: r[6], votanteCedula: String(r[7]), lugarExpedicion: r[8],
      votanteCelular: String(r[9]), municipio: r[10], puesto: r[11], profesion: r[12],
      fecha: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : ''
    });
  });
  return { ok: true, lider: lider, votantes: votantes };
}

function findRowById_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, COL_ID, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function updateRec_(d) {
  const sh = sheet_();
  const row = findRowById_(sh, d.id);
  if (row < 0) return { ok: false, error: 'Registro no encontrado.' };
  sh.getRange(row, COL_VOTANTE_INI, 1, 7).setValues([[
    d.votanteNombre || '', d.votanteCedula || '', d.lugarExpedicion || '',
    d.votanteCelular || '', d.municipio || '', d.puesto || '', d.profesion || ''
  ]]);
  return { ok: true };
}

function deleteRec_(d) {
  const sh = sheet_();
  const row = findRowById_(sh, d.id);
  if (row < 0) return { ok: false, error: 'Registro no encontrado.' };
  sh.deleteRow(row);
  return { ok: true };
}

function updateLider_(d) {
  const sh = sheet_();
  const cedula = String(d.liderCedula || '').trim();
  if (!cedula) return { ok: false, error: 'Falta la cédula del líder.' };
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, updated: 0 };
  const rng = sh.getRange(2, 1, last - 1, N);
  const rows = rng.getValues();
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][COL_CEDULA_LIDER - 1]).trim() === cedula) {
      rows[i][3] = d.liderNombre || rows[i][3]; // Líder
      rows[i][5] = d.liderCelular || '';         // Celular líder
      count++;
    }
  }
  rng.setValues(rows);
  return { ok: true, updated: count };
}
