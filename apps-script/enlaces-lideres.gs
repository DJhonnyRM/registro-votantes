/**
 * GENERADOR AUTOMÁTICO DE ENLACES PRE-RELLENADOS POR LÍDER
 * Funciona SOBRE TU GOOGLE FORM ACTUAL ("Listado de Votantes"), sin crear otro.
 *
 * Cada líder recibe un enlace que ya trae SUS datos cargados; solo llena al
 * votante y, con "Enviar otra respuesta", registra varios — todos a su nombre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * El MAPEO de abajo YA ESTÁ configurado para tu formulario. Solo tienes que:
 *   1. Entra a https://script.google.com → Nuevo proyecto → pega TODO esto → Guarda.
 *   2. Ejecuta  generarEnlacesLideres  (autoriza si lo pide). Crea la pestaña
 *      "Líderes" en tu hoja de respuestas.
 *   3. En esa pestaña escribe un líder por fila (una columna por dato) y vuelve a
 *      ejecutar  generarEnlacesLideres . En la última columna sale el enlace de
 *      cada líder, listo para repartir.
 *
 * (Opcional) La función  listarCampos  muestra todos los campos del form con su
 * ID, por si algún día cambias la estructura y quieres rehacer el MAPEO.
 * ─────────────────────────────────────────────────────────────────────────
 */

var FORM_ID = '1KBT7MXvb-czEhbYqrRp3CJk46T2UiMi38vhNjzwEaug';

// ✅ YA CONFIGURADO para tu formulario "INSCRIPCIÓN DE VOTANTES".
// Pre-rellena al RESPONSABLE y al LÍDER con los mismos datos del líder (porque él
// registra), así el líder solo llena al votante. Varios itemId comparten columna.
var MAPEO = [
  // Sección "Datos del responsable del registro" (se llena con el líder)
  { col: 'Nombre del líder',    itemId: 1625673428 },
  { col: 'Cédula del líder',    itemId: 1912956318 },
  { col: 'Teléfono del líder',  itemId: 1670270652 },
  // Sección "Datos del Líder o Votante"
  { col: 'Nombre del líder',    itemId: 1180528852 },
  { col: 'Cédula del líder',    itemId: 798496070 },
  { col: 'Teléfono del líder',  itemId: 421600939 },
  { col: 'Lugar de expedición', itemId: 1219038157 },
  { col: 'Municipio',           itemId: 603032919 },
  { col: 'Profesión/oficio',    itemId: 1475911525 },
  { col: 'Rol en su comunidad', itemId: 1746164794 }, // debe coincidir EXACTO con una opción (ej: "Líder Comunitario")
  { col: 'Lugar donde vota',    itemId: 464884929 },
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

// Columnas únicas de la pestaña "Líderes" (varios itemId pueden compartir columna).
function columnasUnicas_() {
  var vistas = {}, out = [];
  MAPEO.forEach(function (m) { if (!vistas[m.col]) { vistas[m.col] = 1; out.push(m.col); } });
  return out;
}

// Crea/usa la pestaña "Líderes" en la hoja de respuestas del formulario.
function hojaLideres_(form) {
  var destId = form.getDestinationId();
  var ss = destId ? SpreadsheetApp.openById(destId)
                  : SpreadsheetApp.create('Enlaces de líderes – UN LUGAR PARA LA VIDA');
  var sh = ss.getSheetByName('Líderes');
  if (!sh) {
    sh = ss.insertSheet('Líderes');
    var cols = columnasUnicas_();
    sh.appendRow(cols.concat([COL_ENLACE]));
    sh.setFrozenRows(1);
    cols.forEach(function (c, i) {
      if (/c[eé]dula|tel[eé]fono|celular/i.test(c)) sh.getRange(1, i + 1, sh.getMaxRows()).setNumberFormat('@');
    });
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

/**
 * Ramificación del compromiso (ejecutar UNA vez):
 * "Sí" → pide los datos del compromiso;  "No"/"NS/NR" → envía el formulario.
 */
var ID_COMPROMISO = 76192205; // pregunta "COMPROMISO"

function configurarRamificacionCompromiso() {
  var form = FormApp.openById(FORM_ID);
  var pb = null;
  form.getItems(FormApp.ItemType.PAGE_BREAK).forEach(function (it) {
    if (/datos del compromiso/i.test(it.getTitle() || '')) pb = it.asPageBreakItem();
  });
  if (!pb) throw new Error('No encontré la sección "Datos del compromiso".');

  var comp = form.getItemById(ID_COMPROMISO).asMultipleChoiceItem();
  var nuevas = comp.getChoices().map(function (c) {
    var v = c.getValue();
    var destino = /^\s*s[ií]\b/i.test(v) ? pb : FormApp.PageNavigationType.SUBMIT;
    return comp.createChoice(v, destino);
  });
  comp.setChoices(nuevas);
  comp.setRequired(true);
  pb.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  Logger.log('✅ "Sí" pide los datos del compromiso; las demás opciones envían el formulario.');
}

/* ===== LISTA DESPLEGABLE DE LÍDERES (se actualiza sola desde la pestaña "Líderes") =====
 * Ejecuta  instalarDesplegableLideres  UNA vez. Crea el desplegable arriba del
 * formulario y deja un disparador que lo refresca al editar la pestaña "Líderes".
 */
var TITULO_DESPLEGABLE = 'Líder al que perteneces';

function instalarDesplegableLideres() {
  actualizarDesplegableLideres();
  var ssId = FormApp.openById(FORM_ID).getDestinationId();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'actualizarDesplegableLideres') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('actualizarDesplegableLideres').forSpreadsheet(ssId).onEdit().create();
  Logger.log('✅ Desplegable "' + TITULO_DESPLEGABLE + '" listo. Se actualiza solo al editar la pestaña "Líderes".');
}

function actualizarDesplegableLideres() {
  var form = FormApp.openById(FORM_ID);
  var ss = SpreadsheetApp.openById(form.getDestinationId());
  var sh = ss.getSheetByName('Líderes');
  if (!sh || sh.getLastRow() < 2) return;
  var vals = sh.getDataRange().getValues();
  var head = vals[0];
  var iN = head.indexOf('Nombre del líder'); if (iN < 0) iN = 0;
  var iC = head.indexOf('Cédula del líder');
  var opciones = [];
  for (var r = 1; r < vals.length; r++) {
    var n = String(vals[r][iN] || '').trim();
    var c = iC >= 0 ? String(vals[r][iC] || '').trim() : '';
    if (!n) continue;
    opciones.push(c ? (n + ' – ' + c) : n);
  }
  opciones = opciones.filter(function (v, i, a) { return a.indexOf(v) === i; });
  if (opciones.length) desplegable_(form).setChoiceValues(opciones);
}

function desplegable_(form) {
  var items = form.getItems(FormApp.ItemType.LIST);
  for (var i = 0; i < items.length; i++)
    if (items[i].getTitle() === TITULO_DESPLEGABLE) return items[i].asListItem();
  var it = form.addListItem().setTitle(TITULO_DESPLEGABLE).setHelpText('Elige tu líder de la lista.').setRequired(true);
  form.moveItem(it.getIndex(), 0);
  return it;
}

/**
 * Deja OPCIONALES los campos del responsable y del líder (secciones 2 y 3),
 * para el flujo de enlace único + desplegable. Los campos del votante NO se tocan.
 * Ejecutar UNA vez. (Reversible: cambia false por true si quieres volverlos obligatorios.)
 */
var IDS_LIDER_OPCIONAL = [
  494433092, 1625673428, 1912956318, 1670270652,               // Responsable
  1180528852, 798496070, 1219038157, 603032919, 421600939,      // Líder
  1475911525, 1746164794, 464884929, 1091479994
];

function hacerLiderOpcional() {
  var form = FormApp.openById(FORM_ID);
  var n = 0;
  IDS_LIDER_OPCIONAL.forEach(function (id) {
    var it = form.getItemById(id);
    if (!it) return;
    var t = String(it.getType());
    try {
      if (t === 'TEXT') it.asTextItem().setRequired(false);
      else if (t === 'PARAGRAPH_TEXT') it.asParagraphTextItem().setRequired(false);
      else if (t === 'MULTIPLE_CHOICE') it.asMultipleChoiceItem().setRequired(false);
      else if (t === 'LIST') it.asListItem().setRequired(false);
      else if (t === 'DATE') it.asDateItem().setRequired(false);
      else if (t === 'CHECKBOX') it.asCheckboxItem().setRequired(false);
      n++;
    } catch (e) {}
  });
  Logger.log('✅ Campos de responsable y líder puestos como opcionales: ' + n);
}
