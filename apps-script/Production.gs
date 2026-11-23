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
  var salesMutation = input.action === 'estimateSave' || input.action === 'estimatePayment';
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
  state.estimates = state.estimates || [];
  var existing = state.estimates.find(function(row) { return row.id === data.id; });
  if (input.action === 'estimateSave') {
    if (existing) return existing;
    var name = String(data.name || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(data.id || '') || !name || name.length > 120 ||
        !Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw Error('Enter a project name and up to 100 estimate lines.');
    var items = data.items.map(function(item) {
      var sku = String(item && item.sku || '').trim().toUpperCase();
      if (!sku || sku.length > 100 || !Number.isSafeInteger(item.count) || item.count < 1 || item.count > 1000000 ||
          !Number.isSafeInteger(item.cents) || item.cents < 1 || item.cents > 100000000) throw Error('Each estimate line needs a SKU, quantity and unit price.');
      return {sku:sku,count:item.count,cents:item.cents};
    });
    var estimate = {id:data.id,ref:'EST-' + String(state.estimates.length + 1).padStart(4,'0'),name:name,items:items};
    state.estimates.push(estimate);
    return estimate;
  }
  if (!existing) throw Error('Estimate not found.');
  if (existing.payment) return existing;
  var reference = String(data.reference || '').trim();
  var total = existing.items.reduce(function(sum,item) { return sum + item.count * item.cents; },0);
  if (!reference || reference.length > 100 || data.cents !== total) throw Error('Enter a reference and the full estimate amount to release it to production.');
  var now = new Date().toISOString();
  var project = {id:Utilities.getUuid(),name:existing.name,kind:'Other project',recordType:'project',lines:[],estimateRef:existing.ref};
  var pending = [];
  existing.items.forEach(function(item) {
    var matches = state.menu.filter(function(product) {
      return String(product.code || '').trim().toUpperCase() === item.sku && Object.keys(product.recipe || {}).length;
    });
    if (matches.length !== 1) { pending.push(item); return; }
    var product = matches[0];
    project.lines.push({id:Utilities.getUuid(),dish:product.id,name:product.name,group:product.group,code:item.sku,
      price:item.cents / 100,recipe:product.recipe,count:item.count,bomRevision:product.bomRevision,configuration:product.configuration});
  });
  state.tables.push(project);
  state.productionSheets = state.productionSheets || [];
  state.productionSheets.push({id:Utilities.getUuid(),projectId:project.id,name:project.name,ref:existing.ref,
    lines:project.lines,pending:pending,status:'Draft',createdAt:now,paymentRequired:true});
  project.lines = [];
  existing.payment = {reference:reference,cents:data.cents,receivedAt:now};
  return existing;
}
