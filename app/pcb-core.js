/* CEsim PCB: footprints, copper connectivity, ratsnest, design rules, a grid autorouter, and Gerber RS-274X / Excellon output. Units are millimetres, Y grows downwards. */
(function(root){
'use strict';
/* ---------------- footprints ---------------- */
// pad: {n:name, x, y, shape:'rect'|'round'|'oval', w, h, drill (0 = SMD on top)}
function th(n,x,y,shape,w,h,drill){return{n:String(n),x,y,shape,w,h:h==null?w:h,drill}}
function smd(n,x,y,w,h){return{n:String(n),x,y,shape:'rect',w,h,drill:0}}
function dip(N,wide){const pads=[];const h=N/2,row=wide?15.24:7.62;for(let i=0;i<h;i++)pads.push(th(i+1,0,i*2.54,i===0?'rect':'oval',2.4,1.6,0.8));for(let i=0;i<h;i++)pads.push(th(h+i+1,row,(h-1-i)*2.54,'oval',2.4,1.6,0.8));
 const yb=(h-1)*2.54;return{pads,silk:[['rect',1.2,-1.4,row-2.4,yb+2.8],['arc',row/2,-1.4,1,0,180]],body:[1.2,-1.4,row-2.4,yb+2.8,'#1d1d1d']}}
function header(N){const pads=[];for(let i=0;i<N;i++)pads.push(th(i+1,0,i*2.54,i===0?'rect':'round',1.7,1.7,1.0));return{pads,silk:[['rect',-1.33,-1.33,2.66,N*2.54+0.12]],body:[-1.27,-1.27,2.54,N*2.54,'#222']}}
const FP={
 'R_Axial':{name:'Resistor, axial, 10.16 mm',pads:[th(1,0,0,'round',1.6,1.6,0.8),th(2,10.16,0,'round',1.6,1.6,0.8)],silk:[['rect',1.93,-1.25,6.3,2.5],['line',0.9,0,1.93,0],['line',8.23,0,9.26,0]],body:[1.93,-1.25,6.3,2.5,'#d8c49a']},
 'D_DO41':{name:'Diode, axial DO-41',pads:[th('K',0,0,'rect',2.2,2.2,1.1),th('A',10.16,0,'oval',2.2,2.2,1.1)],silk:[['rect',2.6,-1.4,4.96,2.8],['line',3.4,-1.4,3.4,1.4],['line',3.6,-1.4,3.6,1.4],['line',1.2,0,2.6,0],['line',7.56,0,8.96,0]],body:[2.6,-1.4,4.96,2.8,'#222']},
 'LED_5mm':{name:'LED, 5 mm',pads:[th('K',0,0,'rect',1.8,1.8,0.9),th('A',2.54,0,'round',1.8,1.8,0.9)],silk:[['circle',1.27,0,3.0],['line',-1.73,-1.5,-1.73,1.5]],body:null},
 'LED_0805':{name:'LED, 0805 SMD',pads:[smd('K',0,0,1.0,1.2),smd('A',2.0,0,1.0,1.2)],silk:[['line',-0.8,-0.9,2.6,-0.9],['line',-0.8,0.9,2.6,0.9],['line',-0.8,-0.9,-0.8,0.9]],body:null},
 'R_0805':{name:'Resistor, 0805 SMD',pads:[smd(1,0,0,1.0,1.4),smd(2,1.9,0,1.0,1.4)],silk:[['line',0.6,-1.0,1.3,-1.0],['line',0.6,1.0,1.3,1.0]],body:null},
 'C_0805':{name:'Capacitor, 0805 SMD',pads:[smd(1,0,0,1.0,1.4),smd(2,1.9,0,1.0,1.4)],silk:[['line',0.6,-1.0,1.3,-1.0],['line',0.6,1.0,1.3,1.0]],body:null},
 'C_Disc':{name:'Capacitor, ceramic, 5.08 mm',pads:[th(1,0,0,'round',1.6,1.6,0.8),th(2,5.08,0,'round',1.6,1.6,0.8)],silk:[['rect',-0.9,-1.5,6.88,3.0]],body:null},
 'CP_Radial':{name:'Capacitor, electrolytic, 6.3 mm',pads:[th('+',0,0,'rect',1.6,1.6,0.8),th('-',2.5,0,'round',1.6,1.6,0.8)],silk:[['circle',1.25,0,3.3],['line',-2.0,-2.2,-2.0,-1.0],['line',-2.6,-1.6,-1.4,-1.6]],body:null},
 'TO-92':{name:'Transistor, TO-92 (E B C)',pads:[th('E',0,0,'rect',1.5,1.05*1.5,0.75),th('B',2.54,0,'oval',1.05,1.5,0.75),th('C',5.08,0,'oval',1.05,1.5,0.75)],silk:[['line',0.74,1.85,4.34,1.85],['arc',2.54,0,2.7,200,340]],body:null},
 'Pot_Trim':{name:'Potentiometer, 3 pins',pads:[th(1,0,0,'rect',1.8,1.8,1.0),th(2,2.54,0,'round',1.8,1.8,1.0),th(3,5.08,0,'round',1.8,1.8,1.0)],silk:[['rect',-2.1,-6.5,9.28,8.0],['circle',2.54,-2.6,2.2]],body:null},
 'SW_Push_6mm':{name:'Push button, 6 mm',pads:[th(1,0,0,'round',2.0,2.0,1.1),th(1,6.5,0,'round',2.0,2.0,1.1),th(2,0,4.5,'round',2.0,2.0,1.1),th(2,6.5,4.5,'round',2.0,2.0,1.1)],silk:[['rect',0.25,-0.75,6.0,6.0],['circle',3.25,2.25,1.75]],body:null},
 'Terminal_2':{name:'Screw terminal, 2 pins',pads:[th(1,0,0,'rect',2.4,2.4,1.2),th(2,5.08,0,'round',2.4,2.4,1.2)],silk:[['rect',-2.54,-4.0,10.16,8.0],['line',-2.54,2.5,7.62,2.5]],body:[-2.54,-4,10.16,8,'#2c7a3a']},
 'Header_1x2':Object.assign({name:'Pin header 1×2'},header(2)),'Header_1x3':Object.assign({name:'Pin header 1×3'},header(3)),'Header_1x4':Object.assign({name:'Pin header 1×4'},header(4)),'Header_1x6':Object.assign({name:'Pin header 1×6'},header(6)),
 'DIP-8':Object.assign({name:'DIP-8 chip'},dip(8)),'DIP-14':Object.assign({name:'DIP-14 chip'},dip(14)),'DIP-16':Object.assign({name:'DIP-16 chip'},dip(16)),
 'Seg7':{name:'7-segment display',pads:[...[1,2,3,4,5].map((n,i)=>th(n,i*2.54,15.24,n===1?'rect':'round',1.6,1.6,0.8)),...[6,7,8,9,10].map((n,i)=>th(n,(4-i)*2.54,0,'round',1.6,1.6,0.8))],silk:[['rect',-1.8,-2.3,13.76,19.84]],body:[-1.8,-2.3,13.76,19.84,'#2a2d31']},
};
/* ---------------- geometry ---------------- */
function rotPt(x,y,r){r=((r%360)+360)%360;if(r===90)return[-y,x];if(r===180)return[-x,-y];if(r===270)return[y,-x];return[x,y]}
function padsOf(c){const f=FP[c.fp];if(!f)return[];return f.pads.map((p,i)=>{const[x,y]=rotPt(p.x,p.y,c.rot||0);const sw=(c.rot||0)%180!==0;return{...p,i,ref:c.ref,x:c.x+x,y:c.y+y,w:sw?p.h:p.w,h:sw?p.w:p.h}})}
const R2=v=>Math.round(v*1e4)/1e4;
function segSeg(ax,ay,bx,by,cx,cy,dx,dy){// min distance between segments AB and CD
 if(segInter(ax,ay,bx,by,cx,cy,dx,dy))return 0;return Math.min(ptSeg(ax,ay,cx,cy,dx,dy),ptSeg(bx,by,cx,cy,dx,dy),ptSeg(cx,cy,ax,ay,bx,by),ptSeg(dx,dy,ax,ay,bx,by))}
function ptSeg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay;const l=vx*vx+vy*vy;let t=l?((px-ax)*vx+(py-ay)*vy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-ax-t*vx,py-ay-t*vy)}
function segInter(ax,ay,bx,by,cx,cy,dx,dy){const o=(px,py,qx,qy,rx,ry)=>Math.sign((qx-px)*(ry-py)-(qy-py)*(rx-px));const o1=o(ax,ay,bx,by,cx,cy),o2=o(ax,ay,bx,by,dx,dy),o3=o(cx,cy,dx,dy,ax,ay),o4=o(cx,cy,dx,dy,bx,by);return o1*o2<0&&o3*o4<0}
// copper shapes: {k:'cap', a:[x,y], b:[x,y], r} or {k:'box', x0,y0,x1,y1}
function padShape(p){if(p.shape==='round')return{k:'cap',a:[p.x,p.y],b:[p.x,p.y],r:p.w/2};if(p.shape==='oval'){if(p.w>=p.h){const d=(p.w-p.h)/2;return{k:'cap',a:[p.x-d,p.y],b:[p.x+d,p.y],r:p.h/2}}const d=(p.h-p.w)/2;return{k:'cap',a:[p.x,p.y-d],b:[p.x,p.y+d],r:p.w/2}}return{k:'box',x0:p.x-p.w/2,y0:p.y-p.h/2,x1:p.x+p.w/2,y1:p.y+p.h/2}}
function boxEdges(s){return[[s.x0,s.y0,s.x1,s.y0],[s.x1,s.y0,s.x1,s.y1],[s.x1,s.y1,s.x0,s.y1],[s.x0,s.y1,s.x0,s.y0]]}
const inBox=(s,x,y)=>x>=s.x0&&x<=s.x1&&y>=s.y0&&y<=s.y1;
function shapeDist(s,t){// signed-ish gap (<=0 means touching/overlapping)
 if(s.k==='cap'&&t.k==='cap')return segSeg(s.a[0],s.a[1],s.b[0],s.b[1],t.a[0],t.a[1],t.b[0],t.b[1])-s.r-t.r;
 if(s.k==='box'&&t.k==='cap')return shapeDist(t,s);
 if(s.k==='cap'&&t.k==='box'){if(inBox(t,s.a[0],s.a[1])||inBox(t,s.b[0],s.b[1]))return-s.r;let m=Infinity;for(const e of boxEdges(t))m=Math.min(m,segSeg(s.a[0],s.a[1],s.b[0],s.b[1],...e));return m-s.r}
 if(s.x1<t.x0||t.x1<s.x0||s.y1<t.y0||t.y1<s.y0){const dx=Math.max(0,t.x0-s.x1,s.x0-t.x1),dy=Math.max(0,t.y0-s.y1,s.y0-t.y1);return Math.hypot(dx,dy)}return-1}
function bbox(s){if(s.k==='box')return[s.x0,s.y0,s.x1,s.y1];return[Math.min(s.a[0],s.b[0])-s.r,Math.min(s.a[1],s.b[1])-s.r,Math.max(s.a[0],s.b[0])+s.r,Math.max(s.a[1],s.b[1])+s.r]}
/* ---------------- copper model ---------------- */
// every piece of copper: {kind:'pad'|'trace'|'via', layers:['F','B'], shape, net, ref}
function copper(doc){const items=[];const netOf=(ref,n)=>(doc.nets||{})[ref+'.'+n]||'';
 for(const c of doc.comps)for(const p of padsOf(c))items.push({kind:'pad',layers:p.drill?['F','B']:['F'],shape:padShape(p),net:netOf(c.ref,p.n),ref:c.ref,pad:p.n,p});
 doc.traces.forEach((t,i)=>items.push({kind:'trace',i,layers:[t.layer],shape:{k:'cap',a:t.a,b:t.b,r:t.w/2},net:t.net||'',t}));
 doc.vias.forEach((v,i)=>items.push({kind:'via',i,layers:['F','B'],shape:{k:'cap',a:[v.x,v.y],b:[v.x,v.y],r:v.d/2},net:v.net||'',v}));
 for(const it of items)it.bb=bbox(it.shape);return items}
const share=(a,b)=>a.layers.some(l=>b.layers.includes(l));
const near=(a,b,m)=>!(a.bb[2]+m<b.bb[0]||b.bb[2]+m<a.bb[0]||a.bb[3]+m<b.bb[1]||b.bb[3]+m<a.bb[1]);
function clusters(items){const par=items.map((_,i)=>i);const f=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i]}return i};
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(!share(a,b)||!near(a,b,0.001))continue;if(a.kind==='pad'&&b.kind==='pad'&&a.ref===b.ref&&a.pad===b.pad){par[f(i)]=f(j);continue}if(shapeDist(a.shape,b.shape)<=1e-4)par[f(i)]=f(j)}
 // pads of the same component with the same name are joined inside the part
 const seen=new Map();items.forEach((it,i)=>{if(it.kind!=='pad')return;const k=it.ref+'.'+it.pad;if(seen.has(k))par[f(i)]=f(seen.get(k));else seen.set(k,i)});
 return items.map((_,i)=>f(i))}
function nets(doc){const s=new Set(Object.values(doc.nets||{}).filter(Boolean));return[...s].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}
/* ratsnest: for each net, connect the copper islands that hold its pads with the shortest pad-to-pad lines */
function ratsnest(doc,items,cl){items=items||copper(doc);cl=cl||clusters(items);const lines=[];const byNet=new Map();items.forEach((it,i)=>{if(it.kind!=='pad'||!it.net)return;if(!byNet.has(it.net))byNet.set(it.net,[]);byNet.get(it.net).push(i)});
 for(const[net,idx]of byNet){const groups=new Map();for(const i of idx){const c=cl[i];if(!groups.has(c))groups.set(c,[]);groups.get(c).push(items[i])}const G=[...groups.values()];if(G.length<2)continue;
  const inT=[0];const rest=new Set(G.map((_,i)=>i).slice(1));while(rest.size){let best=null;for(const a of inT)for(const b of rest)for(const pa of G[a])for(const pb of G[b]){const d=Math.hypot(pa.p.x-pb.p.x,pa.p.y-pb.p.y);if(!best||d<best.d)best={d,a,b,pa,pb}}inT.push(best.b);rest.delete(best.b);lines.push({net,a:[best.pa.p.x,best.pa.p.y],b:[best.pb.p.x,best.pb.p.y],pa:best.pa,pb:best.pb,len:best.d})}}
 return lines}
/* ---------------- design rule check ---------------- */
const DEF_RULES={clearance:0.25,trace:0.4,minTrace:0.2,via:0.9,viaDrill:0.45,minDrill:0.3,edge:0.5,annular:0.15};
function drc(doc){const R=Object.assign({},DEF_RULES,doc.rules||{});const items=copper(doc);const cl=clusters(items);const out=[];const W=doc.board.w,H=doc.board.h;
 // shorts: a copper island that touches pads of two different nets
 const isl=new Map();items.forEach((it,i)=>{if(!isl.has(cl[i]))isl.set(cl[i],[]);isl.get(cl[i]).push(it)});
 for(const g of isl.values()){const ns=[...new Set(g.filter(x=>x.kind==='pad'&&x.net).map(x=>x.net))];if(ns.length>1){const pads=g.filter(x=>x.kind==='pad');const at=g.find(x=>x.kind!=='pad')||pads[0];out.push({sev:'error',kind:'short',msg:`Short circuit: copper joins the nets ${ns.join(' and ')} (${pads.slice(0,4).map(p=>p.ref+'.'+p.pad).join(', ')})`,at:center(at.shape)})}}
 // clearance
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(!share(a,b)||cl[i]===cl[j]||!near(a,b,R.clearance))continue;if(a.kind==='pad'&&b.kind==='pad'&&a.ref===b.ref)continue;if(a.net&&a.net===b.net)continue;const d=shapeDist(a.shape,b.shape);if(d<R.clearance-1e-4){const at=mid(a.shape,b.shape);out.push({sev:'error',kind:'clearance',msg:`Too close: ${desc(a)} and ${desc(b)} are ${Math.max(0,d).toFixed(2)} mm apart (the rule is ${R.clearance} mm)`,at})}}
 // widths, vias, board edge
 doc.traces.forEach(t=>{if(t.w<R.minTrace-1e-6)out.push({sev:'error',kind:'width',msg:`A track is ${t.w} mm wide, thinner than the ${R.minTrace} mm minimum`,at:[(t.a[0]+t.b[0])/2,(t.a[1]+t.b[1])/2]})});
 doc.vias.forEach(v=>{if(v.drill<R.minDrill-1e-6)out.push({sev:'error',kind:'drill',msg:`A via drill of ${v.drill} mm is smaller than ${R.minDrill} mm`,at:[v.x,v.y]});if((v.d-v.drill)/2<R.annular-1e-6)out.push({sev:'error',kind:'annular',msg:'A via ring is too thin to drill reliably',at:[v.x,v.y]})});
 for(const it of items){const[x0,y0,x1,y1]=it.bb;if(x0<R.edge-1e-4||y0<R.edge-1e-4||x1>W-R.edge+1e-4||y1>H-R.edge+1e-4)out.push({sev:'error',kind:'edge',msg:`${desc(it)} is ${x0<0||y0<0||x1>W||y1>H?'outside the board':'too close to the board edge'}`,at:center(it.shape)})}
 // courtyard overlaps
 for(let i=0;i<doc.comps.length;i++)for(let j=i+1;j<doc.comps.length;j++){const a=compBox(doc.comps[i]),b=compBox(doc.comps[j]);if(a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3])out.push({sev:'warning',kind:'overlap',msg:`${doc.comps[i].ref} and ${doc.comps[j].ref} overlap`,at:[(Math.max(a[0],b[0])+Math.min(a[2],b[2]))/2,(Math.max(a[1],b[1])+Math.min(a[3],b[3]))/2]})}
 // unconnected
 const rn=ratsnest(doc,items,cl);for(const l of rn)out.push({sev:'warning',kind:'unrouted',msg:`Not connected yet: ${l.pa.ref}.${l.pa.pad} to ${l.pb.ref}.${l.pb.pad} (net ${l.net})`,at:[(l.a[0]+l.b[0])/2,(l.a[1]+l.b[1])/2]});
 // dead-end tracks with no net
 items.forEach((it,i)=>{if(it.kind==='trace'&&!it.net){const g=isl.get(cl[i]);if(!g.some(x=>x.kind==='pad'))out.push({sev:'warning',kind:'dangling',msg:'A track is not connected to any pad',at:center(it.shape)})}});
 return{items:out,ratsnest:rn,errors:out.filter(x=>x.sev==='error').length,warnings:out.filter(x=>x.sev==='warning').length}}
function desc(it){if(it.kind==='pad')return`pad ${it.ref}.${it.pad}`;if(it.kind==='via')return`a via${it.net?' ('+it.net+')':''}`;return`a track${it.net?' ('+it.net+')':''}`}
function center(s){if(s.k==='box')return[(s.x0+s.x1)/2,(s.y0+s.y1)/2];return[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2]}
function mid(a,b){const p=center(a),q=center(b);return[(p[0]+q[0])/2,(p[1]+q[1])/2]}
function compBox(c){const f=FP[c.fp];let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const add=(x,y)=>{const[a,b]=rotPt(x,y,c.rot||0);x0=Math.min(x0,c.x+a);x1=Math.max(x1,c.x+a);y0=Math.min(y0,c.y+b);y1=Math.max(y1,c.y+b)};
 for(const p of f.pads){add(p.x-p.w/2,p.y-p.h/2);add(p.x+p.w/2,p.y+p.h/2)}for(const s of f.silk){if(s[0]==='rect'){add(s[1],s[2]);add(s[1]+s[3],s[2]+s[4])}else if(s[0]==='circle'){add(s[1]-s[3],s[2]-s[3]);add(s[1]+s[3],s[2]+s[3])}}const m=0.25;return[x0-m,y0-m,x1+m,y1+m]}
/* ---------------- autorouter (grid A* on two layers) ---------------- */
function autoroute(doc,opt){opt=opt||{};const R=Object.assign({},DEF_RULES,doc.rules||{});const g=opt.grid||0.3175;const W=doc.board.w,H=doc.board.h;const nx=Math.floor(W/g)+1,ny=Math.floor(H/g)+1;const tw=opt.width||R.trace;const vd=R.via,vdr=R.viaDrill;const t0=Date.now();const timeLimit=opt.timeLimit||8000;
 const netIds=new Map();const nid=n=>{if(!netIds.has(n))netIds.set(n,netIds.size+1);return netIds.get(n)};
 const maps={F:new Int32Array(nx*ny),B:new Int32Array(nx*ny)};// 0 free, >0 owned by net, -1 blocked
 const inflate=tw/2+R.clearance;const edgeKeep=R.edge+tw/2;
 const mark=(layer,shape,net,extra)=>{const m=maps[layer];const id=net?nid(net):-1;const bb=bbox(shape);const pad=inflate+(extra||0);const i0=Math.max(0,Math.floor((bb[0]-pad)/g)),i1=Math.min(nx-1,Math.ceil((bb[2]+pad)/g)),j0=Math.max(0,Math.floor((bb[1]-pad)/g)),j1=Math.min(ny-1,Math.ceil((bb[3]+pad)/g));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=i*g,y=j*g;const d=shapeDist({k:'cap',a:[x,y],b:[x,y],r:0},shape);if(d<pad-1e-6){const k=j*nx+i;const cur=m[k];if(cur===0)m[k]=id;else if(cur!==id)m[k]=-1}}};
 const items=copper(doc);for(const it of items)for(const l of it.layers)mark(l,it.shape,it.net);
 for(const l of['F','B']){const m=maps[l];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=i*g,y=j*g;if(x<edgeKeep||y<edgeKeep||x>W-edgeKeep||y>H-edgeKeep)m[j*nx+i]=-1}}
 const viaR=Math.ceil((vd/2-tw/2)/g);const okCell=(l,k,id)=>{const v=maps[l][k];return v===0||v===id};
 const viaOk=(i,j,id)=>{for(let dj=-viaR;dj<=viaR;dj++)for(let di=-viaR;di<=viaR;di++){if(di*di+dj*dj>viaR*viaR+1)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)return false;const k=b*nx+a;if(!okCell('F',k,id)||!okCell('B',k,id))return false}return true};
 const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];const VIA_COST=opt.viaCost||12;
 const layers=opt.layers||['F','B'];const pref=opt.prefer||'B';
 const results={routed:0,failed:[],traces:[],vias:[]};
 let rn=ratsnest(doc).sort((a,b)=>a.len-b.len);
 const work=JSON.parse(JSON.stringify({traces:doc.traces,vias:doc.vias}));
 for(let pass=0;pass<200&&rn.length;pass++){const ln=rn[0];if(Date.now()-t0>timeLimit){results.failed.push(...rn.map(l=>l));break}
  const id=nid(ln.net);const ci=(x)=>Math.max(0,Math.min(nx-1,Math.round(x/g))),cj=(y)=>Math.max(0,Math.min(ny-1,Math.round(y/g)));
  const sL=ln.pa.p.drill?layers:['F'],tL=ln.pb.p.drill?layers:['F'];const si=ci(ln.a[0]),sj=cj(ln.a[1]),ti=ci(ln.b[0]),tj=cj(ln.b[1]);
  // A*
  const LN=layers.length;const S=nx*ny*LN;const gS=new Float32Array(S).fill(Infinity);const from=new Int32Array(S).fill(-1);const closed=new Uint8Array(S);const heap=new Heap();
  const L=l=>layers.indexOf(l);const h=(i,j)=>{const dx=Math.abs(i-ti),dy=Math.abs(j-tj);return(Math.max(dx,dy)-Math.min(dx,dy))+Math.SQRT2*Math.min(dx,dy)};
  for(const l of sL){if(L(l)<0)continue;const k=(L(l)*ny+sj)*nx+si;gS[k]=0;heap.push(k,h(si,sj))}
  let found=-1;let it=0;const tSet=new Set(tL.filter(l=>L(l)>=0).map(l=>(L(l)*ny+tj)*nx+ti));
  while(heap.size){const k=heap.pop();if(closed[k])continue;closed[k]=1;if(tSet.has(k)){found=k;break}if(++it>400000)break;const li=Math.floor(k/(nx*ny)),r=k-li*nx*ny,j=Math.floor(r/nx),i=r-j*nx;const lname=layers[li];
   for(const[di,dj,c]of DIRS){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)continue;const kk=(li*ny+b)*nx+a;if(closed[kk])continue;const cell=b*nx+a;if(!okCell(lname,cell,id)&&!tSet.has(kk))continue;if(di&&dj&&(!okCell(lname,j*nx+a,id)||!okCell(lname,b*nx+i,id)))continue;
    let cost=gS[k]+c*(lname===pref?1:1.15);const pk=from[k];if(pk>=0){const pr=pk%(nx*ny);const pj=Math.floor(pr/nx),pi=pr-pj*nx;if(pi-i!==-di||pj-j!==-dj)cost+=0.35}if(cost<gS[kk]){gS[kk]=cost;from[kk]=k;heap.push(kk,cost+h(a,b))}}
   if(LN>1){const oi=1-li;const kk=(oi*ny+j)*nx+i;if(!closed[kk]&&viaOk(i,j,id)){const cost=gS[k]+VIA_COST;if(cost<gS[kk]){gS[kk]=cost;from[kk]=k;heap.push(kk,cost+h(i,j))}}}}
  if(found<0){results.failed.push(ln);rn=rn.slice(1);continue}
  // walk back
  const path=[];for(let k=found;k>=0;k=from[k]){const li=Math.floor(k/(nx*ny)),r=k-li*nx*ny,j=Math.floor(r/nx),i=r-j*nx;path.push([i,j,layers[li]])}path.reverse();
  const segs=[],vias=[];let st=0;for(let q=1;q<=path.length;q++){const endRun=q===path.length||path[q][2]!==path[q-1][2];if(endRun){if(q-1>st)segs.push(...simplify(path.slice(st,q)));if(q<path.length)vias.push(path[q-1]);st=q}}
  for(const s of segs){const a=[R2(s[0][0]*g),R2(s[0][1]*g)],b=[R2(s[1][0]*g),R2(s[1][1]*g)];if(segs.indexOf(s)===0){}const tr={a,b,w:tw,layer:s[2],net:ln.net};results.traces.push(tr);work.traces.push(tr);mark(s[2],{k:'cap',a,b,r:tw/2},ln.net,0)}
  for(const v of vias){const vv={x:R2(v[0]*g),y:R2(v[1]*g),d:vd,drill:vdr,net:ln.net};results.vias.push(vv);work.vias.push(vv);for(const l of['F','B'])mark(l,{k:'cap',a:[vv.x,vv.y],b:[vv.x,vv.y],r:vd/2},ln.net,0)}
  // snap the ends exactly onto the pad centres
  const first=results.traces.length-segs.length;if(segs.length){const f=results.traces[first],l=results.traces[results.traces.length-1];f.a=[ln.a[0],ln.a[1]];l.b=[ln.b[0],ln.b[1]]}
  results.routed++;
  rn=ratsnest(Object.assign({},doc,{traces:work.traces,vias:work.vias})).sort((a,b)=>a.len-b.len).filter(l=>!results.failed.some(f=>f.pa===l.pa&&f.pb===l.pb||(f.pa.ref===l.pa.ref&&f.pa.pad===l.pa.pad&&f.pb.ref===l.pb.ref&&f.pb.pad===l.pb.pad)))}
 results.ms=Date.now()-t0;return results}
function simplify(run){// run of [i,j,layer] cells -> straight segments
 const out=[];let s=run[0],prevD=null;for(let q=1;q<run.length;q++){const d=[run[q][0]-run[q-1][0],run[q][1]-run[q-1][1]];if(prevD&&(d[0]!==prevD[0]||d[1]!==prevD[1])){out.push([[s[0],s[1]],[run[q-1][0],run[q-1][1]],s[2]]);s=run[q-1]}prevD=d}out.push([[s[0],s[1]],[run[run.length-1][0],run[run.length-1][1]],s[2]]);return out.filter(x=>x[0][0]!==x[1][0]||x[0][1]!==x[1][1])}
class Heap{constructor(){this.k=[];this.p=[]}get size(){return this.k.length}push(k,p){const K=this.k,P=this.p;K.push(k);P.push(p);let i=K.length-1;while(i>0){const q=(i-1)>>1;if(P[q]<=P[i])break;[K[q],K[i]]=[K[i],K[q]];[P[q],P[i]]=[P[i],P[q]];i=q}}
 pop(){const K=this.k,P=this.p;const top=K[0];const lk=K.pop(),lp=P.pop();if(K.length){K[0]=lk;P[0]=lp;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<K.length&&P[l]<P[m])m=l;if(r<K.length&&P[r]<P[m])m=r;if(m===i)break;[K[m],K[i]]=[K[i],K[m]];[P[m],P[i]]=[P[i],P[m]];i=m}}return top}}
/* ---------------- stroke font for silkscreen text ---------------- */
const FONT={A:'0,6 0,2 2,0 4,2 4,6;0,4 4,4',B:'0,0 0,6 3,6 4,5 4,4 3,3 0,3;0,0 3,0 4,1 4,2 3,3',C:'4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5',D:'0,0 0,6 2,6 4,4 4,2 2,0 0,0',E:'4,0 0,0 0,6 4,6;0,3 3,3',F:'4,0 0,0 0,6;0,3 3,3',G:'4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3 2,3',H:'0,0 0,6;4,0 4,6;0,3 4,3',I:'1,0 3,0;2,0 2,6;1,6 3,6',J:'4,0 4,5 3,6 1,6 0,5',K:'0,0 0,6;4,0 0,4;1,3 4,6',L:'0,0 0,6 4,6',M:'0,6 0,0 2,3 4,0 4,6',N:'0,6 0,0 4,6 4,0',O:'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0',P:'0,6 0,0 3,0 4,1 4,2 3,3 0,3',Q:'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0;2,4 4,6',R:'0,6 0,0 3,0 4,1 4,2 3,3 0,3;2,3 4,6',S:'4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5',T:'0,0 4,0;2,0 2,6',U:'0,0 0,5 1,6 3,6 4,5 4,0',V:'0,0 2,6 4,0',W:'0,0 1,6 2,3 3,6 4,0',X:'0,0 4,6;4,0 0,6',Y:'0,0 2,3 4,0;2,3 2,6',Z:'0,0 4,0 0,6 4,6',
 0:'1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0;0,5 4,1',1:'1,1 2,0 2,6;1,6 3,6',2:'0,1 1,0 3,0 4,1 4,2 0,6 4,6',3:'0,1 1,0 3,0 4,1 4,2 3,3 4,4 4,5 3,6 1,6 0,5;2,3 3,3',4:'3,6 3,0 0,4 4,4',5:'4,0 0,0 0,3 3,3 4,4 4,5 3,6 0,6',6:'3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,4 3,3 0,3',7:'0,0 4,0 1,6',8:'1,0 3,0 4,1 4,2 3,3 1,3 0,2 0,1 1,0;1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3',9:'4,3 1,3 0,2 0,1 1,0 3,0 4,1 4,5 3,6 1,6','+':'2,1 2,5;0,3 4,3','-':'0,3 4,3','.':'2,5.6 2,6','_':'0,6 4,6',' ':''};
function textStrokes(str,x,y,size,rot){// returns polylines in mm; text centred at x,y
 const s=String(str).toUpperCase();const k=size/6;const adv=5*k;const w=s.length*adv-k;const out=[];[...s].forEach((ch,ci)=>{const d=FONT[ch];if(d==null)return;for(const part of d.split(';')){if(!part)continue;const pts=part.split(' ').map(q=>q.split(',').map(Number)).map(([u,v])=>{const lx=-w/2+ci*adv+u*k,ly=-size/2+v*k;const[a,b]=rotPt(lx,ly,rot||0);return[x+a,y+b]});out.push(pts)}});return out}
/* silk polylines of a component, in board coordinates */
function silkOf(c){const f=FP[c.fp];const P=(x,y)=>{const[a,b]=rotPt(x,y,c.rot||0);return[c.x+a,c.y+b]};const out=[];
 for(const s of f.silk){if(s[0]==='line')out.push([P(s[1],s[2]),P(s[3],s[4])]);else if(s[0]==='rect'){const[x,y,w,h]=s.slice(1);out.push([P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h),P(x,y)])}else if(s[0]==='circle'||s[0]==='arc'){const[cx,cy,r]=s.slice(1);const a0=s[0]==='arc'?s[4]:0,a1=s[0]==='arc'?s[5]:360;const pts=[];const n=Math.max(8,Math.round((a1-a0)/10));for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;pts.push(P(cx+r*Math.cos(a),cy+r*Math.sin(a)))}out.push(pts)}}
 return out}
function refPos(c){const b=compBox(c);return[(b[0]+b[2])/2,b[1]-1.2]}
/* ---------------- Gerber and Excellon ---------------- */
function gerberFiles(doc,name){name=name||'board';const W=doc.board.w,H=doc.board.h;const F=v=>Math.round(v*1e6).toString();const X=x=>F(x),Y=y=>F(H-y);
 function writer(fn,attr){const ap=new Map();let next=10;const body=[];let cur=null;const apOf=def=>{if(!ap.has(def))ap.set(def,next++);return ap.get(def)};const sel=def=>{const d=apOf(def);if(cur!==d){body.push(`D${d}*`);cur=d}};
  return{flash(def,x,y){sel(def);body.push(`X${X(x)}Y${Y(y)}D03*`)},line(def,pts){sel(def);body.push(`X${X(pts[0][0])}Y${Y(pts[0][1])}D02*`);for(let i=1;i<pts.length;i++)body.push(`X${X(pts[i][0])}Y${Y(pts[i][1])}D01*`)},
   text(){const head=[`G04 ${fn}, made with CEsim PCB*`,`%TF.GenerationSoftware,CEsim,PCB,1.24.0*%`,`%TF.FileFunction,${attr}*%`,'%FSLAX46Y46*%','%MOMM*%','%LPD*%','G01*'];for(const[def,d]of ap)head.push(`%ADD${d}${def}*%`);return head.concat(body,['M02*']).join('\n')+'\n'}}}
 const n4=v=>(+v).toFixed(4);const apPad=(p,grow)=>{const w=p.w+2*grow,h=p.h+2*grow;if(p.shape==='round')return`C,${n4(w)}`;if(p.shape==='oval')return`O,${n4(w)}X${n4(h)}`;return`R,${n4(w)}X${n4(h)}`};
 const out={};const items=copper(doc);
 for(const L of['F','B']){const w=writer(`${L==='F'?'Top':'Bottom'} copper`,`Copper,L${L==='F'?1:2},${L==='F'?'Top':'Bot'}`);for(const it of items)if(it.kind==='pad'&&it.layers.includes(L))w.flash(apPad(it.p,0),it.p.x,it.p.y);for(const v of doc.vias)w.flash(`C,${n4(v.d)}`,v.x,v.y);for(const t of doc.traces)if(t.layer===L)w.line(`C,${n4(t.w)}`,[t.a,t.b]);out[`${name}-${L}_Cu.gbr`]=w.text()}
 for(const L of['F','B']){const w=writer(`${L==='F'?'Top':'Bottom'} solder mask`,`Soldermask,${L==='F'?'Top':'Bot'}`);for(const it of items)if(it.kind==='pad'&&it.layers.includes(L))w.flash(apPad(it.p,0.05),it.p.x,it.p.y);out[`${name}-${L}_Mask.gbr`]=w.text()}
 {const w=writer('Top silkscreen','Legend,Top');for(const c of doc.comps){for(const pl of silkOf(c))w.line('C,0.1500',pl);const[rx,ry]=refPos(c);for(const pl of textStrokes(c.ref,rx,ry,1.0,0))w.line('C,0.1500',pl)}for(const tx of doc.texts||[])for(const pl of textStrokes(tx.text,tx.x,tx.y,tx.size||1.5,0))w.line('C,0.1500',pl);out[`${name}-F_Silkscreen.gbr`]=w.text()}
 {const w=writer('Board outline','Profile,NP');w.line('C,0.1000',[[0,0],[W,0],[W,H],[0,H],[0,0]]);out[`${name}-Edge_Cuts.gbr`]=w.text()}
 // Excellon drill file, plated holes
 const holes=[];for(const it of items)if(it.kind==='pad'&&it.p.drill)holes.push([it.p.drill,it.p.x,it.p.y]);for(const v of doc.vias)holes.push([v.drill,v.x,v.y]);const tools=[...new Set(holes.map(h=>h[0].toFixed(3)))].sort((a,b)=>a-b);
 const dr=['M48','; drill file made with CEsim PCB','; FORMAT={-:-/ absolute / metric / decimal}','METRIC,TZ'];tools.forEach((t,i)=>dr.push(`T${i+1}C${t}`));dr.push('%','G05');tools.forEach((t,i)=>{dr.push(`T${i+1}`);for(const h of holes)if(h[0].toFixed(3)===t)dr.push(`X${h[1].toFixed(3)}Y${(H-h[2]).toFixed(3)}`)});dr.push('T0','M30');out[`${name}.drl`]=dr.join('\n')+'\n';
 return out}
/* minimal ZIP (stored, no compression) */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files){const enc=new TextEncoder();const parts=[],central=[];let off=0;const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
 for(const[name,text]of Object.entries(files)){const data=typeof text==='string'?enc.encode(text):text;const nm=enc.encode(name);const crc=crc32(data);const hdr=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0)];parts.push(Uint8Array.from(hdr),nm,data);
  central.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);off+=hdr.length+nm.length+data.length}
 const cs=central.reduce((s,a)=>s+a.length,0);const end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(Object.keys(files).length),...u16(Object.keys(files).length),...u32(cs),...u32(off),...u16(0)]);const all=[...parts,...central,end];const n=all.reduce((s,a)=>s+a.length,0);const o=new Uint8Array(n);let p=0;for(const a of all){o.set(a,p);p+=a.length}return o}
/* ---------------- netlist import ---------------- */
// text lines like the Circuit tool's code: R1 n1 n2 470 · D1 a k LED · Q1 c b e 2N2222 · C1 a b 10u · V1 + - DC 9 · J1 a b · U1 p1 p2 ... DIP-14
function fromNetlist(text){const comps=[],nets={};const used=new Set();const warn=[];let ln=0;
 for(let raw of String(text).split(/\r?\n/)){ln++;const line=raw.replace(/;.*$/,'').trim();if(!line||line[0]==='*'||line[0]==='.')continue;const t=line.split(/\s+/);const ref=t[0];const P=ref[0].toUpperCase();let fp,pins=[],value='';
  const ov=line.match(/\[([\w.+-]+)\]$/);if(ov){if(!FP[ov[1]]){warn.push(`Line ${ln}: there is no footprint called ${ov[1]}`);continue}const names=[...new Set(FP[ov[1]].pads.map(p=>p.n))];const tt=line.replace(/\[[^\]]*\]$/,'').trim().split(/\s+/);if(tt.length-1<names.length){warn.push(`Line ${ln}: ${ref} needs ${names.length} nodes`);continue}if(used.has(ref.toUpperCase())){warn.push(`Line ${ln}: ${ref} is used twice`);continue}const R=ref.toUpperCase();used.add(R);comps.push({ref:R,fp:ov[1],value:tt.slice(1+names.length).join(' '),x:0,y:0,rot:0});names.forEach((n,i)=>{const nd=tt[1+i];if(nd&&!/^nc$/i.test(nd))nets[R+'.'+n]=nd==='0'?'GND':nd});continue}
  const num=v=>{const m=String(v).match(/^([\d.]+)\s*(meg|[pnuµmkKM])?/i);if(!m)return NaN;const mul={p:1e-12,n:1e-9,u:1e-6,'µ':1e-6,m:1e-3,k:1e3,meg:1e6}[String(m[2]||'').toLowerCase()]||(m[2]==='M'?1e6:1);return parseFloat(m[1])*mul};
  switch(P){
   case'R':fp='R_Axial';pins=[['1',t[1]],['2',t[2]]];value=t[3]||'';break;
   case'C':{value=t[3]||'';const f=num(value);fp=f>=1e-6?'CP_Radial':'C_Disc';pins=fp==='CP_Radial'?[['+',t[1]],['-',t[2]]]:[['1',t[1]],['2',t[2]]];break}
   case'D':{value=t[3]||'';fp=/LED/i.test(value)?'LED_5mm':'D_DO41';pins=[['A',t[1]],['K',t[2]]];break}
   case'Q':fp='TO-92';value=t[4]||'NPN';pins=[['C',t[1]],['B',t[2]],['E',t[3]]];break;
   case'V':case'B':fp='Terminal_2';value=t.slice(3).join(' ')||'power';pins=[['1',t[1]],['2',t[2]]];break;
   case'J':{const nd=t.slice(1);const n=nd.length;fp=n<=2?'Terminal_2':n===3?'Header_1x3':n===4?'Header_1x4':'Header_1x6';if(n>6){warn.push(`Line ${ln}: ${ref} has more than 6 pins; only 6 are placed`)}pins=nd.slice(0,6).map((x,i)=>[String(i+1),x]);break}
   case'S':fp='SW_Push_6mm';pins=[['1',t[1]],['2',t[2]]];break;
   case'U':case'X':{const nodes=t.slice(1,-1);let pk=t[t.length-1];const m=pk.match(/^DIP-?(\d+)$/i);let n=m?+m[1]:null;if(!n){n=nodes.length<=8?8:nodes.length<=14?14:16;warn.push(`Line ${ln}: ${ref} (${pk}) placed as a DIP-${n} chip`);value=pk}else value=pk.toUpperCase();fp='DIP-'+n;pins=nodes.map((nd,i)=>[String(i+1),nd]);break}
   default:warn.push(`Line ${ln}: ${ref} is not a part the PCB knows (R, C, D, Q, V, J, S, U)`);continue}
  if(used.has(ref.toUpperCase().replace(/^X/,'U'))){warn.push(`Line ${ln}: ${ref} is used twice`);continue}used.add(ref.toUpperCase().replace(/^X/,'U'));if(pins.some(p=>p[1]==null)){warn.push(`Line ${ln}: ${ref} needs more nodes`);continue}
  const R=ref.toUpperCase().replace(/^X/,'U');comps.push({ref:R,fp,value,x:0,y:0,rot:0});for(const[pn,nd]of pins){if(nd&&nd!=='nc'&&nd!=='NC')nets[R+'.'+pn]=nd==='0'?'GND':nd}}
 return{comps,nets,warn}}
/* simple placement: rows, biggest first */
function autoPlace(doc,opt){opt=opt||{};const gap=opt.gap||3.0;const comps=doc.comps.slice().sort((a,b)=>area(b)-area(a));let x=gap+1,y=gap+1,rowH=0;const maxW=opt.width||Math.max(50,Math.sqrt(comps.reduce((s,c)=>s+area(c),0))*1.9);
 for(const c of comps){c.x=0;c.y=0;let b=compBox(c);let w=b[2]-b[0],h=b[3]-b[1];if(h>w*1.6&&c.fp.startsWith('Header')===false&&!c.fp.startsWith('DIP')){c.rot=90;b=compBox(c);w=b[2]-b[0];h=b[3]-b[1]}if(x+w>maxW&&x>gap+1){x=gap+1;y+=rowH+gap+1.5;rowH=0}c.x=snapG(x-b[0],1.27);c.y=snapG(y-b[1]+1.2,1.27);x+=w+gap;rowH=Math.max(rowH,h+1.2)}
 const all=doc.comps.map(compBox);const W=Math.max(...all.map(b=>b[2]))+gap+0.5,H=Math.max(...all.map(b=>b[3]))+gap+0.5;doc.board={w:Math.ceil(W/2.54)*2.54,h:Math.ceil(H/2.54)*2.54};return doc}
function area(c){const b=compBox(c);return(b[2]-b[0])*(b[3]-b[1])}
const snapG=(v,g)=>Math.round(v/g)*g;
const api={FP,padsOf,rotPt,padShape,shapeDist,copper,clusters,ratsnest,drc,autoroute,gerberFiles,zip,crc32,fromNetlist,autoPlace,compBox,silkOf,refPos,textStrokes,nets,DEF_RULES,segSeg,ptSeg};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCB=api;
})(typeof window!=='undefined'?window:globalThis);
