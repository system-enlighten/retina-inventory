/**
 * The production register has its own worksheet. Both the revision and all
 * data chunks are committed in one range write with the script lock held.
 */
function productionRegister_(input) {
  var sheetName = 'Retina Production Register';
  var schema = 'RETINA_PRODUCTION_V1';
  var chunkSize = 40000;
  var chunkCount = 30;
  var fieldCount = 3 + chunkCount;
  var salesMutation = ['estimateSave','estimateIssue','estimatePayment','estimateEdit','invoiceEdit','invoicePayment'].indexOf(input.action) !== -1;
  var isSave = input.action === 'productionSave' || salesMutation;
  var encoded = '';
  if (isSave && !salesMutation) {
    var state = input.state;
    var lists = ['tables', 'ingredients', 'batches', 'menu', 'kots', 'sales', 'activity'];
    if (!Number.isSafeInteger(input.revision) || input.revision < 0 ||
        !state || typeof state !== 'object' || typeof state.name !== 'string' ||
        typeof state.currency !== 'string' || !/^[A-Z]{3}$/.test(state.currency) ||
        !lists.every(function(key) {
          return Array.isArray(state[key]) && state[key].every(function(row) {
            return row && typeof row === 'object' && !Array.isArray(row);
          });
        })) {
      throw Error('Invalid production register data.');
    }
    encoded = Utilities.base64Encode(JSON.stringify(state), Utilities.Charset.UTF_8);
    if (encoded.length > chunkSize * chunkCount) throw Error('Production register exceeds the cloud storage limit.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var spreadsheet = getSpreadsheet_();
    var sheet = spreadsheet.getSheetByName(sheetName);
    var row = sheet ? sheet.getRange(1, 1, 1, Math.min(fieldCount, sheet.getMaxColumns())).getValues()[0] : [];
    var hasData = row.some(function(cell) { return cell !== ''; });
    if (hasData && (row[0] !== schema || !Number.isSafeInteger(row[1]) || row[1] < 1)) {
      throw Error('Production worksheet has an unrecognized format.');
    }
    var revision = hasData ? row[1] : 0;
    if (!isSave || salesMutation) {
      var current = null;
      if (revision) {
        var chunks = row.slice(3).filter(function(cell) { return cell !== ''; });
        if (!chunks.length || chunks.some(function(chunk) { return typeof chunk !== 'string' || chunk.slice(0, 2) !== 'j:'; })) {
          throw Error('Production worksheet data could not be read.');
        }
        var joined = chunks.map(function(chunk) { return chunk.slice(2); }).join('');
        current = JSON.parse(Utilities.newBlob(Utilities.base64Decode(joined)).getDataAsString('UTF-8'));
      }
      if (!salesMutation) return { ok: true, revision: revision, state: current };
      if (!current) current = {name:'Retina Lighting Systems',currency:'INR',tables:[],ingredients:[],batches:[],menu:[],kots:[],sales:[],activity:[]};
      var estimate = retinaEstimateMutation_(current, input);
      encoded = Utilities.base64Encode(JSON.stringify(current), Utilities.Charset.UTF_8);
      if (encoded.length > chunkSize * chunkCount) throw Error('Production register exceeds the cloud storage limit.');
    } else if (input.revision !== revision) {
      return { ok: false, conflict: true, error: 'A newer production revision is already saved.' };
    }
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    var width = sheet.getMaxColumns();
    if (width < fieldCount) sheet.insertColumnsAfter(width, fieldCount - width);
    var values = [schema, revision + 1, new Date()];
    for (var offset = 0; offset < encoded.length; offset += chunkSize) {
      values.push('j:' + encoded.slice(offset, offset + chunkSize));
    }
    while (values.length < fieldCount) values.push('');
    sheet.getRange(1, 1, 1, fieldCount).setValues([values]);
    SpreadsheetApp.flush();
    return { ok: true, revision: revision + 1, estimate: estimate };
  } finally {
    lock.releaseLock();
  }
}


function retinaEstimateMutation_(state, input) {
  var data = input.estimate || {};
  if (input.action === 'invoiceEdit' || input.action === 'invoicePayment') {
    var invoice = (state.invoices || []).find(function(row) { return row.id === data.id; });
    if (!invoice) throw Error('Invoice not found.');
    if (input.action === 'invoiceEdit') {
      invoice.note = String(data.note || '').trim().slice(0,250);
      return invoice;
    }
    invoice.payments = invoice.payments || [];
    var paymentRef = String(data.reference || '').trim();
    if (!paymentRef || paymentRef.length > 120 || !Number.isSafeInteger(data.cents) || data.cents < 1)
      throw Error('Enter a valid payment amount and reference.');
    var duplicate = invoice.payments.find(function(payment) { return payment.reference === paymentRef; });
    if (duplicate) {
      if (duplicate.cents !== data.cents) throw Error('This reference has already been recorded.');
      return invoice;
    }
    var received = invoice.payments.reduce(function(sum,payment) { return sum + payment.cents; },0);
    if (data.cents > invoice.subtotalCents - invoice.advanceCents - received)
      throw Error('Payment exceeds the invoice balance before tax.');
    invoice.payments.push({reference:paymentRef,cents:data.cents,receivedAt:new Date().toISOString()});
    return invoice;
  }
  state.estimates = state.estimates || [];
  var existing = state.estimates.find(function(row) { return row.id === data.id; });
  if (input.action === 'estimateSave' || input.action === 'estimateIssue' || input.action === 'estimateEdit') {
    if (input.action === 'estimateEdit' && (!existing || existing.versions && existing.versions.length)) throw Error('Only drafts can be edited without issuing a revision.');
    if (existing && existing.payment) throw Error('A released estimate cannot be revised.');
    if (existing && input.action === 'estimateSave') return existing;
    var versions = existing ? existing.versions || [] : [];
    if (input.action === 'estimateIssue' && data.revision !== versions.length) throw Error('Reload the current estimate before issuing a revision.');
    var name = String(data.name || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(data.id || '') || !name || name.length > 120 ||
        !Array.isArray(data.items) || !data.items.length || data.items.length > 300) throw Error('Enter a project name and up to 300 estimate lines.');
    var items = data.items.map(function(item) {
      var sku = String(item && item.sku || '').trim().toUpperCase();
      if (!sku || sku.length > 100 || !Number.isSafeInteger(item.count) || item.count < 1 || item.count > 1000000 ||
          !Number.isSafeInteger(item.cents) || item.cents < 1 || item.cents > 100000000) throw Error('Each estimate line needs a SKU, quantity and unit price.');
      var kind = item.kind === 'Linear' ? 'Linear' : 'Basic';
      if (kind === 'Linear' && (!Number.isSafeInteger(item.lengthMm) || item.lengthMm < 1 || item.lengthMm > 1000000))
        throw Error('Every linear line needs a valid cut length in millimetres.');
      return {sku:sku,count:item.count,cents:item.cents,kind:kind,lengthMm:kind === 'Linear' ? item.lengthMm : null,
        sourceArticle:String(item.sourceArticle || '').slice(0,100),circuit:String(item.circuit || '').slice(0,100),
        floor:String(item.floor || '').slice(0,100),zone:String(item.zone || '').slice(0,100)};
    });
    var estimate = existing || {id:data.id,ref:'EST-' + String(state.estimates.length + 1).padStart(4,'0'),versions:[]};
    var source = data.source || existing && existing.source || {};
    if (existing && existing.source && existing.source.projectId && source.projectId !== existing.source.projectId)
      throw Error('Use technical output from the same project when issuing a revision.');
    estimate.name = name;
    estimate.items = items;
    estimate.source = {projectId:String(source.projectId || '').slice(0,100),projectCode:String(source.projectCode || '').slice(0,100),
      technicalVersion:String(source.technicalVersion || '').slice(0,100)};
    if (input.action === 'estimateIssue') {
      estimate.versions = versions;
      versions.push({version:versions.length+1,revision:versions.length,issuedAt:new Date().toISOString(),name:name,items:items,source:estimate.source});
    }
    if (!existing) state.estimates.push(estimate);
    return estimate;
  }
  if (!existing) throw Error('Estimate not found.');
  if (existing.payment) return existing;
  var issued = (existing.versions || []).slice(-1)[0];
  if (!issued || issued.revision !== data.revision) throw Error('Issue and select the current revision before recording the advance.');
  var reference = String(data.reference || '').trim();
  var total = issued.items.reduce(function(sum,item) { return sum + item.count * item.cents; },0);
  if (!reference || reference.length > 100 || !Number.isSafeInteger(data.cents) || data.cents < 1 || data.cents > total)
    throw Error('Enter a reference and an advance between zero and the issued estimate total.');
  var now = new Date().toISOString();
  var project = issued.source.projectId && state.tables.find(function(row) {
    return row.recordType === 'project' && row.enlightenProjectId === issued.source.projectId;
  });
  if (!project) {
    project = {id:Utilities.getUuid(),name:issued.name,kind:'Other project',recordType:'project',lines:[],
      enlightenProjectId:issued.source.projectId,estimateRef:existing.ref};
    state.tables.push(project);
  }
  state.productionSheets = state.productionSheets || [];
  ['Basic','Linear'].forEach(function(kind) {
    var lines = [], pending = [];
    issued.items.filter(function(item) { return item.kind === kind; }).forEach(function(item) {
      var matches = state.menu.filter(function(product) {
        return String(product.code || '').trim().toUpperCase() === item.sku && Object.keys(product.recipe || {}).length &&
          (!item.lengthMm || product.linearLengthMm === item.lengthMm);
      });
      if (matches.length !== 1) { pending.push(item); return; }
      var product = matches[0];
      lines.push({id:Utilities.getUuid(),dish:product.id,name:product.name,group:product.group,code:item.sku,
        price:item.cents / 100,recipe:product.recipe,count:item.count,bomRevision:product.bomRevision,configuration:product.configuration,
        lengthMm:item.lengthMm,circuit:item.circuit,floor:item.floor,zone:item.zone});
    });
    if (!lines.length && !pending.length) return;
    state.productionSheets.push({id:Utilities.getUuid(),projectId:project.id,name:project.name,ref:existing.ref + '-R' + issued.revision + '-' + kind.toUpperCase(),
      estimateId:existing.id,estimateRevision:issued.revision,kind:kind,lines:lines,pending:pending,status:'Draft',createdAt:now,paymentRequired:true});
  });
  existing.payment = {reference:reference,cents:data.cents,receivedAt:now,revision:issued.revision};
  return existing;
}
