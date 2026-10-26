// FPV Kamikaze Drone — anti-crash shield + b0nehack spam filter.
//  * Dedicated servers (EOS_SessionSearch_*): hide fake sessions with loopback host
//    address -> fixes the "Выделенные серверы" crash.
//  * Community/P2P (EOS_LobbySearch_*): hide b0nehack lobbies (by owner blocklist or a
//    "b0nehack" marker in attributes) -> cleans the P2P list (that tab doesn't crash).
// No file patching. Hooks EOS SDK exports by name.
'use strict';
const MOD='EOSSDK-Win64-Shipping.dll';
function ex(n){ const a=Module.findExportByName(MOD,n); if(!a) send({t:'warn',m:'missing '+n}); return a; }
function nf(a,ret,args){ return a? new NativeFunction(a,ret,args):null; }
function optsCnt(){ const p=Memory.alloc(8); p.writeInt(1); return p; }
function optsIdx(i){ const p=Memory.alloc(8); p.writeInt(1); p.add(4).writeU32(i); return p; }
function rd(p){ try{ return p.isNull()?null:p.readUtf8String(); }catch(e){ return null; } }

const BLOCK_PUIDS = [
  '0002101ecee34e6bb18652e8247c2a1c',
  '0002943d00614c9ab2c8af6a09dd4a01',
  '0002e0003700426485c242e142aa2397'
];

// ---------------- Dedicated servers (sessions) ----------------
const fCopyIdx = nf(ex('EOS_SessionSearch_CopySearchResultByIndex'),'int',['pointer','pointer','pointer']);
const fCopyInfo= nf(ex('EOS_SessionDetails_CopyInfo'),'int',['pointer','pointer','pointer']);
const fRelDet  = nf(ex('EOS_SessionDetails_Release'),'void',['pointer']);
const fRelInfo = nf(ex('EOS_SessionDetails_Info_Release'),'void',['pointer']);
const pSessCount= ex('EOS_SessionSearch_GetSearchResultCount');

function sessHost(hSearch, idx){
  try{
    const outH=Memory.alloc(Process.pointerSize);
    if(fCopyIdx(hSearch, optsIdx(idx), outH)!==0) return null;
    const h=outH.readPointer(); let host=null;
    const outI=Memory.alloc(Process.pointerSize);
    if(fCopyInfo(h, optsCnt(), outI)===0){ const info=outI.readPointer(); host=rd(info.add(16).readPointer()); fRelInfo(info); }
    fRelDet(h); return host;
  }catch(e){ return null; }
}
function sessBad(host){ return host===null||host===''||host.indexOf('127.')===0||host.indexOf('0.0.0.0')===0; }

let sInternal=false, sGood=[];
if(pSessCount && fCopyIdx){
  Interceptor.attach(pSessCount,{
    onEnter(a){ this.h=a[0]; },
    onLeave(ret){ try{
      const total=ret.toInt32(); if(total<0||total>4096) return;
      sInternal=true; const g=[]; let bad=0;
      for(let i=0;i<total;i++){ if(sessBad(sessHost(this.h,i))) bad++; else g.push(i); }
      sInternal=false; sGood=g;
      send({t:'filter', kind:'dedicated', total:total, kept:g.length, hidden:bad});
      ret.replace(ptr(g.length));
    }catch(e){ sInternal=false; send({t:'warn',m:'sess count: '+e}); } }
  });
  Interceptor.attach(ex('EOS_SessionSearch_CopySearchResultByIndex'),{
    onEnter(a){ if(sInternal) return; try{ const o=a[1]; const i=o.add(4).readU32(); if(sGood.length&&i<sGood.length) o.add(4).writeU32(sGood[i]); }catch(e){} }
  });
}

// ---------------- Community / P2P (lobbies) ----------------
const pLobCount = ex('EOS_LobbySearch_GetSearchResultCount');
const pLobCopy  = ex('EOS_LobbySearch_CopySearchResultByIndex');
const fLobCopy  = nf(pLobCopy,'int',['pointer','pointer','pointer']);
const fLobOwner = nf(ex('EOS_LobbyDetails_GetLobbyOwner'),'pointer',['pointer','pointer']);
const fLobAttrCnt=nf(ex('EOS_LobbyDetails_GetAttributeCount'),'uint32',['pointer','pointer']);
const fLobCopyAttr=nf(ex('EOS_LobbyDetails_CopyAttributeByIndex'),'int',['pointer','pointer','pointer']);
const fLobRel   = nf(ex('EOS_LobbyDetails_Release'),'void',['pointer']);
const fAttrRel  = nf(ex('EOS_Lobby_Attribute_Release'),'void',['pointer']);
const aPuidStr  = ex('EOS_ProductUserId_ToString');
const fPuidStr  = nf(aPuidStr,'int',['pointer','pointer','pointer']);

function puid(p){ try{ if(!p||p.isNull()||!fPuidStr) return null;
  const b=Memory.alloc(64), l=Memory.alloc(4); l.writeInt(64);
  return fPuidStr(p,b,l)===0? b.readUtf8String() : null; }catch(e){ return null; } }

function lobbyBad(hDet){
  try{
    // owner in blocklist?
    if(fLobOwner){ const o=puid(fLobOwner(hDet, optsCnt())); if(o && BLOCK_PUIDS.indexOf(o)>=0) return true; }
    // any attribute value/key mentioning b0nehack?
    if(fLobAttrCnt && fLobCopyAttr){
      const n=fLobAttrCnt(hDet, optsCnt());
      for(let i=0;i<n;i++){
        const outA=Memory.alloc(Process.pointerSize);
        if(fLobCopyAttr(hDet, optsIdx(i), outA)!==0) continue;
        const attr=outA.readPointer();
        try{ const data=attr.add(8).readPointer();
          const key=rd(data.add(8).readPointer());
          const val=rd(data.add(16).readPointer());
          const hay=((key||'')+' '+(val||'')).toLowerCase();
          if(hay.indexOf('b0nehack')>=0 || hay.indexOf('bonehack')>=0){ if(fAttrRel) fAttrRel(attr); return true; }
        }catch(e){}
        if(fAttrRel) fAttrRel(attr);
      }
    }
  }catch(e){}
  return false;
}

let lInternal=false, lGood=[];
if(pLobCount && fLobCopy && fLobRel){
  Interceptor.attach(pLobCount,{
    onEnter(a){ this.h=a[0]; },
    onLeave(ret){ try{
      const total=ret.toInt32(); if(total<0||total>4096) return;
      lInternal=true; const g=[]; let bad=0;
      for(let i=0;i<total;i++){
        const outH=Memory.alloc(Process.pointerSize);
        if(fLobCopy(this.h, optsIdx(i), outH)!==0){ g.push(i); continue; }
        const hDet=outH.readPointer();
        if(lobbyBad(hDet)) bad++; else g.push(i);
        fLobRel(hDet);
      }
      lInternal=false; lGood=g;
      send({t:'filter', kind:'p2p', total:total, kept:g.length, hidden:bad});
      ret.replace(ptr(g.length));
    }catch(e){ lInternal=false; send({t:'warn',m:'lobby count: '+e}); } }
  });
  Interceptor.attach(pLobCopy,{
    onEnter(a){ if(lInternal) return; try{ const o=a[1]; const i=o.add(4).readU32(); if(lGood.length&&i<lGood.length) o.add(4).writeU32(lGood[i]); }catch(e){} }
  });
}

send({t:'ready', m:'shield active (dedicated + p2p) on '+MOD, lobby:!!pLobCount});
