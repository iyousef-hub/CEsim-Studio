/* CEsim Breadboard: board geometry, parts, netlist and a transient circuit simulator (modified nodal analysis with Newton iterations). */
(function(root){
'use strict';
const P=10;                           // hole pitch (0.1 inch) in world units
const COLS=63,ROWS='abcdefghij';
const ROWY={a:50,b:60,c:70,d:80,e:90,f:120,g:130,h:140,i:150,j:160};
const RAILS={tp:10,tn:20,bp:190,bn:200};   // top +, top -, bottom +, bottom -
const RAIL_N=50;
const colX=c=>30+(c-1)*P;
const railX=k=>40+k*P+Math.floor(k/5)*P;   // k = 0..49, groups of 5
/* holes: key "x,y" -> {name, strip} */
const HOLES=new Map();
(function build(){for(let c=1;c<=COLS;c++){for(const r of ROWS){const y=ROWY[r];HOLES.set(colX(c)+','+y,{name:r+c,strip:(ROWS.indexOf(r)<5?'L':'R')+c,x:colX(c),y})}}
 for(const k of Object.keys(RAILS))for(let i=0;i<RAIL_N;i++){const x=railX(i),y=RAILS[k];HOLES.set(x+','+y,{name:k+(i+1),strip:k,x,y})}})();
function holeXY(name){const m=String(name).match(/^([a-j])(\d+)$/);if(m)return[colX(+m[2]),ROWY[m[1]]];const r=String(name).match(/^(tp|tn|bp|bn)(\d+)$/);if(r)return[railX(+r[2]-1),RAILS[r[1]]];throw new Error('No hole '+name)}
const key=(x,y)=>Math.round(x)+','+Math.round(y);
function stripLabel(s){if(s==='tp')return'top + rail';if(s==='tn')return'top − rail';if(s==='bp')return'bottom + rail';if(s==='bn')return'bottom − rail';return(s[0]==='L'?'column '+s.slice(1)+', rows a–e':'column '+s.slice(1)+', rows f–j')}

/* ---------------- parts library ---------------- */
// legs in pitch units relative to the part origin (rotation 0); flex parts keep absolute legs.
const DIP=n=>{const h=n/2,legs=[];for(let i=1;i<=n;i++)legs.push(i<=h?[i-1,3]:[n-i,0]);return legs};
/* Uno board: headers off the breadboard. Leg i is Arduino pin i (0-13 digital, 14-19 = A0-A5), then 5V, 3.3V, GND, GND, GND */
const UNO_PINS=[...Array.from({length:14},(_,i)=>'D'+i),...Array.from({length:6},(_,i)=>'A'+i),'5V','3.3V','GND','GND','GND'];
const UNO_LEGS=(()=>{const L=[];for(let i=0;i<14;i++)L.push([i<8?15-i:14-i,0]);for(let i=0;i<6;i++)L.push([9+i,19]);L.push([3,19],[2,19],[4,19],[5,19],[0,0]);return L})();
const UNO_BLINK='// Blink an LED on pin 13 (wire pin 13 through a 220 ohm resistor to an LED, LED to GND)\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}\n';
const LIB={
 resistor:{name:'Resistor',flex:true,legs:2,span:4,props:{ohms:220},pins:['1','2']},
 led:{name:'LED',flex:true,legs:2,span:1,props:{color:'red'},pins:['anode +','cathode −']},
 diode:{name:'Diode',flex:true,legs:2,span:4,props:{model:'1N4007'},pins:['anode','cathode']},
 capacitor:{name:'Capacitor',flex:true,legs:2,span:1,props:{farads:100e-9},pins:['1','2']},
 ecap:{name:'Electrolytic capacitor',flex:true,legs:2,span:1,props:{farads:100e-6},pins:['+','−']},
 button:{name:'Push button',legs:[[0,0],[2,0]],props:{},pins:['1','2']},
 switch:{name:'Slide switch',legs:[[0,0],[1,0],[2,0]],props:{on:false},pins:['1','common','3']},
 pot:{name:'Potentiometer',legs:[[0,0],[1,0],[2,0]],props:{ohms:10000,pos:0.5},pins:['end 1','wiper','end 2']},
 ldr:{name:'LDR (light sensor)',flex:true,legs:2,span:2,props:{light:0.8,dark:1e6,bright:1e3},pins:['1','2']},
 pled:{name:'Power LED (1 W)',flex:true,legs:2,span:2,props:{color:'white'},pins:['anode +','cathode −']},
 npn:{name:'NPN transistor (2N2222)',legs:[[0,0],[1,0],[2,0]],props:{},pins:['E','B','C']},
 ic7400:{name:'74LS00 · 4 NAND',legs:DIP(14),props:{},ic:'7400'},
 ic7402:{name:'74LS02 · 4 NOR',legs:DIP(14),props:{},ic:'7402'},
 ic7404:{name:'74LS04 · 6 NOT',legs:DIP(14),props:{},ic:'7404'},
 ic7408:{name:'74LS08 · 4 AND',legs:DIP(14),props:{},ic:'7408'},
 ic7432:{name:'74LS32 · 4 OR',legs:DIP(14),props:{},ic:'7432'},
 ic7486:{name:'74LS86 · 4 XOR',legs:DIP(14),props:{},ic:'7486'},
 ne555:{name:'NE555 timer',legs:DIP(8),props:{},pins:['GND','TRIG','OUT','RESET','CTRL','THRES','DISCH','VCC']},
 seg7:{name:'7-segment display (common cathode)',legs:[[0,6],[1,6],[2,6],[3,6],[4,6],[4,0],[3,0],[2,0],[1,0],[0,0]],props:{color:'red'},pins:['e','d','com','c','dp','b','a','com','f','g']},
 battery:{name:'9 V battery',legs:[[0,0],[2,0]],props:{volts:9},pins:['+','−'],offboard:true},
 supply:{name:'Power supply',legs:[[0,0],[2,0]],props:{volts:5},pins:['+','−'],offboard:true},
 uno:{name:'Arduino Uno board',legs:UNO_LEGS,props:{code:UNO_BLINK},pins:UNO_PINS,offboard:true,board:true},
 voltmeter:{name:'Voltmeter',flex:true,legs:2,span:3,probes:true,props:{},pins:['red +','black −']},
 ammeter:{name:'Ammeter',flex:true,legs:2,span:3,probes:true,props:{},pins:['red (in)','black (out)']},
};
const GATES={7400:{f:(a,b)=>!(a&&b),n:4},7402:{f:(a,b)=>!(a||b),n:4,nor:true},7404:{f:a=>!a,n:6,not:true},7408:{f:(a,b)=>a&&b,n:4},7432:{f:(a,b)=>a||b,n:4},7486:{f:(a,b)=>a!==b,n:4}};
// pin numbers (1-based) of each gate: [in1,in2,out]
function gatePins(ic){if(ic==='7404')return[[1,2],[3,4],[5,6],[9,8],[11,10],[13,12]].map(([i,o])=>[i,null,o]);if(ic==='7402')return[[2,3,1],[5,6,4],[8,9,10],[11,12,13]];return[[1,2,3],[4,5,6],[9,10,8],[12,13,11]]}
const LED_VF={red:1.85,yellow:2.0,green:2.1,orange:1.95,blue:2.9,white:3.0};
function ldrOhms(p){const d=Math.max(1,+p.props.dark||1e6),b=Math.max(1e-3,+p.props.bright||1e3),a=Math.max(0,Math.min(1,+p.props.light));return d*Math.pow(b/d,a)}
const LED_RGB={red:'#ff3b30',yellow:'#ffd60a',green:'#34c759',orange:'#ff9500',blue:'#2f8bff',white:'#f4f7ff'};
function legsOf(p){const L=LIB[p.type];if(L.flex)return p.legs.map(l=>l.slice());const r=((p.rot||0)%360+360)%360;return L.legs.map(([dx,dy])=>{let x=dx*P,y=dy*P;for(let k=0;k<r/90;k++){const t=x;x=-y;y=t}return[p.pos[0]+x,p.pos[1]+y]})}
function newPart(type,at){const L=LIB[type];const p={id:'p'+Math.random().toString(36).slice(2,8),type,props:JSON.parse(JSON.stringify(L.props||{}))};if(L.flex){const span=L.span||1;p.legs=[[at[0],at[1]],[at[0]+span*P,at[1]]];if(L.probes)p.pos=[at[0]+span*P/2,at[1]-60]}else{p.pos=[at[0],at[1]];p.rot=0}return p}

/* ---------------- netlist ---------------- */
function connectivity(doc){const parent=new Map();const find=k=>{let r=k;while(parent.has(r)&&parent.get(r)!==r)r=parent.get(r);let c=k;while(parent.has(c)&&parent.get(c)!==r){const n=parent.get(c);parent.set(c,r);c=n}return r};const add=k=>{if(!parent.has(k))parent.set(k,k)};const union=(a,b)=>{add(a);add(b);const ra=find(a),rb=find(b);if(ra!==rb)parent.set(ra,rb)};
 const ptNode=(x,y)=>{const k=key(x,y);const h=HOLES.get(k);if(h){union('pt:'+k,'strip:'+h.strip);return'pt:'+k}add('pt:'+k);return'pt:'+k};
 for(const w of doc.wires){union(ptNode(w.a[0],w.a[1]),ptNode(w.b[0],w.b[1]))}
 const partLegs=new Map();for(const p of doc.parts){const legs=legsOf(p);const ids=legs.map(([x,y])=>ptNode(x,y));partLegs.set(p.id,ids);if(p.type==='seg7')union(ids[2],ids[7]);if(p.type==='uno'){union(ids[22],ids[23]);union(ids[22],ids[24])}}
 const nodeOf=k=>find(k);return{find,partLegs,nodeOf,inHole:(x,y)=>HOLES.has(key(x,y))}}
/* ---------------- simulator ---------------- */
const VT=0.025852;
function pnjlim(vnew,vold,vt,vcrit){if(vnew>vcrit&&Math.abs(vnew-vold)>2*vt){if(vold>0){const arg=1+(vnew-vold)/vt;vnew=arg>0?vold+vt*Math.log(arg):vcrit}else vnew=vt*Math.log(vnew/vt)}return vnew}
class Sim{
 constructor(doc){this.doc=doc;this.t=0;this.dt=2e-4;this.state={};this.warn=new Map();this.build()}
 build(){const doc=this.doc;const con=connectivity(doc);this.con=con;const idx=new Map();let n=0;const nid=k=>{const r=con.find(k);if(!idx.has(r))idx.set(r,n++);return idx.get(r)};this.idx=idx;
  this.els=[];const self=this;let extra=0;
  const internal=()=>{const k='int:'+(extra++);idx.set(k,n++);return idx.get(k)};
  this.floating=[];this.refNode=null;
  for(const p of doc.parts){const L=LIB[p.type];const legs=con.partLegs.get(p.id);const nodes=legs.map(nid);const pts=legsOf(p);
   if(!L.offboard){pts.forEach((pt,i)=>{if(!con.inHole(pt[0],pt[1])){const k='pt:'+key(pt[0],pt[1]);const r=con.find(k);let used=0;for(const w of doc.wires)if(key(w.a[0],w.a[1])===key(pt[0],pt[1])||key(w.b[0],w.b[1])===key(pt[0],pt[1]))used++;if(!used)this.floating.push({part:p.id,leg:i})}})}
   const e={p,nodes,type:p.type};
   if(p.type==='battery'||p.type==='supply'){e.rint=internal();if(this.refNode==null)this.refNode=nodes[1]}
   if(p.type==='led'||p.type==='pled'||p.type==='diode')e.mid=internal();
   if(p.type==='ne555')e.n1=internal();
   if(p.type==='uno'){if(this.refNode==null)this.refNode=nodes[22];this.unoStart(e)}
   if(p.type==='seg7')e.mids=Array.from({length:8},internal);
   this.els.push(e)}
  this.n=n;if(this.refNode==null)this.refNode=0;for(const e of this.els)if(e.type==='uno'&&this.refNode===0&&!this.els.some(x=>x.type==='battery'||x.type==='supply'))this.refNode=e.nodes[22];
  this.vsrc=this.els.filter(e=>e.type==='battery'||e.type==='supply'||e.type==='ammeter');this.vsrc.forEach((e,i)=>e.vi=n+i);this.N=n+this.vsrc.length;
  this.x=new Float64Array(this.N);this.xprev=new Float64Array(this.N);
  for(const e of this.els){const s=this.state[e.p.id]=this.state[e.p.id]||{};if(e.p.type==='ne555')s.q=0;if(LIB[e.p.type].ic)s.out=[]}
  this.dc()}
 V(i){return i===this.refNode?0:this.x[i]-this.x[this.refNode]}
 dc(){/* initial operating point: capacitors open, a few hundred settling steps */const dt0=this.dt;this.dcMode=true;for(let k=0;k<4;k++)this.solve(1e9);this.dcMode=false;this.xprev.set(this.x);this.dt=dt0}
 step(n){for(let i=0;i<n;i++){for(const e of this.els)if(e.rt)this.unoRun(e);this.solve(this.dt);this.updateLogic();this.afterStep();this.xprev.set(this.x);this.t+=this.dt}}
 solve(dt){const N=this.N;let x=this.x;for(let it=0;it<60;it++){const G=Array.from({length:N},()=>new Float64Array(N));const I=new Float64Array(N);this.stamp(G,I,x,dt);
   for(let i=0;i<this.n;i++)G[i][i]+=1e-9;const r=this.ref=this.refNode;for(let j=0;j<N;j++){G[r][j]=0}G[r][r]=1;I[r]=0;
   const xn=gauss(G,I);if(!xn)return;let conv=true;for(let i=0;i<N;i++){if(!isFinite(xn[i]))return;if(Math.abs(xn[i]-x[i])>1e-4+1e-3*Math.abs(xn[i]))conv=false}x.set(xn);this.limited=false;if(conv&&it>0)break}}
 stamp(G,I,x,dt){const cond=(a,b,g)=>{G[a][a]+=g;G[b][b]+=g;G[a][b]-=g;G[b][a]-=g};const cur=(a,b,i)=>{I[a]-=i;I[b]+=i};/* current i flows a->b through element */
  const diode=(a,b,e,Is,nf,key)=>{const vd0=x[a]-x[b];const st=this.state[e.p.id];const vt=nf*VT;const vcrit=vt*Math.log(vt/(Math.SQRT2*Is));const old=st[key]==null?0:st[key];let vd=pnjlim(vd0,old,vt,vcrit);st[key]=vd;const ex=Math.exp(Math.min(vd/vt,80));const id=Is*(ex-1),gd=Is*ex/vt+1e-12;cond(a,b,gd);cur(a,b,id-gd*vd)};
  for(const e of this.els){const nd=e.nodes,p=e.p,st=this.state[p.id];
   switch(e.type){
    case'resistor':cond(nd[0],nd[1],1/Math.max(1e-3,+p.props.ohms||1));break;
    case'pot':{const R=Math.max(10,+p.props.ohms||10000),a=Math.max(0.001,Math.min(0.999,+p.props.pos));cond(nd[0],nd[1],1/(R*a));cond(nd[1],nd[2],1/(R*(1-a)));break}
    case'button':cond(nd[0],nd[1],p.props.pressed?100:1e-12);break;
    case'switch':{const on=!!p.props.on;cond(nd[1],on?nd[2]:nd[0],100);cond(nd[1],on?nd[0]:nd[2],1e-12);break}
    case'capacitor':case'ecap':{if(this.dcMode){cond(nd[0],nd[1],1e-10);break}const g=(+p.props.farads||1e-9)/dt;cond(nd[0],nd[1],g);const vp=this.xprev[nd[0]]-this.xprev[nd[1]];cur(nd[1],nd[0],g*vp);break}
    case'led':{if(st.burned){cond(nd[0],nd[1],1e-10);break}const vf=LED_VF[p.props.color]||1.9;const nf=2.0;const Is=0.01/(Math.exp(vf/(nf*VT))-1);diode(nd[0],e.mid,e,Is,nf,'vd');cond(e.mid,nd[1],1/8);break}
    case'pled':{if(st.burned){cond(nd[0],nd[1],1e-10);break}const vf=(LED_VF[p.props.color]||2.9)+0.25;const nf=2.0;const Is=0.35/(Math.exp(vf/(nf*VT))-1);diode(nd[0],e.mid,e,Is,nf,'vd');cond(e.mid,nd[1],1/1);break}
    case'ldr':cond(nd[0],nd[1],1/ldrOhms(p));break;
    case'diode':{diode(nd[0],e.mid,e,1e-9,1.8,'vd');cond(e.mid,nd[1],1/0.05);break}
    case'npn':{const[E,B,C]=nd;const Is=1e-14,bf=150,br=4;const vt=VT,vcrit=vt*Math.log(vt/(Math.SQRT2*Is));let vbe=x[B]-x[E],vbc=x[B]-x[C];vbe=pnjlim(vbe,st.vbe||0,vt,vcrit);vbc=pnjlim(vbc,st.vbc||0,vt,vcrit);st.vbe=vbe;st.vbc=vbc;
     const ef=Math.exp(Math.min(vbe/vt,80)),er=Math.exp(Math.min(vbc/vt,80));const ict=Is*(ef-er),ibe=Is/bf*(ef-1),ibc=Is/br*(er-1);const gmf=Is*ef/vt,gmr=Is*er/vt,gbe=Is/bf*ef/vt+1e-12,gbc=Is/br*er/vt+1e-12;
     const Ic=ict-ibc,Ib=ibe+ibc;const dIc={C:gmr+gbc,B:gmf-gmr-gbc,E:-gmf},dIb={C:-gbc,B:gbe+gbc,E:-gbe};const dIe={C:-(dIc.C+dIb.C),B:-(dIc.B+dIb.B),E:-(dIc.E+dIb.E)};const Ie=-(Ic+Ib);const v={C:x[C],B:x[B],E:x[E]};const nodeOf={C,B,E};
     const cIc=Ic-gmf*vbe+(gmr+gbc)*vbc,cIb=Ib-gbe*vbe-gbc*vbc,cIe=-(cIc+cIb);
     for(const[t,c0,d]of[['C',cIc,dIc],['B',cIb,dIb],['E',cIe,dIe]]){const k=nodeOf[t];for(const j of['C','B','E'])G[k][nodeOf[j]]+=d[j];I[k]-=c0}
     st.ic=Ic;st.ib=Ib;break}
    case'battery':case'supply':{const vi=e.vi;const Rin=e.type==='battery'?1.5:0.05;/* source between + and internal node, internal R to - */G[nd[0]][vi]+=1;G[e.rint][vi]-=1;G[vi][nd[0]]+=1;G[vi][e.rint]-=1;I[vi]+=+p.props.volts||0;cond(e.rint,nd[1],1/Rin);break}
    case'ammeter':{const vi=e.vi;G[nd[0]][vi]+=1;G[nd[1]][vi]-=1;G[vi][nd[0]]+=1;G[vi][nd[1]]-=1;break}
    case'voltmeter':cond(nd[0],nd[1],1e-7);break;
    case'uno':{const GND=nd[22];const src=(k,V,g)=>{cond(k,GND,g);cur(GND,k,g*V)};src(nd[20],5,10);src(nd[21],3.3,10);
     const rt=e.rt;for(let i=0;i<20;i++){const s=rt&&rt.state!=='error'?rt.pins[i]:null;if(!s||s.mode===0){cond(nd[i],GND,1e-8);continue}
      if(s.mode===2){src(nd[i],5,1/20000);continue}let V=s.v?5:0;if(s.tone)V=2.5;else if(s.pwm>=0)V=5*s.pwm/255;src(nd[i],V,1/25)}break}
    case'ne555':{const[GND,TRIG,OUT,RST,CTRL,THRES,DISCH,VCC]=nd;cond(VCC,CTRL,1/5000);cond(CTRL,e.n1,1/5000);cond(e.n1,GND,1/5000);cond(VCC,GND,1/10000);cond(RST,VCC,1/50000);
     const pw=st.powered;if(pw){const lev=st.q?Math.max(0,(x[VCC]-x[GND])-1.7):0.1;const g=1/10;cond(OUT,GND,g);cur(GND,OUT,g*lev)}if(pw&&!st.q)cond(DISCH,GND,1/10);break}
    case'seg7':{const segPin=[6,5,3,1,0,8,9,4];/* a b c d e f g dp -> leg index */const vf=LED_VF[p.props.color]||1.9,nf=2,Is=0.01/(Math.exp(vf/(nf*VT))-1);segPin.forEach((li,k)=>{diode(nd[li],e.mids[k],e,Is,nf,'vd'+k);cond(e.mids[k],nd[2],1/15)});break}
    default:if(LIB[e.type]&&LIB[e.type].ic){const pin=k=>nd[k-1];const VCC=pin(14),GND=pin(7);cond(VCC,GND,1/5000);const gp=gatePins(LIB[e.type].ic);gp.forEach(([a,b,o],k)=>{cond(pin(a),VCC,1/10000);if(b)cond(pin(b),VCC,1/10000);if(st.powered){const lev=st.out[k]?Math.max(0,(x[VCC]-x[GND])-1.6):0.15;const g=1/30;cond(pin(o),GND,g);cur(GND,pin(o),g*lev)}});}
   }}}
 updateLogic(){const x=this.x;for(const e of this.els){const p=e.p,st=this.state[p.id],nd=e.nodes;
   if(LIB[e.type]&&LIB[e.type].ic){const vcc=x[nd[13]]-x[nd[6]];const was=st.powered;st.powered=vcc>3.5;st.vcc=vcc;const G=GATES[LIB[e.type].ic];gatePins(LIB[e.type].ic).forEach(([a,b,o],k)=>{const lv=pn=>{const v=x[nd[pn-1]]-x[nd[6]];return v>2.0?true:v<0.8?false:null};const A=lv(a),B=b?lv(b):null;let r;if(G.not)r=A==null?st.out[k]:G.f(A);else r=(A==null||B==null)?st.out[k]:G.f(A,B);st.out[k]=!!r})}
   if(e.type==='ne555'){const[GND,TRIG,OUT,RST,CTRL,THRES,DISCH,VCC]=nd;const v=i=>x[i]-x[GND];st.powered=v(VCC)>4.5;if(!st.powered){st.q=0;continue}if(v(RST)<0.7)st.q=0;else if(v(TRIG)<x[e.n1]-x[GND])st.q=1;else if(v(THRES)>v(CTRL))st.q=0}}}
 afterStep(){const x=this.x,dt=this.dt;for(const e of this.els){const p=e.p,st=this.state[p.id],nd=e.nodes;
   if(e.type==='led'){const i=(x[e.mid]-x[nd[1]])/8;st.i=st.burned?0:i;if(i>0.045){st.over=(st.over||0)+dt;if(st.over>0.15){st.burned=true;this.addWarn(p.id,'burn',`An LED burned out: ${(i*1000).toFixed(0)} mA is far above its 20 mA limit. Put a resistor (220 Ω to 1 kΩ) in series with it`)}}else st.over=0}
   if(e.type==='pled'){const i=x[e.mid]-x[nd[1]];st.i=st.burned?0:i;if(i>0.5){st.over=(st.over||0)+dt;if(st.over>0.3){st.burned=true;this.addWarn(p.id,'burn',`The power LED burned out: ${(i*1000).toFixed(0)} mA is above its 350 mA limit. Use a bigger series resistor`)}}else st.over=0}
   if(e.type==='ldr'){const v=x[nd[0]]-x[nd[1]],R=ldrOhms(p);st.i=v/R;st.r=R}
   if(e.type==='diode')st.i=(x[e.mid]-x[nd[1]])*20;
   if(e.type==='seg7'){st.seg=e.mids.map(m=>Math.max(0,(x[m]-x[nd[2]])/15))}
   if(e.type==='resistor'){const v=x[nd[0]]-x[nd[1]],R=+p.props.ohms||1;st.i=v/R;st.p=v*v/R;if(st.p>0.25)this.addWarn(p.id,'hot',`A ${fmtOhm(R)} resistor dissipates ${st.p.toFixed(2)} W, more than its 0.25 W rating. It gets very hot`);}
   if(e.type==='battery'||e.type==='supply'){const i=-x[e.vi];st.i=i;st.v=x[nd[0]]-x[nd[1]];if(i>(e.type==='battery'?1.5:2)){this.addWarn(p.id,'short',`Short circuit: the ${e.type==='battery'?'battery':'power supply'} gives ${i.toFixed(1)} A. Check for a wire or part that connects + to − directly`)}}
   if(e.type==='ammeter')st.i=x[e.vi];
   if(e.type==='voltmeter')st.v=x[nd[0]]-x[nd[1]];
   if(e.type==='uno'&&e.rt){st.serial=e.rt.serial;st.pins=e.rt.pins;st.l13=e.rt.pins[13].mode===1&&(e.rt.pins[13].v||e.rt.pins[13].pwm>0);st.rt=e.rt}
   if(e.type==='ecap'){const v=x[nd[0]]-x[nd[1]];st.v=v;if(v<-1)this.addWarn(p.id,'rev','An electrolytic capacitor is connected backwards (its − leg is at the higher voltage). It can be damaged')}
   if(e.type==='capacitor')st.v=x[nd[0]]-x[nd[1]];
   if(e.type==='npn'){st.vce=x[nd[2]]-x[nd[0]];st.vbe=x[nd[1]]-x[nd[0]]}
   if(LIB[e.type]&&LIB[e.type].ic&&!st.powered&&this.t>0.01)this.addWarn(p.id,'pwr',`${LIB[e.type].name.split(' ')[0]} has no power: connect pin 14 to + and pin 7 to −`)
   if(e.type==='ne555'&&!st.powered&&this.t>0.01)this.addWarn(p.id,'pwr','The 555 has no power: connect pin 8 to + and pin 1 to −')}}
 unoStart(e){const st=this.state[e.p.id]=this.state[e.p.id]||{};const I=root.INO;if(!I){st.err='The sketch runner is not loaded';return}
  const prog=I.compile(String(e.p.props.code||''));if(!prog.ok){st.err=prog.errors.map(x=>(x.line?'Line '+x.line+': ':'')+x.msg).join('\n');return}
  const rt=new I.Sim(prog,[]);const self=this;const volt=p=>{const x=self.x;return x?x[e.nodes[p]]-x[e.nodes[22]]:0};
  rt.level=function(p){const s=this.pins[p];if(s.mode===1)return s.v;return volt(p)>2.5?1:0};
  rt.ar=function(p,l){p=p|0;if(p>=0&&p<=5)p+=14;if(p<14||p>19)throw new Error('analogRead() needs an analog pin: A0 to A5 (got '+p+')');this.us+=100;return Math.max(0,Math.min(1023,Math.round(volt(p)/5*1023)))};
  e.rt=rt;st.err=null;st.warns=prog.warnings||[]}
 unoRun(e){const rt=e.rt;if(rt.state==='error'||rt.state==='done'){const st=this.state[e.p.id];if(rt.state==='error'&&!st.err)st.err=(rt.error&&rt.error.line?'Line '+rt.error.line+': ':'')+(rt.error?rt.error.msg:'The sketch stopped');return}rt.run((this.t+this.dt)*1e6,25)}
 addWarn(id,k,msg){const kk=id+':'+k;if(!this.warn.has(kk))this.warn.set(kk,{part:id,kind:k,msg,t:this.t})}
 voltageAt(px,py){const k='pt:'+key(px,py);const h=HOLES.get(key(px,py));let r;if(h)r=this.con.find('strip:'+h.strip);else r=this.con.find(k);if(!this.idx.has(r))return null;return this.V(this.idx.get(r))}
 netOfPoint(px,py){const h=HOLES.get(key(px,py));return h?this.con.find('strip:'+h.strip):this.con.find('pt:'+key(px,py))}
}
function gauss(A,b){const n=b.length;for(let c=0;c<n;c++){let p=c,mx=Math.abs(A[c][c]);for(let r=c+1;r<n;r++){const v=Math.abs(A[r][c]);if(v>mx){mx=v;p=r}}if(mx<1e-18)return null;if(p!==c){const t=A[p];A[p]=A[c];A[c]=t;const tb=b[p];b[p]=b[c];b[c]=tb}const pr=A[c],pv=pr[c];for(let r=c+1;r<n;r++){const row=A[r];const f=row[c]/pv;if(!f)continue;for(let k=c;k<n;k++)row[k]-=f*pr[k];b[r]-=f*b[c]}}
 const x=new Float64Array(n);for(let r=n-1;r>=0;r--){let s=b[r];const row=A[r];for(let k=r+1;k<n;k++)s-=row[k]*x[k];x[r]=s/row[r]}return x}
function fmtOhm(r){r=+r;if(r>=1e6)return+(r/1e6).toPrecision(3)+' MΩ';if(r>=1e3)return+(r/1e3).toPrecision(3)+' kΩ';return+r.toPrecision(3)+' Ω'}
function fmtF(f){f=+f;if(f>=1e-3)return+(f*1e3).toPrecision(3)+' mF';if(f>=1e-6)return+(f*1e6).toPrecision(3)+' µF';if(f>=1e-9)return+(f*1e9).toPrecision(3)+' nF';return+(f*1e12).toPrecision(3)+' pF'}
function parseValue(s){const m=String(s).trim().replace(/Ω|ohm|F$/gi,'').match(/^([\d.]+)\s*([pnuµmkKM]|meg)?$/);if(!m)return NaN;const mult={p:1e-12,n:1e-9,u:1e-6,'µ':1e-6,m:1e-3,k:1e3,K:1e3,M:1e6,meg:1e6}[m[2]]||1;return parseFloat(m[1])*mult}
/* resistor colour bands */
const BAND=['#000000','#7b3f00','#d40000','#ff7f00','#ffd700','#008000','#0000cd','#8a2be2','#808080','#ffffff'];
function bands(R){R=Math.max(1,Math.round(+R));let e=0;let v=R;while(v>=100){v/=10;e++}v=Math.round(v);if(v>=100){v=10;e++}const d1=Math.floor(v/10),d2=v%10;return[BAND[d1],BAND[d2],BAND[Math.min(9,e)],'#c9a227']}
/* export to the Circuit tool's netlist format */
function toNetlist(doc,title){const con=connectivity(doc);const names=new Map();let k=1;const nm=leg=>{const r=con.find(leg);if(!names.has(r))names.set(r,'n'+(k++));return names.get(r)};
 // ground: battery/supply negative
 const src=doc.parts.find(p=>p.type==='battery'||p.type==='supply');if(src){const r=con.find(con.partLegs.get(src.id)[1]);names.set(r,'0')}else{const u=doc.parts.find(p=>p.type==='uno');if(u)names.set(con.find(con.partLegs.get(u.id)[22]),'0')}
 const L=[`* ${title||'Breadboard circuit'}, exported from the Breadboard`,'* One part per line: NAME node node ... VALUE'];const cnt={};const id=pfx=>{cnt[pfx]=(cnt[pfx]||0)+1;return pfx+cnt[pfx]};const skipped=[];
 for(const p of doc.parts){const n=con.partLegs.get(p.id).map(nm);switch(p.type){
  case'resistor':L.push(`${id('R')} ${n[0]} ${n[1]} ${engNum(p.props.ohms)}`);break;
  case'pot':{const R=+p.props.ohms,a=Math.max(0.01,Math.min(0.99,+p.props.pos));L.push(`${id('R')} ${n[0]} ${n[1]} ${engNum(R*a)}  ; potentiometer, part 1`);L.push(`${id('R')} ${n[1]} ${n[2]} ${engNum(R*(1-a))}  ; potentiometer, part 2`);break}
  case'led':case'pled':L.push(`${id('D')} ${n[0]} ${n[1]} LED`);break;
  case'ldr':L.push(`${id('R')} ${n[0]} ${n[1]} ${engNum(ldrOhms(p))}  ; LDR at ${Math.round(100*(+p.props.light))}% light`);break;
  case'diode':L.push(`${id('D')} ${n[0]} ${n[1]} 1N4007`);break;
  case'capacitor':case'ecap':L.push(`${id('C')} ${n[0]} ${n[1]} ${engNum(p.props.farads)}`);break;
  case'npn':L.push(`${id('Q')} ${n[2]} ${n[1]} ${n[0]} 2N2222`);break;
  case'battery':case'supply':L.push(`${id('V')} ${n[0]} ${n[1]} DC ${p.props.volts}`);break;
  case'button':if(p.props.pressed)L.push(`${id('R')} ${n[0]} ${n[1]} 0.01  ; push button, pressed`);else L.push(`* push button between ${n[0]} and ${n[1]} is open`);break;
  case'switch':L.push(`${id('R')} ${n[1]} ${p.props.on?n[2]:n[0]} 0.01  ; slide switch`);break;
  case'ammeter':L.push(`${id('R')} ${n[0]} ${n[1]} 0.01  ; ammeter`);break;
  case'voltmeter':break;
  case'uno':L.push(`${id('V')} ${n[20]} ${n[22]} DC 5  ; Uno 5V pin (the sketch outputs are not exported)`);break;
  default:skipped.push(LIB[p.type].name)}}
 if(skipped.length)L.push(`* Not exported (the circuit simulator has no model for them): ${[...new Set(skipped)].join(', ')}`);
 L.push('.end');return L.join('\n')}
function engNum(v){v=+v;const a=Math.abs(v);if(a>=1e6)return+(v/1e6).toPrecision(4)+'meg';if(a>=1e3)return+(v/1e3).toPrecision(4)+'k';if(a>=1||a===0)return String(+v.toPrecision(4));if(a>=1e-3)return+(v*1e3).toPrecision(4)+'m';if(a>=1e-6)return+(v*1e6).toPrecision(4)+'u';if(a>=1e-9)return+(v*1e9).toPrecision(4)+'n';return+(v*1e12).toPrecision(4)+'p'}
/* export to the PCB tool: footprints with their pins on named nets */
const PCB_FP={resistor:['R_Axial',['1','2']],ldr:['R_Axial',['1','2']],led:['LED_5mm',['A','K']],pled:['LED_5mm',['A','K']],diode:['D_DO41',['A','K']],capacitor:['C_Disc',['1','2']],ecap:['CP_Radial',['+','-']],button:['SW_Push_6mm',['1','2']],switch:['Header_1x3',['1','2','3']],pot:['Pot_Trim',['1','2','3']],npn:['TO-92',['E','B','C']],battery:['Terminal_2',['1','2']],supply:['Terminal_2',['1','2']],ne555:['DIP-8',null],seg7:['Seg7',null],ic7400:['DIP-14',null],ic7402:['DIP-14',null],ic7404:['DIP-14',null],ic7408:['DIP-14',null],ic7432:['DIP-14',null],ic7486:['DIP-14',null]};
const PCB_PFX={resistor:'R',ldr:'R',led:'D',pled:'D',diode:'D',capacitor:'C',ecap:'C',button:'SW',switch:'SW',pot:'RV',npn:'Q',battery:'J',supply:'J',ne555:'U',seg7:'DS',ic7400:'U',ic7402:'U',ic7404:'U',ic7408:'U',ic7432:'U',ic7486:'U'};
function toPcb(doc){const con=connectivity(doc);const par=new Map();const f=k=>{while(par.has(k)&&par.get(k)!==k)k=par.get(k);return k};const root=leg=>f(con.find(leg));
 for(const p of doc.parts)if(p.type==='ammeter'){const l=con.partLegs.get(p.id);const a=root(l[0]),b=root(l[1]);if(a!==b)par.set(a,b)}
 const names=new Map();const src=doc.parts.find(p=>p.type==='battery'||p.type==='supply');if(src){const l=con.partLegs.get(src.id);names.set(root(l[1]),'GND');names.set(root(l[0]),'VCC')}
 let k=1;const nm=leg=>{const r=root(leg);if(!names.has(r))names.set(r,'N'+(k++));return names.get(r)};
 // count how many part legs sit on each net, so nets with one leg stay unconnected
 const use=new Map();for(const p of doc.parts){if(!PCB_FP[p.type])continue;for(const l of con.partLegs.get(p.id)){const r=root(l);use.set(r,(use.get(r)||0)+1)}}
 const comps=[],nets={},cnt={};const skipped=[];
 for(const p of doc.parts){const m=PCB_FP[p.type];if(!m){if(p.type!=='voltmeter'&&p.type!=='ammeter')skipped.push(LIB[p.type].name);continue}const pf=PCB_PFX[p.type];cnt[pf]=(cnt[pf]||0)+1;const ref=pf+cnt[pf];
  let value='';if(p.type==='resistor')value=fmtOhm(p.props.ohms).replace(' ','');else if(p.type==='capacitor'||p.type==='ecap')value=fmtF(p.props.farads).replace(' ','');else if(p.type==='led')value='LED '+p.props.color;else if(p.type==='pled')value='Power LED '+p.props.color;else if(p.type==='ldr')value='LDR';else if(p.type==='pot')value=fmtOhm(p.props.ohms).replace(' ','');else if(p.type==='battery'||p.type==='supply')value=p.props.volts+'V in';else if(LIB[p.type].ic)value='74LS'+LIB[p.type].ic.slice(2);else if(p.type==='ne555')value='NE555';else if(p.type==='npn')value='2N2222';else if(p.type==='switch')value='slide switch';else if(p.type==='seg7')value='7-seg CC';else if(p.type==='diode')value='1N4007';
  comps.push({ref,fp:m[0],value,x:0,y:0,rot:0});const legs=con.partLegs.get(p.id);legs.forEach((l,i)=>{if((use.get(root(l))||0)<2)return;nets[ref+'.'+(m[1]?m[1][i]:String(i+1))]=nm(l)})}
 return{comps,nets,skipped}}
const api={UNO_PINS,UNO_BLINK,P,COLS,ROWS,ROWY,RAILS,RAIL_N,colX,railX,HOLES,holeXY,key,LIB,GATES,gatePins,LED_RGB,LED_VF,legsOf,newPart,connectivity,Sim,fmtOhm,fmtF,parseValue,bands,toNetlist,toPcb,stripLabel,engNum,ldrOhms};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BB=api;
})(typeof window!=='undefined'?window:globalThis);
