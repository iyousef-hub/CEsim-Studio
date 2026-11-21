/* CEsim Breadboard: realistic drawings of the breadboard, the common parts and the boards.
   Every function returns SVG markup in the part's own coordinates, so the legs stay exactly
   where the simulator expects them. */
(function(root){
'use strict';
const NS='http://www.w3.org/2000/svg';
/* shared gradients, added once to the breadboard SVG */
const DEFS=`
<linearGradient id="aMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8fa"/><stop offset=".45" stop-color="#c3c8ce"/><stop offset=".55" stop-color="#a9afb6"/><stop offset="1" stop-color="#e2e5e9"/></linearGradient>
<linearGradient id="aMetalH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa1a9"/><stop offset=".3" stop-color="#eef0f3"/><stop offset=".7" stop-color="#c6cbd1"/><stop offset="1" stop-color="#8d949c"/></linearGradient>
<linearGradient id="aGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".5" stop-color="#d4a83c"/><stop offset="1" stop-color="#9c7419"/></linearGradient>
<linearGradient id="aBlack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3d40"/><stop offset=".12" stop-color="#26282b"/><stop offset="1" stop-color="#121314"/></linearGradient>
<linearGradient id="aIC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3b3e"/><stop offset=".5" stop-color="#232427"/><stop offset="1" stop-color="#161719"/></linearGradient>
<linearGradient id="aRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e6c2"/><stop offset=".35" stop-color="#e3cc98"/><stop offset=".8" stop-color="#c4a466"/><stop offset="1" stop-color="#a8884e"/></linearGradient>
<linearGradient id="aShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
<linearGradient id="aShineH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
<linearGradient id="aCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".25" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
<radialGradient id="aDome" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".25" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
<radialGradient id="aKnob" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fafafa"/><stop offset=".7" stop-color="#cfd3d8"/><stop offset="1" stop-color="#9aa0a7"/></radialGradient>
<radialGradient id="aCap" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#5a5a5a"/><stop offset=".8" stop-color="#1e1e1e"/><stop offset="1" stop-color="#0c0c0c"/></radialGradient>
<linearGradient id="aBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfaf6"/><stop offset="1" stop-color="#ecebe4"/></linearGradient>
<linearGradient id="aBat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#151617"/><stop offset=".3" stop-color="#3c3e41"/><stop offset=".55" stop-color="#26282a"/><stop offset="1" stop-color="#0d0e0f"/></linearGradient>
<linearGradient id="aBatTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a12"/><stop offset=".3" stop-color="#e2ab3d"/><stop offset=".6" stop-color="#c58a22"/><stop offset="1" stop-color="#7a4d0c"/></linearGradient>
<filter id="aSh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="1.2" dy="2.2" stdDeviation="1.6" flood-color="#0b1220" flood-opacity=".32"/></filter>
<filter id="aShS" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx=".6" dy="1.1" stdDeviation=".7" flood-color="#0b1220" flood-opacity=".35"/></filter>
<pattern id="aHoleP" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="none"/></pattern>`;
function install(svg){const d=svg.querySelector('defs');if(d&&!d.querySelector('#aMetal'))d.insertAdjacentHTML('beforeend',DEFS)}
const pcbIds=new Map();
/* a PCB colour gradient for any board colour */
function pcb(svg,col){if(pcbIds.has(col))return pcbIds.get(col);const id='aPcb'+col.replace(/[^0-9a-z]/gi,'');const d=svg.querySelector('defs');
 if(d&&!d.querySelector('#'+id)){const c=hex(col);const L=mix(c,[255,255,255],.14),D=mix(c,[0,0,0],.28);d.insertAdjacentHTML('beforeend',`<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${rgb(L)}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${rgb(D)}"/></linearGradient>`)}
 const r=`url(#${id})`;pcbIds.set(col,r);return r}
const hex=c=>{c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(c.slice(i,i+2),16))};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));const rgb=a=>`rgb(${a.join(',')})`;
const dark=(col,t)=>rgb(mix(hex(col),[0,0,0],t)),light=(col,t)=>rgb(mix(hex(col),[255,255,255],t));
const fx=n=>+n.toFixed(2);
/* ---------- small building blocks ---------- */
function leg(a,b,w){w=w||1.7;return`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="#6f757d" stroke-width="${w+0.7}" stroke-linecap="round"/><line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="#d9dde2" stroke-width="${w-0.5}" stroke-linecap="round"/>`}
/* female header strip (black) with one hole per pin, n pins along x from x0, step 10 */
function femaleRow(x0,y,n,lit){let h=`<rect x="${x0-5}" y="${y-5}" width="${n*10}" height="10" rx="1" fill="url(#aBlack)" stroke="#000" stroke-width=".4"/>`;for(let i=0;i<n;i++){const x=x0+i*10;h+=`<rect x="${x-2.3}" y="${y-2.3}" width="4.6" height="4.6" fill="#050505"/><rect x="${x-2.3}" y="${y-2.3}" width="4.6" height="1.2" fill="#2c2c2c"/>`}return h}
/* male header: black plastic and gold square pins (seen from above) */
function malePins(pts,litFn){let h='';for(const[x,y]of pts)h+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="url(#aBlack)" stroke="#000" stroke-width=".3"/>`;pts.forEach(([x,y],i)=>{const lit=litFn&&litFn(i);h+=`<rect x="${x-2}" y="${y-2}" width="4" height="4" fill="${lit?'#ff5a4e':'url(#aGold)'}" stroke="${lit?'#b3261e':'#7a5a12'}" stroke-width=".3"/>`});return h}
function hole(x,y,r){return`<circle cx="${x}" cy="${y}" r="${r+1.6}" fill="url(#aGold)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#dfe5ec"/>`}
function usbA(x,y,w,h,blue){/* x,y top-left; opening faces +x */return`<g filter="url(#aShS)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="url(#aMetalH)" stroke="#7d848c" stroke-width=".6"/>${[0,1].map(k=>{const yy=y+h*(k?0.55:0.08),hh=h*0.37;return`<rect x="${x+w-8}" y="${yy}" width="8" height="${hh}" fill="#1b1c1e"/><rect x="${x+w-7}" y="${yy+hh*0.3}" width="6" height="${hh*0.4}" fill="${blue?'#1f5fd6':'#2b2c2f'}"/>`}).join('')}<rect x="${x}" y="${y+h/2-0.6}" width="${w}" height="1.2" fill="#8d949c"/></g>`}
function rj45(x,y,w,h){return`<g filter="url(#aShS)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="url(#aMetalH)" stroke="#7d848c" stroke-width=".6"/><rect x="${x+w-14}" y="${y+h*0.18}" width="14" height="${h*0.64}" fill="#151618"/><rect x="${x+w-14}" y="${y+h*0.32}" width="5" height="${h*0.36}" fill="#2d2e31"/><rect x="${x+w-3}" y="${y+h*0.2}" width="3" height="5" fill="#f2c94c"/><rect x="${x+w-3}" y="${y+h*0.8-5}" width="3" height="5" fill="#52c41a"/></g>`}
function chipSq(cx,cy,s,txt1,txt2,metal){let h='';if(!metal){for(let i=0;i<8;i++){const o=-s/2+s*(i+0.5)/8;h+=`<rect x="${cx+o-0.7}" y="${cy-s/2-2}" width="1.4" height="2" fill="#b9bec4"/><rect x="${cx+o-0.7}" y="${cy+s/2}" width="1.4" height="2" fill="#b9bec4"/><rect x="${cx-s/2-2}" y="${cy+o-0.7}" width="2" height="1.4" fill="#b9bec4"/><rect x="${cx+s/2}" y="${cy+o-0.7}" width="2" height="1.4" fill="#b9bec4"/>`}}
 h+=`<rect x="${cx-s/2}" y="${cy-s/2}" width="${s}" height="${s}" rx="${metal?2:1}" fill="${metal?'url(#aMetal)':'url(#aIC)'}" stroke="${metal?'#8b9299':'#000'}" stroke-width=".5"/>`;
 if(!metal)h+=`<circle cx="${cx-s/2+3}" cy="${cy-s/2+3}" r="1" fill="#555"/>`;
 const fs=Math.max(2.6,Math.min(6,s/Math.max(6,(txt1||'').length)*1.5));h+=`<text x="${cx}" y="${cy-(txt2?1:-fs/3)}" font-size="${fs}" fill="${metal?'#4a5058':'#a5a9ae'}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">${txt1||''}</text>`;if(txt2)h+=`<text x="${cx}" y="${cy+fs}" font-size="${fs*0.8}" fill="${metal?'#5b6168':'#8d9196'}" text-anchor="middle" font-family="IBM Plex Mono">${txt2}</text>`;return h}
function smd(x,y,w,h,c){return`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c||'#7a6a55'}"/><rect x="${x}" y="${y}" width="${w*0.22}" height="${h}" fill="#cfd3d8"/><rect x="${x+w*0.78}" y="${y}" width="${w*0.22}" height="${h}" fill="#cfd3d8"/>`}
function button(cx,cy,s,pressed){return`<rect x="${cx-s/2}" y="${cy-s/2}" width="${s}" height="${s}" rx="1" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/><circle cx="${cx}" cy="${cy}" r="${s*0.3}" fill="${pressed?'#2a2a2a':'url(#aCap)'}"/>`}
function crystal(cx,cy,w){return`<rect x="${cx-w/2}" y="${cy-5}" width="${w}" height="10" rx="5" fill="url(#aMetal)" stroke="#8b9299" stroke-width=".5"/><text x="${cx}" y="${cy+1.8}" font-size="4" fill="#5b6168" text-anchor="middle" font-family="IBM Plex Mono">16.000</text>`}
function led(cx,cy,col,on,glow){return(on?`<circle cx="${cx}" cy="${cy}" r="8" fill="${glow(col)}" opacity=".85"/>`:'')+`<rect x="${cx-2.4}" y="${cy-1.6}" width="4.8" height="3.2" rx=".6" fill="${on?col:dark(col,.55)}" stroke="#d9dde2" stroke-width=".5"/>`}
function silk(x,y,t,size,anchor,extra){return`<text x="${x}" y="${y}" font-size="${size}" fill="#f4f7f5" text-anchor="${anchor||'middle'}" font-family="IBM Plex Sans" font-weight="600" ${extra||''}>${t}</text>`}
function ecapSmall(cx,cy,r){return`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".4"/><path d="M${cx-r*0.6} ${cy}h${r*1.2}M${cx} ${cy-r*0.6}v${r*1.2}" stroke="#8b9299" stroke-width=".6"/><path d="M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx} ${cy-r}" fill="none" stroke="#1d1d1d" stroke-width="1.6"/>`}

/* ---------- breadboard ---------- */
function breadboard(BB){let h=`<g filter="url(#aSh)"><rect x="8" y="-8" width="655" height="226" rx="7" fill="url(#aBoard)" stroke="#cfccc0" stroke-width="1"/></g>`;
 h+=`<rect x="10" y="98" width="651" height="14" fill="#e4e1d6"/><rect x="10" y="101" width="651" height="8" fill="#d9d5c8"/><rect x="10" y="104" width="651" height="2" fill="#c9c5b7"/>`;
 h+=`<rect x="10" y="33" width="651" height="1" fill="#e2dfd4"/><rect x="10" y="176" width="651" height="1" fill="#e2dfd4"/>`;
 h+=`<line x1="34" y1="-2" x2="640" y2="-2" stroke="#d93b3b" stroke-width="1.4"/><line x1="34" y1="32" x2="640" y2="32" stroke="#2f66d4" stroke-width="1.4"/><line x1="34" y1="178" x2="640" y2="178" stroke="#d93b3b" stroke-width="1.4"/><line x1="34" y1="212" x2="640" y2="212" stroke="#2f66d4" stroke-width="1.4"/>`;
 h+=`<text x="22" y="7" font-size="9" fill="#d93b3b" font-weight="700" text-anchor="middle">+</text><text x="22" y="30" font-size="11" fill="#2f66d4" font-weight="700" text-anchor="middle">−</text><text x="22" y="187" font-size="9" fill="#d93b3b" font-weight="700" text-anchor="middle">+</text><text x="22" y="210" font-size="11" fill="#2f66d4" font-weight="700" text-anchor="middle">−</text>`;
 for(const r of BB.ROWS)h+=`<text x="17" y="${BB.ROWY[r]+2.6}" font-size="7" fill="#9b978a" text-anchor="middle" font-family="IBM Plex Sans">${r}</text><text x="654" y="${BB.ROWY[r]+2.6}" font-size="7" fill="#9b978a" text-anchor="middle" font-family="IBM Plex Sans">${r}</text>`;
 for(let c=1;c<=BB.COLS;c++)if(c===1||c%5===0)h+=`<text x="${BB.colX(c)}" y="41" font-size="6.5" fill="#9b978a" text-anchor="middle" font-family="IBM Plex Sans">${c}</text><text x="${BB.colX(c)}" y="174" font-size="6.5" fill="#9b978a" text-anchor="middle" font-family="IBM Plex Sans">${c}</text>`;
 for(const[k,o]of BB.HOLES)h+=`<rect x="${o.x-2.5}" y="${o.y-2.5}" width="5" height="5" rx=".7" fill="#d2cfc3"/><rect class="hole" x="${o.x-1.9}" y="${o.y-1.9}" width="3.8" height="3.8" rx=".4"/>`;
 return h}

/* ---------- two-leg parts (resistor, diode, LED, capacitors) ---------- */
function resistor(a,b,ohms,BB){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,ang=Math.atan2(dy,dx)*180/Math.PI;const bl=Math.min(26,Math.max(12,len-6));const hb=bl/2;
 let h=leg(a,b,1.5)+`<g transform="translate(${fx(mx)} ${fx(my)}) rotate(${fx(ang)})" filter="url(#aShS)">`;
 const body=`M${-hb} -2.6 C${-hb} -5.2 ${-hb+4} -5.2 ${-hb+4.5} -3.4 L${hb-4.5} -3.4 C${hb-4} -5.2 ${hb} -5.2 ${hb} -2.6 L${hb} 2.6 C${hb} 5.2 ${hb-4} 5.2 ${hb-4.5} 3.4 L${-hb+4.5} 3.4 C${-hb+4} 5.2 ${-hb} 5.2 ${-hb} 2.6 Z`;
 h+=`<path d="${body}" fill="url(#aRes)" stroke="#9d8250" stroke-width=".45"/>`;const bd=BB.bands(ohms);const pos=[-hb+3.2,-hb+7.2,-hb+10.4,hb-3.4].map(x=>Math.min(x,hb-2));if(bl<16){pos[1]=-hb+5.6;pos[2]=-hb+8}
 bd.forEach((c,i)=>{const x=pos[Math.min(i,3)];const tall=(i===0||i===3)?4.9:3.4;h+=`<rect x="${fx(x-1.1)}" y="${-tall}" width="2.2" height="${tall*2}" fill="${c}"/>`});
 h+=`<path d="${body}" fill="url(#aShine)" opacity=".9"/></g>`;return h}
function diode(a,b){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,ang=Math.atan2(dy,dx)*180/Math.PI;const bl=Math.min(20,Math.max(10,len-6));
 return leg(a,b,1.5)+`<g transform="translate(${fx(mx)} ${fx(my)}) rotate(${fx(ang)})" filter="url(#aShS)"><rect x="${-bl/2}" y="-3.4" width="${bl}" height="6.8" rx="2.4" fill="#1c1c1d"/><rect x="${bl/2-4.6}" y="-3.4" width="2.4" height="6.8" fill="#c9cdd2"/><rect x="${-bl/2}" y="-3.4" width="${bl}" height="6.8" rx="2.4" fill="url(#aShine)"/></g>`}
/* 5 mm LED seen from the side: legs go into the holes, the dome stands up */
function led5(a,b,c,col,br,burned,glow){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const ang=Math.atan2(c[1]-(a[1]+b[1])/2,c[0]-(a[0]+b[0])/2)*180/Math.PI+90;
 let h=leg(a,[c[0]-ux*2.3,c[1]-uy*2.3],1.4)+leg(b,[c[0]+ux*2.3,c[1]+uy*2.3],1.4);
 if(br>0.02)h+=`<circle cx="${fx(c[0])}" cy="${fx(c[1])}" r="${10+br*16}" fill="${glow(col)}" opacity="${0.35+0.65*br}"/>`;
 const body=burned?'#2c2c2c':col;h+=`<g transform="translate(${fx(c[0])} ${fx(c[1])}) rotate(${fx(ang)})" filter="url(#aShS)"><path d="M-5.2 2 V-3.6 A5.2 5.2 0 0 1 5.2 -3.6 V2 Z" fill="${body}" fill-opacity="${burned?1:0.62+0.38*br}" stroke="${dark(burned?'#333333':col,.35)}" stroke-width=".5"/><path d="M-6.2 2 H5 V4.2 H-6.2 Z" fill="${body}" fill-opacity="${burned?1:0.8}" stroke="${dark(burned?'#333333':col,.4)}" stroke-width=".5"/><path d="M5 2 V4.2" stroke="${dark(burned?'#333333':col,.5)}" stroke-width=".8"/><path d="M-5.2 2 V-3.6 A5.2 5.2 0 0 1 5.2 -3.6 V2 Z" fill="url(#aDome)"/><path d="M-2.6 -1 v-3 M2.2 -1 v-2.4 l-1.6 -1.6" stroke="#5d6168" stroke-width=".7" fill="none" opacity=".7"/></g>`;
 if(burned)h+=`<g opacity=".7"><circle cx="${c[0]+3}" cy="${c[1]-10}" r="3.5" fill="#888"/><circle cx="${c[0]-1}" cy="${c[1]-15}" r="4" fill="#aaa"/></g>`;return h}
function ceramic(a,b,c,F,ang){const pf=F*1e12;let code;if(pf<10)code=pf.toFixed(0)+'p';else{const e=Math.floor(Math.log10(pf))-1;code=String(Math.round(pf/Math.pow(10,e))).slice(0,2)+e}
 return leg(a,[c[0]-2.4,c[1]+2],1.3)+leg(b,[c[0]+2.4,c[1]+2],1.3)+`<g transform="translate(${fx(c[0])} ${fx(c[1])}) rotate(${fx(ang)})" filter="url(#aShS)"><ellipse cx="0" cy="-1.5" rx="6.6" ry="5.6" fill="#d98b2b" stroke="#9a5a12" stroke-width=".5"/><ellipse cx="0" cy="-1.5" rx="6.6" ry="5.6" fill="url(#aDome)"/><text x="0" y="0.4" font-size="4.4" fill="#5a3200" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">${code}</text></g>`}
function electrolytic(a,b,c,label,ang){
 return leg(a,[c[0]-3,c[1]],1.3)+leg(b,[c[0]+3,c[1]],1.3)+`<g transform="translate(${fx(c[0])} ${fx(c[1])}) rotate(${fx(ang)})" filter="url(#aShS)"><rect x="-8" y="-17" width="16" height="17" rx="1.8" fill="#1d2b55"/><rect x="2.8" y="-17" width="5.2" height="17" fill="#c6cfe0"/>${[-14,-9.5,-5].map(y=>`<rect x="4.2" y="${y}" width="2.4" height="1" fill="#1d2b55"/>`).join('')}<rect x="-8" y="-17" width="16" height="17" rx="1.8" fill="url(#aCyl)"/><rect x="-8" y="-17.8" width="16" height="2.4" rx="1" fill="url(#aMetal)"/><rect x="-8" y="-1.4" width="16" height="1.6" fill="#0d1428"/><text x="-2.5" y="-6" font-size="3.6" fill="#e7ecf6" text-anchor="middle" transform="rotate(-90 -2.5 -6)" font-family="IBM Plex Sans">${label}</text></g>`}

/* ---------- parts on a fixed footprint (drawn at the part position) ---------- */
function to92(label,names){return`<g filter="url(#aShS)"><path d="M-3.5 -3 V-15 A13.5 9 0 0 1 23.5 -15 V-3 Z" fill="#1b1b1c"/><path d="M-3.5 -3 V-15 A13.5 9 0 0 1 23.5 -15 V-3 Z" fill="url(#aShineH)" opacity=".7"/><rect x="-3.5" y="-4.4" width="27" height="1.4" fill="#0e0e0e"/></g><text x="10" y="-11" font-size="4.3" fill="#c9c9c9" text-anchor="middle" font-family="IBM Plex Mono">${label}</text>`+names.map((s,i)=>`<line x1="${i*10}" y1="-3" x2="${i*10}" y2="0" stroke="#c6cbd1" stroke-width="1.6"/><text x="${i*10}" y="9.5" font-size="5.6" fill="#5e6979" text-anchor="middle">${s}</text>`).join('')}
function dip(L,lbl,st,gatePins,running){const n=L.legs.length/2;const w=(n-1)*10;let b=`<g filter="url(#aShS)">`;for(const[lx,ly]of L.legs){const x=lx*10;b+=ly===0?`<rect x="${x-1.6}" y="-1" width="3.2" height="7" rx=".6" fill="url(#aMetal)"/>`:`<rect x="${x-1.6}" y="24" width="3.2" height="7" rx=".6" fill="url(#aMetal)"/>`}
 b+=`<rect x="-5.5" y="4" width="${w+11}" height="22" rx="1.4" fill="url(#aIC)" stroke="#000" stroke-width=".4"/><rect x="-5.5" y="4" width="${w+11}" height="2.2" rx="1" fill="#46484c" opacity=".7"/><path d="M-5.5 11 a4 4 0 0 1 0 8" fill="#0f1011"/><circle cx="0" cy="21.5" r="1.3" fill="#0f1011"/></g><text x="${w/2}" y="17.6" font-size="7" fill="#d4d6d9" text-anchor="middle" font-family="IBM Plex Mono" letter-spacing=".4">${lbl}</text>`;
 if(running&&L.ic){gatePins(L.ic).forEach(([a,bb,o],k)=>{const on=st.out&&st.out[k]&&st.powered;const lg=L.legs[o-1];b+=`<circle cx="${lg[0]*10}" cy="${lg[1]===0?8:22}" r="1.5" fill="${on?'#ff5a4e':'#3d3f42'}"/>`})}return b}
function tactile(pressed){return`<g filter="url(#aShS)"><rect x="-3" y="-11" width="26" height="22" rx="1.5" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/>${[[0,-8],[20,-8],[0,8],[20,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.5" fill="#1c1c1c"/>`).join('')}<circle cx="10" cy="0" r="${pressed?6:7.2}" fill="url(#aCap)" stroke="#000" stroke-width=".4"/></g>`}
function slide(on){return`<g filter="url(#aShS)"><rect x="-6" y="-14" width="32" height="13" rx="1.5" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/><rect x="-1" y="-11" width="22" height="7" rx="1" fill="#1d1e20"/><rect x="${on?11:1}" y="-12.5" width="8" height="10" rx="1.2" fill="url(#aCap)"/></g>`+[0,10,20].map(x=>`<line x1="${x}" y1="-1" x2="${x}" y2="0" stroke="#c6cbd1" stroke-width="1.6"/>`).join('')}
function pot(pos){const a=-135+270*(pos||0);return`<g filter="url(#aShS)"><rect x="-4" y="-31" width="28" height="27" rx="2" fill="#1f4f9c"/><rect x="-4" y="-31" width="28" height="27" rx="2" fill="url(#aShine)"/><circle cx="10" cy="-17.5" r="10" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/><circle cx="10" cy="-17.5" r="7.4" fill="url(#aKnob)"/><g transform="rotate(${fx(a)} 10 -17.5)"><rect x="8.9" y="-24.8" width="2.2" height="9" rx="1" fill="#2a2d31"/></g></g>`+[0,10,20].map(x=>`<line x1="${x}" y1="-4" x2="${x}" y2="0" stroke="#c6cbd1" stroke-width="1.6"/>`).join('')}
function battery9(volts){return`<g filter="url(#aSh)"><rect x="-15" y="9" width="50" height="78" rx="3" fill="url(#aBat)"/><rect x="-15" y="9" width="50" height="22" rx="3" fill="url(#aBatTop)"/><rect x="-15" y="27" width="50" height="4" fill="url(#aBatTop)"/><text x="10" y="62" font-size="16" fill="#f4f4f4" text-anchor="middle" font-weight="700" font-family="IBM Plex Sans">${volts}V</text><text x="10" y="74" font-size="5.5" fill="#bfc3c8" text-anchor="middle" letter-spacing="1" font-family="IBM Plex Sans">ALKALINE</text><rect x="-15" y="9" width="50" height="78" rx="3" fill="url(#aCyl)" opacity=".6"/></g>
 <rect x="-5.5" y="2.5" width="11" height="7" fill="#9aa0a7"/><rect x="14.5" y="2.5" width="11" height="7" fill="#9aa0a7"/><circle cx="0" cy="0" r="5.6" fill="url(#aMetal)" stroke="#6b7178" stroke-width=".6"/><circle cx="0" cy="0" r="2.6" fill="#8d949c"/><path d="M14.4 -4.6 h11.2 l2.4 4.6 -2.4 4.6 h-11.2 l-2.4 -4.6z" fill="url(#aMetal)" stroke="#6b7178" stroke-width=".6"/><text x="0" y="-8.5" font-size="8" fill="#c62828" text-anchor="middle" font-weight="700">+</text><text x="20" y="-8.5" font-size="10" fill="#1b2230" text-anchor="middle" font-weight="700">−</text>`}

/* ---------- Arduino Uno shaped boards ---------- */
function unoBoard(svg,LK,st,running,pins,lg,glow){const col=LK.color;let b=`<g filter="url(#aSh)"><path d="M-100 -12 H158 L166 -4 V24 L176 34 V170 L166 180 V198 H-100 Z" fill="${pcb(svg,col)}" stroke="${dark(col,.45)}" stroke-width="1"/></g>`;
 b+=hole(-86,0,3.2)+hole(150,-3,0)+hole(-86,186,3.2)+hole(160,60,3.2)+hole(160,160,3.2);
 /* traces */
 b+=`<g stroke="${light(col,.18)}" stroke-width="1.2" fill="none" opacity=".55"><path d="M-40 40 H10 L20 50 H60"/><path d="M-40 52 H5 L18 64 H60"/><path d="M90 20 V60"/><path d="M110 20 V60"/><path d="M120 150 V170"/><path d="M-60 120 H-20 L-10 110 H20"/></g>`;
 /* USB-B and DC jack on the left edge */
 b+=`<g filter="url(#aShS)"><rect x="-124" y="22" width="64" height="48" rx="2" fill="url(#aMetalH)" stroke="#7d848c" stroke-width=".7"/><rect x="-124" y="33" width="12" height="26" fill="#cfd4da" stroke="#8d949c" stroke-width=".5"/><rect x="-121" y="38" width="8" height="16" fill="#3a3b3e"/></g>`;
 b+=`<g filter="url(#aShS)"><rect x="-118" y="135" width="56" height="36" rx="3" fill="url(#aBlack)"/><rect x="-118" y="141" width="10" height="24" fill="#0b0b0c"/><circle cx="-113" cy="153" r="3.4" fill="#4a4c50"/></g>`;
 /* regulator, capacitors, small chip near USB, crystal, reset button */
 b+=`<rect x="-58" y="118" width="22" height="14" fill="url(#aIC)"/><rect x="-60" y="112" width="26" height="7" fill="url(#aMetal)"/>`+ecapSmall(-46,152,7)+ecapSmall(-28,152,7);
 b+=chipSq(-36,52,18,'16U2','')+crystal(-8,30,22)+button(-70,6,16,false)+`<rect x="-46" y="-6" width="20" height="10" fill="url(#aBlack)"/>`;
 /* ICSP header on the right */
 b+=malePins([[150,98],[160,98],[150,108],[160,108],[150,118],[160,118]]);
 /* the DIP microcontroller */
 const big=/328|2560/.test(LK.chip)&&!/R4/.test(LK.label);if(big){b+=`<g filter="url(#aShS)">`;for(let i=0;i<14;i++){const x=6+i*10;b+=`<rect x="${x-1.6}" y="96" width="3.2" height="5" fill="url(#aMetal)"/><rect x="${x-1.6}" y="133" width="3.2" height="5" fill="url(#aMetal)"/>`}b+=`<rect x="-2" y="100" width="146" height="34" rx="1.5" fill="url(#aIC)" stroke="#000" stroke-width=".5"/><path d="M-2 111 a6 6 0 0 1 0 12" fill="#0f1011"/></g><text x="72" y="120" font-size="7.5" fill="#cfd2d5" text-anchor="middle" font-family="IBM Plex Mono">${LK.chip}-PU</text>`}
 else b+=chipSq(70,118,32,LK.chip,'');
 /* silkscreen */
 b+=silk(30,82,LK.label,LK.label.length>6?15:20,'middle','letter-spacing="1.5"')+`<g transform="translate(-6 160)"><ellipse cx="0" cy="0" rx="9" ry="6.5" fill="none" stroke="#f4f7f5" stroke-width="2.2"/><ellipse cx="17" cy="0" rx="9" ry="6.5" fill="none" stroke="#f4f7f5" stroke-width="2.2"/><path d="M-4 0h8M13 0h8M17 -4v8" stroke="#f4f7f5" stroke-width="1.6"/></g>`+silk(48,163,'ARDUINO',9,'start','letter-spacing="1"');
 b+=silk(70,16,'DIGITAL (PWM ~)',5.4)+silk(35,176,'POWER',5.4)+silk(115,176,'ANALOG IN',5.4);
 /* LEDs */
 b+=led(118,34,'#ffb000',!!st.l13,glow)+silk(126,36,'L',5,'start')+led(118,44,'#ffd400',false,glow)+silk(126,46,'TX',5,'start')+led(118,54,'#ffd400',false,glow)+silk(126,56,'RX',5,'start')+led(148,150,'#30d158',running,glow)+silk(140,152,'ON',5,'end');
 /* headers: top 10 + 8, bottom 8 + 6 */
 b+=femaleRow(-30,0,4,null)+femaleRow(10,0,6,null)+femaleRow(80,0,8,null)+femaleRow(-50,190,8,null)+femaleRow(90,190,6,null);
 lg.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;const lit=st.pins&&i<20&&st.pins[i]&&st.pins[i].mode===1&&(st.pins[i].v||st.pins[i].pwm>0);b+=`<rect x="${x-2.3}" y="${y-2.3}" width="4.6" height="4.6" fill="${lit?'#ff5a4e':'#c9a84a'}" opacity="${lit?1:.85}"/><text x="${x}" y="${ly?y-8:y+12}" font-size="5.2" fill="#f4f7f5" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">${pins[i].replace(/^D/,'')}</text>`});
 /* the silkscreen labels for the extra (unused) header slots */
 b+=silk(-30,12,'SCL',3.6)+silk(-20,12,'SDA',3.6)+silk(-10,12,'AREF',3.6)+silk(-50,182,'',3.6);
 return b}

/* ---------- Raspberry Pi boards ---------- */
const PI_SPEC={
 pi5:{w:335,h:221,ports:'pi5',soc:'BCM2712',ram:true,usb3:true},pi4b:{w:335,h:221,ports:'pi4',soc:'BCM2711',ram:true,usb3:true},
 pi3bplus:{w:335,h:221,ports:'pi3',soc:'BCM2837B0',metal:true},pi3b:{w:335,h:221,ports:'pi3',soc:'BCM2837'},pi2b:{w:335,h:221,ports:'pi3',soc:'BCM2836'},pi1bplus:{w:335,h:221,ports:'pi3',soc:'BCM2835'},
 pizero:{w:256,h:118,ports:'zero',soc:'BCM2835'},pizero2w:{w:256,h:118,ports:'zero',soc:'RP3A0'}};
function piBoard(svg,t,LK,st,running,pins,lg,glow,M){if(t==='pi400')return pi400(svg,LK,st,pins,lg,M);const S=PI_SPEC[t]||PI_SPEC.pi4b;const X0=-29,Y0=-9,W=S.w,H=S.h,X1=X0+W,Y1=Y0+H;const col='#1f7a3a';
 let b=`<g filter="url(#aSh)"><rect x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="12" fill="${pcb(svg,col)}" stroke="#0f4a20" stroke-width="1"/></g>`;
 b+=hole(X0+14,Y0+14,5.4)+hole(X0+14+229,Y0+14,5.4)+hole(X0+14,Y1-14,5.4)+hole(X0+14+229,Y1-14,5.4);
 b+=`<g stroke="#2e9a4f" stroke-width="1.1" fill="none" opacity=".5"><path d="M${X0+40} ${Y0+60} H${X0+110} L${X0+125} ${Y0+75}"/><path d="M${X0+40} ${Y0+68} H${X0+105} L${X0+120} ${Y0+83}"/><path d="M${X0+200} ${Y0+40} V${Y0+80} H${X0+240}"/><path d="M${X0+60} ${Y1-50} H${X0+150}"/></g>`;
 const p=S.ports;
 if(p==='zero'){/* mini HDMI, two micro USB on the bottom edge, camera on the right */
  b+=`<g filter="url(#aShS)"><rect x="${X0+28}" y="${Y1-24}" width="44" height="26" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${X0+34}" y="${Y1-6}" width="32" height="6" fill="#1b1c1e"/></g>`;
  for(const x of[X0+165,X0+205])b+=`<g filter="url(#aShS)"><rect x="${x}" y="${Y1-18}" width="30" height="20" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${x+5}" y="${Y1-4}" width="20" height="4" fill="#1b1c1e"/></g>`;
  b+=`<rect x="${X1-18}" y="${Y0+30}" width="16" height="58" rx="1" fill="#2a2a2b"/><rect x="${X1-14}" y="${Y0+33}" width="10" height="52" fill="#d8d3c4"/>`;
  b+=chipSq(X0+125,Y0+68,48,S.soc,t==='pizero2w'?'':'',t==='pizero2w')+`<rect x="${X0-4}" y="${Y0+40}" width="26" height="40" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/>`;
  b+=led(X1-30,Y1-30,'#30d158',running,glow)+silk(X0+125,Y1-34,t==='pizero2w'?'Raspberry Pi Zero 2 W':'Raspberry Pi Zero',9);
 }else{
  /* right edge: USB stacks and Ethernet (order depends on the model) */
  const usbX=X1-62,uw=74;const eth=[usbX-4,Y0+0,78,63];
  if(p==='pi4'){b+=rj45(usbX-4,Y0+10,78,62)+usbA(usbX,Y0+84,uw,52,true)+usbA(usbX,Y0+146,uw,52,false)}
  else{b+=usbA(usbX,Y0+10,uw,52,p==='pi5')+usbA(usbX,Y0+72,uw,52,p==='pi5'?false:false)+rj45(usbX-4,Y0+136,78,62)}
  /* bottom edge connectors */
  if(p==='pi3'){b+=`<g filter="url(#aShS)"><rect x="${X0+20}" y="${Y1-20}" width="32" height="22" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${X0+26}" y="${Y1-4}" width="20" height="4" fill="#1b1c1e"/><rect x="${X0+86}" y="${Y1-44}" width="60" height="46" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${X0+92}" y="${Y1-6}" width="48" height="6" fill="#1b1c1e"/><rect x="${X0+195}" y="${Y1-28}" width="26" height="30" rx="3" fill="url(#aBlack)"/><circle cx="${X0+208}" cy="${Y1-8}" r="5" fill="#0b0b0c"/></g>`+`<rect x="${X0+160}" y="${Y1-40}" width="12" height="36" fill="#2a2a2b"/><rect x="${X0+162}" y="${Y1-38}" width="8" height="32" fill="#e6e1d2"/>`}
  else{b+=`<g filter="url(#aShS)"><rect x="${X0+22}" y="${Y1-22}" width="36" height="24" rx="3" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${X0+28}" y="${Y1-6}" width="24" height="6" rx="2" fill="#1b1c1e"/>`;for(const x of[X0+90,X0+142])b+=`<rect x="${x}" y="${Y1-26}" width="28" height="28" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${x+5}" y="${Y1-5}" width="18" height="5" fill="#1b1c1e"/>`;b+='</g>';
   if(p==='pi4')b+=`<g filter="url(#aShS)"><rect x="${X0+200}" y="${Y1-30}" width="26" height="32" rx="3" fill="url(#aBlack)"/><circle cx="${X0+213}" cy="${Y1-8}" r="5" fill="#0b0b0c"/></g><rect x="${X0+178}" y="${Y1-48}" width="12" height="40" fill="#2a2a2b"/><rect x="${X0+180}" y="${Y1-46}" width="8" height="36" fill="#e6e1d2"/>`;
   else for(const x of[X0+186,X0+214])b+=`<rect x="${x}" y="${Y1-46}" width="14" height="40" fill="#2a2a2b"/><rect x="${x+3}" y="${Y1-44}" width="8" height="36" fill="#d8d3c4"/>`}
  /* left edge: display connector (Pi 4/3) or PCIe (Pi 5) */
  b+=`<rect x="${X0+4}" y="${Y0+64}" width="14" height="70" fill="#2a2a2b"/><rect x="${X0+7}" y="${Y0+67}" width="8" height="64" fill="#e6e1d2"/>`;
  /* SoC, memory, other chips */
  const sx=X0+120,sy=Y0+112;b+=chipSq(sx,sy,58,S.soc,p==='pi5'?'BROADCOM':'',p!=='pi3'||S.metal);
  if(S.ram)b+=chipSq(sx+70,sy-6,44,'D9ZCL','Micron');else b+=`<rect x="${sx+46}" y="${sy-20}" width="34" height="40" rx="2" fill="url(#aIC)"/>`;
  if(p==='pi5')b+=chipSq(X0+222,Y0+150,28,'RP1','');else if(p==='pi4')b+=chipSq(X0+218,Y0+160,22,'VL805','');else b+=chipSq(X0+218,Y0+160,22,'LAN9514','');
  b+=`<rect x="${X0+34}" y="${Y0+92}" width="26" height="22" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/>`;
  for(let i=0;i<6;i++)b+=smd(X0+40+i*9,Y0+170,6,3);for(let i=0;i<4;i++)b+=smd(X0+166+i*9,Y0+138,6,3,'#c9b27a');
  b+=led(X0+22,Y1-56,'#ff3b30',running,glow)+led(X0+22,Y1-46,'#30d158',running&&((Date.now()>>9)&1),glow)+silk(X0+30,Y1-53,'PWR',4.4,'start')+silk(X0+30,Y1-43,'ACT',4.4,'start');
  if(p==='pi5')b+=button(X0+8,Y1-80,12,false);
  const nm={pi5:'Raspberry Pi 5',pi4b:'Raspberry Pi 4 Model B',pi3bplus:'Raspberry Pi 3 Model B+',pi3b:'Raspberry Pi 3 Model B',pi2b:'Raspberry Pi 2 Model B',pi1bplus:'Raspberry Pi 1 Model B+'}[t]||LK.label;
  b+=silk(X0+120,Y0+44,nm,9.5)+`<text x="${X0+120}" y="${Y0+53}" font-size="5" fill="#cfe6d6" text-anchor="middle" font-family="IBM Plex Sans">© Raspberry Pi Ltd</text>`;
  b+=`<g transform="translate(${X0+70} ${Y0+160})" opacity=".9"><path d="M0 -9 c-3 -5 -9 -4 -9 0 c3 2 6 2 9 0 c3 2 6 2 9 0 c0 -4 -6 -5 -9 0z" fill="#f4f7f5"/><circle cx="0" cy="3" r="7.5" fill="none" stroke="#f4f7f5" stroke-width="1.6"/><circle cx="-3" cy="1" r="1.6" fill="#f4f7f5"/><circle cx="3" cy="1" r="1.6" fill="#f4f7f5"/><circle cx="0" cy="6" r="1.6" fill="#f4f7f5"/></g>`}
 /* the 40-pin header */
 const pts=lg.map(([lx,ly])=>[lx*10,ly*10]);b+=`<g filter="url(#aShS)">`+malePins(pts,i=>{const g=[...M.gpio].find(([gg,li])=>li===i);const s=g&&st.pins?st.pins[g[0]]:null;return s&&s.mode===1&&(s.v||s.pwm>0)})+`</g>`;
 lg.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;const up=y===0;const nm=pins[i].replace(/^GPIO/,'');b+=`<text x="${x+1.4}" y="${up?y-7:y+7}" font-size="3.9" fill="${up?'#55606e':'#f4f7f5'}" text-anchor="${up?'start':'end'}" transform="rotate(-90 ${x+1.4} ${up?y-7:y+7})" font-family="IBM Plex Mono" font-weight="600">${nm}</text>`});
 return b}
function pi400(svg,LK,st,pins,lg,M){let b=`<g filter="url(#aSh)"><rect x="-80" y="-24" width="430" height="230" rx="14" fill="#c8102e"/><rect x="-74" y="-10" width="418" height="210" rx="10" fill="#f2f2f0"/></g>`;
 const rows=[14,14,14,13,12];let y=32;rows.forEach((n,r)=>{let x=-58+r*6;const kw=25;for(let i=0;i<n;i++){b+=`<rect x="${x}" y="${y}" width="${kw-3}" height="20" rx="3" fill="#fafafa" stroke="#d3d3d0"/><rect x="${x+2}" y="${y+1.5}" width="${kw-7}" height="14" rx="2" fill="#ffffff"/>`;x+=kw}y+=24});
 b+=`<rect x="40" y="${y}" width="170" height="20" rx="3" fill="#fafafa" stroke="#d3d3d0"/>`+`<text x="300" y="${y+14}" font-size="10" fill="#c8102e" text-anchor="middle" font-weight="700" font-family="IBM Plex Sans">Raspberry Pi 400</text>`;
 b+=`<rect x="-8" y="-8" width="206" height="26" rx="2" fill="#2b2b2b"/>`+malePins(lg.map(([lx,ly])=>[lx*10,ly*10]),i=>{const g=[...M.gpio].find(([gg,li])=>li===i);const s=g&&st.pins?st.pins[g[0]]:null;return s&&s.mode===1&&(s.v||s.pwm>0)});
 lg.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;if(y===0)b+=`<text x="${x+1.4}" y="${y-7}" font-size="3.9" fill="#55606e" text-anchor="start" transform="rotate(-90 ${x+1.4} ${y-7})" font-family="IBM Plex Mono" font-weight="600">${pins[i].replace(/^GPIO/,'')}</text>`});return b}

/* ---------- other Arduino boards (Nano, Micro, Pro Mini, MKR, Mega, Due, Pico W/2) ---------- */
function genericBoard(svg,t,LK,st,running,pins,lg,glow,M){const xs=lg.map(q=>q[0]*10),ys=lg.map(q=>q[1]*10);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
 const rows=new Map();lg.forEach(([lx,ly])=>rows.set(ly,(rows.get(ly)||0)+1));const isRow=ly=>rows.get(ly)>3;
 const colsR=new Set(lg.filter(([lx,ly])=>!isRow(ly)).map(q=>q[0]));const dbl=[...colsR].filter(x=>x*10>x0+30).length>1;
 let L0=x0-(colsR.has(x0/10)&&!isRow(lg.find(q=>q[0]*10===x0)[1])?9:24),R0=x1+(dbl?46:colsR.size?9:24),T0=y0-20,B0=y1+20;if(LK.box)[L0,T0,R0,B0]=LK.box;
 const col=LK.color;const W=R0-L0,Hh=B0-T0;let b=`<g filter="url(#aSh)"><rect x="${L0}" y="${T0}" width="${W}" height="${Hh}" rx="${Math.min(8,W*0.05)}" fill="${pcb(svg,col)}" stroke="${dark(col,.45)}" stroke-width="1"/></g>`;
 const pico=/pico/.test(t);const narrow=W<110;
 if(!narrow){b+=hole(L0+10,T0+10,3)+hole(R0-10,T0+10,3)+hole(L0+10,B0-10,3)+hole(R0-10,B0-10,3)}
 b+=`<g stroke="${light(col,.2)}" stroke-width="1" fill="none" opacity=".45"><path d="M${L0+W*0.3} ${T0+Hh*0.25} V${T0+Hh*0.45} H${L0+W*0.6}"/><path d="M${L0+W*0.35} ${T0+Hh*0.7} H${L0+W*0.7} L${L0+W*0.75} ${T0+Hh*0.65}"/></g>`;
 const cx=(L0+R0)/2-(dbl?20:0),cy=(T0+B0)/2;
 /* USB connector at the top edge (micro USB or USB-C) */
 const uw=narrow?26:34;b+=`<g filter="url(#aShS)"><rect x="${cx-uw/2}" y="${T0-8}" width="${uw}" height="22" rx="${/33|1010|R4/.test(LK.label)?5:2}" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${cx-uw/2+4}" y="${T0-8}" width="${uw-8}" height="4" rx="1.5" fill="#26282b"/></g>`;
 /* chip */
 const cs=Math.min(narrow?30:52,W*0.42,Hh*0.3);b+=chipSq(cx,cy,cs,LK.chip,'');
 if(!pico)b+=crystal(cx,cy+cs/2+14,Math.min(26,W*0.3));
 b+=button(cx+(narrow?0:W*0.25),T0+(narrow?36:30),narrow?12:16,false);
 for(let i=0;i<4;i++)b+=smd(cx-cs/2+i*cs/4,cy-cs/2-12,6,3);
 const ledY=cy-cs/2-24;b+=led(cx-12,ledY,'#ffb000',!!st.l13,glow)+silk(cx-7,ledY+2,'L',5,'start')+led(cx+10,ledY,'#30d158',running,glow);
 b+=silk(cx,cy+cs/2+(pico?14:34),pico?({'PICO W':'Raspberry Pi Pico W','PICO 2':'Raspberry Pi Pico 2'}[LK.label]||'Raspberry Pi Pico'):LK.label,narrow?7.5:13,'middle','letter-spacing=".5"');
 if(pico&&LK.label==='PICO W')b+=`<rect x="${cx-16}" y="${B0-34}" width="32" height="24" rx="1" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/>`;
 /* headers: castellated pads for Pico, black header strips otherwise */
 const pts=lg.map(([lx,ly])=>[lx*10,ly*10]);const lit=i=>{const g=[...M.gpio].find(([gg,li])=>li===i);const s=g&&st.pins?st.pins[g[0]]:null;return s&&s.mode===1&&(s.v||s.pwm>0)};
 if(pico){pts.forEach(([x,y],i)=>{b+=`<circle cx="${x}" cy="${y}" r="4.2" fill="url(#aGold)"/><circle cx="${x}" cy="${y}" r="2" fill="${lit(i)?'#ff5a4e':'#2b2b2b'}"/>`})}
 else b+=malePins(pts,lit);
 lg.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;const nm=pins[i].replace(/^D(?=\d)/,'');
  if(isRow(ly))b+=`<text x="${x}" y="${y===y0?y+11:y-7}" font-size="${nm.length>3?3.4:4.6}" fill="#f4f7f5" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">${nm}</text>`;
  else{const cmax=Math.max(...colsR)*10;const toR=(dbl&&x===cmax)||x<cx;b+=`<text x="${toR?x+7:x-7}" y="${y+2}" font-size="5" fill="#f4f7f5" text-anchor="${toR?'start':'end'}" font-family="IBM Plex Mono" font-weight="600">${nm}</text>`}});
 return b}
function esp32(svg,L,st,running,glow){const W=90,Hh=140;let b=`<g filter="url(#aSh)"><rect x="-11" y="-16" width="${W+22}" height="${Hh+32}" rx="4" fill="${pcb(svg,'#1d1f24')}" stroke="#000" stroke-width=".8"/></g>`;
 b+=`<g filter="url(#aShS)"><rect x="14" y="-6" width="${W-28}" height="78" rx="1.5" fill="#1b4fa0"/><rect x="18" y="16" width="${W-36}" height="54" rx="1.5" fill="url(#aMetal)" stroke="#8b9299" stroke-width=".5"/></g><path d="M20 -2 h8 v8 h6 v-8 h6 v8 h6 v-8 h6 v8 h6 v-8" stroke="#d4a83c" stroke-width="1.6" fill="none"/>`;
 b+=`<text x="${W/2}" y="40" font-size="7.5" fill="#4a5058" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">ESP32</text><text x="${W/2}" y="50" font-size="5" fill="#4a5058" text-anchor="middle" font-family="IBM Plex Mono">WROOM-32</text>`;
 b+=`<g filter="url(#aShS)"><rect x="${W/2-12}" y="${Hh+2}" width="24" height="16" rx="2" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/></g>`+button(18,Hh-6,12)+button(W-18,Hh-6,12)+silk(18,Hh+8,'EN',4.4)+silk(W-18,Hh+8,'BOOT',4.4);
 b+=chipSq(W/2,100,16,'CP2102','');b+=led(W/2+18,Hh-24,'#3d8bff',!!st.l13,glow)+led(W/2-18,Hh-24,'#ff3b30',running,glow);
 const pts=L.legs.map(([lx,ly])=>[lx*10,ly*10]);const M=root.BB.MCU.esp32;b+=malePins(pts,i=>{const g=[...M.gpio].find(([gg,li])=>li===i);const s=g&&st.pins?st.pins[g[0]]:null;return s&&s.mode===1&&(s.v||s.pwm>0)});
 L.legs.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;b+=`<text x="${lx?x-7:x+7}" y="${y+2}" font-size="5" fill="#f4f7f5" text-anchor="${lx?'end':'start'}" font-family="IBM Plex Mono" font-weight="600">${L.pins[i]}</text>`});return b}
/* ---------- sensor modules, drone parts and motors ---------- */
const mono='font-family="IBM Plex Mono"';
function modBoard(svg,x,y,w,h,col,n,labels,title,sub){let b=`<g filter="url(#aSh)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${pcb(svg,col)}" stroke="${dark(col,.45)}" stroke-width=".8"/></g>`;
 b+=hole(x+5,y+5,1.8)+hole(x+w-5,y+5,1.8);for(let i=0;i<n;i++)b+=`<circle cx="${i*10}" cy="-6" r="2.6" fill="url(#aGold)"/><circle cx="${i*10}" cy="-6" r="1.2" fill="#2a2a2a"/>`;
 b+=malePins(Array.from({length:n},(_,i)=>[i*10,0]));labels.forEach((t,i)=>{b+=`<text x="${i*10}" y="-11" font-size="${t.length>3?3.4:4.2}" fill="#f4f7f5" text-anchor="middle" ${mono} font-weight="600">${t}</text>`});
 if(title)b+=silk(x+w/2,y+11,title,6.2);if(sub)b+=`<text x="${x+w/2}" y="${y+18}" font-size="4" fill="#e8eef5" text-anchor="middle" font-family="IBM Plex Sans">${sub}</text>`;return b}
function sht31(svg,pr,st){let b=modBoard(svg,-8,-62,46,50,'#1a1a8c',4,['VIN','GND','SCL','SDA'],'SHT31-D','Temp + Humidity');
 b+=`<rect x="9" y="-40" width="12" height="12" rx="1" fill="#e9eaec" stroke="#9aa0a7" stroke-width=".5"/><rect x="12.5" y="-36.5" width="5" height="5" fill="#c9a227"/><circle cx="15" cy="-34" r="1.4" fill="#5b6168"/>`+smd(-2,-30,5,2.4)+smd(25,-30,5,2.4);
 b+=`<text x="15" y="-68" font-size="6" fill="#1a1a8c" text-anchor="middle" ${mono}>${(+pr.temp).toFixed(1)}°C · ${(+pr.hum).toFixed(0)}%RH</text>`;return b}
function mlx90640(svg,pr,url){let b=modBoard(svg,-8,-70,46,58,'#1d1f24',4,['VIN','GND','SCL','SDA'],'','');
 b+=`<g filter="url(#aShS)"><circle cx="15" cy="-44" r="13" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><circle cx="15" cy="-44" r="8.5" fill="#d8dce1"/><circle cx="15" cy="-44" r="5" fill="#1a1d22"/><circle cx="13.6" cy="-45.5" r="1.4" fill="#fff" opacity=".6"/></g>`+silk(15,-22,'MLX90640',5.2);
 if(url)b+=`<g><rect x="44" y="-72" width="68" height="53" rx="2" fill="#111"/><image href="${url}" x="46" y="-70" width="64" height="48" style="image-rendering:pixelated"/><text x="78" y="-14" font-size="4.4" fill="#333" text-anchor="middle" ${mono}>32×24 · ${(+pr.amb).toFixed(0)} to ${(+pr.obj).toFixed(0)}°C</text></g>`;return b}
function lidar(svg,pr){let b=modBoard(svg,-8,-46,46,34,'#5b2a86',4,['VCC','GND','SCL','SDA'],'','');
 b+=`<rect x="7" y="-38" width="16" height="10" rx="1.5" fill="#111" stroke="#444" stroke-width=".4"/><circle cx="11.5" cy="-33" r="2.3" fill="#4a1d1d"/><circle cx="18.5" cy="-33" r="2.3" fill="#26262e"/><circle cx="11" cy="-33.6" r=".7" fill="#ff5a4e" opacity=".8"/>`+silk(15,-19,'VL53L0X',5);
 const mm=+pr.mm;b+=`<line x1="11.5" y1="-38" x2="11.5" y2="-56" stroke="#ff3b30" stroke-width=".8" stroke-dasharray="2 2" opacity=".7"/><text x="15" y="-58" font-size="6" fill="#5b2a86" text-anchor="middle" ${mono}>${mm>2000?'out of range':mm+' mm'}</text>`;return b}
function camera(svg,pr,url){let b=modBoard(svg,-8,-64,186,52,'#0f6d3a',18,['3V3','GND','SIOC','SIOD','VSYN','HREF','PCLK','XCLK','D7','D6','D5','D4','D3','D2','D1','D0','RST','PWDN'],'','');
 b+=`<g filter="url(#aShS)"><rect x="4" y="-58" width="22" height="22" rx="2" fill="#1b1b1b"/><circle cx="15" cy="-47" r="9" fill="#2b2b2b" stroke="#555"/><circle cx="15" cy="-47" r="6" fill="#0d1726"/><circle cx="15" cy="-47" r="3" fill="#24406b"/><circle cx="13" cy="-49" r="1.3" fill="#fff" opacity=".55"/></g>`+silk(15,-26,'OV2640',5.2)+`<text x="15" y="-19" font-size="3.6" fill="#e8eef5" text-anchor="middle">2 MP RGB</text>`;
 if(url)b+=`<rect x="184" y="-66" width="68" height="53" rx="2" fill="#111"/><image href="${url}" x="186" y="-64" width="64" height="48"/><text x="218" y="-8" font-size="4.4" fill="#333" text-anchor="middle" ${mono}>what the camera sees</text>`;return b}
function mpu6050(svg,pr){let b=modBoard(svg,-8,-50,46,38,'#1f5fae',4,['VCC','GND','SCL','SDA'],'GY-521','');
 b+=chipSq(15,-30,11,'MPU','6050');const r=+pr.roll||0,p=+pr.pitch||0;b+=`<g transform="translate(15 -64)"><circle r="9" fill="#eef3fb" stroke="#1f5fae" stroke-width=".7"/><g transform="rotate(${r})"><line x1="-8" y1="${p/10}" x2="8" y2="${p/10}" stroke="#1f5fae" stroke-width="1.6"/></g><text y="16" font-size="4.4" fill="#1f5fae" text-anchor="middle" ${mono}>R ${r.toFixed(0)}° P ${p.toFixed(0)}°</text></g>`;return b}
function piezo(pr,st,running){const v=Math.abs(st.vo||0);const k=Math.min(1,v/4);let b=`<line x1="0" y1="0" x2="2" y2="-14" stroke="#d33" stroke-width="1.4"/><line x1="20" y1="0" x2="18" y2="-14" stroke="#222" stroke-width="1.4"/>`;
 b+=`<g filter="url(#aShS)" transform="translate(10 -32) scale(${1+0.04*k})"><circle r="22" fill="url(#aGold)" stroke="#9c7419" stroke-width=".6"/><circle r="14" fill="#e9eef3" stroke="#b6bdc5" stroke-width=".6"/><circle r="14" fill="url(#aDome)"/></g>`;
 if(k>0.05)b+=`<circle cx="10" cy="-32" r="${26+10*k}" fill="none" stroke="#ff9500" stroke-width="1.2" opacity="${k}"/>`;b+=`<text x="10" y="-58" font-size="5.5" fill="#7a5a00" text-anchor="middle">${running?'click to tap':'piezo'}</text>`;return b}
function vibration(svg,pr,st){let b=`<g filter="url(#aSh)"><rect x="-6" y="-42" width="32" height="38" rx="2" fill="${pcb(svg,'#1f5fae')}" stroke="#123a6b"/></g>`;
 const sh=pr.on?Math.sin(Date.now()/20)*1.2:0;b+=`<g transform="translate(${sh} 0)"><rect x="2" y="-38" width="16" height="7" rx="3.5" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".5"/></g>`+chipSq(10,-22,7,'LM393','')+`<circle cx="-1" cy="-30" r="1.6" fill="${pr.on?'#ff3b30':'#5a1d1a'}"/><text x="10" y="-46" font-size="5.5" fill="#1f5fae" text-anchor="middle">${pr.on?'SHAKING':'SW-420'}</text>`;
 ['VCC','GND','DO'].forEach((n,i)=>{b+=`<line x1="${i*10}" y1="-4" x2="${i*10}" y2="0" stroke="#a9adb3" stroke-width="1.6"/><text x="${i*10}" y="9" font-size="4.6" fill="#556" text-anchor="middle">${n}</text>`});return b}
function mic(svg,pr,st){let b=`<g filter="url(#aSh)"><rect x="-6" y="-46" width="32" height="42" rx="2" fill="${pcb(svg,'#1d1f24')}" stroke="#000"/></g>`;
 b+=`<g filter="url(#aShS)"><circle cx="10" cy="-32" r="9" fill="url(#aMetal)" stroke="#7d848c"/><circle cx="10" cy="-32" r="6.5" fill="#222"/>${[...Array(5)].map((_,i)=>`<circle cx="${7+i*1.5}" cy="${-32+(i%2?1:-1)}" r=".6" fill="#555"/>`).join('')}</g>`+silk(10,-14,'MAX4466',4.2);
 const lv=+pr.level;if(pr.sound!=='quiet')b+=[1,2,3].map(k=>`<path d="M${22+k*4} ${-38-k*2} Q${26+k*5} -32 ${22+k*4} ${-26+k*2}" stroke="#2f8bff" stroke-width="1" fill="none" opacity="${Math.min(1,lv*1.5)/k}"/>`).join('');
 ['OUT','GND','VCC'].forEach((n,i)=>{b+=`<line x1="${i*10}" y1="-4" x2="${i*10}" y2="0" stroke="#a9adb3" stroke-width="1.6"/><text x="${i*10}" y="9" font-size="4.6" fill="#556" text-anchor="middle">${n}</text>`});return b}
function lipo(pr,st){const n=+pr.cells||4,w=50+n*6;let b=`<line x1="0" y1="0" x2="0" y2="-12" stroke="#d33" stroke-width="2.4"/><line x1="20" y1="0" x2="20" y2="-12" stroke="#222" stroke-width="2.4"/>`;
 b+=`<g filter="url(#aSh)"><rect x="${10-12}" y="-20" width="24" height="9" rx="1.5" fill="#e3c21b" stroke="#a88a00"/><rect x="${10-w/2}" y="-70" width="${w}" height="50" rx="4" fill="#20242a"/><rect x="${10-w/2}" y="-70" width="${w}" height="50" rx="4" fill="url(#aShine)" opacity=".5"/><rect x="${10-w/2+4}" y="-62" width="${w-8}" height="24" rx="2" fill="#ffcc00"/></g>`;
 b+=`<text x="10" y="-52" font-size="9" fill="#111" text-anchor="middle" font-weight="800" font-family="IBM Plex Sans">${n}S LiPo</text><text x="10" y="-42" font-size="5.5" fill="#111" text-anchor="middle" ${mono}>${pr.mah} mAh ${pr.c}C</text>`;
 const v=st.v!=null?st.v:null;b+=`<text x="10" y="-26" font-size="5.5" fill="#ffcc00" text-anchor="middle" ${mono}>${v!=null?v.toFixed(2)+' V':(n*3.7).toFixed(1)+' V'}</text>`;
 b+=`<path d="M${10+w/2} -30 q10 0 10 10 v14" stroke="#ddd" stroke-width="1.6" fill="none"/>`;return b}
function esc(svg,pr,st){let b=`<g filter="url(#aSh)"><rect x="-6" y="-44" width="78" height="30" rx="5" fill="#2a2d33"/><rect x="-6" y="-44" width="78" height="30" rx="5" fill="url(#aShine)" opacity=".4"/><rect x="10" y="-38" width="40" height="16" rx="2" fill="#3f68c9" opacity=".9"/></g>`;
 b+=`<text x="30" y="-27" font-size="7" fill="#fff" text-anchor="middle" font-weight="700" font-family="IBM Plex Sans">${pr.amps}A ESC</text>`+`<circle cx="62" cy="-29" r="2.2" fill="${st.armed?'#30d158':'#ff3b30'}"/>`;
 const W=[['#d33',0],['#111',10],['#f2f2f2',20],['#111',30],['#3a3a3a',50],['#3a3a3a',60],['#3a3a3a',70]];W.forEach(([c,x])=>{b+=`<line x1="${x}" y1="0" x2="${Math.max(-2,Math.min(68,x))}" y2="-14" stroke="${c}" stroke-width="${x>=50||x<=10?2.2:1.2}"/>`});
 ['B+','B−','SIG','GND','A','B','C'].forEach((t,i)=>{const x=[0,10,20,30,50,60,70][i];b+=`<text x="${x}" y="8" font-size="4.4" fill="#445" text-anchor="middle" ${mono}>${t}</text>`});
 if(st.thr!=null)b+=`<rect x="10" y="-12" width="40" height="3" fill="#ddd"/><rect x="10" y="-12" width="${40*st.thr}" height="3" fill="#30d158"/><text x="30" y="-48" font-size="5.5" fill="#333" text-anchor="middle" ${mono}>${st.us!=null?st.us+' µs':'no signal'}${st.armed?' · armed':''}</text>`;return b}
function bldc(svg,pr,st,B){const big=/10|15/.test(B.prop),R=big?52:/5/.test(B.prop)?38:/3/.test(B.prop)?28:18,cw=(pr.dir!=='CCW')!==!!st.rev;const rpm=st.rpm||0;
 let b=`<line x1="0" y1="0" x2="8" y2="-18" stroke="#3a3a3a" stroke-width="1.6"/><line x1="10" y1="0" x2="10" y2="-18" stroke="#3a3a3a" stroke-width="1.6"/><line x1="20" y1="0" x2="12" y2="-18" stroke="#3a3a3a" stroke-width="1.6"/>`;
 b+=`<g filter="url(#aSh)"><circle cx="10" cy="-${R+22}" r="${R*0.28+6}" fill="#26282b"/><circle cx="10" cy="-${R+22}" r="${R*0.28+3}" fill="url(#aMetal)"/>${[...Array(6)].map((_,i)=>`<rect x="${10-1}" y="-${R+22+R*0.28}" width="2" height="${R*0.16}" fill="#26282b" transform="rotate(${i*60} 10 -${R+22})"/>`).join('')}</g>`;
 const pc=pr.dir==='CCW'?'#2f8bff':'#ff6a3d';if(rpm>1500){b+=`<circle cx="10" cy="-${R+22}" r="${R}" fill="${pc}" opacity="${Math.min(.32,.08+rpm/80000)}"/><circle cx="10" cy="-${R+22}" r="${R}" fill="none" stroke="${pc}" stroke-width=".6" opacity=".6"/>`}
 else{b+=`<g transform="rotate(${(st.ang||0).toFixed(1)} 10 -${R+22})">${[0,180].map(a=>`<path d="M10 -${R+22} q${R*0.12} ${-R*0.5} 0 ${-R} q${-R*0.18} ${R*0.5} 0 ${R}z" fill="${pc}" opacity=".9" transform="rotate(${a+(cw?8:-8)} 10 -${R+22})"/>`).join('')}</g>`}
 b+=`<circle cx="10" cy="-${R+22}" r="3" fill="#111"/><text x="10" y="-${R*2+28}" font-size="5.5" fill="#333" text-anchor="middle" ${mono}>${pr.model} ${B.kv}KV · ${B.prop} ${pr.dir}${st.rev?' (spins reversed)':''}</text>`;
 if(rpm>50)b+=`<text x="10" y="-6" font-size="5.5" fill="#0b7a3e" text-anchor="middle" ${mono} transform="translate(0 20)">${Math.round(rpm)} rpm · ${Math.round(st.thrust||0)} g · ${(st.amps||0).toFixed(1)} A</text>`;return b}
function frame(svg,F,info,t){const n=F.arms,L=60;let b='';const D=info&&info.D;const z=D?D.z:0;const sc=Math.min(1.8,1+z*0.06);const ox=D?Math.max(-400,Math.min(400,D.x*60)):0,oy=D?Math.max(-400,Math.min(400,-D.y*60)):0;const yaw=D?-D.ya*57.3:0;
 b+=`<ellipse cx="${ox}" cy="${oy+L*0.15}" rx="${L*1.05}" ry="${L*0.95}" fill="#000" opacity="${Math.max(0.05,0.2-z*0.02)}"/>`;
 b+=`<g transform="translate(${ox-z*6} ${oy-z*10}) scale(${sc}) rotate(${yaw.toFixed(1)})">`;
 for(let i=0;i<n;i++){const a=(i+0.5)*360/n-90;const x=L*Math.cos(a*Math.PI/180),y=L*Math.sin(a*Math.PI/180);const cw=i%2===0;b+=`<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="#1d1f24" stroke-width="${F.size<100?6:8}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${F.size<100?16:22}" fill="${F.size<100?'#1d1f24':'none'}" stroke="${cw?'#ff6a3d':'#2f8bff'}" stroke-width="${F.size<100?2:0.9}" opacity=".75" stroke-dasharray="${F.size<100?'':'3 3'}"/>`;
  const sp=info&&info.spin&&info.spin[i];if(sp>0.02)b+=`<circle cx="${x}" cy="${y}" r="${F.size<100?15:21}" fill="${cw?'#ff6a3d':'#2f8bff'}" opacity="${Math.min(.35,.08+sp*.3)}"/>`;
  b+=`<circle cx="${x}" cy="${y}" r="5" fill="url(#aMetal)" stroke="#333"/><text x="${x}" y="${y+3}" font-size="5" text-anchor="middle" fill="#111" ${mono}>${i+1}</text><text x="${x}" y="${y+(y<0?-26:30)}" font-size="5" text-anchor="middle" fill="${cw?'#c2410c':'#1d4ed8'}" ${mono}>M${i+1} ${cw?'CW':'CCW'}</text>`}
 b+=`<path d="M0 -24 l6 9 h-12z" fill="#30d158"/><rect x="-16" y="-14" width="32" height="28" rx="4" fill="#2a2d33"/><rect x="-10" y="-8" width="20" height="16" rx="1" fill="#0b4fa0"/><text x="0" y="2" font-size="4.6" fill="#fff" text-anchor="middle" ${mono}>FC</text></g>`;
 if(D){const ro=D.ro*57.3,pi=D.pi*57.3;b+=`<g transform="translate(${L+60} ${-L+10})"><circle r="20" fill="#5aa9e6"/><g transform="rotate(${(-ro).toFixed(1)})"><clipPath id="hz"><circle r="20"/></clipPath><rect x="-30" y="${(pi/2).toFixed(1)}" width="60" height="40" fill="#8b5a2b" clip-path="url(#hz)"/></g><line x1="-10" y1="0" x2="10" y2="0" stroke="#ffd60a" stroke-width="2"/><circle r="20" fill="none" stroke="#333"/>
   <text y="31" font-size="5.5" text-anchor="middle" fill="#222" ${mono}>R ${ro.toFixed(0)}° P ${pi.toFixed(0)}°</text></g><g transform="translate(${L+100} ${-L-10})"><rect x="0" y="0" width="8" height="80" rx="2" fill="#e5e9ef" stroke="#999"/><rect x="0" y="${80-Math.min(80,z*8)}" width="8" height="${Math.min(80,z*8)}" rx="2" fill="#30d158"/><text x="12" y="${84-Math.min(80,z*8)}" font-size="6" fill="#222" ${mono}>${z.toFixed(1)} m</text></g>`;
  if(D.crashed)b+=`<text x="0" y="${-L-20}" font-size="12" fill="#e11d48" text-anchor="middle" font-weight="800">CRASHED</text>`}
 if(info)b+=`<text x="0" y="${L+40}" font-size="6" fill="#222" text-anchor="middle" ${mono}>${info.text}</text>`;return b}
function fc(svg,st,running){let b=`<g filter="url(#aSh)"><rect x="-8" y="-58" width="116" height="52" rx="4" fill="${pcb(svg,'#1d1f24')}" stroke="#000"/></g>`;b+=hole(-2,-52,2)+hole(102,-52,2);
 b+=chipSq(50,-34,16,'STM32','F405');b+=`<rect x="74" y="-40" width="8" height="8" rx="1" fill="#2a2a2a"/><text x="78" y="-28" font-size="3.4" fill="#aaa" text-anchor="middle" ${mono}>GYRO</text>`+led(20,-46,'#2f8bff',running&&st.powered,a=>'none')+led(28,-46,st.armed?'#ff3b30':'#30d158',running&&st.powered,a=>'none');
 b+=silk(50,-12,'F405 FC',6);const P=['VBAT','GND','M1','M2','M3','M4','M5','M6','M7','M8'],X=[0,10,30,40,50,60,70,80,90,100];P.forEach((t,i)=>{b+=`<rect x="${X[i]-3.5}" y="-3.5" width="7" height="7" rx="1.5" fill="url(#aGold)"/><text x="${X[i]}" y="-8" font-size="${t.length>2?3.6:4.2}" fill="#f4f7f5" text-anchor="middle" ${mono}>${t}</text>`});
 ['THR','ROLL','PIT','YAW','AUX1'].forEach((t,i)=>{b+=`<line x1="${i*10}" y1="70" x2="${i*10}" y2="62" stroke="#a9adb3" stroke-width="1.4"/><text x="${i*10}" y="${i%2?60:58}" font-size="3.4" fill="#556" text-anchor="middle" ${mono}>${t}</text>`});
 b+=`<path d="M0 -6 v60 M10 -6 v60" stroke="none"/>`;if(st.armed)b+=`<text x="50" y="-62" font-size="6" fill="#e11d48" text-anchor="middle" font-weight="700">ARMED</text>`;return b}
function l298n(svg,st){let b=`<g filter="url(#aSh)"><rect x="-8" y="-84" width="106" height="78" rx="3" fill="${pcb(svg,'#b3261e')}" stroke="#7a1a14"/></g>`;
 b+=`<rect x="25" y="-80" width="40" height="26" rx="1" fill="#2a2a2a"/>${[...Array(8)].map((_,i)=>`<rect x="${27+i*4.8}" y="-80" width="3" height="26" fill="#3b3b3b"/>`).join('')}<rect x="30" y="-52" width="30" height="12" rx="1" fill="url(#aIC)"/><text x="45" y="-44" font-size="4.6" fill="#ddd" text-anchor="middle" ${mono}>L298N</text>`;
 b+=`<circle cx="6" cy="-40" r="6" fill="url(#aCap)"/><circle cx="84" cy="-40" r="6" fill="url(#aCap)"/>`;
 for(const[x,lab]of[[0,'OUT1'],[10,'OUT2'],[80,'OUT3'],[90,'OUT4']])b+=`<rect x="${x-5}" y="-96" width="10" height="10" fill="#2f6fd6" stroke="#1b4a99"/><circle cx="${x}" cy="-90" r="2.6" fill="url(#aMetal)"/><text x="${x}" y="-76" font-size="3.6" fill="#fff" text-anchor="middle" ${mono}>${lab}</text>`;
 const P=['ENA','IN1','IN2','IN3','IN4','ENB'];P.forEach((t,i)=>{b+=`<text x="${i*10}" y="-10" font-size="3.6" fill="#fff" text-anchor="middle" ${mono}>${t}</text>`});b+=malePins(P.map((_,i)=>[i*10,0]));
 [[70,'+12V'],[80,'GND'],[90,'+5V']].forEach(([x,t])=>{b+=`<rect x="${x-5}" y="-6" width="10" height="10" fill="#2f6fd6" stroke="#1b4a99"/><circle cx="${x}" cy="0" r="2.6" fill="url(#aMetal)"/><text x="${x}" y="-10" font-size="3.6" fill="#fff" text-anchor="middle" ${mono}>${t}</text>`});return b}
function dcMotor(svg,kind,st){const a=(st.th||0)*180/Math.PI;const lead=`<line x1="0" y1="0" x2="2" y2="-14" stroke="#d33" stroke-width="1.4"/><line x1="20" y1="0" x2="18" y2="-14" stroke="#222" stroke-width="1.4"/>`;let b=lead;
 const shaft=(cx,cy,r,col)=>`<g transform="rotate(${a.toFixed(1)} ${cx} ${cy})"><rect x="${cx-r*0.12}" y="${cy-r}" width="${r*0.24}" height="${r*2}" rx="${r*0.1}" fill="${col||'#d14b3c'}"/><circle cx="${cx}" cy="${cy}" r="${r*0.22}" fill="#555"/></g>`;
 if(kind==='tt'){b+=`<g filter="url(#aSh)"><rect x="-14" y="-60" width="48" height="44" rx="4" fill="#f2c21b" stroke="#b08a00"/><rect x="-14" y="-30" width="48" height="14" rx="3" fill="#e9ecef" stroke="#9aa0a7"/></g><circle cx="10" cy="-46" r="9" fill="#fff" stroke="#999"/>`+shaft(10,-46,8,'#fff')+`<text x="10" y="-20" font-size="5" text-anchor="middle" fill="#333" ${mono}>1:48</text>`}
 else if(kind==='n20'){b+=`<g filter="url(#aSh)"><rect x="-2" y="-46" width="24" height="18" rx="2" fill="url(#aMetal)" stroke="#7d848c"/><rect x="0" y="-62" width="20" height="16" fill="#d4a83c" stroke="#9c7419"/></g><rect x="9" y="-74" width="2.4" height="12" fill="#cfd3d8"/>`+`<text x="10" y="-34" font-size="4.6" text-anchor="middle" fill="#333" ${mono}>N20</text>`+shaft(10,-74,6,'#888')}
 else if(kind==='coreless'){b+=`<g filter="url(#aSh)"><rect x="4" y="-48" width="12" height="30" rx="5" fill="url(#aMetal)" stroke="#7d848c"/></g><rect x="9" y="-56" width="2" height="8" fill="#cfd3d8"/>`+`<g transform="rotate(${a.toFixed(1)} 10 -58)"><ellipse cx="10" cy="-58" rx="22" ry="3.4" fill="#2f8bff" opacity=".85"/></g><circle cx="10" cy="-58" r="2" fill="#333"/>`}
 else if(kind==='m775'){b+=`<g filter="url(#aSh)"><rect x="-12" y="-86" width="44" height="70" rx="6" fill="url(#aMetal)" stroke="#7d848c"/>${[0,1,2].map(i=>`<rect x="-6" y="${-80+i*7}" width="32" height="3" rx="1" fill="#555"/>`).join('')}</g><circle cx="10" cy="-96" r="10" fill="#e9ecef" stroke="#888"/>`+shaft(10,-96,9)+`<text x="10" y="-34" font-size="7" text-anchor="middle" fill="#333" ${mono}>775</text>`}
 else if(kind==='coin'){const sh=st.rpm>500?Math.sin(Date.now()/15)*1.5:0;b+=`<g transform="translate(${sh} 0)" filter="url(#aSh)"><circle cx="10" cy="-30" r="12" fill="url(#aMetal)" stroke="#7d848c"/><circle cx="10" cy="-30" r="8" fill="none" stroke="#a9adb3"/></g>`+(st.rpm>500?`<path d="M-6 -42 l-4 -4 M26 -42 l4 -4 M-6 -18 l-4 4 M26 -18 l4 4" stroke="#ff9500" stroke-width="1.2"/>`:'')}
 else if(kind==='pump'){const fl=Math.min(1,(st.rpm||0)/9000);b+=`<g filter="url(#aSh)"><rect x="-4" y="-62" width="28" height="44" rx="10" fill="#1d1f24"/><rect x="-10" y="-56" width="10" height="5" rx="2" fill="#eee"/><rect x="4" y="-70" width="5" height="10" rx="2" fill="#eee"/></g>`+(fl>0.05?`<path d="M-12 -54 q-8 0 -10 10" stroke="#38bdf8" stroke-width="${1+fl*3}" fill="none" opacity=".8"/><text x="10" y="-74" font-size="5.5" fill="#0369a1" text-anchor="middle" ${mono}>${(fl*1.8).toFixed(1)} L/min</text>`:'')}
 else if(kind==='fan'){b+=`<g filter="url(#aSh)"><rect x="-10" y="-62" width="40" height="40" rx="3" fill="#2a2d33"/><circle cx="10" cy="-42" r="17" fill="#1b1d22"/></g><g transform="rotate(${a.toFixed(1)} 10 -42)">${[0,72,144,216,288].map(r=>`<path d="M10 -42 q4 -8 0 -15 q-6 4 -3 12z" fill="#555" transform="rotate(${r} 10 -42)"/>`).join('')}</g><circle cx="10" cy="-42" r="5" fill="#333"/>`}
 else{const big=kind==='m370';b+=`<g filter="url(#aSh)"><rect x="-6" y="-58" width="32" height="44" rx="6" fill="url(#aMetal)" stroke="#7c858f"/></g><circle cx="10" cy="-66" r="12" fill="#f2f4f6" stroke="#7c858f"/>`+shaft(10,-66,11)+`<text x="10" y="-32" font-size="7" fill="#3a4049" text-anchor="middle">${big?'370':'M'}</text>`}
 return b}
function nema17(svg,pr,st){const a=st.ang||0;let b=`<g filter="url(#aSh)"><rect x="-4" y="-104" width="58" height="58" rx="5" fill="#2a2d33"/><rect x="2" y="-98" width="46" height="46" rx="3" fill="#3a3d44"/><circle cx="25" cy="-75" r="12" fill="url(#aMetal)" stroke="#555"/></g><g transform="rotate(${a.toFixed(1)} 25 -75)"><rect x="23" y="-87" width="4" height="13" rx="1" fill="#d14b3c"/></g><circle cx="25" cy="-75" r="2.6" fill="#ddd"/><text x="25" y="-108" font-size="6" fill="#333" text-anchor="middle" ${mono}>NEMA 17 · ${a.toFixed(1)}°${st.rpm?' · '+Math.round(st.rpm)+' rpm':''}</text>`;
 b+=`<g filter="url(#aShS)"><rect x="-6" y="-40" width="80" height="30" rx="2" fill="${pcb(svg,'#1d6b2e')}"/><rect x="24" y="-34" width="16" height="16" rx="1" fill="url(#aIC)"/><rect x="26" y="-32" width="12" height="12" fill="#c9ccd1" opacity=".5"/></g>`+silk(60,-28,'A4988',5)+`<circle cx="10" cy="-26" r="3" fill="url(#aKnob)"/>`;
 ['EN','STEP','DIR','','VMOT','GND','VDD','GND'].forEach((t,i)=>{if(t)b+=`<text x="${i*10}" y="-13" font-size="3.6" fill="#fff" text-anchor="middle" ${mono}>${t}</text>`});b+=malePins([0,1,2,4,5,6,7].map(i=>[i*10,0]));b+=`<path d="M10 -46 v6 M16 -46 v6 M34 -46 v6 M40 -46 v6" stroke="#666" stroke-width="1.6"/>`;return b}
function solenoid(st){const o=st.on?0:8;let b=`<line x1="0" y1="0" x2="2" y2="-14" stroke="#d33" stroke-width="1.4"/><line x1="20" y1="0" x2="18" y2="-14" stroke="#222" stroke-width="1.4"/><g filter="url(#aSh)"><rect x="-6" y="-44" width="32" height="30" rx="2" fill="url(#aMetal)" stroke="#7d848c"/><rect x="-2" y="-40" width="24" height="22" fill="#b87333"/></g><rect x="7" y="${-58+o}" width="6" height="18" rx="1.5" fill="#c9ccd1" stroke="#7d848c"/><text x="10" y="-62" font-size="5.5" fill="#333" text-anchor="middle" ${mono}>${st.on?'PULLED':'12 V solenoid'}</text>`;return b}
function scope(svg,pr,st){const W=150,H=96;let b=`<g filter="url(#aSh)"><rect x="-10" y="-130" width="${W+50}" height="122" rx="6" fill="#d9dde3" stroke="#8a929c"/><rect x="-4" y="-124" width="${W}" height="${H}" rx="2" fill="#0a1a12"/></g>`;
 for(let i=1;i<10;i++)b+=`<line x1="${-4+i*W/10}" y1="-124" x2="${-4+i*W/10}" y2="${-124+H}" stroke="#1f3b2c" stroke-width=".5"/>`;for(let i=1;i<8;i++)b+=`<line x1="-4" y1="${-124+i*H/8}" x2="${W-4}" y2="${-124+i*H/8}" stroke="#1f3b2c" stroke-width=".5"/>`;
 const vd=+pr.vd||1;const tr=st.trace||[];const Y=v=>Math.max(-124,Math.min(-28,-76-v/vd*H/8));if(tr.length>1){b+=`<polyline points="${tr.map(q=>`${(-4+q[0]*W).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="#ffd60a" stroke-width="1.2"/><polyline points="${tr.map(q=>`${(-4+q[0]*W).toFixed(1)},${Y(q[2]).toFixed(1)}`).join(' ')}" fill="none" stroke="#38bdf8" stroke-width="1.2"/>`}
 const f=st.freq||0;b+=`<text x="0" y="-117" font-size="5" fill="#9fe" ${mono}>CH1 ${vd} V/div · ${(pr.tb*1000).toFixed(pr.tb<0.001?2:1)} ms/div</text><text x="${W-8}" y="-117" font-size="5" fill="#ffd60a" text-anchor="end" ${mono}>${st.vpp!=null?st.vpp.toFixed(2)+' Vpp':''} ${f?(f>=1000?(f/1000).toFixed(2)+' kHz':f.toFixed(1)+' Hz'):''}</text>`;
 for(let i=0;i<6;i++)b+=`<circle cx="${W+12+(i%2)*16}" cy="${-110+Math.floor(i/2)*22}" r="5" fill="url(#aKnob)" stroke="#888"/>`;
 [['CH1','#ffd60a',0],['CH2','#38bdf8',20],['GND','#222',40]].forEach(([t,c,x])=>{b+=`<line x1="${x}" y1="0" x2="${x}" y2="-8" stroke="${c==='#ffd60a'?'#d4a800':c}" stroke-width="2"/><text x="${x}" y="8" font-size="4.4" fill="#445" text-anchor="middle" ${mono}>${t}</text>`});return b}
function fgen(pr,st){let b=`<g filter="url(#aSh)"><rect x="-20" y="-60" width="80" height="52" rx="5" fill="#d9dde3" stroke="#8a929c"/><rect x="-14" y="-54" width="50" height="18" rx="1.5" fill="#132015"/></g>`;
 const f=+pr.freq;b+=`<text x="33" y="-41" font-size="8" fill="#57f287" text-anchor="end" ${mono}>${f>=1000?(f/1000).toFixed(2)+'k':f}Hz</text><text x="-12" y="-28" font-size="5" fill="#333" ${mono}>${pr.wave} ${pr.amp} V ± · ${pr.off} V</text><circle cx="48" cy="-44" r="7" fill="url(#aKnob)" stroke="#888"/><text x="20" y="-14" font-size="5" fill="#445" text-anchor="middle">FUNCTION GENERATOR</text>`;
 [['#d33',0,'OUT'],['#222',20,'GND']].forEach(([c,x,t])=>{b+=`<line x1="${x}" y1="0" x2="${x}" y2="-8" stroke="${c}" stroke-width="2"/><text x="${x}" y="8" font-size="4.4" fill="#445" text-anchor="middle" ${mono}>${t}</text>`});return b}
function logicprobe(st,glow){const lv=st.pw?st.lv:-1;let b=`<g filter="url(#aSh)"><rect x="-4" y="-80" width="16" height="64" rx="7" fill="#1f5fae"/></g><path d="M4 -16 l0 10" stroke="#c9ccd1" stroke-width="2"/>`;
 const L=(y,c,on,t)=>(on?`<circle cx="4" cy="${y}" r="7" fill="${glow(c)}" opacity=".9"/>`:'')+`<circle cx="4" cy="${y}" r="3" fill="${on?c:'#333'}"/><text x="16" y="${y+2}" font-size="5" fill="#333" ${mono}>${t}</text>`;
 b+=L(-70,'#ff3b30',lv===1,'HI')+L(-58,'#30d158',lv===0,'LO')+L(-46,'#ffd60a',!!st.pulse,'PULSE');b+=`<line x1="4" y1="-6" x2="0" y2="0" stroke="#c9ccd1" stroke-width="1.6"/>`;
 [['#d33',20,'VCC'],['#222',40,'GND']].forEach(([c,x,t])=>{b+=`<path d="M10 -76 Q${x} -90 ${x} -8" stroke="${c}" stroke-width="1.6" fill="none"/><line x1="${x}" y1="-8" x2="${x}" y2="0" stroke="${c}" stroke-width="2"/><text x="${x}" y="8" font-size="4.4" fill="#445" text-anchor="middle" ${mono}>${t}</text>`});b+=`<text x="0" y="8" font-size="4.4" fill="#445" text-anchor="middle" ${mono}>TIP</text>`;return b}
function esp32s3(svg,L,st,running,glow,M){const W=100,H=210;let b=`<g filter="url(#aSh)"><rect x="-10" y="-30" width="${W+20}" height="${H+52}" rx="4" fill="${pcb(svg,'#1d1f24')}" stroke="#000" stroke-width=".8"/></g>`;
 b+=`<g filter="url(#aShS)"><rect x="18" y="-24" width="${W-36}" height="94" rx="1.5" fill="#1b4fa0"/><rect x="22" y="2" width="${W-44}" height="64" rx="1.5" fill="url(#aMetal)" stroke="#8b9299" stroke-width=".5"/></g><path d="M24 -20 h8 v10 h6 v-10 h6 v10 h6 v-10 h6 v10 h6 v-10 h6" stroke="#d4a83c" stroke-width="1.6" fill="none"/>`;
 b+=`<text x="${W/2}" y="28" font-size="8" fill="#4a5058" text-anchor="middle" ${mono} font-weight="600">ESP32-S3</text><text x="${W/2}" y="38" font-size="5" fill="#4a5058" text-anchor="middle" ${mono}>WROOM-1</text><text x="${W/2}" y="48" font-size="4" fill="#4a5058" text-anchor="middle" ${mono}>N16R8</text>`;
 b+=chipSq(W/2,110,14,'','')+`<g filter="url(#aShS)">`+[24,W-24].map(x=>`<rect x="${x-10}" y="${H+8}" width="20" height="12" rx="4" fill="url(#aMetal)" stroke="#7d848c" stroke-width=".6"/><rect x="${x-6}" y="${H+12}" width="12" height="4" rx="2" fill="#26282b"/>`).join('')+`</g>`+silk(24,H+4,'USB',4)+silk(W-24,H+4,'UART',4);
 b+=button(30,H-24,13)+button(W-30,H-24,13)+silk(30,H-12,'BOOT',4.4)+silk(W-30,H-12,'RST',4.4);
 const on=!!st.l13;b+=(on?`<circle cx="${W/2}" cy="140" r="11" fill="${glow('#ffffff')}" opacity=".9"/>`:'')+`<rect x="${W/2-4}" y="136" width="8" height="8" rx="1" fill="${on?'#ffffff':'#e9e3d8'}" stroke="#9aa0a7" stroke-width=".5"/>`+silk(W/2,152,'RGB 48',4)+led(W/2+22,140,'#ff3b30',running,glow);
 b+=silk(W/2,170,'ESP32-S3-DevKitC-1',5.4);
 const pts=L.legs.map(([lx,ly])=>[lx*10,ly*10]);b+=malePins(pts,i=>{const g=[...M.gpio].find(([gg,li])=>li===i);const s=g&&st.pins?st.pins[g[0]]:null;return s&&s.mode===1&&(s.v||s.pwm>0)});
 L.legs.forEach(([lx,ly],i)=>{const x=lx*10,y=ly*10;b+=`<text x="${lx?x-7:x+7}" y="${y+2}" font-size="5" fill="#f4f7f5" text-anchor="${lx?'end':'start'}" ${mono} font-weight="600">${L.pins[i].replace(/^IO/,'')}</text>`});return b}
/*XART*/
/* ---------- parts from parts-extra.js ---------- */
function xel(el,cx,cy,col,st){const lit=st&&st.lit;switch(el){
 case'fork':return`<rect x="${cx-9}" y="${cy-6}" width="18" height="10" rx="1" fill="#1d1d1d"/>`+smd(cx-6,cy+6,5,2.4)+smd(cx+1,cy+6,5,2.4);
 case'can':return`<circle cx="${cx}" cy="${cy}" r="11" fill="url(#aMetal)" stroke="#7d848c"/><circle cx="${cx}" cy="${cy}" r="8.5" fill="#c9ccd1" stroke="#9aa0a7" stroke-dasharray="1.2 1"/><circle cx="${cx}" cy="${cy}" r="3" fill="#8d949c"/>`;
 case'irled':return`<rect x="${cx-3}" y="${cy-12}" width="6" height="10" rx="3" fill="#1b1b1b"/>`+smd(cx-8,cy+2,6,2.6)+smd(cx+3,cy+2,6,2.6);
 case'irpair':return`<rect x="${cx-10}" y="${cy-10}" width="7" height="12" rx="3.5" fill="#d9dde2"/><rect x="${cx+3}" y="${cy-10}" width="7" height="12" rx="3.5" fill="#1b1b1b"/>`;
 case'mic':return`<circle cx="${cx}" cy="${cy}" r="7" fill="url(#aMetal)" stroke="#6b7178"/><circle cx="${cx}" cy="${cy}" r="5" fill="#2a2a2a"/>`;
 case'ldr':return`<circle cx="${cx}" cy="${cy}" r="6" fill="#f1e3c6" stroke="#b79d68"/><path d="M${cx-4} ${cy-2}h8M${cx-4} ${cy+1}h8M${cx-4} ${cy+4}h8" stroke="#c0541e" stroke-width="1"/>`;
 case'to92':return`<path d="M${cx-5} ${cy+5}V${cy-3}a5 4 0 0 1 10 0v8z" fill="#1f1f1f"/>`;
 case'chip':return`<rect x="${cx-6}" y="${cy-6}" width="12" height="12" rx="1" fill="#1d1d1d"/><circle cx="${cx-3.5}" cy="${cy-3.5}" r=".9" fill="#555"/>`;
 case'bead':return`<line x1="${cx}" y1="${cy+6}" x2="${cx}" y2="${cy-4}" stroke="#bbb"/><circle cx="${cx}" cy="${cy-6}" r="3.2" fill="#3b2a1a"/>`;
 case'heart':return`<path d="M${cx} ${cy+6} l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5z" fill="${lit?'#ff4d4d':'#f2f2f2'}"/>`;
 case'pad':return`<circle cx="${cx}" cy="${cy}" r="8" fill="${lit?'#ffd0d0':'#f6f6f6'}" stroke="#bbb"/><circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="#999"/>`;
 case'strip':return`<rect x="${cx-3}" y="${cy-14}" width="6" height="26" rx="1.5" fill="#d4a83c" stroke="#8c6a1a"/>`;
 case'slider':return`<rect x="${cx-16}" y="${cy-2}" width="32" height="4" rx="2" fill="#555"/><rect x="${cx-4}" y="${cy-6}" width="8" height="12" rx="1" fill="#e9ecef"/>`;
 case'bnc':return`<circle cx="${cx}" cy="${cy}" r="7" fill="url(#aMetal)" stroke="#6b7178"/><circle cx="${cx}" cy="${cy}" r="2.2" fill="#d4a83c"/>`;
 case'traces':return`<path d="M${cx-12} ${cy-8}h24M${cx-12} ${cy-3}h24M${cx-12} ${cy+2}h24M${cx-12} ${cy+7}h24" stroke="#d4a83c" stroke-width="1.6"/>`;
 case'plate':return`<path d="M${cx-12} ${cy-8}h24v4h-20v4h20v4h-20v4h20" stroke="#d4a83c" stroke-width="1.4" fill="none"/>`;
 case'glass':return`<rect x="${cx-12}" y="${cy-3}" width="24" height="6" rx="3" fill="#d9eef7" opacity=".85" stroke="#8fb4c8"/><line x1="${cx-8}" y1="${cy}" x2="${cx+8}" y2="${cy}" stroke="#8d6b2a"/>`;
 case'lever':return`<rect x="${cx-10}" y="${cy-4}" width="20" height="10" rx="1" fill="#1d1d1d"/><line x1="${cx-9}" y1="${cy-5}" x2="${cx+10}" y2="${cy-12+(lit?6:0)}" stroke="#c9ccd1" stroke-width="1.6"/>`;
 case'spring':return`<path d="M${cx-8} ${cy}q2 -6 4 0t4 0t4 0t4 0" stroke="#c9ccd1" stroke-width="1.4" fill="none"/>`;
 case'patch':return`<rect x="${cx-10}" y="${cy-10}" width="20" height="20" rx="1" fill="#c9a227"/><rect x="${cx-7}" y="${cy-7}" width="14" height="14" fill="#e3c86b"/><circle cx="${cx+4}" cy="${cy+4}" r="1.3" fill="#8d6b2a"/>`;
 case'antenna':return`<path d="M${cx-10} ${cy+4}h4v-8h4v8h4v-8h4v8h4" stroke="#d4a83c" stroke-width="1.2" fill="none"/>`;
 case'sma':return`<rect x="${cx-4}" y="${cy-12}" width="8" height="12" fill="url(#aMetal)" stroke="#6b7178"/>`;
 case'lens':return`<circle cx="${cx}" cy="${cy}" r="8" fill="#1b1b1b" stroke="#555"/><circle cx="${cx}" cy="${cy}" r="4" fill="#24406b"/>`;
 case'grille':return`<rect x="${cx-10}" y="${cy-12}" width="20" height="24" rx="2" fill="#f2f2f2" stroke="#bbb"/>`+[...Array(5)].map((_,i)=>`<rect x="${cx-7}" y="${cy-9+i*4.5}" width="14" height="2" fill="#cfd3d8"/>`).join('');
 case'probe':return`<rect x="${cx-3}" y="${cy-14}" width="6" height="22" rx="3" fill="url(#aMetal)" stroke="#6b7178"/>`;
 case'leds':return[...Array(4)].map((_,i)=>`<rect x="${cx-19+i*10}" y="${cy-4}" width="8" height="8" fill="#f6f6f6" stroke="#bbb"/>`).join('');
 case'coil':return`<circle cx="${cx}" cy="${cy}" r="8" fill="#3a3a3a"/><circle cx="${cx}" cy="${cy}" r="4" fill="#b87333"/>`;
 case'coin':return`<circle cx="${cx}" cy="${cy}" r="9" fill="url(#aMetal)" stroke="#6b7178"/><text x="${cx}" y="${cy+2}" font-size="4" text-anchor="middle" fill="#333">CR2032</text>`;
 case'sd':return`<rect x="${cx-9}" y="${cy-8}" width="18" height="15" rx="1" fill="url(#aMetal)" stroke="#6b7178"/>`;
 case'keys':return[...Array(4)].map((_,i)=>[...Array(4)].map((__,j)=>`<rect x="${cx-14+j*7}" y="${cy-14+i*7}" width="5.5" height="5.5" rx="1" fill="#e9ecef"/>`).join('')).join('');
 case'terminal':return`<rect x="${cx-9}" y="${cy-7}" width="18" height="10" fill="#2f6fd6"/><circle cx="${cx-4.5}" cy="${cy-2}" r="2" fill="#c9ccd1"/><circle cx="${cx+4.5}" cy="${cy-2}" r="2" fill="#c9ccd1"/>`;
 case'usb':return`<rect x="${cx-6}" y="${cy-9}" width="12" height="6" rx="2" fill="url(#aMetal)" stroke="#6b7178"/>`+smd(cx-4,cy+2,8,3,'#1d1d1d');
 case'pads':return[...Array(4)].map((_,i)=>`<rect x="${cx-14+i*7.5}" y="${cy-8}" width="5" height="16" fill="#d4a83c"/>`).join('');
 default:return''}}
function xmod(svg,L,p,st,running){const e=L.x,lk=e.look||{},n=L.pins.length;const w=Math.max(46,(n-1)*10+16),x=-8,y=-62,h=50;
 let b=modBoard(svg,x,y,w,h,lk.col||'#1f5fae',n,L.pins.map(t=>t.length>5?t.replace(/[^A-Z0-9+−]/g,'').slice(0,4)||t.slice(0,4):t),lk.title||'',lk.sub||'');
 if(/^#(f|e|d)/i.test(lk.col||''))b=b.replace(/fill="#f4f7f5"/g,'fill="#2a2f36"').replace(/fill="#e8eef5"/g,'fill="#2a2f36"');
 b+=xel(lk.el,x+w/2,y+33,lk.col,st);
 if(e.sim==='asens'||e.sim==='dsens'){const on=running&&st&&st.lit;b+=`<circle cx="${x+w-7}" cy="${y+h-8}" r="2.2" fill="${on?'#ff3b30':'#5a1d1d'}"/>`+(on?`<circle cx="${x+w-7}" cy="${y+h-8}" r="5" fill="#ff3b30" opacity=".35"/>`:'')}
 if((e.sim==='asens'||e.sim==='asens3')&&e.ui){const f=BB_FRAC?BB_FRAC(p,0):0.5;b+=`<rect x="${x+4}" y="${y+h-6}" width="${(w-16)}" height="2.4" fill="#0007"/><rect x="${x+4}" y="${y+h-6}" width="${((w-16)*f).toFixed(1)}" height="2.4" fill="#ffd60a"/>`}
 if(e.sim==='module'&&/^(linact|pump12|peltier|xt60)$/.test(e.key)){}
 return b}
let BB_FRAC=null;function setFrac(f){BB_FRAC=f}
function cell(pr,volts){const k=pr.kind||'',X=BBX_LOOK(k);const sh=X.shape||'cyl';
 let b=`<line x1="0" y1="0" x2="0" y2="14" stroke="#d33" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="14" stroke="#222" stroke-width="2"/>`;
 const lab=`${volts} V`;
 if(sh==='coin'){b+=`<g filter="url(#aSh)"><circle cx="10" cy="30" r="17" fill="url(#aMetal)" stroke="#6b7178"/><circle cx="10" cy="30" r="13" fill="none" stroke="#9aa0a7" stroke-width=".6"/></g><text x="10" y="29" font-size="5.5" text-anchor="middle" fill="#333" font-weight="700">${k.toUpperCase()}</text><text x="10" y="37" font-size="5" text-anchor="middle" fill="#333">${lab}</text>`}
 else if(sh==='pack'||sh==='box'||sh==='solar'){const col=X.col||'#1d1d1d';const nn=X.n||1;const W=Math.max(40,nn*16+8);b+=`<g filter="url(#aSh)"><rect x="${10-W/2}" y="14" width="${W}" height="${sh==='solar'?40:56}" rx="3" fill="${sh==='solar'?'#1b2a4a':col}" stroke="#111"/></g>`;
  if(sh==='solar')for(let i=0;i<4;i++)for(let j=0;j<3;j++)b+=`<rect x="${10-W/2+3+i*(W-6)/4}" y="${17+j*12}" width="${(W-6)/4-1.5}" height="10.5" fill="#24406b" stroke="#8fa9cf" stroke-width=".3"/>`;
  else if(X.m3shape==='holder')for(let i=0;i<nn;i++)b+=`<rect x="${10-W/2+4+i*16}" y="18" width="13" height="48" rx="6" fill="#2b2f36"/><rect x="${10-W/2+4+i*16}" y="18" width="13" height="7" fill="#d4a83c"/>`;
  else if(sh==='pack')for(let i=0;i<nn;i++)b+=`<rect x="${10-W/2+4+i*16}" y="18" width="13" height="48" rx="6" fill="${col}" opacity=".9"/><rect x="${10-W/2+4+i*16}" y="18" width="13" height="48" rx="6" fill="url(#aCyl)" opacity=".5"/>`;
  b+=`<rect x="${10-W/2+2}" y="${sh==='solar'?55:58}" width="${W-4}" height="10" rx="2" fill="#0009"/><text x="10" y="${sh==='solar'?62:65}" font-size="6.5" text-anchor="middle" fill="#fff" font-weight="700" font-family="IBM Plex Sans">${lab}</text>`}
 else{const col=X.col||'#2b2f36',band=X.band||'#d4a83c';const H=Math.min(80,Math.max(46,(X.d||50)*1.2)),W=Math.min(40,Math.max(16,(X.w||14)*1.6));
  b+=`<g filter="url(#aSh)"><rect x="${10-W/2}" y="16" width="${W}" height="${H}" rx="${W*0.18}" fill="${col}"/><rect x="${10-W/2}" y="16" width="${W}" height="${H*0.25}" rx="${W*0.18}" fill="${band}"/><rect x="${10-W/2}" y="16" width="${W}" height="${H}" rx="${W*0.18}" fill="url(#aCyl)" opacity=".55"/><rect x="${10-W*0.18}" y="13" width="${W*0.36}" height="4" fill="#c9ccd1"/></g>`;
  b+=`<text x="10" y="${16+H*0.62}" font-size="${W>24?7:5.5}" text-anchor="middle" fill="#fff" font-weight="700" font-family="IBM Plex Sans" transform="rotate(-90 10 ${16+H*0.62})">${(k||'').toUpperCase()} ${lab}</text>`}
 b+=`<text x="0" y="-3" font-size="7" fill="#c62828" text-anchor="middle" font-weight="700">+</text><text x="20" y="-3" font-size="8" fill="#1b2230" text-anchor="middle" font-weight="700">−</text>`;return b}
function BBX_LOOK(k){const X=(root.BBX&&root.BBX.BY['battery:'+k])||null;return X&&X.m3d?Object.assign({},X.m3d,{m3shape:X.m3d.shape,shape:X.look&&X.look.shape==='coin'?'coin':X.look&&X.look.shape==='pack'?(X.m3d.shape==='holder'?'pack':'pack'):X.look&&X.look.shape==='box'?'box':X.look&&X.look.shape==='solar'?'solar':'cyl'}):{shape:'cyl'}}

root.BBART={xmod,cell,setFrac,nema17,solenoid,scope,fgen,logicprobe,fc,sht31,mlx90640,lidar,camera,mpu6050,piezo,vibration,mic,lipo,esc,bldc,frame,l298n,dcMotor,esp32s3,install,pcb,breadboard,resistor,diode,led5,ceramic,electrolytic,to92,dip,tactile,slide,pot,battery9,unoBoard,piBoard,genericBoard,esp32,leg};
})(typeof window!=='undefined'?window:globalThis);
