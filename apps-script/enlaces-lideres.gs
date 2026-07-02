/**
 * GENERADOR AUTOMÁTICO DE ENLACES PRE-RELLENADOS POR LÍDER
 * Funciona SOBRE TU GOOGLE FORM ACTUAL ("Listado de Votantes"), sin crear otro.
 *
 * Cada líder recibe un enlace que ya trae SUS datos cargados; solo llena al
 * votante y, con "Enviar otra respuesta", registra varios — todos a su nombre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PASO 1 — Identificar los campos del líder
 *   1. Entra a https://script.google.com → Nuevo proyecto → pega TODO esto → Guarda.
 *   2. Elige la función  listarCampos  y pulsa ▶ Ejecutar (autoriza si lo pide).
 *   3. Abre  Ver → Registros (Ejecución). Verás la lista de campos con su ID y,
 *      al final, un "MAPEO SUGERIDO" listo para copiar.
 *   4. Del bloque MAPEO, deja SOLO las líneas de los campos del líder
 *      (los que están bajo la sección "Datos del Líder o Votante", y el
 *      responsable si quieres) y pégalas dentro de MAPEO aquí abajo. Ajusta el
 *      texto de "col" a un nombre corto de columna. Guarda.
 *
 *      👉 Si prefieres, pásame el registro y te devuelvo el MAPEO ya listo.
 *
 * PASO 2 — Generar los enlaces
 *   5. Ejecuta  generarEnlacesLideres . Se crea/usa la pestaña "Líderes".
 *   6. En esa pestaña, escribe un líder por fila (una columna por cada campo del
 *      MAPEO) y vuelve a ejecutar  generarEnlacesLideres .
 *   7. En la última columna aparece el enlace de cada líder. ¡Repártelos!
 * ─────────────────────────────────────────────────────────────────────────
 */

var FORM_ID = '1KBT7MXvb-czEhbYqrRp3CJk46T2UiMi38vhNjzwEaug';

// ⬇️ Rellena esto con las líneas del "MAPEO SUGERIDO" (solo los campos del líder).
// 'col' = nombre de la columna en la hoja "Líderes"; 'itemId' = id del campo en el form.
var MAPEO = [
  // { col: 'Nombre del líder',   itemId: 000000000 },
  // { col: 'Cédula del líder',   itemId: 000000000 },
  // { col: 'Teléfono del líder', itemId: 000000000 },
];

var COL_ENLACE = 'Enlace para registrar votantes';

/** PASO 1: lista todos los campos del formulario con su ID + estructura. */
function listarCampos() {
  var form = FormApp.openById(FORM_ID);
  var items = form.getItems();
  Logger.log('FORMULARIO: ' + form.getTitle());
  Logger.log('Editar: ' + form.getEditUrl());
  Logger.log('──────── ESTRUCTURA ────────');
  var mapeo = [];
  items.forEach(function (it) {
    var tipo = String(it.getType());
    if (tipo === 'PAGE_BREAK' || tipo === 'SECTION_HEADER') {
      Logger.log('\n### SECCIÓN: ' + it.getTitle());
    } else {
      Logger.log('  id=' + it.getId() + '   (' + tipo + ')   ' + it.getTitle());
      mapeo.push("  { col: '" + it.getTitle().replace(/'/g, "\\'") + "', itemId: " + it.getId() + " },");
    }
  });
  Logger.log('\n──────── MAPEO SUGERIDO (copia solo las líneas del LÍDER) ────────');
  Logger.log('var MAPEO = [\n' + mapeo.join('\n') + '\n];');
}

/** PASO 2: genera un enlace pre-rellenado por cada fila de la pestaña "Líderes". */
function generarEnlacesLideres() {
  if (!MAPEO.length) throw new Error('Primero configura MAPEO (ejecuta listarCampos y sigue el PASO 1).');
  var form = FormApp.openById(FORM_ID);
  var sh = hojaLideres_(form);
  var data = sh.getDataRange().getValues();
  var header = data[0];

  var idx = MAPEO.map(function (m) { return header.indexOf(m.col); });
  var enlaceCol = header.indexOf(COL_ENLACE);
  MAPEO.forEach(function (m, i) { if (idx[i] < 0) throw new Error('Falta la columna "' + m.col + '" en la pestaña Líderes.'); });

  var hechos = 0;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var tieneDatos = MAPEO.some(function (m, i) { return row[idx[i]] !== '' && row[idx[i]] != null; });
    if (!tieneDatos) continue;
    var resp = form.createResponse();
    MAPEO.forEach(function (m, i) {
      var val = row[idx[i]];
      if (val === '' || val == null) return;
      var item = form.getItemById(m.itemId);
      var ir = item ? respuestaItem_(item, val) : null;
      if (ir) resp = resp.withItemResponse(ir);
    });
    sh.getRange(r + 1, enlaceCol + 1).setValue(resp.toPrefilledUrl());
    hechos++;
  }
  Logger.log('✅ Enlaces generados: ' + hechos + '. Revisa la columna "' + COL_ENLACE + '" en la pestaña "Líderes".');
}

/* ───── helpers ───── */

// Crea/usa la pestaña "Líderes" en la hoja de respuestas del formulario.
function hojaLideres_(form) {
  var destId = form.getDestinationId();
  var ss = destId ? SpreadsheetApp.openById(destId)
                  : SpreadsheetApp.create('Enlaces de líderes – UN LUGAR PARA LA VIDA');
  var sh = ss.getSheetByName('Líderes');
  if (!sh) {
    sh = ss.insertSheet('Líderes');
    var head = MAPEO.map(function (m) { return m.col; }).concat([COL_ENLACE]);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    // columnas de cédula/teléfono como texto
    for (var c = 1; c <= MAPEO.length; c++) {
      if (/c[eé]dula|tel[eé]fono|celular/i.test(MAPEO[c - 1].col)) sh.getRange(1, c, sh.getMaxRows()).setNumberFormat('@');
    }
    Logger.log('Pestaña "Líderes" creada en: ' + ss.getUrl());
  }
  return sh;
}

// Construye la respuesta según el tipo de campo (texto, opción, fecha…).
function respuestaItem_(item, val) {
  var t = String(item.getType());
  try {
    if (t === 'TEXT') return item.asTextItem().createResponse(String(val));
    if (t === 'PARAGRAPH_TEXT') return item.asParagraphTextItem().createResponse(String(val));
    if (t === 'MULTIPLE_CHOICE') return item.asMultipleChoiceItem().createResponse(String(val));
    if (t === 'LIST') return item.asListItem().createResponse(String(val));
    if (t === 'DATE') return item.asDateItem().createResponse(new Date(val));
  } catch (e) { return null; }
  return null;
}
