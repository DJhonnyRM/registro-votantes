/**
 * CREA UN GOOGLE FORM NUEVO A LA MEDIDA
 * Campaña "UN LUGAR PARA LA VIDA" — Inscripción de votantes 2027 · López de Micay.
 *
 * Resuelve el problema del formulario viejo: con RAMIFICACIÓN, si el líder ya
 * existe solo lo eliges de una lista (no te vuelve a pedir sus datos). Los
 * desplegables de líder y responsable se llenan SOLOS desde los registros.
 *
 * CÓMO USARLO
 * -----------
 * 1. Entra a https://script.google.com → "Nuevo proyecto" (uno NUEVO, aparte).
 * 2. Borra lo que haya, pega TODO este archivo y guarda (💾).
 * 3. Ejecuta la función  crearFormularioNuevo  (autoriza cuando lo pida).
 * 4. Abre  Ver → Registros (Ejecución): ahí salen los enlaces del formulario y
 *    de la hoja de respuestas.
 *
 * Flujo para quien registra:
 *   • Líder ya registrado  → "Sí" → lo elige de la lista → pasa al votante.
 *   • Líder nuevo          → "No" → escribe sus datos (una sola vez).
 *   Desde el 2.º votante de ese líder, ya aparece en la lista.
 */

var ROLES_LIDER = ['Líder Familiar', 'Líder Comunitario'];
var PLAZOS = ['Antes de las elecciones', 'Durante las elecciones', 'Después de las elecciones'];
var ESTADOS = ['Pendiente', 'En proceso', 'Cumplido', 'No cumplido'];

// Títulos (también los usa el harvester; no los cambies sin actualizar ambos).
var T = {
  respDrop: 'Responsable (elige de la lista)',
  respNew: 'Si no estás en la lista, escribe tu nombre completo',
  liderExiste: '¿El votante pertenece a un líder?',
  liderDrop: 'Líder al que pertenece',
  liderNombre: 'Nombre completo del líder',
  liderCedula: 'Cédula del líder'
};

function crearFormularioNuevo() {
  var form = FormApp.create('UN LUGAR PARA LA VIDA – Inscripción de votantes');
  form.setDescription('Elecciones Regionales 2027 · Alcaldía de López de Micay, Cauca\n' +
    'Cada envío registra un votante a nombre de su líder. Usa "Enviar otra respuesta" para registrar varios.');
  var num = nfNum_();

  // ── Página 1: quién diligencia + ¿el líder ya existe? ──
  form.addSectionHeaderItem().setTitle('¿Quién está diligenciando?');
  form.addListItem().setTitle(T.respDrop).setRequired(false)
    .setHelpText('Si aún no apareces en la lista, déjalo vacío y escribe tu nombre abajo.')
    .setChoiceValues(['(aún no hay responsables registrados)']);
  form.addTextItem().setTitle(T.respNew).setRequired(false);
  var qLider = form.addMultipleChoiceItem().setTitle(T.liderExiste).setRequired(true)
    .setHelpText('Elige "votante individual" si no pertenece a ningún líder.');

  // ── Página 2A: elegir líder existente ──
  var pbExiste = form.addPageBreakItem().setTitle('Elegir líder').setHelpText('Elige el líder al que pertenece este votante.');
  form.addListItem().setTitle(T.liderDrop).setRequired(true)
    .setHelpText('Selecciona de la lista.')
    .setChoiceValues(['(aún no hay líderes registrados)']);

  // ── Página 2B: líder nuevo ──
  var pbNuevo = form.addPageBreakItem().setTitle('Datos del líder nuevo');
  nfAddT_(form, T.liderNombre, true, null);
  nfAddT_(form, T.liderCedula, true, num);
  nfAddT_(form, 'Teléfono del líder', false, num);
  nfAddT_(form, 'Lugar de expedición del líder', false, null);
  nfAddT_(form, 'Municipio del líder', false, null);
  nfAddT_(form, 'Profesión / oficio del líder', false, null);
  form.addMultipleChoiceItem().setTitle('Rol del líder').setChoiceValues(ROLES_LIDER).setRequired(true);
  nfAddT_(form, 'Lugar donde vota el líder', false, null);

  // ── Página 3: votante ──
  var pbVot = form.addPageBreakItem().setTitle('Datos del votante').setHelpText('La persona que estás registrando.');
  nfAddT_(form, 'Nombres y apellidos del votante', true, null);
  nfAddT_(form, 'Cédula del votante', true, num);
  nfAddT_(form, 'Lugar de expedición', false, null);
  nfAddT_(form, 'Municipio donde vive', false, null);
  nfAddT_(form, 'Teléfono', false, num);
  nfAddT_(form, 'Profesión / oficio', false, null);
  nfAddT_(form, 'Lugar donde vota', true, null);

  // ── Página 4: ¿compromiso? ──
  form.addPageBreakItem().setTitle('Compromiso');
  var qComp = form.addMultipleChoiceItem().setTitle('¿Adquiere un compromiso?').setRequired(true);

  // ── Página 5: datos del compromiso ──
  var pbCompDatos = form.addPageBreakItem().setTitle('Datos del compromiso');
  form.addParagraphTextItem().setTitle('Descripción del compromiso').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Plazo para el cumplimiento').setChoiceValues(PLAZOS).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Estado del cumplimiento').setChoiceValues(ESTADOS).setRequired(true);
  form.addDateItem().setTitle('Fecha del cumplimiento').setRequired(false);

  // ── Ramificaciones ──
  qLider.setChoices([
    qLider.createChoice('Sí, a un líder ya registrado', pbExiste),
    qLider.createChoice('Sí, a un líder nuevo', pbNuevo),
    qLider.createChoice('No, es un votante individual', pbVot) // salta directo al votante, sin líder
  ]);
  pbExiste.setGoToPage(pbVot); // tras elegir líder existente, salta al votante (omite líder nuevo)
  pbNuevo.setGoToPage(pbVot);  // tras crear líder nuevo, sigue al votante
  qComp.setChoices([
    qComp.createChoice('No', FormApp.PageNavigationType.SUBMIT),
    qComp.createChoice('Sí', pbCompDatos)
  ]);

  // ── Ajustes: respuestas múltiples ──
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage('¡Registro guardado! Toca "Enviar otra respuesta" para registrar otro votante.');

  // ── Hoja de respuestas ──
  var ss = SpreadsheetApp.create('UN LUGAR PARA LA VIDA – Respuestas');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ── Guardar ID + instalar harvester (llena los desplegables desde los registros) ──
  PropertiesService.getScriptProperties().setProperty('NF_FORM_ID', form.getId());
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'nfActualizarDesplegables') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('nfActualizarDesplegables').forForm(form).onFormSubmit().create();

  Logger.log('✅ FORMULARIO CREADO');
  Logger.log('• Responder:  ' + form.getPublishedUrl());
  Logger.log('• Editar:     ' + form.getEditUrl());
  Logger.log('• Respuestas: ' + ss.getUrl());
}

/** Llena los desplegables de líder y responsable con lo que haya en los registros. */
function nfActualizarDesplegables() {
  var formId = PropertiesService.getScriptProperties().getProperty('NF_FORM_ID');
  if (!formId) return;
  var form = FormApp.openById(formId);
  var lideres = {}, responsables = {};
  form.getResponses().forEach(function (resp) {
    var tit = {};
    resp.getItemResponses().forEach(function (ir) { tit[ir.getItem().getTitle()] = ir.getResponse(); });
    var lid = String(tit[T.liderDrop] || '').trim() || nfArmar_(tit[T.liderNombre], tit[T.liderCedula]);
    var res = String(tit[T.respDrop] || '').trim() || String(tit[T.respNew] || '').trim();
    if (lid && lid.charAt(0) !== '(') lideres[lid] = 1;
    if (res && res.charAt(0) !== '(') responsables[res] = 1;
  });
  var lL = Object.keys(lideres), lR = Object.keys(responsables);
  if (lL.length) nfItem_(form, T.liderDrop).asListItem().setChoiceValues(lL);
  if (lR.length) nfItem_(form, T.respDrop).asListItem().setChoiceValues(lR);
  Logger.log('✅ Líderes: ' + lL.length + ' · Responsables: ' + lR.length);
}

/* ── helpers ── */
function nfAddT_(form, titulo, req, valid) {
  var it = form.addTextItem().setTitle(titulo).setRequired(!!req);
  if (valid) it.setValidation(valid);
  return it;
}
function nfNum_() {
  try { return FormApp.createTextValidation().setHelpText('Escribe solo números.').requireNumber().build(); }
  catch (e) { return null; }
}
function nfItem_(form, titulo) {
  var it = form.getItems();
  for (var i = 0; i < it.length; i++) if (it[i].getTitle() === titulo) return it[i];
  return null;
}
function nfArmar_(n, c) {
  n = String(n || '').trim(); c = String(c || '').trim();
  return n ? (c ? n + ' – ' + c : n) : '';
}
