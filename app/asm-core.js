/* CEsim 8086: two-pass assembler (real machine code) and CPU emulator with DOS/BIOS services. */
(function(root){
'use strict';
const R16=['ax','cx','dx','bx','sp','bp','si','di'];
const R8=['al','cl','dl','bl','ah','ch','dh','bh'];
const SREG=['es','cs','ss','ds'];
const CC={o:0,no:1,b:2,c:2,nae:2,ae:3,nb:3,nc:3,e:4,z:4,ne:5,nz:5,be:6,na:6,a:7,nbe:7,s:8,ns:9,p:10,pe:10,np:11,po:11,l:12,nge:12,ge:13,nl:13,le:14,ng:14,g:15,nle:15};
const ALU={add:0,or:1,adc:2,sbb:3,and:4,sub:5,xor:6,cmp:7};
const GRP3={not:2,neg:3,mul:4,imul:5,div:6,idiv:7};
const SHF={rol:0,ror:1,rcl:2,rcr:3,shl:4,sal:4,shr:5,sar:7};
const SIMPLE={nop:[0x90],hlt:[0xF4],clc:[0xF8],stc:[0xF9],cmc:[0xF5],cld:[0xFC],std:[0xFD],cli:[0xFA],sti:[0xFB],cbw:[0x98],cwd:[0x99],pushf:[0x9C],popf:[0x9D],sahf:[0x9E],lahf:[0x9F],xlat:[0xD7],xlatb:[0xD7],iret:[0xCF],into:[0xCE],aaa:[0x37],aas:[0x3F],daa:[0x27],das:[0x2F],aam:[0xD4,0x0A],aad:[0xD5,0x0A],movsb:[0xA4],movsw:[0xA5],cmpsb:[0xA6],cmpsw:[0xA7],stosb:[0xAA],stosw:[0xAB],lodsb:[0xAC],lodsw:[0xAD],scasb:[0xAE],scasw:[0xAF],wait:[0x9B]};
const STROPS=new Set(['movsb','movsw','cmpsb','cmpsw','stosb','stosw','lodsb','lodsw','scasb','scasw']);
const LOOPS={loop:0xE2,loope:0xE1,loopz:0xE1,loopne:0xE0,loopnz:0xE0,jcxz:0xE3};
const PREFIX={rep:0xF3,repe:0xF3,repz:0xF3,repne:0xF2,repnz:0xF2,lock:0xF0};
const MNEM=new Set([...Object.keys(ALU),...Object.keys(GRP3),...Object.keys(SHF),...Object.keys(SIMPLE),...Object.keys(LOOPS),'mov','test','xchg','inc','dec','push','pop','lea','lds','les','jmp','call','ret','retf','retn','int','in','out',...Object.keys(CC).map(c=>'j'+c)]);
const DIRS=new Set(['db','dw','dd','equ','=','proc','endp','segment','ends','label']);
const PAR=new Uint8Array(256);for(let i=0;i<256;i++){let p=0;for(let b=i;b;b>>=1)p^=b&1;PAR[i]=p?0:1}
const F={CF:0,PF:2,AF:4,ZF:6,SF:7,TF:8,IF:9,DF:10,OF:11};
const hex=(v,n)=>(v>>>0).toString(16).toUpperCase().padStart(n,'0');
class AsmError extends Error{}
const err=m=>{throw new AsmError(m)};

/* ---------- lexer ---------- */
function lex(s){
 const t=[];let i=0;
 while(i<s.length){const c=s[i];
  if(/\s/.test(c)){i++;continue}
  if(c==="'"||c==='"'){let j=i+1,v='';while(j<s.length&&s[j]!==c)v+=s[j++];if(j>=s.length)err('A string is missing its closing quote');t.push({t:'str',v});i=j+1;continue}
  if(/[0-9]/.test(c)){let j=i;while(j<s.length&&/[0-9a-zA-Z_]/.test(s[j]))j++;t.push({t:'num',v:parseNum(s.slice(i,j))});i=j;continue}
  if(/[A-Za-z_@?.]/.test(c)){let j=i;while(j<s.length&&/[\w@?$.]/.test(s[j]))j++;t.push({t:'id',v:s.slice(i,j).toLowerCase()});i=j;continue}
  if('+-*/()[]:,$'.includes(c)){t.push({t:c});i++;continue}
  err(`Unexpected character "${c}"`)}
 return t}
function parseNum(w){const s=w.toLowerCase();let m;
 if((m=s.match(/^0x([0-9a-f]+)$/)))return parseInt(m[1],16);
 if((m=s.match(/^([0-9][0-9a-f]*)h$/)))return parseInt(m[1],16);
 if((m=s.match(/^([01]+)[by]$/)))return parseInt(m[1],2);
 if((m=s.match(/^([0-7]+)[oq]$/)))return parseInt(m[1],8);
 if((m=s.match(/^([0-9]+)d?$/)))return parseInt(m[1],10);
 err(`"${w}" is not a valid number. Hex numbers end with h, for example 0FFh`)}

/* ---------- expressions -> linear address forms ---------- */
const L=(c)=>({c,regs:[],mem:false,vmem:false,rel:0,type:0,sym:false,undef:false,seg:-1,label:false,ptr:false});
function merge(a,b,sign){const r=L(a.c+sign*b.c);if(sign<0&&b.regs.length)err('A register cannot be subtracted in an address');r.regs=a.regs.concat(b.regs);r.mem=a.mem||b.mem;r.vmem=a.vmem||b.vmem;r.rel=a.rel+sign*b.rel;r.type=a.type||b.type;r.sym=a.sym||b.sym;r.undef=a.undef||b.undef;r.seg=a.seg>=0?a.seg:b.seg;r.label=a.label||b.label;r.ptr=a.ptr||b.ptr;r.count=a.count||b.count;r.segv=a.segv!=null?a.segv:b.segv;if(sign<0&&a.rel>0&&b.rel>0&&r.rel===0){r.vmem=false;r.label=false;r.type=a.ptr?a.type:0;r.sym=a.undef||b.undef}return r}
function pureConst(x,what){if(x.regs.length||x.mem||x.vmem)err(`${what} needs a constant value`);return x}
function parseExpr(toks,ctx){let p=0;
 const peek=()=>toks[p],eat=t=>{if(toks[p]&&(toks[p].t===t||(toks[p].t==='id'&&toks[p].v===t))){p++;return true}return false};
 function expr(){return orx()}
 function orx(){let a=andx();for(;;){if(eat('or')){const b=andx();a=bin(a,b,(x,y)=>x|y)}else if(eat('xor')){const b=andx();a=bin(a,b,(x,y)=>x^y)}else return a}}
 function andx(){let a=add();while(eat('and')){const b=add();a=bin(a,b,(x,y)=>x&y)}return a}
 function bin(a,b,f){pureConst(a,'This operator');pureConst(b,'This operator');const r=L(f(a.c,b.c));r.sym=a.sym||b.sym;r.undef=a.undef||b.undef;return r}
 function add(){let a=mul();for(;;){if(eat('+'))a=merge(a,mul(),1);else if(eat('-'))a=merge(a,mul(),-1);else return a}}
 function mul(){let a=un();for(;;){if(eat('*')){const b=un();a=bin(a,b,(x,y)=>x*y)}else if(eat('/')){const b=un();if(!b.c&&!b.undef)err('Division by zero in an expression');a=bin(a,b,(x,y)=>y?Math.trunc(x/y):0)}else if(eat('mod')){const b=un();a=bin(a,b,(x,y)=>y?x%y:0)}else if(eat('shl')){const b=un();a=bin(a,b,(x,y)=>x<<y)}else if(eat('shr')){const b=un();a=bin(a,b,(x,y)=>x>>>y)}else return a}}
 function un(){const t=peek();if(!t)err('An expression is incomplete');
  if(eat('-')){const a=pureConst(un(),'Negation');const r=L(-a.c);r.sym=a.sym;r.undef=a.undef;return r}
  if(eat('+'))return un();
  if(eat('not')){const a=pureConst(un(),'NOT');const r=L(~a.c&0xFFFF);r.sym=a.sym;r.undef=a.undef;return r}
  if(t.t==='id'&&(t.v==='byte'||t.v==='word'||t.v==='dword')&&toks[p+1]&&toks[p+1].t==='id'&&toks[p+1].v==='ptr'){p+=2;const a=un();a.type=t.v==='byte'?1:t.v==='word'?2:4;a.ptr=true;return a}
  if(t.t==='id'&&(t.v==='short'||t.v==='near')){p++;if(toks[p]&&toks[p].t==='id'&&toks[p].v==='ptr')p++;const a=un();if(t.v==='short')a.short=true;return a}
  if(eat('offset')){const a=un();a.vmem=false;if(a.regs.length)err('OFFSET cannot be used with registers');const r=L(a.c);r.sym=true;r.undef=a.undef;return r}
  if(eat('seg')){const a=un();const r=L(a.segv!=null?a.segv:0);r.sym=true;r.undef=a.undef||a.segv==null;return r}
  if(eat('type')){const a=un();return L(a.type||0)}
  if(eat('length')){const a=un();return L(a.count||1)}
  if(eat('size')){const a=un();return L((a.count||1)*(a.type||1))}
  if(eat('low')){const a=pureConst(un(),'LOW');const r=L(a.c&255);r.sym=a.sym;r.undef=a.undef;return r}
  if(eat('high')){const a=pureConst(un(),'HIGH');const r=L((a.c>>8)&255);r.sym=a.sym;r.undef=a.undef;return r}
  if(t.t==='id'&&SREG.includes(t.v)&&toks[p+1]&&toks[p+1].t===':'){p+=2;const a=un();a.seg=SREG.indexOf(t.v);return a}
  return post()}
 function post(){let a=prim();while(peek()&&peek().t==='['){p++;const b=expr();if(!eat(']'))err('Missing ]');a=merge(a,b,1);a.mem=true}return a}
 function prim(){const t=toks[p++];if(!t)err('An expression is incomplete');
  if(t.t==='num')return L(t.v);
  if(t.t==='str'){if(!t.v.length)err('Empty character constant');if(t.v.length>2)err('A character constant can hold at most 2 characters');let v=0;for(const ch of t.v)v=(v<<8)|(ch.charCodeAt(0)&255);return L(v)}
  if(t.t==='$'){const r=L(ctx.here());r.sym=true;r.label=true;r.rel=1;return r}
  if(t.t==='('){const a=expr();if(!eat(')'))err('Missing )');return a}
  if(t.t==='['){const a=expr();if(!eat(']'))err('Missing ]');a.mem=true;return a}
  if(t.t==='id'){
   if(['bx','bp','si','di'].includes(t.v)){const r=L(0);r.regs=[t.v];return r}
   if(R16.includes(t.v)||R8.includes(t.v)||SREG.includes(t.v))err(`${t.v.toUpperCase()} cannot be used inside an address. Only BX, BP, SI and DI can`);
   if(t.v==='@data'){const r=L(ctx.segval('data'));r.sym=true;return r}
   if(t.v==='@code'){const r=L(ctx.segval('code'));r.sym=true;return r}
   if(t.v==='?')err('? can only be used in DB or DW');
   const s=ctx.lookup(t.v);
   if(!s){const r=L(0);r.sym=true;r.undef=true;r.name=t.v;ctx.undef(t.v);return r}
   if(s.kind==='const'){const r=L(s.value);r.sym=s.sym;return r}
   if(s.kind==='seg'){const r=L(ctx.segval(s.sec));r.sym=true;return r}
   const r=L(s.value);r.sym=true;r.segv=ctx.segval(s.sec);
   r.rel=1;if(s.kind==='var'){r.vmem=true;r.type=s.type;r.count=s.count}else{r.label=true}
   return r}
  err(`Unexpected "${t.t}" in an expression`)}
 const r=expr();if(p<toks.length)err(`Unexpected "${toks[p].v||toks[p].t}" after the expression`);return r}

function splitTop(s){const out=[];let d=0,q=null,cur='';for(const c of s){if(q){cur+=c;if(c===q)q=null;continue}if(c==="'"||c==='"'){q=c;cur+=c;continue}if(c==='('||c==='[')d++;if(c===')'||c===']')d--;if(c===','&&d===0){out.push(cur.trim());cur='';continue}cur+=c}if(cur.trim()||out.length)out.push(cur.trim());return out}
function stripComment(s){let q=null;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c===q)q=null;continue}if(c==="'"||c==='"')q=c;else if(c===';')return s.slice(0,i)}return s}

/* ---------- operands ---------- */
function operand(str,ctx){const s=str.trim(),low=s.toLowerCase();
 if(!s)err('An operand is missing');
 let i;if((i=R16.indexOf(low))>=0)return{k:'r16',r:i};if((i=R8.indexOf(low))>=0)return{k:'r8',r:i};if((i=SREG.indexOf(low))>=0)return{k:'sr',r:i};
 const x=parseExpr(lex(s),ctx);
 if(x.mem||x.vmem||x.regs.length){let base=-1,index=-1;for(const r of x.regs){if(r==='bx'||r==='bp'){if(base>=0)err('An address can use only one of BX or BP');base=R16.indexOf(r)}else{if(index>=0)err('An address can use only one of SI or DI');index=R16.indexOf(r)}}
  if(x.type===4)err('DWORD operands are not available on the 8086');
  return{k:'mem',base,index,disp:x.c&0xFFFF,sym:x.sym,undef:x.undef,size:x.type,seg:x.seg}}
 if(x.type===4)err('DWORD operands are not available on the 8086');
 return{k:'imm',v:x.c,sym:x.sym,undef:x.undef,label:x.label,short:!!x.short,size:x.ptr?x.type:0}}
const szOf=o=>o.k==='r16'||o.k==='sr'?2:o.k==='r8'?1:o.k==='mem'?o.size:0;
const imm8=v=>[v&255],imm16=v=>[v&255,(v>>8)&255];
const RM={'3,6':0,'3,7':1,'5,6':2,'5,7':3,'-1,6':4,'-1,7':5,'5,-1':6,'3,-1':7};
function modrm(o,reg){
 if(o.k==='r16'||o.k==='r8')return[0xC0|(reg<<3)|o.r];
 if(o.base<0&&o.index<0)return[(reg<<3)|6,...imm16(o.disp)];
 const rm=RM[o.base+','+o.index];const d=(o.disp<<16)>>16;
 if(o.sym)return[0x80|(reg<<3)|rm,...imm16(o.disp)];
 if(d===0&&rm!==6)return[(reg<<3)|rm];
 if(d>=-128&&d<=127)return[0x40|(reg<<3)|rm,d&255];
 return[0x80|(reg<<3)|rm,...imm16(o.disp)]}
const SEGPFX=[0x26,0x2E,0x36,0x3E];
function segPrefix(ops){for(const o of ops)if(o.k==='mem'&&o.seg>=0){const def=o.base===5?2:3;if(o.seg!==def)return[SEGPFX[o.seg]]}return[]}
function chkImm(o,w){if(o.undef)return;const v=o.v;if(w===1&&(v<-128||v>255))err(`${v} does not fit in 8 bits (range -128 to 255)`);if(w===2&&(v<-32768||v>65535))err(`${v} does not fit in 16 bits`)}
function opSize(d,s,need){const a=szOf(d),b=s?szOf(s):0;if(a&&b&&a!==b)err(`Operand sizes do not match (${a*8}-bit and ${b*8}-bit)`);const w=a||b;if(!w&&need!==false)err('Operand size is unknown. Write BYTE PTR or WORD PTR before the memory operand');return w}
const isRM=o=>o.k==='r16'||o.k==='r8'||o.k==='mem';
function nOps(m,ops,n){if(ops.length!==n)err(`${m.toUpperCase()} takes ${n===0?'no operands':n===1?'one operand':n+' operands'}`)}

function encode(m,ops,addr,ctx){
 if(SIMPLE[m]){if(m==='aam'||m==='aad'){if(ops.length>1)err(m.toUpperCase()+' takes at most one operand');const b=ops.length?ops[0].v&255:10;return{bytes:[SIMPLE[m][0],b],w:0}}nOps(m,ops,0);return{bytes:SIMPLE[m].slice(),w:STROPS.has(m)?(m.endsWith('w')?2:1):0}}
 if(m==='mov'){nOps(m,ops,2);const[d,s]=ops;
  if(d.k==='imm')err('The destination of MOV cannot be a constant');
  if(d.k==='mem'&&s.k==='mem')err('MOV cannot copy memory to memory directly. Use a register in between');
  if(d.k==='sr'){if(d.r===1)err('CS cannot be changed with MOV. Use a far JMP');if(s.k==='imm')err('A segment register cannot be loaded with a constant. Load a general register first, for example MOV AX, @data then MOV DS, AX');if(s.k==='sr')err('MOV cannot copy one segment register to another');if(s.k==='r8'||(s.k==='mem'&&s.size===1))err('Segment registers are 16-bit');return{bytes:[...segPrefix(ops),0x8E,...modrm(s,d.r)],w:2}}
  if(s.k==='sr'){if(d.k==='r8'||(d.k==='mem'&&d.size===1))err('Segment registers are 16-bit');return{bytes:[...segPrefix(ops),0x8C,...modrm(d,s.r)],w:2}}
  const w=opSize(d,s);
  if(s.k==='imm'){chkImm(s,w);if(d.k!=='mem')return{bytes:w===1?[0xB0+d.r,...imm8(s.v)]:[0xB8+d.r,...imm16(s.v)],w};return{bytes:[...segPrefix(ops),w===1?0xC6:0xC7,...modrm(d,0),...(w===1?imm8(s.v):imm16(s.v))],w}}
  if((d.k==='r8'||d.k==='r16')&&d.r===0&&s.k==='mem'&&s.base<0&&s.index<0)return{bytes:[...segPrefix(ops),w===1?0xA0:0xA1,...imm16(s.disp)],w};
  if((s.k==='r8'||s.k==='r16')&&s.r===0&&d.k==='mem'&&d.base<0&&d.index<0)return{bytes:[...segPrefix(ops),w===1?0xA2:0xA3,...imm16(d.disp)],w};
  if(d.k==='mem')return{bytes:[...segPrefix(ops),w===1?0x88:0x89,...modrm(d,s.r)],w};
  return{bytes:[...segPrefix(ops),w===1?0x8A:0x8B,...modrm(s,d.r)],w}}
 if(m in ALU||m==='test'){nOps(m,ops,2);const[d,s]=ops;const n=ALU[m];
  if(d.k==='imm')err(`The destination of ${m.toUpperCase()} cannot be a constant`);if(d.k==='sr'||s.k==='sr')err('Segment registers cannot be used in arithmetic');
  if(d.k==='mem'&&s.k==='mem')err(`${m.toUpperCase()} cannot use two memory operands. Use a register for one of them`);
  const w=opSize(d,s);
  if(s.k==='imm'){chkImm(s,w);const iv=w===1?imm8(s.v):imm16(s.v);
   if(m==='test'){if(d.k!=='mem'&&d.r===0)return{bytes:[w===1?0xA8:0xA9,...iv],w};return{bytes:[...segPrefix(ops),w===1?0xF6:0xF7,...modrm(d,0),...iv],w}}
   if(d.k!=='mem'&&d.r===0)return{bytes:[n*8+(w===1?4:5),...iv],w};
   if(w===1)return{bytes:[...segPrefix(ops),0x80,...modrm(d,n),...iv],w};
   const sv=(s.v<<16)>>16;if(!s.sym&&sv>=-128&&sv<=127)return{bytes:[...segPrefix(ops),0x83,...modrm(d,n),sv&255],w};
   return{bytes:[...segPrefix(ops),0x81,...modrm(d,n),...iv],w}}
  if(m==='test'){const[r,x]=d.k==='mem'?[s,d]:[s.k==='mem'?d:s,s.k==='mem'?s:d];return{bytes:[...segPrefix(ops),w===1?0x84:0x85,...modrm(x,r.r)],w}}
  if(d.k==='mem')return{bytes:[...segPrefix(ops),n*8+(w===1?0:1),...modrm(d,s.r)],w};
  return{bytes:[...segPrefix(ops),n*8+(w===1?2:3),...modrm(s,d.r)],w}}
 if(m==='xchg'){nOps(m,ops,2);let[d,s]=ops;if(!isRM(d)||!isRM(s))err('XCHG works on registers and memory only');if(d.k==='mem'&&s.k==='mem')err('XCHG cannot use two memory operands');const w=opSize(d,s);
  if(w===2&&d.k==='r16'&&s.k==='r16'&&(d.r===0||s.r===0))return{bytes:[0x90+(d.r===0?s.r:d.r)],w};
  const[r,x]=d.k==='mem'?[s,d]:[d,s];return{bytes:[...segPrefix(ops),w===1?0x86:0x87,...modrm(x,r.r)],w}}
 if(m==='inc'||m==='dec'){nOps(m,ops,1);const d=ops[0];if(!isRM(d))err(`${m.toUpperCase()} needs a register or memory operand`);const w=opSize(d);const n=m==='inc'?0:1;if(d.k==='r16')return{bytes:[(n?0x48:0x40)+d.r],w};return{bytes:[...segPrefix(ops),w===1?0xFE:0xFF,...modrm(d,n)],w}}
 if(m in GRP3){if(m==='imul'&&ops.length>1)err('On the 8086, IMUL takes one operand: IMUL BX multiplies AX by BX');nOps(m,ops,1);const d=ops[0];if(!isRM(d))err(`${m.toUpperCase()} needs a register or memory operand${d.k==='imm'?'. Put the constant in a register first':''}`);const w=opSize(d);return{bytes:[...segPrefix(ops),w===1?0xF6:0xF7,...modrm(d,GRP3[m])],w}}
 if(m in SHF){nOps(m,ops,2);const[d,c]=ops;if(!isRM(d))err(`${m.toUpperCase()} needs a register or memory destination`);const w=opSize(d);const n=SHF[m];
  if(c.k==='r8'&&c.r===1)return{bytes:[...segPrefix(ops),w===1?0xD2:0xD3,...modrm(d,n)],w};
  if(c.k!=='imm')err('The shift count must be 1, a constant, or CL');
  if(c.v===1&&!c.sym)return{bytes:[...segPrefix(ops),w===1?0xD0:0xD1,...modrm(d,n)],w};
  return{bytes:[...segPrefix(ops),w===1?0xC0:0xC1,...modrm(d,n),c.v&255],w,note:'Shift counts other than 1 need the 80186 or later. On the 8086, put the count in CL'}}
 if(m==='push'){nOps(m,ops,1);const d=ops[0];if(d.k==='r16')return{bytes:[0x50+d.r],w:2};if(d.k==='sr')return{bytes:[0x06+d.r*8],w:2};if(d.k==='r8'||(d.k==='mem'&&d.size===1))err('PUSH works on 16-bit values only');if(d.k==='mem')return{bytes:[...segPrefix(ops),0xFF,...modrm(d,6)],w:2};chkImm(d,2);const sv=(d.v<<16)>>16;if(!d.sym&&sv>=-128&&sv<=127)return{bytes:[0x6A,sv&255],w:2,note:'PUSH with a constant needs the 80186 or later'};return{bytes:[0x68,...imm16(d.v)],w:2,note:'PUSH with a constant needs the 80186 or later'}}
 if(m==='pop'){nOps(m,ops,1);const d=ops[0];if(d.k==='r16')return{bytes:[0x58+d.r],w:2};if(d.k==='sr'){if(d.r===1)err('POP CS is not allowed');return{bytes:[0x07+d.r*8],w:2}}if(d.k==='r8'||(d.k==='mem'&&d.size===1))err('POP works on 16-bit values only');if(d.k==='mem')return{bytes:[...segPrefix(ops),0x8F,...modrm(d,0)],w:2};err('POP needs a register or memory destination')}
 if(m==='lea'||m==='lds'||m==='les'){nOps(m,ops,2);const[d,s]=ops;if(d.k!=='r16')err(`The destination of ${m.toUpperCase()} must be a 16-bit register`);if(s.k!=='mem')err(`The source of ${m.toUpperCase()} must be a memory operand, for example LEA SI, array`);return{bytes:[...segPrefix(ops),m==='lea'?0x8D:m==='lds'?0xC5:0xC4,...modrm(s,d.r)],w:2}}
 if(m==='jmp'||m==='call'){nOps(m,ops,1);const d=ops[0];
  if(d.k==='imm'){const t=d.v&0xFFFF;
   if(m==='call')return{bytes:[0xE8,...imm16(t-(addr+3))],w:0,target:t};
   const r8=t-(addr+2);if(d.short){if(!d.undef&&(r8<-128||r8>127))err('The SHORT jump target is out of range (-128 to 127 bytes)');return{bytes:[0xEB,r8&255],w:0,target:t}}
   if(!d.undef&&ctx.known(t)&&r8>=-128&&r8<=127)return{bytes:[0xEB,r8&255],w:0,target:t};
   return{bytes:[0xE9,...imm16(t-(addr+3))],w:0,target:t}}
  if(d.k==='r16'||d.k==='mem'){if(d.k==='mem'&&d.size===1)err('An indirect jump needs a WORD address');return{bytes:[...segPrefix(ops),0xFF,...modrm(d,m==='jmp'?4:2)],w:2,ind:true}}
  err(`${m.toUpperCase()} needs a label or a 16-bit register or memory operand`)}
 if(m[0]==='j'&&CC[m.slice(1)]!=null){nOps(m,ops,1);const d=ops[0];if(d.k!=='imm')err('A conditional jump needs a label');const t=d.v&0xFFFF,r=t-(addr+2);if(!d.undef&&ctx.final&&(r<-128||r>127))err(`Conditional jump out of range by ${r<0?-128-r:r-127} bytes. On the 8086, J${m.slice(1).toUpperCase()} reaches only 128 bytes. Jump over a JMP with the opposite condition instead`);return{bytes:[0x70+CC[m.slice(1)],r&255],w:0,target:t,cc:CC[m.slice(1)]}}
 if(m in LOOPS){nOps(m,ops,1);const d=ops[0];if(d.k!=='imm')err(`${m.toUpperCase()} needs a label`);const t=d.v&0xFFFF,r=t-(addr+2);if(!d.undef&&ctx.final&&(r<-128||r>127))err(`${m.toUpperCase()} target is out of range (-128 to 127 bytes)`);return{bytes:[LOOPS[m],r&255],w:0,target:t}}
 if(m==='ret'||m==='retn'||m==='retf'){if(ops.length>1)err('RET takes at most one operand');const far=m==='retf';if(ops.length){const d=ops[0];if(d.k!=='imm')err('RET takes a constant');return{bytes:[far?0xCA:0xC2,...imm16(d.v)],w:0}}return{bytes:[far?0xCB:0xC3],w:0}}
 if(m==='int'){nOps(m,ops,1);const d=ops[0];if(d.k!=='imm')err('INT needs an interrupt number, for example INT 21h');if(d.v<0||d.v>255)err('Interrupt numbers go from 0 to 255');return{bytes:d.v===3?[0xCC]:[0xCD,d.v&255],w:0}}
 if(m==='in'){nOps(m,ops,2);const[d,p]=ops;if(!((d.k==='r8'||d.k==='r16')&&d.r===0))err('IN reads into AL or AX');const w=d.k==='r8'?1:2;if(p.k==='r16'&&p.r===2)return{bytes:[w===1?0xEC:0xED],w};if(p.k!=='imm'||p.v<0||p.v>255)err('The port must be a number from 0 to 255 or DX');return{bytes:[w===1?0xE4:0xE5,p.v],w}}
 if(m==='out'){nOps(m,ops,2);const[p,s]=ops;if(!((s.k==='r8'||s.k==='r16')&&s.r===0))err('OUT writes from AL or AX');const w=s.k==='r8'?1:2;if(p.k==='r16'&&p.r===2)return{bytes:[w===1?0xEE:0xEF],w};if(p.k!=='imm'||p.v<0||p.v>255)err('The port must be a number from 0 to 255 or DX');return{bytes:[w===1?0xE6:0xE7,p.v],w}}
 err(`Unknown instruction "${m.toUpperCase()}"`)}

/* ---------- data ---------- */
function dataBytes(items,w,ctx){const out=[];
 for(const it of items){const s=it.trim();if(!s)err('An empty value in a data list');
  const dm=s.match(/^(.+?)\s+dup\s*\((.*)\)$/i);
  if(dm){const n=parseExpr(lex(dm[1]),ctx);pureConst(n,'DUP');if(n.undef)err('The DUP count must be defined before it is used');if(n.c<0||n.c>65535)err('The DUP count is out of range');const inner=dataBytes(splitTop(dm[2]),w,ctx);for(let i=0;i<n.c;i++)for(const b of inner)out.push(b);continue}
  if(s==='?'){for(let i=0;i<w;i++)out.push(0);continue}
  if(w===1&&(s[0]==="'"||s[0]==='"')&&s.length>=2&&s[s.length-1]===s[0]&&s.length!==3){const body=s.slice(1,-1);if(!body.includes(s[0])){for(const ch of body)out.push(ch.charCodeAt(0)&255);continue}}
  const x=parseExpr(lex(s),ctx);if(x.mem)err('Memory operands cannot be used in data');if(x.regs.length)err('Registers cannot be used in data');
  if(w===1){if(!x.undef&&(x.c<-128||x.c>255))err(`${x.c} does not fit in a byte`);out.push(x.c&255)}
  else if(w===2){if(!x.undef&&(x.c<-32768||x.c>65535))err(`${x.c} does not fit in a word`);out.push(x.c&255,(x.c>>8)&255)}
  else{const v=x.c>>>0;out.push(v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255)}}
 return out}

/* ---------- statements ---------- */
function parseLine(raw,n){
 const st={line:n,raw};let s=stripComment(raw).trim();
 if(!s||s[0]==='#')return st;
 let m=s.match(/^([A-Za-z_@?.$][\w@?$.]*)\s*:(?!\s*\[)\s*(.*)$/);
 if(m&&!SREG.includes(m[1].toLowerCase())){st.label=m[1].toLowerCase();s=m[2].trim();if(!s)return st}
 if(s[0]==='.'){const w=s.split(/\s+/);st.dir=w[0].toLowerCase();st.arg=w.slice(1).join(' ');return st}
 const w1=s.match(/^(\S+)\s*(.*)$/);const first=w1[1].toLowerCase();let rest=w1[2]||'';
 const w2=rest.match(/^(\S+)\s*(.*)$/);const second=w2?w2[1].toLowerCase():'';
 if(second&&DIRS.has(second)){st.name=first;st.dir=second;st.arg=w2[2];return st}
 if(first.endsWith('=')){st.name=first.slice(0,-1);st.dir='=';st.arg=rest;return st}
 if(['db','dw','dd'].includes(first)){st.dir=first;st.arg=rest;return st}
 if(['org','end','assume','even','align','include','name','title','page','extrn','public','model'].includes(first)){st.dir=first;st.arg=rest;return st}
 let pre=null;let mn=first;
 if(PREFIX[first]!=null){pre=first;const w3=rest.match(/^(\S+)\s*(.*)$/);if(!w3){st.err='REP needs a string instruction after it';return st}mn=w3[1].toLowerCase();rest=w3[2]||''}
 if(/^(es|cs|ss|ds):$/.test(mn)){st.err='Write the segment override on the memory operand, for example MOV AL, ES:[DI]';return st}
 st.ins=mn;st.pre=pre;st.args=rest.trim()?splitTop(rest.trim()):[];
 if(pre&&pre!=='lock'&&!STROPS.has(mn))st.err=`${pre.toUpperCase()} can only be used before a string instruction such as MOVSB or STOSW`;
 if(!MNEM.has(mn)){if(MNEM.has(first)||!/^[a-z_@?.$][\w@?$.]*$/.test(mn))st.err=`Unknown instruction "${mn.toUpperCase()}"`;else st.err=`Unknown instruction "${mn.toUpperCase()}". If this is a label, add a colon after it`}
 return st}

function assemble(src){
 const lines=String(src).replace(/\t/g,'    ').split(/\r?\n/);
 const stmts=lines.map((l,i)=>{try{return parseLine(l,i+1)}catch(e){return{line:i+1,raw:l,err:e.message}}});
 const exe=stmts.some(s=>['.data','.code','.model','.stack','segment','.startup'].includes(s.dir));
 let prev=null,result=null;
 for(let pass=0;pass<8;pass++){
  const syms=new Map(),errors=[],warnings=[],out=[],undefs=new Map();let curLine=0;
  const lc={code:exe?0:0x100,data:0,stack:0};let sec='code';let entry=null,stackSize=0x400,ended=false;const segNames={};
  const segv=k=>{if(!prev)return 0;return k==='code'?prev.seg.code:k==='data'?prev.seg.data:prev.seg.stack};
  const ctx={here:()=>lc[sec],segval:segv,lookup:n=>syms.get(n)||(prev&&prev.syms.get(n))||null,undef:n=>{if(!undefs.has(n))undefs.set(n,curLine)},known:t=>true,final:!!prev};
  const define=(name,rec,st)=>{if(syms.has(name)){errors.push({line:st.line,msg:`"${name}" is defined twice`});return}if(R16.includes(name)||R8.includes(name)||SREG.includes(name)||MNEM.has(name)){errors.push({line:st.line,msg:`"${name}" is a reserved word and cannot be a name`});return}syms.set(name,rec)};
  for(const st of stmts){
   if(ended)break;curLine=st.line;
   const rec={line:st.line,sec,addr:lc[sec],bytes:[]};out.push(rec);
   try{
    if(st.err)err(st.err);
    if(st.label)define(st.label,{kind:'label',value:lc[sec],sec,line:st.line},st);
    if(st.dir){const d=st.dir,a=(st.arg||'').trim();
     if(d==='.model'||d==='model'||d==='.8086'||d==='.186'||d==='.286'||d==='assume'||d==='title'||d==='name'||d==='page'||d==='include'||d==='public'||d==='extrn'||d==='.list'||d==='.nolist'){}
     else if(d==='.code'){sec='code'}
     else if(d==='.data'||d==='.data?'||d==='.const'){sec='data'}
     else if(d==='.stack'){if(a){const x=parseExpr(lex(a),ctx);stackSize=x.c&0xFFFF||0x400}sec='stack'}
     else if(d==='.startup'){if(sec!=='code')err('.STARTUP must be in the code segment');entry=lc.code;const b=[0xB8,...imm16(segv('data')),0x8E,0xD8];rec.bytes=b;rec.ins={m:'startup',bytes:b,parts:[{m:'mov',ops:[{k:'r16',r:0},{k:'imm',v:segv('data')}],w:2,len:3},{m:'mov',ops:[{k:'sr',r:3},{k:'r16',r:0}],w:2,len:2}]};lc.code+=b.length}
     else if(d==='.exit'){if(sec!=='code')err('.EXIT must be in the code segment');let code=0;if(a){code=parseExpr(lex(a),ctx).c&255}const b=[0xB8,code,0x4C,0xCD,0x21];rec.bytes=b;rec.ins={m:'exit',bytes:b,parts:[{m:'mov',ops:[{k:'r16',r:0},{k:'imm',v:0x4C00|code}],w:2,len:3},{m:'int',ops:[{k:'imm',v:0x21}],w:0,len:2}]};lc.code+=b.length}
     else if(d==='segment'){const n=st.name;if(syms.has(n)&&syms.get(n).kind==='seg'){sec=syms.get(n).sec}else{const k=/stack/.test(n)||/\bstack\b/i.test(a)?'stack':/code|text|cseg/.test(n)?'code':'data';segNames[n]=k;sec=k;define(n,{kind:'seg',sec:k,value:0},st)}}
     else if(d==='ends'){}
     else if(d==='proc'){define(st.name,{kind:'label',value:lc[sec],sec,line:st.line,proc:true},st)}
     else if(d==='endp'){}
     else if(d==='label'){const t=a.toLowerCase();define(st.name,t==='byte'||t==='word'?{kind:'var',value:lc[sec],sec,type:t==='byte'?1:2,count:1,line:st.line}:{kind:'label',value:lc[sec],sec,line:st.line},st)}
     else if(d==='org'){const x=parseExpr(lex(a),ctx);pureConst(x,'ORG');if(x.undef)err('ORG needs a value defined before it');lc[sec]=x.c&0xFFFF;rec.addr=lc[sec]}
     else if(d==='even'){if(lc[sec]&1){rec.bytes=[0x90];lc[sec]++}}
     else if(d==='align'){const n=a?parseExpr(lex(a),ctx).c:2;while(lc[sec]%n){rec.bytes.push(sec==='code'?0x90:0);lc[sec]++}}
     else if(d==='end'){ended=true;if(a){const x=parseExpr(lex(a),ctx);entry=x.c&0xFFFF;if(x.undef&&prev)err(`The entry label "${a}" is not defined`)}}
     else if(d==='equ'||d==='='){const x=parseExpr(lex(a),ctx);if(x.regs.length)err('EQU cannot hold a register');const old=syms.get(st.name);if(old&&(d==='equ'||old.kind!=='const'))err(`"${st.name}" is defined twice`);syms.set(st.name,{kind:'const',value:x.c,sym:x.sym||x.undef,line:st.line})}
     else if(d==='db'||d==='dw'||d==='dd'){const w=d==='db'?1:d==='dw'?2:4;const items=splitTop(a);if(!items.length)err(`${d.toUpperCase()} needs at least one value`);const b=dataBytes(items,w,ctx);if(st.name)define(st.name,{kind:'var',value:lc[sec],sec,type:w,count:b.length/w,line:st.line},st);rec.bytes=b;rec.data=true;rec.width=w;lc[sec]+=b.length}
     else err(`Unknown directive "${d.toUpperCase()}"`)}
    else if(st.ins){
     if(exe&&sec!=='code')err('Instructions must be in the code segment (.CODE)');
     const ops=st.args.map(a=>operand(a,ctx));
     const e=encode(st.ins,ops,lc.code+(st.pre?1:0),ctx);
     const bytes=st.pre?[PREFIX[st.pre],...e.bytes]:e.bytes;
     rec.bytes=bytes;rec.ins={m:st.ins,ops,w:e.w,bytes,target:e.target,ind:e.ind,cc:e.cc,rep:st.pre};
     if(e.note)warnings.push({line:st.line,msg:e.note});
     lc.code+=bytes.length}
   }catch(e){if(!(e instanceof AsmError))throw e;errors.push({line:st.line,msg:e.message});
    if(st.ins&&!rec.bytes.length){rec.bytes=[0x90,0x90,0x90];rec.ins=null;lc.code+=3}}
   if(lc[sec]>0xFFFF){errors.push({line:st.line,msg:'The segment is larger than 64 KB'});break}}
  const codeEnd=out.reduce((m,r)=>r.sec==='code'?Math.max(m,r.addr+r.bytes.length):m,exe?0:0x100);
  const dataEnd=out.reduce((m,r)=>r.sec==='data'?Math.max(m,r.addr+r.bytes.length):m,0);
  const stackEnd=Math.max(stackSize,out.reduce((m,r)=>r.sec==='stack'?Math.max(m,r.addr+r.bytes.length):m,0));
  const seg={psp:0x0700};
  if(exe){seg.code=0x0710;seg.data=seg.code+((codeEnd+15)>>4);seg.stack=seg.data+((dataEnd+15)>>4);seg.stackSize=stackEnd}else{seg.code=seg.data=seg.stack=0x0700;seg.stackSize=0x10000}
  if(prev)for(const[n,ln]of undefs)if(!syms.has(n))errors.push({line:ln,msg:`"${n}" is not defined`});
  const sig=[...syms].map(([k,v])=>k+':'+v.value).join(',')+'|'+codeEnd+'|'+dataEnd;
  result={syms,errors,warnings,out,seg,exe,entry,codeEnd,dataEnd,stackSize:stackEnd,sig};
  if(prev&&prev.sig===sig)break;prev=result}
 const r=result;
 const uniq=new Map();for(const e of r.errors){const k=e.line+'|'+e.msg;if(!uniq.has(k))uniq.set(k,e)}
 const errors=[...uniq.values()].sort((a,b)=>a.line-b.line);
 if(!r.out.some(x=>x.ins))errors.length||errors.push({line:0,msg:'The program has no instructions'});
 let entry=r.entry;
 if(entry==null){if(r.exe){const s=r.syms.get('main')||r.syms.get('start');const first=r.out.find(x=>x.ins&&x.sec==='code');entry=s&&s.sec==='code'?s.value:first?first.addr:0}else entry=0x100}
 const symbols=[...r.syms].map(([name,s])=>({name,kind:s.kind,sec:s.sec,value:s.value,type:s.type||0,count:s.count||0,line:s.line}));
 return{ok:!errors.length,errors,warnings:r.warnings,listing:r.out,seg:r.seg,exe:r.exe,entry,codeEnd:r.codeEnd,dataEnd:r.dataEnd,symbols,lines:lines.length}}

/* ---------- CPU ---------- */
class CPU{
 constructor(prog){this.prog=prog;this.mem=new Uint8Array(0x100000);this.inPorts={};this.reset()}
 reset(){const p=this.prog,m=this.mem;m.fill(0);
  this.r=new Uint16Array(8);this.s=new Uint16Array(4);this.flags=0x0202;
  this.map=new Map();this.dataRanges=[];
  const base=k=>(k==='code'?p.seg.code:k==='data'?p.seg.data:p.seg.stack)<<4;
  for(const rec of p.listing){if(!rec.bytes.length)continue;const b=base(rec.sec)+rec.addr;for(let i=0;i<rec.bytes.length;i++)m[(b+i)&0xFFFFF]=rec.bytes[i];
   if(rec.ins&&rec.sec==='code'){const ins=rec.ins;ins.line=rec.line;ins.addr=rec.addr;ins.len=rec.bytes.length;this.map.set(rec.addr,ins);if(ins.parts){let a=rec.addr;for(const pt of ins.parts){pt.line=rec.line;pt.addr=a;this.map.set(a,pt);a+=pt.len}}}
   else if(rec.data&&rec.sec==='code')this.dataRanges.push([rec.addr,rec.addr+rec.bytes.length,rec.line])}
  const psp=p.seg.psp<<4;m[psp]=0xCD;m[psp+1]=0x20;
  if(p.exe){this.s[1]=p.seg.code;this.s[0]=this.s[3]=p.seg.psp;this.s[2]=p.seg.stack;this.r[4]=p.seg.stackSize&0xFFFF}
  else{this.s.fill(0x0700);this.r[4]=0xFFFE;this.map.set(0,{m:'int',ops:[{k:'imm',v:0x20}],w:0,line:0,addr:0,len:2,psp:true})}
  this.ip=p.entry;this.state='ready';this.msg='';this.steps=0;this.text='';this.col=0;this.inQ=[];this.ports={};this.portLog=[];this.hist=[];this.rec=null;this.lastWrites=[];this.exitCode=null;this.waitKind=null;this.cycles=0}
 get line(){const i=this.cur();return i?i.line:0}
 cur(){if(this.s[1]!==this.prog.seg.code)return null;return this.map.get(this.ip)||null}
 /* memory */
 pa(seg,off){return((seg<<4)+(off&0xFFFF))&0xFFFFF}
 rb(a){return this.mem[a&0xFFFFF]}
 rw(a){return this.mem[a&0xFFFFF]|(this.mem[(a+1)&0xFFFFF]<<8)}
 wb(a,v){a&=0xFFFFF;if(this.rec)this.rec.push(a,this.mem[a]);this.mem[a]=v&255}
 ww(a,v){this.wb(a,v);this.wb(a+1,v>>8)}
 /* registers */
 g8(i){return i<4?this.r[i]&255:this.r[i-4]>>8}
 s8(i,v){v&=255;if(i<4)this.r[i]=(this.r[i]&0xFF00)|v;else this.r[i-4]=(this.r[i-4]&0x00FF)|(v<<8)}
 gf(b){return(this.flags>>b)&1}
 sf(b,c){if(c)this.flags|=1<<b;else this.flags&=~(1<<b)}
 ea(o){let e=o.disp;if(o.base>=0)e+=this.r[o.base];if(o.index>=0)e+=this.r[o.index];return e&0xFFFF}
 segOf(o){return o.seg>=0?o.seg:(o.base===5?2:3)}
 addr(o){return this.pa(this.s[this.segOf(o)],this.ea(o))}
 get(o,w){switch(o.k){case'r16':return this.r[o.r];case'r8':return this.g8(o.r);case'sr':return this.s[o.r];case'imm':return w===1?o.v&255:o.v&0xFFFF;case'mem':{const a=this.addr(o);if(w===1)return this.rb(a);const seg=this.s[this.segOf(o)],e=this.ea(o);return this.rb(this.pa(seg,e))|(this.rb(this.pa(seg,e+1))<<8)}}}
 set(o,w,v){switch(o.k){case'r16':this.r[o.r]=v;return;case'r8':this.s8(o.r,v);return;case'sr':this.s[o.r]=v;return;case'mem':{const seg=this.s[this.segOf(o)],e=this.ea(o);this.wb(this.pa(seg,e),v);if(w===2)this.wb(this.pa(seg,e+1),v>>8);return}}}
 push(v){this.r[4]=(this.r[4]-2)&0xFFFF;const a=this.pa(this.s[2],this.r[4]);this.wb(a,v);this.wb(this.pa(this.s[2],this.r[4]+1),v>>8)}
 pop(){const v=this.rb(this.pa(this.s[2],this.r[4]))|(this.rb(this.pa(this.s[2],this.r[4]+1))<<8);this.r[4]=(this.r[4]+2)&0xFFFF;return v}
 /* flags */
 szp(v,w){const m=w===1?0xFF:0xFFFF;v&=m;this.sf(F.ZF,v===0);this.sf(F.SF,v&(w===1?0x80:0x8000));this.sf(F.PF,PAR[v&255]);return v}
 add(a,b,c,w){const m=w===1?0xFF:0xFFFF,sg=w===1?0x80:0x8000;const r=a+b+c;this.sf(F.CF,r>m);this.sf(F.AF,(a^b^r)&0x10);this.sf(F.OF,(a^r)&(b^r)&sg);return this.szp(r,w)}
 sub(a,b,c,w){const sg=w===1?0x80:0x8000;const r=a-b-c;this.sf(F.CF,r<0);this.sf(F.AF,(a^b^r)&0x10);this.sf(F.OF,(a^b)&(a^r)&sg);return this.szp(r,w)}
 logic(v,w){this.sf(F.CF,0);this.sf(F.OF,0);this.sf(F.AF,0);return this.szp(v,w)}
 cond(cc){const f=this.flags,C=f&1,Z=(f>>6)&1,S=(f>>7)&1,O=(f>>11)&1,P=(f>>2)&1;let r;switch(cc>>1){case 0:r=O;break;case 1:r=C;break;case 2:r=Z;break;case 3:r=C|Z;break;case 4:r=S;break;case 5:r=P;break;case 6:r=S^O;break;case 7:r=(S^O)|Z;break}return(cc&1)?!r:!!r}
 /* console */
 out(ch){ch&=255;if(ch===13){this.col=0;return}if(ch===10){this.text+='\n';this.col=0;this.trimText();return}if(ch===8){if(this.col>0)this.col--;return}if(ch===7)return;if(ch===9){const n=8-(this.col%8);for(let i=0;i<n;i++)this.out(32);return}
  const ls=this.text.lastIndexOf('\n')+1,pos=ls+this.col,c=String.fromCharCode(ch);
  if(pos>=this.text.length)this.text+=' '.repeat(pos-this.text.length)+c;else this.text=this.text.slice(0,pos)+c+this.text.slice(pos+1);
  this.col++;if(this.col>=80){this.text+='\n';this.col=0}this.trimText()}
 trimText(){if(this.text.length>60000){const i=this.text.indexOf('\n',this.text.length-50000);this.text=this.text.slice(i+1)}}
 print(s){for(const c of s)this.out(c.charCodeAt(0))}
 key(ch){this.inQ.push(ch&255)}
 /* history */
 snap(){return{r:this.r.slice(),s:this.s.slice(),ip:this.ip,f:this.flags,t:this.text,c:this.col,q:this.inQ.slice(),p:Object.assign({},this.ports),pl:this.portLog.length,st:this.state,w:null,x:this.exitCode,cy:this.cycles}}
 back(){const h=this.hist.pop();if(!h)return false;const w=h.w;for(let i=w.length-2;i>=0;i-=2)this.mem[w[i]]=w[i+1];this.r.set(h.r);this.s.set(h.s);this.ip=h.ip;this.flags=h.f;this.text=h.t;this.col=h.c;this.inQ=h.q;this.ports=h.p;this.portLog.length=h.pl;this.state=h.st==='done'||h.st==='error'||h.st==='halted'?'paused':h.st;if(this.state==='ready'&&this.hist.length)this.state='paused';this.exitCode=h.x;this.cycles=h.cy;this.steps--;this.msg='';this.waitKind=null;this.lastWrites=[];return true}
 fail(m){this.state='error';this.msg=m;return'error'}
 step(){
  if(this.state==='done'||this.state==='error'||this.state==='halted')return this.state;
  const ins=this.cur();
  if(!ins){const ip=this.ip;const d=this.dataRanges.find(r=>ip>=r[0]&&ip<r[1]);if(this.s[1]!==this.prog.seg.code)return this.fail(`CS changed to ${hex(this.s[1],4)}h. Far jumps out of the program are not simulated`);return this.fail(d?`The CPU reached data at ${hex(ip,4)}h (line ${d[2]}) and tried to run it as code. End the program with INT 21h function 4Ch, or jump over the data`:`No instruction at ${hex(this.s[1],4)}:${hex(ip,4)}. The program ran past its last instruction. End it with MOV AH, 4Ch and INT 21h`)}
  const h=this.snap();this.rec=[];
  let r;try{r=this.exec(ins)}catch(e){if(e&&e.cpu){this.restoreFrom(h);this.rec=null;return this.fail(e.message)}this.rec=null;throw e}
  if(r==='wait'){this.restoreFrom(h);this.rec=null;this.state='waiting';return'wait'}
  h.w=this.rec;this.lastWrites=this.rec;this.rec=null;this.hist.push(h);if(this.hist.length>20000)this.hist.splice(0,5000);
  this.steps++;this.cycles+=ins.len||1;
  if(this.state==='ready'||this.state==='waiting')this.state='paused';
  if(r==='bp'){this.state='paused';return'bp'}
  return this.state==='paused'?'ok':this.state}
 restoreFrom(h){const w=this.rec||[];for(let i=w.length-2;i>=0;i-=2)this.mem[w[i]]=w[i+1];this.r.set(h.r);this.s.set(h.s);this.ip=h.ip;this.flags=h.f;this.text=h.t;this.col=h.c;this.inQ=h.q;this.ports=h.p;this.portLog.length=h.pl}
 cpuErr(m){const e=new Error(m);e.cpu=true;throw e}
 exec(ins){
  const m=ins.m,o=ins.ops||[],w=ins.w;const next=(this.ip+(ins.len||ins.bytes.length))&0xFFFF;
  if(ins.parts){for(const p of ins.parts){this.ip=p.addr;const r=this.exec(p);if(r)return r}return}
  this.ip=next;
  if(m in ALU){const a=this.get(o[0],w),b=this.get(o[1],w);let v;
   switch(m){case'add':v=this.add(a,b,0,w);break;case'adc':v=this.add(a,b,this.gf(0),w);break;case'sub':v=this.sub(a,b,0,w);break;case'sbb':v=this.sub(a,b,this.gf(0),w);break;case'cmp':this.sub(a,b,0,w);return;case'and':v=this.logic(a&b,w);break;case'or':v=this.logic(a|b,w);break;case'xor':v=this.logic(a^b,w);break}
   this.set(o[0],w,v);return}
  if(m[0]==='j'&&ins.cc!=null){if(this.cond(ins.cc))this.ip=ins.target;return}
  switch(m){
   case'mov':this.set(o[0],w,this.get(o[1],w));return;
   case'test':this.logic(this.get(o[0],w)&this.get(o[1],w),w);return;
   case'xchg':{const fix=x=>x.k==='mem'?{k:'mem',base:-1,index:-1,disp:this.ea(x),seg:this.segOf(x)}:x;const p=fix(o[0]),q=fix(o[1]);const a=this.get(p,w),b=this.get(q,w);this.set(p,w,b);this.set(q,w,a);return}
   case'inc':case'dec':{const c=this.gf(0);const a=this.get(o[0],w);const v=m==='inc'?this.add(a,1,0,w):this.sub(a,1,0,w);this.sf(0,c);this.set(o[0],w,v);return}
   case'not':this.set(o[0],w,~this.get(o[0],w));return;
   case'neg':{const a=this.get(o[0],w);const v=this.sub(0,a,0,w);this.sf(0,a!==0);this.set(o[0],w,v);return}
   case'mul':case'imul':{const b=this.get(o[0],w);if(w===1){let a=this.r[0]&255,x=b;if(m==='imul'){a=(a<<24)>>24;x=(x<<24)>>24}const p=a*x;this.r[0]=p&0xFFFF;const of=m==='mul'?(p>>8)!==0:p!==((p<<24)>>24);this.sf(0,of);this.sf(11,of);this.szp(p&255,1)}else{let a=this.r[0],x=b;if(m==='imul'){a=(a<<16)>>16;x=(x<<16)>>16}const p=a*x;const lo=p&0xFFFF,hi=Math.floor(p/65536)&0xFFFF;this.r[0]=lo;this.r[2]=hi;const of=m==='mul'?hi!==0:((lo<<16>>16)!==p);this.sf(0,of);this.sf(11,of);this.szp(lo,2)}return}
   case'div':case'idiv':{const b=this.get(o[0],w);if(b===0)this.cpuErr(`Divide by zero (line ${ins.line}). The divisor is 0. The 8086 raises interrupt 0 here`);
    if(w===1){let a=this.r[0],d=b;if(m==='idiv'){a=(a<<16)>>16;d=(d<<24)>>24}const q=Math.trunc(a/d),rm=a-q*d;if(m==='div'?q>255:(q<-128||q>127))this.cpuErr(`Divide overflow (line ${ins.line}). The quotient ${q} does not fit in AL. Clear AH before an 8-bit DIV`);this.r[0]=((rm&255)<<8)|(q&255)}
    else{let a=this.r[2]*65536+this.r[0],d=b;if(m==='idiv'){a=(this.r[2]<<16|this.r[0]);d=(d<<16)>>16}const q=Math.trunc(a/d),rm=a-q*d;if(m==='div'?q>65535:(q<-32768||q>32767))this.cpuErr(`Divide overflow (line ${ins.line}). The quotient does not fit in AX. Clear DX (or use CWD for IDIV) before a 16-bit division`);this.r[0]=q&0xFFFF;this.r[2]=rm&0xFFFF}return}
   case'rol':case'ror':case'rcl':case'rcr':case'shl':case'sal':case'shr':case'sar':{const n=(o[1].k==='r8'?this.g8(1):o[1].v)&31;if(!n)return;const bits=w*8,msk=(1<<bits)-1,sg=1<<(bits-1);let v=this.get(o[0],w),cf=this.gf(0);const orig=v;
    for(let i=0;i<n;i++){switch(m){case'rol':cf=(v&sg)?1:0;v=((v<<1)|cf)&msk;break;case'ror':cf=v&1;v=(v>>1)|(cf?sg:0);break;case'rcl':{const c=(v&sg)?1:0;v=((v<<1)|cf)&msk;cf=c;break}case'rcr':{const c=v&1;v=(v>>1)|(cf?sg:0);cf=c;break}case'shl':case'sal':cf=(v&sg)?1:0;v=(v<<1)&msk;break;case'shr':cf=v&1;v=v>>1;break;case'sar':cf=v&1;v=(v>>1)|(v&sg);break}}
    this.sf(0,cf);if(m==='shl'||m==='sal'||m==='shr'||m==='sar')this.szp(v,w);
    if(m==='rol'||m==='rcl'||m==='shl'||m==='sal')this.sf(11,((v&sg)?1:0)^cf);else if(m==='shr')this.sf(11,orig&sg);else if(m==='sar')this.sf(11,0);else this.sf(11,((v>>(bits-1))^(v>>(bits-2)))&1);
    this.set(o[0],w,v);return}
   case'push':this.push(this.get(o[0],2));return;
   case'pop':{const v=this.pop();this.set(o[0],2,v);return}
   case'pushf':this.push(this.flags|0xF002);return;
   case'popf':this.flags=(this.pop()&0x0FD5)|0x0002;return;
   case'lea':this.r[o[0].r]=this.ea(o[1]);return;
   case'lds':case'les':{const a=this.addr(o[1]);const seg=this.s[this.segOf(o[1])],e=this.ea(o[1]);this.r[o[0].r]=this.rb(this.pa(seg,e))|(this.rb(this.pa(seg,e+1))<<8);this.s[m==='lds'?3:0]=this.rb(this.pa(seg,e+2))|(this.rb(this.pa(seg,e+3))<<8);return}
   case'jmp':this.ip=ins.ind?this.get(o[0],2):ins.target;return;
   case'call':{const t=ins.ind?this.get(o[0],2):ins.target;this.push(next);this.ip=t;return}
   case'ret':case'retn':{this.ip=this.pop();if(o.length)this.r[4]=(this.r[4]+o[0].v)&0xFFFF;return}
   case'retf':{this.ip=this.pop();this.s[1]=this.pop();if(o.length)this.r[4]=(this.r[4]+o[0].v)&0xFFFF;return}
   case'iret':this.ip=this.pop();this.s[1]=this.pop();this.flags=(this.pop()&0x0FD5)|2;return;
   case'loop':case'loope':case'loopz':case'loopne':case'loopnz':{this.r[1]=(this.r[1]-1)&0xFFFF;const z=this.gf(6);if(this.r[1]!==0&&(m==='loop'||((m==='loope'||m==='loopz')?z:!z)))this.ip=ins.target;return}
   case'jcxz':if(this.r[1]===0)this.ip=ins.target;return;
   case'nop':case'wait':return;
   case'hlt':this.state='halted';this.msg='The CPU executed HLT and stopped';return;
   case'clc':this.sf(0,0);return;case'stc':this.sf(0,1);return;case'cmc':this.sf(0,!this.gf(0));return;
   case'cld':this.sf(10,0);return;case'std':this.sf(10,1);return;case'cli':this.sf(9,0);return;case'sti':this.sf(9,1);return;
   case'cbw':this.r[0]=((this.r[0]&255)<<24>>24)&0xFFFF;return;
   case'cwd':this.r[2]=(this.r[0]&0x8000)?0xFFFF:0;return;
   case'lahf':this.s8(4,(this.flags&0xD5)|2);return;
   case'sahf':this.flags=(this.flags&0xFF00)|(this.g8(4)&0xD5)|2;return;
   case'xlat':this.s8(0,this.rb(this.pa(this.s[3],this.r[3]+(this.r[0]&255))));return;
   case'aaa':case'aas':{let al=this.r[0]&255,ah=this.r[0]>>8;if((al&15)>9||this.gf(4)){if(m==='aaa'){al+=6;ah++}else{al-=6;ah--}this.sf(4,1);this.sf(0,1)}else{this.sf(4,0);this.sf(0,0)}this.r[0]=((ah&255)<<8)|(al&15);return}
   case'daa':case'das':{let al=this.r[0]&255;const oc=this.gf(0);let cf=0;if((al&15)>9||this.gf(4)){al=m==='daa'?al+6:al-6;cf=oc||(al>255||al<0);this.sf(4,1)}else this.sf(4,0);if((this.r[0]&255)>0x99||oc){al=m==='daa'?al+0x60:al-0x60;cf=1}this.sf(0,cf);this.s8(0,al);this.szp(al&255,1);return}
   case'aam':{const b=ins.bytes[1]||10;if(!b)this.cpuErr('AAM with base 0 divides by zero');const al=this.r[0]&255;this.r[0]=((Math.floor(al/b))<<8)|(al%b);this.szp(this.r[0]&255,1);return}
   case'aad':{const b=ins.bytes[1]||10;const v=((this.r[0]>>8)*b+(this.r[0]&255))&255;this.r[0]=v;this.szp(v,1);return}
   case'in':{const p=o[1].k==='imm'?o[1].v:this.r[2];const v=this.inPorts[p]||0;if(w===1)this.s8(0,v);else this.r[0]=v&0xFFFF;return}
   case'out':{const p=o[0].k==='imm'?o[0].v:this.r[2];const v=w===1?this.r[0]&255:this.r[0];this.ports[p]=v;this.portLog.push([p,v,w]);if(this.portLog.length>500)this.portLog.splice(0,100);return}
   case'int':case'into':{if(m==='into'){if(!this.gf(11))return;return this.intr(4,ins)}return this.intr(o[0].v&255,ins)}
  }
  if(STROPS.has(m))return this.str(ins);
  if(m==='startup'||m==='exit')return;
  this.cpuErr(`${m.toUpperCase()} is not implemented`)}
 str(ins){const m=ins.m,w=m.endsWith('w')?2:1,base=m.slice(0,4),rep=ins.rep;const d=this.gf(10)?-w:w;
  const srcSeg=this.s[3];
  const one=()=>{switch(base){
   case'movs':{const a=this.pa(srcSeg,this.r[6]),b=this.pa(this.s[0],this.r[7]);if(w===1)this.wb(b,this.rb(a));else{this.wb(b,this.rb(a));this.wb(this.pa(this.s[0],this.r[7]+1),this.rb(this.pa(srcSeg,this.r[6]+1)))}this.r[6]+=d;this.r[7]+=d;return}
   case'stos':{const b=this.pa(this.s[0],this.r[7]);this.wb(b,this.r[0]);if(w===2)this.wb(this.pa(this.s[0],this.r[7]+1),this.r[0]>>8);this.r[7]+=d;return}
   case'lods':{const a=this.pa(srcSeg,this.r[6]);if(w===1)this.s8(0,this.rb(a));else this.r[0]=this.rb(a)|(this.rb(this.pa(srcSeg,this.r[6]+1))<<8);this.r[6]+=d;return}
   case'cmps':{const a=w===1?this.rb(this.pa(srcSeg,this.r[6])):this.rb(this.pa(srcSeg,this.r[6]))|(this.rb(this.pa(srcSeg,this.r[6]+1))<<8);const b=w===1?this.rb(this.pa(this.s[0],this.r[7])):this.rb(this.pa(this.s[0],this.r[7]))|(this.rb(this.pa(this.s[0],this.r[7]+1))<<8);this.sub(a,b,0,w);this.r[6]+=d;this.r[7]+=d;return}
   case'scas':{const b=w===1?this.rb(this.pa(this.s[0],this.r[7])):this.rb(this.pa(this.s[0],this.r[7]))|(this.rb(this.pa(this.s[0],this.r[7]+1))<<8);this.sub(w===1?this.r[0]&255:this.r[0],b,0,w);this.r[7]+=d;return}}};
  if(!rep){one();return}
  const cmp=base==='cmps'||base==='scas';
  while(this.r[1]!==0){one();this.r[1]--;if(cmp){const z=this.gf(6);if((rep==='repe'||rep==='repz'||rep==='rep')&&!z)break;if((rep==='repne'||rep==='repnz')&&z)break}}}
 intr(n,ins){
  const vo=this.rw(n*4),vs=this.rw(n*4+2);
  if(vo||vs){if(vs!==this.prog.seg.code)this.cpuErr(`Interrupt ${hex(n,2)}h points to ${hex(vs,4)}:${hex(vo,4)}, outside the program`);this.push(this.flags|0xF002);this.push(this.s[1]);this.push(this.ip);this.sf(9,0);this.sf(8,0);this.ip=vo;return}
  const ah=this.r[0]>>8,al=this.r[0]&255;
  const done=c=>{this.state='done';this.exitCode=c;this.msg=c==null?'The program ended':`The program ended with exit code ${c}`};
  if(n===3){this.msg='Breakpoint (INT 3)';return'bp'}
  if(n===0x20){done(null);return}
  if(n===0x21){switch(ah){
   case 0x00:done(null);return;
   case 0x4C:done(al);return;
   case 0x01:{if(!this.inQ.length){this.waitKind='key';return'wait'}const c=this.inQ.shift();this.out(c);this.s8(0,c);return}
   case 0x07:case 0x08:{if(!this.inQ.length){this.waitKind='key';return'wait'}this.s8(0,this.inQ.shift());return}
   case 0x02:{const c=this.r[2]&255;this.out(c);this.s8(0,c);return}
   case 0x06:{const dl=this.r[2]&255;if(dl===0xFF){if(this.inQ.length){this.s8(0,this.inQ.shift());this.sf(6,0)}else{this.s8(0,0);this.sf(6,1)}}else{this.out(dl);this.s8(0,dl)}return}
   case 0x09:{let off=this.r[2];for(let i=0;i<4096;i++){const c=this.rb(this.pa(this.s[3],off+i));if(c===36){this.s8(0,0x24);return}this.out(c)}this.cpuErr(`INT 21h function 09h printed 4096 characters without finding "$". End the string with '$' and check that DS points to the data segment`)}
   case 0x0A:{const buf=this.pa(this.s[3],this.r[2]);const max=this.rb(buf);if(!max)return;const ci=this.inQ.indexOf(13);if(ci<0){this.waitKind='line';return'wait'}const chars=[];for(const c of this.inQ.splice(0,ci+1)){if(c===13)break;if(c===8){if(chars.length){chars.pop();this.out(8);this.out(32);this.out(8)}continue}if(chars.length<max-1){chars.push(c);this.out(c)}}this.out(13);this.wb(buf+1,chars.length);for(let i=0;i<chars.length;i++)this.wb(buf+2+i,chars[i]);this.wb(buf+2+chars.length,13);return}
   case 0x0B:this.s8(0,this.inQ.length?0xFF:0);return;
   case 0x0C:{this.inQ.length=0;const f=al;if([1,6,7,8,0x0A].includes(f)){this.r[0]=(f<<8)|al;return this.intr(0x21,ins)}return}
   case 0x2A:{const d=new Date();this.r[1]=d.getFullYear();this.r[2]=((d.getMonth()+1)<<8)|d.getDate();this.s8(0,d.getDay());return}
   case 0x2C:{const d=new Date();this.r[1]=(d.getHours()<<8)|d.getMinutes();this.r[2]=(d.getSeconds()<<8)|Math.floor(d.getMilliseconds()/10);return}
   case 0x30:this.r[0]=0x0005;this.r[3]=0;this.r[1]=0;return;
   case 0x25:{this.ww(al*4,this.r[2]);this.ww(al*4+2,this.s[3]);return}
   case 0x35:{this.r[3]=this.rw(al*4);this.s[0]=this.rw(al*4+2);return}
   default:this.cpuErr(`INT 21h function ${hex(ah,2)}h is not available in this simulator. Supported: 01h, 02h, 06h, 07h, 08h, 09h, 0Ah, 0Bh, 0Ch, 25h, 2Ah, 2Ch, 30h, 35h, 4Ch`)}}
  if(n===0x10){switch(ah){
   case 0x00:this.text='';this.col=0;return;
   case 0x0E:this.out(al);return;
   case 0x09:case 0x0A:{for(let i=0;i<Math.min(this.r[1],2000);i++)this.out(al);return}
   case 0x06:case 0x07:if(al===0){this.text='';this.col=0}return;
   case 0x02:{const col=this.r[2]&255;const ls=this.text.lastIndexOf('\n')+1;this.col=Math.min(col,79);void ls;return}
   case 0x03:this.r[2]=this.col;this.r[1]=0x0607;return;
   case 0x01:case 0x05:case 0x0B:case 0x0C:return;
   case 0x0F:this.r[0]=(80<<8)|3;this.s8(7,0);return;
   default:this.cpuErr(`INT 10h function ${hex(ah,2)}h is not available. Supported: 00h, 02h, 03h, 06h, 09h, 0Eh`)}}
  if(n===0x16){switch(ah){
   case 0x00:case 0x10:{if(!this.inQ.length){this.waitKind='key';return'wait'}const c=this.inQ.shift();this.r[0]=c;return}
   case 0x01:case 0x11:{if(this.inQ.length){this.r[0]=this.inQ[0];this.sf(6,0)}else this.sf(6,1);return}
   default:this.cpuErr(`INT 16h function ${hex(ah,2)}h is not available. Supported: 00h and 01h`)}}
  if(n===0x1A&&ah===0){const d=new Date();const t=Math.floor(((d.getHours()*60+d.getMinutes())*60+d.getSeconds()+d.getMilliseconds()/1000)*18.2065);this.r[1]=(t>>16)&0xFFFF;this.r[2]=t&0xFFFF;this.s8(0,0);return}
  if(n===0)this.cpuErr('Divide error (INT 0)');
  this.cpuErr(`Interrupt ${hex(n,2)}h has no handler. Supported services: INT 10h, 16h, 1Ah, 20h and 21h. You can install your own handler with INT 21h function 25h`)}
 flagStr(){return['OF','DF','IF','TF','SF','ZF','AF','PF','CF'].map(k=>k[0]+'='+this.gf(F[k])).join(' ')}
}
const api={assemble,CPU,R16,R8,SREG,F,hex,parseNum};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ASM86=api;
})(typeof window!=='undefined'?window:globalThis);
