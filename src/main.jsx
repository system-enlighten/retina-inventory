import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import './style.css';
const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
function App(){
 const [token,setToken]=useState(''),[me,setMe]=useState(null),[catalog,setCatalog]=useState([]),[stock,setStock]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[mode,setMode]=useState('OUT'),[cart,setCart]=useState({}),[reference,setReference]=useState(''),[busy,setBusy]=useState(false);
 async function api(action,details={},idToken=token){
  const r=await fetch('/api/inventory',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({action,...details})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;
 }
 async function refresh(t=token){const d=await api('catalog',{},t);setCatalog(d.products);setStock(d.stock);}
 useEffect(()=>{
  if(!clientId){setError('Configure VITE_GOOGLE_CLIENT_ID first.');return;}
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=()=>{window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
   setError('');try{const user=await api('me',{},credential);setToken(credential);setMe(user);await refresh(credential);}catch(e){setError(e.message);setMe(null);setToken('');}
  }});window.google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',width:280});};
  document.head.appendChild(script);return()=>script.remove();
 },[]);
 const qtyFor=(sku)=>{const s=stock.find(x=>String(x.SKU||x.sku||'')===String(sku));return Number(s?.Quantity??s?.Qty??0)};
 const skuFor=p=>String(p.SKU||p.sku||p['Product SKU']||'');
 const nameFor=p=>String(p['Product Name']||p.Name||p.name||skuFor(p)||'Product');
 const shown=catalog.filter(p=>JSON.stringify(p).toLowerCase().includes(search.toLowerCase()));
 const canIn=['admin','purchase','store'].includes(String(me?.role||'').toLowerCase());
 const canOut=['admin','store'].includes(String(me?.role||'').toLowerCase());
 const selected=Object.entries(cart).filter(([sku,quantity])=>Number(quantity)>0).map(([sku,quantity])=>{const p=catalog.find(x=>skuFor(x)===sku);return {sku,quantity:Number(quantity),name:p?nameFor(p):sku};});
 const add=(sku)=>{setCart(old=>({...old,[sku]:(old[sku]||0)+1}));setNotice('');};
 const change=(sku,qty)=>setCart(old=>({...old,[sku]:Math.max(0,Math.min(1000000,Number(qty)||0))}));
 const switchMode=m=>{setMode(m);setCart({});setNotice('');setError('');};
 async function submit(){
  if(busy)return;
  if(!selected.length){setError('Add at least one product');return;}
  if(!reference.trim()){setError('Enter a purchase reference for check-in or issue reference for check-out');return;}
  if(mode==='OUT'){const missing=selected.find(x=>x.quantity>qtyFor(x.sku));if(missing){setError('Insufficient stock for '+missing.sku);return;}}
  setBusy(true);setError('');setNotice('');
  try{
   const id=crypto.randomUUID();
   await api('move',{type:mode,reference:reference.trim(),items:selected,id});
   setCart({});setReference('');await refresh();setNotice((mode==='IN'?'Check-in':'Check-out')+' saved to Google Sheets successfully.');
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main><header><div><h1>RETINA INVENTORY</h1><small>Employee stock management</small></div>{me&&<button onClick={()=>{setToken('');setMe(null);setCatalog([]);setCart({});window.google?.accounts.id.disableAutoSelect();}}>Sign out</button>}</header>
 {!me?<section className="login"><h2>Employee Google Sign-In</h2><p>Use your approved personal Gmail account.</p><div id="google-button"></div>{error&&<p className="error">{error}</p>}</section>:
 <><div className="welcome">Signed in as <b>{me.email}</b> · {me.role}</div><div className="modebar"><button className={mode==='OUT'?'active':''} disabled={!canOut} onClick={()=>switchMode('OUT')}>🛒 Check-Out</button><button className={mode==='IN'?'active':''} disabled={!canIn} onClick={()=>switchMode('IN')}>📦 Check-In</button><button onClick={()=>refresh().then(()=>setNotice('Stock refreshed')).catch(e=>setError(e.message))}>↻ Refresh stock</button></div>
 <h2>{mode==='IN'?'Receive products':'Issue products'}</h2><p className="notice">Select products, add quantities to the cart, then confirm. All balances are shared through Google Sheets.</p>
 {error&&<p className="error">{error}</p>}{notice&&<p className="success">{notice}</p>}
 <div className="layout"><div><input placeholder="Search products or SKUs" value={search} onChange={e=>setSearch(e.target.value)}/><div className="grid">{shown.map((p,i)=>{const sku=skuFor(p),image=p['Image URL']||p.ImageURL;return <article key={sku+i}><div className="photo">{image?<img src={image} alt="" />:'📦'}</div><h3>{nameFor(p)}</h3><small>{sku}</small><p>Available: <b>{qtyFor(sku)}</b></p><button disabled={!sku||busy||(mode==='OUT'&&qtyFor(sku)<=0)} onClick={()=>add(sku)}>+ Add to cart</button></article>})}</div>{shown.length===0&&<p>No products found. Add rows to the Products tab.</p>}</div>
 <aside><h2>{mode==='IN'?'Receiving':'Issue'} Cart ({selected.length})</h2>{selected.length===0?<p>No items added yet.</p>:selected.map(x=><div className="cartrow" key={x.sku}><b>{x.name}</b><small>{x.sku}</small><div className="qty"><button onClick={()=>change(x.sku,x.quantity-1)}>−</button><input type="number" min="0" max="1000000" value={x.quantity} onChange={e=>change(x.sku,e.target.value)}/><button onClick={()=>change(x.sku,x.quantity+1)}>+</button></div></div>)}
 <label>{mode==='IN'?'Purchase / delivery reference':'Issue / project reference'}</label><input value={reference} onChange={e=>setReference(e.target.value)} placeholder={mode==='IN'?'PO-001':'PROJECT-001'}/>
 <button className="confirm" disabled={busy||!selected.length||(mode==='IN'?!canIn:!canOut)} onClick={submit}>{busy?'Saving...':`Confirm ${mode==='IN'?'Check-In':'Check-Out'}`}</button><small>Each confirmation is recorded with your Gmail and reference.</small></aside></div></>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
