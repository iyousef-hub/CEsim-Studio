/* CEsim VLSI: CMOS layout on a lambda grid. Layers are painted cell by cell; this file has design-rule checking, transistor and net extraction,
   switch-level simulation, cross-section data and CIF / GDSII / SPICE output. */
(function(root){
'use strict';
const LAYERS=['nwell','ndiff','pdiff','poly','m1','m2','m3','contact','via','via2'];
const INFO={nwell:{name:'N-well',desc:'A region of n-type silicon. p-type transistors sit inside it'},ndiff:{name:'N diffusion',desc:'n+ active area. Where poly crosses it you get an nMOS transistor'},pdiff:{name:'P diffusion',desc:'p+ active area, inside an n-well. Where poly crosses it you get a pMOS transistor'},poly:{name:'Polysilicon',desc:'Transistor gates, and short wires'},m1:{name:'Metal 1',desc:'The first metal layer: most wires and the power rails'},m2:{name:'Metal 2',desc:'The second metal layer, above metal 1'},contact:{name:'Contact',desc:'A 2×2 hole that joins metal 1 to poly or diffusion below it'},via:{name:'Via',desc:'A 2×2 hole that joins metal 1 and metal 2'},m3:{name:'Metal 3',desc:'The third metal layer, above metal 2. Long wires and buses'},via2:{name:'Via 2',desc:'A 2×2 hole that joins metal 2 and metal 3'}};
const RULES={width:{ndiff:3,pdiff:3,poly:2,m1:3,m2:3,m3:3,nwell:10},space:{ndiff:3,pdiff:3,poly:2,m1:3,m2:3,m3:3,nwell:6},polyDiff:1,gateOverhang:2,sdExtension:3,wellSurround:5,wellSpace:5,cutSize:2,cutSurround:1,contactGate:2,cutSpace:2};
const K=(x,y)=>x+','+y;const XY=k=>k.split(',').map(Number);
class Layout{constructor(){this.L={};for(const l of LAYERS)this.L[l]=new Set();this.labels=[]}
 has(l,x,y){return this.L[l].has(K(x,y))}
 set(l,x,y,on){if(on)this.L[l].add(K(x,y));else this.L[l].delete(K(x,y))}
 rect(l,x,y,w,h,on=true){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.set(l,i,j,on);return this}
 label(text,x,y){this.labels=this.labels.filter(b=>!(b.x===x&&b.y===y));if(text)this.labels.push({text,x,y});return this}
 clone(){const o=new Layout();for(const l of LAYERS)o.L[l]=new Set(this.L[l]);o.labels=this.labels.map(b=>({...b}));return o}
 bounds(){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const l of LAYERS)for(const k of this.L[l]){const[x,y]=XY(k);if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}for(const b of this.labels){x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x);y1=Math.max(y1,b.y)}return x0===Infinity?null:[x0,y0,x1+1,y1+1]}
 toJSON(){const o={format:'cesim-vlsi',version:1,layers:{},labels:this.labels};for(const l of LAYERS)o.layers[l]=rects(this,l);return o}
 static from(o){const L=new Layout();for(const l of LAYERS)for(const r of(o.layers&&o.layers[l])||[])L.rect(l,r[0],r[1],r[2],r[3]);L.labels=(o.labels||[]).map(b=>{const q={text:String(b.text),x:b.x|0,y:b.y|0};if(b.role==='in'||b.role==='out')q.role=b.role;return q});return L}
 move(cells,dx,dy){// cells: Set of keys inside a box; move every layer and label
  const moved={};for(const l of LAYERS){moved[l]=[];for(const k of[...this.L[l]])if(cells(k)){moved[l].push(XY(k));this.L[l].delete(k)}}for(const l of LAYERS)for(const[x,y]of moved[l])this.L[l].add(K(x+dx,y+dy));for(const b of this.labels)if(cells(K(b.x,b.y))){b.x+=dx;b.y+=dy}}}
/* merge cells into rectangles (rows first, then stack equal rows) */
function rects(lay,l){const S=lay.L[l];if(!S.size)return[];const rows=new Map();for(const k of S){const[x,y]=XY(k);if(!rows.has(y))rows.set(y,[]);rows.get(y).push(x)}
 const runs=[];for(const[y,xs]of rows){xs.sort((a,b)=>a-b);let s=xs[0],p=xs[0];for(let i=1;i<=xs.length;i++){if(i<xs.length&&xs[i]===p+1){p=xs[i];continue}runs.push([s,y,p-s+1]);if(i<xs.length){s=p=xs[i]}}}
 runs.sort((a,b)=>a[0]-b[0]||a[2]-b[2]||a[1]-b[1]);const out=[];const open=new Map();for(const[x,y,w]of runs){const key=x+':'+w;const r=open.get(key);if(r&&r[1]+r[3]===y)r[3]++;else{const nr=[x,y,w,1];out.push(nr);open.set(key,nr)}}return out}
/* ---------------- extraction ---------------- */
function channelType(lay,x,y){if(!lay.has('poly',x,y))return null;if(lay.has('ndiff',x,y))return'n';if(lay.has('pdiff',x,y))return'p';return null}
function extract(lay){const par=new Map();const f=k=>{let r=k;while(par.get(r)!==r)r=par.get(r);let c=k;while(par.get(c)!==r){const n=par.get(c);par.set(c,r);c=n}return r};const add=k=>{if(!par.has(k))par.set(k,k)};const un=(a,b)=>{add(a);add(b);const ra=f(a),rb=f(b);if(ra!==rb)par.set(ra,rb)};
 const cond=l=>(x,y)=>{if(!lay.has(l,x,y))return false;if((l==='ndiff'||l==='pdiff')&&lay.has('poly',x,y))return false;return true};
 for(const l of['ndiff','pdiff','poly','m1','m2','m3']){const ok=cond(l);for(const k of lay.L[l]){const[x,y]=XY(k);if(!ok(x,y))continue;add(l+':'+k);if(ok(x+1,y))un(l+':'+k,l+':'+K(x+1,y));if(ok(x,y+1))un(l+':'+k,l+':'+K(x,y+1))}}
 const errors=[];
 for(const k of lay.L.contact){const[x,y]=XY(k);if(!lay.has('m1',x,y))continue;for(const l of['poly','ndiff','pdiff'])if(cond(l)(x,y))un('m1:'+k,l+':'+k)}
 for(const k of lay.L.via){const[x,y]=XY(k);if(lay.has('m1',x,y)&&lay.has('m2',x,y))un('m1:'+k,'m2:'+k)}
 for(const k of lay.L.via2){const[x,y]=XY(k);if(lay.has('m2',x,y)&&lay.has('m3',x,y))un('m2:'+k,'m3:'+k)}
 // transistors
 const chan=new Map();for(const k of lay.L.poly){const[x,y]=XY(k);const t=channelType(lay,x,y);if(t)chan.set(k,t)}
 const seen=new Set();const tr=[];
 for(const[k,t]of chan){if(seen.has(k))continue;const cells=[];const q=[k];seen.add(k);while(q.length){const c=q.pop();cells.push(c);const[x,y]=XY(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=K(x+dx,y+dy);if(!seen.has(n)&&chan.get(n)===t){seen.add(n);q.push(n)}}}
  const dl=t==='n'?'ndiff':'pdiff';const sd=new Map();let horiz=0,vert=0;const xs=new Set(),ys=new Set();
  for(const c of cells){const[x,y]=XY(c);xs.add(x);ys.add(y);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(chan.has(K(nx,ny)))continue;if(cond(dl)(nx,ny)){const node=f(dl+':'+K(nx,ny));if(!sd.has(node))sd.set(node,[]);sd.get(node).push([nx,ny]);if(dx)horiz++;else vert++}}}
  const gate=f('poly:'+cells[0]);const x0=Math.min(...xs),y0=Math.min(...ys);const box=[x0,y0,Math.max(...xs)+1,Math.max(...ys)+1];const L=horiz>=vert?xs.size:ys.size,W=horiz>=vert?ys.size:xs.size;
  const nodes=[...sd.keys()];const T={type:t,gate,a:nodes[0],b:nodes[1],w:W,l:L,box,cells};if(nodes.length!==2){T.bad=true;errors.push({msg:`A${t==='n'?'n':''} ${t}MOS transistor has ${nodes.length} source/drain terminal${nodes.length===1?'':'s'} instead of 2: the poly must cross the diffusion completely`,box})}tr.push(T)}
 // node naming
 const names=new Map();const nodeAt=(x,y)=>{for(const l of['m3','m2','m1','poly','ndiff','pdiff']){if(cond(l)(x,y))return f(l+':'+K(x,y))}return null};
 const labelNode=new Map();for(const b of lay.labels){const n=nodeAt(b.x,b.y);if(n==null){errors.push({msg:`The label ${b.text} is not on any wire`,box:[b.x,b.y,b.x+1,b.y+1]});continue}const nm=b.text.trim();if(names.has(n)&&names.get(n)!==nm){const o=names.get(n);const pw=v=>/^(vdd|gnd|vss)$/i.test(v);if(pw(o)&&pw(nm)&&o.toLowerCase()!==nm.toLowerCase())errors.push({msg:`Short circuit: ${o} and ${nm} are the same wire`,box:[b.x,b.y,b.x+1,b.y+1]});else errors.push({msg:`The labels ${o} and ${nm} are on the same wire`,box:[b.x,b.y,b.x+1,b.y+1]})}else names.set(n,nm);if(labelNode.has(nm)&&labelNode.get(nm)!==n)errors.push({msg:`Two different wires are both labelled ${nm}. Join them with metal`,box:[b.x,b.y,b.x+1,b.y+1]});labelNode.set(nm,n)}
 let auto=1;const nameOf=n=>{if(n==null)return'?';if(!names.has(n))names.set(n,'n'+(auto++));return names.get(n)};
 const vdd=[...labelNode.entries()].find(([k])=>/^vdd$/i.test(k)),gnd=[...labelNode.entries()].find(([k])=>/^(gnd|vss)$/i.test(k));
 const sdNodes=new Set(),gateNodes=new Set();for(const T of tr){if(T.bad)continue;sdNodes.add(T.a);sdNodes.add(T.b);gateNodes.add(T.gate)}
 const role={};for(const b of lay.labels)if(b.role)role[b.text.trim()]=b.role;
 const inputs=[],outputs=[];for(const[nm,n]of labelNode){if(/^(vdd|gnd|vss)$/i.test(nm))continue;if(role[nm]==='in')inputs.push(nm);else if(role[nm]==='out')outputs.push(nm);else if(sdNodes.has(n))outputs.push(nm);else if(gateNodes.has(n))inputs.push(nm);else inputs.push(nm)}
 const sortN=(a,b)=>a.localeCompare(b,undefined,{numeric:true});inputs.sort(sortN);outputs.sort(sortN);
 tr.forEach((T,i)=>{T.name=(T.type==='n'?'MN':'MP')+(i+1);T.gateName=nameOf(T.gate);T.aName=nameOf(T.a);T.bName=nameOf(T.b)});
 return{tr,nodeAt,nameOf,labelNode,vdd:vdd?vdd[1]:null,gnd:gnd?gnd[1]:null,inputs,outputs,errors,find:f}}
/* ---------------- switch-level simulation ---------------- */
// values: 1, 0, 'X' (conflict or unknown), 'Z' (floating)
function simulate(ex,inputs){const val=new Map();if(ex.vdd!=null)val.set(ex.vdd,1);if(ex.gnd!=null)val.set(ex.gnd,0);const fixed=new Set(val.keys());for(const[nm,v]of Object.entries(inputs)){const n=ex.labelNode.get(nm);if(n!=null&&!fixed.has(n)){val.set(n,v);fixed.add(n)}}
 const T=ex.tr.filter(t=>!t.bad);let shorts=false;
 for(let it=0;it<40;it++){const nodes=new Set();for(const t of T){if(!fixed.has(t.a))nodes.add(t.a);if(!fixed.has(t.b))nodes.add(t.b)}const def=new Map(),pos=new Map();for(const n of nodes){def.set(n,n);pos.set(n,n)}const fd=(m,k)=>{while(m.get(k)!==k)k=m.get(k);return k};const u=(m,a,b)=>{const ra=fd(m,a),rb=fd(m,b);if(ra!==rb)m.set(ra,rb)};
  const dSrc=[],pSrc=[];shorts=false;// sources: [node, value] reached through a transistor from a fixed node
  for(const t of T){const g=val.has(t.gate)?val.get(t.gate):'X';const on=t.type==='n'?g===1:g===0;const maybe=on||g==='X'||g==='Z';if(!maybe)continue;const fa=fixed.has(t.a),fb=fixed.has(t.b);
   if(fa&&fb){if(on&&val.get(t.a)!==val.get(t.b))shorts=true;continue}if(fa||fb){const src=fa?t.a:t.b,oth=fa?t.b:t.a;pSrc.push([oth,val.get(src)]);if(on)dSrc.push([oth,val.get(src)]);continue}if(on)u(def,t.a,t.b);u(pos,t.a,t.b)}
  const gather=(m,src)=>{const G=new Map();for(const[n,v]of src){const r=fd(m,n);if(!G.has(r))G.set(r,new Set());G.get(r).add(v)}return G};const gd=gather(def,dSrc),gp=gather(pos,pSrc);
  const next=new Map();for(const n of nodes){const sd=gd.get(fd(def,n))||new Set(),sp=gp.get(fd(pos,n))||new Set();let v;if(sd.size>1){v='X';shorts=true}else if(sd.size===1){const d=[...sd][0];v=[...sp].every(x=>x===d)?d:'X'}else if(sp.size)v='X';else v='Z';next.set(n,v)}
  let same=true;for(const[n,v]of next)if(val.get(n)!==v){same=false;break}for(const[n,v]of next)val.set(n,v);if(same&&it>0)break}
 const out={};for(const[nm,n]of ex.labelNode)out[nm]=val.has(n)?val.get(n):'Z';return{values:out,nodeVal:val,shorts}}
function truthTable(ex){const ins=ex.inputs.slice(0,6);const rows=[];for(let m=0;m<(1<<ins.length);m++){const iv={};ins.forEach((n,i)=>iv[n]=(m>>(ins.length-1-i))&1);const r=simulate(ex,iv);rows.push({in:iv,out:Object.fromEntries(ex.outputs.map(o=>[o,r.values[o]])),shorts:r.shorts})}return{inputs:ins,outputs:ex.outputs,rows,func:ex.outputs.map(o=>({out:o,name:nameFunction(ins.length,rows.map(r=>r.out[o]))}))}}
function nameFunction(n,col){if(col.some(v=>v!==0&&v!==1))return null;const s=col.join('');const F={1:{'10':'an inverter (NOT)','01':'a buffer'},2:{'1110':'a NAND gate','1000':'a NOR gate','0001':'an AND gate','0111':'an OR gate','0110':'an XOR gate','1001':'an XNOR gate'},3:{'11111110':'a 3-input NAND gate','10000000':'a 3-input NOR gate','00000001':'a 3-input AND gate','01111111':'a 3-input OR gate','10101000':'an AND-OR-INVERT gate (AOI21: NOT(A·B + C))','11101010':'an OR-AND-INVERT gate (OAI21: NOT((A + B)·C))','01101001':'a 3-input XOR gate','00010111':'a majority gate'}};return(F[n]&&F[n][s])||null}
/* ---------------- design rules ---------------- */
function drc(lay,ex){ex=ex||extract(lay);const out=[];const R=RULES;const push=(msg,box,kind)=>{out.push({msg,box,kind})};const has=(l,x,y)=>lay.has(l,x,y);
 const comps=l=>{const id=new Map();let n=0;for(const k of lay.L[l]){if(id.has(k))continue;const q=[k];id.set(k,n);while(q.length){const c=q.pop();const[x,y]=XY(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nk=K(x+dx,y+dy);if(lay.L[l].has(nk)&&!id.has(nk)){id.set(nk,n);q.push(nk)}}}n++}return id};
 // width: every cell must lie inside some w×w square fully on the layer
 for(const[l,w]of Object.entries(R.width)){const S=lay.L[l];if(!S.size)continue;const cov=new Set();for(const k of S){const[x,y]=XY(k);let full=true;for(let j=0;j<w&&full;j++)for(let i=0;i<w;i++)if(!S.has(K(x+i,y+j))){full=false;break}if(full)for(let j=0;j<w;j++)for(let i=0;i<w;i++)cov.add(K(x+i,y+j))}const bad=[...S].filter(k=>!cov.has(k));for(const b of boxes(bad))push(`${INFO[l].name} is narrower than ${w}λ`,b,'width')}
 // spacing between separate shapes of one layer
 const spaceRule=(l1,l2,s,msg)=>{const A=lay.L[l1],B=lay.L[l2];if(!A.size||!B.size)return;const idA=comps(l1),idB=l1===l2?idA:null;const bad=[];for(const k of A){const[x,y]=XY(k);for(let dy=-s;dy<=s;dy++)for(let dx=-s;dx<=s;dx++){if(!dx&&!dy)continue;const nk=K(x+dx,y+dy);if(!B.has(nk))continue;if(l1===l2&&idA.get(nk)===idA.get(k))continue;if(l1!==l2&&A.has(nk))continue;const gx=Math.max(0,Math.abs(dx)-1),gy=Math.max(0,Math.abs(dy)-1);if(gx*gx+gy*gy<s*s&&(gx||gy||l1!==l2))bad.push(k)}}for(const b of boxes(bad))push(msg,b,'space')};
 for(const[l,s]of Object.entries(R.space))spaceRule(l,l,s,`${INFO[l].name} shapes are closer than ${s}λ`);
 spaceRule('ndiff','pdiff',R.space.ndiff,'N and P diffusion are closer than 3λ');
 // poly must keep 1λ from diffusion it does not cross
 {const bad=[];for(const k of lay.L.poly){const[x,y]=XY(k);if(channelType(lay,x,y))continue;let nearChan=false;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(channelType(lay,x+dx,y+dy))nearChan=true;if(nearChan)continue;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if((has('ndiff',nx,ny)||has('pdiff',nx,ny))&&!has('poly',nx,ny)){bad.push(k);break}}}for(const b of boxes(bad))push('Poly runs right next to diffusion without crossing it. Keep 1λ between them','poly-diff')}
 // transistors: poly overhang and source/drain extension
 for(const T of ex.tr){if(T.bad)continue;const[x0,y0,x1,y1]=T.box;const dl=T.type==='n'?'ndiff':'pdiff';const horiz=(()=>{let h=0;for(let y=y0;y<y1;y++){if(has(dl,x0-1,y)&&!has('poly',x0-1,y))h++;if(has(dl,x1,y)&&!has('poly',x1,y))h++}return h>0})();
  let okO=true,okE=true;if(horiz){for(let x=x0;x<x1;x++)for(let d=1;d<=R.gateOverhang;d++){if(!has('poly',x,y0-d)||!has('poly',x,y1-1+d))okO=false}for(let y=y0;y<y1;y++)for(let d=1;d<=R.sdExtension;d++){if(!has(dl,x0-d,y)||!has(dl,x1-1+d,y))okE=false}}
  else{for(let y=y0;y<y1;y++)for(let d=1;d<=R.gateOverhang;d++){if(!has('poly',x0-d,y)||!has('poly',x1-1+d,y))okO=false}for(let x=x0;x<x1;x++)for(let d=1;d<=R.sdExtension;d++){if(!has(dl,x,y0-d)||!has(dl,x,y1-1+d))okE=false}}
  if(!okO)push(`The gate of ${T.name} must extend ${R.gateOverhang}λ past the diffusion, or the transistor cannot switch off`,T.box,'overhang');if(!okE)push(`The diffusion of ${T.name} must extend ${R.sdExtension}λ past the gate on both sides`,T.box,'extension');if(T.l<2)push(`${T.name} is shorter than the minimum 2λ channel`,T.box,'length')}
 for(const e of ex.errors)if(/terminal/.test(e.msg))push(e.msg,e.box,'transistor');
 // wells
 {const bad=[],bad2=[];const W=R.wellSurround;for(const k of lay.L.pdiff){const[x,y]=XY(k);let ok=true;for(let dy=-W;dy<=W&&ok;dy++)for(let dx=-W;dx<=W;dx++)if(!has('nwell',x+dx,y+dy)){ok=false;break}if(!ok)bad.push(k)}for(const k of lay.L.ndiff){const[x,y]=XY(k);let ok=true;for(let dy=-R.wellSpace;dy<=R.wellSpace&&ok;dy++)for(let dx=-R.wellSpace;dx<=R.wellSpace;dx++)if(has('nwell',x+dx,y+dy)){ok=false;break}if(!ok)bad2.push(k)}
  for(const b of boxes(bad))push(`P diffusion must be inside the n-well with ${W}λ to spare on every side`,b,'well');for(const b of boxes(bad2))push(`N diffusion must stay ${R.wellSpace}λ away from the n-well`,b,'well')}
 // cuts: contacts and vias are 2×2, surrounded by 1λ of the layers they join
 for(const cut of['contact','via','via2']){const id=comps(cut);const groups=new Map();for(const[k,i]of id){if(!groups.has(i))groups.set(i,[]);groups.get(i).push(XY(k))}
  for(const cells of groups.values()){const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);const x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs)+1,y1=Math.max(...ys)+1;const box=[x0,y0,x1,y1];const nm=cut==='contact'?'A contact':cut==='via'?'A via':'A via 2';
   if(x1-x0!==2||y1-y0!==2||cells.length!==4){push(`${nm} must be exactly 2×2λ`,box,'cut');continue}
   const ring=l=>{for(let y=y0-1;y<=y1;y++)for(let x=x0-1;x<=x1;x++)if(!has(l,x,y))return false;return true};
   if(cut==='contact'){if(!ring('m1'))push('Metal 1 must cover a contact with 1λ to spare',box,'surround');const under=['poly','ndiff','pdiff'].filter(l=>cells.every(([x,y])=>has(l,x,y)));const chan=cells.some(([x,y])=>channelType(lay,x,y));
    if(chan)push('A contact cannot sit on a transistor gate',box,'cut');else if(!under.length)push('A contact needs poly or diffusion under it',box,'cut');else if(!ring(under[0]))push(`${INFO[under[0]].name} must cover a contact with 1λ to spare`,box,'surround');
    if(!chan&&under[0]!=='poly'){let near=false;for(const T of ex.tr){const[a,b,c,d]=T.box;const gx=Math.max(0,a-x1,x0-c),gy=Math.max(0,b-y1,y0-d);if(gx<R.contactGate&&gy<R.contactGate&&(gx||gy))near=true}if(near)push(`A diffusion contact must be ${R.contactGate}λ from a gate`,box,'cut')}}
   else if(cut==='via'){if(!ring('m1')||!ring('m2'))push('Metal 1 and metal 2 must both cover a via with 1λ to spare',box,'surround');if(cells.some(([x,y])=>has('contact',x,y)))push('A via cannot sit on a contact',box,'cut')}
   else{if(!ring('m2')||!ring('m3'))push('Metal 2 and metal 3 must both cover a via 2 with 1λ to spare',box,'surround')}}
  spaceRule(cut,cut,R.cutSpace,`${cut==='contact'?'Contacts':cut==='via'?'Vias':'Vias 2'} are closer than ${R.cutSpace}λ`)}
 // labels and power
 for(const e of ex.errors)if(!/terminal/.test(e.msg))push(e.msg,e.box,'label');
 return out}
function boxes(keys){// group cells into small boxes for reporting
 const S=new Set(keys);const seen=new Set();const out=[];for(const k of keys){if(seen.has(k))continue;const q=[k];seen.add(k);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;while(q.length){const c=q.pop();const[x,y]=XY(c);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const n=K(x+dx,y+dy);if(S.has(n)&&!seen.has(n)){seen.add(n);q.push(n)}}}out.push([x0,y0,x1+1,y1+1])}return out}
/* ---------------- output formats ---------------- */
function toSpice(lay,ex,name,lambda){ex=ex||extract(lay);lambda=lambda||0.3;const L=[`* ${name||'cell'}: extracted from a CEsim VLSI layout, lambda = ${lambda} um`,`.subckt ${(name||'cell').replace(/\W+/g,'_')} ${[...ex.inputs,...ex.outputs,'VDD','GND'].join(' ')}`];
 const nm=n=>{const s=ex.nameOf(n);return /^(gnd|vss)$/i.test(s)?'GND':/^vdd$/i.test(s)?'VDD':s};for(const T of ex.tr){if(T.bad)continue;const body=T.type==='n'?'GND':'VDD';L.push(`${T.name} ${nm(T.a)} ${nm(T.gate)} ${nm(T.b)} ${body} ${T.type==='n'?'NMOS':'PMOS'} W=${+(T.w*lambda).toFixed(3)}u L=${+(T.l*lambda).toFixed(3)}u`)}
 L.push('.ends');L.push(`.model NMOS NMOS (LEVEL=1 VTO=0.7 KP=110u)`);L.push(`.model PMOS PMOS (LEVEL=1 VTO=-0.7 KP=50u)`);return L.join('\n')+'\n'}
// SCMOS layer numbers
const GDS={nwell:42,ndiff:43,pdiff:43,poly:46,m1:49,m2:51,m3:62,contact:25,via:50,via2:61};const CIFN={nwell:'CWN',ndiff:'CAA',pdiff:'CAA',poly:'CPG',m1:'CMF',m2:'CMS',m3:'CMT',contact:'CCC',via:'CVA',via2:'CVS'};
function toCIF(lay,name,lambda){lambda=lambda||0.3;const u=Math.round(lambda*100);// CIF units are 0.01 µm
 const H=(lay.bounds()||[0,0,0,0])[3];const L=[`(CIF written by CEsim VLSI, lambda = ${lambda} um);`,'DS 1 1 1;',`9 ${(name||'cell').replace(/\W+/g,'_')};`];
 const sel={ndiff:'CSN',pdiff:'CSP'};for(const l of LAYERS){const rs=rects(lay,l);if(!rs.length)continue;const emit=(layer)=>{L.push(`L ${layer};`);for(const[x,y,w,h]of rs)L.push(`B ${w*u} ${h*u} ${(x+w/2)*u} ${(H-y-h/2)*u};`)};emit(CIFN[l]);if(sel[l])emit(sel[l])}
 for(const b of lay.labels)L.push(`94 ${b.text} ${(b.x+0.5)*u} ${(H-b.y-0.5)*u};`);L.push('DF;','C 1;','E');return L.join('\n')+'\n'}
function toGDS(lay,name,lambda){lambda=lambda||0.3;const db=1e-3;// database unit 1 nm
 const bytes=[];const rec=(type,dt,data)=>{const len=4+data.length;bytes.push(len>>8,len&255,type,dt,...data)};const i16=v=>[(v>>8)&255,v&255];const i32=v=>[(v>>>24)&255,(v>>16)&255,(v>>8)&255,v&255];
 const str=s=>{const a=[...String(s)].map(c=>c.charCodeAt(0)&127);if(a.length%2)a.push(0);return a};
 const real8=v=>{if(v===0)return[0,0,0,0,0,0,0,0];let s=0;if(v<0){s=0x80;v=-v}let e=64;while(v>=1){v/=16;e++}while(v<1/16){v*=16;e--}const out=[s|e];for(let i=0;i<7;i++){v*=256;const d=Math.floor(v);out.push(d);v-=d}return out};
 const now=new Date();const t=[now.getFullYear(),now.getMonth()+1,now.getDate(),now.getHours(),now.getMinutes(),now.getSeconds()];const ts=[...t,...t].flatMap(i16);
 rec(0x00,0x02,i16(600));rec(0x01,0x02,ts);rec(0x02,0x06,str('CESIM'));rec(0x03,0x05,[...real8(1e-3),...real8(1e-9)]);
 rec(0x05,0x02,ts);rec(0x06,0x06,str((name||'cell').replace(/\W+/g,'_').toUpperCase()));
 const H=(lay.bounds()||[0,0,0,0])[3];const U=v=>Math.round(v*lambda*1000);
 const sel={ndiff:45,pdiff:44};for(const l of LAYERS){const rs=rects(lay,l);const put=layer=>{for(const[x,y,w,h]of rs){rec(0x08,0x00,[]);rec(0x0d,0x02,i16(layer));rec(0x0e,0x02,i16(0));const X0=U(x),X1=U(x+w),Y0=U(H-y-h),Y1=U(H-y);rec(0x10,0x03,[X0,Y0,X1,Y0,X1,Y1,X0,Y1,X0,Y0].flatMap(i32));rec(0x11,0x00,[])}};put(GDS[l]);if(sel[l])put(sel[l])}
 for(const b of lay.labels){rec(0x0c,0x00,[]);rec(0x0d,0x02,i16(GDS.m1));rec(0x16,0x02,i16(0));rec(0x10,0x03,[U(b.x+0.5),U(H-b.y-0.5)].flatMap(i32));rec(0x19,0x06,str(b.text));rec(0x11,0x00,[])}
 rec(0x07,0x00,[]);rec(0x04,0x00,[]);return Uint8Array.from(bytes)}

/* ---------------- Microwind layout (.MSK) and DSCH schematic (.sch) ---------------- */
const DSCH_SYM={"pmos":["BB(0,-10,20,10)","TITLE 15 0  #pmos","MODEL 902","PROP   1.0u 0.12u MP                                                                                                                               ","REC(1,-5,19,15,r)","VIS 4","PIN(20,-10,0.000,0.000)s","PIN(0,0,0.000,0.000)g","PIN(20,10,0.010,0.003)d","LIG(0,0,6,0)","LIG(8,0,8,0)","LIG(10,6,10,-6)","LIG(12,6,12,-6)","LIG(20,-6,12,-6)","LIG(20,-10,20,-6)","LIG(20,6,12,6)","LIG(20,10,20,6)","VLG pmos pmos(drain,source,gate);"],"vdd":["BB(-5,-10,5,0)","TITLE -2 -4  #vdd","MODEL 1","PROP                                                                                                                                    ","REC(-75,-15,0,0,\u0001)","VIS 0","PIN(0,0,0.000,0.000)vdd","LIG(0,0,0,-5)","LIG(0,-5,-5,-5)","LIG(-5,-5,0,-10)","LIG(0,-10,5,-5)","LIG(5,-5,0,-5)"],"light":["BB(-2,-15,4,-1)","TITLE 0 -1  #out1","MODEL 49","PROP                                                                                                                                    ","REC(-1,-14,4,4,r)","VIS 1","PIN(0,0,0.000,0.000)out1","LIG(3,-9,3,-14)","LIG(3,-14,2,-15)","LIG(-1,-14,-1,-9)","LIG(2,-4,2,-7)","LIG(1,-4,4,-4)","LIG(1,-2,3,-4)","LIG(2,-2,4,-4)","LIG(-2,-7,4,-7)","LIG(0,-7,0,0)","LIG(-2,-9,-2,-7)","LIG(4,-9,-2,-9)","LIG(4,-7,4,-9)","LIG(0,-15,-1,-14)","LIG(2,-15,0,-15)"],"button":["BB(-9,-4,0,4)","TITLE -5 0  #in1","MODEL 59","PROP                                                                                                                                    ","REC(-8,-3,6,6,r)","VIS 1","PIN(0,0,0.000,0.000)in1","LIG(-1,0,0,0)","LIG(-9,4,-9,-4)","LIG(-1,4,-9,4)","LIG(-1,-4,-1,4)","LIG(-9,-4,-1,-4)","LIG(-8,3,-8,-3)","LIG(-2,3,-8,3)","LIG(-2,-3,-2,3)","LIG(-8,-3,-2,-3)"],"nmos":["BB(0,-10,20,10)","TITLE 15 0  #nmos","MODEL 901","PROP   0.48u 0.12u MN                                                                                                                               ","REC(1,-5,19,15,r)","VIS 4","PIN(20,10,0.000,0.000)s","PIN(0,0,0.000,0.000)g","PIN(20,-10,0.010,0.003)d","LIG(10,0,0,0)","LIG(10,6,10,-6)","LIG(12,6,12,-6)","LIG(20,-6,12,-6)","LIG(20,-10,20,-6)","LIG(20,6,12,6)","LIG(20,10,20,6)","VLG nmos nmos(drain,source,gate);"],"vss":["BB(-5,2,5,10)","TITLE -1 7  #vss","MODEL 0","PROP                                                                                                                                    ","REC(-5,0,0,0,b)","VIS 0","PIN(0,0,0.000,0.000)vss","LIG(0,0,0,5)","LIG(-5,5,5,5)","LIG(-5,8,-3,5)","LIG(-3,8,-1,5)","LIG(-1,8,1,5)","LIG(1,8,3,5)"]};
const MW_LAYER={nwell:'NW',ndiff:'DN',pdiff:'DP',poly:'PO',m1:'ME',m2:'M2',m3:'M3',contact:'CO',via:'VI',via2:'V2'};
const MW_BACK={NW:'nwell',DN:'ndiff',DP:'pdiff',PO:'poly',ME:'m1',M2:'m2',M3:'m3',CO:'contact',VI:'via',V2:'via2'};
const p2=n=>String(n).padStart(2,'0');
function mwStamp(){const d=new Date();return `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${p2(d.getFullYear()%100)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ?`}
/* a label point that lies inside its wire: the corner of the label cell whose four cells all carry that layer */
function labelPoint(lay,b){const top=['m3','m2','m1','poly','ndiff','pdiff'].find(l=>lay.has(l,b.x,b.y));const X=b.x,Y=-b.y-1;if(!top)return[X,Y];
 for(const[cx,cy]of[[b.x,b.y],[b.x+1,b.y],[b.x,b.y+1],[b.x+1,b.y+1]])if(lay.has(top,cx-1,cy-1)&&lay.has(top,cx,cy-1)&&lay.has(top,cx-1,cy)&&lay.has(top,cx,cy))return[cx,-cy];return[X,Y]}
function toMSK(lay,ex,name){ex=ex||extract(lay);const nm=(name||'cell').replace(/[^\w.-]+/g,'_')+'.MSK';const out=[];const bb=lay.bounds()||[0,0,1,1];
 const X0=bb[0],Y0=-bb[3],X1=bb[2],Y1=-bb[1];
 out.push('VERSION '+mwStamp(),'FIG #'+nm,`BB(${X0},${Y0},${X1},${Y1})`);
 const ins=ex.inputs.filter(n=>!/^(vdd|gnd|vss)$/i.test(n));const n=Math.max(1,ins.length);
 out.push('SIMU #'+(Math.max(5,2**n*1.0)).toFixed(2),`ZOOM(${X0-10},${Y0-5},${X1+5},${Y1+5})`);
 for(const l of LAYERS)for(const[x,y,w,h]of rects(lay,l))out.push(`REC(${x},${-(y+h)},${w},${h},${MW_LAYER[l]})`);
 const f4=v=>v.toFixed(4);
 for(const b of lay.labels){const t=b.text.trim();if(!t)continue;const[X,Y]=labelPoint(lay,b);out.push(`TITLE ${X} ${Y}  #${t}`);
  if(/^vdd$/i.test(t))out.push('$1 1000 0 ');else if(/^(gnd|vss)$/i.test(t))out.push('$0 1000 0 ');
  else{const i=ins.indexOf(t);if(i>=0){const h=2**i;out.push(`$c 1000 0 ${f4(h-0.02)} ${f4(h)} ${f4(2*h-0.02)} ${f4(2*h)} `)}else out.push('$v 1000 0 ')}}
 out.push('FFIG '+nm);return out.join('\r\n')+'\r\n'}
function fromMSK(text){const L=new Layout();const lines=String(text).replace(/\r/g,'').split('\n');const skipped=new Set();let last=null;
 for(const ln of lines){let m=/^REC\((-?\d+),(-?\d+),(\d+),(\d+),(\w+)\)/.exec(ln);if(m){const l=MW_BACK[m[5]];if(!l){skipped.add(m[5]);continue}const x=+m[1],Y=+m[2],w=+m[3],h=+m[4];L.rect(l,x,-(Y+h),w,h);continue}
  m=/^TITLE (-?\d+) (-?\d+)\s+#(.*)$/.exec(ln);if(m){last={text:m[3].trim(),x:+m[1],y:-(+m[2])-1};continue}
  if(last&&/^\$/.test(ln)){if(!/^\$-/.test(ln)&&last.text&&!/\s/.test(last.text)){// pick the cell next to the point that is on a wire
    const c=[[0,0],[-1,0],[0,1],[-1,1]].map(([dx,dy])=>[last.x+dx,last.y+dy]).find(([x,y])=>['m3','m2','m1','poly','ndiff','pdiff'].some(l=>L.has(l,x,y)))||[last.x,last.y];L.label(last.text,c[0],c[1]);const lb=L.labels.find(q=>q.x===c[0]&&q.y===c[1]);if(lb){if(/^\$[cp]/.test(ln))lb.role='in';else if(/^\$v/.test(ln))lb.role='out'}}last=null}}
 return{L,skipped:[...skipped]}}
/* DSCH: one symbol per transistor, a button per input, a lamp per output, VDD and VSS; every net runs on its own horizontal track */
function toSCH(lay,ex,name,lambda){ex=ex||extract(lay);lambda=lambda||0.06;const nm=(name||'cell').replace(/[^\w.-]+/g,'_')+'.sch';
 const tr=ex.tr.filter(T=>!T.bad);const syms=[],wires=[],ends=new Map();const um=v=>(+(v*lambda).toFixed(3))+'u';
 const P=(x,y)=>x+','+y;const seg=(x1,y1,x2,y2)=>{if(x1===x2&&y1===y2)return;wires.push([x1,y1,x2,y2]);for(const k of[P(x1,y1),P(x2,y2)])ends.set(k,(ends.get(k)||0)+1)};
 const pad=s=>('PROP   '+s).padEnd(147,' ');
 const place=(kind,gx,gy,title,prop,pinName)=>{const T=DSCH_SYM[kind];const o=['SYM  #'+kind];
  for(let l of T){l=l.replace(/^(BB|LIG)\((-?\d+),(-?\d+),(-?\d+),(-?\d+)\)/,(m,k,a,b,c,d)=>`${k}(${+a+gx},${+b+gy},${+c+gx},${+d+gy})`)
   .replace(/^REC\((-?\d+),(-?\d+),/,(m,a,b)=>`REC(${+a+gx},${+b+gy},`).replace(/^PIN\((-?\d+),(-?\d+),([^)]*)\)(.*)$/,(m,a,b,c,n)=>`PIN(${+a+gx},${+b+gy},${c})${pinName&&!/^(s|g|d)$/.test(n)?pinName:n}`)
   .replace(/^TITLE (-?\d+) (-?\d+)\s+#.*$/,(m,a,b)=>`TITLE ${+a+gx} ${+b+gy}  #${title}`);if(/^PROP/.test(l))l=pad(prop||'');o.push(l)}o.push('FSYM');syms.push(o.join('\r\n'))};
 /* tracks: VDD, inputs, inner nets, outputs, GND */
 const vddN=ex.vdd!=null?ex.nameOf(ex.vdd):null,gndN=ex.gnd!=null?ex.nameOf(ex.gnd):null;
 const used=new Set();for(const T of tr){used.add(T.gateName);used.add(T.aName);used.add(T.bName)}
 const ins=ex.inputs.filter(n=>used.has(n)),outs=ex.outputs.filter(n=>used.has(n));
 const order=[];const addN=n=>{if(n!=null&&used.has(n)&&!order.includes(n))order.push(n)};addN(vddN);ins.forEach(addN);[...used].filter(n=>n!==vddN&&n!==gndN&&!ins.includes(n)&&!outs.includes(n)).sort().forEach(addN);outs.forEach(addN);addN(gndN);
 const TY={};order.forEach((n,k)=>TY[n]=30+10*k);const taps={};order.forEach(n=>taps[n]=[]);
 const D=50;tr.forEach((T,i)=>{const gx=i*D,gy=0;const isN=T.type==='n';
  let top=T.aName,bot=T.bName;// nMOS: source (bottom) toward GND; pMOS: source (top) toward VDD
  if(isN){if(top===gndN||(bot!==gndN&&top===vddN))[top,bot]=[bot,top]}else{if(bot===vddN||(top!==vddN&&bot===gndN))[top,bot]=[bot,top]}
  place(isN?'nmos':'pmos',gx,gy,isN?'nmos':'pmos',`${um(T.w)} ${um(T.l)} ${T.name}`);
  seg(gx,0,gx,TY[T.gateName]);taps[T.gateName].push(gx);
  seg(gx+20,10,gx+20,TY[bot]);taps[bot].push(gx+20);
  seg(gx+20,-10,gx+28,-10);seg(gx+28,-10,gx+28,TY[top]);taps[top].push(gx+28)});
 const right=(tr.length-1)*D+40;let li=0,ri=0;
 order.forEach((n,k)=>{const y=TY[n];const xs=[...new Set(taps[n])].sort((a,b)=>a-b);
  if(n===vddN||n===gndN||ins.includes(n)){const x=-30-15*(li++);xs.unshift(x);
   if(n===vddN)place('vdd',x,y,'vdd');else if(n===gndN)place('vss',x,y,'vss');else place('button',x,y,n,'',n)}
  if(outs.includes(n)){const x=right+15*(ri++);xs.push(x);place('light',x,y,n,'',n)}
  for(let i=1;i<xs.length;i++)seg(xs[i-1],y,xs[i],y)});
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const s of syms){const m=/BB\((-?\d+),(-?\d+),(-?\d+),(-?\d+)\)/.exec(s);x0=Math.min(x0,+m[1]);y0=Math.min(y0,+m[2]);x1=Math.max(x1,+m[3]);y1=Math.max(y1,+m[4])}
 for(const w of wires){x0=Math.min(x0,w[0],w[2]);x1=Math.max(x1,w[0],w[2]);y0=Math.min(y0,w[1],w[3]);y1=Math.max(y1,w[1],w[3])}
 const cnc=[...ends].filter(([k,c])=>c>=3).map(([k])=>'CNC('+k.replace(',',' ')+')');
 return['DSCH 3.8','VERSION '+mwStamp(),`BB(${x0},${y0},${x1},${y1})`,...syms,...cnc,...wires.map(w=>`LIG(${w.join(',')})`),'FFIG '+nm].join('\r\n')+'\r\n'}
/* cross-section: what is at each column along row y */
function section(lay,y,x0,x1){const cols=[];for(let x=x0;x<x1;x++){const c={x};for(const l of LAYERS)c[l]=lay.has(l,x,y);c.gate=!!channelType(lay,x,y);cols.push(c)}return cols}
const api={LAYERS,INFO,RULES,Layout,rects,extract,simulate,truthTable,nameFunction,drc,toSpice,toCIF,toGDS,toMSK,fromMSK,toSCH,section,channelType,K,XY};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VL=api;
})(typeof window!=='undefined'?window:globalThis);
