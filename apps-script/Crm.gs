function retinaCrm_(input) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var book = getSpreadsheet_();
    var sheet = book.getSheetByName('Retina Sales CRM');
    var row = sheet ? sheet.getRange(1,1,1,31).getValues()[0] : [];
    var revision = row[0] || 0;
    var data = revision ? JSON.parse(Utilities.newBlob(Utilities.base64Decode(row.slice(1).map(function(cell){return String(cell).slice(2);}).join(''))).getDataAsString('UTF-8')) : {leads:[],accounts:[],tariffs:[]};
    if (input.action === 'crmLoad') return {ok:true,revision:revision,data:data};
    if (input.revision !== revision) return {ok:false,conflict:true,error:'CRM has changed. Reload before saving again.'};
    var change = input.change || {};
    var stages = ['Mature Lead','Establish Contact','Proposal / Demo','Review','Price Quote','Negotiation / Review','Closed Won','Closed Lost'];
    var now = new Date().toISOString();
    function clean(value, length) { return String(value == null ? '' : value).trim().slice(0,length || 250); }
    function timeline(lead,type,note) { lead.history.push({type:type,note:note,at:now,by:input.email}); }
    var result;
    if (change.type === 'lead') {
      var fields = ['name','area','houseNumber','address','projectType','siteStage','contact','phone','source','owner','notes','accountId'];
      var values = {};
      fields.forEach(function(key){ values[key] = clean(change[key], key === 'notes' ? 2000 : 250); });
      if (!values.name) throw Error('Enter the project or site name.');
      if (values.accountId && !data.accounts.some(function(account){return account.id === values.accountId;})) throw Error('Architect account was not found.');
      var lat = clean(change.latitude), lng = clean(change.longitude);
      if ((lat || lng) && (!lat || !lng || !isFinite(Number(lat)) || !isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180)) throw Error('Enter valid latitude and longitude.');
      var existing = data.leads.find(function(item){return item.id === change.id;});
      if (change.id && !existing) throw Error('Lead was not found.');
      if (!existing) {
        var stage = values.source === 'Architect referral' && values.accountId ? 'Proposal / Demo' : 'Mature Lead';
        existing = {id:Utilities.getUuid(),stage:stage,createdAt:now,history:[],selection:[]};
        timeline(existing,'Lead captured',stage);
        data.leads.push(existing);
      } else timeline(existing,'Lead details updated','');
      Object.assign(existing,values,{latitude:lat,longitude:lng});
      result = existing.id;
    } else if (change.type === 'account') {
      var name = clean(change.name);
      if (!name) throw Error('Enter an architect or practice name.');
      if (data.accounts.some(function(account){return account.name.toLowerCase() === name.toLowerCase();})) throw Error('An architect account already has that name.');
      data.accounts.push({id:Utilities.getUuid(),name:name,contact:clean(change.contact),phone:clean(change.phone),email:clean(change.email),notes:clean(change.notes,2000)});
    } else if (change.type === 'tariff') {
      var options = retinaCrmSelection_(change);
      var rate = Number(change.rate);
      var cents = Math.round(rate * 100);
      if (options.effect === 'Application-specific' || !isFinite(rate) || cents <= 0 || cents > 100000000) throw Error('Enter a valid positive rate for a standard effect.');
      var key = JSON.stringify(options);
      var entry = {key:key,options:options,cents:cents};
      data.tariffs = data.tariffs.filter(function(item){return item.key !== key;});
      data.tariffs.push(entry);
    } else {
      var lead = data.leads.find(function(item){return item.id === change.id;});
      if (!lead) throw Error('Lead was not found.');
      result = lead.id;
      if (change.type === 'stage') {
        if (stages.indexOf(change.stage) < 0 || change.stage === lead.stage) throw Error('Choose a different sales stage.');
        var reason = clean(change.note,1000);
        if (change.stage === 'Closed Lost' && !reason) throw Error('Enter a reason for closing this lead as lost.');
        timeline(lead,'Stage changed',lead.stage + ' → ' + change.stage + (reason ? ' · ' + reason : ''));
        lead.stage = change.stage;
        lead.closedAt = stages.indexOf(change.stage) >= 6 ? now : '';
      } else if (change.type === 'activity') {
        var kind = clean(change.kind), outcome = clean(change.outcome), note = clean(change.note,2000), due = clean(change.due);
        if (['Call','Appointment','Demo','Follow-up','Estimate sent','Note'].indexOf(kind) < 0) throw Error('Choose an activity type.');
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw Error('Enter a valid follow-up date.');
        if (!note && !outcome && !due) throw Error('Enter an outcome, note or follow-up date.');
        var previousStage = lead.stage;
        if (outcome) lead.outcome = outcome;
        if (kind === 'Appointment' || outcome === 'Meeting booked') lead.potentialAt = now;
        if (kind === 'Estimate sent') {
          if (!note) throw Error('Enter the estimate reference.');
          lead.estimateReference = note;
          if (stages.indexOf(lead.stage) < 4) lead.stage = 'Price Quote';
        } else if (lead.stage === 'Mature Lead' && ['Contact established','Meeting booked','Pre-qualified','Interested'].indexOf(outcome) >= 0) lead.stage = 'Establish Contact';
        if (lead.stage !== previousStage) {
          timeline(lead,'Stage changed',previousStage + ' → ' + lead.stage);
        }
        if (change.clearDue === 'on') due = '';
        if (due || change.clearDue === 'on') lead.due = due;
        timeline(lead,kind,[outcome,note,due ? 'Follow-up ' + due : '',change.clearDue === 'on' && !due ? 'Follow-up cleared' : ''].filter(Boolean).join(' · '));
      } else if (change.type === 'selection') {
        var selected = retinaCrmSelection_(change);
        var count = Number(change.count);
        if (!Number.isInteger(count) || count < 1 || count > 10000) throw Error('Enter a quantity from 1 to 10,000.');
        var tariff = data.tariffs.find(function(item){return item.key === JSON.stringify(selected);});
        lead.selection.push({id:Utilities.getUuid(),options:selected,count:count,cents:tariff ? tariff.cents : null});
        timeline(lead,'Lighting selection saved',selected.effect + ' × ' + count);
      } else if (change.type === 'removeSelection') {
        lead.selection = lead.selection.filter(function(item){return item.id !== change.selectionId;});
        timeline(lead,'Lighting selection removed','');
      } else throw Error('Unknown CRM update.');
    }
    var encoded = Utilities.base64Encode(JSON.stringify(data),Utilities.Charset.UTF_8);
    if (encoded.length > 1200000) throw Error('CRM has reached its storage limit.');
    if (!sheet) sheet = book.insertSheet('Retina Sales CRM');
    var columns = sheet.getMaxColumns();
    if (columns < 31) sheet.insertColumnsAfter(columns,31-columns);
    var chunks = [revision + 1];
    for (var offset=0;offset<encoded.length;offset+=40000) chunks.push('j:' + encoded.slice(offset,offset+40000));
    while (chunks.length < 31) chunks.push('');
    sheet.getRange(1,1,1,31).setValues([chunks]);
    SpreadsheetApp.flush();
    return {ok:true,data:data,revision:revision+1,id:result};
  } finally { lock.releaseLock(); }
}

function retinaCrmSelection_(change) {
  var values = {};
  ['effect','height','size','intensity','filter','colour'].forEach(function(key) {
    values[key] = String(change[key] || '').trim().slice(0,120);
    if (!values[key]) throw Error('Complete each lighting selection.');
  });
  return values;
}
