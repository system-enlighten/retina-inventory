import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import RetinaInventory from "./RetinaInventory_Simplified_Product_BOM_Variants";
const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
function App(){
 const [token,setToken]=useState(''),[user,setUser]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function api(action,details={},credential=token){
  const headers={'Content-Type':'application/json'};
  if(credential)headers.Authorization=`Bearer ${credential}`;
  const r=await fetch('/api/inventory',{method:'POST',headers,credentials:'same-origin',body:JSON.stringify({action,...details})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;
 }
 useEffect(()=>{
  let cancelled=false;
  (async()=>{try{const u=await api('me',{},'');if(!cancelled)setUser(u)}catch(e){if(!cancelled&&e.message!=='Sign in required')setError(e.message)}finally{if(!cancelled)setLoading(false)}})();
  return()=>{cancelled=true};
 },[]);
 useEffect(()=>{
  if(loading||user)return;
  if(!clientId){setError('Missing VITE_GOOGLE_CLIENT_ID');return}
  let cancelled=false;
  const render=()=>{
   if(cancelled||!document.getElementById('google-button'))return;
   window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
    try{const u=await api('me',{},credential);setToken(credential);setUser(u);setError('')}
    catch(e){setError(e.message);setUser(null)}
   }});
   window.google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',width:280});
  };
  if(window.google?.accounts?.id)render();
  else {const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=render;document.head.appendChild(script);return()=>{cancelled=true;script.remove()}}
  return()=>{cancelled=true};
 },[loading,user]);
 async function signOut(){try{await api('logout',{},'')}catch{}setUser(null);setToken('');setError('');window.google?.accounts.id.disableAutoSelect()}
 if(loading)return <div style={{fontFamily:'Arial',textAlign:'center',marginTop:140}}>Restoring your sign-in…</div>;
 if(!user)return <div style={{maxWidth:440,margin:'90px auto',padding:32,fontFamily:'Arial',background:'#fff',borderRadius:16}}><h1>Retina Inventory</h1><p>Sign in with your approved Gmail account.</p><div id="google-button"/><p style={{color:'firebrick'}}>{error}</p></div>;
 return <><div style={{padding:'8px 24px',background:'#e8f0ff',font:'13px Arial',display:'flex',justifyContent:'space-between'}}><span>Signed in: {user.email} · {user.role} | Cloud stock connected</span><button onClick={signOut}>Sign out</button></div><RetinaInventory cloud={{api,user}}/></>;
}
createRoot(document.getElementById('root')).render(<App/>);
