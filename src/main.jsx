import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import RetinaInventory from './RetinaInventory_Original_Cloud.jsx';
const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
function App(){
 const [token,setToken]=useState(''),[user,setUser]=useState(null),[error,setError]=useState(''),[checking,setChecking]=useState(true);
 async function api(action,details={},credential=token){
  const headers={'Content-Type':'application/json'};if(credential)headers.Authorization=`Bearer ${credential}`;
  const r=await fetch('/api/inventory',{method:'POST',credentials:'same-origin',headers,body:JSON.stringify({action,...details})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;
 }
 useEffect(()=>{
  api('me',{},'').then(setUser).catch(()=>{}).finally(()=>setChecking(false));
  if(!clientId){setError('Missing VITE_GOOGLE_CLIENT_ID');return}
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=()=>{window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
   try{const u=await api('me',{},credential);setToken('');setUser(u);setError('')}
   catch(e){setError(e.message);setUser(null)}
  },auto_select:true,cancel_on_tap_outside:false});
   window.google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',width:280});
   // Attempt automatic reauthentication with Google on reload. Google may
   // require account selection when browser privacy settings block auto sign-in.
   window.google.accounts.id.prompt();
  };
  document.head.appendChild(script);return()=>script.remove();
 },[]);
 return <>{checking&&<p style={{fontFamily:'Arial',textAlign:'center',marginTop:100}}>Restoring your sign-in…</p>}<div style={{display:user||checking?'none':'block',maxWidth:440,margin:'90px auto',padding:32,fontFamily:'Arial',background:'#fff',borderRadius:16}}><h1>Retina Inventory</h1><p>Sign in with your approved Gmail account.</p><div id="google-button"/><p style={{color:'firebrick'}}>{error}</p></div>{user&&<><div style={{padding:'8px 24px',background:'#e8f0ff',font:'13px Arial',display:'flex',justifyContent:'space-between'}}><span>Signed in: {user.email} · {user.role} | Cloud stock connected</span><button onClick={async()=>{try{await api('signout',{},'')}catch{}setUser(null);setToken('');window.google?.accounts.id.disableAutoSelect()}}>Sign out</button></div><RetinaInventory cloud={{api,user}}/></>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
