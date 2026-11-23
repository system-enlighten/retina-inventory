import housingData from "../server/housing-config-data.js";
import crypto from 'node:crypto';
import { OAuth2Client, JWT } from 'google-auth-library';
import { google } from 'googleapis';

const oauth = new OAuth2Client();
const sessionKey = () => process.env.RETINA_SESSION_SECRET || process.env.RETINA_SHARED_SECRET;
const cookieName = 'retina_session';
function signSession(email) {
  const data = Buffer.from(JSON.stringify({email, exp:Date.now()+14*86400000})).toString('base64url');
  const sig = crypto.createHmac('sha256',sessionKey()).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifySession(req) {
  if (!sessionKey()) return null;
  const raw = (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if (!raw) return null;
  const [data,sig] = raw.split('.');
  if (!data || !sig) return null;
  const expected=crypto.createHmac('sha256',sessionKey()).update(data).digest('base64url');
  if (sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null;
  try {const payload=JSON.parse(Buffer.from(data,'base64url').toString());return payload.exp>Date.now() ? payload.email : null;} catch{return null;}
}
function setCookie(res,value,maxAge) {
  res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
const CATALOG_TABS = ['Housing','LED','Driver'];
const DEPARTMENT_NAMES = {
  manufacturing: 'Manufacturing Operations',
  sales: 'Sales & Distribution',
  purchase: 'Purchase & Supply Chain',
  accounts: 'Accounts',
  marketing: 'Marketing',
  legal: 'Patent & Legal Team',
  hr: 'HR & Team Building'
};
function normalizeDepartment(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function accessFor(employee) {
  const role = String(employee.Role || employee.role || 'Employee').trim().toLowerCase();
  const assigned = normalizeDepartment(employee.Department || employee.department);
  const department = Object.entries(DEPARTMENT_NAMES).find(([id, name]) =>
    assigned && [id, normalizeDepartment(name), normalizeDepartment(name + ' Department')].includes(assigned))?.[0];
  return {role, admin:role==='admin', departments:role==='admin' ? Object.keys(DEPARTMENT_NAMES) : department ? [department] : []};
}
function rows(values=[]) {
  const [header=[], ...data] = values;
  return data.filter(r=>r.some(v=>String(v??'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[String(h).trim(),r[i]??''])));
}
async function readTab(sheets, spreadsheetId, name) {
  const result = await sheets.spreadsheets.values.get({spreadsheetId, range:`'${name}'!A1:AZ10000`});
  return rows(result.data.values);
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'POST required'});
  try {
    const action=req.body?.action;
    if(action==='logout') {setCookie(res,'',0);return res.json({ok:true});}
    let email=verifySession(req);
    let profile=null;
    let freshlyAuthenticated=false;
    if(!email) {
      const token=req.headers.authorization?.replace(/^Bearer\s+/i,'').trim();
      if(!token || !process.env.GOOGLE_CLIENT_ID) return res.status(401).json({error:'Sign in required'});
      const ticket=await oauth.verifyIdToken({idToken:token,audience:process.env.GOOGLE_CLIENT_ID});
      profile=ticket.getPayload();
      if(!profile?.email_verified || !profile.email?.toLowerCase().endsWith('@gmail.com'))
        return res.status(403).json({error:'Verified Gmail account required'});
      email=profile.email.toLowerCase();
      freshlyAuthenticated=true;
    }
    const auth=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
    const sheets=google.sheets({version:'v4',auth});
    const spreadsheetId=process.env.GOOGLE_SHEET_ID;
    if(!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    const users=await readTab(sheets,spreadsheetId,'Users');
    const employee=users.find(u=>String(u['Employee Email']||u.Email||u.email||'').toLowerCase()===email && String(u.Status||u.status||'').toLowerCase()==='active');
    if(!employee) return res.status(403).json({error:'This Gmail account is not approved in Users sheet'});
    if(freshlyAuthenticated && sessionKey()) setCookie(res,signSession(email),14*86400);
    const access=accessFor(employee);
    const canSee=id=>access.departments.includes(id);
    if(action==='me') return res.json({email,role:employee.Role||employee.role||'Employee',name:profile?.name||email,departments:access.departments});
    const estimateWrite = ['estimateSave','estimateIssue','estimatePayment','estimateEdit','invoiceEdit','invoicePayment'].includes(action);
    if(action==='productionLoad' || action==='productionSave' || estimateWrite) {
      const manufacturing=canSee('manufacturing');
      const purchasing=canSee('purchase');
      const sales=canSee('sales');
      const canWrite=access.admin || (manufacturing && access.role==='store');
      if(!manufacturing && !purchasing && !sales) return res.status(403).json({error:'This department has no production register access.'});
      if(estimateWrite && !sales) return res.status(403).json({error:'Sales access is required.'});
      if(action==='productionSave' && !canWrite) return res.status(403).json({error:'Only Admin or Manufacturing Store users can update production.'});
      const {RETINA_SCRIPT_URL:url, RETINA_SHARED_SECRET:secret}=process.env;
      if(!url || !secret) return res.status(503).json({error:'Apps Script is not configured.'});
      const payload={action,secret,email};
      if(estimateWrite) payload.estimate=req.body.estimate;
      if(action==='productionSave') {
        const {state,revision}=req.body;
        if(!state || typeof state!=='object' || !Number.isSafeInteger(revision) || revision<0)
          return res.status(400).json({error:'Invalid production save.'});
        if(Buffer.byteLength(JSON.stringify(state),'utf8')>900000)
          return res.status(413).json({error:'Production register exceeds the cloud storage limit.'});
        Object.assign(payload,{state,revision});
      }
      const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)});
      let result;
      try { result=await upstream.json(); } catch { throw Error('Apps Script did not return JSON.'); }
      if(!result.ok) {
        const code=result.conflict?409:400;
        return res.status(code).json({error:result.error||'Production register request failed.'});
      }
      if(result.state && !manufacturing) {
        const d=result.state;
        const stockView=purchasing ? {ingredients:d.ingredients,batches:d.batches,activity:d.activity} : {};
        const salesView=sales ? {sales:d.sales,estimates:d.estimates||[],invoices:d.invoices||[]} : {};
        result.state={name:d.name,currency:d.currency,tables:[],ingredients:[],batches:[],activity:[],menu:[],kots:[],sales:[],...stockView,...salesView};
      }
      return res.json({...result,canWrite,canSeed:access.admin,email,
        ...(action === "productionLoad" && manufacturing ? {housingData} : {})});
    }
    if(action==='catalog') {
      if(!canSee('manufacturing') && !canSee('purchase')) return res.status(403).json({error:'Catalogue stock access is restricted to Manufacturing or Purchase.'});
      const [products,stock,...catalogs]=await Promise.all([
        readTab(sheets,spreadsheetId,'Products'),readTab(sheets,spreadsheetId,'Stock'),
        ...CATALOG_TABS.map(async name => { try { return await readTab(sheets,spreadsheetId,name); } catch(e) { if(e?.code===400 || e?.response?.status===400) return []; throw e; } })
      ]);
      return res.json({products,stock,catalogs:Object.fromEntries(CATALOG_TABS.map((name,i)=>[name,catalogs[i]]))});
    }
    if(action==='saveProduct') {
      const role=String(employee.Role||employee.role||'').trim().toLowerCase();
      if(role!=='admin') return res.status(403).json({error:'Admin access required'});
      const category=String(req.body.category||'');
      if(!CATALOG_TABS.includes(category)) return res.status(400).json({error:'Invalid category'});
      const number=Number(req.body.number);
      if(!Number.isSafeInteger(number)||number<1||number>999999) return res.status(400).json({error:'Invalid product number'});
      const fields=req.body.fields;
      if(!fields||typeof fields!=='object'||Array.isArray(fields)) return res.status(400).json({error:'Invalid fields'});
      const allowed={Housing:['name','fam','beam','mount','ip','heat','dim','aim','ri','img'],LED:['name','kind','w','volt','cct','make','img'],Driver:['code','mode','volt','cur','load','typo','ip','make','img']}[category];
      const clean={};
      for(const key of allowed) if(Object.hasOwn(fields,key)) {
        if(typeof fields[key]!=='string'||fields[key].length>3000) return res.status(400).json({error:'Invalid field '+key});
        clean[key]=fields[key].trim();
      }
      const status=String(req.body.status||'Active');
      if(!['Active','Archived'].includes(status)) return res.status(400).json({error:'Invalid status'});
      if(status==='Active' && !String(clean[category==='Driver'?'code':'name']||'').trim()) return res.status(400).json({error:'Product name required'});
      if(clean.img && !/^https:\/\//i.test(clean.img)) return res.status(400).json({error:'Image URL must begin with https://'});
      const url=process.env.RETINA_SCRIPT_URL,secret=process.env.RETINA_SHARED_SECRET;
      if(!url||!secret) return res.status(503).json({error:'Apps Script not configured'});
      const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({secret,action:'saveProduct',email,category,number,fields:clean,status}),redirect:'follow'});
      const body=await upstream.text();
      let result;try{result=JSON.parse(body)}catch{throw Error('Apps Script returned non-JSON response')}
      if(!result.ok) return res.status(400).json({error:result.error||'Product update failed'});
      return res.json(result);
    }
    if(action==='move') {
      const type=String(req.body.type||'').toUpperCase();
      const role=String(employee.Role||employee.role||'Employee').toLowerCase();
      if(type==='IN'&&(!canSee('manufacturing')&&!canSee('purchase') || !['admin','purchase','store'].includes(role))) return res.status(403).json({error:'You cannot check in'});
      if(type==='OUT'&&(!canSee('manufacturing') || !['admin','store'].includes(role))) return res.status(403).json({error:'You cannot check out'});
      if(!['IN','OUT'].includes(type)) return res.status(400).json({error:'Invalid movement type'});
      const items=req.body.items;
      if(!Array.isArray(items)||!items.length||items.length>100) return res.status(400).json({error:'Invalid cart'});
      const url=process.env.RETINA_SCRIPT_URL,secret=process.env.RETINA_SHARED_SECRET;
      if(!url||!secret) return res.status(503).json({error:'Stock writer not configured. Ask administrator to configure Apps Script.'});
      const payload={secret,action:'move',type,email,reference:req.body.reference,id:req.body.id,items};
      const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
      const body=await upstream.text();
      let result;try{result=JSON.parse(body)}catch{throw Error('Apps Script returned non-JSON response. Check web app deployment permissions.')}
      if(!result.ok) return res.status(400).json({error:result.error||'Stock update failed'});
      return res.json(result);
    }
    return res.status(400).json({error:'Unsupported operation'});
  } catch(err) {
    console.error('Inventory API error',err);
    return res.status(500).json({error:'Authentication or Google Sheets connection failed. Check server logs and configuration.'});
  }
}
