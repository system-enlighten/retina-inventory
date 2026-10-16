// Deploy as Web app: Execute as Me; Who has access: Anyone.
// Store a long random secret in Script Properties as RETINA_SHARED_SECRET.
// Vercel sends that secret SERVER-SIDE ONLY. Never add it to React or GitHub.
function doPost(e) {
  try {
    var input = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty('RETINA_SHARED_SECRET');
    if (!expected || input.secret !== expected) throw Error('Unauthorized backend request');
    return reply_(applyMovement_(input));
  } catch (err) { return reply_({ok:false,error:String(err.message || err)}); }
}
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function headers_(sheet) {
  var h = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0].map(String);
  return h;
}
function findCol_(h, key) {
  var i=h.findIndex(function(v){return v.trim().toLowerCase()===key.toLowerCase();});
  if(i<0) throw Error('Missing '+key+' header in '+h.join(', '));
  return i;
}
function ensureTransactions_(ss) {
  var s=ss.getSheetByName('Transactions');
  if(!s) throw Error('Transactions tab missing');
  var required=['Transaction ID','Date','Type','SKU','Product Name','Quantity','Employee Email','Reference','Balance After'];
  var existing=headers_(s);
  if(s.getLastRow()===0 || existing.every(function(v){return !v.trim();})) {
    s.getRange(1,1,1,required.length).setValues([required]);return s;
  }
  // Preserve existing headings and append missing transaction-specific columns.
  var current=existing.filter(function(v){return v.trim();});
  required.forEach(function(v){if(!current.some(function(x){return x.toLowerCase()===v.toLowerCase();})) current.push(v);});
  if(current.length>existing.length) s.getRange(1,1,1,current.length).setValues([current]);
  return s;
}
function applyMovement_(input) {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if(input.action!=='move') throw Error('Unsupported action');
    var type=String(input.type||'').toUpperCase();
    if(type!=='IN' && type!=='OUT') throw Error('Invalid movement type');
    var reference=String(input.reference||'').trim().slice(0,150);
    if(!reference) throw Error('Purchase / issue reference required');
    var email=String(input.email||'').toLowerCase();
    var id=String(input.id||'');
    if(!/^[0-9a-f-]{36}$/i.test(id)) throw Error('Invalid transaction ID');
    var items=input.items||[];
    if(!Array.isArray(items)||!items.length||items.length>100) throw Error('Invalid cart');
    var ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('RETINA_SHEET_ID'));
    var users=ss.getSheetByName('Users');if(!users) throw Error('Users tab missing');
    var u=users.getDataRange().getValues(), uh=u.shift().map(String);
    var emailCol=uh.indexOf('Email')>=0?uh.indexOf('Email'):uh.indexOf('Employee Email');
    var statusCol=uh.indexOf('Status'),roleCol=uh.indexOf('Role');
    if(emailCol<0||statusCol<0) throw Error('Users headings missing');
    var employee=u.find(function(r){return String(r[emailCol]).trim().toLowerCase()===email&&String(r[statusCol]).trim().toLowerCase()==='active';});
    if(!employee) throw Error('Employee not active');
    var role=String(employee[roleCol]||'Employee').toLowerCase();
    if(type==='IN' && !['admin','purchase','store'].includes(role)) throw Error('Not permitted to check in');
    if(type==='OUT' && !['admin','store'].includes(role)) throw Error('Not permitted to check out');
    var stock=ss.getSheetByName('Stock');if(!stock) throw Error('Stock tab missing');
    var tx=ensureTransactions_(ss),th=headers_(tx);
    var idCol=findCol_(th,'Transaction ID');
    if(tx.getLastRow()>1) {
      var ids=tx.getRange(2,idCol+1,tx.getLastRow()-1,1).getValues();
      if(ids.some(function(r){return String(r[0])===id;})) return {ok:true,duplicate:true};
    }
    var sh=headers_(stock),skuCol=findCol_(sh,'SKU'),qtyCol=findCol_(sh,'Quantity');
    var nameCol=sh.findIndex(function(x){return x==='Product Name';});
    var unitCol=sh.findIndex(function(x){return x==='Unit';});
    var updatedCol=sh.findIndex(function(x){return x==='Last Updated';});
    var data=stock.getLastRow()>1?stock.getRange(2,1,stock.getLastRow()-1,sh.length).getValues():[];
    var seen={}, updates=[];
    items.forEach(function(item){
      var sku=String(item.sku||'').trim(),qty=Number(item.quantity);
      if(!sku||!Number.isSafeInteger(qty)||qty<=0||qty>1000000||seen[sku]) throw Error('Invalid or duplicate SKU/quantity');
      seen[sku]=true;
      var idx=data.findIndex(function(r){return String(r[skuCol]).trim()===sku;});
      var current=idx<0?0:Number(data[idx][qtyCol]||0);
      if(!Number.isFinite(current)||current<0) throw Error('Invalid current stock for '+sku);
      var next=current+(type==='IN'?qty:-qty);
      if(next<0) throw Error('Insufficient stock for '+sku+' (available '+current+')');
      if(idx<0 && type==='OUT') throw Error('No stock record for '+sku);
      updates.push({sku:sku,quantity:qty,name:String(item.name||sku).slice(0,200),idx:idx,next:next});
    });
    var now=new Date();
    updates.forEach(function(x){
      if(x.idx<0){
        var r=Array(sh.length).fill('');
        r[skuCol]=x.sku;r[qtyCol]=x.next;if(nameCol>=0)r[nameCol]=x.name;
        if(unitCol>=0)r[unitCol]='Nos';if(updatedCol>=0)r[updatedCol]=now;
        stock.appendRow(r);
      } else {
        stock.getRange(x.idx+2,qtyCol+1).setValue(x.next);
        if(updatedCol>=0)stock.getRange(x.idx+2,updatedCol+1).setValue(now);
      }
    });
    var required={
      'Transaction ID':id,'Date':now,'Type':type,'Employee Email':email,'Reference':reference
    };
    var out=updates.map(function(x){
      var row=Array(th.length).fill('');
      var values=Object.assign({},required,{'SKU':x.sku,'Product Name':x.name,'Quantity':x.quantity,'Balance After':x.next});
      Object.keys(values).forEach(function(k){var j=th.findIndex(function(h){return h.toLowerCase()===k.toLowerCase();});if(j>=0)row[j]=values[k];});
      return row;
    });
    tx.getRange(tx.getLastRow()+1,1,out.length,th.length).setValues(out);
    SpreadsheetApp.flush();
    return {ok:true,id:id,items:updates.map(function(x){return {sku:x.sku,balance:x.next};})};
  } finally {lock.releaseLock();}
}
