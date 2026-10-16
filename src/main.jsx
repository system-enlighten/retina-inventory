import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import './style.css';
const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
function App(){
 const [token,setToken]=useState(''),[me,setMe]=useState(null),[catalog,setCatalog]=useState([]),[stock,setStock]=useState([]),[error,setError]=useState(''),[search,setSearch]=useState('');
 async function api(action,idToken=token){
  const r=await fetch('/api/inventory',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({action})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;
 }
 useEffect(()=>{
  if(!clientId){setError('Configure VITE_GOOGLE_CLIENT_ID first.');return;}
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=()=>{window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
   setError('');try{const user=await api('me',credential);setToken(credential);setMe(user);const data=await api('catalog',credential);setCatalog(data.products);setStock(data.stock);}catch(e){setError(e.message);setMe(null);setToken('');}
  }});window.google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',width:280});};
  document.head.appendChild(script);return()=>script.remove();
 },[]);
 const qtyFor=(sku)=>{const s=stock.find(x=>String(x.SKU||x.sku||'')===String(sku));return Number(s?.Quantity??s?.Qty??0)};
 const shown=catalog.filter(p=>JSON.stringify(p).toLowerCase().includes(search.toLowerCase()));
 return <main><header><div><h1>RETINA INVENTORY</h1><small>Employee inventory portal</small></div>{me&&<button onClick={()=>{setToken('');setMe(null);setCatalog([]);window.google?.accounts.id.disableAutoSelect();}}>Sign out</button>}</header>
 {!me?<section className="login"><h2>Employee Google Sign-In</h2><p>Use your approved personal Gmail account.</p><div id="google-button"></div>{error&&<p className="error">{error}</p>}</section>:
 <><div className="welcome">Signed in as <b>{me.email}</b> · {me.role}</div><h2>Product catalogue</h2><p className="notice">Read-only cloud starter. Check-in and check-out are disabled until safe, shared stock transactions are configured.</p><input placeholder="Search products or SKUs" value={search} onChange={e=>setSearch(e.target.value)}/><div className="grid">{shown.map((p,i)=>{const sku=p.SKU||p.sku||p['Product SKU']||'';return <article key={sku+i}><div className="photo">{p['Image URL']||p.ImageURL?<img src={p['Image URL']||p.ImageURL} alt="" />:'📦'}</div><h3>{p['Product Name']||p.Name||p.name||sku||'Product'}</h3><small>{sku}</small><p>Available: <b>{qtyFor(sku)}</b></p><button disabled>Add / Check out (coming next)</button></article>})}</div>{shown.length===0&&<p>No products found. Add rows to the Products tab.</p>}</>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
