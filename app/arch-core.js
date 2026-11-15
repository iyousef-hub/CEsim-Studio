/* CEsim Architecture: MIPS32 and RV32IM assemblers, single-cycle simulator with datapath traces, and a 5-stage pipeline model. */
(function(root){
'use strict';
class AErr extends Error{constructor(m,line){super(m);this.line=line|0}}
const fail=(m,l)=>{throw new AErr(m,l)};
const u32=x=>x>>>0,i32=x=>x|0;
const hex=(v,n)=>'0x'+(v>>>0).toString(16).padStart(n||8,'0');

/* ---------------- registers ---------------- */
const MIPS_REGS=['zero','at','v0','v1','a0','a1','a2','a3','t0','t1','t2','t3','t4','t5','t6','t7','s0','s1','s2','s3','s4','s5','s6','s7','t8','t9','k0','k1','gp','sp','fp','ra'];
const RV_REGS=['zero','ra','sp','gp','tp','t0','t1','t2','s0','s1','a0','a1','a2','a3','a4','a5','a6','a7','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','t3','t4','t5','t6'];
function regNum(isa,tok,line){let t=tok.trim().toLowerCase();
 if(isa==='mips'){if(t[0]!=='$')fail(`'${tok}' is not a register. MIPS registers start with $, for example $t0`,line);t=t.slice(1);if(/^\d+$/.test(t)){const n=+t;if(n<32)return n}if(t==='s8')return 30;const i=MIPS_REGS.indexOf(t);if(i>=0)return i;fail(`'${tok}' is not a MIPS register`,line)}
 if(/^x\d+$/.test(t)){const n=+t.slice(1);if(n<32)return n}if(t==='fp')return 8;const i=RV_REGS.indexOf(t);if(i>=0)return i;if(t[0]==='$')fail(`'${tok}' looks like a MIPS register. RISC-V registers are written like t0, a0 or x5`,line);fail(`'${tok}' is not a RISC-V register`,line)}

/* ---------------- lexer helpers ---------------- */
function stripComment(s){let q=null;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='"'||c==="'")q=c;else if(c==='#'||(c===';'))return s.slice(0,i)}return s}
function splitArgs(s){const out=[];let cur='',q=null,d=0;for(const c of s){if(q){cur+=c;if(c===q&&cur[cur.length-2]!=='\\')q=null;continue}if(c==='"'||c==="'"){q=c;cur+=c;continue}if(c==='(')d++;if(c===')')d--;if(c===','&&d===0){out.push(cur.trim());cur='';continue}cur+=c}if(cur.trim())out.push(cur.trim());return out}
function parseStr(s,line){if(s[0]!=='"'||s[s.length-1]!=='"')fail('Text must be in double quotes',line);let o='';for(let i=1;i<s.length-1;i++){let c=s[i];if(c==='\\'){c=s[++i];o+=c==='n'?'\n':c==='t'?'\t':c==='0'?'\0':c==='r'?'\r':c;continue}o+=c}return o}
function evalNum(tok,syms,line,allowUndef){const s=tok.trim();if(!s)fail('A value is missing',line);
 if(/^'.'$|^'\\.'$/.test(s)){const c=s.length===3?s[1]:({n:'\n',t:'\t','0':'\0'})[s[2]]||s[2];return c.charCodeAt(0)}
 const m=s.match(/^([+-]?)(0x[0-9a-f]+|0b[01]+|\d+)$/i);if(m){let v=/^0x/i.test(m[2])?parseInt(m[2],16):/^0b/i.test(m[2])?parseInt(m[2].slice(2),2):parseInt(m[2],10);return m[1]==='-'?-v:v}
 const e=s.match(/^([A-Za-z_.$][\w.$]*)\s*([+-])\s*(.+)$/);if(e){const b=evalNum(e[1],syms,line,allowUndef);const o=evalNum(e[3],syms,line,allowUndef);return e[2]==='+'?b+o:b-o}
 if(/^[A-Za-z_.$][\w.$]*$/.test(s)){if(syms.has(s))return syms.get(s);if(allowUndef)return 0;fail(`The label '${s}' is not defined`,line)}
 fail(`'${s}' is not a number or a label`,line)}

/* ---------------- instruction tables ---------------- */
const M_R={add:32,addu:33,sub:34,subu:35,and:36,or:37,xor:38,nor:39,slt:42,sltu:43};
const M_SH={sll:0,srl:2,sra:3};const M_SHV={sllv:4,srlv:6,srav:7};
const M_I={addi:8,addiu:9,slti:10,sltiu:11,andi:12,ori:13,xori:14};
const M_LS={lb:32,lh:33,lw:35,lbu:36,lhu:37,sb:40,sh:41,sw:43};
const M_MD={mult:24,multu:25,div:26,divu:27};
const R_R={add:[0,0],sub:[0,32],sll:[1,0],slt:[2,0],sltu:[3,0],xor:[4,0],srl:[5,0],sra:[5,32],or:[6,0],and:[7,0],mul:[0,1],mulh:[1,1],mulhsu:[2,1],mulhu:[3,1],div:[4,1],divu:[5,1],rem:[6,1],remu:[7,1]};
const R_I={addi:0,slti:2,sltiu:3,xori:4,ori:6,andi:7};const R_SH={slli:[1,0],srli:[5,0],srai:[5,32]};
const R_L={lb:0,lh:1,lw:2,lbu:4,lhu:5};const R_S={sb:0,sh:1,sw:2};const R_B={beq:0,bne:1,blt:4,bge:5,bltu:6,bgeu:7};

/* how many words a (pseudo) instruction takes; must not depend on label values */
function sizeOf(isa,m,args,line){
 if(isa==='mips'){
  if(m==='li'){if(args.length!==2)fail('li takes a register and a number',line);let v;try{v=evalNum(args[1],new Map(),line)}catch(e){fail('li needs a number. Use la for labels',line)}return(v>=-32768&&v<=65535)?1:2}
  if(m==='la')return 2;if(['blt','bgt','ble','bge','bltu','bgtu','bleu','bgeu'].includes(m))return 2;
  if(['mul'].includes(m)&&args.length===3)return 1;if(['div','divu','rem','remu'].includes(m)&&args.length===3)return 2;
  if((m in M_LS)&&args.length===2&&!/\(/.test(args[1]))return 2;
  return 1}
 if(m==='li'){if(args.length!==2)fail('li takes a register and a number',line);let v;try{v=evalNum(args[1],new Map(),line)}catch(e){fail('li needs a number. Use la for labels',line)}return(v>=-2048&&v<=2047)?1:2}
 if(m==='la'||m==='call'||m==='tail')return 2;
 if((m in R_L)&&args.length===2&&!/\(/.test(args[1]))return 2;
 return 1}

const encR=(rs,rt,rd,sh,fn)=>u32((rs<<21)|(rt<<16)|(rd<<11)|(sh<<6)|fn);
const encI=(op,rs,rt,imm)=>u32((op<<26)|(rs<<21)|(rt<<16)|(imm&0xFFFF));
const rvR=(f7,rs2,rs1,f3,rd,op)=>u32((f7<<25)|(rs2<<20)|(rs1<<15)|(f3<<12)|(rd<<7)|op);
const rvI=(imm,rs1,f3,rd,op)=>u32(((imm&0xFFF)<<20)|(rs1<<15)|(f3<<12)|(rd<<7)|op);
const rvS=(imm,rs2,rs1,f3,op)=>u32((((imm>>5)&0x7F)<<25)|(rs2<<20)|(rs1<<15)|(f3<<12)|((imm&0x1F)<<7)|op);
const rvB=(imm,rs2,rs1,f3)=>u32((((imm>>12)&1)<<31)|(((imm>>5)&0x3F)<<25)|(rs2<<20)|(rs1<<15)|(f3<<12)|(((imm>>1)&0xF)<<8)|(((imm>>11)&1)<<7)|0x63);
const rvU=(imm,rd,op)=>u32((imm&0xFFFFF000)|(rd<<7)|op);
const rvJ=(imm,rd)=>u32((((imm>>20)&1)<<31)|(((imm>>1)&0x3FF)<<21)|(((imm>>11)&1)<<20)|(((imm>>12)&0xFF)<<12)|(rd<<7)|0x6F);

function memArg(isa,s,syms,line){const m=s.match(/^(.*)\(\s*([^)]+)\s*\)$/);if(!m)return null;const off=m[1].trim()?evalNum(m[1],syms,line):0;return{off,base:regNum(isa,m[2],line)}}
function chk(v,lo,hi,what,line){if(v<lo||v>hi)fail(`${what} ${v} is out of range (${lo} to ${hi})`,line);return v}
function nargs(m,a,n,line,form){if(a.length!==n)fail(`${m} takes ${n} operand${n===1?'':'s'}${form?': '+form:''}`,line)}

function encodeMips(m,a,pc,syms,line){const R=t=>regNum('mips',t,line),N=t=>evalNum(t,syms,line);const out=[];
 const imm16s=(v)=>chk(v,-32768,32767,'The value',line),imm16u=(v)=>chk(v,-32768,65535,'The value',line);
 const br=(t,at)=>{const off=(N(t)-(at+4))>>2;chk(off,-32768,32767,'The branch distance',line);return off};
 if(m in M_R){nargs(m,a,3,line,`${m} $rd, $rs, $rt`);return[encR(R(a[1]),R(a[2]),R(a[0]),0,M_R[m])]}
 if(m in M_SH){nargs(m,a,3,line,`${m} $rd, $rt, shamt`);return[encR(0,R(a[1]),R(a[0]),chk(N(a[2]),0,31,'The shift amount',line),M_SH[m])]}
 if(m in M_SHV){nargs(m,a,3,line);return[encR(R(a[2]),R(a[1]),R(a[0]),0,M_SHV[m])]}
 if(m in M_I){nargs(m,a,3,line,`${m} $rt, $rs, value`);const v=N(a[2]);return[encI(M_I[m],R(a[1]),R(a[0]),['andi','ori','xori'].includes(m)?chk(v,0,65535,'The value',line):imm16s(v))]}
 if(m==='lui'){nargs(m,a,2,line);return[encI(15,0,R(a[0]),imm16u(N(a[1])))]}
 if(m in M_LS){nargs(m,a,2,line,`${m} $rt, offset($rs)`);const ma=memArg('mips',a[1],syms,line);if(ma)return[encI(M_LS[m],ma.base,R(a[0]),imm16s(ma.off))];const addr=N(a[1]);const hi=((addr+0x8000)>>>16)&0xFFFF,lo=addr&0xFFFF;return[encI(15,0,1,hi),encI(M_LS[m],1,R(a[0]),lo)]}
 if(m in M_MD&&a.length===2)return[encR(R(a[0]),R(a[1]),0,0,M_MD[m])];
 if(m==='mfhi'||m==='mflo'){nargs(m,a,1,line);return[encR(0,0,R(a[0]),0,m==='mfhi'?16:18)]}
 if(m==='mthi'||m==='mtlo'){nargs(m,a,1,line);return[encR(R(a[0]),0,0,0,m==='mthi'?17:19)]}
 if(m==='jr'){nargs(m,a,1,line);return[encR(R(a[0]),0,0,0,8)]}
 if(m==='jalr'){if(a.length===1)return[encR(R(a[0]),0,31,0,9)];nargs(m,a,2,line);return[encR(R(a[1]),0,R(a[0]),0,9)]}
 if(m==='syscall'){nargs(m,a,0,line);return[12]}
 if(m==='break'){return[13]}
 if(m==='nop'){nargs(m,a,0,line);return[0]}
 if(m==='beq'||m==='bne'){nargs(m,a,3,line,`${m} $rs, $rt, label`);return[encI(m==='beq'?4:5,R(a[0]),R(a[1]),br(a[2],pc))]}
 if(m==='blez'||m==='bgtz'){nargs(m,a,2,line);return[encI(m==='blez'?6:7,R(a[0]),0,br(a[1],pc))]}
 if(m==='bltz'||m==='bgez'){nargs(m,a,2,line);return[encI(1,R(a[0]),m==='bltz'?0:1,br(a[1],pc))]}
 if(m==='beqz'||m==='bnez'){nargs(m,a,2,line);return[encI(m==='beqz'?4:5,R(a[0]),0,br(a[1],pc))]}
 if(m==='b'){nargs(m,a,1,line);return[encI(4,0,0,br(a[0],pc))]}
 if(m==='j'||m==='jal'){nargs(m,a,1,line);const t=N(a[0]);if(((t>>>28)&15)!==(((pc+4)>>>28)&15))fail('The jump target is in a different 256 MB region',line);return[u32(((m==='j'?2:3)<<26)|((t>>>2)&0x3FFFFFF))]}
 if(m==='mul'){if(a.length===2)return[encR(R(a[0]),R(a[1]),0,0,24)];nargs(m,a,3,line);return[u32((28<<26)|(R(a[1])<<21)|(R(a[2])<<16)|(R(a[0])<<11)|2)]}
 if(['div','divu','rem','remu'].includes(m)&&a.length===3){const md=m.startsWith('div')?(m==='div'?26:27):(m==='rem'?26:27);return[encR(R(a[1]),R(a[2]),0,0,md),encR(0,0,R(a[0]),0,m.startsWith('div')?18:16)]}
 if(m==='move'){nargs(m,a,2,line,'move $rd, $rs');return[encR(R(a[1]),0,R(a[0]),0,33)]}
 if(m==='not'){nargs(m,a,2,line);return[encR(R(a[1]),0,R(a[0]),0,39)]}
 if(m==='neg'||m==='negu'){nargs(m,a,2,line);return[encR(0,R(a[1]),R(a[0]),0,m==='neg'?34:35)]}
 if(m==='li'){nargs(m,a,2,line);const v=N(a[1]);const rt=R(a[0]);if(v>=-32768&&v<=32767)return[encI(9,0,rt,v)];if(v>=0&&v<=65535)return[encI(13,0,rt,v)];if(v<-2147483648||v>4294967295)fail('The value does not fit in 32 bits',line);const u=u32(v);return[encI(15,0,rt,u>>>16),encI(13,rt,rt,u&0xFFFF)]}
 if(m==='la'){nargs(m,a,2,line,'la $rd, label');const v=u32(N(a[1]));const rt=R(a[0]);return[encI(15,0,rt,v>>>16),encI(13,rt,rt,v&0xFFFF)]}
 if(['blt','bgt','ble','bge','bltu','bgtu','bleu','bgeu'].includes(m)){nargs(m,a,3,line,`${m} $rs, $rt, label`);const u=m.endsWith('u');const base=u?m.slice(0,-1):m;let x=R(a[0]),y=R(a[1]);if(base==='bgt'||base==='ble'){[x,y]=[y,x]}const slt=encR(x,y,1,0,u?43:42);const isLt=base==='blt'||base==='bgt';return[slt,encI(isLt?5:4,1,0,br(a[2],pc+4))]}
 fail(`Unknown MIPS instruction '${m}'`,line)}
function encodeRv(m,a,pc,syms,line){const R=t=>regNum('rv',t,line),N=t=>evalNum(t,syms,line);
 const i12=v=>chk(v,-2048,2047,'The value',line);const br=t=>{const off=N(t)-pc;chk(off,-4096,4094,'The branch distance',line);return off};
 if(m in R_R){nargs(m,a,3,line,`${m} rd, rs1, rs2`);const[f3,f7]=R_R[m];return[rvR(f7,R(a[2]),R(a[1]),f3,R(a[0]),0x33)]}
 if(m in R_I){nargs(m,a,3,line,`${m} rd, rs1, value`);return[rvI(i12(N(a[2])),R(a[1]),R_I[m],R(a[0]),0x13)]}
 if(m in R_SH){nargs(m,a,3,line);const[f3,f7]=R_SH[m];return[rvI((f7<<5)|chk(N(a[2]),0,31,'The shift amount',line),R(a[1]),f3,R(a[0]),0x13)]}
 if(m in R_L){nargs(m,a,2,line,`${m} rd, offset(rs1)`);const ma=memArg('rv',a[1],syms,line);if(ma)return[rvI(i12(ma.off),ma.base,R_L[m],R(a[0]),0x03)];const addr=N(a[1]);const rd=R(a[0]);const off=addr-pc;const hi=(off+0x800)&0xFFFFF000;return[rvU(hi,rd,0x17),rvI(off-hi,rd,R_L[m],rd,0x03)]}
 if(m in R_S){nargs(m,a,2,line,`${m} rs2, offset(rs1)`);const ma=memArg('rv',a[1],syms,line);if(!ma)fail(`${m} needs an address like 0(t0)`,line);return[rvS(i12(ma.off),R(a[0]),ma.base,R_S[m],0x23)]}
 if(m in R_B){nargs(m,a,3,line,`${m} rs1, rs2, label`);return[rvB(br(a[2]),R(a[1]),R(a[0]),R_B[m])]}
 if(['bgt','ble','bgtu','bleu'].includes(m)){nargs(m,a,3,line);const map={bgt:'blt',ble:'bge',bgtu:'bltu',bleu:'bgeu'};return[rvB(br(a[2]),R(a[0]),R(a[1]),R_B[map[m]])]}
 if(['beqz','bnez','blez','bgez','bltz','bgtz'].includes(m)){nargs(m,a,2,line);const r=R(a[0]);const o=br(a[1]);switch(m){case'beqz':return[rvB(o,0,r,0)];case'bnez':return[rvB(o,0,r,1)];case'blez':return[rvB(o,r,0,5)];case'bgez':return[rvB(o,0,r,5)];case'bltz':return[rvB(o,0,r,4)];case'bgtz':return[rvB(o,r,0,4)]}}
 if(m==='lui'||m==='auipc'){nargs(m,a,2,line);const v=N(a[1]);chk(v,0,0xFFFFF,'The value',line);return[rvU(v<<12,R(a[0]),m==='lui'?0x37:0x17)]}
 if(m==='jal'){if(a.length===1)return[rvJ(N(a[0])-pc,1)];nargs(m,a,2,line);const off=N(a[1])-pc;chk(off,-1048576,1048574,'The jump distance',line);return[rvJ(off,R(a[0]))]}
 if(m==='j'){nargs(m,a,1,line);return[rvJ(N(a[0])-pc,0)]}
 if(m==='jalr'){if(a.length===1)return[rvI(0,R(a[0]),0,1,0x67)];if(a.length===2){const ma=memArg('rv',a[1],syms,line);if(ma)return[rvI(i12(ma.off),ma.base,0,R(a[0]),0x67)];return[rvI(0,R(a[1]),0,R(a[0]),0x67)]}nargs(m,a,3,line);return[rvI(i12(N(a[2])),R(a[1]),0,R(a[0]),0x67)]}
 if(m==='jr'){nargs(m,a,1,line);return[rvI(0,R(a[0]),0,0,0x67)]}
 if(m==='ret'){nargs(m,a,0,line);return[rvI(0,1,0,0,0x67)]}
 if(m==='call'||m==='tail'){nargs(m,a,1,line);const off=N(a[0])-pc;const hi=(off+0x800)&0xFFFFF000;const rd=m==='call'?1:6;return[rvU(hi,rd,0x17),rvI(off-hi,rd,0,m==='call'?1:0,0x67)]}
 if(m==='ecall'){nargs(m,a,0,line);return[0x73]}
 if(m==='ebreak'){return[0x00100073]}
 if(m==='nop'){nargs(m,a,0,line);return[0x13]}
 if(m==='mv'){nargs(m,a,2,line,'mv rd, rs');return[rvI(0,R(a[1]),0,R(a[0]),0x13)]}
 if(m==='not'){nargs(m,a,2,line);return[rvI(-1,R(a[1]),4,R(a[0]),0x13)]}
 if(m==='neg'){nargs(m,a,2,line);return[rvR(32,R(a[1]),0,0,R(a[0]),0x33)]}
 if(m==='seqz'){nargs(m,a,2,line);return[rvI(1,R(a[1]),3,R(a[0]),0x13)]}
 if(m==='snez'){nargs(m,a,2,line);return[rvR(0,R(a[1]),0,3,R(a[0]),0x33)]}
 if(m==='li'){nargs(m,a,2,line);const v=N(a[1]);const rd=R(a[0]);if(v>=-2048&&v<=2047)return[rvI(v,0,0,rd,0x13)];if(v<-2147483648||v>4294967295)fail('The value does not fit in 32 bits',line);const x=i32(v);const hi=(x+0x800)&0xFFFFF000;return[rvU(hi,rd,0x37),rvI(x-hi,rd,0,rd,0x13)]}
 if(m==='la'){nargs(m,a,2,line,'la rd, label');const off=N(a[1])-pc;const hi=(off+0x800)&0xFFFFF000;const rd=R(a[0]);return[rvU(hi,rd,0x17),rvI(off-hi,rd,0,rd,0x13)]}
 fail(`Unknown RISC-V instruction '${m}'`,line)}

/* ---------------- assembler ---------------- */
const LAYOUT={mips:{text:0x00400000,data:0x10010000,sp:0x7fffeffc,gp:0x10008000},rv:{text:0x00400000,data:0x10010000,sp:0x7fffeffc,gp:0x10008000}};
function assemble(src,isa){isa=isa==='rv'||isa==='riscv'?'rv':'mips';const L=LAYOUT[isa];const lines=String(src).split(/\r?\n/);const errors=[];
 const stmts=[];
 lines.forEach((raw,i)=>{const line=i+1;let s=stripComment(raw).trim();while(s){const m=s.match(/^([A-Za-z_.$][\w.$]*)\s*:\s*(.*)$/);if(!m)break;stmts.push({line,label:m[1]});s=m[2].trim()}if(!s)return;
  const w=s.match(/^(\S+)\s*(.*)$/);stmts.push({line,op:w[1].toLowerCase(),rest:w[2]})});
 let syms=new Map(),words,data,listing,result;
 for(let pass=0;pass<2;pass++){const ns=new Map();let sec='text',pc=L.text,dp=L.data;words=[];data=[];listing=[];const eqv=new Map(syms);
  for(const st of stmts){try{
   if(st.label){if(ns.has(st.label)&&pass===0)fail(`The label '${st.label}' is defined twice`,st.line);ns.set(st.label,sec==='text'?pc:dp);if(pass===1)listing.push({line:st.line,label:st.label,addr:sec==='text'?pc:dp,sec});continue}
   const op=st.op;const args=splitArgs(st.rest);
   if(op[0]==='.'){switch(op){
    case'.text':sec='text';if(args[0])pc=evalNum(args[0],eqv,st.line);break;case'.data':sec='data';if(args[0])dp=evalNum(args[0],eqv,st.line);break;
    case'.globl':case'.global':case'.ent':case'.end':case'.type':case'.size':case'.section':case'.file':case'.option':case'.set':break;
    case'.eqv':case'.equ':case'.set ':{if(args.length!==2)fail(`${op} takes a name and a value`,st.line);ns.set(args[0],evalNum(args[1],eqv,st.line));eqv.set(args[0],ns.get(args[0]));break}
    case'.word':case'.half':case'.byte':{if(sec==='text')fail(`${op} must be in the .data section`,st.line);const sz=op==='.word'?4:op==='.half'?2:1;if(sz>1&&dp%sz){while(dp%sz){data.push([dp,0]);dp++}}if(!args.length)fail(`${op} needs at least one value`,st.line);const start=dp;
     for(const a of args){const rm=a.match(/^(.+?)\s*:\s*(\d+)$/);const reps=rm?+rm[2]:1;const v=evalNum(rm?rm[1]:a,pass?syms:eqv,st.line,pass===0);if(pass&&sz<4&&(v<-(1<<(sz*8-1))||v>=(1<<(sz*8))))fail(`${v} does not fit in a ${op.slice(1)}`,st.line);for(let r=0;r<reps;r++){for(let k=0;k<sz;k++)data.push([dp+k,(v>>>(8*k))&255]);dp+=sz}}
     if(pass)listing.push({line:st.line,addr:start,sec:'data',bytes:dp-start});break}
    case'.asciiz':case'.asciz':case'.ascii':case'.string':{if(sec==='text')fail(`${op} must be in the .data section`,st.line);const start=dp;const s=parseStr(st.rest.trim(),st.line);for(const ch of s)data.push([dp++,ch.charCodeAt(0)&255]);if(op!=='.ascii')data.push([dp++,0]);if(pass)listing.push({line:st.line,addr:start,sec:'data',bytes:dp-start});break}
    case'.space':case'.zero':{const n=evalNum(args[0]||'',eqv,st.line);if(n<0||n>1<<20)fail('.space size is out of range',st.line);if(sec==='text')fail('.space must be in the .data section',st.line);const start=dp;for(let k=0;k<n;k++)data.push([dp++,0]);if(pass)listing.push({line:st.line,addr:start,sec:'data',bytes:n});break}
    case'.align':case'.balign':{const n=evalNum(args[0]||'2',eqv,st.line);const al=op==='.balign'?n:1<<n;if(sec==='data')while(dp%al){data.push([dp++,0])}else while(pc%al)pc+=4;break}
    default:fail(`Unknown directive ${op}`,st.line)}continue}
   if(sec!=='text')fail(`Instructions must be in the .text section (found '${op}' in .data)`,st.line);
   const n=sizeOf(isa,op,args,st.line);
   if(pass===1){const enc=isa==='mips'?encodeMips(op,args,pc,syms,st.line):encodeRv(op,args,pc,syms,st.line);if(enc.length!==n)fail('Internal size mismatch for '+op,st.line);
    enc.forEach((w,k)=>{words.push({addr:pc+4*k,word:w,line:st.line,src:st.op+' '+st.rest,pseudo:enc.length>1||isPseudo(isa,op),k})});listing.push({line:st.line,addr:pc,sec:'text',words:enc})}
   pc+=4*n}
  catch(e){if(!(e instanceof AErr))throw e;if(!errors.some(x=>x.line===e.line))errors.push({line:e.line,msg:e.message})}}
  syms=ns;if(errors.length)break}
 errors.sort((a,b)=>a.line-b.line);
 if(!errors.length&&!words.length)errors.push({line:0,msg:'The program has no instructions. Put them after .text'});
 const entry=syms.has('main')?syms.get('main'):L.text;
 return{ok:!errors.length,errors,isa,words,data,syms,listing,entry,layout:L}}
function isPseudo(isa,m){if(isa==='mips')return['li','la','move','not','neg','negu','blt','bgt','ble','bge','bltu','bgtu','bleu','bgeu','beqz','bnez','b','nop'].includes(m);return['li','la','mv','not','neg','seqz','snez','j','jr','ret','call','tail','nop','beqz','bnez','blez','bgez','bltz','bgtz','bgt','ble','bgtu','bleu'].includes(m)}

/* ---------------- decoding ---------------- */
const sx=(v,b)=>(v<<(32-b))>>(32-b);
function decode(isa,w){if(isa==='mips'){const op=w>>>26,rs=(w>>>21)&31,rt=(w>>>16)&31,rd=(w>>>11)&31,sh=(w>>>6)&31,fn=w&63,imm=w&0xFFFF;const d={op,rs,rt,rd,sh,fn,imm,simm:sx(imm,16),target:w&0x3FFFFFF};
  if(op===0){const names={0:'sll',2:'srl',3:'sra',4:'sllv',6:'srlv',7:'srav',8:'jr',9:'jalr',12:'syscall',13:'break',16:'mfhi',17:'mthi',18:'mflo',19:'mtlo',24:'mult',25:'multu',26:'div',27:'divu',32:'add',33:'addu',34:'sub',35:'subu',36:'and',37:'or',38:'xor',39:'nor',42:'slt',43:'sltu'};d.m=names[fn];d.fmt='R'}
  else if(op===2||op===3){d.m=op===2?'j':'jal';d.fmt='J'}
  else if(op===28&&fn===2){d.m='mul';d.fmt='R'}
  else if(op===1){d.m=rt===0?'bltz':rt===1?'bgez':null;d.fmt='I'}
  else{const names={4:'beq',5:'bne',6:'blez',7:'bgtz',8:'addi',9:'addiu',10:'slti',11:'sltiu',12:'andi',13:'ori',14:'xori',15:'lui',32:'lb',33:'lh',35:'lw',36:'lbu',37:'lhu',40:'sb',41:'sh',43:'sw'};d.m=names[op];d.fmt='I'}
  if(w===0)d.m='nop';return d}
 const op=w&0x7F,rd=(w>>>7)&31,f3=(w>>>12)&7,rs1=(w>>>15)&31,rs2=(w>>>20)&31,f7=w>>>25;const d={op,rd,f3,rs1,rs2,f7};
 const iImm=sx(w>>>20,12),sImm=sx(((w>>>25)<<5)|((w>>>7)&31),12),bImm=sx((((w>>>31)&1)<<12)|(((w>>>7)&1)<<11)|(((w>>>25)&0x3F)<<5)|(((w>>>8)&0xF)<<1),13),uImm=w&0xFFFFF000,jImm=sx((((w>>>31)&1)<<20)|(((w>>>12)&0xFF)<<12)|(((w>>>20)&1)<<11)|(((w>>>21)&0x3FF)<<1),21);
 const f=(m,fmt,imm)=>{d.m=m;d.fmt=fmt;d.imm=imm;return d};
 switch(op){case 0x33:{const k=Object.entries(R_R).find(([n,[a,b]])=>a===f3&&b===f7);return f(k?k[0]:null,'R',0)}
  case 0x13:{if(f3===1)return f('slli','I',rs2);if(f3===5)return f(f7===32?'srai':'srli','I',rs2);const k=Object.entries(R_I).find(([n,v])=>v===f3);return f(k?k[0]:null,'I',iImm)}
  case 0x03:{const k=Object.entries(R_L).find(([n,v])=>v===f3);return f(k?k[0]:null,'I',iImm)}
  case 0x23:{const k=Object.entries(R_S).find(([n,v])=>v===f3);return f(k?k[0]:null,'S',sImm)}
  case 0x63:{const k=Object.entries(R_B).find(([n,v])=>v===f3);return f(k?k[0]:null,'B',bImm)}
  case 0x37:return f('lui','U',uImm);case 0x17:return f('auipc','U',uImm);case 0x6F:return f('jal','J',jImm);case 0x67:return f('jalr','I',iImm);
  case 0x73:return f(w===0x73?'ecall':w===0x00100073?'ebreak':null,'I',0)}
 return f(null,'?',0)}

/* ---------------- CPU ---------------- */
class CPU{
 constructor(prog){this.prog=prog;this.isa=prog.isa;this.reset()}
 reset(){const p=this.prog,L=p.layout;this.r=new Int32Array(32);this.hi=0;this.lo=0;this.pc=p.entry;this.mem=new Map();this.text=new Map();this.lines=new Map();
  for(const w of p.words){this.text.set(w.addr,w);this.wr(w.addr,w.word,4,true)}for(const[a,b]of p.data)this.wb(a,b,true);
  this.r[this.isa==='mips'?29:2]=L.sp;this.r[this.isa==='mips'?28:3]=L.gp;this.state='ready';this.msg='';this.out='';this.inQ='';this.hist=[];this.trace=null;this.steps=0;this.exec=[];this.waitKind=null;this.textEnd=p.words.length?p.words[p.words.length-1].addr+4:p.layout.text;this.memWrites=[]}
 page(a,create){const k=a>>>12;let pg=this.mem.get(k);if(!pg&&create){pg=new Uint8Array(4096);this.mem.set(k,pg)}return pg}
 rb(a){a=a>>>0;const pg=this.page(a);return pg?pg[a&4095]:0}
 wb(a,v,init){a=a>>>0;const pg=this.page(a,true);if(!init&&this.rec)this.rec.push(a,pg[a&4095]);pg[a&4095]=v&255}
 rd(a,n){let v=0;for(let k=n-1;k>=0;k--)v=(v<<8)|this.rb(a+k);return v>>>0}
 wr(a,v,n,init){for(let k=0;k<n;k++)this.wb(a+k,(v>>>(8*k))&255,init)}
 checkAddr(a,n,write,line){a=a>>>0;if(a%n)this.err(`Unaligned ${n===4?'word':'halfword'} access at ${hex(a)}: the address must be a multiple of ${n}`);const L=this.prog.layout;if(a<L.text)this.err(`Address ${hex(a)} is below the program and cannot be ${write?'written':'read'}. Is the base register set?`);if(write&&a<this.textEnd&&a>=L.text)this.err(`Writing to ${hex(a)} would overwrite the program's own instructions`);if(a>=0x80000000)this.err(`Address ${hex(a)} is in the kernel area and cannot be used`)}
 err(m){throw new AErr(m,this.curLine||0)}
 setR(i,v){if(i!==0)this.r[i]=v}
 snap(){return{r:this.r.slice(),pc:this.pc,hi:this.hi,lo:this.lo,out:this.out,inQ:this.inQ,st:this.state,ex:this.exec.length,w:null}}
 back(){const h=this.hist.pop();if(!h)return false;for(let i=h.w.length-2;i>=0;i-=2){const a=h.w[i];const pg=this.page(a,true);pg[a&4095]=h.w[i+1]}this.r.set(h.r);this.pc=h.pc;this.hi=h.hi;this.lo=h.lo;this.out=h.out;this.inQ=h.inQ;this.state=h.st==='done'||h.st==='error'?'paused':h.st;this.exec.length=h.ex;this.steps--;this.trace=this.exec.length?this.exec[this.exec.length-1].tr:null;this.msg='';return true}
 step(){if(this.state==='done'||this.state==='error')return this.state;const w=this.text.get(this.pc);
  if(!w){this.state='error';this.msg=this.pc===this.textEnd?`The program ran past its last instruction at ${hex(this.pc)}. End it with ${this.isa==='mips'?'li $v0, 10 and syscall':'li a7, 10 and ecall'}`:`No instruction at ${hex(this.pc)}. A jump or return went to a wrong address`;return'error'}
  const h=this.snap();this.rec=[];this.curLine=w.line;let r;
  try{r=this.execute(w)}catch(e){if(!(e instanceof AErr))throw e;for(let i=this.rec.length-2;i>=0;i-=2){const a=this.rec[i];this.page(a,true)[a&4095]=this.rec[i+1]}this.r.set(h.r);this.pc=h.pc;this.rec=null;this.state='error';this.msg=e.message;return'error'}
  if(r==='wait'){for(let i=this.rec.length-2;i>=0;i-=2){const a=this.rec[i];this.page(a,true)[a&4095]=this.rec[i+1]}this.r.set(h.r);this.pc=h.pc;this.out=h.out;this.rec=null;this.state='waiting';return'wait'}
  h.w=this.rec;this.rec=null;this.hist.push(h);if(this.hist.length>50000)this.hist.splice(0,10000);this.steps++;this.exec.push({addr:w.addr,line:w.line,tr:this.trace});if(this.exec.length>200000)this.exec.splice(0,50000);
  if(this.state==='ready'||this.state==='waiting')this.state='paused';return this.state==='done'?'done':'ok'}
 execute(w){return this.isa==='mips'?this.execMips(w):this.execRv(w)}
 tr(o){this.trace=Object.assign({pc:this.pc,word:this.wordOf,line:this.curLine},o);return this.trace}
 execMips(w){const d=decode('mips',w.word);this.wordOf=w.word;const R=this.r;const pc=this.pc;const next=(pc+4)>>>0;let npc=next;const rs=R[d.rs],rt=R[d.rt];const m=d.m;
  const C=(o)=>Object.assign({RegDst:0,ALUSrc:0,MemtoReg:0,RegWrite:0,MemRead:0,MemWrite:0,Branch:0,Jump:0,ALUOp:'00'},o);
  if(!m)this.err(`Unknown instruction word ${hex(w.word)}`);
  let t={d,m,fmt:d.fmt,rsv:rs,rtv:rt};
  const ovf=(a,b,res)=>((a^res)&(b^res))<0;
  switch(m){
   case'nop':case'sll':case'srl':case'sra':case'sllv':case'srlv':case'srav':case'add':case'addu':case'sub':case'subu':case'and':case'or':case'xor':case'nor':case'slt':case'sltu':case'mul':{
    let v,a=rs,b=rt,op;switch(m){case'nop':v=0;op='sll';a=rt;b=0;break;case'sll':v=rt<<d.sh;a=rt;b=d.sh;op='sll';break;case'srl':v=rt>>>d.sh;a=rt;b=d.sh;op='srl';break;case'sra':v=rt>>d.sh;a=rt;b=d.sh;op='sra';break;case'sllv':v=rt<<(rs&31);a=rt;b=rs&31;op='sll';break;case'srlv':v=rt>>>(rs&31);a=rt;b=rs&31;op='srl';break;case'srav':v=rt>>(rs&31);a=rt;b=rs&31;op='sra';break;
     case'add':v=(rs+rt)|0;if(ovf(rs,rt,v))this.err(`Arithmetic overflow: ${rs} + ${rt} does not fit in 32 bits. add traps on overflow; addu does not`);op='add';break;case'addu':v=(rs+rt)|0;op='add';break;
     case'sub':v=(rs-rt)|0;if(((rs^rt)&(rs^v))<0)this.err(`Arithmetic overflow: ${rs} − ${rt} does not fit in 32 bits. sub traps on overflow; subu does not`);op='sub';break;case'subu':v=(rs-rt)|0;op='sub';break;
     case'and':v=rs&rt;op='and';break;case'or':v=rs|rt;op='or';break;case'xor':v=rs^rt;op='xor';break;case'nor':v=~(rs|rt);op='nor';break;case'slt':v=rs<rt?1:0;op='slt';break;case'sltu':v=(rs>>>0)<(rt>>>0)?1:0;op='sltu';break;case'mul':v=Math.imul(rs,rt);op='mul';break}
    if(m!=='nop')this.setR(d.rd,v);this.tr(Object.assign(t,{kind:'R',ctrl:C({RegDst:1,RegWrite:m==='nop'?0:1,ALUOp:'10'}),aluA:a,aluB:b,aluOp:op,alu:v,wbReg:m==='nop'?null:d.rd,wbVal:v,wbSrc:'alu',next:npc}));break}
   case'mult':case'multu':{let p=m==='mult'?BigInt(rs)*BigInt(rt):BigInt(rs>>>0)*BigInt(rt>>>0);this.lo=Number(BigInt.asIntN(32,p));this.hi=Number(BigInt.asIntN(32,p>>32n));this.tr(Object.assign(t,{kind:'MD',ctrl:C({ALUOp:'10'}),aluA:rs,aluB:rt,aluOp:'mult',alu:this.lo,hi:this.hi,lo:this.lo,next:npc}));break}
   case'div':case'divu':{if(rt===0){this.hi=0;this.lo=0;this.note='Division by zero: the result is undefined on MIPS'}else if(m==='div'){this.lo=(rs===-2147483648&&rt===-1)?rs:Math.trunc(rs/rt)|0;this.hi=(rs===-2147483648&&rt===-1)?0:(rs%rt)|0}else{this.lo=Math.floor((rs>>>0)/(rt>>>0))|0;this.hi=((rs>>>0)%(rt>>>0))|0}this.tr(Object.assign(t,{kind:'MD',ctrl:C({ALUOp:'10'}),aluA:rs,aluB:rt,aluOp:'div',alu:this.lo,hi:this.hi,lo:this.lo,next:npc}));break}
   case'mfhi':case'mflo':case'mthi':case'mtlo':{if(m==='mfhi')this.setR(d.rd,this.hi);else if(m==='mflo')this.setR(d.rd,this.lo);else if(m==='mthi')this.hi=rs;else this.lo=rs;const v=m==='mfhi'?this.hi:this.lo;this.tr(Object.assign(t,{kind:'R',ctrl:C({RegDst:1,RegWrite:m[1]==='f'?1:0,ALUOp:'10'}),aluA:0,aluB:0,aluOp:m,alu:v,wbReg:m[1]==='f'?d.rd:null,wbVal:v,wbSrc:'alu',next:npc}));break}
   case'addi':case'addiu':case'slti':case'sltiu':case'andi':case'ori':case'xori':case'lui':{const zi=['andi','ori','xori'].includes(m);const imm=zi?d.imm:d.simm;let v,op;switch(m){case'addi':v=(rs+imm)|0;if(ovf(rs,imm,v))this.err(`Arithmetic overflow in addi: ${rs} + ${imm}. Use addiu to ignore overflow`);op='add';break;case'addiu':v=(rs+imm)|0;op='add';break;case'slti':v=rs<imm?1:0;op='slt';break;case'sltiu':v=(rs>>>0)<(imm>>>0)?1:0;op='sltu';break;case'andi':v=rs&imm;op='and';break;case'ori':v=rs|imm;op='or';break;case'xori':v=rs^imm;op='xor';break;case'lui':v=d.imm<<16;op='lui';break}
    this.setR(d.rt,v);this.tr(Object.assign(t,{kind:'I',ctrl:C({ALUSrc:1,RegWrite:1,ALUOp:'11'}),imm,aluA:m==='lui'?0:rs,aluB:m==='lui'?d.imm<<16:imm,aluOp:op,alu:v,wbReg:d.rt,wbVal:v,wbSrc:'alu',next:npc,zeroExt:zi}));break}
   case'lb':case'lbu':case'lh':case'lhu':case'lw':{const a=(rs+d.simm)>>>0;const n=m==='lw'?4:m[1]==='h'?2:1;this.checkAddr(a,n,false);let v=this.rd(a,n);if(m==='lb')v=sx(v,8);else if(m==='lh')v=sx(v,16);else v=v|0;this.setR(d.rt,v);this.tr(Object.assign(t,{kind:'L',ctrl:C({ALUSrc:1,MemtoReg:1,RegWrite:1,MemRead:1}),imm:d.simm,aluA:rs,aluB:d.simm,aluOp:'add',alu:a|0,memAddr:a,memRead:v,memN:n,wbReg:d.rt,wbVal:v,wbSrc:'mem',next:npc}));break}
   case'sb':case'sh':case'sw':{const a=(rs+d.simm)>>>0;const n=m==='sw'?4:m==='sh'?2:1;this.checkAddr(a,n,true);this.wr(a,rt,n);this.tr(Object.assign(t,{kind:'S',ctrl:C({ALUSrc:1,MemWrite:1,MemtoReg:'X',RegDst:'X'}),imm:d.simm,aluA:rs,aluB:d.simm,aluOp:'add',alu:a|0,memAddr:a,memWrite:n===4?rt:rt&((1<<(8*n))-1),memN:n,next:npc}));break}
   case'beq':case'bne':case'blez':case'bgtz':case'bltz':case'bgez':{let tk;switch(m){case'beq':tk=rs===rt;break;case'bne':tk=rs!==rt;break;case'blez':tk=rs<=0;break;case'bgtz':tk=rs>0;break;case'bltz':tk=rs<0;break;case'bgez':tk=rs>=0;break}const tgt=(next+(d.simm<<2))>>>0;if(tk)npc=tgt;this.tr(Object.assign(t,{kind:'B',ctrl:C({Branch:1,ALUOp:'01',MemtoReg:'X',RegDst:'X'}),imm:d.simm,aluA:rs,aluB:['beq','bne'].includes(m)?rt:0,aluOp:'sub',alu:(rs-(['beq','bne'].includes(m)?rt:0))|0,zero:tk,taken:tk,target:tgt,next:npc}));break}
   case'j':case'jal':{const tgt=((next&0xF0000000)|(d.target<<2))>>>0;if(m==='jal')this.setR(31,next|0);npc=tgt;this.tr(Object.assign(t,{kind:'J',ctrl:C({Jump:1,RegWrite:m==='jal'?1:0,MemtoReg:'X',RegDst:m==='jal'?'31':'X',ALUSrc:'X',ALUOp:'XX'}),target:tgt,taken:true,wbReg:m==='jal'?31:null,wbVal:next|0,wbSrc:'pc4',next:npc}));break}
   case'jr':case'jalr':{const tgt=rs>>>0;if(m==='jalr')this.setR(d.rd,next|0);npc=tgt;this.tr(Object.assign(t,{kind:'JR',ctrl:C({Jump:1,RegWrite:m==='jalr'?1:0,ALUOp:'XX'}),target:tgt,taken:true,wbReg:m==='jalr'?d.rd:null,wbVal:next|0,wbSrc:'pc4',next:npc}));break}
   case'syscall':{const r=this.syscall(R[2],4,5,'mips');if(r==='wait')return'wait';this.tr(Object.assign(t,{kind:'SYS',ctrl:C({}),sys:R[2],next:npc}));break}
   case'break':this.err('break instruction reached');
   default:this.err(`Instruction ${m} is not supported`)}
  this.pc=npc>>>0}
 execRv(w){const d=decode('rv',w.word);this.wordOf=w.word;const R=this.r;const pc=this.pc;const next=(pc+4)>>>0;let npc=next;const m=d.m;if(!m)this.err(`Unknown instruction word ${hex(w.word)}`);const a=R[d.rs1],b=R[d.rs2];
  const C=o=>Object.assign({Branch:0,Jump:0,MemRead:0,MemtoReg:'00',ALUOp:'00',MemWrite:0,ALUSrc:0,RegWrite:0},o);let t={d,m,fmt:d.fmt,rsv:a,rtv:b};
  switch(d.op){
   case 0x33:{let v,op=m;switch(m){case'add':v=(a+b)|0;break;case'sub':v=(a-b)|0;break;case'sll':v=a<<(b&31);break;case'slt':v=a<b?1:0;break;case'sltu':v=(a>>>0)<(b>>>0)?1:0;break;case'xor':v=a^b;break;case'srl':v=a>>>(b&31);break;case'sra':v=a>>(b&31);break;case'or':v=a|b;break;case'and':v=a&b;break;
     case'mul':v=Math.imul(a,b);break;case'mulh':v=Number(BigInt.asIntN(32,(BigInt(a)*BigInt(b))>>32n));break;case'mulhu':v=Number(BigInt.asIntN(32,(BigInt(a>>>0)*BigInt(b>>>0))>>32n));break;case'mulhsu':v=Number(BigInt.asIntN(32,(BigInt(a)*BigInt(b>>>0))>>32n));break;
     case'div':v=b===0?-1:(a===-2147483648&&b===-1)?a:Math.trunc(a/b)|0;break;case'divu':v=b===0?-1:Math.floor((a>>>0)/(b>>>0))|0;break;case'rem':v=b===0?a:(a===-2147483648&&b===-1)?0:(a%b)|0;break;case'remu':v=b===0?a:((a>>>0)%(b>>>0))|0;break}
    this.setR(d.rd,v);this.tr(Object.assign(t,{kind:'R',ctrl:C({RegWrite:1,ALUOp:'10'}),aluA:a,aluB:b,aluOp:op,alu:v,wbReg:d.rd,wbVal:v,wbSrc:'alu',next:npc}));break}
   case 0x13:{const imm=d.imm;let v,op;switch(m){case'addi':v=(a+imm)|0;op='add';break;case'slti':v=a<imm?1:0;op='slt';break;case'sltiu':v=(a>>>0)<(imm>>>0)?1:0;op='sltu';break;case'xori':v=a^imm;op='xor';break;case'ori':v=a|imm;op='or';break;case'andi':v=a&imm;op='and';break;case'slli':v=a<<imm;op='sll';break;case'srli':v=a>>>imm;op='srl';break;case'srai':v=a>>imm;op='sra';break}
    this.setR(d.rd,v);this.tr(Object.assign(t,{kind:'I',ctrl:C({ALUSrc:1,RegWrite:1,ALUOp:'10'}),imm,aluA:a,aluB:imm,aluOp:op,alu:v,wbReg:d.rd===0&&m==='addi'&&d.rs1===0&&imm===0?null:d.rd,wbVal:v,wbSrc:'alu',next:npc}));break}
   case 0x03:{const ad=(a+d.imm)>>>0;const n=m==='lw'?4:m[1]==='h'?2:1;this.checkAddr(ad,n,false);let v=this.rd(ad,n);if(m==='lb')v=sx(v,8);else if(m==='lh')v=sx(v,16);else v=v|0;this.setR(d.rd,v);this.tr(Object.assign(t,{kind:'L',ctrl:C({ALUSrc:1,MemtoReg:'01',RegWrite:1,MemRead:1}),imm:d.imm,aluA:a,aluB:d.imm,aluOp:'add',alu:ad|0,memAddr:ad,memRead:v,memN:n,wbReg:d.rd,wbVal:v,wbSrc:'mem',next:npc}));break}
   case 0x23:{const ad=(a+d.imm)>>>0;const n=m==='sw'?4:m==='sh'?2:1;this.checkAddr(ad,n,true);this.wr(ad,b,n);this.tr(Object.assign(t,{kind:'S',ctrl:C({ALUSrc:1,MemWrite:1,MemtoReg:'XX'}),imm:d.imm,aluA:a,aluB:d.imm,aluOp:'add',alu:ad|0,memAddr:ad,memWrite:n===4?b:b&((1<<(8*n))-1),memN:n,next:npc}));break}
   case 0x63:{let tk;switch(m){case'beq':tk=a===b;break;case'bne':tk=a!==b;break;case'blt':tk=a<b;break;case'bge':tk=a>=b;break;case'bltu':tk=(a>>>0)<(b>>>0);break;case'bgeu':tk=(a>>>0)>=(b>>>0);break}const tgt=(pc+d.imm)>>>0;if(tk)npc=tgt;this.tr(Object.assign(t,{kind:'B',ctrl:C({Branch:1,ALUOp:'01',MemtoReg:'XX'}),imm:d.imm,aluA:a,aluB:b,aluOp:'sub',alu:(a-b)|0,zero:tk,taken:tk,target:tgt,next:npc}));break}
   case 0x37:case 0x17:{const v=m==='lui'?d.imm|0:(pc+d.imm)|0;this.setR(d.rd,v);this.tr(Object.assign(t,{kind:'U',ctrl:C({ALUSrc:1,RegWrite:1,ALUOp:'00'}),imm:d.imm,aluA:m==='lui'?0:pc|0,aluB:d.imm|0,aluOp:'add',alu:v,wbReg:d.rd,wbVal:v,wbSrc:'alu',next:npc}));break}
   case 0x6F:{const tgt=(pc+d.imm)>>>0;this.setR(d.rd,next|0);npc=tgt;this.tr(Object.assign(t,{kind:'J',ctrl:C({Jump:1,RegWrite:d.rd?1:0,MemtoReg:'10'}),imm:d.imm,target:tgt,taken:true,wbReg:d.rd||null,wbVal:next|0,wbSrc:'pc4',next:npc}));break}
   case 0x67:{const tgt=((a+d.imm)&~1)>>>0;this.setR(d.rd,next|0);npc=tgt;this.tr(Object.assign(t,{kind:'JR',ctrl:C({Jump:1,ALUSrc:1,RegWrite:d.rd?1:0,MemtoReg:'10'}),imm:d.imm,aluA:a,aluB:d.imm,aluOp:'add',alu:tgt|0,target:tgt,taken:true,wbReg:d.rd||null,wbVal:next|0,wbSrc:'pc4',next:npc}));break}
   case 0x73:{if(m==='ebreak')this.err('ebreak reached');const r=this.syscall(R[17],10,11,'rv');if(r==='wait')return'wait';this.tr(Object.assign(t,{kind:'SYS',ctrl:C({}),sys:R[17],next:npc}));break}
   default:this.err(`Instruction ${m} is not supported`)}
  this.pc=npc>>>0}
 syscall(code,a0,a1,isa){const R=this.r;const ret=isa==='mips'?2:10;
  switch(code){
   case 1:this.out+=String(R[a0]);return;
   case 4:{let a=R[a0]>>>0,s='';for(let i=0;i<10000;i++){const c=this.rb(a+i);if(!c)break;s+=String.fromCharCode(c)}this.out+=s;return}
   case 11:this.out+=String.fromCharCode(R[a0]&255);return;
   case 34:this.out+=hex(R[a0]);return;case 35:this.out+=(R[a0]>>>0).toString(2).padStart(32,'0');return;case 36:this.out+=String(R[a0]>>>0);return;
   case 5:{const i=this.inQ.indexOf('\n');if(i<0){this.waitKind='int';return'wait'}const s=this.inQ.slice(0,i).trim();this.inQ=this.inQ.slice(i+1);const v=parseInt(s,10);if(isNaN(v))this.err(`"${s}" is not a whole number`);this.out+=s+'\n';this.setR(ret,v|0);return}
   case 12:{if(!this.inQ.length){this.waitKind='char';return'wait'}const c=this.inQ.charCodeAt(0);this.inQ=this.inQ.slice(1);this.setR(ret,c);return}
   case 8:{const i=this.inQ.indexOf('\n');if(i<0){this.waitKind='str';return'wait'}const s=this.inQ.slice(0,i);this.inQ=this.inQ.slice(i+1);const buf=R[a0]>>>0,max=R[a1];const t=s.slice(0,Math.max(0,max-1));for(let k=0;k<t.length;k++)this.wb(buf+k,t.charCodeAt(k));if(max>0)this.wb(buf+t.length,0);this.out+=s+'\n';return}
   case 30:{this.setR(isa==='mips'?4:10,Date.now()|0);return}
   case 10:this.state='done';this.msg='The program ended';return;
   case 17:case 93:this.state='done';this.msg=`The program ended with exit code ${R[a0]}`;return;
   case 41:case 42:{const x=Math.floor(Math.random()*(code===42&&R[a1]>0?R[a1]:2**31));this.setR(a0,x);return}
  }
  this.err(`${isa==='mips'?'syscall':'ecall'} ${code} is not supported. Supported codes: 1 print integer, 4 print string, 5 read integer, 8 read string, 10 exit, 11 print character, 12 read character, 17 exit with code`)}
}

/* ---------------- pipeline model ---------------- */
function srcRegs(tr,isa){const d=tr.d,m=tr.m;if(!d)return[];if(isa==='mips'){if(tr.kind==='J'||m==='nop'||m==='syscall'||m==='lui'||m==='mfhi'||m==='mflo')return m==='syscall'?[2,4,5]:[];if(['sll','srl','sra'].includes(m))return[d.rt];if(tr.kind==='I'||tr.kind==='L'||m==='jr'||m==='jalr'||['blez','bgtz','bltz','bgez'].includes(m))return[d.rs];if(tr.kind==='S')return[d.rs,d.rt];return[d.rs,d.rt]}
 if(['lui','auipc','jal'].includes(m))return[];if(m==='ecall')return[17,10,11];if(tr.kind==='I'||tr.kind==='L'||m==='jalr')return[d.rs1];return[d.rs1,d.rs2]}
function dstReg(tr){return tr.wbReg==null||tr.wbReg===0?null:tr.wbReg}
function pipeline(exec,isa,opts){opts=opts||{};const fwd=opts.forwarding!==false;const rows=[];let cycle=0;let lastIF=-1;const out=[];
 for(let i=0;i<exec.length;i++){const e=exec[i],tr=e.tr;if(!tr)continue;let ifc=lastIF+1;let id=ifc+1;let stall=0;const notes=[];const srcs=srcRegs(tr,isa).filter(r=>r);
  for(let back=1;back<=2;back++){const p=out[out.length-back];if(!p||p.flush)continue;const dr=p.dst;if(dr==null||!srcs.includes(dr))continue;
   if(fwd){if(back===1&&p.kind==='L'){const need=p.ex+2;if(id+1<need){stall=Math.max(stall,need-(id+1));notes.push(`stall: load-use on ${regName(isa,dr)}`)}notes.push(`forward ${regName(isa,dr)} MEM/WB → EX`)}else notes.push(`forward ${regName(isa,dr)} ${back===1?'EX/MEM':'MEM/WB'} → EX`)}
   else{const wb=p.ex+2;if(id<wb){stall=Math.max(stall,wb-id);notes.push(`stall: waits for ${regName(isa,dr)} to be written`)}}}
  id+=stall;const ex=id+1;const row={i,addr:e.addr,line:e.line,m:tr.m,kind:tr.kind,dst:dstReg(tr),if:ifc,id,stall,ex,mem:ex+1,wb:ex+2,notes:[...new Set(notes)]};out.push(row);lastIF=ifc+stall;
  if(tr.taken&&(tr.kind==='B'||tr.kind==='J'||tr.kind==='JR')){for(let k=1;k<=2;k++){out.push({flush:true,addr:(e.addr+4*k)>>>0,if:lastIF+k,id:k===1?lastIF+k+1:null,notes:['flushed: the branch was taken']})}lastIF+=2;row.notes.push(`${tr.kind==='B'?'branch taken':'jump'}: 2 wrong instructions flushed`)}}
 const real=out.filter(r=>!r.flush);const last=real.length?real[real.length-1].wb:0;return{rows:out,cycles:real.length?last+1:0,instrs:real.length,cpi:real.length?(last+1-4)/real.length:0}}
function regName(isa,n){return isa==='mips'?'$'+MIPS_REGS[n]:RV_REGS[n]}
function disasm(isa,w){const d=decode(isa,w);if(!d.m)return'?';const r=n=>regName(isa,n);
 if(isa==='mips'){const m=d.m;if(m==='nop'||m==='syscall'||m==='break')return m;if(['sll','srl','sra'].includes(m))return`${m} ${r(d.rd)}, ${r(d.rt)}, ${d.sh}`;if(['sllv','srlv','srav'].includes(m))return`${m} ${r(d.rd)}, ${r(d.rt)}, ${r(d.rs)}`;if(m==='jr')return`jr ${r(d.rs)}`;if(m==='jalr')return`jalr ${r(d.rd)}, ${r(d.rs)}`;if(m==='mfhi'||m==='mflo')return`${m} ${r(d.rd)}`;if(['mult','multu','div','divu'].includes(m))return`${m} ${r(d.rs)}, ${r(d.rt)}`;
  if(d.fmt==='R')return`${m} ${r(d.rd)}, ${r(d.rs)}, ${r(d.rt)}`;if(d.fmt==='J')return`${m} ${hex(d.target<<2)}`;if(m==='lui')return`lui ${r(d.rt)}, ${hex(d.imm,4)}`;if(m in M_LS)return`${m} ${r(d.rt)}, ${d.simm}(${r(d.rs)})`;if(['beq','bne'].includes(m))return`${m} ${r(d.rs)}, ${r(d.rt)}, ${d.simm}`;if(['blez','bgtz','bltz','bgez'].includes(m))return`${m} ${r(d.rs)}, ${d.simm}`;return`${m} ${r(d.rt)}, ${r(d.rs)}, ${['andi','ori','xori'].includes(m)?d.imm:d.simm}`}
 const m=d.m;if(m==='ecall'||m==='ebreak')return m;if(d.fmt==='R')return`${m} ${r(d.rd)}, ${r(d.rs1)}, ${r(d.rs2)}`;if(d.op===0x03||m==='jalr')return`${m} ${r(d.rd)}, ${d.imm}(${r(d.rs1)})`;if(d.fmt==='I')return`${m} ${r(d.rd)}, ${r(d.rs1)}, ${d.imm}`;if(d.fmt==='S')return`${m} ${r(d.rs2)}, ${d.imm}(${r(d.rs1)})`;if(d.fmt==='B')return`${m} ${r(d.rs1)}, ${r(d.rs2)}, ${d.imm}`;if(d.fmt==='U')return`${m} ${r(d.rd)}, ${hex(d.imm>>>12,5)}`;if(d.fmt==='J')return`${m} ${r(d.rd)}, ${d.imm}`;return m}
const api={assemble,CPU,decode,disasm,pipeline,srcRegs,MIPS_REGS,RV_REGS,regName,hex,LAYOUT};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ARCH=api;
})(typeof window!=='undefined'?window:globalThis);
