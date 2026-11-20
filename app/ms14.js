/* CEsim → Multisim 14 (.ms14) exporter.
   A .ms14 file is XML compressed with PKWARE DCL implode, in chunks of 900000 bytes.
   Parts are copied from templates that Multisim itself saved (ms14-templates.js), so every
   symbol, pin and simulation model is the one Multisim expects. */
(function(root){
"use strict";
const NL="@@NL@@";
const MAGIC="MSMCompressedElectronicsWorkbenchXML";

/* ---------------- PKWARE DCL implode (binary literals) ---------------- */
function huff(compact){const len=[];for(const c of compact){const n=(c>>4)+1,l=c&15;for(let i=0;i<n;i++)len.push(l)}
 const order=len.map((l,s)=>[l,s]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const code=new Array(len.length),bits=new Array(len.length);let c=0,prev=order[0][0];
 for(let i=0;i<order.length;i++){const [l,s]=order[i];if(i>0){c++;if(l>prev){c<<=(l-prev);prev=l}}code[s]=c;bits[s]=l}return{code,bits}}
const LEN=huff([2,35,36,53,38,23]),DIST=huff([2,20,53,230,247,151,248]);
const BASE=[3,2,4,5,6,7,8,9,10,12,16,24,40,72,136,264],EXTRA=[0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8];
function implode(src){const dictBits=6,DICT=4096;const out=[0,dictBits];let acc=0,n=0;
 const put=(v,k)=>{for(let i=0;i<k;i++){acc|=((v>>i)&1)<<n;if(++n===8){out.push(acc);acc=0;n=0}}};
 const putCode=(h,s)=>{const c=h.code[s];for(let i=h.bits[s]-1;i>=0;i--){acc|=(((c>>i)&1)^1)<<n;if(++n===8){out.push(acc);acc=0;n=0}}};
 const putLen=L=>{let s=-1;for(let q=0;q<16;q++)if(BASE[q]<=L&&L<BASE[q]+(1<<EXTRA[q])){s=q;break}putCode(LEN,s);put(L-BASE[s],EXTRA[s])};
 const N=src.length,H=new Int32Array(1<<16).fill(-1),prevp=new Int32Array(N);
 const hash=i=>((src[i]<<8)^(src[i+1]<<4)^src[i+2])&0xffff;const insert=p=>{if(p+2<N){const h=hash(p);prevp[p]=H[h];H[h]=p}};
 let i=0;while(i<N){let best=0,bd=0;
  if(i+2<N){let p=H[hash(i)],tries=64;while(p>=0&&i-p<=DICT&&tries--){let l=0;const m=Math.min(518,N-i);while(l<m&&src[p+l]===src[i+l])l++;if(l>best){best=l;bd=i-p;if(l===m)break}p=prevp[p]}}
  if(best===2&&bd>256)best=0;
  if(best>=2){put(1,1);putLen(best);const sh=best===2?2:dictBits,d=bd-1;putCode(DIST,d>>sh);put(d&((1<<sh)-1),sh);for(let k=0;k<best;k++)insert(i+k);i+=best}
  else{put(0,1);put(src[i],8);insert(i);i++}}
 put(1,1);putCode(LEN,15);put(255,8);if(n)out.push(acc);return Uint8Array.from(out)}
function pack(bytes){const parts=[];const u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
 const head=[...MAGIC].map(c=>c.charCodeAt(0)).concat(u32(bytes.length),u32(0));parts.push(Uint8Array.from(head));
 for(let i=0;i<bytes.length;i+=900000){const part=bytes.subarray(i,Math.min(bytes.length,i+900000));const z=implode(part);parts.push(Uint8Array.from(u32(part.length).concat(u32(z.length))),z)}
 let tot=0;for(const p of parts)tot+=p.length;const out=new Uint8Array(tot);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}

/* ---------------- templates ---------------- */
let TPL=null;
async function templates(){if(TPL)return TPL;const b64=root.MS14_TPL_GZ;if(!b64)throw new Error(".ms14 part templates are missing");
 const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 const txt=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).text();TPL=JSON.parse(txt);return TPL}
const parser=()=>new DOMParser();
function frag(doc,xml){const d=parser().parseFromString(xml,"application/xml");const er=d.getElementsByTagName("parsererror")[0];if(er)throw new Error("Template XML: "+er.textContent.slice(0,120));return doc.importNode(d.documentElement,true)}
const kids=(e,tag)=>Array.from(e.children).filter(c=>!tag||c.tagName===tag);
const kid=(e,tag)=>kids(e,tag)[0]||null;
function path(e,tags){let cur=[e];for(const t of tags){const nx=[];for(const c of cur)nx.push(...kids(c,t));cur=nx;if(!cur.length)return null}return cur[0]}
function desc(e,tag){return e.getElementsByTagName(tag)[0]||null}
function clear(e){while(e.firstChild)e.removeChild(e.firstChild)}
function guid(){const h=(crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g,()=>(Math.random()*16|0).toString(16)));return "{"+h.toUpperCase()+"}"}
const enc=s=>{s=String(s);return /^[\x20-\x7e]*$/.test(s.replace(new RegExp(NL,"g"),""))?"&ASC"+s:"&UNI"+s.replace(/[^\x00-\x7e]/g,ch=>"_uc1"+ch.charCodeAt(0).toString(16).padStart(4,"0"))};

class Builder{
 constructor(T){this.T=T;const d=parser().parseFromString(T.base,"application/xml");this.doc=d;const r=d.documentElement;this.r=r;
  const cc=kid(desc(desc(r,"Diagram"),"Components"),"CODComposite");this.objs=kid(cc,"Objects");this.refs=kid(cc,"ReferencedComponents");
  this.els=desc(r,"Elements");this.circ=desc(r,"CiCircuit");this.pins=path(desc(r,"RefDesMgr"),["ComponentPins","Item","Items"]);
  this.cir=path(desc(r,"RefDesInfoContainer"),["CIRToInfoMap"]);this.props=path(desc(r,"CCompInstancePropManager"),["RefDesGUIDsForSave"]);
  this.netlabels=path(desc(r,"CDesignNetContainer"),["NetLabels","Item","Items"]);this.inst=desc(r,"InstrumentsData");
  this.sheet=T.sheet;this.id=700000000;this.netnodes={};this.netwires={};this.parts={};this.models={}}
 newid(){this.id+=8;return String(this.id)}
 assign(list){const m={};for(const el of list)for(const e of [el,...el.getElementsByTagName("*")])for(const a of ["ID","CiID"]){const v=e.getAttribute(a);if(v&&/^\d+$/.test(v)&&e.tagName==="Item"&&e.getAttribute("Class")&&!(v in m))m[v]=this.newid()}
  for(const el of list)for(const e of [el,...el.getElementsByTagName("*")])for(const at of Array.from(e.attributes))if(at.value in m)e.setAttribute(at.name,m[at.value])}
 label(mod,net,g){const e=this.doc.createElement("CSchDesignNetLabel");const named=mod===1||mod===4||mod===512;
  for(const [k,v] of [["Class","CSchDesignNetLabel"],["Modifier",String(mod)],["Value",""],["ID",g],["Priority","0"],["LastOverruleName",named?"&ASC"+net:""],["LastNetName","&ASC"+net],["LastLocalName",named?"&ASC"+net:""]])e.setAttribute(k,v);
  this.netlabels.appendChild(e)}
 localPins(key){const t=this.T.templates[key];const s=frag(this.doc,t.sym).firstElementChild;const out={};
  for(const it of kids(kid(s,"Objects"),"Item")){if(it.getAttribute("Class")!=="CIITPinSymbolComp")continue;const ps=it.firstElementChild;const con=desc(ps,"CIITPinConnectorComp");const nm=desc(ps,"CIITPinSymTextCompName");
   out[nm?nm.getAttribute("Output").replace(/^&ASC/,""):"1"]=[+con.getAttribute("ptCenterX"),+con.getAttribute("ptCenterY")]}return out}
 add(key,ref,x,y,M,opt){opt=opt||{};const T=this.T.templates[key];if(!T)throw new Error("No .ms14 part for "+key);const D=this;
  const s2=frag(this.doc,T.sym),c2=frag(this.doc,T.cic),p2=T.ports.map(p=>frag(this.doc,p));
  /* the SPICE model is its own element; one per part type, shared by every part of that type */
  const own=opt.model&&T.model?opt.model:null;const mk=key+(own?"|"+own.name:"");
  const md=T.model&&!this.models[mk]?frag(this.doc,T.model):null;this.assign(md?[s2,c2,md,...p2]:[s2,c2,...p2]);
  if(own){/* this part's own name and model in place of the family part's */
   const fam=(/__([A-Z_]+)__1$/.exec(T.model.match(/LocalName="([^"]*)"/)[1])||[,"PART"])[1];const full=own.name+"__"+fam+"__1";
   if(md){md.firstElementChild.setAttribute("LocalName","&ASC"+full);for(const e of md.getElementsByTagName("CiaCString"))e.setAttribute("String","&ASC"+own.text.replace(/NAME/g,full))}
   const cs=c2.getElementsByTagName("CiaCollString")[0];const it=cs?kids(kid(cs,"strings"),"Item"):[];
   if(it[1])it[1].setAttribute("Value","&ASC"+own.name);if(it[3])it[3].setAttribute("Value","&ASC"+own.name);if(it[5])it[5].setAttribute("Value","&ASC"+own.text.replace(/NAME/g,own.name))}
  if(p2.some(p=>/^@/.test(p.firstElementChild.getAttribute("Model")||""))&&!this.ttlio&&this.T.extramodels){this.ttlio={};/* the TTL input and output models the chip pins use */
   this.T.extramodels.forEach((em,i)=>{const e=frag(this.doc,em);this.assign([e]);e.firstElementChild.setAttribute("Scope",this.circ.parentNode.getAttribute("CiID")||"");const last=this.els.lastElementChild;this.els.insertBefore(e,last);this.els.insertBefore(this.doc.createTextNode("\n"),last);this.item(kid(this.circ,"Models"),{CiID:e.getAttribute("CiID")});this.ttlio[this.T.extranames[i]]=e.getAttribute("CiID")})}
  for(const p of p2){const pm=p.firstElementChild.getAttribute("Model")||"";if(/^@/.test(pm)&&this.ttlio)p.firstElementChild.setAttribute("Model",this.ttlio[pm.slice(1)]||"")}
  if(T.model){if(md){md.firstElementChild.setAttribute("Scope",this.circ.parentNode.getAttribute("CiID")||md.firstElementChild.getAttribute("Scope"));
    const last=this.els.lastElementChild;this.els.insertBefore(md,last);this.els.insertBefore(this.doc.createTextNode("\n"),last);
    this.item(kid(this.circ,"Models"),{CiID:md.getAttribute("CiID")});this.models[mk]=md.getAttribute("CiID")}
   c2.firstElementChild.setAttribute("Model",this.models[mk])}
  for(const cl of s2.getElementsByTagName("ConnectList"))clear(cl);
  for(const p of p2)clear(kid(p.firstElementChild,"Nodes"));
  const ng=guid();c2.firstElementChild.setAttribute("InstanceID",ng);const gnd=key==="GROUND";
  const cs=s2.firstElementChild;
  if(!gnd){c2.firstElementChild.setAttribute("LocalName","&ASC"+ref);for(const it of kids(kid(cs,"Objects"),"Item"))if(it.getAttribute("Class")==="CIITSymTextCompName")it.firstElementChild.setAttribute("Output",enc(opt.display||ref))}
  const hidden=[];for(const it of s2.getElementsByTagName("Item")){if(it.getAttribute("Guid")){const g=guid();it.setAttribute("Guid",g);const nm=it.parentNode.getAttribute("NetModifier")||"";if(/GLOBAL_GROUND/.test(nm))this.label(1,"0",g);else if(/NET_HIDDEN/.test(nm)){const net=(it.getAttribute("Value")||"").replace(/^&ASC/,"");if(net){this.label(512,net,g);hidden.push(net)}}}}
  [["Transformer-M00",M[0]],["Transformer-M01",M[1]],["Transformer-M10",M[2]],["Transformer-M11",M[3]],["Transformer-M20",x],["Transformer-M21",y]].forEach(([k,v])=>cs.setAttribute(k,String(v)));
  if(!(M[0]===1&&M[1]===0&&M[2]===0&&M[3]===1))upright(s2,M);
  const at=kid(c2.firstElementChild,"Attributes");
  if(opt.params){const pl=at&&at.children[2]&&kid(at.children[2],"CiaParamList");if(pl){const dd=kid(pl,"doubles"),pp=kid(pl,"parameters");
   for(const [idx,[num,txt]] of Object.entries(opt.params)){if(num!=null&&dd&&dd.children[idx])dd.children[idx].setAttribute("Value",String(num));if(txt!=null&&pp&&pp.children[idx])pp.children[idx].setAttribute("Value","&ASC"+txt)}}}
  if(opt.strings){const pl=at&&at.children[2]&&kid(at.children[2],"CiaParamList");const ss=pl&&kid(pl,"strings");if(ss)for(const [idx,txt] of Object.entries(opt.strings))if(ss.children[idx])ss.children[idx].setAttribute("Value",txt)}
  if(opt.edit)opt.edit(c2,s2);if(opt.edit2)opt.edit2(s2);
  if(opt.value!=null)for(const it of kids(kid(cs,"Objects"),"Item"))if(it.getAttribute("Class")==="CIITSymTextCompValue")it.firstElementChild.setAttribute("Output",enc(opt.value));
  this.objs.appendChild(s2);const last=this.els.lastElementChild;for(const e of [c2,...p2]){this.els.insertBefore(e,last);this.els.insertBefore(this.doc.createTextNode("\n"),last)}
  this.item(kid(this.circ,"Components"),{CiID:c2.getAttribute("CiID")});
  for(const pin of T.pins){const q=frag(this.doc,pin);q.setAttribute("GUID",ng);this.pins.appendChild(q)}
  if(!gnd){const m=/^(.*?)(\d*)$/.exec(ref),pre=m[1],num=m[2];
   for(const it of T.cir){const q=frag(this.doc,it);q.setAttribute("CIRKey","&ASC"+ref);
    for(const ri of q.getElementsByTagName("RefDesInfo")){ri.setAttribute("IRPrefix","&ASC"+pre);ri.setAttribute("IRNumber",num||"-1")}
    for(const dd of q.getElementsByTagName("RefDesInfoData")){let rd=dd.getAttribute("RefDes").split("!0"+T.local+"!0").join("!0"+ref+"!0").split("!0"+T.srcpath+"!0").join("!0"+this.sheet+"!0");
     dd.setAttribute("RefDes",rd);dd.setAttribute("RefDesStrSize",String(rd.replace(/!0/g,"\0").length+2));dd.setAttribute("Prefix","&ASC"+pre);dd.setAttribute("Number",num||"1")}
    this.cir.appendChild(q)}}
  for(const it of T.props){const q=frag(this.doc,it);q.setAttribute("CiCompGUID","&ASC"+ng);q.setAttribute("InstanceGUID",guid());this.props.appendChild(q)}
  if(this.inst&&opt.inst!==false)for(const it of T.inst){const q=frag(this.doc,it);q.setAttribute("CompLongName","&ASC"+ref+"#1/"+this.sheet+":");if(opt.instEdit)opt.instEdit(q);this.inst.appendChild(q)}
  const pins={};const portBy={};for(const p of p2)portBy[p.firstElementChild.getAttribute("LocalName").replace(/^&ASC/,"")]=p;
  for(const it of kids(kid(cs,"Objects"),"Item")){if(it.getAttribute("Class")!=="CIITPinSymbolComp")continue;const ps=it.firstElementChild,con=desc(ps,"CIITPinConnectorComp"),nmE=desc(ps,"CIITPinSymTextCompName");
   const nm=nmE?nmE.getAttribute("Output").replace(/^&ASC/,""):"1";const lx=+con.getAttribute("ptCenterX"),ly=+con.getAttribute("ptCenterY");
   pins[nm]={x:lx*M[0]+ly*M[2]+x,y:lx*M[1]+ly*M[3]+y,con,port:portBy[nm]||p2[0]}}
  this.parts[ref]=pins;for(const net of hidden){const port=portBy[net];if(!port)continue;const n=this.node(net);
   this.item(kid(n.firstElementChild,"Ports"),{CiID:port.getAttribute("CiID")});this.item(kid(port.firstElementChild,"Nodes"),{CiID:n.getAttribute("CiID")})}// a chip's hidden supply pins join the VCC and GND nets
  return pins}
 item(parent,attrs){const e=this.doc.createElement("Item");for(const k in attrs)e.setAttribute(k,attrs[k]);parent.appendChild(e);parent.appendChild(this.doc.createTextNode("\n"));return e}
 node(net){if(this.netnodes[net])return this.netnodes[net];const n=frag(this.doc,this.T.tnode);n.setAttribute("CiID",this.newid());n.firstElementChild.setAttribute("LocalName","&ASC"+net);
  clear(kid(n.firstElementChild,"Ports"));const last=this.els.lastElementChild;this.els.insertBefore(n,last);this.els.insertBefore(this.doc.createTextNode("\n"),last);
  this.item(kid(this.circ,"Nodes"),{CiID:n.getAttribute("CiID")});return this.netnodes[net]=n}
 connect(ref,pin,net){const P=this.parts[ref][pin];if(!P||!P.port)return;const n=this.node(net);
  this.item(kid(n.firstElementChild,"Ports"),{CiID:P.port.getAttribute("CiID")});this.item(kid(P.port.firstElementChild,"Nodes"),{CiID:n.getAttribute("CiID")})}
 endpin(x,y,tid,tcls){const p=frag(this.doc,this.T.tpin);p.setAttribute("ID",this.newid());const c=p.firstElementChild;c.setAttribute("CenterX",String(x));c.setAttribute("CenterY",String(y));c.setAttribute("Mobility","1");c.setAttribute("Text","");
  const cl=kid(c,"ConnectList");clear(cl);this.item(cl,{ID:tid,Class:tcls});this.refs.appendChild(p);this.refs.appendChild(this.doc.createTextNode("\n"));return p}
 junction(x,y,net){const j=frag(this.doc,this.T.tjunc);j.setAttribute("ID",this.newid());const c=j.firstElementChild;c.setAttribute("Text","&ASC"+net);c.setAttribute("CenterX",String(x));c.setAttribute("CenterY",String(y));c.setAttribute("Transformer-M20","0");c.setAttribute("Transformer-M21","0");
  clear(kid(c,"ConnectList"));this.objs.insertBefore(j,this.objs.firstChild);return j}
 wire(pts,a,b,net){const w=frag(this.doc,this.T.twire);w.setAttribute("ID",this.newid());const c=w.firstElementChild;const P=kid(c,"Points");clear(P);
  for(const [x,y] of pts){const e=this.doc.createElement("Item");e.setAttribute("X",String(Math.round(x)));e.setAttribute("Y",String(Math.round(y)));P.appendChild(e)}
  const ends=[];for(const [end,[x,y]] of [[a,pts[0]],[b,pts[pts.length-1]]]){let ep;
   if(end.junction){ep=this.endpin(x,y,end.junction.getAttribute("ID"),"CODPinComp");this.item(kid(end.junction.firstElementChild,"ConnectList"),{ID:ep.getAttribute("ID"),Class:"CODPinComp"})}
   else{const pin=this.parts[end.ref][end.pin];ep=this.endpin(x,y,pin.con.parentNode.getAttribute("ID"),"CIITPinConnectorComp");this.item(kid(pin.con,"ConnectList"),{ID:ep.getAttribute("ID"),Class:"CODPinComp"})}
   ends.push(ep)}
  c.setAttribute("Connect1",ends[0].getAttribute("ID"));c.setAttribute("Connect2",ends[1].getAttribute("ID"));c.setAttribute("Node",this.node(net).getAttribute("CiID"));c.removeAttribute("NodeText");
  const mi=desc(c,"ModifierInfo");clear(mi);const first=!this.netwires[net];this.netwires[net]=1;const g=guid();
  const el=this.doc.createElement("Element");el.setAttribute("NetModifier",first?"&ASCNI_EWB_NET_NAME":"&ASCNI_EWB_NET_AUTONAMED");const it=this.doc.createElement("Item");it.setAttribute("Value",first?"&ASC"+net:"");it.setAttribute("Guid",g);el.appendChild(it);mi.appendChild(el);
  this.label(first?4:256,net,g);this.objs.appendChild(w)}
 bytes(){let s=new XMLSerializer().serializeToString(this.doc.documentElement);
  s=s.replace(/'/g,"&apos;").replace(/[^\x00-\x7e]/g,ch=>"&#"+ch.charCodeAt(0)+";").split(NL).join("\n").split("@@TB@@").join("\t").split("@@CR@@").join("\r");
  s='<?xml version="1.0" encoding="ASCII"?>\n'+s+"\n";const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b}
}

/* ---------------- CEsim part → Multisim part ---------------- */
const SI={f:1e-15,p:1e-12,n:1e-9,u:1e-6,"µ":1e-6,m:1e-3,k:1e3,K:1e3,M:1e6,G:1e9,T:1e12};
function num(v){const m=String(v==null?"":v).trim().match(/^([-+]?[\d.]+(?:e[-+]?\d+)?)\s*(meg|[fpnuµmkKMGT])?/i);if(!m)return 0;let x=parseFloat(m[1]);const s=m[2];if(s)x*=/^meg$/i.test(s)?1e6:(SI[s]||1);return x}
function txt(v){return String(v==null?"":v).trim().replace(/µ/g,"u").replace(/\s*(Ω|ohm|Hz|V|A|F|H|W)$/i,"").replace(/meg$/i,"M")||"0"}
function eng(x){if(!isFinite(x))return "0";const a=Math.abs(x);if(a===0)return "0";const P=[[1e9,"G"],[1e6,"M"],[1e3,"k"],[1,""],[1e-3,"m"],[1e-6,"µ"],[1e-9,"n"],[1e-12,"p"]];
 for(const [m,s] of P)if(a>=m*0.9999)return +(x/m).toPrecision(4)+s;return +(x/1e-12).toPrecision(4)+"p"}
const OMEGA="Ω";

/* ---- each CEsim part keeps its own name and model: the family symbol gets this part's model ---- */
const g6=v=>String(+(+v).toPrecision(6));
const MDL={
 bjt:(pol,m,hfe)=>`.MODEL NAME ${pol} IS=${g6(m.is)} BF=${g6(hfe||m.bf)} BR=${g6(m.br)}`,
 diode:m=>`.MODEL NAME D IS=${g6(m.is)} N=${g6(m.n)}`,
 zener:vz=>[".SUBCKT NAME 1 2","D1 1 2 NAME_D",`.MODEL NAME_D D IS=1e-14 BV=${g6(vz)} IBV=1m`,".ENDS"].join(NL),
 mos:(pol,m)=>[".SUBCKT NAME 1 2 3","M1 1 2 3 3 NAME_M L=1u W=1u",`.MODEL NAME_M ${pol}MOS LEVEL=1 VTO=${g6(pol==="N"?m.vth:-m.vth)} KP=${g6(m.k)} LAMBDA=${g6(m.lam)}`,".ENDS"].join(NL),
 /* op-amp and comparator: gain, one pole at GBW/A, output held inside the supplies less the dropout */
 amp:(m,order)=>{const P=order;// node names for each pin position
  const cp=m.a/(2*Math.PI*Math.max(1,m.gbw)*1e3),dr=Math.max(0.005,m.drop||0);
  return[`.SUBCKT NAME ${P.join(" ")}`,`RIN INP INN 2MEG`,`E1 N1 0 INP INN ${g6(m.a)}`,`RP N1 N2 1k`,`CP N2 0 ${g6(cp)}`,`E2 N3 0 N2 0 1`,`ROUT N3 OUT 75`,
   `VCP VP NHI DC ${g6(dr)}`,`DHI OUT NHI NAME_D`,`VCN NLO VN DC ${g6(dr)}`,`DLO NLO OUT NAME_D`,`RVP VP 0 1G`,`RVN VN 0 1G`,`.MODEL NAME_D D IS=1e-15 N=0.01`,".ENDS"].join(NL)},
 /* regulator: out = Vin - dropout, held between 0 and the rated voltage */
 jfet:(pol,m)=>`.MODEL NAME ${pol}JF VTO=${g6(m.vto)} BETA=${g6(m.beta)} LAMBDA=${g6(m.lam)}`,
 /* thyristor (pins A G K): two-transistor model; the TRIAC is two of them back to back (pins MT2 G MT1) */
 scr:()=>[".SUBCKT NAME A G K","QP G N1 A NAME_P","QN N1 G K NAME_N","RL A K 100MEG",".MODEL NAME_P PNP BF=1 IS=1e-14",".MODEL NAME_N NPN BF=100 IS=1e-14",".ENDS"].join(NL),
 triac:()=>[".SUBCKT NAME MT2 G MT1","QP1 G N1 MT2 NAME_P","QN1 N1 G MT1 NAME_N","QP2 G N2 MT1 NAME_P","QN2 N2 G MT2 NAME_N","RL MT2 MT1 100MEG",".MODEL NAME_P PNP BF=1 IS=1e-14",".MODEL NAME_N NPN BF=100 IS=1e-14",".ENDS"].join(NL),
 /* DIAC (pins MT2 MT1): conducts both ways above the breakover voltage */
 diac:m=>[".SUBCKT NAME 1 2","D1 1 3 NAME_D","D2 2 3 NAME_D","RL 1 2 1G",`.MODEL NAME_D D IS=1e-14 BV=${g6(m.vbo)} IBV=1m`,".ENDS"].join(NL),
 /* optocoupler (pins A K C B E): LED, and CTR times its current from C to E */
 opto:m=>[".SUBCKT NAME A K C B E","D1 A N1 NAME_L","VS N1 K DC 0","D2 C N2 NAME_S",`F1 N2 E VS ${g6(m.ctr)}`,"D3 E N2 NAME_S","RCE C E 1G","RB B E 1G",".MODEL NAME_S D IS=1e-9 N=1",`.MODEL NAME_L D IS=${g6(0.01/Math.exp(1.2/(2*0.025852)))} N=2`,".ENDS"].join(NL),
 reg:m=>{const pos=m.v>0;return[".SUBCKT NAME IN OUT GND","RQ IN GND 2k","E1 A GND IN GND 1",`VD A B DC ${g6(pos?m.drop:-m.drop)}`,"RB B M 1k",`VR R GND DC ${g6(m.v)}`,
   pos?"DR M R NAME_D":"DR R M NAME_D",pos?"DZ GND M NAME_D":"DZ M GND NAME_D","E2 C GND M GND 1","RO C OUT 0.05",".MODEL NAME_D D IS=1e-15 N=0.01",".ENDS"].join(NL)}};
const safe=n=>String(n).replace(/[^\w.+-]+/g,"_");
/* 74xx chips: Multisim part, and CEsim pin name -> Multisim pin name (null: that pin is not in the exported section) */
const SEQ=(a,b)=>Object.fromEntries(a.map((x,i)=>[x,b[i]]));
const same=n=>n;
const sec1=n=>/^~?1/.test(n)?n:null;// only the first section of the chip is exported
const CHIPMS={
 ic7400:["7400N",{"1A":"1A","1B":"1B","1Y":"1Y"}],ic7402:["7402N",{"1A":"1A","1B":"1B","1Y":"1Y"}],ic7408:["7408N",{"1A":"1A","1B":"1B","1Y":"1Y"}],
 ic7432:["7432N",{"1A":"1A","1B":"1B","1Y":"1Y"}],ic7486:["7486N",{"1A":"1A","1B":"1B","1Y":"1Y"}],ic7404:["7404N",{"1A":"1A","1Y":"1Y"}],
 ic7442:["7442N",{A:"A",B:"B",C:"C",D:"D",...SEQ(["0","1","2","3","4","5","6","7","8","9"],["O0","O1","O2","O3","O4","O5","O6","O7","O8","O9"])}],
 ic7447:["7447N",{A:"A",B:"B",C:"C",D:"D","~LT":"~LT","~RBI":"~RBI",...SEQ(["a","b","c","d","e","f","g"],["OA","OB","OC","OD","OE","OF","OG"])}],
 ic7448:["7448N",{A:"A",B:"B",C:"C",D:"D","~LT":"~LT","~RBI":"~RBI",...SEQ(["a","b","c","d","e","f","g"],["OA","OB","OC","OD","OE","OF","OG"])}],
 ic7475:["7475N",{"1D":"1D1","2D":"1D2",C12:"1EN1","1Q":"1Q1","2Q":"1Q2","~1Q":"~1Q1","~2Q":"~1Q2"}],
 ic7483:["7483N",same],
 ic7485:["7485N",{A0:"A0",A1:"A1",A2:"A2",A3:"A3",B0:"B0",B1:"B1",B2:"B2",B3:"B3","A<Bi":"ALTB","A=Bi":"AEQB","A>Bi":"AGTB","A<B":"OALTB","A=B":"OAEQB","A>B":"OAGTB"}],
 ic7490:["7490N",{CKA:"INA",CKB:"INB","R0(1)":"R01","R0(2)":"R02","R9(1)":"R91","R9(2)":"R92",QA:"QA",QB:"QB",QC:"QC",QD:"QD"}],
 ic74148:["74148N",{...SEQ(["~0","~1","~2","~3","~4","~5","~6","~7"],["D0","D1","D2","D3","D4","D5","D6","D7"]),"~EI":"EI","~A0":"A0","~A1":"A1","~A2":"A2","~GS":"GS","~EO":"EO"}],
 ic74151:["74151N",same],ic74153:["74153N",same],ic74157:["74157N",n=>n==="S"?"~A/B":n],
 ic74161:["74161N",same],ic74163:["74163N",same],ic74164:["74164N",same],ic74165:["74165N",n=>n==="CLK INH"?"INH":n],
 ic74175:["74175N",same],ic74193:["74193N",same],ic74194:["74194N",same],ic74273:["74273N",same],
 ic74283:["74283N",n=>({S1:"SUM_1",S2:"SUM_2",S3:"SUM_3",S4:"SUM_4"})[n]||n],
 ic7410:["7410N",sec1],ic7411:["74LS11N",sec1],ic7414:["7414N",sec1],ic7420:["7420N",sec1],ic7427:["7427N",sec1],ic74266:["74LS266N",sec1],
 ic74125:["74LS125N",{"1A":"1A","~1G":"~1C","1Y":"1Y"}],ic74138:["74LS138N",same],ic74139:["74LS139N",sec1],ic74244:["74LS244N",sec1],
 ic74373:["74LS373N",n=>({LE:"ENG","~OE":"~OC"})[n]||n],ic74374:["74LS374N",n=>n==="~OE"?"~OC":n],
 ic4001:["4001BD_5V",sec1],ic4011:["4011BD_5V",sec1],ic4070:["4070BD_5V",sec1],ic4071:["4071BD_5V",sec1],ic4077:["4077BD_5V",sec1],ic4081:["4081BD_5V",sec1],ic4093:["4093BD_5V",sec1],
 ic4069:["4069BD_5V",{"1A":"I1","1Y":"O1"}],ic4049:["4049BD_5V",{"1A":"I1","1Y":"O1"}],ic4050:["4050BD_5V",{"1A":"I1","1Y":"O1"}],
 ic4013:["4013BD_5V",{"1D":"D1","1CLK":"CP1","1R":"CD1","1S":"SD1","1Q":"O1","~1Q":"~O1"}],
 ic4027:["4027BD_5V",{"1J":"J1","1K":"K1","1CLK":"CP1","1R":"CD1","1S":"SD1","1Q":"Q1","~1Q":"~Q1"}],
 ic4017:["4017BD_5V",n=>({CLK:"CP0","~EN":"~CP1",RST:"MR",CO:"~O5-9"})[n]||n.replace(/^Q/,"O")],
 ic4028:["4028BD_5V",n=>({A:"A0",B:"A1",C:"A2",D:"A3"})[n]||n.replace(/^Q/,"O")],
 ic4029:["4029BD_5V",n=>({CLK:"CP","U/~D":"UP/~DN","B/~D":"BIN/~DEC","~CO":"~TC"})[n]||(/^J\d$/.test(n)?"P"+(n[1]-1):/^Q\d$/.test(n)?"Q"+(n[1]-1):n)],
 ic4040:["4040BD_5V",n=>({CLK:"~CP",RST:"MR"})[n]||(/^Q\d+$/.test(n)?"O"+(n.slice(1)-1):n)],
 ic4511:["4511BD_5V",n=>({A:"DA",B:"DB",C:"DC",D:"DD",LE:"~EL"})[n]||(/^[a-g]$/.test(n)?"O"+n.toUpperCase():n)],
 ic4518:["4518BD_5V",n=>({"1CLK":"CP1","1EN":"EN1","1RST":"MR1","1Q0":"1A","1Q1":"1B","1Q2":"1C","1Q3":"1D"})[n]||null],
};
const GATEMS={and:["7408N","1A","1B","1Y"],or:["7432N","1A","1B","1Y"],nand:["7400N","1A","1B","1Y"],nor:["7402N","1A","1B","1Y"],xor:["7486N","1A","1B","1Y"],not:["7404N","1A","1Y"],xnor:["74LS266N","1A","1B","1Y"],buf:["4050BD_5V","I1","O1"]};
/* gates set to the CMOS family become 4000-series parts */
const GATECMOS={and:["4081BD_5V","1A","1B","1Y"],or:["4071BD_5V","1A","1B","1Y"],nand:["4011BD_5V","1A","1B","1Y"],nor:["4001BD_5V","1A","1B","1Y"],xor:["4070BD_5V","1A","1B","1Y"],xnor:["4077BD_5V","1A","1B","1Y"],not:["4069BD_5V","I1","O1"],buf:["4050BD_5V","I1","O1"]};
function chipMap(t,info,p){const g=(p&&/4000/.test(p.family||"")?GATECMOS:GATEMS)[t];if(g)return{key:g[0],pins:g.slice(1),section:1};const e=CHIPMS[t];if(!e||!info.H)return null;
 const L=info.H.LIB[t];const tr=typeof e[1]==="function"?e[1]:n=>e[1][n]??null;return{key:e[0],pins:L.pins.map(p=>tr(p[2])??null),section:1}}
function map(c,info){const p=c.p||{},t=c.t;const two=(k,a,b)=>[k,[a,b]];
 const MD=(info.H&&info.H.MODELS)||{},ZN=(info.H&&info.H.ZENERS)||{};const own=(key,name,text)=>({key,model:{name:safe(name),text},value:name});
 const npnKey=m=>/^BC107BP$/i.test(m)?"BC107BP":/^BC547B$/i.test(m)?"BC547B":/^2N2222A?$/i.test(m)?"2N2222A":null;
 {const cm=chipMap(t,info,p);if(cm)return cm}
 switch(t){
  case "gnd":return{key:"GROUND",pins:["1"]};
  case "vcc":return{key:"VCC",pins:["VCC"],params:{0:[null,txt(p.voltage)]},value:txt(p.voltage)+"V"};
  case "dcv":return{key:"DC_POWER",pins:["1","2"],params:{1:[num(p.voltage),txt(p.voltage)]},value:eng(num(p.voltage))+"V "};
  case "idc":return{key:"DC_CURRENT",pins:["1","2"],params:{1:[num(p.current),txt(p.current)]},value:eng(num(p.current))+"A "};
  case "acv":case "iac":{const u=t==="acv"?"V":"A";return{key:t==="acv"?"AC_VOLTAGE":"AC_CURRENT",pins:["1","2"],params:{1:[num(p.amp),txt(p.amp)],3:[num(p.offset),txt(p.offset||0)],5:[num(p.freq),txt(p.freq)],11:[num(p.phase),txt(p.phase||0)]},value:eng(num(p.amp))+u+"pk "+NL+eng(num(p.freq))+"Hz "+NL+(+num(p.phase)||0)+"° "}}
  case "clock":{const lo=num(p.low||0);if(lo){const T=1/num(p.freq);return{key:"PULSE_VOLTAGE",pins:["1","2"],params:{1:[lo,txt(p.low)],3:[num(p.amp),txt(p.amp)],11:[T*num(p.duty)/100,eng(T*num(p.duty)/100)],13:[T,eng(T)]},value:eng(lo)+"V "+eng(num(p.amp))+"V "+NL+eng(T*num(p.duty)/100)+"s "+eng(T)+"s "}}
   return{key:"CLOCK_VOLTAGE",pins:["1","2"],params:{1:[num(p.freq),txt(p.freq)],3:[num(p.duty),txt(p.duty)],5:[num(p.amp),txt(p.amp)]},value:eng(num(p.freq))+"Hz "+NL+eng(num(p.amp))+"V "}}
  case "vcvs":return{key:"VOLTAGE_CONTROLLED_VOLTAGE_SOURCE",pins:["2","1","4","3"],params:{1:[num(p.gain),txt(p.gain)]},value:eng(num(p.gain))+"V/V "};
  case "vccs":return{key:"VOLTAGE_CONTROLLED_CURRENT_SOURCE",pins:["2","1","4","3"],params:{1:[num(p.gm),txt(p.gm)]},value:eng(num(p.gm))+"Mho "};
  case "res":return{key:"RESISTOR_VIRTUAL",pins:["1","2"],params:{1:[num(p.resistance),txt(p.resistance)]},value:eng(num(p.resistance))+OMEGA};
  case "cap":return{key:"CAPACITOR_VIRTUAL",pins:["1","2"],params:{1:[null,txt(p.capacitance)]},value:eng(num(p.capacitance))+"F"};
  case "ecap":return{key:"CAP_ELECTROLIT_VIRTUAL",pins:["1","2"],params:{1:[null,txt(p.capacitance)]},value:eng(num(p.capacitance))+"F"};
  case "ind":return{key:"INDUCTOR_VIRTUAL",pins:["1","2"],params:{1:[null,txt(p.inductance)]},value:eng(num(p.inductance))+"H"};
  case "ldr":{const H=info.H||{};const r=H.ldrR&&H.P?H.ldrR(H.P(c)):num(p.rlight);return{key:"RESISTOR_VIRTUAL",pins:["1","2"],params:{1:[r,txt(eng(r))]},value:eng(r)+OMEGA}}
  case "pot":return{key:"POTENTIOMETER_VIRTUAL",pins:["1","3","2"],params:{5:[null,txt(p.resistance)]},strings:{0:"&ASC"+String(p.key||"A").slice(0,1).toUpperCase()},value:eng(num(p.resistance))+OMEGA+NL+"Key="+String(p.key||"A").slice(0,1).toUpperCase(),edit:(c2,s2)=>potSetting(c2,s2,p.wiper)};
  case "xfmr":{const r=+num(p.ratio)||1;return{key:"1P1S",pins:["p1pos","p1neg","s1pos","s1neg"],value:r+":1",edit(c2){for(const it of c2.getElementsByTagName("Item")){const v=it.getAttribute("Value");if(!v)continue;if(v.includes("1/10"))it.setAttribute("Value",v.split("1/10").join("1/"+r));else if(v==="&ASC10:1")it.setAttribute("Value","&ASC"+r+":1");else if(v.includes('Primary turns="10"'))it.setAttribute("Value",v.replace('Primary turns="10"','Primary turns="'+r+'"'))}},edit2(s2){for(const e of s2.getElementsByTagName("*")){const o=e.getAttribute("Output");if(o&&/(^|[^\d.])10:1$/.test(o))e.setAttribute("Output",o.replace(/10:1$/,r+":1"))}}}}
  case "fuse":return{key:"0.5_AMP",pins:["1","2"]};
  case "spst":return{key:"SPST",pins:["2","1"]};
  case "push":return{key:"PB_DPST",pins:["1","2"]};
  case "spdt":return{key:"SPDT",pins:["2","1","3"]};
  case "relay":return{key:"EDR201A05",pins:["C1","C2","L1","L2"]};
  case "motor":return{key:"MOTOR_RATED",pins:["2","1"]};
  case "diode":{const nm=String(p.model||"Generic");if(/^1N4148$/.test(nm))return{key:"1N4148",pins:["A","K"]};if(/^1N4007$/.test(nm))return{key:"1N4007",pins:["A","K"]};const m=(MD.diode||{})[nm]||{is:1e-14,n:1};return{...own(/4148|914/.test(nm)?"1N4148":"1N4007",nm==="Generic"?"DIODE":nm,MDL.diode(m)),pins:["A","K"]}}
  case "schottky":{const nm=String(p.model||"1N5819");if(/^1N5817G?$/.test(nm))return{key:"1N5817G",pins:["A","K"]};const m=(MD.schottky||{})[nm]||{is:3e-5,n:1.4};return{...own("1N5817G",nm,MDL.diode(m)),pins:["A","K"]}}
  case "zener":{const nm=String(p.model||"1N4735A");if(nm==="1N4735A")return{key:"1N4735A",pins:["A","K"]};return{...own("1N4735A",nm,MDL.zener(ZN[nm]||5.1)),pins:["A","K"]}}
  case "led":return{key:"LED_red",pins:["A","K"]};
  case "bridge":return{key:"1B4B42",pins:["AC1","AC2","V+","V-"]};
  case "npn":{const nm=String(p.model||"Generic NPN");const k=npnKey(nm);if(k&&!num(p.hfe))return{key:k,pins:["B","C","E"]};const m=(MD.npn||{})[nm]||{bf:100,is:1e-14,br:1};return{...own("2N2222A",nm.replace(/\s*\(.*\)/,"").replace(/^Generic /,""),MDL.bjt("NPN",m,num(p.hfe))),pins:["B","C","E"]}}
  case "pnp":{const nm=String(p.model||"Generic PNP");if(/^2N2907A$/.test(nm)&&!num(p.hfe))return{key:"2N2907A",pins:["B","C","E"]};const m=(MD.pnp||{})[nm]||{bf:100,is:1e-14,br:1};return{...own("2N2907A",nm.replace(/\s*\(.*\)/,"").replace(/^Generic /,""),MDL.bjt("PNP",m,num(p.hfe))),pins:["B","C","E"]}}
  case "nmos":{const nm=String(p.model||"Generic NMOS");if(nm==="2N7000")return{key:"2N7000",pins:["G","D","S"]};const m=(MD.nmos||{})[nm]||{vth:2,k:0.02,lam:0.01};return{...own("2N7000",nm.replace(/\s*\(.*\)/,"").replace(/^Generic /,""),MDL.mos("N",m)),pins:["G","D","S"]}}
  case "pmos":{const nm=String(p.model||"Generic PMOS");if(nm==="2N6804")return{key:"2N6804",pins:["G","D","S"]};const m=(MD.pmos||{})[nm]||{vth:2,k:0.02,lam:0.01};return{...own("2N6804",nm.replace(/\s*\(.*\)/,"").replace(/^Generic /,""),MDL.mos("P",m)),pins:["G","D","S"]}}
  case "opamp":{const sup=info.conn&&(info.conn[3]||info.conn[4]);if(!sup)return{key:"OPAMP_3T_VIRTUAL",pins:["IN+","IN-","OUT",null,null],value:"OPAMP_3T_VIRTUAL"};
   {const nm=String(p.model||"Ideal");if(/^(uA|UA|LM)741$/.test(nm))return{key:"UA741CD",pins:["IN+","IN-","OUT","VS+","VS-"]};if(nm==="Ideal")return{key:"OPAMP_5T_VIRTUAL",pins:["IN+","IN-","OUT","VS+","VS-"]};const m=(MD.opamp||{})[nm]||{a:2e5,gbw:1e6,drop:1.5};return{...own("UA741CD",nm.replace(/\s*\(.*\)/,""),MDL.amp(m,["INP","INN","VP","VN","OUT"])),pins:["IN+","IN-","OUT","VS+","VS-"]}}}
  case "comparator":{const nm=String(p.model||"LM339");if(nm==="LM339")return{key:"LM339N",pins:["1IN+","1IN-","1OUT","VS+","VS-"]};const m=(MD.comparator||{})[nm]||{a:2e5,gbw:1e9,drop:0.3};return{...own("LM339N",nm,MDL.amp(m,["INP","INN","OUT","VP","VN"])),pins:["1IN+","1IN-","1OUT","VS+","VS-"]}}
  case "njfet":case "pjfet":{const P=t==="njfet"?"N":"P";const nm=String(p.model||"Generic "+P+"-JFET");const m=(MD[t]||{})[nm]||{vto:P==="N"?-2:2,beta:1e-3,lam:0.005};
   return{...own(P==="N"?"2N3370":"2N2608",nm.replace(/^Generic /,""),MDL.jfet(P,{...m,vto:P==="N"?m.vto:-m.vto})),pins:["G","D","S"]}}
  case "scr":{const nm=String(p.model||"2N5060");return{...own("2N1595",nm,MDL.scr((MD.scr||{})[nm]||{})),pins:["A","K","G"]}}
  case "triac":{const nm=String(p.model||"BT136-600");return{...own("2N1595",nm,MDL.triac((MD.triac||{})[nm]||{})),pins:["A","K","G"]}}
  case "diac":{const nm=String(p.model||"DB3");return{...own("1N5758",nm,MDL.diac((MD.diac||{})[nm]||{vbo:32})),pins:["MT2","MT1"]}}
  case "opto":{const nm=String(p.model||"4N35");return{...own("4N25",nm,MDL.opto((MD.opto||{})[nm]||{ctr:1})),pins:["A","K","C","E"]}}
 case "timer555":return{key:"LM555CN",pins:["VCC","RST","TRI","THR","DIS","OUT","CON","GND"]};
  case "reg":{const nm=String(p.model||"LM7805");if(nm==="LM7805")return{key:"LM7805CT",pins:["IN","OUT","GND"]};const m=(MD.reg||{})[nm]||{v:5,drop:2};return{...own("LM7805CT",nm,MDL.reg(m)),pins:["IN","OUT","GND"]}}
  case "lm317":return{key:"LM317K",pins:["IN","OUT","ADJ"]};
  case "dff":return{key:"7474N",pins:["1D","1CLK","1Q","~1Q"]};
  case "jkff":return{key:"7476N",pins:["1J","1CLK","1K","1Q","~1Q"]};
  case "counter":return{key:"7493N",pins:["INA","R01","QA","QB","QC","QD"],extra:"counter"};
  case "hexdisp":return{key:"DCD_HEX",pins:["1","2","3","4"]};
  case "seg7":return{key:"SEVEN_SEG_COM_K",pins:["A","B","C","D","E","F","G"],extra:"seg7"};
  case "probe":case "lprobe":return{key:"PROBE",pins:["1"]};
  case "voltmeter":return{key:"VOLTMETER_H",pins:["1","2"]};
  case "ammeter":return{key:"AMMETER_H",pins:["1","2"]};
  case "lamp":return{key:"100V_100W",pins:["1","2"]};
  case "buzzer":return{key:"BUZZER",pins:["1","2"]};
  case "netlabel":return{key:"ONPAGE_CONNECTOR",pins:["1"],net:1};
  case "xmm":return{key:"XMM",pins:["1","2"]};
  case "xwm":return{key:"XWM",pins:["1","2","3","4"]};
  case "xbp":return{key:"XBP",pins:["1","2","3","4"],extra:"xbp",instEdit:q=>setInst(q,{NI_EWB_HORZ_INITIAL_VALUE:num(p.fmin||10),NI_EWB_HORZ_FINAL_VALUE:num(p.fmax||1e5),NI_EWB_VERT_INITIAL_LOG_VALUE:-40,NI_EWB_VERT_FINAL_LOG_VALUE:10})};
  case "xla":return{key:"XLA",pins:["1","2","3","4","5","6","7","8"]};
  case "xwg":return{key:"XWG",pins:["1","2","3","4","5","6","7","8"]};
  case "cd4060":return{key:"4060BD_5V",pins:["RS","RTC","CTC","MR",null,null,"O3","O4","O5","O6","O7","O8","O9","O11","O12","O13"]};
  case "xtal":case "resonator":return{key:"HC-49/U_11MHz",pins:["X1","X2"],value:eng(num(p.freq))+"Hz"};
  case "xfg":{/* sawtooth: a triangle with 99 % duty; pulse: a square shifted up; noise, sweep and arbitrary have no match and go as a sine */
   const wv=p.wave;const w={sine:0,triangle:1,square:2,sawtooth:1,pulse:2}[wv]||0;const amp=num(p.amp),off=num(p.offset);
   return{key:"XFG",pins:["1","2","3"],instEdit:q=>setInst(q,{NI_EWB_WAVE_MODE:w,NI_EWB_FREQUENCY_VALUE:num(p.freq),NI_EWB_AMPLITUDE_VALUE:wv==="pulse"?amp/2:amp,NI_EWB_OFFSET_VALUE:wv==="pulse"?off+amp/2:off,NI_EWB_DEPUTY_CYCLE_VALUE:wv==="sawtooth"?99:num(p.duty||50)})}}
  case "xsc":return{key:"XSC",pins:["1","2","4"],extra:"xsc",instEdit:q=>setInst(q,{NI_EWB_TIMEBASE_SCALE_VALUE:num(p.tb),NI_EWB_A_CHANNEL_SCALE_VALUE:num(p.va),NI_EWB_B_CHANNEL_SCALE_VALUE:num(p.vb)})};
 }return null}
/* pot wiper position: the "setting" variable in the part's interactive script, and its % label */
function potSetting(c2,s2,w){w=Math.max(0,Math.min(100,+w));if(!isFinite(w))return;const ws=(Math.round(w*10)/10).toFixed(1);
 for(const e of c2.getElementsByTagName("*"))for(const a of ["String","Value"]){const v=e.getAttribute(a);if(v&&v.includes("VARIABLE"))e.setAttribute(a,v.replace(/(\*\s+)50\.0(\s+VARIABLE\s+setting)/,"$1"+ws.padEnd(4)+"$2"))}
 for(const e of c2.getElementsByTagName("Item")){const v=e.getAttribute("Value");if(v&&/^&ASC-?[\d.]+;50\.000000;$/.test(v))e.setAttribute("Value",v.replace(/;50\.000000;$/,";"+w.toFixed(6)+";"))}
 for(const e of s2.getElementsByTagName("CIITVariableSymText"))e.setAttribute("Output","&ASC"+(Math.round(w*10)/10)+" %")}
function setInst(q,vals){for(const el of q.getElementsByTagName("Element")){const k=(el.getAttribute("Key")||"").replace(/^&ASC/,"");if(k in vals){const d=el.firstElementChild;if(d)d.setAttribute("Data",String(+vals[k]))}}}

/* keep text upright on a turned or mirrored part (as Multisim does): the text gets the
   inverse turn, and its estimated centre is moved to where the turned centre lands */
const TEXTCLS=/^(CIITSymTextComp|CIITVariableSymText|CODTextComp|CIITPinSymTextComp)/;
function upright(root,M){const inv=[M[0],M[2],M[1],M[3]];const side=M[0]===0;// turned a quarter: text above/below lands beside
 const pc=[...root.getElementsByTagName("CIITPinConnectorComp")].map(e=>[+e.getAttribute("ptCenterX"),+e.getAttribute("ptCenterY")]);
 const ox=pc.length?pc.reduce((a,q)=>a+q[0],0)/pc.length:0,oy=pc.length?pc.reduce((a,q)=>a+q[1],0)/pc.length:0;const orx=ox*M[0]+oy*M[2],ory=ox*M[1]+oy*M[3];const lab=[];
 for(const e of root.getElementsByTagName("*")){if(!TEXTCLS.test(e.tagName)||!e.hasAttribute("Transformer-M20"))continue;
  const rdg=side&&e.tagName==="CIITVariableSymText"&&/^&ASC-?[\d.]+$/.test(e.getAttribute("Output")||"");// meter reading in an upright screen: turn it along the screen
  const txt=(e.getAttribute("Output")||"").replace(/^&(ASC|UNI)/,"").replace(/_uc1[0-9a-f]{4}/g,"x");
  const h=Math.abs(+e.getAttribute("Font-Height")||12),w=txt.length*h*0.6;const ha=+e.getAttribute("HorizontalAlign")||0;
  const dx=ha===1?0:ha===2?-w/2:w/2,dy=h/2;
  const tx=+e.getAttribute("Transformer-M20"),ty=+e.getAttribute("Transformer-M21");const cx=tx+dx,cy=ty+dy;
  let wx=cx*M[0]+cy*M[2]-dx,wy=cx*M[1]+cy*M[3]-dy;// wanted anchor, in the turned frame
  if(rdg){e.setAttribute("Font-Escapement","900");e.setAttribute("Font-Orientation","900");wx=cx*M[0]+cy*M[2]-dy;wy=cx*M[1]+cy*M[3]+w/2}
  const nx=wx*inv[0]+wy*inv[2],ny=wx*inv[1]+wy*inv[3];
  [["Transformer-M00",inv[0]],["Transformer-M01",inv[1]],["Transformer-M10",inv[2]],["Transformer-M11",inv[3]],["Transformer-M20",Math.round(nx*100)/100],["Transformer-M21",Math.round(ny*100)/100]].forEach(([k,v])=>e.setAttribute(k,String(v)))
  if(side&&/^CIITSymTextComp/.test(e.tagName)&&txt)lab.push({e,h,rd:Math.abs(cx*M[0]+cy*M[2]-orx)})}
 if(side&&lab.length){/* name, value… stacked to the right of the part, like a vertical part placed in Multisim */
  const gap=Math.max(...lab.map(l=>l.rd))-6,tot=lab.reduce((a,l)=>a+l.h+2,0);let yy=ory-tot/2;
  for(const l of lab){const wx=orx+Math.max(gap,14),wy=yy;yy+=l.h+2;l.e.setAttribute("HorizontalAlign","0");
   l.e.setAttribute("Transformer-M20",String(Math.round((wx*inv[0]+wy*inv[2])*100)/100));l.e.setAttribute("Transformer-M21",String(Math.round((wx*inv[1]+wy*inv[3])*100)/100))}}}

/* best Multisim orientation: match the directions of the pins */
const MATS=[[1,0,0,1],[0,1,-1,0],[-1,0,0,-1],[0,-1,1,0]];
function orient(local,target){const n=local.length;if(n<2)return{M:[1,0,0,1],off:[target[0][0]-local[0][0],target[0][1]-local[0][1]]};
 const cen=a=>[a.reduce((s,p)=>s+p[0],0)/a.length,a.reduce((s,p)=>s+p[1],0)/a.length];const ct=cen(target);
 let best=null;for(const mir of [0,1])for(const M0 of MATS){const M=mir?[-M0[0],M0[1],-M0[2],M0[3]]:M0;
  const tr=local.map(([x,y])=>[x*M[0]+y*M[2],x*M[1]+y*M[3]]);const cl=cen(tr);let sc=0;
  for(let i=0;i<n;i++){const a=[tr[i][0]-cl[0],tr[i][1]-cl[1]],b=[target[i][0]-ct[0],target[i][1]-ct[1]];const la=Math.hypot(...a)||1,lb=Math.hypot(...b)||1;sc+=(a[0]*b[0]+a[1]*b[1])/(la*lb)}
  sc-=mir*1e-6;if(!best||sc>best.sc+1e-9)best={sc,M,off:[ct[0]-cl[0],ct[1]-cl[1]]}}
 return best}

/* ---------------- export a CEsim document ---------------- */
/* wires that only led to a part with no .ms14 match (a Bode plotter, say) go too, so no loose ends are left */
function pruneWires(doc,H){const keep=[];for(const c of doc.comps){if(c.t==="text")continue;let ok=true;try{ok=!!map(c,{conn:H.conn.get(c.id),H})}catch(e){}if(!ok)continue;H.LIB[c.t].pins.forEach((_,i)=>{const q=H.pinPos(c,i);keep.push(q.x+","+q.y)})}
 const anchors=new Set(keep);let ws=doc.wires.slice();
 const onW=(p,w)=>{for(let j=1;j<w.pts.length;j++){const a=w.pts[j-1],b=w.pts[j];if((a.x===b.x&&p.x===a.x&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y))||(a.y===b.y&&p.y===a.y&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)))return true}return false};
 for(let ch=true;ch;){ch=false;for(let i=ws.length-1;i>=0;i--){const w=ws[i];const ends=[w.pts[0],w.pts[w.pts.length-1]];
   if(ends.some(p=>!anchors.has(p.x+","+p.y)&&!ws.some(o=>o!==w&&onW(p,o)))){ws.splice(i,1);ch=true}}}
 /* a ground symbol left touching nothing goes as well */
 const pinPts=c=>H.LIB[c.t].pins.map((_,i)=>H.pinPos(c,i));
 const comps=doc.comps.filter(c=>{if(c.t!=="gnd")return true;const q=pinPts(c)[0];return ws.some(w=>onW(q,w))||doc.comps.some(o=>o!==c&&o.t!=="gnd"&&pinPts(o).some(r=>r.x===q.x&&r.y===q.y))});
 return ws.length===doc.wires.length&&comps.length===doc.comps.length?doc:Object.assign({},doc,{wires:ws,comps})}
async function exportDoc(doc,H){doc=pruneWires(doc,H);const T=await templates();const B=new Builder(T);const G=9,S=0.9;const warn=[];
 const sn=v=>Math.round(v/G)*G;
 let minx=1e9,miny=1e9;for(const c of doc.comps){const b=H.bbox(c);minx=Math.min(minx,b[0]);miny=Math.min(miny,b[1])}for(const w of doc.wires)for(const q of w.pts){minx=Math.min(minx,q.x);miny=Math.min(miny,q.y)}
 if(!isFinite(minx)){minx=0;miny=0}
 /* instrument symbols stand far above their pins, so leave room for them at the top of the sheet */
 const TOP=doc.comps.some(c=>/^x(sc|bp|fg|la|wg|wm|mm)$/.test(c.t))?480:90;
 const X=x=>sn((x-minx)*S+90),Y=y=>sn((y-miny)*S+TOP);
 const used=new Set(),refOf={},msPin={};// msPin["x,y"] -> [{ref,pin}]
 const K=(x,y)=>x+","+y;
 let auto=0;
 for(const c of doc.comps){const L=H.LIB[c.t];const m=map(c,{conn:H.conn.get(c.id),H});if(!m){if(c.t!=="text")warn.push((c.label||c.t)+" ("+(L&&L.name||c.t)+") has no .ms14 part and was left out");continue}
  let ref=c.t==="gnd"?"G"+(++auto):c.t==="netlabel"?String(c.p.name||"NET"):String(c.label||"").replace(/[^\w+-]/g,"")||((L.prefix||"U")+(++auto));
  if(c.t!=="gnd"&&c.t!=="netlabel"){while(used.has(ref.toUpperCase()))ref=ref+"_"+(++auto);used.add(ref.toUpperCase())}
  const local=B.localPins(m.key);const idx=[],lp=[],tp=[];
  m.pins.forEach((nm,i)=>{if(nm==null)return;const nmx=nm in local?nm:Object.keys(local)[0];const pp=H.pinPos(c,i);idx.push([i,nmx]);lp.push(local[nmx]);tp.push([(pp.x-minx)*S+90,(pp.y-miny)*S+TOP])});
  {const cn=H.conn.get(c.id)||[];const lost=m.pins.map((nm,i)=>nm==null&&cn[i]?L.pins[i][2]:null).filter(Boolean);if(lost.length)warn.push((c.label||c.t)+": pins "+lost.join(", ")+" are left out (only gate 1 of the chip is exported)")}
  const o=orient(lp,tp);const x=sn(o.off[0]),y=sn(o.off[1]);
  const pins=B.add(m.key,ref,x,y,o.M,{params:m.params,strings:m.strings,value:m.value,model:m.model,edit:m.edit,edit2:m.edit2,instEdit:m.instEdit,display:c.t==="netlabel"?ref:undefined});
  refOf[c.id]={ref,m,idx};
  for(const [i,nm] of idx){const pp=H.pinPos(c,i);(msPin[K(pp.x,pp.y)]=msPin[K(pp.x,pp.y)]||[]).push({ref,pin:nm,node:H.pinNodes.get(c.id)[i],conn:H.conn.get(c.id)[i]})}}
 const netName=n=>n===0?"0":String(n);
 /* electrical connections */
 for(const c of doc.comps){const R=refOf[c.id];if(!R)continue;const nodes=H.pinNodes.get(c.id),conn=H.conn.get(c.id)||[];
  for(const [i,nm] of R.idx)if(conn[i]||c.t==="gnd"||c.t==="netlabel")B.connect(R.ref,nm,netName(nodes[i]))}
 /* wires: split at every pin and wire end, merge pass-through points */
 const special=new Map();for(const w of doc.wires){const a=w.pts[0],b=w.pts[w.pts.length-1];special.set(K(a.x,a.y),a);special.set(K(b.x,b.y),b)}
 for(const k in msPin){const [x,y]=k.split(",").map(Number);special.set(k,{x,y})}
 const onSeg=(p,a,b)=>(a.x===b.x&&p.x===a.x&&p.y>Math.min(a.y,b.y)&&p.y<Math.max(a.y,b.y))||(a.y===b.y&&p.y===a.y&&p.x>Math.min(a.x,b.x)&&p.x<Math.max(a.x,b.x));
 let pieces=[];for(const w of doc.wires){let cur=[w.pts[0]];for(let j=1;j<w.pts.length;j++){const a=w.pts[j-1],b=w.pts[j];
   const ins=[...special.values()].filter(p=>onSeg(p,a,b)).sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y));
   for(const p of ins){cur.push(p);pieces.push(cur);cur=[p]}
   cur.push(b);if(j<w.pts.length-1&&special.has(K(b.x,b.y))){pieces.push(cur);cur=[b]}}
  if(cur.length>1)pieces.push(cur)}
 pieces=pieces.map(p=>p.filter((q,i)=>i===0||q.x!==p[i-1].x||q.y!==p[i-1].y)).filter(p=>p.length>1);
 const endCount=()=>{const m=new Map();for(const p of pieces)for(const e of [p[0],p[p.length-1]]){const k=K(e.x,e.y);m.set(k,(m.get(k)||0)+1)}return m};
 for(let changed=true;changed;){changed=false;const cnt=endCount();
  for(const [k,n] of cnt){if(n!==2||msPin[k])continue;const ps=pieces.filter(p=>K(p[0].x,p[0].y)===k||K(p[p.length-1].x,p[p.length-1].y)===k);if(ps.length!==2||ps[0]===ps[1])continue;
   let [a,b]=ps;if(K(a[0].x,a[0].y)===k)a=a.slice().reverse();if(K(b[b.length-1].x,b[b.length-1].y)===k)b=b.slice().reverse();
   pieces=pieces.filter(p=>p!==ps[0]&&p!==ps[1]);pieces.push(a.concat(b.slice(1)));changed=true;break}}
 /* nets of pieces via union-find, using the pins they touch */
 const par=new Map();const f=k=>{if(!par.has(k))par.set(k,k);let r=k;while(par.get(r)!==r)r=par.get(r);par.set(k,r);return r};const u=(a,b)=>par.set(f(a),f(b));
 for(const p of pieces)for(let i=1;i<p.length;i++)u(K(p[i-1].x,p[i-1].y),K(p[i].x,p[i].y));
 const nodeOfRoot=new Map();for(const k in msPin){const r=f(k);if(!nodeOfRoot.has(r))nodeOfRoot.set(r,msPin[k][0].node)}
 const cnt=endCount();const junc=new Map();
 const msXY=k=>{const s=msPin[k][0];const P=B.parts[s.ref][s.pin];return[P.x,P.y]};
 for(const p of pieces){const n=nodeOfRoot.get(f(K(p[0].x,p[0].y)));if(n==null)continue;const net=netName(n);
  const ends=[p[0],p[p.length-1]].map(e=>{const k=K(e.x,e.y);if(msPin[k]){const s=msPin[k][0];return{ref:s.ref,pin:s.pin,xy:msXY(k)}}
   if(!junc.has(k))junc.set(k,B.junction(X(e.x),Y(e.y),net));return{junction:junc.get(k),xy:[X(e.x),Y(e.y)]}});
  let pts=[ends[0].xy,...p.slice(1,-1).map(q=>[X(q.x),Y(q.y)]),ends[1].xy];
  const o=[pts[0]];for(let i=1;i<pts.length;i++){const a=o[o.length-1],b=pts[i];if(a[0]!==b[0]&&a[1]!==b[1]){const horiz=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1]);o.push(i===pts.length-1?(horiz?[a[0],b[1]]:[b[0],a[1]]):(horiz?[b[0],a[1]]:[a[0],b[1]]))}o.push(b)}
  const clean=o.filter((q,i)=>i===0||q[0]!==o[i-1][0]||q[1]!==o[i-1][1]).filter((q,i,a)=>i===0||i===a.length-1||!((a[i-1][0]===q[0]&&q[0]===a[i+1][0])||(a[i-1][1]===q[1]&&q[1]===a[i+1][1])));
  if(clean.length<2)clean.push(clean[0].slice());
  B.wire(clean,ends[0],ends[1],net)}
 /* parts that need extra wiring in Multisim */
 for(const c of doc.comps){const R=refOf[c.id];if(!R||!R.m.extra)continue;const P=B.parts[R.ref];const nodes=H.pinNodes.get(c.id);
  if(R.m.extra==="xsc"&&P["4"]&&P["5"]){const a=P["4"],b=P["5"];const yy=Math.max(a.y,b.y)+9;B.wire([[a.x,a.y],[a.x,yy],[b.x,yy],[b.x,b.y]],{ref:R.ref,pin:"4"},{ref:R.ref,pin:"5"},netName(nodes[2]));B.connect(R.ref,"5",netName(nodes[2]))}
  if(R.m.extra==="seg7"&&P.COM){const g="G"+(++auto);const lp=B.localPins("GROUND")["1"];const gx=P.COM.x-lp[0],gy=P.COM.y-27-lp[1];B.add("GROUND",g,gx,gy,[1,0,0,1]);const gp=B.parts[g]["1"];
   B.connect(R.ref,"COM","0");B.connect(g,"1","0");B.wire([[P.COM.x,P.COM.y],[gp.x,gp.y]],{ref:R.ref,pin:"COM"},{ref:g,pin:"1"},"0")}
  if(R.m.extra==="counter"&&P.QA&&P.INB){const a=P.QA,b=P.INB;const top=Math.min(...Object.values(P).map(q=>q.y))-18,r=a.x+9,l=b.x-9;const net=netName(nodes[2]);
   B.wire([[a.x,a.y],[r,a.y],[r,top],[l,top],[l,b.y],[b.x,b.y]],{ref:R.ref,pin:"QA"},{ref:R.ref,pin:"INB"},net);B.connect(R.ref,"INB",net)}}
 /* the sheet grows to hold the whole design (Multisim keeps the sheet size in the circuit preferences and draws the border to it) */
 {let mx=0,my=0;for(const r in B.parts)for(const q of Object.values(B.parts[r])){mx=Math.max(mx,q.x);my=Math.max(my,q.y)}
  for(const w of doc.wires)for(const q of w.pts){mx=Math.max(mx,X(q.x));my=Math.max(my,Y(q.y))}
  const sw=Math.max(1000,Math.ceil((mx+150)/100)*100),sh=Math.max(1000,Math.ceil((my+150)/100)*100);
  if(sw>1000||sh>1000){const set=(k,v)=>{for(const el of B.doc.getElementsByTagName("Element")){if(el.getAttribute("Key")==="&ASC"+k){const it=el.getElementsByTagName("Item")[0];if(it)it.setAttribute("Value","&ASC"+v)}}};
   set("Sheet Width",sw);set("Sheet Height",sh);set("Sheet Width In Inch",+(sw/96).toFixed(4));set("Sheet Height In Inch",+(sh/96).toFixed(4));set("Sheet Size","Custom");
   const bc=B.doc.getElementsByTagName("CIITBorderComposite")[0];const rc=bc&&bc.getElementsByTagName("CODRectComp")[0];if(rc){rc.setAttribute("pt1X",String(sw));rc.setAttribute("pt1Y",String(sh))}}}
 return{bytes:pack(B.bytes()),warn}}


/* ================= .ms14 import ================= */
/* PKWARE DCL explode (a port of zlib's contrib/blast) */
const XLITR=[11,124,8,7,28,7,188,13,76,4,10,8,12,10,12,10,8,23,8,9,7,6,7,8,7,6,55,8,23,24,12,11,7,9,11,12,6,7,22,5,7,24,6,11,9,6,7,22,7,11,38,7,9,8,25,11,8,11,9,12,8,12,5,38,5,38,5,11,7,5,6,21,6,10,53,8,7,24,10,27,44,253,253,253,252,252,252,13,12,45,12,45,12,61,12,45,44,173];
function xtable(rep){const len=[];for(const c of rep){const n=(c>>4)+1,l=c&15;for(let i=0;i<n;i++)len.push(l)}
 const count=new Array(14).fill(0);for(const l of len)count[l]++;const offs=new Array(14).fill(0);for(let i=1;i<13;i++)offs[i+1]=offs[i]+count[i];
 const sym=[];len.forEach((l,s)=>{if(l)sym[offs[l]++]=s});return{count,sym}}
let XT=null;
function explode(d){if(!XT)XT={lit:xtable(XLITR),len:xtable([2,35,36,53,38,23]),dist:xtable([2,20,53,230,247,151,248])};
 let p=0,bb=0,bc=0;const bits=n=>{let v=bb;while(bc<n){if(p>=d.length)throw new Error("the compressed data ends early");v|=d[p++]<<bc;bc+=8}bb=v>>>n;bc-=n;return v&((1<<n)-1)};
 const dec=h=>{let code=0,first=0,index=0;for(let l=1;l<=13;l++){code|=bits(1)^1;const c=h.count[l];if(code<first+c)return h.sym[index+code-first];index+=c;first+=c;first<<=1;code<<=1}throw new Error("bad compressed data")};
 const lit=bits(8),dict=bits(8);if(lit>1||dict<4||dict>6)throw new Error("not PKWARE DCL data");
 let out=new Uint8Array(Math.max(1024,d.length*4)),n=0;const room=k=>{if(n+k>out.length){const o=new Uint8Array(Math.max(out.length*2,n+k));o.set(out);out=o}};
 for(;;){if(bits(1)){const s=dec(XT.len);const len=BASE[s]+bits(EXTRA[s]);if(len===519)break;const sh=len===2?2:dict;const dist=(dec(XT.dist)<<sh)+bits(sh)+1;if(dist>n)throw new Error("bad distance");room(len);for(let i=0;i<len;i++){out[n]=out[n-dist];n++}}
  else{room(1);out[n++]=lit?dec(XT.lit):bits(8)}}
 return out.subarray(0,n)}
function unpack(bytes){bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);const m=MAGIC.length;
 for(let i=0;i<m;i++)if(bytes[i]!==MAGIC.charCodeAt(i))throw new Error("this is not a Multisim 14 file");
 const u32=o=>(bytes[o]|bytes[o+1]<<8|bytes[o+2]<<16|bytes[o+3]<<24)>>>0;const total=u32(m);let p=m+8;const parts=[];let tot=0;
 while(p+8<=bytes.length){const cl=u32(p+4);p+=8;const z=explode(bytes.subarray(p,p+cl));parts.push(z);tot+=z.length;p+=cl}
 const all=new Uint8Array(tot);let o=0;for(const z of parts){all.set(z,o);o+=z.length}
 if(total&&tot!==total)throw new Error("the file is damaged ("+tot+" of "+total+" bytes)");
 return new TextDecoder("utf-8").decode(all)}

/* Multisim text: "&ASC…" plain, "&UNI…" with _uc1XXXX for other characters */
function mstr(v){v=String(v==null?"":v);if(/^&UNI/.test(v))return v.slice(4).replace(/_uc1([0-9a-fA-F]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16)));return v.replace(/^&ASC/,"")}
function si(x){x=+x;if(!isFinite(x))return "0";return eng(x).replace("µ","u").replace(/\s+$/,"")}
const WAVES=["sine","triangle","square"];
/* Multisim part key -> CEsim type, Multisim pin names in CEsim pin order, and properties from the parameter list */
function revMap(key,fam,tpl,P,q){const v=i=>P.val(i),gate=(t,pins)=>({t,pins});
 for(const g in GATEMS)if(GATEMS[g][0]===key)return gate(g,GATEMS[g].slice(1));
 for(const g in GATECMOS)if(GATECMOS[g][0]===key)return{t:g,pins:GATECMOS[g].slice(1),p:{family:"4000"}};
 for(const t in CHIPMS)if(CHIPMS[t][0]===key)return{t,chip:CHIPMS[t][1]};
 {const xm=/^HC-49\/US?_([\d.]+)MHz$/i.exec(key);if(xm)return{t:"xtal",pins:["X1","X2"],p:{freq:xm[1]+"M"}}}
 switch(key){
  case "GROUND":return{t:"gnd",pins:["1"]};
  case "HC-49/U_11MHz":return{t:"xtal",pins:["X1","X2"],p:{freq:"11M"}};
  case "VCC":return{t:"vcc",pins:["VCC"],p:{voltage:si(v(0)||5)}};
  case "DC_POWER":return{t:"dcv",pins:["1","2"],p:{voltage:si(v(1))}};
  case "DC_CURRENT":return{t:"idc",pins:["1","2"],p:{current:si(v(1))}};
  case "AC_VOLTAGE":case "AC_CURRENT":return{t:key==="AC_VOLTAGE"?"acv":"iac",pins:["1","2"],p:{amp:si(v(1)),offset:si(v(3)),freq:si(v(5)),phase:si(v(11))}};
  case "CLOCK_VOLTAGE":return{t:"clock",pins:["1","2"],p:{freq:si(v(1)),duty:si(v(3)),amp:si(v(5))}};
  case "PULSE_VOLTAGE":{const T=v(13)||1e-3,pw=v(11)||T/2;return{t:"clock",pins:["1","2"],p:{low:si(v(1)),amp:si(v(3)),freq:si(1/T),duty:si(Math.round(pw/T*1000)/10)}}}
  case "VOLTAGE_CONTROLLED_VOLTAGE_SOURCE":return{t:"vcvs",pins:["2","1","4","3"],p:{gain:si(v(1))}};
  case "VOLTAGE_CONTROLLED_CURRENT_SOURCE":return{t:"vccs",pins:["2","1","4","3"],p:{gm:si(v(1))}};
  case "RESISTOR_VIRTUAL":return{t:"res",pins:["1","2"],p:{resistance:si(v(1))}};
  case "CAPACITOR_VIRTUAL":return{t:"cap",pins:["1","2"],p:{capacitance:si(v(1))}};
  case "CAP_ELECTROLIT_VIRTUAL":return{t:"ecap",pins:["1","2"],p:{capacitance:si(v(1))}};
  case "INDUCTOR_VIRTUAL":return{t:"ind",pins:["1","2"],p:{inductance:si(v(1))}};
  case "POTENTIOMETER_VIRTUAL":return{t:"pot",pins:["1","3","2"],p:{resistance:si(v(5))}};
  case "1P1S":{const m=/1\/(\d+(?:\.\d+)?)/.exec(q.all||"");return{t:"xfmr",pins:["p1pos","p1neg","s1pos","s1neg"],p:m?{ratio:m[1]}:{}}}
  case "0.5_AMP":return{t:"fuse",pins:["1","2"]};
  case "SPST":return{t:"spst",pins:["2","1"]};
  case "PB_DPST":return{t:"push",pins:["1","2"]};
  case "SPDT":return{t:"spdt",pins:["2","1","3"]};
  case "EDR201A05":return{t:"relay",pins:["C1","C2","L1","L2"]};
  case "MOTOR_RATED":return{t:"motor",pins:["2","1"]};
  case "1N4007":case "1N4148":return{t:"diode",pins:["A","K"],p:{model:key}};
  case "1N5817G":return{t:"schottky",pins:["A","K"],p:{model:"1N5817"}};
  case "1N4735A":return{t:"zener",pins:["A","K"],p:{model:key}};
  case "LED_red":return{t:"led",pins:["A","K"]};
  case "1B4B42":return{t:"bridge",pins:["AC1","AC2","V+","V-"]};
  case "2N2222A":case "BC107BP":case "BC547B":return{t:"npn",pins:["B","C","E"],p:{model:key}};
  case "2N2907A":return{t:"pnp",pins:["B","C","E"],p:{model:key}};
  case "2N7000":return{t:"nmos",pins:["G","D","S"],p:{model:key}};
  case "2N6804":return{t:"pmos",pins:["G","D","S"],p:{model:key}};
  case "OPAMP_3T_VIRTUAL":return{t:"opamp",pins:["IN+","IN-","OUT",null,null],p:{model:"Ideal"}};
  case "OPAMP_5T_VIRTUAL":return{t:"opamp",pins:["IN+","IN-","OUT","VS+","VS-"],p:{model:"Ideal"}};
  case "UA741CD":return{t:"opamp",pins:["IN+","IN-","OUT","VS+","VS-"],p:{model:"uA741"}};
  case "LM339N":return{t:"comparator",pins:["1IN+","1IN-","1OUT","VS+","VS-"],p:{model:"LM339"}};
  case "2N3370":return{t:"njfet",pins:["G","D","S"]};
  case "2N2608":return{t:"pjfet",pins:["G","D","S"]};
  case "2N1595":return{t:"scr",pins:["A","K","G"]};
  case "1N5758":return{t:"diac",pins:["MT2","MT1"]};
  case "4N25":return{t:"opto",pins:["A","K","C","E"]};
  case "LM555CN":case "555_VIRTUAL":return{t:"timer555",pins:["VCC","RST","TRI","THR","DIS","OUT","CON","GND"]};
  case "LM7805CT":return{t:"reg",pins:["IN","OUT","GND"],p:{model:"LM7805"}};
  case "LM317K":return{t:"lm317",pins:["IN","OUT","ADJ"]};
  case "7474N":return{t:"dff",pins:["1D","1CLK","1Q","~1Q"]};
  case "7476N":return{t:"jkff",pins:["1J","1CLK","1K","1Q","~1Q"]};
  case "7493N":return{t:"counter",pins:["INA","R01","QA","QB","QC","QD"]};
  case "DCD_HEX":return{t:"hexdisp",pins:["1","2","3","4"]};
  case "SEVEN_SEG_COM_K":return{t:"seg7",pins:["A","B","C","D","E","F","G"]};
  case "PROBE":return{t:"probe",pins:["1"]};
  case "VOLTMETER_H":case "VOLTMETER_V":return{t:"voltmeter",pins:["1","2"]};
  case "AMMETER_H":case "AMMETER_V":return{t:"ammeter",pins:["1","2"]};
  case "100V_100W":return{t:"lamp",pins:["1","2"]};
  case "BUZZER":return{t:"buzzer",pins:["1","2"]};
  case "ONPAGE_CONNECTOR":case "GLOBAL_CONNECTOR":return{t:"netlabel",pins:["1"],net:1};
  case "XMM":return{t:"xmm",pins:["1","2"]};
  case "XWM":return{t:"xwm",pins:["1","2","3","4"]};
  case "XBP":{const I=q.inst||{};return{t:"xbp",pins:["1","2","3","4"],p:{fmin:si(I.NI_EWB_HORZ_INITIAL_VALUE??10),fmax:si(I.NI_EWB_HORZ_FINAL_VALUE??1e5)}}}
  case "XLA":return{t:"xla",pins:["1","2","3","4","5","6","7","8"]};
  case "XWG":return{t:"xwg",pins:["1","2","3","4","5","6","7","8"]};
  case "4060BD_5V":case "4060BP_5V":case "4060BT_5V":return{t:"cd4060",pins:["RS","RTC","CTC","MR",null,null,"O3","O4","O5","O6","O7","O8","O9","O11","O12","O13"]};
  case "XFG":{const I=q.inst||{};return{t:"xfg",pins:["1","2","3"],p:{wave:WAVES[+I.NI_EWB_WAVE_MODE]||"sine",freq:si(I.NI_EWB_FREQUENCY_VALUE??1000),amp:si(I.NI_EWB_AMPLITUDE_VALUE??1),offset:si(I.NI_EWB_OFFSET_VALUE??0),duty:si(I.NI_EWB_DEPUTY_CYCLE_VALUE??50)}}}
  case "XSC":{const I=q.inst||{};return{t:"xsc",pins:["1","2","4"],p:{tb:si(I.NI_EWB_TIMEBASE_SCALE_VALUE??1e-3),va:si(I.NI_EWB_A_CHANNEL_SCALE_VALUE??1),vb:si(I.NI_EWB_B_CHANNEL_SCALE_VALUE??1)}}}
 }
 /* other Multisim parts: go by the letter of the SPICE template and its pin names */
 const T=tpl.replace(/^\s+/,""),L=T[0]?T[0].toLowerCase():"",tp=[...T.split(/\r?\n/)[0].matchAll(/%t(\S+)/g)].map(m=>m[1].toUpperCase());
 const has=a=>a.every(x=>tp.includes(x));
 if(L==="r"&&tp.length>=2)return{t:"res",pins:[tp[0],tp[1]],p:{resistance:si(v(1))}};
 if(L==="c"&&tp.length>=2)return{t:/ELECTROLIT/i.test(fam)?"ecap":"cap",pins:[tp[0],tp[1]],p:{capacitance:si(v(1))}};
 if(L==="l"&&tp.length>=2)return{t:"ind",pins:[tp[0],tp[1]],p:{inductance:si(v(1))}};
 if((L==="d"||L==="x")&&tp.length===2&&has(["A","K"]))return{t:/ZENER/i.test(fam)?"zener":/LED/i.test(fam)?"led":/SCHOTTKY/i.test(fam)?"schottky":"diode",pins:["A","K"]};
 if((L==="q"||L==="x")&&has(["B","C","E"]))return{t:/PNP/i.test(fam+" "+(q.all||""))?"pnp":"npn",pins:["B","C","E"]};
 if((L==="m"||L==="x")&&has(["G","D","S"]))return{t:/P_?MOS|PMOS|P-CH/i.test(fam)?"pmos":"nmos",pins:["G","D","S"]};
 if(L==="x"&&has(["IN+","IN-","OUT"]))return{t:"opamp",pins:["IN+","IN-","OUT",has(["VS+"])?"VS+":null,has(["VS-"])?"VS-":null],p:{model:"Ideal"}};
 if(L==="v"&&tp.length>=2)return{t:/\bac\b/i.test(T)&&!/dc\s+#1/i.test(T)?"acv":"dcv",pins:[tp[0],tp[1]],p:/\bac\b/i.test(T)&&!/dc\s+#1/i.test(T)?{}:{voltage:si(v(1))}};
 return null}

/* read a .ms14 design: parts with their nets, where their pins are, and the instrument settings */
function readDoc(bytes){const xml=typeof bytes==="string"?bytes:unpack(bytes);const doc=parser().parseFromString(xml,"text/xml");
 if(doc.getElementsByTagName("parsererror").length)throw new Error("the design inside the file could not be read");
 const kids=(e,tag)=>{const r=[];for(const c of e.children)if(c.tagName===tag)r.push(c);return r};
 const idOf=e=>e.parentNode&&e.parentNode.getAttribute&&e.parentNode.getAttribute("CiID");
 const nodes={};for(const e of doc.getElementsByTagName("CiNode"))nodes[idOf(e)]=mstr(e.getAttribute("LocalName"));
 const ports={};for(const e of doc.getElementsByTagName("CiPort")){const ns=e.getElementsByTagName("Nodes")[0];const it=ns&&ns.getElementsByTagName("Item")[0];
  ports[idOf(e)]={name:mstr(e.getAttribute("LocalName")),comp:e.getAttribute("Component"),node:it?nodes[it.getAttribute("CiID")]:null}}
 const inst={};for(const e of doc.getElementsByTagName("CSourceSymbolCollectNode")){const ref=mstr(e.getAttribute("CompLongName")).split("#")[0];const o=inst[ref]=inst[ref]||{};
  for(const el of e.getElementsByTagName("Element")){const k=mstr(el.getAttribute("Key"));const d=el.getElementsByTagName("CDataElement")[0];if(d&&d.hasAttribute("Data")&&!(k in o))o[k]=d.getAttribute("Data")}}
 const syms={};for(const e of doc.getElementsByTagName("CIITSymbolComp")){const id=e.getAttribute("CiComponent");if(!id)continue;
  const M=["M00","M01","M10","M11","M20","M21"].map(k=>+e.getAttribute("Transformer-"+k)||0);const pins={};
  for(const ps of e.getElementsByTagName("CIITPinSymbolComp")){const pc=ps.getElementsByTagName("CIITPinConnectorComp")[0];if(!pc)continue;const x=+pc.getAttribute("ptCenterX"),y=+pc.getAttribute("ptCenterY");
   pins[mstr(ps.getAttribute("PinName")).toUpperCase()]={x:x*M[0]+y*M[2]+M[4],y:x*M[1]+y*M[3]+M[5],port:ps.getAttribute("PortID")}}
  (syms[id]=syms[id]||[]).push({M,pins})}
 /* wires: each end is a pin of a part (by its port) or a free point */
 const conn={};for(const ps of doc.getElementsByTagName("CIITPinSymbolComp")){const pc=ps.getElementsByTagName("CIITPinConnectorComp")[0];const it=pc&&pc.parentNode;if(it&&it.getAttribute&&it.getAttribute("ID"))conn[it.getAttribute("ID")]=ps.getAttribute("PortID")}
 const ends={};for(const e of doc.getElementsByTagName("CODPinComp")){const it=e.parentNode;const id=it&&it.getAttribute&&it.getAttribute("ID");if(!id)continue;let port=null;const cl=kids(e,"ConnectList")[0];
  if(cl)for(const c of cl.getElementsByTagName("Item")){const pp=conn[c.getAttribute("ID")];if(pp){port=pp;break}}ends[id]=port}
 const wires=[];for(const e of doc.getElementsByTagName("CIITLinkComp")){const pe=kids(e,"Points")[0];if(!pe)continue;const pts=[...pe.getElementsByTagName("Item")].map(i=>({x:+i.getAttribute("X"),y:+i.getAttribute("Y")}));
  if(pts.length<2)continue;wires.push({pts,a:ends[e.getAttribute("Connect1")]||null,b:ends[e.getAttribute("Connect2")]||null})}
 const parts=[],skip=[];
 for(const e of doc.getElementsByTagName("CiComponent")){const id=idOf(e);if(!id)continue;const ref=mstr(e.getAttribute("LocalName"));
  const at=kids(e,"Attributes")[0];if(!at)continue;
  const cs=at.getElementsByTagName("CiaCollString")[0],str=cs?[...cs.getElementsByTagName("Item")].map(i=>mstr(i.getAttribute("Value"))):[];
  const te=at.getElementsByTagName("CiaSpiceTmpltExprt")[0],tpl=te?mstr(te.getAttribute("String")):"";
  const pl=at.getElementsByTagName("CiaParamList")[0];const arr=tag=>{const g=pl&&kids(pl,tag)[0];return g?[...g.getElementsByTagName("Item")].map(i=>i.getAttribute("Value")):[]};
  const dbl=arr("doubles"),par=arr("parameters").map(mstr);
  const P={val:i=>{const s=par[i];if(s!=null&&s!==""){const x=num(s);if(isFinite(x)&&(x!==0||/^[-+]?0/.test(s)))return x}const d=+dbl[i];return isFinite(d)?d:0}};
  let fam=str[0]||"",key=str[1]||"";if(!key&&/^XFG/i.test(ref))key="XFG";if(!key&&/^XSC/i.test(ref))key="XSC";if(!key&&/^XMM/i.test(ref))key="XMM";if(!key&&/^XWM/i.test(ref))key="XWM";if(!key&&/^XBP/i.test(ref))key="XBP";if(!key&&/^XLA/i.test(ref))key="XLA";if(!key&&/^XWG/i.test(ref))key="XWG";
  const myPorts={};const pe=kids(e,"Ports")[0];if(pe)for(const it of pe.getElementsByTagName("Item")){const pt=ports[it.getAttribute("CiID")];if(pt)myPorts[pt.name.toUpperCase()]={...pt,id:it.getAttribute("CiID")}}
  const m=revMap(key,fam,tpl,P,{inst:inst[ref],all:str.join(" ")});
  if(!m){if(key||fam)skip.push(ref+" ("+(key||fam)+")");continue}
  const sy=(syms[id]||[])[0]||{M:[1,0,0,1,0,0],pins:{}};
  parts.push({ref,key,fam,m,ports:myPorts,sym:sy})}
 return{parts,skip,wires,xml}}

/* turn a design into CEsim parts: type, label, properties, net of each pin and where each pin sat in Multisim (CEsim units) */
function importDoc(bytes,H){const R=readDoc(bytes);const S=1/0.9;const out=[],warn=[],portAt={};let nc=0;
 if(R.skip.length)warn.push("No CEsim part for "+R.skip.slice(0,8).join(", ")+(R.skip.length>8?" and "+(R.skip.length-8)+" more":"")+"; left out.");
 for(const q of R.parts){let pins=q.m.pins;const L=H&&H.LIB[q.m.t];if(!L){warn.push(q.ref+": no CEsim part "+q.m.t);continue}
  if(q.m.chip){const e=q.m.chip;const tr=typeof e==="function"?e:n=>e[n]??null;pins=L.pins.map(p=>tr(p[2])??null)}
  const nodes=[],xy=[];
  L.pins.forEach((_,i)=>{const nm=pins[i];const po=nm!=null?q.ports[String(nm).toUpperCase()]:null;const sp=nm!=null?q.sym.pins[String(nm).toUpperCase()]:null;
   nodes.push(po&&po.node!=null?String(po.node):"__NC_"+(++nc));xy.push(sp?{x:sp.x*S,y:sp.y*S}:null)});
  const p=Object.assign({},q.m.p||{});if(q.m.net)p.name=nodes[0];
  const label=q.m.t==="gnd"||q.m.t==="netlabel"?null:q.ref;
  const k=out.length;L.pins.forEach((_,i)=>{const nm=pins[i];const po=nm!=null?q.ports[String(nm).toUpperCase()]:null;if(po)portAt[po.id]={k,i}});
  out.push({t:q.m.t,label,p,nodes,xy,org:{x:q.sym.M[4]*S,y:q.sym.M[5]*S}})}
 const wires=R.wires.filter(w=>!(w.a&&!portAt[w.a])&&!(w.b&&!portAt[w.b])).map(w=>{const pts=w.pts.map(q=>({x:q.x*S,y:q.y*S}));let a=w.a&&portAt[w.a]||null,b=w.b&&portAt[w.b]||null;
  const d=(e,q)=>{const t=e&&out[e.k].xy[e.i];return t?Math.hypot(t.x-q.x,t.y-q.y):0};
  if(d(a,pts[0])+d(b,pts[pts.length-1])>d(b,pts[0])+d(a,pts[pts.length-1])){const t=a;a=b;b=t}return{pts,a,b}});
 return{parts:out,wires,warn}}

root.MS14={exportDoc,importDoc,readDoc,unpack,explode,implode,pack,templates,map,num,eng,MDL};
})(typeof window!=="undefined"?window:globalThis);
