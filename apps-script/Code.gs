/**
 * RETINA LIGHTING SYSTEMS — BACKEND SCRIPT (v2.6)
 * Google Apps Script for Inventory, Manufacturing POS & Catalogue Management
 * 
 * Deployment Instructions:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Paste this entire file into Code.gs (replacing any existing code).
 * 3. Go to Project Settings (gear icon) -> Script Properties:
 *    - RETINA_SHARED_SECRET: Set a long random secret key (e.g. retina_sec_2026_xyz)
 *    - RETINA_SHEET_ID: (Optional if bound to spreadsheet) The Google Sheet ID.
 * 4. Deploy -> New Deployment -> Select type "Web app":
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 5. Set the Web app URL as RETINA_SCRIPT_URL in Vercel. Add the supplied Production.gs file.
 * 6. (Optional) Run `setupRetinaSheets()` once from the editor to auto-create missing tabs.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'status';
  if (action === 'ping') {
    return reply_({ ok: true, message: 'Retina Apps Script backend is live', timestamp: new Date() });
  }
  return ContentService.createTextOutput(
    "RETINA LIGHTING — INVENTORY & POS BACKEND SERVICE\n" +
    "Status: Operational\n" +
    "Endpoint: POST /exec with JSON payload { secret, action, ... }\n" +
    "Available Actions: move, saveProduct, getInventory, test, productionLoad, productionSave\n" +
    "Timestamp: " + new Date().toISOString()
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw Error('No post data received in request');
    }
    var input = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty('RETINA_SHARED_SECRET');
    if (!expected || input.secret !== expected) {
      throw Error('Unauthorized backend request: invalid or missing secret');
    }

    var action = String(input.action || '').trim();
    if (['productionLoad', 'productionSave', 'estimateSave', 'estimateIssue', 'estimatePayment', 'estimateEdit', 'invoiceEdit', 'invoicePayment', 'salesProjectCreate'].indexOf(action) !== -1) {
      return reply_(productionRegister_(input));
    } else if (action === 'saveProduct') {
      return reply_(saveProduct_(input));
    } else if (action === 'move') {
      return reply_(applyMovement_(input));
    } else if (action === 'getInventory' || action === 'sync') {
      return reply_(getInventory_(input));
    } else if (action === 'test') {
      var ss = getSpreadsheet_();
      return reply_({
        ok: true,
        message: 'Google Sheets backend connection successful!',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        timestamp: new Date()
      });
    } else {
      throw Error('Unsupported backend action: ' + action);
    }
  } catch (err) {
    return reply_({ ok: false, error: String(err.message || err) });
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  var propId = PropertiesService.getScriptProperties().getProperty('RETINA_SHEET_ID');
  if (propId && propId.trim()) {
    return SpreadsheetApp.openById(propId.trim());
  }
  // Fallback to active spreadsheet if bound
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw Error('Spreadsheet not configured. Set RETINA_SHEET_ID in Script Properties.');
}

function headers_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function findCol_(h, key) {
  var i = h.findIndex(function(v) { return v.trim().toLowerCase() === key.toLowerCase(); });
  if (i < 0) throw Error('Missing ' + key + ' header in ' + h.join(', '));
  return i;
}

function ensureSheet_(ss, name, requiredHeaders) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return s;
  }
  var existing = headers_(s);
  if (s.getLastRow() === 0 || existing.every(function(v) { return !v.trim(); })) {
    s.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return s;
  }
  var current = existing.filter(function(v) { return v.trim(); });
  requiredHeaders.forEach(function(v) {
    if (!current.some(function(x) { return x.toLowerCase() === v.toLowerCase(); })) {
      current.push(v);
    }
  });
  if (current.length > existing.length) {
    s.getRange(1, 1, 1, current.length).setValues([current]);
  }
  return s;
}

function ensureTransactions_(ss) {
  var required = [
    'Transaction ID', 'Date', 'Type', 'SKU', 'Product Name',
    'Quantity', 'Employee Email', 'Reference', 'Balance After'
  ];
  return ensureSheet_(ss, 'Transactions', required);
}

/**
 * Atomic stock check-in / check-out with script lock
 */
function applyMovement_(input) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var type = String(input.type || '').toUpperCase();
    if (type !== 'IN' && type !== 'OUT') throw Error('Invalid movement type: must be IN or OUT');

    var reference = String(input.reference || '').trim().slice(0, 150);
    if (!reference) throw Error('Purchase order / work order / issue reference required');

    var email = String(input.email || '').toLowerCase().trim();
    var id = String(input.id || '').trim();
    if (!id || id.length < 6) throw Error('Invalid transaction ID');

    var items = input.items || [];
    if (!Array.isArray(items) || !items.length || items.length > 150) {
      throw Error('Invalid cart: must contain between 1 and 150 items');
    }

    var ss = getSpreadsheet_();

    // Verify Active Employee permissions
    var users = ss.getSheetByName('Users');
    if (!users) throw Error('Users tab missing');
    var u = users.getDataRange().getValues();
    var uh = u.shift().map(String);
    var emailCol = uh.indexOf('Email') >= 0 ? uh.indexOf('Email') : uh.indexOf('Employee Email');
    var statusCol = uh.indexOf('Status');
    var roleCol = uh.indexOf('Role');
    if (emailCol < 0 || statusCol < 0) throw Error('Users headings missing (need Email, Status)');

    var employee = u.find(function(r) {
      return String(r[emailCol]).trim().toLowerCase() === email &&
             String(r[statusCol]).trim().toLowerCase() === 'active';
    });
    if (!employee) throw Error('Employee not active in Users sheet: ' + email);

    var role = String(employee[roleCol] || 'Employee').toLowerCase();
    if (type === 'IN' && !['admin', 'purchase', 'store', 'operations'].includes(role)) {
      throw Error('Role ' + role + ' is not permitted to check in stock');
    }
    if (type === 'OUT' && !['admin', 'store', 'assembly', 'operations'].includes(role)) {
      throw Error('Role ' + role + ' is not permitted to check out stock');
    }

    // Validate SKUs against Products sheet
    var productsSheet = ss.getSheetByName('Products');
    if (!productsSheet) throw Error('Products tab missing');
    var productRows = productsSheet.getDataRange().getValues();
    var productHeaders = productRows.shift().map(String);
    var productSkuCol = findCol_(productHeaders, 'SKU');
    var validSkus = {};
    productRows.forEach(function(row) {
      var sku = String(row[productSkuCol] || '').trim();
      if (sku) validSkus[sku.toUpperCase()] = true;
    });

    var stock = ensureSheet_(ss, 'Stock', ['SKU', 'Product Name', 'Quantity', 'Unit', 'Storage Location', 'Last Updated']);
    var tx = ensureTransactions_(ss);
    var th = headers_(tx);
    var idCol = findCol_(th, 'Transaction ID');

    // Duplicate check
    if (tx.getLastRow() > 1) {
      var ids = tx.getRange(2, idCol + 1, tx.getLastRow() - 1, 1).getValues();
      if (ids.some(function(r) { return String(r[0]) === id; })) {
        return { ok: true, duplicate: true, id: id };
      }
    }

    var sh = headers_(stock);
    var skuCol = findCol_(sh, 'SKU');
    var qtyCol = findCol_(sh, 'Quantity');
    var nameCol = sh.findIndex(function(x) { return x.toLowerCase() === 'product name'; });
    var unitCol = sh.findIndex(function(x) { return x.toLowerCase() === 'unit'; });
    var locCol = sh.findIndex(function(x) { return x.toLowerCase() === 'storage location' || x.toLowerCase() === 'location'; });
    var updatedCol = sh.findIndex(function(x) { return x.toLowerCase() === 'last updated'; });

    var data = stock.getLastRow() > 1 ? stock.getRange(2, 1, stock.getLastRow() - 1, sh.length).getValues() : [];
    var seen = {}, updates = [];

    items.forEach(function(item) {
      var sku = String(item.sku || '').trim();
      var qty = Number(item.quantity);
      if (!sku || !Number.isSafeInteger(qty) || qty <= 0 || qty > 1000000 || seen[sku]) {
        throw Error('Invalid or duplicate SKU/quantity: ' + sku);
      }
      if (!validSkus[sku.toUpperCase()]) {
        throw Error('SKU is not registered in Products catalogue: ' + sku);
      }
      seen[sku] = true;

      var idx = data.findIndex(function(r) { return String(r[skuCol]).trim().toUpperCase() === sku.toUpperCase(); });
      var current = idx < 0 ? 0 : Number(data[idx][qtyCol] || 0);
      if (!Number.isFinite(current) || current < 0) throw Error('Corrupt current stock for ' + sku);

      var next = current + (type === 'IN' ? qty : -qty);
      if (next < 0) {
        throw Error('Insufficient stock for ' + sku + ' (Available: ' + current + ', Required: ' + qty + ')');
      }
      if (idx < 0 && type === 'OUT') {
        throw Error('No stock record exists for ' + sku + ' to deduct from');
      }

      updates.push({
        sku: sku,
        quantity: qty,
        name: String(item.name || (idx >= 0 && nameCol >= 0 ? data[idx][nameCol] : sku)).slice(0, 200),
        unit: String(item.unit || (idx >= 0 && unitCol >= 0 ? data[idx][unitCol] : 'Nos')),
        location: String(item.location || (idx >= 0 && locCol >= 0 ? data[idx][locCol] : '')),
        idx: idx,
        next: next
      });
    });

    var now = new Date();

    // Apply to Stock sheet
    updates.forEach(function(x) {
      if (x.idx < 0) {
        var r = Array(sh.length).fill('');
        r[skuCol] = x.sku;
        r[qtyCol] = x.next;
        if (nameCol >= 0) r[nameCol] = x.name;
        if (unitCol >= 0) r[unitCol] = x.unit || 'Nos';
        if (locCol >= 0) r[locCol] = x.location || '';
        if (updatedCol >= 0) r[updatedCol] = now;
        stock.appendRow(r);
      } else {
        stock.getRange(x.idx + 2, qtyCol + 1).setValue(x.next);
        if (updatedCol >= 0) stock.getRange(x.idx + 2, updatedCol + 1).setValue(now);
      }
    });

    // Record Transaction Audit Trail
    var requiredTx = {
      'Transaction ID': id,
      'Date': now,
      'Type': type,
      'Employee Email': email,
      'Reference': reference
    };

    var out = updates.map(function(x) {
      var row = Array(th.length).fill('');
      var values = Object.assign({}, requiredTx, {
        'SKU': x.sku,
        'Product Name': x.name,
        'Quantity': x.quantity,
        'Balance After': x.next
      });
      Object.keys(values).forEach(function(k) {
        var j = th.findIndex(function(h) { return h.toLowerCase() === k.toLowerCase(); });
        if (j >= 0) row[j] = values[k];
      });
      return row;
    });

    tx.getRange(tx.getLastRow() + 1, 1, out.length, th.length).setValues(out);
    SpreadsheetApp.flush();

    return {
      ok: true,
      id: id,
      type: type,
      items: updates.map(function(x) { return { sku: x.sku, balance: x.next }; })
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin catalogue writer for Housing, LED, and Driver components
 */
function saveProduct_(input) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getSpreadsheet_();
    var users = ss.getSheetByName('Users');
    if (!users) throw Error('Users tab missing');
    var all = users.getDataRange().getValues();
    var heads = all.shift().map(String);
    var eCol = heads.indexOf('Employee Email') >= 0 ? heads.indexOf('Employee Email') : heads.indexOf('Email');
    var rCol = heads.indexOf('Role'), sCol = heads.indexOf('Status');
    if (eCol < 0 || rCol < 0 || sCol < 0) throw Error('Users headings missing');

    var email = String(input.email || '').trim().toLowerCase();
    var user = all.find(function(row) {
      return String(row[eCol]).trim().toLowerCase() === email &&
             String(row[sCol]).trim().toLowerCase() === 'active';
    });
    if (!user || String(user[rCol]).trim().toLowerCase() !== 'admin') {
      throw Error('Admin access required to modify product catalogue');
    }

    var category = String(input.category || '');
    if (['Housing', 'LED', 'Driver'].indexOf(category) < 0) {
      throw Error('Invalid category: must be Housing, LED, or Driver');
    }

    var n = Number(input.number);
    if (!Number.isSafeInteger(n) || n < 1 || n > 999999) {
      throw Error('Invalid component number');
    }

    var allowed = {
      Housing: ['name', 'fam', 'beam', 'mount', 'ip', 'heat', 'dim', 'aim', 'ri', 'img', 'shape', 'type'],
      LED: ['name', 'kind', 'w', 'volt', 'cct', 'make', 'img'],
      Driver: ['code', 'mode', 'volt', 'cur', 'load', 'typo', 'ip', 'make', 'img']
    }[category];

    var fields = input.fields || {};
    Object.keys(fields).forEach(function(k) {
      if (allowed.indexOf(k) < 0 || typeof fields[k] !== 'string' || fields[k].length > 3000) {
        throw Error('Invalid or oversized field: ' + k);
      }
    });

    var status = String(input.status || 'Active');
    if (['Active', 'Archived'].indexOf(status) < 0) throw Error('Invalid status');

    var name = String(category === 'Driver' ? fields.code : fields.name || '').trim();
    if (status === 'Active' && !name) throw Error('Product name or driver code required');

    var image = String(fields.img || '').trim();
    if (image && !/^https:\/\//i.test(image)) throw Error('Image URL must use secure HTTPS');

    // Standard Retina SKU format
    var sku = category === 'Housing' ? 'D.' + n : category === 'LED' ? 'D0.' + n + '.0' : 'D0.0.' + n;

    var tab = ensureSheet_(ss, category, ['SKU', 'Product Name', 'Number', 'Image URL', 'Status', 'Details JSON']);
    var products = ensureSheet_(ss, 'Products', ['SKU', 'Product Name', 'Image URL', 'Status', 'Category']);

    var detail = JSON.stringify(fields);
    var values = {
      'SKU': sku,
      'Product Name': name,
      'Number': n,
      'Image URL': image,
      'Status': status,
      'Details JSON': detail
    };
    upsertBySku_(tab, sku, values, ['SKU', 'Product Name', 'Number', 'Image URL', 'Status', 'Details JSON']);

    var pv = {
      'SKU': sku,
      'Product Name': name,
      'Image URL': image,
      'Status': status,
      'Category': category
    };
    if (category === 'Housing') pv.Housing = n;
    upsertBySku_(products, sku, pv, ['SKU', 'Product Name', 'Image URL', 'Status', 'Category']);

    SpreadsheetApp.flush();
    return { ok: true, sku: sku, category: category, number: n, status: status };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fetch full inventory, stock levels, transactions, and catalogues
 */
function getInventory_(input) {
  var ss = getSpreadsheet_();
  var tabs = ['Products', 'Stock', 'Housing', 'LED', 'Driver'];
  var result = { ok: true, timestamp: new Date() };

  tabs.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() <= 1) {
      result[name] = [];
    } else {
      var h = headers_(sheet);
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, h.length).getValues();
      result[name] = rows.map(function(r) {
        var obj = {};
        h.forEach(function(col, i) { obj[col] = r[i]; });
        return obj;
      });
    }
  });

  return result;
}

function upsertBySku_(sheet, sku, values, required) {
  var headers = headers_(sheet);
  if (sheet.getLastRow() === 0 || headers.every(function(h) { return !String(h).trim(); })) {
    headers = required.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var changed = false;
  required.forEach(function(h) {
    if (headers.findIndex(function(x) { return String(x).trim().toLowerCase() === h.toLowerCase(); }) < 0) {
      headers.push(h);
      changed = true;
    }
  });
  if (changed) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var col = function(key) {
    return headers.findIndex(function(h) { return String(h).trim().toLowerCase() === key.toLowerCase(); });
  };
  var skuIndex = col('SKU');
  var rowNumber = sheet.getLastRow() + 1;

  if (sheet.getLastRow() > 1) {
    var ids = sheet.getRange(2, skuIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
    var matches = [];
    ids.forEach(function(r, i) {
      if (String(r[0]).trim().toUpperCase() === sku.toUpperCase()) matches.push(i + 2);
    });
    if (matches.length > 1) throw Error('Duplicate SKU ' + sku + ' in ' + sheet.getName());
    if (matches.length) rowNumber = matches[0];
  }

  var row = rowNumber <= sheet.getLastRow() ? sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0] : Array(headers.length).fill('');
  Object.keys(values).forEach(function(key) {
    var i = col(key);
    if (i >= 0) row[i] = values[key];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

/**
 * Run this function once from Apps Script editor to auto-create all tabs & headers
 */
function setupRetinaSheets() {
  var ss = getSpreadsheet_();
  ensureSheet_(ss, 'Users', ['Employee Email', 'Role', 'Status', 'Department']);
  ensureSheet_(ss, 'Products', ['SKU', 'Product Name', 'Image URL', 'Status', 'Category']);
  ensureSheet_(ss, 'Housing', ['SKU', 'Product Name', 'Number', 'Image URL', 'Status', 'Details JSON']);
  ensureSheet_(ss, 'LED', ['SKU', 'Product Name', 'Number', 'Image URL', 'Status', 'Details JSON']);
  ensureSheet_(ss, 'Driver', ['SKU', 'Product Name', 'Number', 'Image URL', 'Status', 'Details JSON']);
  ensureSheet_(ss, 'Stock', ['SKU', 'Product Name', 'Quantity', 'Unit', 'Storage Location', 'Last Updated']);
  ensureTransactions_(ss);
  Logger.log('Retina Sheets initialization complete!');
}
