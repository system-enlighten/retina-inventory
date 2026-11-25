window.createRetinaCrm = function ({esc, btn, panel, empty, grid, stats, heading, input, modal, request, render, openPos, linkedEstimates, dialog}) {
  const stages = ['Mature Lead','Establish Contact','Proposal / Demo','Review','Price Quote','Negotiation / Review','Closed Won','Closed Lost'];
  const fields = [
    ['effect','Effect',['Floor Highlighter','Wall Highlighter','Wall Washer','Texture Grazer','Curtain Grazer','Tray Cove','Perimeter Cove','Application-specific']],
    ['height','Height',['Single height','Double height','Triple height']],
    ['size','Spot size / coverage',null],
    ['intensity','Intensity',['Standard','Bright','High brightness']],
    ['filter','Filter',['None','Diffusion','Honeycomb','Other']],
    ['colour','Light colour',['Warm white','Neutral white','Cool white','Tunable white','RGBW']]
  ];
  const leadFields = [['name','Project / site name'],['area','Area / locality'],['address','Site address'],['projectType','Project type'],['siteStage','Construction stage'],['contact','Contact name'],['phone','Phone'],['owner','Sales owner']];
  const currency = cents => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(cents/100);
  const localDate = date => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(date));
  const today = () => new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Kolkata'});
  let data, revision, pending, error, selected, tab = 'Pipeline', search = '';
  const select = (name,label,options,current='',optional=false) => `<label>${esc(label)}<select name="${name}" ${optional?'':'required'}><option value="">${optional?'—':'Select'}</option>${options.map(option=>{
    const [value,text] = Array.isArray(option) ? option : [option,option];
    return `<option value="${esc(value)}" ${current===value?'selected':''}>${esc(text)}</option>`;
  }).join('')}</select></label>`;
  const text = (name,label,value='',type='text',attrs="maxlength='250'") => input(name,label,value,type,attrs);
  const notes = (name,label,value='') => `<label>${esc(label)}<textarea name="${name}" maxlength="2000" rows="3">${esc(value)}</textarea></label>`;
  const getLead = id => data.leads.find(lead=>lead.id===id);
  function receive(result) { data=result.data; revision=result.revision; error=''; }
  async function load(refresh=true) {
    if (pending) return pending;
    pending=request('crmLoad').then(receive).catch(failure=>{error=failure.message;}).finally(()=>{pending=null;if(refresh)render();});
    return pending;
  }
  async function save(change) {
    try {
      const result=await request('crmSave',{revision,change});
      receive(result);
      if (result.id) selected=result.id;
      render();
    } catch (failure) {
      if (failure.status===409) await load();
      throw failure;
    }
  }
  const formChange = (type,id,form) => save({...Object.fromEntries(form),type,id});
  const location = lead => lead.latitude && lead.longitude ?
    `<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(lead.latitude+','+lead.longitude)}" target="_blank" rel="noopener noreferrer">View site map</a>` : '—';
  const selectionFields = () => `<div class="crm-form-grid">${fields.map(([name,label,choices])=>choices ? select(name,label,choices) : text(name,label,'','text',"required maxlength='120' placeholder='e.g. 1–3 m'")).join('')}</div>`;
  const selectionText = options => fields.map(([key])=>options[key]).filter(Boolean).join(' · ');
  function leadDetail(lead) {
    const visited = new Set(lead.history.filter(item=>item.type==='Stage changed').map(item=>item.previous || item.note.split(' → ')[0]));
    const stagesHtml = stages.map(stage=>`<li ${stage===lead.stage?'aria-current="step"':visited.has(stage)?'class="visited"':''}>${esc(stage)}</li>`).join('');
    const person = data.accounts.find(account=>account.id===lead.accountId);
    const estimates = linkedEstimates(lead);
    const detailFields = [['Area',lead.area],['Address',lead.address],['Project type',lead.projectType],['Construction stage',lead.siteStage],['Contact',lead.contact],['Phone',lead.phone],['Owner',lead.owner],['Potential since',lead.potentialAt && localDate(lead.potentialAt)],['Source',lead.source],['Architect',person?.name],['Call / meeting outcome',lead.outcome],['Next follow-up',lead.due],['Estimate',lead.estimateReference],['Notes',lead.notes]];
    const overview = `<dl class="crm-details">${detailFields.filter(([,value])=>value).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}${lead.latitude?`<div><dt>Site location</dt><dd>${location(lead)}</dd></div>`:''}</dl>`;
    const selections = lead.selection.map(item=>`<tr><td>${esc(selectionText(item.options))}</td><td>${item.count}</td><td>${item.cents===null?'Price on request':currency(item.cents)}</td><td>${item.cents===null?'—':currency(item.cents*item.count)}</td><td>${btn('Remove','crm-remove',item.id,'mini')}</td></tr>`).join('');
    return `<div class="crm-detail">${panel('',esc(lead.name),`<div class="row crm-actions">${btn('Edit lead','crm-edit',lead.id)}${btn('Log activity','crm-log',lead.id,'primary')}${btn('Change stage','crm-stage',lead.id)}${btn('Open in Sales POS','crm-pos',lead.id)}</div><ol class="crm-timeline">${stagesHtml}</ol>${overview}${estimates.length?`<p>Linked estimates · ${estimates.map(value=>esc(value)).join(', ')}</p>`:''}`)}
      ${panel('','Lighting selection',btn('+ Add light effect','crm-selection',lead.id) + (selections?grid(['Effect and options','Qty','Unit rate','Total',''],selections):empty('No lighting effects selected.')))}
      ${panel('','Activity history',`<ul class="crm-history">${lead.history.slice().reverse().map(item=>`<li><strong>${esc(item.type)}</strong><small>${localDate(item.at)} · ${esc(item.by)}</small>${item.note?`<p>${esc(item.note)}</p>`:''}</li>`).join('')}</ul>`)}</div>`;
  }
  function pipeline() {
    const query=search.trim().toLowerCase();
    const matching=data.leads.filter(lead=>[lead.name,lead.area,lead.contact,lead.stage,lead.phone].some(value=>String(value||'').toLowerCase().includes(query)));
    const summary=stats([
      ['Open leads',data.leads.filter(lead=>!lead.closedAt).length],
      ['Deals in pipeline',data.leads.filter(lead=>!lead.closedAt && (lead.estimateReference || linkedEstimates(lead).length || (lead.source==='Architect referral' && lead.accountId))).length],
      ['Follow-ups due',data.leads.filter(lead=>!lead.closedAt && lead.due && lead.due<=today()).length],
      ['Won this month',data.leads.filter(lead=>lead.stage==='Closed Won' && new Date(lead.closedAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Kolkata'}).slice(0,7)===today().slice(0,7)).length],
      ['Lost this month',data.leads.filter(lead=>lead.stage==='Closed Lost' && new Date(lead.closedAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Kolkata'}).slice(0,7)===today().slice(0,7)).length]
    ]);
    const list=matching.slice().reverse().map(lead=>`<button type="button" data-action="crm-lead" data-id="${esc(lead.id)}" class="crm-lead" aria-pressed="${selected===lead.id}"><strong>${esc(lead.name)}</strong><small>${esc([lead.area,lead.stage].filter(Boolean).join(' · '))}</small>${lead.due?`<small>Follow-up ${esc(lead.due)}</small>`:''}</button>`).join('');
    const active=getLead(selected);
    return summary+`<div class="crm-workspace">${panel('','Leads',`<form id="crm-search" class="row crm-actions">${text('query','Search leads',search,'search')}<button class="btn" type="submit">Search</button></form>${list||empty('No leads found.')}`)}${active?leadDetail(active):empty('Select a lead to view its timeline.')}</div>`;
  }
  function view() {
    const header=heading('','Sales CRM','',btn('+ Capture Lead','crm-new','','primary'));
    if (!data && !pending && !error) load();
    if (!data) return header+panel('','Sales CRM',error?empty(error)+btn('Retry','crm-refresh'):empty('Loading sales records…'));
    const nav=`<nav class="row crm-actions" aria-label="CRM views">${['Pipeline','Site Survey','Follow-ups','Architect Accounts','Customers','Effect Pricing'].map(item=>btn(item,'crm-tab',item,item===tab?'primary':'')).join('')}${btn('Refresh','crm-refresh')}</nav>`;
    let body;
    if(tab==='Pipeline') body=pipeline();
    else if(tab==='Site Survey') {
      const byArea=data.leads.filter(lead=>lead.source==='Site survey').slice().sort((a,b)=>(a.area||'').localeCompare(b.area||'')||a.name.localeCompare(b.name));
      body=panel('',tab,byArea.length?grid(['Area','Site','Type','Construction stage','Location'],byArea.map(lead=>`<tr><td>${esc(lead.area||'—')}</td><td>${btn(lead.name,'crm-open',lead.id,'mini')}</td><td>${esc(lead.projectType)}</td><td>${esc(lead.siteStage)}</td><td>${location(lead)}</td></tr>`).join('')):empty('No construction sites captured yet.'));
    } else if(tab==='Follow-ups'||tab==='Customers') {
      const rows=data.leads.filter(lead=>tab==='Customers'?lead.stage==='Closed Won':lead.due&&!lead.closedAt).sort((a,b)=>(a.due||'').localeCompare(b.due||''));
      body=panel('',tab,rows.length?grid(['Project','Contact','Owner',tab==='Customers'?'Won on':'Due'],rows.map(lead=>`<tr><td>${btn(lead.name,'crm-open',lead.id,'mini')}</td><td>${esc(lead.contact)}</td><td>${esc(lead.owner)}</td><td>${tab==='Customers'?localDate(lead.closedAt):esc(lead.due)}</td></tr>`).join('')):empty(tab==='Customers'?'No closed-won leads yet.':'No follow-ups scheduled.'));
    } else if(tab==='Architect Accounts') {
      const rows=data.accounts.map(account=>`<tr><td><strong>${esc(account.name)}</strong><br>${esc(account.notes)}</td><td>${esc([account.contact,account.phone,account.email].filter(Boolean).join(' · '))}</td><td>${data.leads.filter(lead=>lead.accountId===account.id).map(lead=>btn(lead.name,'crm-open',lead.id,'mini')).join(' ')||'—'}</td><td>${btn('Add referral','crm-referral',account.id,'mini')}</td></tr>`).join('');
      body=panel('',tab,btn('+ Add architect account','crm-account')+(rows?grid(['Architect / practice','Contact','Projects',''],rows):empty('No architect accounts yet.')));
    } else {
      const rows=data.tariffs.map(item=>`<tr><td>${esc(selectionText(item.options))}</td><td>${currency(item.cents)}</td></tr>`).join('');
      body=panel('',tab,`<p>Set a unit tariff for each effect and combination of height, coverage, intensity, filter and colour. Unpriced combinations and application-specific lights are quoted on request.</p><p>To set a tariff, total the fixture, optics, driver, assembly and packing costs. Divide by (1 − target gross margin) to get the selling price before tax.</p>`+btn('Set unit tariff','crm-tariff')+(rows?grid(['Lighting selection','Unit rate before tax'],rows):empty('No tariffs have been set.')));
    }
    return header+nav+(error?empty(error):'')+body;
  }
  function editLead(lead={},referral='') {
    modal(lead.id?'Edit Lead':'Capture Lead',`<div class="crm-form-grid">${leadFields.map(([name,label])=>text(name,label,lead[name],name==='phone'?'tel':'text',name==='name'?"required maxlength='120'":"maxlength='250'")).join('')}
      ${select('source','Lead source',['Site survey','Architect referral','Inbound enquiry','Distributor / retailer','Other'],lead.source||(referral?'Architect referral':'Site survey'))}
      ${select('accountId','Architect account',data.accounts.map(account=>[account.id,account.name]),lead.accountId||referral,true)}
      ${text('latitude','Latitude',lead.latitude,'number',"step='any' min='-90' max='90'")}${text('longitude','Longitude',lead.longitude,'number',"step='any' min='-180' max='180'")}</div>
      <div class="row crm-actions">${btn('Use current location','crm-location')}<span class="muted" data-crm-location role="status"></span></div>${notes('notes','Site notes',lead.notes)}`,async form=>{
      await formChange('lead',lead.id,form);tab='Pipeline';render();
    });
  }
  const actions={
    'crm-tab':value=>{tab=value;if(tab==='Pipeline'&&!selected)selected=data.leads.at(-1)?.id;render();},
    'crm-refresh':()=>load(),
    'crm-new':()=>{if(data)editLead();},
    'crm-lead':id=>{selected=id;render();},
    'crm-open':id=>{selected=id;tab='Pipeline';search='';render();},
    'crm-edit':id=>editLead(getLead(id)),
    'crm-referral':id=>editLead({},id),
    'crm-location':()=>{
      const form=dialog().querySelector('form');
      const status=form.querySelector('[data-crm-location]');
      if(!navigator.geolocation){status.textContent='Location access is unavailable. Enter the coordinates manually.';return;}
      status.textContent='Getting location…';
      navigator.geolocation.getCurrentPosition(({coords})=>{
        form.elements.latitude.value=coords.latitude.toFixed(6);
        form.elements.longitude.value=coords.longitude.toFixed(6);
        status.textContent='Location captured.';
      },()=>{status.textContent='Location could not be read. Enter the coordinates manually.';},{enableHighAccuracy:true,timeout:12000});
    },
    'crm-stage':id=>modal('Change Sales Stage',select('stage','Stage',stages,getLead(id).stage)+notes('note','Notes / reason for closing lost'),form=>formChange('stage',id,form)),
    'crm-log':id=>modal('Log Sales Activity',`<div class="crm-form-grid">${select('kind','Activity',['Call','Appointment','Demo','Follow-up','Estimate sent','Note'])}${select('outcome','Outcome',['Attempted to contact','Contact established','Junk lead','Pre-qualified','Not qualified','Meeting booked','Interested','Not interested'], '',true)}${text('due','Next appointment or follow-up date',getLead(id).due,'date')}</div>
      <label><input type="checkbox" name="clearDue"> Clear scheduled follow-up</label>${notes('note','Notes / estimate reference')}`,form=>formChange('activity',id,form)),
    'crm-account':()=>modal('Add Architect Account',text('name','Architect / practice name','','text','required')+text('contact','Contact name')+text('phone','Phone','','tel')+text('email','Email','','email')+notes('notes','Notes'),form=>formChange('account',null,form)),
    'crm-tariff':()=>modal('Set Lighting Tariff',selectionFields()+text('rate','Unit price before tax (₹)','','number',"min='0.01' max='1000000' step='0.01' required"),form=>formChange('tariff',null,form)),
    'crm-selection':id=>modal('Select a Light Effect',selectionFields()+`<p data-crm-rate role="status"></p>`+text('count','Quantity',1,'number',"min='1' max='10000' step='1' required"),form=>formChange('selection',id,form)),
    'crm-remove':id=>modal('Remove Lighting Selection',empty('Remove this line from the lead’s lighting selection?'),()=>save({type:'removeSelection',id:selected,selectionId:id}),'Remove'),
    'crm-pos':id=>openPos(getLead(id))
  };
  function submit(event) {
    if(event.target.id!=='crm-search')return;
    event.preventDefault();search=String(new FormData(event.target).get('query')||'');render();
  }
  function previewRate(event) {
    const form=event.target.form;
    const rate=form?.querySelector('[data-crm-rate]');
    if(!rate)return;
    const options=Object.fromEntries(fields.map(([key])=>[key,form.elements[key].value.trim()]));
    const tariff=data.tariffs.find(item=>JSON.stringify(item.options)===JSON.stringify(options));
    rate.textContent=Object.values(options).every(Boolean)?(tariff?currency(tariff.cents)+' per unit before tax':'Price on request'):'';
  }
  return {view,actions,submit,previewRate,selections:id=>data?.leads.find(lead=>lead.id===id)?.selection || [],selectionText};
};
