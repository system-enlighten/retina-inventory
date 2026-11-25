window.createRetinaCrm = function ({esc, btn, panel, empty, grid, stats, heading, input, modal, request, render, openPos, linkedEstimates, dialog}) {
  const stages = ['Mature Lead','Establish Contact','Proposal / Demo','Review','Price Quote','Negotiation / Review','Closed Won','Closed Lost'];
  const fields = [
    ['effect','Effect',['Floor Highlighter','Wall Highlighter','Wall Washer','Texture Grazer','Curtain Grazer','Tray Cove','Perimeter Cove','Application-specific']],
    ['height','Height',['Single height','Double height','Triple height']],
    ['size','Spot size / coverage',null],
    ['intensity','Intensity',['Standard','Bright','High brightness']],
    ['filter','Filter',['None','Diffusion','Honeycomb','Other']],
    ['colour','Light colour',null]
  ];
  const colourFamilies = [
    ['Basic','basic','Dim to warm · 3000K at full output, warming to firelight at 1800K as it dims.',[
      ['Dim to warm','Dim to warm · 1800–3000K']
    ]],
    ['Reflect Sun Path','sun','Tune between warm and cool white. Choose an additional colour channel where required.',[
      ['Tunable white','Tunable white · warm to cool'],
      ['Tunable white + amber','Tunable white + amber'],
      ['Tunable white + other colour','Tunable white + other colour']
    ]],
    ['Static','static','Fixed white colour temperature.',[
      ['3000K','3000K'],['4000K','4000K'],['5000K','5000K'],['6000K','6000K']
    ]],
    ['RGBW','rgbw','Red, green, blue and a dedicated white channel.',[['RGBW','RGBW']]]
  ];
  const currency = cents => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(cents/100);
  const localDate = date => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(date));
  const captureTime = date => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(date)) + ' IST';
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
  async function save(change, onSuccess) {
    try {
      const result=await request('crmSave',{revision,change});
      receive(result);
      if (result.id) selected=result.id;
      if (onSuccess) onSuccess();
      render();
    } catch (failure) {
      if (failure.status===409) await load(change.type!=='tariff');
      throw failure;
    }
  }
  const formChange = (type,id,form) => save({...Object.fromEntries(form),type,id});
  const location = lead => lead.latitude && lead.longitude ?
    `<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(lead.latitude+','+lead.longitude)}" target="_blank" rel="noopener noreferrer">View site map</a>` : '—';
  const colourFields = () => `<fieldset class="crm-colours"><legend>Light colour</legend>
    <div class="crm-colour-grid">${colourFamilies.map(([label,style,description,choices])=>`<section class="crm-colour-card">
      <h3>${label}</h3><div class="crm-swatch ${style}" aria-hidden="true"></div><p>${description}</p>
      <div class="crm-colour-options">${choices.map(([value,caption])=>`<label><input type="radio" name="colour" value="${esc(value)}" required><span>${esc(caption)}</span></label>`).join('')}</div>
    </section>`).join('')}</div></fieldset>`;
  const selectionFields = () => `<div class="crm-form-grid crm-effect-fields">${fields.slice(0,-1).map(([name,label,choices])=>choices ? select(name,label,choices) : text(name,label,'','text',"required maxlength='120' placeholder='e.g. 1–3 m'")).join('')}</div>${colourFields()}`;
  const colourLabel = value => {
    const family=colourFamilies.find(([, , ,choices])=>choices.some(([key])=>key===value));
    if (!family || family[0]==='RGBW') return value;
    return family[0]+' / '+family[3].find(([key])=>key===value)[1];
  };
  const selectionText = options => fields.map(([key])=>key==='colour'?colourLabel(options[key]):options[key]).filter(Boolean).join(' · ');
  let tariffSaved = false;
  function leadDetail(lead) {
    const visited = new Set(lead.history.filter(item=>item.type==='Stage changed').map(item=>item.previous || item.note.split(' → ')[0]));
    const stagesHtml = stages.map(stage=>`<li ${stage===lead.stage?'aria-current="step"':visited.has(stage)?'class="visited"':''}>${esc(stage)}</li>`).join('');
    const person = data.accounts.find(account=>account.id===lead.accountId);
    const estimates = linkedEstimates(lead);
    const detailFields = [['Captured',lead.createdAt && captureTime(lead.createdAt)],['Area',lead.area],['House / plot no.',lead.houseNumber],['Address',lead.address],['Project type',lead.projectType],['Construction stage',lead.siteStage],['Contact',lead.contact],['Phone',lead.phone],['Owner',lead.owner],['Potential since',lead.potentialAt && localDate(lead.potentialAt)],['Source',lead.source],['Architect',person?.name],['Call / meeting outcome',lead.outcome],['Next follow-up',lead.due],['Estimate',lead.estimateReference],['Notes',lead.notes]];
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
    const header=heading('','Sales CRM','',`<div class="row crm-actions">${btn('Enquiries','crm-tab','Enquiries',tab==='Enquiries'?'primary':'')}${btn('+ Capture Lead','crm-new','','primary')}</div>`);
    if (!data && !pending && !error) load();
    if (!data) return header+panel('','Sales CRM',error?empty(error)+btn('Retry','crm-refresh'):empty('Loading sales records…'));
    const nav=`<nav class="row crm-actions" aria-label="CRM views">${['Pipeline','Site Survey','Follow-ups','Architect Accounts','Customers','Effect Pricing'].map(item=>btn(item,'crm-tab',item,item===tab?'primary':'')).join('')}${btn('Refresh','crm-refresh')}</nav>`;
    let body;
    if(tab==='Pipeline') body=pipeline();
    else if(tab==='Enquiries') {
      const rows=data.leads.filter(lead=>lead.source==='Inbound enquiry').slice().reverse();
      body=panel('',tab,btn('+ Add enquiry','crm-new-enquiry')+(rows.length?grid(['Received','Enquiry','Contact','Area','Stage'],rows.map(lead=>`<tr><td>${captureTime(lead.createdAt)}</td><td>${btn(lead.name,'crm-open',lead.id,'mini')}</td><td>${esc([lead.contact,lead.phone].filter(Boolean).join(' · '))}</td><td>${esc(lead.area)}</td><td>${esc(lead.stage)}</td></tr>`).join('')):empty('No inbound enquiries yet.')));
    } else if(tab==='Site Survey') {
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
      const tariffForm=`<form id="crm-tariff-form">${selectionFields()}
        <div class="crm-tariff-price">${text('rate','Unit price before tax (₹)','','number',"min='0.01' max='1000000' step='0.01' required")}
        <button class="btn primary" type="submit">Save unit tariff</button></div>
        <p class="error" data-tariff-error role="alert" hidden></p>
        <p data-tariff-status role="status" ${tariffSaved?'':'hidden'}>${tariffSaved?'Unit tariff saved.':''}</p>
      </form>`;
      body=panel('',tab,tariffForm)+panel('','Saved tariffs',rows?grid(['Lighting selection','Unit rate before tax'],rows):empty('No tariffs have been set.'));
    }
    return header+nav+(error?empty(error):'')+body;
  }
  function showLocation(form, statusText) {
    const {latitude,longitude}=form.elements;
    const lat=Number(latitude.value), lng=Number(longitude.value);
    if (!latitude.value || !longitude.value || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) return;
    const point=[lat,lng].join(',');
    const preview=form.querySelector('.crm-location-preview');
    preview.hidden=false;
    preview.querySelector('iframe').src='https://maps.google.com/maps?q='+encodeURIComponent(point)+'&z=17&output=embed';
    preview.querySelector('a').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point);
    preview.querySelector('a').textContent='Open map · '+point;
    form.querySelector('[data-crm-location]').textContent=statusText;
  }
  function editLead(lead={},referral='',source='Site survey') {
    const projectTypes=[...new Set(['Residential','Commercial','Hospitality','Retail','Institutional','Other',lead.projectType].filter(Boolean))];
    modal(lead.id?'Edit Lead':source==='Inbound enquiry'?'Add Enquiry':'Capture Lead',`
      <section class="crm-capture-location">
        <div class="row">${btn('Use current location','crm-location','','primary')}<span class="muted">${lead.createdAt?'Captured '+captureTime(lead.createdAt):'Date and time recorded on save'}</span></div>
        <p data-crm-location role="status">Preview your location before saving, or enter the area below.</p>
        <div class="crm-location-preview" hidden><iframe title="Site location preview" referrerpolicy="no-referrer"></iframe><a target="_blank" rel="noopener noreferrer">Open map</a></div>
        <input type="hidden" name="latitude" value="${esc(lead.latitude||'')}"><input type="hidden" name="longitude" value="${esc(lead.longitude||'')}">
      </section>
      <div class="crm-form-grid">
        ${text('area','Area / locality',lead.area)}
        ${text('houseNumber','House / plot number',lead.houseNumber)}
        ${select('projectType','Project type',projectTypes,lead.projectType,true)}
        ${text('name','Construction / project name',lead.name,'text',"required maxlength='120'")}
      </div>
      <details class="crm-capture-details" ${source==='Inbound enquiry'?'open':''}><summary>Additional details</summary><div class="crm-form-grid">
        ${text('address','Address details',lead.address)}
        ${text('siteStage','Construction stage',lead.siteStage)}
        ${text('contact','Contact name',lead.contact)}
        ${text('phone','Phone',lead.phone,'tel')}
        ${text('owner','Sales owner',lead.owner)}
        ${select('source','Lead source',['Site survey','Architect referral','Inbound enquiry','Distributor / retailer','Other'],lead.source||(referral?'Architect referral':source))}
        ${select('accountId','Architect account',data.accounts.map(account=>[account.id,account.name]),lead.accountId||referral,true)}
      </div>${notes('notes','Site notes',lead.notes)}</details>
      `,async form=>{
      await formChange('lead',lead.id,form);
      tab=form.get('source')==='Inbound enquiry' && source==='Inbound enquiry'?'Enquiries':'Pipeline';
      if(tab==='Pipeline') search='';
      render();
    },'Save '+(source==='Inbound enquiry'?'enquiry':'lead'));
    if(lead.latitude && lead.longitude) showLocation(dialog().querySelector('form'),'Saved site location.');
  }
  const actions={
    'crm-tab':value=>{tab=value;tariffSaved=false;if(tab==='Pipeline'&&!selected)selected=data.leads.at(-1)?.id;render();},
    'crm-refresh':()=>load(),
    'crm-new-enquiry':()=>editLead({},'','Inbound enquiry'),
    'crm-new':()=>{if(data)editLead();},
    'crm-lead':id=>{selected=id;render();},
    'crm-open':id=>{selected=id;tab='Pipeline';search='';render();},
    'crm-edit':id=>editLead(getLead(id)),
    'crm-referral':id=>editLead({},id),
    'crm-location':async (_,button)=>{
      const form=dialog().querySelector('form');
      const status=form.querySelector('[data-crm-location]');
      if(!navigator.geolocation){status.textContent='Location is unavailable. Enter the area below.';return;}
      const submit=form.querySelector('[type=submit]');
      button.disabled=true;
      submit.disabled=true;
      status.textContent='Getting your location…';
      const areaAtStart=form.elements.area.value;
      try {
        const {coords}=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000}));
        if(!form.isConnected || !dialog().open) return;
        form.elements.latitude.value=coords.latitude.toFixed(6);
        form.elements.longitude.value=coords.longitude.toFixed(6);
        showLocation(form,'Location found. Looking up the area…');
        let area='';
        try {
          const result=await request('crmLocation',{latitude:coords.latitude,longitude:coords.longitude});
          area=result.area;
        } catch {
          status.textContent='Location found. Enter or confirm the area below.';
          return;
        }
        if(area && form.elements.area.value===areaAtStart) form.elements.area.value=area;
        status.textContent=area?'Location and area found. Review before saving.':'Location found. Enter or confirm the area below.';
      } catch {
        status.textContent='Location could not be read. Enter the area below or try again.';
      } finally {
        button.disabled=false;
        submit.disabled=false;
      }
    },
    'crm-stage':id=>modal('Change Sales Stage',select('stage','Stage',stages,getLead(id).stage)+notes('note','Notes / reason for closing lost'),form=>formChange('stage',id,form)),
    'crm-log':id=>modal('Log Sales Activity',`<div class="crm-form-grid">${select('kind','Activity',['Call','Appointment','Demo','Follow-up','Estimate sent','Note'])}${select('outcome','Outcome',['Attempted to contact','Contact established','Junk lead','Pre-qualified','Not qualified','Meeting booked','Interested','Not interested'], '',true)}${text('due','Next appointment or follow-up date',getLead(id).due,'date')}</div>
      <label><input type="checkbox" name="clearDue"> Clear scheduled follow-up</label>${notes('note','Notes / estimate reference')}`,form=>formChange('activity',id,form)),
    'crm-account':()=>modal('Add Architect Account',text('name','Architect / practice name','','text','required')+text('contact','Contact name')+text('phone','Phone','','tel')+text('email','Email','','email')+notes('notes','Notes'),form=>formChange('account',null,form)),
    'crm-selection':id=>modal('Select a Light Effect',selectionFields()+`<p data-crm-rate role="status"></p>`+text('count','Quantity',1,'number',"min='1' max='10000' step='1' required"),form=>formChange('selection',id,form)),
    'crm-remove':id=>modal('Remove Lighting Selection',empty('Remove this line from the lead’s lighting selection?'),()=>save({type:'removeSelection',id:selected,selectionId:id}),'Remove'),
    'crm-pos':id=>openPos(getLead(id))
  };
  async function submit(event) {
    const form=event.target;
    if(form.id==='crm-search') {
      event.preventDefault();
      search=String(new FormData(form).get('query')||'');
      render();
    } else if(form.id==='crm-tariff-form') {
      event.preventDefault();
      const button=form.querySelector('[type=submit]');
      if(button.disabled) return;
      const message=form.querySelector('[data-tariff-error]');
      message.hidden=true;
      form.querySelector('[data-tariff-status]').hidden=true;
      button.disabled=true;
      try {
        await save({...Object.fromEntries(new FormData(form)),type:'tariff'},()=>{tariffSaved=true;});
      } catch(failure) {
        message.textContent=failure.message;
        message.hidden=false;
      } finally {
        button.disabled=false;
      }
    }
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
