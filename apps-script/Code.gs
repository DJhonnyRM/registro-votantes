/**
 * Backend del formulario "Registro de Votantes".
 * Modelo: UNA persona por registro (con su ROL), ligada a un líder,
 * con un compromiso opcional. Todo se guarda en la pestaña "Registros".
 *
 * Acciones (campo "action" del cuerpo JSON):
 *   - create        : agrega una persona.
 *   - list          : personas de un líder (por su cédula).
 *   - update        : modifica una persona + su compromiso (por ID).
 *   - delete        : elimina una persona (por ID).
 *   - updateLider   : actualiza nombre/celular del líder en TODOS sus registros.
 *
 * INSTALAR / ACTUALIZAR
 * ---------------------
 * 1. Tu hoja → Extensiones → Apps Script → reemplaza TODO por este archivo. Guarda.
 * 2. (Opcional) Borrar todo: elige la función "limpiarRegistros" arriba y pulsa ▶.
 * 3. Implementar → Gestionar implementaciones → ✏️ Editar →
 *    Versión: "Nueva versión" → Implementar.  (La URL /exec NO cambia.)
 */

const SHEET_ID = '1hTnCuIuA8YAmA6KzUY1VaOJZUn91bKy6iDJlvty3i4A';
const TAB = 'Registros';
const HEADERS = [
  'Marca temporal',
  'Responsable (diligenció)', 'Cédula responsable',
  'Líder a cargo', 'Cédula líder', 'Celular líder',
  'Rol en su comunidad', 'Nombre', 'Cédula', 'Lugar de expedición',
  'Municipio', 'Teléfono', 'Profesión/oficio', 'Lugar donde vota',
  '¿Compromiso?', 'Descripción compromiso', 'Plazo cumplimiento',
  'Estado cumplimiento', 'Fecha cumplimiento',
  'ID'
];
const COL_CEDULA_LIDER = 5;   // E
const COL_PERSONA_INI  = 7;   // G  (persona + compromiso: G..S = 13 columnas)
const N_EDIT           = 13;  // columnas editables (rol..fecha compromiso)
const COL_ID           = 20;  // T
const N = HEADERS.length;
const TEXT_COLS = ['C:C', 'E:E', 'F:F', 'I:I', 'L:L']; // cédulas y teléfonos como texto

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

/** Campos editables de la persona + compromiso, en orden de columna (G..S). */
function personaRow_(d) {
  const comp = d.compromiso === 'Sí' ? 'Sí' : 'No';
  return [
    d.rol || '', d.nombre || '', d.cedula || '', d.lugarExpedicion || '',
    d.municipio || '', d.telefono || '', d.profesion || '', d.lugarVota || '',
    comp,
    comp === 'Sí' ? (d.compDescripcion || '') : '',
    comp === 'Sí' ? (d.compPlazo || '') : '',
    comp === 'Sí' ? (d.compEstado || '') : '',
    comp === 'Sí' ? (d.compFecha || '') : ''
  ];
}

function createRec_(d) {
  const sh = sheet_();
  const id = Utilities.getUuid();
  const respNombre = d.responsableNombre || d.liderNombre || '';
  const respCedula = d.responsableCedula || d.liderCedula || '';
  const row = [new Date(), respNombre, respCedula, d.liderNombre || '', d.liderCedula || '', d.liderCelular || '']
    .concat(personaRow_(d)).concat([id]);
  sh.appendRow(row);
  return { ok: true, id: id };
}

function listRecs_(d) {
  const sh = sheet_();
  const cedula = String(d.liderCedula || '').trim();
  if (!cedula) return { ok: false, error: 'Falta la cédula del líder.' };
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, lider: null, personas: [] };

  const rows = sh.getRange(2, 1, last - 1, N).getValues();
  const tz = Session.getScriptTimeZone();
  let lider = null;
  const personas = [];
  rows.forEach(function (r) {
    if (String(r[COL_CEDULA_LIDER - 1]).trim() !== cedula) return;
    if (!lider) lider = { liderNombre: r[3], liderCedula: String(r[4]), liderCelular: String(r[5]) };
    personas.push({
      id: r[COL_ID - 1],
      responsable: r[1],
      rol: r[6], nombre: r[7], cedula: String(r[8]), lugarExpedicion: r[9],
      municipio: r[10], telefono: String(r[11]), profesion: r[12], lugarVota: r[13],
      compromiso: r[14], compDescripcion: r[15], compPlazo: r[16],
      compEstado: r[17], compFecha: r[18],
      fecha: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : ''
    });
  });
  return { ok: true, lider: lider, personas: personas };
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
  sh.getRange(row, COL_PERSONA_INI, 1, N_EDIT).setValues([personaRow_(d)]);
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
      rows[i][3] = d.liderNombre || rows[i][3]; // Líder a cargo
      rows[i][5] = d.liderCelular || '';         // Celular líder
      count++;
    }
  }
  rng.setValues(rows);
  return { ok: true, updated: count };
}
