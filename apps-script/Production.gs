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
  var isSave = input.action === 'productionSave';
  var encoded = '';
  if (isSave) {
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
    if (!isSave) {
      if (!revision) return { ok: true, revision: 0, state: null };
      var chunks = row.slice(3).filter(function(cell) { return cell !== ''; });
      if (!chunks.length || chunks.some(function(chunk) { return typeof chunk !== 'string' || chunk.slice(0, 2) !== 'j:'; })) {
        throw Error('Production worksheet data could not be read.');
      }
      var joined = chunks.map(function(chunk) { return chunk.slice(2); }).join('');
      var decoded = Utilities.newBlob(Utilities.base64Decode(joined)).getDataAsString('UTF-8');
      return { ok: true, revision: revision, state: JSON.parse(decoded) };
    }
    if (input.revision !== revision) {
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
    return { ok: true, revision: revision + 1 };
  } finally {
    lock.releaseLock();
  }
}
