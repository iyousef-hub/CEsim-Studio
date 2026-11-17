/* VLSI example cells. Units are lambda; y grows downwards. VDD rail on top, GND rail at the bottom. */
(function(root){
'use strict';
const V=root.VL||(typeof require!=='undefined'?require('./vlsi-core.js'):null);
function cut(L,kind,x,y,under){// a 2×2 contact or via with 1λ of every joined layer around it
 L.rect(kind,x,y,2,2);if(kind!=='via2')L.rect('m1',x-1,y-1,4,4);if(kind==='via'||kind==='via2')L.rect('m2',x-1,y-1,4,4);if(kind==='via2')L.rect('m3',x-1,y-1,4,4);if(under)L.rect(under,x-1,y-1,4,4);return L}
function rails(L,w){L.rect('m1',0,0,w,4).rect('m1',0,42,w,4);L.label('VDD',1,1).label('GND',1,43);return L}
// inverter: 24λ wide
function inverter(L,ox,opt){opt=opt||{};const o=(x)=>x+ox;
 L.rect('nwell',o(1),5,22,16);L.rect('pdiff',o(6),10,12,6);L.rect('ndiff',o(6),26,12,4);
 L.rect('poly',o(11),8,2,opt.shortGate?20:30);// gate, from y=8 to y=37
 cut(L,'contact',o(7),12,'pdiff');cut(L,'contact',o(15),12,'pdiff');cut(L,'contact',o(7),27,'ndiff');cut(L,'contact',o(15),27,'ndiff');
 L.rect('m1',o(6),0,4,15);L.rect('m1',o(6),26,4,20);L.rect('m1',o(14),11,4,19);// VDD, GND, output
 L.rect('poly',o(11),33,6,4);cut(L,'contact',o(14),34,'poly');// input pad
 if(!opt.noLabels){L.label(opt.in||'A',o(15),35);L.label(opt.out||'Y',o(16),20)}return L}
// two-input cells: 32λ wide, gates at x 11 and 19
function twoInput(L,nand){L.rect('nwell',1,5,30,16);L.rect('pdiff',6,10,20,6);L.rect('ndiff',6,26,20,4);L.rect('poly',11,8,2,30).rect('poly',19,8,2,30);
 if(nand){// pMOS in parallel: VDD | out | VDD ; nMOS in series: GND .. out
  cut(L,'contact',7,12,'pdiff');cut(L,'contact',15,12,'pdiff');cut(L,'contact',23,12,'pdiff');cut(L,'contact',7,27,'ndiff');cut(L,'contact',23,27,'ndiff');
  L.rect('m1',6,0,4,15).rect('m1',22,0,4,15).rect('m1',6,26,4,20);L.rect('m1',14,11,4,13).rect('m1',14,19,12,5).rect('m1',22,19,4,11);
  L.rect('poly',11,33,6,4);cut(L,'contact',14,34,'poly');L.rect('poly',19,33,6,4);cut(L,'contact',22,34,'poly')}
 else{// pMOS in series: VDD .. out ; nMOS in parallel: out | GND | out
  cut(L,'contact',7,12,'pdiff');cut(L,'contact',23,12,'pdiff');cut(L,'contact',7,27,'ndiff');cut(L,'contact',15,27,'ndiff');cut(L,'contact',23,27,'ndiff');
  L.rect('m1',6,0,4,15).rect('m1',14,26,4,20);L.rect('m1',22,11,4,19).rect('m1',6,19,20,4).rect('m1',6,19,4,11);
  L.rect('poly',7,33,6,4);cut(L,'contact',8,34,'poly');L.rect('poly',19,33,6,4);cut(L,'contact',22,34,'poly')}
 return L}
const EX={
 'Inverter (NOT)':()=>{const L=rails(new V.Layout(),24);inverter(L,0);return{L,note:'One pMOS on top (inside the n-well) and one nMOS below. When A is 0 the pMOS connects Y to VDD; when A is 1 the nMOS connects Y to GND. The red poly crossing the green or brown diffusion is the transistor gate.'}},
 'NAND gate':()=>{const L=rails(new V.Layout(),32);twoInput(L,true);L.label('A',15,35).label('B',23,35).label('Y',15,21);return{L,note:'Two pMOS in parallel (either input at 0 pulls Y up) and two nMOS in series (both inputs at 1 pull Y down).'}},
 'NOR gate':()=>{const L=rails(new V.Layout(),32);twoInput(L,false);L.label('A',9,35).label('B',23,35).label('Y',7,21);return{L,note:'The opposite of the NAND: the pMOS are in series and the nMOS in parallel. Y is 1 only when both inputs are 0.'}},
 'AND gate (NAND + inverter)':()=>{const L=rails(new V.Layout(),56);twoInput(L,true);inverter(L,32,{noLabels:true});L.rect('nwell',1,5,54,16);
  // NAND output (m1 at x 22..26, y 19..24) to the inverter input pad over metal 2
  cut(L,'via',23,20);L.rect('m1',45,33,9,4);cut(L,'via',50,34);L.rect('m2',22,19,32,4).rect('m2',50,19,4,18);
  L.label('A',15,35).label('B',23,35).label('Y',47,13);return{L,note:'A NAND followed by an inverter. The NAND output reaches the inverter input on metal 2 (purple), going over the inverter\'s ground wire through two vias.'}},
 'Inverter with rule errors':()=>{const L=rails(new V.Layout(),24);inverter(L,0,{shortGate:true});L.rect('nwell',1,5,22,16,false).rect('nwell',3,7,18,12);return{L,note:'This inverter breaks some design rules. Open the Check list to see each error, then fix it: the n-well is too small around the p diffusion, and the gate does not reach the input pad.'}},
};
const api={EX,cut,inverter,twoInput};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VL_EXAMPLES=api;
})(typeof window!=='undefined'?window:globalThis);
