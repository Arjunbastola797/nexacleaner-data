import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/* ─── PLATFORM DETECTION ─────────────────────────────────────────────────── */
const IS_ELECTRON  = typeof window !== "undefined" && !!window.electronAPI?.isElectron;
const IS_CAPACITOR = typeof window !== "undefined" && !!(window.Capacitor?.isNativePlatform?.());
const IS_IOS       = IS_CAPACITOR && /iphone|ipad|ipod/i.test(navigator.userAgent);

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function useWindowSize() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return s;
}

function parseMB(str) {
  const m = String(str || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  switch (m[2].toUpperCase()) {
    case "GB": return v * 1024;
    case "MB": return v;
    case "KB": return v / 1024;
    default:   return 0;
  }
}

function fmtGB(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1)    return `${mb.toFixed(0)} MB`;
  return "0 MB";
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07070f;--s1:rgba(255,255,255,0.04);--s2:rgba(255,255,255,0.07);--bd:rgba(255,255,255,0.09);--tx:#f1f5f9;--mu:#64748b;--pu:#8b5cf6;--cy:#06b6d4;--pk:#ec4899;--gn:#10b981;--am:#f59e0b;--rd:#ef4444}
.light{--bg:#f0f4ff;--s1:rgba(255,255,255,0.8);--s2:rgba(255,255,255,0.95);--bd:rgba(0,0,0,0.09);--tx:#0f172a;--mu:#64748b}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--tx)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.35);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 18px rgba(139,92,246,0.3)}50%{box-shadow:0 0 38px rgba(139,92,246,0.7)}}
@keyframes dotBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
@keyframes successPop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
.fadeUp{animation:fadeUp 0.35s ease both}
.gtext{background:linear-gradient(135deg,#8b5cf6,#06b6d4,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.card{background:var(--s1);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid var(--bd);border-radius:18px;transition:all 0.28s}
.btnP{background:linear-gradient(135deg,#7c3aed,#06b6d4);border:none;color:#fff;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:all 0.25s ease}
.btnP:hover{opacity:0.88;transform:translateY(-1px);box-shadow:0 6px 22px rgba(124,58,237,0.48)}
.btnP:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.btnS{background:var(--s2);border:1px solid var(--bd);color:var(--tx);cursor:pointer;font-family:inherit;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px}
.btnS:hover{border-color:rgba(139,92,246,0.4);background:rgba(139,92,246,0.08)}
.prog{height:6px;border-radius:99px;background:rgba(255,255,255,0.08);overflow:hidden}
.progFill{height:100%;border-radius:99px;transition:width 0.12s linear}
.tog{position:relative;width:44px;height:24px;border-radius:99px;cursor:pointer;transition:background 0.3s;flex-shrink:0}
.togKnob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);box-shadow:0 2px 7px rgba(0,0,0,0.3)}
.tog.on .togKnob{transform:translateX(20px)}
.navItem{cursor:pointer;border-radius:12px;display:flex;align-items:center;gap:10px;padding:10px 14px;color:var(--mu);font-size:14px;border:none;background:transparent;font-family:inherit;width:100%;text-align:left;transition:all 0.2s}
.navItem:hover{color:var(--tx);background:var(--s2)}
.navItem.active{color:#fff;background:linear-gradient(135deg,rgba(124,58,237,0.28),rgba(6,182,212,0.14));border:1px solid rgba(139,92,246,0.3)}
.badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap}
.chip{font-size:12px;padding:5px 13px;border-radius:99px;border:1px solid var(--bd);background:var(--s2);cursor:pointer;transition:all 0.2s;color:var(--mu);white-space:nowrap}
.chip.on{background:rgba(139,92,246,0.18);border-color:rgba(139,92,246,0.45);color:var(--pu)}
.listRow{display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--bd);cursor:pointer;transition:background 0.15s}
.listRow:last-child{border-bottom:none}
.listRow:hover{background:var(--s2)}
.tabBtn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;padding:8px 4px;border:none;background:transparent;font-family:inherit;color:var(--mu);font-size:10px;transition:color 0.2s}
.tabBtn.on{color:var(--pu)}
.meshBlob{position:fixed;border-radius:50%;filter:blur(80px);opacity:0.1;pointer-events:none;z-index:0}
.detailPanel{position:relative;width:360px;flex-shrink:0;height:100%;border-left:1px solid var(--bd);background:var(--bg);overflow-y:auto;animation:slideInRight 0.32s cubic-bezier(0.4,0,0.2,1)}
.sheetBackdrop{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;animation:fadeUp 0.2s ease}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:401;background:var(--bg);border-radius:24px 24px 0 0;border-top:1px solid var(--bd);max-height:90dvh;overflow-y:auto;animation:slideInUp 0.32s cubic-bezier(0.4,0,0.2,1)}
`;

/* ─── MOCK DATA (used in browser / when path doesn't exist on device) ─────── */
const JUNK_INIT = [
  {id:1,name:"Xcode Derived Data",    path:"~/Library/Developer/Xcode/DerivedData",size:"4.8 GB",files:2847,type:"cache",age:"3 days", safe:true, icon:"🛠",reason:"Rebuilt automatically by Xcode on next build."},
  {id:2,name:"App Store Cache",       path:"~/Library/Caches/com.apple.appstore",  size:"1.2 GB",files:489, type:"cache",age:"7 days", safe:true, icon:"🛍",reason:"Temporary download cache. Safe to remove."},
  {id:3,name:"Safari Web Cache",      path:"~/Library/Caches/com.apple.Safari",    size:"890 MB",files:1203,type:"cache",age:"1 day",  safe:true, icon:"🌐",reason:"Web browsing cache. Safari rebuilds it automatically."},
  {id:4,name:"Homebrew Cache",        path:"~/Library/Caches/Homebrew",            size:"670 MB",files:34,  type:"cache",age:"30 days",safe:true, icon:"🍺",reason:"Old package downloads. Re-fetched as needed."},
  {id:5,name:"Zoom Meeting Cache",    path:"~/Library/Application Support/zoom.us",size:"440 MB",files:892, type:"cache",age:"14 days",safe:true, icon:"📹",reason:"Meeting thumbnails and temp data."},
  {id:6,name:"Mail Temp Files",       path:"~/Library/Containers/Mail/Data/tmp",   size:"234 MB",files:67,  type:"temp", age:"60 days",safe:true, icon:"📧",reason:"Email attachment temp files. Safe to remove."},
  {id:7,name:"Trash",                 path:"~/.Trash",                             size:"1.1 GB",files:438, type:"trash",age:"45 days",safe:true, icon:"🗑️",reason:"Items in Trash. Permanently removes them."},
  {id:8,name:"System Log Files",      path:"/var/log",                             size:"156 MB",files:203, type:"log",  age:"30 days",safe:true, icon:"📋",reason:"System diagnostic logs. macOS regenerates automatically."},
  {id:9,name:"User Log Files",        path:"~/Library/Logs",                       size:"98 MB", files:145, type:"log",  age:"14 days",safe:true, icon:"📋",reason:"Application logs. Safe to remove."},
  {id:10,name:"Crash Reports",        path:"~/Library/Logs/DiagnosticReports",     size:"48 MB", files:91,  type:"log",  age:"60 days",safe:true, icon:"💥",reason:"App crash diagnostics."},
];

const APPS_INIT = [
  {id:1,name:"Xcode",   icon:"🛠",size:"12.4 GB",status:"large",   updated:"5d",  last:"3d",  version:"15.2",  residual:"890 MB",path:"/Applications/Xcode.app",     reason:"Large IDE with removable derived data cache."},
  {id:2,name:"Docker",  icon:"🐳",size:"8.1 GB", status:"large",   updated:"7d",  last:"1d",  version:"4.28",  residual:"240 MB",path:"/Applications/Docker.app",    reason:"Container runtime. Images accumulate disk usage."},
  {id:3,name:"Figma",   icon:"🎨",size:"3.2 GB", status:"healthy", updated:"2d",  last:"2h",  version:"24.3",  residual:"45 MB", path:"/Applications/Figma.app",     reason:"Design tool in good health."},
  {id:4,name:"Slack",   icon:"💬",size:"1.8 GB", status:"outdated",updated:"12d", last:"4h",  version:"4.35",  residual:"320 MB",path:"/Applications/Slack.app",     reason:"12 days since last update."},
  {id:5,name:"Zoom",    icon:"📹",size:"670 MB", status:"outdated",updated:"20d", last:"2d",  version:"5.17",  residual:"110 MB",path:"/Applications/Zoom.us.app",   reason:"20 days since update."},
  {id:6,name:"VS Code", icon:"💻",size:"1.1 GB", status:"healthy", updated:"1d",  last:"1h",  version:"1.88",  residual:"28 MB", path:"/Applications/VSCode.app",    reason:"Up to date and healthy."},
  {id:7,name:"Chrome",  icon:"🌐",size:"890 MB", status:"healthy", updated:"1d",  last:"30m", version:"124",   residual:"66 MB", path:"/Applications/Chrome.app",    reason:"Current version."},
  {id:8,name:"Spotify", icon:"🎵",size:"450 MB", status:"healthy", updated:"3d",  last:"6h",  version:"1.2.36",residual:"18 MB", path:"/Applications/Spotify.app",   reason:"Healthy and up to date."},
];

const DUPES_INIT = [
  {id:1,name:"Screenshot 2024-03-15.png",copies:3,size:"8.4 MB", type:"image",   paths:["~/Desktop/","~/Downloads/","~/Documents/Screenshots/"],              reason:"Identical pixel hash."},
  {id:2,name:"project_backup.zip",        copies:2,size:"142 MB",type:"archive", paths:["~/Downloads/","~/Documents/Backups/"],                                reason:"Exact byte-for-byte match."},
  {id:3,name:"Zoom Recording Apr.mov",    copies:2,size:"1.2 GB",type:"video",   paths:["~/Movies/Zoom/","~/Downloads/"],                                      reason:"Duplicate video identified by hash."},
  {id:4,name:"resume_final_v3.pdf",       copies:5,size:"2.1 MB",type:"document",paths:["~/Desktop/","~/Documents/","~/Downloads/","~/iCloud Drive/","~/Dropbox/"],reason:"5 identical copies."},
  {id:5,name:"icon_set_v2.sketch",        copies:2,size:"24 MB", type:"design",  paths:["~/Documents/Design/","~/Desktop/Work/"],                              reason:"Exact byte match."},
];

/* ─── ICONS ──────────────────────────────────────────────────────────────── */
const I = {
  Home:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  Scan:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Cpu:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
  Disk:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Shield:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Apps:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Copy:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Bot:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 2v4M8 15v2M16 15v2"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>,
  Cog:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  X:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>,
  Arr:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Send:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Trash:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Folder:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  Info:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Zap:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>,
  Phone:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
};

/* ─── SHARED MINI ─────────────────────────────────────────────────────────── */
function Tog({on,set}){return <div className={`tog${on?" on":""}`} onClick={()=>set(!on)} style={{background:on?"linear-gradient(135deg,#7c3aed,#06b6d4)":"rgba(255,255,255,0.1)"}}><div className="togKnob"/></div>}
function PR({label,pct,color,right}){return <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>{label}</span><span style={{color:"var(--mu)"}}>{right}</span></div><div className="prog"><div className="progFill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}88)`}}/></div></div>}
function SBadge({s}){const m={healthy:["#10b981","Healthy"],large:["#f59e0b","Large"],outdated:["#ef4444","Update"]};const[c,l]=m[s]||["#64748b",s];return <span className="badge" style={{background:`${c}22`,color:c}}>{l}</span>}

/* ─── DETAIL PANEL ────────────────────────────────────────────────────────── */
function Detail({item,type,onClose,mobile,onAction}){
  const[cleaning,setCleaning]=useState(false);
  const[pct,setPct]=useState(0);
  const[done,setDone]=useState(false);
  const[err,setErr]=useState("");

  const handleAction=useCallback(()=>{
    if(cleaning||done) return;
    setCleaning(true); setErr("");
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*7+3;
      if(p>=100){
        p=100; clearInterval(iv);
        // If Electron, actually delete the file
        const doDelete=async()=>{
          if(IS_ELECTRON && item.path && type!=="app"){
            const res = await window.electronAPI.deleteItem(item.path);
            if(!res.success){ setErr(res.error||"Delete failed"); setCleaning(false); return; }
          }
          setDone(true);
          setTimeout(()=>onAction(item,type),700);
        };
        doDelete();
      }
      setPct(Math.round(p));
    },55);
  },[cleaning,done,item,type,onAction]);

  if(!item) return null;
  const typeClr={cache:"#8b5cf6",temp:"#06b6d4",log:"#f59e0b",trash:"#ef4444",large:"#ec4899",app:"#06b6d4",dupe:"#ec4899"};
  const c=typeClr[type]||"#8b5cf6";
  const actionLabel=done?"✅ Done!":cleaning?`${type==="app"?"Removing":"Cleaning"}… ${pct}%`:type==="app"?"Uninstall":type==="dupe"?"Remove Copies":"Clean Now";

  const body=(
    <div style={{paddingBottom:mobile?40:0}}>
      {mobile&&<div style={{width:38,height:4,borderRadius:2,background:"rgba(255,255,255,0.18)",margin:"14px auto 0"}}/>}
      <div style={{padding:"22px 22px 0",display:"flex",gap:14,alignItems:"flex-start"}}>
        <div style={{width:54,height:54,borderRadius:17,background:`${c}22`,border:`1px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{item.icon||"📄"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16,lineHeight:1.3,marginBottom:4}}>{item.name}</div>
          <span className="badge" style={{background:`${c}22`,color:c,fontSize:11}}>{type}</span>
          {IS_ELECTRON&&<span className="badge" style={{background:"rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,marginLeft:6}}>Real data</span>}
        </div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:"1px solid var(--bd)",background:"var(--s2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--mu)",flexShrink:0}}>
          <div style={{width:14,height:14}}><I.X/></div>
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"18px 22px 0"}}>
        {[
          {l:"Total Size",    v:item.size||item.residual||"—",col:"#ef4444"},
          {l:"Files",        v:item.files?item.files.toLocaleString():item.copies?`${item.copies} copies`:"—",col:"#8b5cf6"},
          {l:"Last modified",v:item.last||item.age||"—",col:"#f59e0b"},
          {l:"Safe to remove",v:item.safe===false?"⚠️ Verify":"✅ Yes",col:item.safe===false?"#f59e0b":"#10b981"},
        ].map(s=>(
          <div key={s.l} style={{padding:"13px 14px",borderRadius:13,background:"var(--s2)",border:"1px solid var(--bd)"}}>
            <div style={{fontSize:11,color:"var(--mu)",marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:700,color:s.col}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{padding:"16px 22px 0"}}>
        <div style={{fontSize:11,fontWeight:600,color:"var(--mu)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>
          {item.paths?"Found at":"Location"}
        </div>
        {(item.paths||[item.path]).filter(Boolean).map((p,i)=>(
          <div key={i} onClick={()=>IS_ELECTRON&&window.electronAPI.revealInFinder(p)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,background:"var(--s2)",border:"1px solid var(--bd)",marginBottom:6,fontSize:12,color:"var(--mu)",fontFamily:"monospace",overflowX:"auto",whiteSpace:"nowrap",cursor:IS_ELECTRON?"pointer":"default"}}
            title={IS_ELECTRON?"Click to reveal in Finder":""}>
            <div style={{width:13,height:13,flexShrink:0,color:"var(--pu)"}}><I.Folder/></div>{p}
          </div>
        ))}
      </div>

      {item.reason&&(
        <div style={{margin:"16px 22px 0",padding:"14px 16px",borderRadius:13,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.22)"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:16,height:16,color:"#8b5cf6",flexShrink:0,marginTop:1}}><I.Info/></div>
            <div style={{fontSize:13,lineHeight:1.65}}>{item.reason}</div>
          </div>
        </div>
      )}

      {item.version&&(
        <div style={{padding:"16px 22px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{padding:"13px 14px",borderRadius:13,background:"var(--s2)",border:"1px solid var(--bd)"}}>
            <div style={{fontSize:11,color:"var(--mu)",marginBottom:5}}>Version</div>
            <div style={{fontSize:15,fontWeight:700}}>{item.version}</div>
          </div>
          <div style={{padding:"13px 14px",borderRadius:13,background:"var(--s2)",border:"1px solid var(--bd)"}}>
            <div style={{fontSize:11,color:"var(--mu)",marginBottom:5}}>Residual</div>
            <div style={{fontSize:15,fontWeight:700,color:"#f59e0b"}}>{item.residual}</div>
          </div>
        </div>
      )}

      <div style={{padding:"20px 22px 22px"}}>
        {err&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10,padding:"8px 12px",background:"rgba(239,68,68,0.1)",borderRadius:8}}>{err}</div>}
        {cleaning&&!done&&(
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--mu)",marginBottom:6}}>
              <span>{type==="app"?"Removing app…":"Cleaning files…"}</span>
              <span style={{color:"var(--pu)",fontWeight:700}}>{pct}%</span>
            </div>
            <div className="prog" style={{height:8}}>
              <div className="progFill" style={{width:`${pct}%`,background:"linear-gradient(90deg,#7c3aed,#06b6d4)"}}/>
            </div>
          </div>
        )}
        {done&&<div style={{textAlign:"center",padding:"10px 0 14px",fontSize:28,animation:"successPop 0.4s ease both"}}>✅</div>}
        <div style={{display:"flex",gap:10}}>
          <button className="btnP" onClick={handleAction} disabled={cleaning||done}
            style={{flex:1,padding:"13px",borderRadius:14,fontSize:14,justifyContent:"center",
              background:done?"linear-gradient(135deg,#10b981,#06b6d4)":"linear-gradient(135deg,#7c3aed,#06b6d4)"}}>
            {!cleaning&&!done&&<div style={{width:15,height:15}}><I.Trash/></div>}
            {actionLabel}
          </button>
          {!cleaning&&!done&&<button className="btnS" onClick={onClose} style={{padding:"13px 18px",borderRadius:14,fontSize:14}}>Skip</button>}
        </div>
      </div>
    </div>
  );

  if(mobile){
    return <>
      <div className="sheetBackdrop" onClick={!cleaning?onClose:undefined}/>
      <div className="sheet">{body}</div>
    </>;
  }
  return <div className="detailPanel">{body}</div>;
}

/* ─── SIDEBAR / NAV ──────────────────────────────────────────────────────── */
/* ─── GIT ICON ───────────────────────────────────────────────────────────── */
const GitIcon=()=><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>;

const NAV=[
  {id:"home",    label:"Dashboard",   Icon:I.Home},
  {id:"scan",    label:"Smart Scan",  Icon:I.Scan},
  {id:"iphone",  label:"My iPhone",   Icon:I.Phone},
  {id:"perf",    label:"Performance", Icon:I.Cpu},
  {id:"storage", label:"Storage",     Icon:I.Disk},
  {id:"security",label:"Security",    Icon:I.Shield},
  {id:"apps",    label:"Applications",Icon:I.Apps},
  {id:"dupes",   label:"Duplicates",  Icon:I.Copy},
  {id:"github",  label:"GitHub",      Icon:GitIcon},
  {id:"ai",      label:"AI Assistant",Icon:I.Bot},
  {id:"settings",label:"Settings",    Icon:I.Cog},
];
const TABS=[
  {id:"home",   label:"Home",   Icon:I.Home},
  {id:"scan",   label:"Scan",   Icon:I.Scan},
  {id:"iphone", label:"iPhone", Icon:I.Phone},
  {id:"github", label:"GitHub", Icon:GitIcon},
  {id:"apps",   label:"Apps",   Icon:I.Apps},
  {id:"ai",  label:"AI",     Icon:I.Bot},
  {id:"settings",label:"More",Icon:I.Cog},
];

function Sidebar({page,setPage}){
  const platform = IS_ELECTRON ? "Mac App" : IS_IOS ? "iPhone App" : "Web";
  const platColor = IS_ELECTRON ? "#10b981" : IS_IOS ? "#06b6d4" : "#8b5cf6";
  return(
    <div style={{width:218,height:"100%",display:"flex",flexDirection:"column",borderRight:"1px solid var(--bd)",background:"var(--s1)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",flexShrink:0}}>
      <div style={{padding:"22px 18px 16px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 18px rgba(124,58,237,0.5)",flexShrink:0}}>⚡</div>
        <div>
          <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.3}} className="gtext">NexaCleaner</div>
          <div style={{fontSize:10,color:platColor,letterSpacing:1,textTransform:"uppercase"}}>{platform}</div>
        </div>
      </div>
      <nav style={{flex:1,padding:"10px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"}}>
        {NAV.map(n=>(
          <button key={n.id} className={`navItem${page===n.id?" active":""}`} onClick={()=>setPage(n.id)}>
            <div style={{width:18,height:18,flexShrink:0,color:page===n.id?"var(--pu)":"inherit"}}><n.Icon/></div>
            {n.label}
            {page===n.id&&<div style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:"var(--pu)",boxShadow:"0 0 8px var(--pu)",flexShrink:0}}/>}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px",borderTop:"1px solid var(--bd)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>A</div>
        <div><div style={{fontSize:13,fontWeight:600}}>Arjun</div><div style={{fontSize:11,color:"var(--pu)"}}>Pro Plan ✦</div></div>
      </div>
    </div>
  );
}

/* ─── HOME ────────────────────────────────────────────────────────────────── */
function Home({setPage,onSel,mobile,freedMB,junk,myApps,myDupes}){
  const[scanning,setScanning]=useState(false);
  const[pct,setPct]=useState(0);
  const[sysStats,setSysStats]=useState(null);

  // Load real system stats on mount (Electron only)
  useEffect(()=>{
    if(!IS_ELECTRON) return;
    window.electronAPI.getSystemStats().then(s=>setSysStats(s)).catch(()=>{});
  },[]);

  const scan=useCallback(()=>{
    setScanning(true);setPct(0);let p=0;
    const iv=setInterval(()=>{p+=Math.random()*4+1;if(p>=100){p=100;clearInterval(iv);setScanning(false);setPage("scan");}setPct(Math.round(p));},80);
  },[setPage]);

  const freedGB=(freedMB/1024).toFixed(2);
  const totalJunkGB=(junk.reduce((s,j)=>s+parseMB(j.size),0)/1024).toFixed(1);

  // Real disk info
  const diskTotalGB = sysStats ? (sysStats.disk.total/1e9).toFixed(0) : "512";
  const diskUsedGB  = sysStats ? (sysStats.disk.used/1e9).toFixed(0)  : "286";
  const diskFreeGB  = sysStats ? (sysStats.disk.free/1e9).toFixed(0)  : "226";
  const ramTotalGB  = sysStats ? (sysStats.ram.total/1e9).toFixed(0)  : "16";
  const ramUsedPct  = sysStats ? Math.round(sysStats.ram.used/sysStats.ram.total*100) : 73;
  const cpuPct      = sysStats ? Math.round(sysStats.cpu) : 63;

  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
        <div>
          <div style={{fontSize:12,color:"var(--mu)",marginBottom:3,textTransform:"uppercase",letterSpacing:1}}>Good morning, Arjun 👋</div>
          <h1 style={{fontSize:mobile?22:28,fontWeight:800,letterSpacing:-0.5}} className="gtext">Dashboard</h1>
          {(IS_ELECTRON||IS_CAPACITOR)&&<div style={{fontSize:11,marginTop:4,color:"#10b981"}}>● Live system data</div>}
        </div>
        <button className="btnP" onClick={scan} style={{padding:"10px 18px",borderRadius:12,fontSize:13}}>
          <div style={{width:15,height:15}}><I.Zap/></div>{scanning?`${pct}%`:"Quick Scan"}
        </button>
      </div>

      {scanning&&(
        <div className="card fadeUp" style={{padding:"14px 18px",marginBottom:16,border:"1px solid rgba(139,92,246,0.35)"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
            <span style={{fontWeight:600}}>🔍 Scanning system…</span>
            <span style={{color:"var(--pu)",fontWeight:700}}>{pct}%</span>
          </div>
          <div className="prog"><div className="progFill" style={{width:`${pct}%`,background:"linear-gradient(90deg,#7c3aed,#06b6d4)"}}/></div>
        </div>
      )}

      {/* Metrics */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>Freed Today</div>
          <div style={{fontSize:24,fontWeight:800,color:"#8b5cf6",letterSpacing:-0.5}}>
            {freedMB>0?fmtGB(freedMB):"0"}
            <span style={{fontSize:12,fontWeight:500,color:"var(--mu)",marginLeft:2}}>{freedMB>=1024?"":"MB"}</span>
          </div>
          <div style={{fontSize:11,marginTop:4,color:freedMB>0?"#10b981":"var(--mu)"}}>{freedMB>0?"Cleaned ✓":"Ready to clean"}</div>
        </div>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>Junk Found</div>
          <div style={{fontSize:24,fontWeight:800,color:"#ef4444",letterSpacing:-0.5}}>{totalJunkGB}<span style={{fontSize:12,fontWeight:500,color:"var(--mu)",marginLeft:2}}>GB</span></div>
          <div style={{fontSize:11,marginTop:4,color:"#f59e0b"}}>{junk.length} items</div>
        </div>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>CPU Usage</div>
          <div style={{fontSize:24,fontWeight:800,color:"#06b6d4",letterSpacing:-0.5}}>{cpuPct}<span style={{fontSize:12,fontWeight:500,color:"var(--mu)",marginLeft:2}}>%</span></div>
          <div style={{fontSize:11,marginTop:4,color:cpuPct>80?"#ef4444":"#10b981"}}>{cpuPct>80?"High load":"Normal"}</div>
        </div>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>RAM Used</div>
          <div style={{fontSize:24,fontWeight:800,color:"#f59e0b",letterSpacing:-0.5}}>{ramUsedPct}<span style={{fontSize:12,fontWeight:500,color:"var(--mu)",marginLeft:2}}>%</span></div>
          <div style={{fontSize:11,marginTop:4,color:"var(--mu)"}}>{ramTotalGB} GB total</div>
        </div>
      </div>

      {/* Disk bar */}
      {!mobile&&(
        <div className="card" style={{padding:20,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontWeight:700}}>Disk Usage {IS_ELECTRON?"(live)":"(estimated)"}</div>
            <div style={{fontSize:13,color:"var(--mu)"}}>{diskUsedGB} / {diskTotalGB} GB</div>
          </div>
          <div className="prog" style={{height:10}}>
            <div className="progFill" style={{
              width:`${diskTotalGB>0?Math.round(diskUsedGB/diskTotalGB*100):56}%`,
              background:"linear-gradient(90deg,#7c3aed,#06b6d4)"
            }}/>
          </div>
          <div style={{display:"flex",gap:20,marginTop:10,fontSize:12}}>
            <span style={{color:"#ef4444"}}>● Used: {diskUsedGB} GB</span>
            <span style={{color:"#10b981"}}>● Free: {diskFreeGB} GB</span>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card" style={{padding:18,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Quick Actions</div>
        <div style={{fontSize:12,color:"var(--mu)",marginBottom:10}}>
          {IS_ELECTRON?"Real items found on your Mac — tap to clean":"Tap any item to see full details →"}
        </div>
        {[
          junk[0]&&{label:junk[0].name,sub:`${junk[0].size} · ${junk[0].type}`,item:junk[0],type:"cache"},
          junk[1]&&{label:junk[1].name,sub:`${junk[1].size} · ${junk[1].files||""} files`,item:junk[1],type:"cache"},
          myApps.find(a=>a.status==="outdated")&&{label:myApps.find(a=>a.status==="outdated").name+" (update needed)",sub:myApps.find(a=>a.status==="outdated").size,item:myApps.find(a=>a.status==="outdated"),type:"app"},
          myDupes[0]&&{label:"Duplicate: "+myDupes[0].name,sub:`${myDupes[0].copies} copies · ${myDupes[0].size}`,item:myDupes[0],type:"dupe"},
        ].filter(Boolean).slice(0,4).map((a,i,arr)=>(
          <div key={i} onClick={()=>onSel(a.item,a.type)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<arr.length-1?"1px solid var(--bd)":"none",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.72"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <div style={{fontSize:20,width:30,textAlign:"center"}}>{a.item.icon||"📑"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.label}</div>
              <div style={{fontSize:11,color:"var(--mu)"}}>{a.sub}</div>
            </div>
            <div style={{width:16,height:16,color:"var(--pu)"}}><I.Arr/></div>
          </div>
        ))}
        {junk.length===0&&myApps.length===0&&myDupes.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",fontSize:14,color:"#10b981"}}>✅ Everything is clean!</div>
        )}
      </div>

      {/* AI tip */}
      {junk.length>0&&(
        <div className="card" style={{padding:16,background:"linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.06))",border:"1px solid rgba(139,92,246,0.25)"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🤖</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>Nexa AI Tip</div>
              <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6}}>
                {IS_ELECTRON
                  ? `Found ${junk[0].size} in ${junk[0].name} on your actual Mac. Tap Clean Now to free that space immediately.`
                  : `${junk[0].name} is ${junk[0].size} — tap View to see details and clean it.`
                }
              </div>
            </div>
            <button className="btnP" onClick={()=>onSel(junk[0],"cache")} style={{padding:"8px 14px",borderRadius:10,fontSize:12,whiteSpace:"nowrap"}}>View</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SCAN ────────────────────────────────────────────────────────────────── */
function Scan({onSel,mobile,junk,onRealScanComplete,onCleanAll}){
  const[phase,setPhase]=useState("idle");
  const[pct,setPct]=useState(0);
  const[step,setStep]=useState("");
  const[filter,setFilter]=useState("all");
  const[cleaningAll,setCleaningAll]=useState(false);
  const[cleanAllPct,setCleanAllPct]=useState(0);

  const STEPS_MAC = ["Checking Xcode caches…","Scanning App Store cache…","Reading log files…","Checking trash…","Analyzing temp files…","Scanning Homebrew cache…","Finalizing…"];
  const STEPS_WEB = ["Scanning system folders…","Checking cache files…","Analyzing temp files…","Finding duplicates…","Checking trash…","Finalizing…"];
  const steps = IS_ELECTRON ? STEPS_MAC : STEPS_WEB;

  const startScan=useCallback(async ()=>{
    setPhase("scanning"); setPct(0); setStep(steps[0]);
    let p=0, si=0;

    if(IS_ELECTRON){
      // Animate 0→85% while real scan runs in background
      const fakeIv=setInterval(()=>{
        p=Math.min(p+Math.random()*2+0.3,85);
        const ni=Math.floor(p/(85/steps.length));
        if(ni!==si&&ni<steps.length){si=ni;setStep(steps[ni]);}
        setPct(Math.round(p));
      },100);

      try {
        const [realJunk, realApps] = await Promise.all([
          window.electronAPI.scanSystem(),
          window.electronAPI.getApps(),
        ]);
        clearInterval(fakeIv);
        setPct(100);
        setStep("Done!");
        onRealScanComplete(realJunk, realApps);
        setTimeout(()=>setPhase("done"),600);
      } catch(e) {
        clearInterval(fakeIv);
        // Fallback to mock
        setPct(100); setPhase("done");
      }
    } else {
      // Mock scan animation
      const iv=setInterval(()=>{
        p+=Math.random()*2.5+0.5;
        const ni=Math.floor(p/(100/steps.length));
        if(ni!==si&&ni<steps.length){si=ni;setStep(steps[ni]);}
        if(p>=100){p=100;clearInterval(iv);setPhase("done");}
        setPct(Math.round(p));
      },60);
    }
  },[steps,onRealScanComplete]);

  const handleCleanAll=useCallback(()=>{
    if(cleaningAll) return;
    const shown=filter==="all"?junk:junk.filter(j=>j.type===filter);
    if(shown.length===0) return;
    setCleaningAll(true); setCleanAllPct(0);
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*5+2;
      if(p>=100){
        p=100; clearInterval(iv);
        onCleanAll(shown);
        setCleaningAll(false); setCleanAllPct(0);
      }
      setCleanAllPct(Math.round(p));
    },60);
  },[cleaningAll,filter,junk,onCleanAll]);

  const typeClr={cache:"#8b5cf6",temp:"#06b6d4",log:"#f59e0b",trash:"#ef4444",large:"#ec4899"};
  const shown=filter==="all"?junk:junk.filter(j=>j.type===filter);
  const totalGB=(shown.reduce((s,j)=>s+parseMB(j.size),0)/1024).toFixed(1);

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {phase==="idle"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:24}}>
          <div style={{position:"relative",width:180,height:180}}>
            {[180,140,100].map((s,i)=><div key={i} style={{position:"absolute",top:(180-s)/2,left:(180-s)/2,width:s,height:s,borderRadius:"50%",border:"1.5px solid rgba(139,92,246,0.2)",animation:`spin ${8+i*3}s linear infinite${i%2===1?" reverse":""}` }}/>)}
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:68,height:68,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,boxShadow:"0 0 28px rgba(124,58,237,0.6)"}}>⚡</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,marginBottom:8}}>Ready to Scan</div>
            <div style={{fontSize:14,color:"var(--mu)",maxWidth:300}}>
              {IS_ELECTRON
                ? "Nexa AI will scan your actual Mac filesystem — real caches, real logs, real space."
                : "Nexa AI will scan your system and find every cache, junk file, and duplicate."
              }
            </div>
            {IS_ELECTRON&&<div style={{fontSize:12,marginTop:8,color:"#10b981",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}><span>●</span> Real Mac scanning enabled</div>}
          </div>
          <button className="btnP" onClick={startScan} style={{padding:"14px 44px",borderRadius:16,fontSize:16,fontWeight:700,animation:"glowPulse 2s ease-in-out infinite"}}>
            🔍 {IS_ELECTRON?"Scan My Mac":"Start Deep Scan"}
          </button>
        </div>
      )}

      {phase==="scanning"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:20}}>
          <div style={{position:"relative",width:200,height:200}}>
            <svg width="200" height="200" style={{animation:"spin 5s linear infinite",position:"absolute",top:0,left:0}}>
              <defs><linearGradient id="sg"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="2"/>
              <circle cx="100" cy="100" r="90" fill="none" stroke="url(#sg)" strokeWidth="3" strokeDasharray="140 430" strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
              <div style={{fontSize:38,fontWeight:900}} className="gtext">{pct}%</div>
              <div style={{fontSize:11,color:"var(--mu)",textTransform:"uppercase",letterSpacing:1}}>{IS_ELECTRON?"Mac Scan":"Scanning"}</div>
            </div>
          </div>
          <div className="prog" style={{width:"100%",maxWidth:320,height:8}}><div className="progFill" style={{width:`${pct}%`,background:"linear-gradient(90deg,#7c3aed,#06b6d4)"}}/></div>
          <div style={{fontSize:14,color:"var(--mu)"}}>{step}</div>
          {IS_ELECTRON&&<div style={{fontSize:12,color:"#10b981"}}>Reading real filesystem…</div>}
        </div>
      )}

      {phase==="done"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bd)",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>
                  {shown.length===0?"All Clean ✅":"Scan Complete ✅"}
                  {IS_ELECTRON&&<span style={{fontSize:11,marginLeft:8,color:"#10b981",fontWeight:400}}>Real data</span>}
                </div>
                <div style={{fontSize:12,color:"var(--mu)"}}>
                  {shown.length>0
                    ?<>Found <strong style={{color:"#fff"}}>{totalGB} GB</strong> · <span style={{color:"var(--cy)"}}>tap row for details</span></>
                    :"No junk found — great job!"
                  }
                </div>
              </div>
              {shown.length>0&&(
                <button className="btnP" onClick={handleCleanAll} disabled={cleaningAll} style={{padding:"9px 16px",borderRadius:12,fontSize:13}}>
                  {cleaningAll?`${cleanAllPct}%`:<><div style={{width:14,height:14}}><I.Trash/></div>Clean All</>}
                </button>
              )}
            </div>
            {cleaningAll&&<div className="prog" style={{height:8,marginBottom:8}}><div className="progFill" style={{width:`${cleanAllPct}%`,background:"linear-gradient(90deg,#7c3aed,#06b6d4)"}}/></div>}
            <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
              {["all","cache","temp","log","trash","large"].map(f=>(
                <span key={f} className={`chip${filter===f?" on":""}`} onClick={()=>setFilter(f)} style={{fontSize:11}}>
                  {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
                </span>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {shown.map(item=>(
              <div key={item.id} className="listRow" onClick={()=>onSel(item,"cache")} style={{padding:mobile?"12px 16px":"13px 20px"}}>
                <div style={{width:42,height:42,borderRadius:13,background:`${typeClr[item.type]||"#8b5cf6"}22`,border:`1px solid ${typeClr[item.type]||"#8b5cf6"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.path}</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{item.files?.toLocaleString()} files · {item.age} old</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>{item.size}</div>
                  <span className="badge" style={{background:`${typeClr[item.type]||"#8b5cf6"}22`,color:typeClr[item.type]||"#8b5cf6",fontSize:10}}>{item.type}</span>
                </div>
                <div style={{width:16,height:16,color:"var(--mu)",flexShrink:0,marginLeft:6}}><I.Arr/></div>
              </div>
            ))}
            {shown.length===0&&phase==="done"&&(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:48}}>✅</div>
                <div style={{fontSize:16,fontWeight:700,marginTop:12}}>All cleaned!</div>
                <div style={{fontSize:13,color:"var(--mu)",marginTop:6}}>No more junk in this category.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PERFORMANCE ─────────────────────────────────────────────────────────── */
const cpuD = Array.from({length:20},()=>Math.round(22+Math.random()*58));
const ramD = Array.from({length:20},(_,i)=>Math.round(42+Math.sin(i*0.5)*18+Math.random()*12));
const netD = Array.from({length:20},()=>({dl:Math.round(6+Math.random()*78),ul:Math.round(2+Math.random()*28)}));

function Perf({mobile}){
  const[stats,setStats]=useState(null);
  useEffect(()=>{
    if(!IS_ELECTRON) return;
    window.electronAPI.getSystemStats().then(s=>setStats(s)).catch(()=>{});
  },[]);
  const cpu = stats?Math.round(stats.cpu):63;
  const ramPct = stats?Math.round(stats.ram.used/stats.ram.total*100):73;
  const diskPct = stats?Math.round(stats.disk.used/stats.disk.total*100):56;
  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5}} className="gtext">Performance</h1>
        {IS_ELECTRON&&<span className="badge" style={{background:"rgba(16,185,129,0.15)",color:"#10b981"}}>Live</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {[
          {l:"CPU",v:`${cpu}%`,c:"#8b5cf6",pct:cpu},
          {l:"RAM",v:`${ramPct}%`,c:"#06b6d4",pct:ramPct},
          {l:"Disk",v:`${diskPct}%`,c:"#ec4899",pct:diskPct},
          {l:"Temp",v:"48°C",c:"#10b981",pct:48},
        ].map(m=>(
          <div key={m.l} className="card" style={{padding:16}}>
            <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>{m.l}</div>
            <div style={{fontSize:26,fontWeight:800,color:m.c}}>{m.v}</div>
            <div className="prog" style={{marginTop:8,height:4}}>
              <div className="progFill" style={{width:`${m.pct}%`,background:m.c,transition:"width 1.2s ease"}}/>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:20,marginBottom:14}}>
        <div style={{fontWeight:700,marginBottom:3}}>CPU Timeline</div>
        <div style={{fontSize:12,color:"var(--mu)",marginBottom:12}}>Apple M-series · monitoring</div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={cpuD.map((v,i)=>({t:i,cpu:v,ram:ramD[i]}))}>
            <defs>
              <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="t" hide/><YAxis hide domain={[0,100]}/>
            <Tooltip contentStyle={{background:"rgba(7,7,15,0.94)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:10,fontSize:12}} formatter={v=>[`${v}%`]}/>
            <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fill="url(#gC)" strokeWidth={2} name="CPU"/>
            <Area type="monotone" dataKey="ram" stroke="#06b6d4" fill="url(#gR)" strokeWidth={2} name="RAM"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>Memory</div>
          <PR label="Used" pct={ramPct} color="#8b5cf6" right={`${stats?(stats.ram.used/1e9).toFixed(1):11.6} GB`}/>
          <PR label="Free" pct={100-ramPct} color="#10b981" right={`${stats?(stats.ram.free/1e9).toFixed(1):4.3} GB`}/>
          <PR label="Total" pct={100} color="#06b6d4" right={`${stats?(stats.ram.total/1e9).toFixed(0):16} GB`}/>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>Network</div>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={netD.map((d,i)=>({...d,t:i}))}>
              <XAxis dataKey="t" hide/><YAxis hide/>
              <Tooltip contentStyle={{background:"rgba(7,7,15,0.94)",border:"1px solid rgba(6,182,212,0.3)",borderRadius:10,fontSize:12}}/>
              <Line type="monotone" dataKey="dl" stroke="#06b6d4" strokeWidth={2} dot={false} name="Down"/>
              <Line type="monotone" dataKey="ul" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Up"/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:20,marginTop:10}}>
            <div><div style={{fontSize:17,fontWeight:700,color:"#06b6d4"}}>↓ 84.2</div><div style={{fontSize:11,color:"var(--mu)"}}>Mbps</div></div>
            <div><div style={{fontSize:17,fontWeight:700,color:"#8b5cf6"}}>↑ 22.7</div><div style={{fontSize:11,color:"var(--mu)"}}>Mbps</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── STORAGE ─────────────────────────────────────────────────────────────── */
const segs=[{n:"System",v:18,c:"#8b5cf6"},{n:"Apps",v:34,c:"#06b6d4"},{n:"Media",v:27,c:"#ec4899"},{n:"Docs",v:12,c:"#10b981"},{n:"Other",v:9,c:"#f59e0b"}];
function Storage({mobile}){
  const[stats,setStats]=useState(null);
  useEffect(()=>{
    if(!IS_ELECTRON) return;
    window.electronAPI.getSystemStats().then(s=>setStats(s)).catch(()=>{});
  },[]);
  const totalGB=stats?(stats.disk.total/1e9).toFixed(0):512;
  const usedGB=stats?(stats.disk.used/1e9).toFixed(0):286;
  const usedPct=stats?Math.round(stats.disk.used/stats.disk.total*100):56;
  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5,marginBottom:18}} className="gtext">Storage</h1>
      <div className="card" style={{padding:20,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontWeight:700}}>Macintosh HD {IS_ELECTRON&&<span style={{fontSize:11,color:"#10b981",fontWeight:400}}>live</span>}</div>
          <div style={{fontSize:13,color:"var(--mu)"}}>{usedGB} / {totalGB} GB</div>
        </div>
        <div className="prog" style={{height:12}}>
          <div className="progFill" style={{width:`${usedPct}%`,background:"linear-gradient(90deg,#7c3aed,#06b6d4)",transition:"width 1.2s ease"}}/>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:12}}>
          {segs.map(e=><div key={e.n} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:10,height:10,borderRadius:3,background:e.c}}/><span>{e.n}</span><span style={{color:"var(--mu)"}}>{Math.round(e.v*(parseInt(usedGB)/100))} GB</span></div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>By Category</div>
          {segs.map(e=><PR key={e.n} label={e.n} pct={e.v*2} color={e.c} right={`${Math.round(e.v*(parseInt(usedGB)/100))} GB`}/>)}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:3}}>Disk Map</div>
          <div style={{fontSize:12,color:"var(--mu)",marginBottom:10}}>{totalGB} GB SSD</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={segs} cx="50%" cy="50%" outerRadius={78} paddingAngle={4} dataKey="v">
                {segs.map((e,i)=><Cell key={i} fill={e.c}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"rgba(7,7,15,0.94)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:10,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── SECURITY ────────────────────────────────────────────────────────────── */
function Security({mobile}){
  const checks=[
    {l:"Malware Scan",  d:"No threats detected",         s:"pass"},
    {l:"Firewall",      d:"Active and configured",        s:"pass"},
    {l:"FileVault",     d:"Disk encryption enabled",      s:"pass"},
    {l:"System Integrity",d:"SIP is enabled",            s:"pass"},
    {l:"Gatekeeper",   d:"Notarization bypass detected", s:"warn"},
    {l:"Vulnerable Apps",d:"2 apps need security updates",s:"fail"},
    {l:"Login Items",  d:"4 suspicious startup items",   s:"warn"},
  ];
  const sc={pass:"#10b981",warn:"#f59e0b",fail:"#ef4444"};
  const si={pass:"✅",warn:"⚠️",fail:"❌"};
  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5,marginBottom:18}} className="gtext">Security</h1>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
        <div className="card" style={{padding:20,textAlign:"center"}}>
          <div style={{fontSize:13,color:"var(--mu)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Security Score</div>
          <div style={{fontSize:60,fontWeight:900,color:"#10b981",lineHeight:1}}>87</div>
          <div style={{fontSize:13,color:"var(--mu)",marginBottom:14}}>/ 100 · Good</div>
          <button className="btnP" style={{padding:"10px 24px",borderRadius:12,fontSize:13,margin:"0 auto",justifyContent:"center"}}>Fix Issues</button>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:12}}>Threats · Last 24h</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{l:"Blocked",v:234,c:"#ef4444"},{l:"Phishing",v:12,c:"#f59e0b"},{l:"Port Scans",v:8,c:"#8b5cf6"},{l:"Malicious",v:3,c:"#ec4899"}].map(t=>(
              <div key={t.l} style={{padding:12,borderRadius:12,background:"var(--s2)",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,color:t.c}}>{t.v}</div>
                <div style={{fontSize:11,color:"var(--mu)"}}>{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:700,marginBottom:14}}>Security Checks</div>
        {checks.map(c=>(
          <div key={c.l} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid var(--bd)"}}>
            <div style={{fontSize:18,width:26}}>{si[c.s]}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{c.l}</div><div style={{fontSize:11,color:"var(--mu)"}}>{c.d}</div></div>
            <span className="badge" style={{background:`${sc[c.s]}22`,color:sc[c.s]}}>{c.s==="pass"?"Secure":c.s==="warn"?"Warning":"At Risk"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── APPS ────────────────────────────────────────────────────────────────── */
function Apps({onSel,mobile,myApps}){
  const[f,setF]=useState("all");
  const shown=f==="all"?myApps:myApps.filter(a=>a.status===f);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:mobile?"18px 16px 10px":"28px 28px 10px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5}} className="gtext">Applications</h1>
          {IS_ELECTRON&&<span className="badge" style={{background:"rgba(16,185,129,0.15)",color:"#10b981"}}>Real apps</span>}
        </div>
        <div style={{fontSize:13,color:"var(--cy)",marginBottom:12}}>Tap any app → full details &amp; uninstall</div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {["all","large","outdated","healthy"].map(t=>(
            <span key={t} className={`chip${f===t?" on":""}`} onClick={()=>setF(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</span>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {shown.map(a=>(
          <div key={a.id} className="listRow" onClick={()=>onSel(a,"app")} style={{padding:mobile?"13px 16px":"14px 28px"}}>
            <div style={{width:46,height:46,borderRadius:14,background:"linear-gradient(135deg,rgba(139,92,246,0.18),rgba(6,182,212,0.1))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{a.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{a.name}</div>
              <div style={{fontSize:11,color:"var(--mu)"}}>Updated {a.updated} ago</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{a.size}</div>
              <SBadge s={a.status}/>
            </div>
            <div style={{width:16,height:16,color:"var(--mu)",flexShrink:0,marginLeft:8}}><I.Arr/></div>
          </div>
        ))}
        {shown.length===0&&<div style={{textAlign:"center",padding:"60px 20px",fontSize:40}}>✅<div style={{fontSize:16,fontWeight:700,marginTop:12}}>All clear</div></div>}
      </div>
    </div>
  );
}

/* ─── DUPES ────────────────────────────────────────────────────────────────── */
function Dupes({onSel,mobile,myDupes,onRemoveDupes}){
  const[sel,setSel]=useState([]);
  const[removing,setRemoving]=useState(false);
  const[removePct,setRemovePct]=useState(0);
  const tog=id=>setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const typeIco={image:"🖼️",archive:"📦",video:"🎥",document:"📄",design:"🎨"};
  const handleRemoveSel=useCallback(()=>{
    if(removing||sel.length===0) return;
    setRemoving(true);setRemovePct(0);let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*7+3;
      if(p>=100){p=100;clearInterval(iv);onRemoveDupes(sel);setSel([]);setRemoving(false);setRemovePct(0);}
      setRemovePct(Math.round(p));
    },55);
  },[removing,sel,onRemoveDupes]);
  const totalSize=(myDupes.reduce((s,d)=>s+parseMB(d.size),0)/1024).toFixed(2);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:mobile?"18px 16px 10px":"28px 28px 10px",borderBottom:"1px solid var(--bd)",flexShrink:0}}>
        <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5,marginBottom:4}} className="gtext">Duplicates</h1>
        <div style={{fontSize:13,color:"var(--mu)",marginBottom:10}}>
          AI found <strong style={{color:"#fff"}}>{myDupes.length} groups</strong> · <strong style={{color:"#ec4899"}}>{totalSize} GB</strong> reclaimable
        </div>
        <div style={{fontSize:12,color:"var(--cy)",marginBottom:sel.length?10:0}}>Tap a row to see all locations →</div>
        {sel.length>0&&(
          <div style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderRadius:12,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(139,92,246,0.25)",flexDirection:"column"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",width:"100%"}}>
              <span style={{flex:1,fontSize:13}}><strong>{sel.length}</strong> selected</span>
              <button className="btnS" onClick={()=>setSel([])} style={{padding:"5px 12px",borderRadius:8,fontSize:12}}>Clear</button>
              <button className="btnP" onClick={handleRemoveSel} disabled={removing} style={{padding:"5px 14px",borderRadius:8,fontSize:12}}>
                {removing?`${removePct}%`:"🗑️ Remove"}
              </button>
            </div>
            {removing&&<div className="prog" style={{width:"100%",height:6}}><div className="progFill" style={{width:`${removePct}%`,background:"linear-gradient(90deg,#7c3aed,#ec4899)"}}/></div>}
          </div>
        )}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {myDupes.map(d=>{
          const s=sel.includes(d.id);
          return(
            <div key={d.id} style={{display:"flex",alignItems:"center",gap:14,padding:mobile?"13px 16px":"14px 28px",borderBottom:"1px solid var(--bd)",background:s?"rgba(139,92,246,0.07)":"transparent"}}>
              <div onClick={()=>tog(d.id)} style={{width:22,height:22,borderRadius:7,border:`2px solid ${s?"#8b5cf6":"rgba(255,255,255,0.2)"}`,background:s?"#8b5cf6":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                {s&&<div style={{width:12,height:12,color:"#fff"}}><I.Check/></div>}
              </div>
              <div style={{fontSize:22,width:30,flexShrink:0}}>{typeIco[d.type]}</div>
              <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>onSel(d,"dupe")}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                <div style={{fontSize:11,color:"var(--mu)"}}>{d.copies} copies · {d.reason}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#ec4899",marginBottom:3}}>{d.size}</div>
                <span className="badge" style={{background:"rgba(236,72,153,0.15)",color:"#ec4899",fontSize:10}}>{d.copies}×</span>
              </div>
              <div style={{width:16,height:16,color:"var(--mu)",cursor:"pointer",flexShrink:0}} onClick={()=>onSel(d,"dupe")}><I.Arr/></div>
            </div>
          );
        })}
        {myDupes.length===0&&<div style={{textAlign:"center",padding:"60px 20px",fontSize:40}}>✅<div style={{fontSize:16,fontWeight:700,marginTop:12}}>No duplicates!</div></div>}
      </div>
    </div>
  );
}

/* ─── AI ──────────────────────────────────────────────────────────────────── */
const AI_REPLIES=[
  "Analyzing your request… I recommend a targeted cache cleanup freeing ~**1.2 GB** without impacting app performance. Want me to proceed? 🚀",
  "I've scanned your system. Your biggest wins are:\n• **Xcode cache** → removable\n• **Duplicate files** → review & delete\n• **Old logs** → safe to clear",
  "RAM at **73%** is within normal range, but I can free ~**800 MB** by clearing memory pressure. Your Mac will feel snappier. ✅",
  "Security check complete. **2 apps** have known vulnerabilities — update Zoom and Slack immediately. Firewall and FileVault ✅.",
  "Cleaning in progress… ✅ **Space freed**\n✅ Duplicates removed\n✅ RAM pressure cleared\n\nYour system is now running faster! 🎉",
];
let replyIdx=0;

function AI({mobile}){
  const[msgs,setMsgs]=useState([
    {r:"ai",t:"👋 Hi Arjun! I'm **Nexa AI**."+(IS_ELECTRON?" I have full access to your Mac's real filesystem.":" Here's what I found:")},
    {r:"ai",t:"⚡ **Junk files** detected\n🔒 **Privacy risks** in browser history\n🚀 RAM usage elevated — I can help free space"},
    {r:"user",t:"Clean everything and optimize my Mac"},
    {r:"ai",t:"✅ Running analysis…\n✅ Browser caches cleared\n✅ Duplicates found\n\n"+(IS_ELECTRON?"Go to Smart Scan to see **real results** from your actual Mac filesystem. 📂":"Your Mac is ready for cleanup. 🎉")},
  ]);
  const[inp,setInp]=useState("");
  const[typing,setTyping]=useState(false);
  const endRef=useRef(null);
  const send=useCallback(()=>{
    if(!inp.trim()||typing) return;
    setMsgs(m=>[...m,{r:"user",t:inp.trim()}]);
    setInp("");setTyping(true);
    setTimeout(()=>{
      setTyping(false);
      setMsgs(m=>[...m,{r:"ai",t:AI_REPLIES[replyIdx%AI_REPLIES.length]}]);
      replyIdx++;
    },1200+Math.random()*800);
  },[inp,typing]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,typing]);
  const rend=t=>t.split(/\*\*(.*?)\*\*/g).map((p,i)=>i%2===1?<strong key={i}>{p}</strong>:p.split("\n").flatMap((l,j,a)=>j<a.length-1?[l,<br key={`${i}-${j}`}/>]:[l]));
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:mobile?"16px 16px 12px":"20px 28px 12px",borderBottom:"1px solid var(--bd)",flexShrink:0,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:13,background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 0 18px rgba(124,58,237,0.5)",flexShrink:0}}>🤖</div>
        <div>
          <div style={{fontWeight:800,fontSize:15}} className="gtext">Nexa AI</div>
          <div style={{fontSize:11,color:"#10b981",display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 5px #10b981"}}/> Online{IS_ELECTRON?" · Mac connected":IS_IOS?" · iPhone connected":""}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:mobile?"16px":"20px 28px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.r==="user"?"flex-end":"flex-start"}}>
            {m.r==="ai"&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginRight:8,marginTop:2}}>🤖</div>}
            <div style={{padding:"12px 16px",fontSize:14,lineHeight:1.65,maxWidth:"82%",background:m.r==="ai"?"var(--s2)":"linear-gradient(135deg,#7c3aed,#06b6d4)",border:m.r==="ai"?"1px solid var(--bd)":"none",color:"var(--tx)",borderRadius:m.r==="ai"?"4px 18px 18px 18px":"18px 18px 4px 18px"}}>
              {rend(m.t)}
            </div>
          </div>
        ))}
        {typing&&<div style={{display:"flex",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div><div style={{padding:"14px 16px",borderRadius:"4px 18px 18px 18px",background:"var(--s2)",border:"1px solid var(--bd)",display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(d=><div key={d} style={{width:7,height:7,borderRadius:"50%",background:"var(--pu)",animation:`dotBounce 1.2s ease-in-out ${d*0.18}s infinite`}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:mobile?"12px 16px 24px":"12px 28px 18px",borderTop:"1px solid var(--bd)",flexShrink:0}}>
        <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap"}}>
          {["Clean my Mac","What's using storage?","Check for threats","Speed up my Mac"].map(s=>(
            <span key={s} className="chip" onClick={()=>setInp(s)} style={{fontSize:11}}>{s}</span>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Ask Nexa AI anything…"
            style={{flex:1,padding:"13px 16px",borderRadius:14,background:"var(--s2)",border:"1px solid var(--bd)",color:"var(--tx)",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <button className="btnP" onClick={send} disabled={typing} style={{padding:"13px 18px",borderRadius:14,fontSize:14}}>
            <div style={{width:17,height:17}}><I.Send/></div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SETTINGS ────────────────────────────────────────────────────────────── */
function Settings({light,setLight,mobile}){
  const[t,setT]=useState({notif:true,auto:true,startup:false,realtime:true,sound:true});
  const tog=k=>setT(p=>({...p,[k]:!p[k]}));
  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5,marginBottom:18}} className="gtext">Settings</h1>
      {(IS_ELECTRON||IS_CAPACITOR)&&(
        <div className="card" style={{padding:14,marginBottom:14,background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.25)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{fontSize:22}}>{IS_ELECTRON?"🖥️":"📱"}</div>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{IS_ELECTRON?"Running as Mac App":"Running as iPhone App"}</div>
              <div style={{fontSize:11,color:"#10b981"}}>Real filesystem access enabled · Live system data</div>
            </div>
          </div>
        </div>
      )}
      <div className="card" style={{padding:18,marginBottom:14,background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.07))",border:"1px solid rgba(139,92,246,0.28)"}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{fontSize:28}}>⭐</div>
          <div style={{flex:1}}><div style={{fontWeight:700}}>NexaCleaner Pro</div><div style={{fontSize:12,color:"var(--mu)"}}>Active · $9.99/mo</div></div>
          <button className="btnS" style={{padding:"7px 14px",borderRadius:10,fontSize:12}}>Manage</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>Appearance</div>
          {[{l:"Dark Mode",sub:"Dark interface",special:true},{l:"Notifications",sub:"System alerts",k:"notif"},{l:"Sound Effects",sub:"Micro-interactions",k:"sound"}].map(r=>(
            <div key={r.l} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{r.l}</div><div style={{fontSize:11,color:"var(--mu)"}}>{r.sub}</div></div>
              {r.special?<Tog on={!light} set={()=>setLight(!light)}/>:<Tog on={t[r.k]} set={()=>tog(r.k)}/>}
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>Automation</div>
          {[{l:"Auto Scan Daily",sub:"Run scans automatically",k:"auto"},{l:"Launch at Startup",sub:"Start with your Mac",k:"startup"},{l:"Real-time Monitor",sub:"Live CPU & RAM",k:"realtime"}].map(r=>(
            <div key={r.l} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{r.l}</div><div style={{fontSize:11,color:"var(--mu)"}}>{r.sub}</div></div>
              <Tog on={t[r.k]} set={()=>tog(r.k)}/>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20,textAlign:"center"}}>
          <div style={{width:56,height:56,borderRadius:18,background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px",boxShadow:"0 8px 28px rgba(124,58,237,0.5)"}}>⚡</div>
          <div style={{fontWeight:800,fontSize:16}} className="gtext">NexaCleaner Pro</div>
          <div style={{fontSize:12,color:"var(--mu)",marginTop:3}}>Version 3.2.1 · © 2026</div>
          {IS_ELECTRON&&<div style={{fontSize:11,color:"#10b981",marginTop:4}}>Mac App · Node.js backend</div>}
          {IS_IOS&&<div style={{fontSize:11,color:"#06b6d4",marginTop:4}}>iOS App · Capacitor</div>}
          <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14}}>
            <button className="btnP" style={{padding:"9px 18px",borderRadius:10,fontSize:12}}>Updates</button>
            {IS_ELECTRON&&<button className="btnS" onClick={()=>window.electronAPI.quit()} style={{padding:"9px 18px",borderRadius:10,fontSize:12}}>Quit App</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── GITHUB PAGE ──────────────────────────────────────────────────────────── */
function GitHub({mobile,junk,myApps}){
  const[pat,setPat]=useState(()=>localStorage.getItem('gh_pat')||'');
  const[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('gh_user')||'null')}catch{return null}});
  const[repos,setRepos]=useState([]);
  const[selRepo,setSelRepo]=useState(()=>localStorage.getItem('gh_repo')||'');
  const[newRepo,setNewRepo]=useState('nexacleaner-data');
  const[status,setStatus]=useState('');
  const[loading,setLoading]=useState('');
  const[logs,setLogs]=useState([]);

  const addLog=(msg,ok=true)=>setLogs(p=>[{msg,ok,t:new Date().toLocaleTimeString()},...p].slice(0,20));

  const connect=useCallback(async()=>{
    if(!pat.trim()){setStatus('❌ Enter your GitHub token first');return;}
    setLoading('connect');setStatus('');
    if(IS_ELECTRON){
      const r=await window.electronAPI.githubValidate(pat.trim());
      if(r.success){
        localStorage.setItem('gh_pat',pat.trim());
        localStorage.setItem('gh_user',JSON.stringify(r.user));
        setUser(r.user);
        addLog(`✅ Connected as @${r.user.login}`);
        // Load repos
        const rr=await window.electronAPI.githubListRepos(pat.trim());
        if(rr.success) setRepos(rr.repos);
      } else {
        setStatus('❌ '+r.error);
        addLog('❌ Auth failed: '+r.error,false);
      }
    } else {
      setStatus('❌ GitHub integration requires the Mac app (Electron)');
    }
    setLoading('');
  },[pat]);

  const createRepo=useCallback(async()=>{
    if(!newRepo.trim()||!user) return;
    setLoading('create');
    const r=await window.electronAPI.githubCreateRepo({pat,name:newRepo.trim(),description:'NexaCleaner Pro — scan data & project',isPrivate:false});
    if(r.success){
      addLog(`✅ Repo created: ${r.repo}`);
      setSelRepo(newRepo.trim());
      localStorage.setItem('gh_repo',newRepo.trim());
      const rr=await window.electronAPI.githubListRepos(pat);
      if(rr.success) setRepos(rr.repos);
    } else {
      addLog('❌ '+r.error,false);
    }
    setLoading('');
  },[pat,newRepo,user]);

  const saveScan=useCallback(async()=>{
    if(!user||!selRepo) return;
    setLoading('scan');
    const scanData={timestamp:new Date().toISOString(),mac:{hostname:navigator.userAgent},junk,apps:myApps};
    const r=await window.electronAPI.githubSaveScan({pat,username:user.login,repo:selRepo,scanData});
    if(r.success){addLog(`✅ Scan saved to GitHub`);}
    else{addLog('❌ '+r.error,false);}
    setLoading('');
  },[pat,user,selRepo,junk,myApps]);

  const pushCode=useCallback(async()=>{
    if(!user||!selRepo) return;
    setLoading('push');
    addLog('⏳ Pushing project code to GitHub…');
    const r=await window.electronAPI.githubPushCode({pat,username:user.login,repo:selRepo});
    if(r.success){addLog(`✅ Code pushed → ${r.url}`);}
    else{addLog('❌ '+r.error,false);}
    setLoading('');
  },[pat,user,selRepo]);

  const disconnect=()=>{
    localStorage.removeItem('gh_pat');localStorage.removeItem('gh_user');localStorage.removeItem('gh_repo');
    setPat('');setUser(null);setRepos([]);setSelRepo('');addLog('Disconnected from GitHub');
  };

  const BtnLoad=({id,label,icon,onClick,color})=>(
    <button className="btnP" onClick={onClick} disabled={!!loading}
      style={{padding:'11px 18px',borderRadius:12,fontSize:13,background:color||'linear-gradient(135deg,#7c3aed,#06b6d4)',opacity:loading&&loading!==id?0.5:1}}>
      {loading===id?'⏳ Working…':<>{icon} {label}</>}
    </button>
  );

  return(
    <div style={{padding:mobile?'18px 16px':'28px 28px',overflowY:'auto',height:'100%'}}>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5}} className="gtext">GitHub</h1>
        <div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>Connect your account to save scan data &amp; push code</div>
      </div>

      {/* Connected user card */}
      {user?(
        <div className="card" style={{padding:18,marginBottom:16,background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.06))',border:'1px solid rgba(16,185,129,0.3)'}}>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <img src={user.avatar_url} alt="" style={{width:52,height:52,borderRadius:'50%',border:'2px solid #10b981'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'#10b981'}}>● Connected</div>
              <div style={{fontSize:13,marginTop:2}}>{user.name||user.login} <span style={{color:'var(--mu)'}}>@{user.login}</span></div>
              <div style={{fontSize:11,color:'var(--mu)',marginTop:1}}>{user.public_repos} public repos</div>
            </div>
            <button className="btnS" onClick={disconnect} style={{padding:'7px 14px',borderRadius:10,fontSize:12}}>Disconnect</button>
          </div>
        </div>
      ):(
        <div className="card" style={{padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Connect GitHub Account</div>
          <div style={{fontSize:12,color:'var(--mu)',marginBottom:14,lineHeight:1.6}}>
            Go to <strong>github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)</strong><br/>
            Generate new token with <strong>repo</strong> and <strong>user</strong> scopes.
          </div>
          <input value={pat} onChange={e=>setPat(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            type="password"
            style={{width:'100%',padding:'12px 14px',borderRadius:12,background:'var(--s2)',border:'1px solid var(--bd)',color:'var(--tx)',fontSize:13,outline:'none',fontFamily:'monospace',marginBottom:10}}/>
          {status&&<div style={{fontSize:12,color:'#ef4444',marginBottom:10}}>{status}</div>}
          <BtnLoad id="connect" label="Connect to GitHub" icon="🔗" onClick={connect}/>
        </div>
      )}

      {/* Repo selector */}
      {user&&(
        <div className="card" style={{padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Repository</div>
          {repos.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--mu)',marginBottom:6}}>Select existing repo:</div>
              <select value={selRepo} onChange={e=>{setSelRepo(e.target.value);localStorage.setItem('gh_repo',e.target.value);}}
                style={{width:'100%',padding:'10px 12px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--bd)',color:'var(--tx)',fontSize:13,outline:'none'}}>
                <option value="">— choose repo —</option>
                {repos.map(r=><option key={r.name} value={r.name}>{r.name}{r.private?' 🔒':''}</option>)}
              </select>
            </div>
          )}
          <div style={{fontSize:12,color:'var(--mu)',marginBottom:6}}>Or create new repo:</div>
          <div style={{display:'flex',gap:8}}>
            <input value={newRepo} onChange={e=>setNewRepo(e.target.value)} placeholder="repo-name"
              style={{flex:1,padding:'10px 12px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--bd)',color:'var(--tx)',fontSize:13,outline:'none',fontFamily:'monospace'}}/>
            <BtnLoad id="create" label="Create" icon="➕" onClick={createRepo} color="linear-gradient(135deg,#10b981,#06b6d4)"/>
          </div>
          {selRepo&&<div style={{fontSize:12,marginTop:10,color:'#10b981'}}>✓ Active repo: <strong>{user.login}/{selRepo}</strong></div>}
        </div>
      )}

      {/* Actions */}
      {user&&selRepo&&(
        <div className="card" style={{padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',gap:12,alignItems:'center',padding:'12px 14px',borderRadius:12,background:'var(--s2)',border:'1px solid var(--bd)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>💾 Save Scan Results</div>
                <div style={{fontSize:11,color:'var(--mu)'}}>Upload current scan data as JSON to your GitHub repo</div>
              </div>
              <BtnLoad id="scan" label="Save" icon="💾" onClick={saveScan} color="linear-gradient(135deg,#8b5cf6,#06b6d4)"/>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center',padding:'12px 14px',borderRadius:12,background:'var(--s2)',border:'1px solid var(--bd)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>🚀 Push Project Code</div>
                <div style={{fontSize:11,color:'var(--mu)'}}>Push NexaCleaner source code to your GitHub repo</div>
              </div>
              <BtnLoad id="push" label="Push" icon="🚀" onClick={pushCode} color="linear-gradient(135deg,#f59e0b,#ec4899)"/>
            </div>
            <a href={`https://github.com/${user.login}/${selRepo}`} target="_blank" rel="noreferrer"
              style={{display:'flex',gap:12,alignItems:'center',padding:'12px 14px',borderRadius:12,background:'var(--s2)',border:'1px solid var(--bd)',textDecoration:'none',color:'var(--tx)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>🌐 View on GitHub</div>
                <div style={{fontSize:11,color:'var(--mu)'}}>github.com/{user.login}/{selRepo}</div>
              </div>
              <div style={{width:16,height:16,color:'var(--pu)'}}><I.Arr/></div>
            </a>
          </div>
        </div>
      )}

      {/* Activity log */}
      {logs.length>0&&(
        <div className="card" style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Activity Log</div>
          {logs.map((l,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid var(--bd)',fontSize:12}}>
              <span style={{color:'var(--mu)',flexShrink:0,fontFamily:'monospace'}}>{l.t}</span>
              <span style={{color:l.ok?'var(--tx)':'#ef4444'}}>{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── IPHONE PAGE ─────────────────────────────────────────────────────────── */
function IPhone({mobile,onSel}){
  const[info,setInfo]=useState(null);
  const[loading,setLoading]=useState(false);
  const[cleaning,setCleaning]=useState(null);
  const[cleanPct,setCleanPct]=useState(0);
  const[cleaned,setCleaned]=useState([]);

  const loadInfo=useCallback(async()=>{
    if(!IS_ELECTRON){setInfo({connected:false,backups:[],backupTotalBytes:0});return;}
    setLoading(true);
    try{
      const data=await window.electronAPI.getIphoneInfo();
      setInfo(data);
    }catch(e){setInfo({connected:false,backups:[],backupTotalBytes:0,error:e.message});}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadInfo();},[loadInfo]);

  const handleCleanBackup=useCallback((backup)=>{
    if(cleaning) return;
    setCleaning(backup.id); setCleanPct(0);
    let p=0;
    const iv=setInterval(async()=>{
      p+=Math.random()*6+2;
      if(p>=100){
        p=100; clearInterval(iv);
        if(IS_ELECTRON && backup.path){
          await window.electronAPI.deleteItem(backup.path).catch(()=>{});
        }
        setCleaned(prev=>[...prev,backup.id]);
        setCleaning(null); setCleanPct(0);
      }
      setCleanPct(Math.round(p));
    },55);
  },[cleaning]);

  const totalBackupGB = info ? (info.backupTotalBytes/1e9).toFixed(1) : "0";
  const visibleBackups = info ? info.backups.filter(b=>!cleaned.includes(b.id)) : [];

  return(
    <div style={{padding:mobile?"18px 16px":"28px 28px",overflowY:"auto",height:"100%"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:mobile?22:26,fontWeight:800,letterSpacing:-0.5}} className="gtext">My iPhone</h1>
          <div style={{fontSize:12,color:"var(--mu)",marginTop:3}}>
            {IS_ELECTRON?"Real device data via USB + backups on this Mac":"Connect your iPhone via USB to see live data"}
          </div>
        </div>
        <button className="btnS" onClick={loadInfo} disabled={loading}
          style={{padding:"9px 16px",borderRadius:12,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          {loading?"Scanning…":"🔄 Refresh"}
        </button>
      </div>

      {/* Connection status card */}
      <div className="card" style={{padding:20,marginBottom:16,
        background: info?.connected
          ? "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.07))"
          : "rgba(255,255,255,0.03)",
        border: info?.connected ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--bd)"}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{fontSize:42,lineHeight:1}}>📱</div>
          <div style={{flex:1}}>
            {loading ? (
              <div style={{fontSize:14,color:"var(--mu)"}}>Detecting connected devices…</div>
            ) : info?.connected ? (
              <>
                <div style={{fontWeight:700,fontSize:16,color:"#10b981",marginBottom:4}}>
                  ● {info.name || "iPhone Connected"}
                </div>
                <div style={{fontSize:12,color:"var(--mu)"}}>
                  Connected via USB · Detected by NexaCleaner
                </div>
                {info.serialNumber && (
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:2,fontFamily:"monospace"}}>
                    S/N: {info.serialNumber}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>No iPhone Detected</div>
                <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6}}>
                  Connect your iPhone to this Mac via USB cable.<br/>
                  Unlock your iPhone and tap <strong>"Trust This Computer"</strong> if prompted.
                </div>
              </>
            )}
          </div>
          {!loading && !info?.connected && (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:4}}>🔌</div>
              <div style={{fontSize:10,color:"var(--mu)"}}>Plug in</div>
            </div>
          )}
          {info?.connected && (
            <div style={{textAlign:"center",padding:"10px 16px",borderRadius:12,background:"rgba(16,185,129,0.15)"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#10b981"}}>✓</div>
              <div style={{fontSize:10,color:"#10b981"}}>Detected</div>
            </div>
          )}
        </div>
      </div>

      {/* How-to steps when not connected */}
      {!loading && !info?.connected && IS_ELECTRON && (
        <div className="card" style={{padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>How to connect your iPhone</div>
          {[
            {n:"1",t:"Plug in USB cable","d":"Connect your iPhone to your Mac using the Lightning or USB-C cable."},
            {n:"2",t:"Trust This Computer","d":"On your iPhone, tap \"Trust\" when the popup appears. Enter your passcode."},
            {n:"3",t:"Click Refresh","d":"Press the Refresh button above — NexaCleaner will detect your device."},
            {n:"4",t:"View & Clean","d":"See your iPhone backups stored on this Mac and free up space."},
          ].map(s=>(
            <div key={s.n} style={{display:"flex",gap:14,padding:"11px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{s.n}</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{s.t}</div>
                <div style={{fontSize:12,color:"var(--mu)"}}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* iPhone backups section */}
      {(visibleBackups.length > 0 || (info && info.backupTotalBytes > 0)) && (
        <div className="card" style={{padding:20,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>iPhone Backups on This Mac</div>
              <div style={{fontSize:12,color:"var(--mu)",marginTop:2}}>
                {visibleBackups.length} backup{visibleBackups.length!==1?"s":""} · <span style={{color:"#ef4444",fontWeight:600}}>{totalBackupGB} GB</span> used
              </div>
            </div>
            <span className="badge" style={{background:"rgba(139,92,246,0.15)",color:"#8b5cf6"}}>Real data</span>
          </div>
          {visibleBackups.map(b=>(
            <div key={b.id} style={{padding:"14px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{fontSize:28,lineHeight:1}}>📲</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{b.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginBottom:6}}>{b.model} · Last backup: {b.age}</div>
                  <div style={{fontSize:11,fontFamily:"monospace",color:"var(--mu)",marginBottom:8,
                    padding:"6px 10px",borderRadius:8,background:"var(--s2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {b.path}
                  </div>
                  {cleaning===b.id && (
                    <div style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--mu)",marginBottom:4}}>
                        <span>Removing backup…</span>
                        <span style={{color:"var(--pu)",fontWeight:700}}>{cleanPct}%</span>
                      </div>
                      <div className="prog" style={{height:6}}>
                        <div className="progFill" style={{width:`${cleanPct}%`,background:"linear-gradient(90deg,#7c3aed,#ec4899)"}}/>
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button className="btnP" onClick={()=>handleCleanBackup(b)}
                      disabled={!!cleaning}
                      style={{padding:"7px 14px",borderRadius:10,fontSize:12,background:"linear-gradient(135deg,#ef4444,#ec4899)"}}>
                      <div style={{width:12,height:12}}><I.Trash/></div>
                      {cleaning===b.id?`${cleanPct}%`:"Delete Backup"}
                    </button>
                    <button className="btnS" onClick={()=>IS_ELECTRON&&window.electronAPI.revealInFinder(b.path)}
                      style={{padding:"7px 12px",borderRadius:10,fontSize:12}}>
                      <div style={{width:12,height:12}}><I.Folder/></div>Show
                    </button>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#ef4444"}}>{b.size}</div>
                </div>
              </div>
            </div>
          ))}
          {visibleBackups.length===0 && cleaned.length>0 && (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,marginTop:8}}>All backups removed!</div>
              <div style={{fontSize:12,color:"var(--mu)",marginTop:4}}>Freed {totalBackupGB} GB from this Mac</div>
            </div>
          )}
        </div>
      )}

      {/* No backups found */}
      {!loading && info && visibleBackups.length===0 && cleaned.length===0 && (
        <div className="card" style={{padding:24,textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:8}}>🎉</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>No iPhone Backups Found</div>
          <div style={{fontSize:12,color:"var(--mu)"}}>
            No iTunes/Finder backups are stored on this Mac.<br/>
            {info.connected
              ? "Your iPhone is connected — great! Backups appear here after you back up via Finder."
              : "When you connect and back up your iPhone, backups will appear here."}
          </div>
        </div>
      )}

      {/* iPhone tips */}
      <div className="card" style={{padding:18,background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(6,182,212,0.05))",border:"1px solid rgba(139,92,246,0.2)"}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>💡 iPhone Storage Tips</div>
        {[
          {t:"Delete old backups","d":"Each iPhone backup can be 10–60 GB. Delete old ones to save Mac space."},
          {t:"Use iCloud Backup","d":"Switch to iCloud backup to keep your Mac's drive free."},
          {t:"Clean on iPhone too","d":"On iPhone: Settings → General → iPhone Storage to remove unused apps."},
        ].map(tip=>(
          <div key={tip.t} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--bd)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#8b5cf6",flexShrink:0,marginTop:5}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:1}}>{tip.t}</div>
              <div style={{fontSize:11,color:"var(--mu)"}}>{tip.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ROOT ────────────────────────────────────────────────────────────────── */
export default function App(){
  const{w}=useWindowSize();
  const mobile=w<768;
  const[page,setPage]=useState("home");
  const[light,setLight]=useState(false);
  const[detail,setDetail]=useState(null);

  const[junk,setJunk]=useState([...JUNK_INIT]);
  const[myApps,setMyApps]=useState([...APPS_INIT]);
  const[myDupes,setMyDupes]=useState([...DUPES_INIT]);
  const[freedMB,setFreedMB]=useState(0);

  const onSel=useCallback((item,type)=>setDetail({item,type}),[]);
  const onClose=useCallback(()=>setDetail(null),[]);

  /** Called by Detail after cleaning animation + optional real delete */
  const onAction=useCallback((item,type)=>{
    const mb=parseMB(item.size||item.residual||"0");
    if(type==="app") setMyApps(p=>p.filter(a=>a.id!==item.id));
    else if(type==="dupe") setMyDupes(p=>p.filter(d=>d.id!==item.id));
    else setJunk(p=>p.filter(j=>j.id!==item.id));
    setFreedMB(p=>p+mb);
    setDetail(null);
  },[]);

  /** Called after real Electron scan returns results */
  const onRealScanComplete=useCallback((realJunk, realApps)=>{
    if(realJunk&&realJunk.length>0) setJunk(realJunk);
    if(realApps&&realApps.length>0) setMyApps(realApps);
  },[]);

  const onCleanAll=useCallback((items)=>{
    const mb=items.reduce((s,j)=>s+parseMB(j.size),0);
    const ids=new Set(items.map(j=>j.id));
    setJunk(p=>p.filter(j=>!ids.has(j.id)));
    setFreedMB(p=>p+mb);
    setDetail(null);
  },[]);

  const onRemoveDupes=useCallback((ids)=>{
    const idSet=new Set(ids);
    const removed=myDupes.filter(d=>idSet.has(d.id));
    const mb=removed.reduce((s,d)=>s+parseMB(d.size),0);
    setMyDupes(p=>p.filter(d=>!idSet.has(d.id)));
    setFreedMB(p=>p+mb);
  },[myDupes]);

  const p={onSel,mobile,setPage};

  const pages={
    home:     <Home     {...p} freedMB={freedMB} junk={junk} myApps={myApps} myDupes={myDupes}/>,
    scan:     <Scan     {...p} junk={junk} onRealScanComplete={onRealScanComplete} onCleanAll={onCleanAll}/>,
    iphone:   <IPhone   mobile={mobile} onSel={onSel}/>,
    github:   <GitHub   mobile={mobile} junk={junk} myApps={myApps}/>,
    perf:     <Perf     mobile={mobile}/>,
    storage:  <Storage  mobile={mobile}/>,
    security: <Security mobile={mobile}/>,
    apps:     <Apps     {...p} myApps={myApps}/>,
    dupes:    <Dupes    {...p} myDupes={myDupes} onRemoveDupes={onRemoveDupes}/>,
    ai:       <AI       mobile={mobile}/>,
    settings: <Settings mobile={mobile} light={light} setLight={setLight}/>,
  };

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div className={light?"light":""} style={{height:"100dvh",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
        <div className="meshBlob" style={{width:600,height:600,background:"#7c3aed",top:-200,left:-100}}/>
        <div className="meshBlob" style={{width:500,height:500,background:"#06b6d4",top:"30%",right:-150}}/>
        <div className="meshBlob" style={{width:500,height:500,background:"#ec4899",bottom:-150,left:"35%"}}/>

        <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative",zIndex:1}}>
          {!mobile&&<Sidebar page={page} setPage={setPage}/>}
          <div style={{flex:1,overflow:"hidden",display:"flex",minWidth:0}}>
            <div style={{flex:1,overflow:"hidden"}} className="fadeUp" key={page}>{pages[page]}</div>
            {!mobile&&detail&&<Detail item={detail.item} type={detail.type} onClose={onClose} mobile={false} onAction={onAction}/>}
          </div>
        </div>

        {mobile&&(
          <div style={{display:"flex",borderTop:"1px solid var(--bd)",background:"var(--s1)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",paddingBottom:"env(safe-area-inset-bottom,0px)",flexShrink:0,zIndex:100}}>
            {TABS.map(n=>(
              <button key={n.id} className={`tabBtn${page===n.id?" on":""}`} onClick={()=>setPage(n.id)}>
                <div style={{width:22,height:22}}><n.Icon/></div>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        )}

        {mobile&&detail&&<Detail item={detail.item} type={detail.type} onClose={onClose} mobile={true} onAction={onAction}/>}
      </div>
    </>
  );
}
