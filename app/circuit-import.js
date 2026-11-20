/* CEsim Circuit: open LTspice (.asc) and KiCad (.kicad_sch) schematics.
   Both give parts with the place of each pin, plus wires; placeImported() in circuit.html
   turns them into a CEsim design. Uses LIB, parseCir and num from circuit.html. */
(function(){
"use strict";
/* union-find over "x,y" points; a point inside a wire joins that wire */
function Nets(){const par=new Map();const f=k=>{if(!par.has(k))par.set(k,k);let r=k;while(par.get(r)!==r)r=par.get(r);let c=k;while(par.get(c)!==r){const n=par.get(c);par.set(c,r);c=n}return r};
 const segs=[];return{f,u:(a,b)=>par.set(f(a),f(b)),seg(a,b){segs.push([a,b]);par.set(f(a.x+","+a.y),f(b.x+","+b.y))},
  touch(p){const k=p.x+","+p.y;f(k);for(const[a,b]of segs){const on=(a.x===b.x&&p.x===a.x&&p.y>Math.min(a.y,b.y)&&p.y<Math.max(a.y,b.y))||(a.y===b.y&&p.y===a.y&&p.x>Math.min(a.x,b.x)&&p.x<Math.max(a.x,b.x));if(on)par.set(f(k),f(a.x+","+a.y))}return k}}}
const near=(a,b)=>Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6;

/* ---------------- LTspice .asc ---------------- */
const ASYM={res:[[16,16],[16,96]],res2:[[16,16],[16,96]],cap:[[16,0],[16,64]],polcap:[[16,0],[16,64]],ind:[[16,16],[16,96]],ind2:[[16,16],[16,96]],
 voltage:[[0,16],[0,96]],current:[[0,0],[0,80]],battery:[[0,16],[0,96]],npn:[[64,0],[0,48],[64,96]],pnp:[[64,0],[0,48],[64,96]],npn2:[[64,0],[0,48],[64,96]],pnp2:[[64,0],[0,48],[64,96]],
 nmos:[[48,0],[0,80],[48,96]],pmos:[[48,0],[0,80],[48,96]],diode:[[16,0],[16,64]],zener:[[16,0],[16,64]],schottky:[[16,0],[16,64]],led:[[16,0],[16,64]]};
const ALET={res:"R",res2:"R",cap:"C",polcap:"C",ind:"L",ind2:"L",voltage:"V",battery:"V",current:"I",npn:"Q",pnp:"Q",npn2:"Q",pnp2:"Q",nmos:"M",pmos:"M",diode:"D",zener:"D",schottky:"D",led:"D"};
/* CEsim pin i sits on SPICE node PERM[letter][i] */
const PERM={I:[1,0],Q:[1,0,2],M:[1,0,2]};
function arot(x,y,r){let m=/^M/i.test(r);const a=+(String(r).replace(/^[RM]/i,""))||0;if(m)x=-x;switch(((a/90)%4+4)%4){case 1:return[-y,x];case 2:return[-x,-y];case 3:return[y,-x]}return[x,y]}
function readAsc(text){const L=String(text).replace(/^\uFEFF/,"").split(/\r?\n/);const wires=[],flags=[],syms=[],dirs=[];let cur=null;
 for(const raw of L){const l=raw.trim();let m;
  if((m=l.match(/^WIRE\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/i))){wires.push([{x:+m[1],y:+m[2]},{x:+m[3],y:+m[4]}]);cur=null}
  else if((m=l.match(/^FLAG\s+(-?\d+)\s+(-?\d+)\s+(\S+)/i))){flags.push({x:+m[1],y:+m[2],name:m[3]});cur=null}
  else if((m=l.match(/^SYMBOL\s+(\S+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)/i))){cur={name:m[1].split(/[\\/]/).pop().toLowerCase(),x:+m[2],y:+m[3],r:m[4],attr:{}};syms.push(cur)}
  else if((m=l.match(/^SYMATTR\s+(\S+)\s*(.*)$/i))&&cur)cur.attr[m[1]]=m[2];
  else if((m=l.match(/^TEXT\s+-?\d+\s+-?\d+\s+\S+\s+\S+\s+!(.*)$/i))){dirs.push(m[1].replace(/\\n/g,"\n"));cur=null}
  else if(/^(WINDOW|PINATTR|IOPIN)\b/i.test(l)){}else cur=null}
 if(!wires.length&&!syms.length&&!dirs.length)throw new Error("this is not an LTspice schematic");
 const N=Nets();for(const[a,b]of wires)N.seg(a,b);
 const K=p=>N.touch(p);
 const sp=syms.map(s=>{const pins=ASYM[s.name];if(!pins)return null;return pins.map(([dx,dy])=>{const[x,y]=arot(dx,dy,s.r);return{x:s.x+x,y:s.y+y}})});
 sp.forEach(ps=>ps&&ps.forEach(K));flags.forEach(K);
 const name={};for(const fl of flags){const r=N.f(fl.x+","+fl.y);if(fl.name==="0"||/^gnd$/i.test(fl.name))name[r]="0";else if(name[r]!=="0")name[r]=name[r]||fl.name}
 let auto=0;const netOf=p=>{const r=N.f(K(p));if(!name[r])name[r]="N"+String(++auto).padStart(3,"0");return name[r]};
 const lines=[],skip=[],placed={};
 syms.forEach((s,i)=>{const L0=ALET[s.name];const inst=s.attr.InstName||"";if(!L0||!sp[i]){skip.push((inst||s.name)+" ("+s.name+")");return}
  let id=inst||L0+(i+1);if(id[0].toUpperCase()!==L0)id=L0+id;const nodes=sp[i].map(netOf);if(L0==="M")nodes.push(nodes[2]);
  let val=[s.attr.Value,s.attr.Value2,s.attr.SpiceLine].filter(Boolean).join(" ").trim();
  if(!val)val=L0==="Q"?(s.name.startsWith("pnp")?"PNP":"NPN"):L0==="M"?(s.name==="pmos"?"PMOS":"NMOS"):L0==="D"?(s.name==="led"?"LED":""):"";
  lines.push(id+" "+nodes.join(" ")+" "+val);placed[id.toUpperCase()]={pts:sp[i],L0,led:s.name==="led",zener:s.name==="zener",schottky:s.name==="schottky"}});
 for(const d of dirs)for(const l of d.split("\n"))lines.push(l);
 const P=parseCir(lines.join("\n")).parts;
 const parts=P.map(q=>{const pl=placed[String(q.label).toUpperCase()];let xy=q.nodes.map(()=>null);
  if(pl){const pm=PERM[pl.L0]||null;xy=LIB[q.t].pins.map((_,i)=>{const j=pm?pm[i]:i;const p=pl.pts[j];return p?{x:p.x/2,y:p.y/2}:null});
   if(pl.L0==="D"){if(pl.led)q.t="led";else if(pl.zener&&q.t==="diode")q.t="zener";else if(pl.schottky&&q.t==="diode")q.t="schottky"}}
  let lab=String(q.label||"");if(/^X[A-Z]/i.test(lab)&&q.t!=="xfmr")lab=lab.slice(1);
  return{t:q.t,label:lab||undefined,p:q.p,nodes:q.nodes,xy,org:null}});
 /* grounds, and named flags that are not a pin's automatic net */
 for(const fl of flags){const r=N.f(fl.x+","+fl.y);const nm=name[r];if(nm==="0")parts.push({t:"gnd",nodes:["0"],p:{},xy:[{x:fl.x/2,y:fl.y/2}],org:null});
  else if(!/^N\d{3,}$/i.test(fl.name))parts.push({t:"netlabel",nodes:[nm],p:{name:nm},xy:[{x:fl.x/2,y:fl.y/2}],org:null})}
 const ws=wires.map(([a,b])=>({pts:[{x:a.x/2,y:a.y/2},{x:b.x/2,y:b.y/2}],a:null,b:null}));
 return{parts,wires:endsToPins(ws,parts),warn:skip.length?["No CEsim part for "+skip.slice(0,8).join(", ")+"; left out."]:[]}}

/* a wire end on a part's pin belongs to that pin */
function endsToPins(ws,parts){const at=new Map();parts.forEach((q,k)=>q.xy.forEach((p,i)=>{if(p)at.set(Math.round(p.x*1000)+","+Math.round(p.y*1000),{k,i})}));
 const look=p=>at.get(Math.round(p.x*1000)+","+Math.round(p.y*1000))||null;
 for(const w of ws){w.a=w.a||look(w.pts[0]);w.b=w.b||look(w.pts[w.pts.length-1])}return ws}

/* ---------------- KiCad .kicad_sch ---------------- */
function sexpr(s){let i=0;const n=s.length;const stack=[[]];
 while(i<n){const c=s[i];if(c==="("){stack.push([]);i++}else if(c===")"){const l=stack.pop();if(!stack.length)throw new Error("bad file");stack[stack.length-1].push(l);i++}
  else if(c==='"'){let j=i+1,o="";while(j<n&&s[j]!=='"'){if(s[j]==="\\"){j++;o+=s[j]==="n"?"\n":s[j]}else o+=s[j];j++}stack[stack.length-1].push({s:o});i=j+1}
  else if(/\s/.test(c))i++;else{let j=i;while(j<n&&!/[\s()"]/.test(s[j]))j++;stack[stack.length-1].push(s.slice(i,j));i=j}}
 return stack[0][0]}
const head=l=>Array.isArray(l)?l[0]:null,str=v=>v&&typeof v==="object"&&"s"in v?v.s:v;
const all=(l,h)=>Array.isArray(l)?l.filter(x=>head(x)===h):[];const one=(l,h)=>all(l,h)[0];
function prop(l,k){for(const p of all(l,"property"))if(str(p[1])===k)return str(p[2]);return null}
const KMAP=[[/^Device:R(_|$)|^Device:R_Small/,"res"],[/^Device:R_Pot|POT/i,"pot"],[/^Device:C_Polarized|CP(_|$)/,"ecap"],[/^Device:C(_|$)|^Device:C_Small/,"cap"],[/^Device:L(_|$)/,"ind"],
 [/D_Zener/,"zener"],[/D_Schottky/,"schottky"],[/LED/,"led"],[/^Device:D(_|$)|Diode:/,"diode"],[/Q_NPN|:NPN|BC547|2N2222|2N3904/,"npn"],[/Q_PNP|:PNP|2N2907|2N3906/,"pnp"],
 [/Q_NMOS|NMOS|2N7000|IRF[0-9]/,"nmos"],[/Q_PMOS|PMOS/,"pmos"],[/Amplifier_Operational|OPAMP|LM741|uA741|TL07|LM358/i,"opamp"],[/VSIN|VAC|:SINE/i,"acv"],[/VPULSE/i,"clock"],[/VDC|Battery|:V(_|$)/i,"dcv"],[/IDC|:I(_|$)/i,"idc"],
 [/Transformer/i,"xfmr"],[/Fuse/i,"fuse"],[/Lamp/i,"lamp"],[/Buzzer/i,"buzzer"],[/Motor/i,"motor"],[/NE555|LM555|Timer:/i,"timer555"],[/^Switch:SW_SPST|SW_Push/i,"spst"]];
const MAINP={res:"resistance",pot:"resistance",cap:"capacitance",ecap:"capacitance",ind:"inductance",dcv:"voltage",idc:"current"};
const canon=s=>String(s||"").toUpperCase().replace(/[−–]/g,"-").replace(/^~$/,"OUT").replace(/^V\+$|^VCC$|^V\+$/,"V+").replace(/^V-$|^VEE$/,"V-");
function readKicad(text){const T=sexpr(String(text).replace(/^\uFEFF/,""));if(head(T)!=="kicad_sch")throw new Error("this is not a KiCad schematic");const S=1/0.127;const R=v=>Math.round(v*S*10)/10;
 const libs={};const ls=one(T,"lib_symbols");
 const pinsOf=sym=>{const out=[];const walk=l=>{for(const x of l)if(Array.isArray(x)){if(x[0]==="pin"){const at=one(x,"at");out.push({num:str((one(x,"number")||[])[1]),name:str((one(x,"name")||[])[1]),x:+at[1],y:+at[2]})}else if(x[0]==="symbol")walk(x)}};walk(sym);return out};
 if(ls)for(const s of all(ls,"symbol"))libs[str(s[1])]={pins:pinsOf(s),power:!!one(s,"power"),desc:prop(s,"Description")};
 const N=Nets();const segs=[];for(const w of all(T,"wire")){const xy=all(one(w,"pts")||[],"xy").map(q=>({x:R(+q[1]),y:R(+q[2])}));for(let i=1;i<xy.length;i++){N.seg(xy[i-1],xy[i]);segs.push([xy[i-1],xy[i]])}}
 const comps=[],labels=[];
 for(const s of all(T,"symbol")){const lid=str((one(s,"lib_id")||[])[1]);const lib=libs[lid];if(!lib)continue;const at=one(s,"at");const X=+at[1],Y=+at[2],A=(+at[3]||0);const mir=str((one(s,"mirror")||[])[1]);
  const pins=lib.pins.map(p=>{let x=p.x,y=p.y;const c=Math.round(Math.cos(A*Math.PI/180)),sn=Math.round(Math.sin(A*Math.PI/180));let rx=x*c-y*sn,ry=x*sn+y*c;if(mir==="x")ry=-ry;if(mir==="y")rx=-rx;return{...p,ax:R(X+rx),ay:R(Y-ry)}});
  const P={};for(const p of all(s,"property"))P[str(p[1])]=str(p[2]);
  comps.push({lid,lib,pins,P,X:X*S,Y:Y*S})}
 for(const h of ["label","global_label","hierarchical_label"])for(const l of all(T,h)){const at=one(l,"at");labels.push({name:str(l[1]),x:R(+at[1]),y:R(+at[2])})}
 const K=p=>N.touch(p);comps.forEach(c=>c.pins.forEach(p=>K({x:p.ax,y:p.ay})));labels.forEach(K);
 const name={};const give=(p,nm)=>{const r=N.f(K(p));if(nm==="0")name[r]="0";else if(name[r]!=="0"&&!name[r])name[r]=nm};
 for(const c of comps)if(c.lib.power){const v=String(c.P.Value||"");const g=/^(GND|GNDA|GNDD|GNDPWR|0|VSS|EARTH)$/i.test(v)?"0":v;c.pins.forEach(p=>give({x:p.ax,y:p.ay},g))}
 labels.forEach(l=>give(l,/^(0|GND)$/i.test(l.name)?"0":l.name));
 let auto=0;const netOf=p=>{const r=N.f(K(p));if(!name[r])name[r]="N"+String(++auto).padStart(3,"0");return name[r]};
 const byName={};for(const t in LIB)if(LIB[t].name)byName[LIB[t].name]=t;
 const parts=[],skip=[];
 for(const c of comps){if(c.lib.power){const v=String(c.P.Value||"");if(/^(GND|GNDA|GNDD|GNDPWR|0|VSS|EARTH)$/i.test(v))parts.push({t:"gnd",nodes:["0"],p:{},xy:[{x:c.pins[0]?c.pins[0].ax:c.X,y:c.pins[0]?c.pins[0].ay:c.Y}],org:null});
   else if(c.pins[0])parts.push({t:"netlabel",nodes:[netOf({x:c.pins[0].ax,y:c.pins[0].ay})],p:{name:v},xy:[{x:c.pins[0].ax,y:c.pins[0].ay}],org:null});continue}
  let saved=null;try{if(c.P.CEsim)saved=JSON.parse(c.P.CEsim)}catch(e){}
  let t=saved&&LIB[saved.t]?saved.t:(c.lib.desc&&byName[c.lib.desc])||null;
  if(!t){for(const[re,tt]of KMAP)if(re.test(c.lid)||re.test(String(c.P.Value||""))){t=tt;break}}
  if(!t||!LIB[t]){skip.push((c.P.Reference||"?")+" ("+c.lid+")");continue}
  const L_=LIB[t];const used=new Set();
  const pick=i=>{const want=canon(L_.pins[i][2]);let p=c.pins.find(q=>!used.has(q)&&canon(q.name)===want);
   if(!p&&/^CEsim:/.test(c.lid))p=c.pins.find(q=>q.num===String(i+1));
   if(!p&&t==="diode"||!p&&/^(led|zener|schottky)$/.test(t))p=c.pins.find(q=>!used.has(q)&&q.num===(i===0?"2":"1"));
   if(!p&&L_.pins.length===2&&c.pins.length===2)p=c.pins.find(q=>q.num===String(i+1));
   if(!p)p=c.pins.find(q=>!used.has(q)&&q.num===String(i+1));if(p)used.add(p);return p||null};
  const ps=L_.pins.map((_,i)=>pick(i));
  const p=saved&&saved.p?{...saved.p}:{};
  if(!saved){const v=String(c.P.Value||"");const mp=MAINP[t];if(mp&&isFinite(num(v)))p[mp]=v.replace(/[ΩRF]$/i,"").replace(/H$/,"")||v;
   const sim=String(c.P["Sim.Params"]||"");const g=k=>{const m=sim.match(new RegExp("\\b"+k+"=(\\S+)","i"));return m?m[1]:null};
   if(t==="dcv"&&g("dc"))p.voltage=g("dc");if(t==="acv"){if(g("ampl"))p.amp=g("ampl");if(g("f"))p.freq=g("f");if(g("dc"))p.offset=g("dc")}
   if(/^(diode|zener|npn|pnp|nmos|pmos|opamp)$/.test(t)&&v)p.model=v}
  parts.push({t,label:c.P.Reference&&!/\?$/.test(c.P.Reference)?c.P.Reference:undefined,p,nodes:ps.map((q,i)=>q?netOf({x:q.ax,y:q.ay}):"__NC_"+(c.P.Reference||t)+"_"+i),xy:ps.map(q=>q?{x:q.ax,y:q.ay}:null),org:{x:c.X,y:c.Y}})}
 for(const l of labels){const nm=name[N.f(K(l))];if(nm&&nm!=="0")parts.push({t:"netlabel",nodes:[nm],p:{name:l.name},xy:[{x:l.x,y:l.y}],org:null})}
 const ws=segs.map(([a,b])=>({pts:[a,b],a:null,b:null}));
 return{parts,wires:endsToPins(ws,parts),warn:skip.length?["No CEsim part for "+skip.slice(0,8).join(", ")+"; left out."]:[]}}

window.CEsimImport={readAsc,readKicad,sexpr};
})();
