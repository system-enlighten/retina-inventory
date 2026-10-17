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
const tabs = { Products: 'Products', Stock: 'Stock', Users: 'Users', Purchases: 'Purchases', Transactions: 'Transactions' };
function rows(values=[]) {
  const [header=[], ...data] = values;
  return data.filter(r=>r.some(v=>String(v??'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[String(h).trim(),r[i]??''])));
}
async function readTab(sheets, spreadsheetId, name) {
  const result = await sheets.spreadsheets.values.get({spreadsheetId, range:`'${name}'!A1:Z10000`});
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
    if(action==='me') return res.json({email,role:employee.Role||employee.role||'Employee',name:profile?.name||email});
    if(action==='catalog') {
      const [products,stock]=await Promise.all([readTab(sheets,spreadsheetId,'Products'),readTab(sheets,spreadsheetId,'Stock')]);
      return res.json({products,stock});
    }
    if(action==='move') {
      const type=String(req.body.type||'').toUpperCase();
      const role=String(employee.Role||employee.role||'Employee').toLowerCase();
      if(type==='IN'&&!['admin','purchase','store'].includes(role)) return res.status(403).json({error:'You cannot check in'});
      if(type==='OUT'&&!['admin','store'].includes(role)) return res.status(403).json({error:'You cannot check out'});
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
