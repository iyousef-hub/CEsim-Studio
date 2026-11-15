/* CEsim Verilog: parser and 4-state event-driven simulator for a teaching subset of Verilog-2001. */
(function(root){
'use strict';
class VErr extends Error{constructor(m,line){super(m);this.line=line|0}}
const fail=(m,l)=>{throw new VErr(m,l)};

/* ---------------- 4-state values ---------------- */
const MK=w=>(1n<<BigInt(w))-1n;
class V{constructor(w,a,b,s){this.w=w;const m=MK(w);this.a=BigInt.asUintN(w,a)&m;this.b=BigInt.asUintN(w,b||0n)&m;this.s=!!s}}
const num=(w,n,s)=>new V(w,BigInt.asUintN(w,BigInt(n)),0n,s);
const X=w=>new V(w,MK(w),MK(w));
const Z=w=>new V(w,0n,MK(w));
const known=v=>v.b===0n;
function ext(v,w,s){if(v.w===w)return v.s===!!s?v:new V(w,v.a,v.b,s);if(w<v.w)return new V(w,v.a,v.b,s);
 const sg=v.s&&s!==false&&v.w>0;const top=BigInt(v.w-1);let a=v.a,b=v.b;
 if(sg||(s==null&&v.s)){const fill=MK(w)^MK(v.w);if((v.b>>top)&1n){b|=fill;if((v.a>>top)&1n)a|=fill}else if((v.a>>top)&1n)a|=fill}
 return new V(w,a,b,s==null?v.s:s)}
function sval(v){if(v.s&&(v.a>>BigInt(v.w-1))&1n)return v.a-(1n<<BigInt(v.w));return v.a}
function k0(v){return~v.a&~v.b&MK(v.w)}
function k1(v){return v.a&~v.b&MK(v.w)}
function vAnd(x,y,w){const r0=k0(x)|k0(y),r1=k1(x)&k1(y),u=MK(w)&~(r0|r1);return new V(w,r1|u,u)}
function vOr(x,y,w){const r1=k1(x)|k1(y),r0=k0(x)&k0(y),u=MK(w)&~(r0|r1);return new V(w,r1|u,u)}
function vXor(x,y,w){const u=(x.b|y.b)&MK(w);return new V(w,((x.a^y.a)&~u)|u,u)}
function vNot(x){const u=x.b;return new V(x.w,(~x.a&~u)|u,u,x.s)}
function truth(v){if(k1(v))return 1;if(v.b)return-1;return 0}
const bitV=t=>t===1?new V(1,1n,0n):t===0?new V(1,0n,0n):X(1);
function fmtBits(v){let s='';for(let i=v.w-1;i>=0;i--){const I=BigInt(i);const a=(v.a>>I)&1n,b=(v.b>>I)&1n;s+=b?(a?'x':'z'):(a?'1':'0')}return s}
function fmtHex(v,lower){let s='';const n=Math.ceil(v.w/4);for(let i=n-1;i>=0;i--){const sh=BigInt(i*4);const m=i===n-1&&v.w%4?MK(v.w%4):15n;const a=(v.a>>sh)&m,b=(v.b>>sh)&m;if(b){if(b===m)s+=a===m?'x':a===0n?'z':'X';else s+=(a&b)?'X':'Z'}else s+=Number(a).toString(16)}return lower===false?s.toUpperCase():s}
function fmtDec(v,signed){if(v.b){const anyX=(v.a&v.b)!==0n;if(v.b===MK(v.w))return v.a===MK(v.w)?'x':(anyX?'X':'z');return anyX?'X':'Z'}return(signed?sval(v):v.a).toString()}

/* ---------------- lexer ---------------- */
const OPS=['<<<','>>>','===','!==','<<','>>','<=','>=','==','!=','&&','||','~&','~|','~^','^~','**','+:','-:','->','+','-','*','/','%','<','>','=','!','~','&','|','^','?',':',';',',','.','(',')','[',']','{','}','@','#'];
const KW=new Set(['module','endmodule','input','output','inout','wire','reg','integer','time','real','parameter','localparam','assign','always','initial','begin','end','if','else','case','casez','casex','endcase','default','for','while','repeat','forever','posedge','negedge','or','and','not','nand','nor','xor','xnor','buf','function','endfunction','task','endtask','signed','unsigned','genvar','generate','endgenerate','wait','supply0','supply1','tri','defparam','automatic','disable','fork','join']);
function lex(src){const t=[];let i=0,line=1;const n=src.length;const defs=new Map();
 const push=(o)=>{t.push(o)};
 while(i<n){const c=src[i];
  if(c==='\n'){line++;i++;continue}
  if(/\s/.test(c)){i++;continue}
  if(c==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;continue}
  if(c==='/'&&src[i+1]==='*'){const st=line;i+=2;while(i<n&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++}if(i>=n)fail('A /* comment is never closed with */',st);i+=2;continue}
  if(c==='`'){let j=i+1;while(j<n&&/\w/.test(src[j]))j++;const d=src.slice(i+1,j);let k=j;while(k<n&&src[k]!=='\n')k++;const rest=src.slice(j,k).replace(/\/\/.*$/,'').trim();
   if(d==='timescale'||d==='include'||d==='default_nettype'||d==='resetall'||d==='celldefine'||d==='endcelldefine'){i=k;continue}
   if(d==='define'){const m=rest.match(/^(\w+)\s*(.*)$/);if(m)defs.set(m[1],m[2]);i=k;continue}
   if(d==='ifdef'||d==='ifndef'||d==='else'||d==='endif'||d==='undef'){i=k;continue}
   if(defs.has(d)){const sub=lex(defs.get(d)).filter(x=>x.t!=='eof');for(const x of sub){x.line=line;push(x)}i=j;continue}
   fail(`Unknown directive \`${d}`,line)}
  if(/[A-Za-z_$]/.test(c)){let j=i;while(j<n&&/[\w$]/.test(src[j]))j++;const w=src.slice(i,j);push({t:w[0]==='$'?'sys':KW.has(w)?'kw':'id',v:w,line});i=j;continue}
  if(c==='\\'){let j=i+1;while(j<n&&!/\s/.test(src[j]))j++;push({t:'id',v:src.slice(i+1,j),line});i=j;continue}
  if(/[0-9']/.test(c)){const m=src.slice(i).match(/^(\d[\d_]*)?\s*'\s*([sS]?)([bBoOdDhH])\s*([0-9a-fA-FxXzZ?_]+)/);
   if(m){const lit=parseLit(m[1],m[2],m[3],m[4],line);push({t:'num',v:lit,line,sized:!!m[1]});i+=m[0].length;continue}
   const r=src.slice(i).match(/^\d[\d_]*(\.\d+)?([eE][+-]?\d+)?/);if(r){if(r[1]||r[2])push({t:'real',v:parseFloat(r[0].replace(/_/g,'')),line});else{const v=BigInt(r[0].replace(/_/g,''));push({t:'num',v:new V(32,v,0n,true),line,unsized:true,big:v>0xFFFFFFFFn})}i+=r[0].length;continue}
   fail(`Unexpected character '${c}'`,line)}
  if(c==='"'){let j=i+1,s='';while(j<n&&src[j]!=='"'){if(src[j]==='\n')fail('A string is missing its closing "',line);if(src[j]==='\\'){j++;const e=src[j];s+=e==='n'?'\n':e==='t'?'\t':e==='\\'?'\\':e==='"'?'"':e;j++;continue}s+=src[j++]}push({t:'str',v:s,line});i=j+1;continue}
  let op=null;for(const o of OPS)if(src.startsWith(o,i)){op=o;break}
  if(!op)fail(`Unexpected character '${c}'`,line);push({t:'op',v:op,line});i+=op.length}
 t.push({t:'eof',v:'',line});return t}
function parseLit(size,sg,base,digits,line){base=base.toLowerCase();const d=digits.replace(/_/g,'').toLowerCase();let w=size?parseInt(size.replace(/_/g,''),10):32;if(size&&(w<1||w>4096))fail(`A number cannot be ${w} bits wide`,line);
 let a=0n,b=0n,nb=0;
 if(base==='d'){if(/^[xz?]$/.test(d)){return d==='x'?X(w):Z(w)}if(!/^\d+$/.test(d))fail(`'${digits}' is not a decimal number`,line);a=BigInt(d);nb=a.toString(2).length;if(!size&&a>0xFFFFFFFFn)w=nb}
 else{const bits=base==='b'?1:base==='o'?3:4;const max=bits===1?1:bits===3?7:15;for(const ch of d){a<<=BigInt(bits);b<<=BigInt(bits);if(ch==='x'){a|=BigInt(max);b|=BigInt(max)}else if(ch==='z'||ch==='?'){b|=BigInt(max)}else{const v=parseInt(ch,16);if(isNaN(v)||v>max)fail(`'${ch}' is not a valid digit in a base-${base==='b'?2:base==='o'?8:16} number`,line);a|=BigInt(v)}}nb=d.length*bits;
  if(!size&&nb>32)w=nb;
  if(nb<w){const topX=(b>>BigInt(nb-1))&1n;if(topX){const fill=MK(w)^MK(nb);b|=fill;if((a>>BigInt(nb-1))&1n)a|=fill}}}
 return new V(w,a,b,!!sg)}

/* ---------------- parser ---------------- */
function Parser(t){this.t=t;this.p=0}
const P=Parser.prototype;
P.peek=function(k){return this.t[this.p+(k||0)]};P.next=function(){return this.t[this.p++]};
P.is=function(v,k){const x=this.peek(k);return x&&(x.t==='op'||x.t==='kw')&&x.v===v};
P.eat=function(v){if(this.is(v)){this.p++;return true}return false};
P.expect=function(v,why){if(this.is(v))return this.next();const x=this.peek(),prev=this.t[this.p-1];if(v===';'&&prev&&x.line>prev.line)fail(`Missing ';' at the end of this line`,prev.line);fail(`Expected '${v}'${why?' '+why:''} but found '${x.v||'end of file'}'`,x.line)};
P.ident=function(what){const x=this.peek();if(x.t!=='id'){fail(`Expected ${what||'a name'} but found '${x.v||'end of file'}'${x.t==='kw'?` ('${x.v}' is a reserved word)`:''}`,x.line)}this.p++;return x.v};
P.source=function(){const mods=[];while(this.peek().t!=='eof'){if(this.is('module'))mods.push(this.module());else{const x=this.peek();fail(`Expected 'module' but found '${x.v}'`,x.line)}}return mods};
P.range=function(){if(!this.is('['))return null;this.next();const msb=this.expr();this.expect(':','in the range');const lsb=this.expr();this.expect(']');return{msb,lsb}};
P.module=function(){const line=this.next().line;const name=this.ident('a module name');const m={name,line,params:[],ports:[],decls:[],items:[],funcs:{},tasks:{}};
 if(this.eat('#')){this.expect('(');while(!this.is(')')){this.eat('parameter');this.eat('integer');this.eat('signed');this.range();const pn=this.ident('a parameter name');this.expect('=');m.params.push({name:pn,e:this.expr(),line});if(!this.eat(','))break}this.expect(')')}
 if(this.eat('(')){if(!this.is(')'))for(;;){const x=this.peek();if(this.is('input')||this.is('output')||this.is('inout')){const dir=this.next().v;let kind='wire';if(this.eat('reg'))kind='reg';else if(this.eat('wire'))kind='wire';else if(this.eat('integer'))kind='integer';const sg=this.eat('signed');const r=this.range();do{const pn=this.ident('a port name');m.ports.push(pn);m.decls.push({kind,dir,name:pn,range:r,signed:sg,line:x.line})}while(this.is(',')&&this.peek(1).t==='id'&&this.eat(','))}else m.ports.push(this.ident('a port name'));if(!this.eat(','))break}this.expect(')')}
 this.expect(';');
 while(!this.is('endmodule')){if(this.peek().t==='eof')fail(`Module '${name}' is missing endmodule`,line);this.item(m)}
 this.next();return m};
P.declNames=function(m,base){do{const x=this.peek();const n=this.ident('a name');const arr=this.range();let init=null;if(this.eat('='))init=this.expr();m.decls.push(Object.assign({},base,{name:n,arr,init,line:x.line}))}while(this.eat(','));this.expect(';')};
P.item=function(m){const x=this.peek(),line=x.line;
 if(x.t==='kw')switch(x.v){
  case'input':case'output':case'inout':{this.next();let kind='wire';if(this.eat('reg'))kind='reg';else if(this.eat('wire'))kind='wire';else if(this.eat('integer'))kind='integer';const sg=this.eat('signed');const r=this.range();this.declNames(m,{kind,dir:x.v,range:r,signed:sg});return}
  case'wire':case'reg':case'tri':case'supply0':case'supply1':{this.next();const sg=this.eat('signed');const r=this.range();const kind=x.v==='reg'?'reg':'wire';const before=m.decls.length;this.declNames(m,{kind,range:r,signed:sg,supply:x.v.startsWith('supply')?x.v:null});if(kind==='wire')for(const d of m.decls.slice(before))if(d.init){m.items.push({k:'assign',lv:{k:'id',name:d.name,line:d.line},e:d.init,line:d.line});d.init=null}return}
  case'integer':case'time':{this.next();this.declNames(m,{kind:'reg',range:{msb:{k:'num',v:num(32,x.v==='time'?63:31)},lsb:{k:'num',v:num(32,0)}},signed:x.v==='integer',integer:true});return}
  case'genvar':{this.next();do this.ident();while(this.eat(','));this.expect(';');fail('generate loops are not supported yet. Write the instances out, or use a for loop inside always',line)}
  case'real':fail('real numbers are not supported in this simulator',line);
  case'parameter':case'localparam':{this.next();this.eat('integer');this.eat('signed');this.range();do{const pn=this.ident('a parameter name');this.expect('=');m.decls.push({kind:'param',local:x.v==='localparam',name:pn,e:this.expr(),line})}while(this.eat(','));this.expect(';');return}
  case'assign':{this.next();let d=null;if(this.eat('#'))d=this.delayVal();do{const lv=this.lvalue();this.expect('=');const e=this.expr();m.items.push({k:'assign',lv,e,delay:d,line})}while(this.eat(','));this.expect(';');return}
  case'always':{this.next();m.items.push({k:'always',s:this.stmt(),line});return}
  case'initial':{this.next();m.items.push({k:'initial',s:this.stmt(),line});return}
  case'function':{this.next();this.eat('automatic');const sg=this.eat('signed');let r=this.range();if(this.eat('integer'))r={msb:{k:'num',v:num(32,31)},lsb:{k:'num',v:num(32,0)}};const fn=this.ident('a function name');const f={name:fn,range:r,signed:sg,args:[],decls:[],line};
   if(this.eat('(')){while(!this.is(')')){this.expect('input');this.eat('reg');this.eat('wire');const s2=this.eat('signed');const r2=this.range();do{f.args.push({name:this.ident(),range:r2,signed:s2})}while(this.is(',')&&this.peek(1).t==='id'&&this.eat(','));if(!this.eat(','))break}this.expect(')')}this.expect(';');
   while(!this.is('endfunction')&&!this.is('begin')&&!this.isStmtStart()){const y=this.next();if(y.v==='input'){this.eat('reg');const s2=this.eat('signed');const r2=this.range();do f.args.push({name:this.ident(),range:r2,signed:s2});while(this.eat(','));this.expect(';')}else if(y.v==='reg'||y.v==='integer'){const s2=y.v==='integer'||this.eat('signed');const r2=y.v==='integer'?{msb:{k:'num',v:num(32,31)},lsb:{k:'num',v:num(32,0)}}:this.range();do f.decls.push({name:this.ident(),range:r2,signed:s2});while(this.eat(','));this.expect(';')}else fail(`Unexpected '${y.v}' in function ${fn}`,y.line)}
   f.body=this.stmt();this.expect('endfunction');m.funcs[fn]=f;return}
  case'task':{this.next();this.eat('automatic');const tn=this.ident('a task name');const tk={name:tn,args:[],decls:[],line};if(this.eat('(')){while(!this.is(')')){const dir=this.next().v;this.eat('reg');const r2=this.range();do tk.args.push({name:this.ident(),dir,range:r2});while(this.is(',')&&this.peek(1).t==='id'&&this.eat(','));if(!this.eat(','))break}this.expect(')')}this.expect(';');
   while(this.is('input')||this.is('output')||this.is('reg')||this.is('integer')){const y=this.next().v;this.eat('reg');const r2=y==='integer'?{msb:{k:'num',v:num(32,31)},lsb:{k:'num',v:num(32,0)}}:this.range();do{const nm=this.ident();if(y==='input'||y==='output')tk.args.push({name:nm,dir:y,range:r2});else tk.decls.push({name:nm,range:r2,signed:y==='integer'})}while(this.eat(','));this.expect(';')}
   tk.body=this.stmt();this.expect('endtask');m.tasks[tn]=tk;return}
  case'and':case'or':case'not':case'nand':case'nor':case'xor':case'xnor':case'buf':{this.next();if(this.eat('#'))this.delayVal();do{if(this.peek().t==='id')this.next();this.expect('(');const args=[];do args.push(this.expr());while(this.eat(','));this.expect(')');if(args.length<2)fail(`A ${x.v} gate needs an output and at least one input`,line);if((x.v==='not'||x.v==='buf')&&args.length!==2)fail(`A ${x.v} gate has one output and one input`,line);m.items.push({k:'gate',g:x.v,out:args[0],ins:args.slice(1),line})}while(this.eat(','));this.expect(';');return}
  case'defparam':fail('defparam is not supported. Use #(.NAME(value)) on the instance',line);
  case'generate':fail('generate blocks are not supported yet',line);
 }
 if(x.t==='id'){const mod=this.next().v;let params=null;if(this.eat('#')){this.expect('(');params=[];if(!this.is(')'))do{if(this.eat('.')){const pn=this.ident();this.expect('(');params.push({name:pn,e:this.expr()});this.expect(')')}else params.push({e:this.expr()})}while(this.eat(','));this.expect(')')}
  if(this.is('=')||this.is('<=')||this.is('[')&&false)fail(`'${mod}' must be inside an always or initial block, or start with assign`,line);
  do{const iline=this.peek().line;const inst=this.ident('an instance name');if(this.is('['))fail('Arrays of instances are not supported',iline);this.expect('(',`after the instance name ${inst}`);const conns=[];if(!this.is(')'))do{if(this.eat('.')){const pn=this.ident('a port name');this.expect('(');const e=this.is(')')?null:this.expr();this.expect(')');conns.push({name:pn,e})}else conns.push({e:this.is(',')||this.is(')')?null:this.expr()})}while(this.eat(','));this.expect(')');m.items.push({k:'inst',mod,inst,params,conns,line:iline})}while(this.eat(','));
  this.expect(';');return}
 fail(`Unexpected '${x.v}' in module ${m.name}`,line)};
P.isStmtStart=function(){const x=this.peek();return x.t==='kw'&&['begin','if','case','casez','casex','for','while','repeat','forever'].includes(x.v)||x.t==='id'||x.t==='sys'||this.is('#')||this.is('@')};
P.delayVal=function(){if(this.eat('(')){const e=this.expr();if(this.eat(',')){this.expr();if(this.eat(','))this.expr()}this.expect(')');return e}const x=this.next();if(x.t==='num')return{k:'num',v:x.v,line:x.line};if(x.t==='real')return{k:'real',v:x.v,line:x.line};if(x.t==='id')return{k:'id',name:x.v,line:x.line};fail('Expected a delay after #',x.line)};
P.event=function(){const line=this.expect('@').line;if(this.eat('*'))return{k:'star',line};this.expect('(');if(this.eat('*')){this.expect(')');return{k:'star',line}}const list=[];do{let edge=null;if(this.eat('posedge'))edge='pos';else if(this.eat('negedge'))edge='neg';list.push({edge,e:this.expr()})}while(this.eat('or')||this.eat(','));this.expect(')');return{k:'ev',list,line}};
P.lvalue=function(){const x=this.peek();if(this.is('{')){this.next();const parts=[];do parts.push(this.lvalue());while(this.eat(','));this.expect('}');return{k:'concat',parts,line:x.line}}const name=this.ident('a signal name');let e={k:'id',name,line:x.line};while(this.is('['))e=this.select(e);return e};
P.select=function(base){const line=this.expect('[').line;const i=this.expr();if(this.eat(':')){const j=this.expr();this.expect(']');return{k:'part',base,msb:i,lsb:j,line}}if(this.eat('+:')){const w=this.expr();this.expect(']');return{k:'ipart',base,start:i,width:w,up:true,line}}if(this.eat('-:')){const w=this.expr();this.expect(']');return{k:'ipart',base,start:i,width:w,up:false,line}}this.expect(']');return{k:'bit',base,i,line}};
P.stmt=function(){const x=this.peek(),line=x.line;
 if(this.eat(';'))return{k:'nop',line};
 if(this.eat('begin')){let name=null;if(this.eat(':'))name=this.ident();const body=[];while(!this.is('end')){if(this.peek().t==='eof')fail('A begin is never closed with end',line);if(this.is('reg')||this.is('integer')){const y=this.next();this.range();do body.push({k:'localdecl',name:this.ident(),integer:y.v==='integer',line:y.line});while(this.eat(','));this.expect(';');continue}body.push(this.stmt())}this.next();return{k:'block',body,name,line}}
 if(this.eat('fork'))fail('fork / join is not supported yet',line);
 if(this.eat('if')){this.expect('(');const c=this.expr();this.expect(')');const t=this.stmt();let f=null;if(this.eat('else'))f=this.stmt();return{k:'if',c,t,f,line}}
 if(this.is('case')||this.is('casez')||this.is('casex')){const kind=this.next().v;this.expect('(');const e=this.expr();this.expect(')');const items=[];while(!this.is('endcase')){if(this.peek().t==='eof')fail('case is never closed with endcase',line);if(this.eat('default')){this.eat(':');items.push({def:true,s:this.stmt()});continue}const vals=[];do vals.push(this.expr());while(this.eat(','));this.expect(':','after the case value');items.push({vals,s:this.stmt()})}this.next();return{k:'case',kind,e,items,line}}
 if(this.eat('for')){this.expect('(');const init=this.assignStmt(true);this.expect(';');const c=this.expr();this.expect(';');const step=this.assignStmt(true);this.expect(')');return{k:'for',init,c,step,s:this.stmt(),line}}
 if(this.eat('while')){this.expect('(');const c=this.expr();this.expect(')');return{k:'while',c,s:this.stmt(),line}}
 if(this.eat('repeat')){this.expect('(');const c=this.expr();this.expect(')');return{k:'repeat',c,s:this.stmt(),line}}
 if(this.eat('forever'))return{k:'forever',s:this.stmt(),line};
 if(this.eat('wait')){this.expect('(');const c=this.expr();this.expect(')');return{k:'wait',c,s:this.stmt(),line}}
 if(this.eat('disable')){this.ident();this.expect(';');return{k:'disable',line}}
 if(this.is('#')){this.next();const d=this.delayVal();return{k:'delay',d,s:this.stmt(),line}}
 if(this.is('@')){const ev=this.event();return{k:'event',ev,s:this.stmt(),line}}
 if(x.t==='sys'){this.next();const args=[];if(this.eat('(')){if(!this.is(')'))do args.push(this.is(',')?{k:'empty'}:this.expr());while(this.eat(','));this.expect(')')}this.expect(';');return{k:'sys',name:x.v,args,line}}
 if(x.t==='id'&&this.is('(',1)||x.t==='id'&&this.is(';',1)){this.next();const args=[];if(this.eat('(')){if(!this.is(')'))do args.push(this.expr());while(this.eat(','));this.expect(')')}this.expect(';');return{k:'task',name:x.v,args,line}}
 if(x.t==='kw'&&(x.v==='assign'))fail("'assign' cannot be used inside always or initial. Write the assignment without assign",line);
 if(x.t==='kw')fail(`Unexpected '${x.v}' here${['wire','input','output'].includes(x.v)?'. Declarations go at the top of the module, outside always and initial':''}`,line);
 const s=this.assignStmt(false);this.expect(';');return s};
P.assignStmt=function(inFor){const x=this.peek();const lv=this.lvalue();let k;if(this.eat('='))k='bas';else if(this.eat('<='))k='nba';else fail(`Expected = or <= after ${x.v}`,this.peek().line);let d=null,ev=null;if(this.eat('#'))d=this.delayVal();else if(this.is('@'))ev=this.event();const e=this.expr();return{k,lv,e,d,ev,line:x.line}};
const PREC=[['||'],['&&'],['|'],['^','~^','^~'],['&'],['==','!=','===','!=='],['<','<=','>','>='],['<<','>>','<<<','>>>'],['+','-'],['*','/','%'],['**']];
P.expr=function(){const c=this.bin(0);if(this.is('?')){const line=this.next().line;const a=this.expr();this.expect(':','in ? :');const b=this.expr();return{k:'cond',c,a,b,line}}return c};
P.bin=function(l){if(l>=PREC.length)return this.unary();let a=this.bin(l+1);for(;;){const x=this.peek();if(x.t==='op'&&PREC[l].includes(x.v)){this.p++;a={k:'bin',op:x.v,a,b:this.bin(l+1),line:x.line}}else return a}};
P.unary=function(){const x=this.peek();if(x.t==='op'&&['+','-','!','~','&','~&','|','~|','^','~^','^~'].includes(x.v)){this.p++;return{k:'un',op:x.v,a:this.unary(),line:x.line}}return this.primary()};
P.primary=function(){const x=this.next();
 if(x.t==='num')return{k:'num',v:x.v,unsized:x.unsized,line:x.line};
 if(x.t==='real')return{k:'real',v:x.v,line:x.line};
 if(x.t==='str')return{k:'str',v:x.v,line:x.line};
 if(x.t==='op'&&x.v==='('){const e=this.expr();this.expect(')');return e}
 if(x.t==='op'&&x.v==='{'){const first=this.expr();if(this.is('{')){this.next();const parts=[];do parts.push(this.expr());while(this.eat(','));this.expect('}');this.expect('}');return{k:'repl',n:first,parts,line:x.line}}const parts=[first];while(this.eat(','))parts.push(this.expr());this.expect('}');return{k:'concat',parts,line:x.line}}
 if(x.t==='sys'){const args=[];if(this.eat('(')){if(!this.is(')'))do args.push(this.expr());while(this.eat(','));this.expect(')')}return{k:'sysf',name:x.v,args,line:x.line}}
 if(x.t==='id'){if(this.is('(')){this.next();const args=[];if(!this.is(')'))do args.push(this.expr());while(this.eat(','));this.expect(')');return{k:'call',name:x.v,args,line:x.line}}let e={k:'id',name:x.v,line:x.line};while(this.is('['))e=this.select(e);if(this.is('.')&&this.peek(1).t==='id'){this.next();e={k:'id',name:x.v+'.'+this.ident(),line:x.line}}return e}
 if(x.t==='eof')fail('The file ends in the middle of an expression',x.line);
 fail(`Unexpected '${x.v}' in an expression`,x.line)};

/* ---------------- elaboration ---------------- */
class Sig{constructor(name,w,msb,lsb,signed,kind,line){this.name=name;this.w=w;this.msb=msb;this.lsb=lsb;this.signed=signed;this.kind=kind;this.line=line;this.val=kind==='reg'?X(w):Z(w);this.val.s=signed;this.waiters=new Set();this.conts=[];this.wave=[];this.drivers=null;this.arr=null}}
function constEval(e,scope,line){const v=evalE(e,scope,null);if(!known(v))fail('This value must be a fixed number',line||e.line);return Number(sval(v))}
function elaborate(mods,topName,sim){const byName=new Map();for(const m of mods){if(byName.has(m.name))fail(`Module '${m.name}' is defined twice`,m.line);byName.set(m.name,m)}
 const used=new Set();for(const m of mods)for(const it of m.items)if(it.k==='inst'){if(!byName.has(it.mod))fail(`Unknown module '${it.mod}'. Is it in this file?`,it.line);used.add(it.mod)}
 let tops=mods.filter(m=>!used.has(m.name));if(topName){const t=byName.get(topName);if(!t)fail(`Module '${topName}' not found`,0);tops=[t]}
 if(!tops.length)fail('No top module: every module is used inside another one',0);
 if(tops.length>1){const tb=tops.find(m=>/^(tb|test)|_tb$|testbench|_test$/i.test(m.name))||tops.find(m=>!m.ports.length);tops=[tb||tops[tops.length-1]]}
 const top=tops[0];sim.top=top.name;
 const stack=[];
 function inst(m,path,pover,parentScope){if(stack.includes(m.name))fail(`Module '${m.name}' contains itself`,m.line);stack.push(m.name);
  const scope={path,sigs:new Map(),params:new Map(),funcs:m.funcs,tasks:m.tasks,mod:m.name,sim};
  for(const p of m.params){let v=p.e;const o=pover&&pover(p.name,m.params.indexOf(p));scope.params.set(p.name,o?o:evalE(v,scope,null))}
  for(const d of m.decls)if(d.kind==='param'){const o=!d.local&&pover&&pover(d.name,-1);scope.params.set(d.name,o?o:evalE(d.e,scope,null))}
  const declared=new Map();
  for(const d of m.decls){if(d.kind==='param')continue;const prev=declared.get(d.name);
   if(prev){if(prev.dir&&!d.dir){if(d.kind==='reg')prev.kind='reg';if(d.range&&!prev.range)prev.range=d.range;if(d.signed)prev.signed=true;continue}if(!prev.dir&&d.dir){prev.dir=d.dir;if(d.range&&!prev.range)prev.range=d.range;if(d.kind==='reg')prev.kind='reg';continue}fail(`'${d.name}' is declared twice`,d.line)}
   declared.set(d.name,Object.assign({},d))}
  for(const pn of m.ports)if(!declared.has(pn))fail(`Port '${pn}' has no input or output declaration`,m.line);
  for(const[n,d]of declared){if(d.dir&&!m.ports.includes(n))fail(`'${n}' is declared as ${d.dir} but is not in the port list of ${m.name}`,d.line);
   let msb=0,lsb=0;if(d.range){msb=constEval(d.range.msb,scope,d.line);lsb=constEval(d.range.lsb,scope,d.line)}const w=Math.abs(msb-lsb)+1;if(w>4096)fail(`'${n}' is too wide (${w} bits)`,d.line);
   const s=new Sig(path+'.'+n,w,msb,lsb,!!d.signed,d.kind==='reg'?'reg':'wire',d.line);s.dir=d.dir;s.local=n;s.integer=!!d.integer;if(d.integer)s.val=X(w);if(d.supply){s.val=d.supply==='supply1'?new V(w,MK(w),0n):num(w,0)}
   if(d.arr){const a=constEval(d.arr.msb,scope,d.line),b=constEval(d.arr.lsb,scope,d.line);const lo=Math.min(a,b),hi=Math.max(a,b);if(hi-lo>65535)fail(`The memory '${n}' is too large`,d.line);s.arr={lo,hi,data:Array.from({length:hi-lo+1},()=>X(w))};s.kind='mem'}
   scope.sigs.set(n,s);sim.addSig(s);if(d.init&&d.kind==='reg'){sim.inits.push({sig:s,e:d.init,scope})}}
  return scope}
 function build(m,path,pover){const scope=inst(m,path,pover);
  for(const it of m.items){
   if(it.k==='assign'){checkLv(it.lv,scope,true);sim.addCont(it.lv,it.e,scope,it.delay,it.line)}
   else if(it.k==='gate'){const ops={and:'&',or:'|',xor:'^',nand:'&',nor:'|',xnor:'^'};let e;if(it.g==='not')e={k:'un',op:'~',a:it.ins[0]};else if(it.g==='buf')e=it.ins[0];else{e=it.ins.reduce((acc,x)=>acc?{k:'bin',op:ops[it.g],a:acc,b:x}:x,null);if(['nand','nor','xnor'].includes(it.g))e={k:'un',op:'~',a:e}}checkLv(it.out,scope,true);sim.addCont(it.out,e,scope,null,it.line)}
   else if(it.k==='always'||it.k==='initial'){checkStmt(it.s,scope);sim.addProc(it.k,it.s,scope,it.line)}
   else if(it.k==='inst'){const cm=byName.get(it.mod);const named=it.conns.some(c=>c.name);if(named&&it.conns.some(c=>!c.name))fail('Connect ports either all by name (.a(x)) or all by position, not both',it.line);
    if(!named&&it.conns.length>cm.ports.length)fail(`${it.mod} has ${cm.ports.length} ports but ${it.conns.length} connections are given`,it.line);
    const pv=(name,idx)=>{if(!it.params)return null;const byN=it.params.find(p=>p.name===name);if(byN)return evalE(byN.e,scope,null);if(idx>=0&&it.params[idx]&&!it.params[idx].name)return evalE(it.params[idx].e,scope,null);return null};
    if(it.params)for(const p of it.params)if(p.name&&!cm.params.some(q=>q.name===p.name)&&!cm.decls.some(d=>d.kind==='param'&&!d.local&&d.name===p.name))fail(`${it.mod} has no parameter '${p.name}'`,it.line);
    const cs=build(cm,path+'.'+it.inst,pv);
    const conns=named?it.conns.map(c=>{if(!cm.ports.includes(c.name))fail(`${it.mod} has no port '${c.name}'. Its ports are: ${cm.ports.join(', ')}`,it.line);return c}):it.conns.map((c,i)=>({name:cm.ports[i],e:c.e}));
    const seen=new Set();for(const c of conns){if(seen.has(c.name))fail(`Port '${c.name}' is connected twice`,it.line);seen.add(c.name);if(!c.e)continue;const ps=cs.sigs.get(c.name);
     if(ps.dir==='input'){sim.addCont({k:'id',name:c.name,line:it.line},c.e,cs,null,it.line,scope)}
     else{checkLv(c.e,scope,true,`port ${c.name} of ${it.inst}`);sim.addCont(c.e,{k:'id',name:c.name,line:it.line},scope,null,it.line,cs)}
     const pw=ps.w,cw=exprWidth(c.e,scope);if(cw&&cw!==pw&&c.e.k!=='num')sim.warn(it.line,`Port ${c.name} of ${it.inst} is ${pw} bit${pw>1?'s':''} wide but is connected to ${cw} bit${cw>1?'s':''}`)}
    for(const pn of cm.ports)if(!seen.has(pn)&&cs.sigs.get(pn).dir==='input')sim.warn(it.line,`Input ${pn} of ${it.inst} is not connected, so it stays z`)}
  }
  stack.pop();return scope}
 function checkLv(lv,scope,cont,where){if(lv.k==='concat'){lv.parts.forEach(p=>checkLv(p,scope,cont,where));return}let b=lv;while(b.k!=='id')b=b.base;const s=scope.sigs.get(b.name);if(!s){if(scope.params.has(b.name))fail(`'${b.name}' is a parameter and cannot be assigned`,lv.line);fail(`'${b.name}' is not declared`,lv.line)}
  if(cont&&s.kind==='reg'&&!s.integer)fail(`'${b.name}' is a reg, so it cannot be driven by ${where||'assign'}. Declare it as wire, or set it inside an always block`,lv.line);
  if(!cont&&s.kind==='wire')fail(`'${b.name}' is a wire, so it cannot be set inside always or initial. Declare it as reg`,lv.line);
  if(s.dir==='input'&&!where)fail(`'${b.name}' is an input and cannot be assigned inside the module`,lv.line)}
 function checkStmt(s,scope){if(!s)return;switch(s.k){case'block':s.body.forEach(x=>{if(x.k==='localdecl'){if(!scope.sigs.has(x.name)){const sg=new Sig(scope.path+'.'+x.name,x.integer?32:1,x.integer?31:0,0,x.integer,'reg',x.line);sg.local=x.name;scope.sigs.set(x.name,sg);sim.addSig(sg)}}else checkStmt(x,scope)});break;case'if':checkStmt(s.t,scope);checkStmt(s.f,scope);break;case'case':s.items.forEach(i=>checkStmt(i.s,scope));break;case'for':checkStmt(s.init,scope);checkStmt(s.step,scope);checkStmt(s.s,scope);break;case'while':case'repeat':case'forever':case'delay':case'event':case'wait':checkStmt(s.s,scope);break;case'bas':case'nba':checkLv(s.lv,scope,false);break;case'task':if(!scope.tasks[s.name])fail(`Unknown task '${s.name}'`,s.line);break}}
 build(top,top.name,null);return top.name}

/* ---------------- expression evaluation ---------------- */
function lookup(scope,name,line){const s=scope.sigs.get(name);if(s)return s;if(scope.params.has(name))return null;if(scope.locals&&scope.locals.has(name))return scope.locals.get(name);if(name.includes('.')){const sim=scope.sim;const full=scope.path+'.'+name;const g=sim.sigByName.get(full);if(g)return g}fail(`'${name}' is not declared`,line)}
function exprWidth(e,scope){switch(e.k){case'num':return e.unsized?32:e.v.w;case'str':return Math.max(8,e.v.length*8);case'id':{if(scope.params.has(e.name))return scope.params.get(e.name).w;const s=scope.locals&&scope.locals.get(e.name)||scope.sigs.get(e.name)||lookupQ(scope,e.name);return s?s.w:32}
 case'bit':{let b=e.base;if(b.k==='id'){const s=scope.sigs.get(b.name)||(scope.locals&&scope.locals.get(b.name));if(s&&s.arr)return s.w}return 1}
 case'part':try{return Math.abs(constEval(e.msb,scope)-constEval(e.lsb,scope))+1}catch(x){return 1}
 case'ipart':try{return constEval(e.width,scope)}catch(x){return 1}
 case'concat':return e.parts.reduce((a,p)=>a+exprWidth(p,scope),0);
 case'repl':try{return constEval(e.n,scope)*e.parts.reduce((a,p)=>a+exprWidth(p,scope),0)}catch(x){return 1}
 case'un':return['!','&','~&','|','~|','^','~^','^~'].includes(e.op)?1:exprWidth(e.a,scope);
 case'bin':return['==','!=','===','!==','<','<=','>','>=','&&','||'].includes(e.op)?1:['<<','>>','<<<','>>>','**'].includes(e.op)?exprWidth(e.a,scope):Math.max(exprWidth(e.a,scope),exprWidth(e.b,scope));
 case'cond':return Math.max(exprWidth(e.a,scope),exprWidth(e.b,scope));
 case'call':{const f=scope.funcs[e.name];if(!f)return 32;if(!f.range)return 1;try{return Math.abs(constEval(f.range.msb,scope)-constEval(f.range.lsb,scope))+1}catch(x){return 32}}
 case'sysf':return e.name==='$time'||e.name==='$realtime'?64:e.name==='$signed'||e.name==='$unsigned'?exprWidth(e.args[0],scope):32;
 case'real':return 32}return 32}
function lookupQ(scope,n){return n.includes('.')?scope.sim.sigByName.get(scope.path+'.'+n):null}
function exprSigned(e,scope){switch(e.k){case'num':return e.v.s;case'id':{if(scope.params.has(e.name))return scope.params.get(e.name).s;const s=scope.locals&&scope.locals.get(e.name)||scope.sigs.get(e.name);return s?s.signed:false}case'bit':{const b=e.base;if(b.k==='id'){const s=scope.sigs.get(b.name);if(s&&s.arr)return s.signed}return false}case'un':return['-','+','~'].includes(e.op)?exprSigned(e.a,scope):false;case'bin':if(['<<','>>','<<<','>>>','**'].includes(e.op))return exprSigned(e.a,scope);if(['==','!=','===','!==','<','<=','>','>=','&&','||'].includes(e.op))return false;return exprSigned(e.a,scope)&&exprSigned(e.b,scope);case'cond':return exprSigned(e.a,scope)&&exprSigned(e.b,scope);case'sysf':return e.name==='$signed'||e.name==='$random';case'call':{const f=scope.funcs[e.name];return f?!!f.signed:false}}return false}
function sigVal(s){return s.val}
function selPos(s,i){return s.msb>=s.lsb?i-s.lsb:s.lsb-i}
function getBits(v,pos,w){if(pos<0||pos+w>v.w){let a=0n,b=0n;for(let k=w-1;k>=0;k--){const p=pos+k;a<<=1n;b<<=1n;if(p<0||p>=v.w){a|=1n;b|=1n}else{a|=(v.a>>BigInt(p))&1n;b|=(v.b>>BigInt(p))&1n}}return new V(w,a,b)}const sh=BigInt(pos);return new V(w,v.a>>sh,v.b>>sh)}
function evalE(e,scope,ctx){const r=ev(e,scope,ctx);return r}
const cx=(r,ctx,cs)=>ctx&&ctx>r.w?ext(r,ctx,!!(r.s&&cs!==false)):r;
function ctxW(e,scope,ctx){const w=exprWidth(e,scope);return ctx&&ctx>w?ctx:w}
function ev(e,scope,ctx,cs){
 switch(e.k){
 case'num':return cx(e.v,ctx,cs);
 case'real':return num(32,Math.round(e.v),true);
 case'str':{let a=0n;for(const ch of e.v)a=(a<<8n)|BigInt(ch.charCodeAt(0)&255);const w=Math.max(8,e.v.length*8);return new V(ctx&&ctx>w?ctx:w,a,0n)}
 case'id':{if(scope.params.has(e.name)){const p=scope.params.get(e.name);return cx(p,ctx,cs)}const s=lookup(scope,e.name,e.line);if(s.arr)fail(`'${e.name}' is a memory. Read one word with ${e.name}[index]`,e.line);const v=s.val;const r=v.s===s.signed?v:new V(v.w,v.a,v.b,s.signed);return cx(r,ctx,cs)}
 case'bit':{const b=e.base;if(b.k==='id'&&!scope.params.has(b.name)){const s=lookup(scope,b.name,b.line);const iv=ev(e.i,scope,null);if(s.arr){if(!known(iv))return X(s.w);const i=Number(sval(iv));const d=s.arr.data[i-s.arr.lo];const r=d?d:X(s.w);return cx(new V(r.w,r.a,r.b,s.signed),ctx,cs)}if(!known(iv))return X(1);return getBits(s.val,selPos(s,Number(sval(iv))),1)}
  const bv=ev(b,scope,null);const iv=ev(e.i,scope,null);if(!known(iv))return X(1);return getBits(bv,Number(sval(iv)),1)}
 case'part':{const b=e.base;const m=constEval(e.msb,scope,e.line),l=constEval(e.lsb,scope,e.line);if(b.k==='id'&&!scope.params.has(b.name)){const s=lookup(scope,b.name,b.line);if(s.arr)fail('A part select cannot be used on a whole memory',e.line);const w=Math.abs(m-l)+1;if((s.msb>=s.lsb)!==(m>=l)&&w>1)fail(`The range [${m}:${l}] is reversed compared with the declaration [${s.msb}:${s.lsb}] of ${b.name}`,e.line);return getBits(s.val,Math.min(selPos(s,m),selPos(s,l)),w)}const bv=ev(b,scope,null);return getBits(bv,Math.min(m,l),Math.abs(m-l)+1)}
 case'ipart':{const b=e.base;const w=constEval(e.width,scope,e.line);const st=ev(e.start,scope,null);if(!known(st))return X(w);const s0=Number(sval(st));const lo=e.up?s0:s0-w+1;if(b.k==='id'&&!scope.params.has(b.name)){const s=lookup(scope,b.name,b.line);const hi=lo+w-1;return getBits(s.val,Math.min(selPos(s,lo),selPos(s,hi)),w)}return getBits(ev(b,scope,null),lo,w)}
 case'concat':{let a=0n,b=0n,w=0;for(const p of e.parts){if(p.k==='num'&&p.unsized)fail(`A number inside { } needs a size, for example 4'd${p.v.a} instead of ${p.v.a}`,p.line);const v=ev(p,scope,null);a=(a<<BigInt(v.w))|v.a;b=(b<<BigInt(v.w))|v.b;w+=v.w}const r=new V(w,a,b);return ctx&&ctx>w?ext(r,ctx,false):r}
 case'repl':{const n=constEval(e.n,scope,e.line);if(n<0||n>4096)fail('The repeat count is out of range',e.line);let a=0n,b=0n,w=0;const vs=e.parts.map(p=>ev(p,scope,null));for(let i=0;i<n;i++)for(const v of vs){a=(a<<BigInt(v.w))|v.a;b=(b<<BigInt(v.w))|v.b;w+=v.w}if(!w)return new V(1,0n,0n);const r=new V(w,a,b);return ctx&&ctx>w?ext(r,ctx,false):r}
 case'un':{switch(e.op){
  case'!':{const t=truth(ev(e.a,scope,null));return bitV(t<0?-1:t?0:1)}
  case'~':{const w=ctxW(e.a,scope,ctx);const sg=exprSigned(e.a,scope)&&cs!==false;return vNot(ext(ev(e.a,scope,w,sg),w,sg))}
  case'-':{const w=ctxW(e.a,scope,ctx);const sg=exprSigned(e.a,scope)&&cs!==false;const v=ext(ev(e.a,scope,w,sg),w,sg);if(!known(v))return X(w);return new V(w,-v.a,0n,sg)}
  case'+':return ev(e.a,scope,ctx,cs);
  default:{const v=ev(e.a,scope,null);let r;const op=e.op.replace('^~','~^');const base=op.replace('~','');if(base==='&')r=v.b?(k0(v)?0:-1):(v.a===MK(v.w)?1:0);else if(base==='|')r=k1(v)?1:(v.b?-1:0);else{if(v.b)r=-1;else{let c=0;let a=v.a;while(a){c^=Number(a&1n);a>>=1n}r=c}}if(op[0]==='~'&&r>=0)r=1-r;return bitV(r)}}}
 case'bin':{const op=e.op;
  if(op==='&&'||op==='||'){const x=truth(ev(e.a,scope,null));if(op==='&&'&&x===0)return bitV(0);if(op==='||'&&x===1)return bitV(1);const y=truth(ev(e.b,scope,null));if(op==='&&')return bitV(x===1&&y===1?1:(y===0?0:-1));return bitV(x===1||y===1?1:(x===0&&y===0?0:-1))}
  if(['==','!=','===','!==','<','<=','>','>='].includes(op)){const w=Math.max(exprWidth(e.a,scope),exprWidth(e.b,scope));const sg=exprSigned(e.a,scope)&&exprSigned(e.b,scope);const x=ext(ev(e.a,scope,w,sg),w,sg),y=ext(ev(e.b,scope,w,sg),w,sg);
   if(op==='===')return bitV(x.a===y.a&&x.b===y.b?1:0);if(op==='!==')return bitV(x.a===y.a&&x.b===y.b?0:1);
   if(op==='=='||op==='!='){const diffKnown=((x.a^y.a)&~x.b&~y.b);if(diffKnown)return bitV(op==='=='?0:1);if(x.b||y.b)return X(1);return bitV(op==='=='?1:0)}
   if(!known(x)||!known(y))return X(1);const p=sg?sval(x):x.a,q=sg?sval(y):y.a;const r=op==='<'?p<q:op==='<='?p<=q:op==='>'?p>q:p>=q;return bitV(r?1:0)}
  if(['<<','>>','<<<','>>>'].includes(op)){const w=ctxW(e.a,scope,ctx);const sga=exprSigned(e.a,scope)&&cs!==false;const v=ext(ev(e.a,scope,w,sga),w,sga);const n=ev(e.b,scope,null);if(!known(n))return X(w);const k=n.a;if(k>=BigInt(w)){if(op==='>>>'&&v.s){const sa=(v.a>>BigInt(w-1))&1n,sb=(v.b>>BigInt(w-1))&1n;return new V(w,sa?MK(w):0n,sb?MK(w):0n,v.s)}return new V(w,0n,0n,v.s)}
   if(op==='<<'||op==='<<<')return new V(w,v.a<<k,v.b<<k,v.s);if(op==='>>>'&&v.s){const x=ext(new V(v.w,v.a,v.b,true),w,true);const sa=BigInt.asIntN(w,x.a)>>k;const sb=(x.b>>k)|(((x.b>>BigInt(w-1))&1n)?(MK(w)^(MK(w)>>k)):0n);return new V(w,sa,sb,true)}return new V(w,v.a>>k,v.b>>k,v.s)}
  const w=Math.max(exprWidth(e.a,scope),exprWidth(e.b,scope),ctx||0);const sg=exprSigned(e.a,scope)&&exprSigned(e.b,scope)&&cs!==false;
  if(op==='**'){const x=ext(ev(e.a,scope,w,sg),w,sg),y=ev(e.b,scope,null);if(!known(x)||!known(y))return X(w);const p=sg?sval(x):x.a,q=y.s?sval(y):y.a;if(q<0n)return num(w,p===1n?1:0,sg);return new V(w,p**q,0n,sg)}
  const x=ext(ev(e.a,scope,w,sg),w,sg),y=ext(ev(e.b,scope,w,sg),w,sg);
  switch(op){case'&':return vAnd(x,y,w);case'|':return vOr(x,y,w);case'^':{const r=vXor(x,y,w);r.s=sg;return r}case'~^':case'^~':return vNot(vXor(x,y,w))}
  if(!known(x)||!known(y))return X(w);const p=sg?sval(x):x.a,q=sg?sval(y):y.a;let r;
  switch(op){case'+':r=p+q;break;case'-':r=p-q;break;case'*':r=p*q;break;case'/':if(q===0n)return X(w);r=p/q;break;case'%':if(q===0n)return X(w);r=p%q;break}
  return new V(w,BigInt.asUintN(w,r),0n,sg)}
 case'cond':{const t=truth(ev(e.c,scope,null));const w=Math.max(exprWidth(e.a,scope),exprWidth(e.b,scope),ctx||0);const sg=exprSigned(e.a,scope)&&exprSigned(e.b,scope)&&cs!==false;if(t===1)return ext(ev(e.a,scope,w,sg),w,sg);if(t===0)return ext(ev(e.b,scope,w,sg),w,sg);const a=ext(ev(e.a,scope,w,sg),w,sg),b=ext(ev(e.b,scope,w,sg),w,sg);const same=~((a.a^b.a)|(a.b^b.b))&MK(w);const u=MK(w)&~same;return new V(w,(a.a&same)|u,(a.b&same)|u)}
 case'sysf':return sysFunc(e,scope,ctx,cs);
 case'call':return callFunc(e,scope,ctx);
 }
 fail('This expression is not supported',e.line)}
function sysFunc(e,scope,ctx,cs){const sim=scope.sim;switch(e.name){
 case'$time':case'$stime':case'$realtime':return num(64,sim.t);
 case'$random':{const v=sim.rand();return cx(num(32,v,true),ctx,cs)}
 case'$urandom':return num(32,sim.rand()>>>0);
 case'$signed':{const v=ev(e.args[0],scope,null);return cx(new V(v.w,v.a,v.b,true),ctx,cs)}
 case'$unsigned':{const v=ev(e.args[0],scope,null);return new V(v.w,v.a,v.b,false)}
 case'$clog2':{const v=ev(e.args[0],scope,null);let n=0,x=v.a-1n;while(x>0n){n++;x>>=1n}return num(32,n,true)}
 case'$bits':return num(32,exprWidth(e.args[0],scope),true);
 case'$feof':return num(1,1);
 }fail(`${e.name} is not supported`,e.line)}
function callFunc(e,scope,ctx){const f=scope.funcs[e.name];if(!f)fail(`Unknown function '${e.name}'`,e.line);if(e.args.length!==f.args.length)fail(`${e.name}() takes ${f.args.length} input${f.args.length===1?'':'s'} but got ${e.args.length}`,e.line);
 const sim=scope.sim;if(++sim.fdepth>200){sim.fdepth=0;fail(`${e.name}() calls itself too deeply`,e.line)}
 const loc=new Map();const mk=(n,r,sg)=>{let msb=0,lsb=0;if(r){msb=constEval(r.msb,scope);lsb=constEval(r.lsb,scope)}const s=new Sig(n,Math.abs(msb-lsb)+1,msb,lsb,!!sg,'reg');s.temp=true;loc.set(n,s);return s};
 const ret=mk(e.name,f.range,f.signed);f.args.forEach((a,i)=>{const s=mk(a.name,a.range,a.signed);s.val=ext(ev(e.args[i],scope,s.w),s.w,s.signed)});for(const d of f.decls)mk(d.name,d.range,d.signed);
 const fs=Object.assign({},scope,{sigs:new Map([...scope.sigs,...loc]),locals:loc});
 const g=sim.execStmt(f.body,fs,true);let r=g.next();let guard=0;while(!r.done){if(++guard>1)fail(`Function ${e.name} cannot wait or use delays`,e.line);r=g.next()}sim.fdepth--;
 const v=ret.val;return ctx&&ctx>v.w?ext(v,ctx):v}

/* ---------------- simulator ---------------- */
const F32=new Float32Array(1),F32U=new Uint32Array(F32.buffer);
class Sim{
 constructor(){this.inactive=[];this.sigs=[];this.sigByName=new Map();this.t=0;this.queue=new Map();this.times=[];this.active=[];this.nba=[];this.out='';this.warns=[];this.finished=false;this.monitor=null;this.strobes=[];this.seed=0;this.inits=[];this.procs=[];this.events=0;this.fdepth=0;this.limit=100000;this.warned=new Set()}
 addSig(s){this.sigs.push(s);this.sigByName.set(s.name,s)}
 warn(line,msg){if(this.warns.some(w=>w.msg===msg))return;this.warns.push({line,msg})}
 warnOnce(line,msg){const k=line+msg;if(this.warned.has(k))return;this.warned.add(k);this.warn(line,msg)}
 rand(){/* IEEE 1364 rtl_dist_uniform, same sequence as other simulators */let seed=this.seed|0;if(seed===0)seed=259341593;seed=(Math.imul(69069,seed)+1)|0;this.seed=seed;F32U[0]=((seed>>>9)|0x3f800000)>>>0;let c=F32[0];c=c+(c*0.00000011920928955078125);const a=-2147483648,b=2147483647;c=((b-a)*(c-1.0))+a;let r=(c+2147483648.0)/4294967295.0;r=r*4294967296.0-2147483648.0;let i=r>=0?Math.trunc(r):Math.trunc(r-1);return i|0}
 at(t,item,kind){if(!this.queue.has(t)){this.queue.set(t,{active:[],nba:[]});let i=this.times.length;while(i>0&&this.times[i-1]>t)i--;this.times.splice(i,0,t)}this.queue.get(t)[kind||'active'].push(item)}
 /* continuous assignments */
 addCont(lv,e,scope,delay,line,rhsScope){const rs=rhsScope||scope;const reads=new Set();collectReads(e,rs,reads);const c={lv,e,scope,rs,delay,line,idx:0,pending:false,val:null};
  const target=lvBaseSig(lv,scope);if(target){if(!target.drivers)target.drivers=[];c.idx=target.drivers.length;target.drivers.push(null);c.target=target}
  for(const s of reads)s.conts.push(c);this.procs.push({cont:c});c.run=()=>{c.pending=false;let v;try{v=ev(e,rs,lvWidth(lv,scope))}catch(err){throw err}if(delay){const d=Number(sval(ev(delay,scope,null)));this.at(this.t+d,()=>this.contWrite(c,v))}else this.contWrite(c,v)};
  this.active.push(c.run)}
 contWrite(c,v){const lv=c.lv;if(c.target&&c.target.drivers.length>1&&lv.k==='id'){const s=c.target;s.drivers[c.idx]=ext(v,s.w,false);let r=null;for(const d of s.drivers){if(!d)continue;r=r?resolve(r,d):d}this.setSig(s,r||Z(s.w));return}
  if(c.target&&c.target.drivers.length>1&&lv.k!=='id'){this.writeLv(lv,v,c.scope,'cont');return}
  this.writeLv(lv,v,c.scope,'cont')}
 /* processes */
 addProc(kind,stmt,scope,line){const self=this;const p={kind,line,scope,name:`${kind} (line ${line})`};
  if(kind==='initial'){p.gen=this.execStmt(stmt,scope,false)}
  else{let body=stmt;if(stmt.k==='event'&&stmt.ev.k==='star'){const reads=new Set();collectStmtReads(stmt.s,scope,reads);p.star=reads;body=stmt}
   p.gen=(function*(){let spin=0;for(;;){const y0=p.y;yield* self.execStmt(body,scope,false);if(p.y===y0){if(++spin>1000)throw new VErr(`This always block runs forever without waiting. Add @(posedge clk), @(*) or a # delay`,line)}else spin=0}})()}
  p.y=0;this.procs.push(p);this.active.push(()=>this.resume(p))}
 resume(p,val){if(p.done)return;this.cur=p;let r;try{r=p.gen.next(val)}catch(e){this.cur=null;throw e}this.cur=null;if(r.done){p.done=true;return}p.y++;const w=r.value;
  if(w.delay!=null){if(w.delay===0)this.inactive.push(()=>this.resume(p));else this.at(this.t+w.delay,()=>this.resume(p))}
  else if(w.ev){p.waited=true;p.ev=w.ev;for(const it of w.ev)it.sig.waiters.add(p)}
  else if(w.wait){p.waited=true;p.waitFor=w;for(const s of w.sigs)s.waiters.add(p)}}
 *execStmt(s,scope,inFunc){
  switch(s.k){
  case'nop':case'localdecl':case'disable':return;
  case'block':for(const x of s.body)yield* this.execStmt(x,scope,inFunc);return;
  case'if':{const t=truth(ev(s.c,scope,null));if(t===1)yield* this.execStmt(s.t,scope,inFunc);else if(s.f)yield* this.execStmt(s.f,scope,inFunc);return}
  case'case':{const items=s.items;const w=Math.max(exprWidth(s.e,scope),...items.filter(i=>!i.def).flatMap(i=>i.vals.map(v=>exprWidth(v,scope))));const v=ev(s.e,scope,w);let hit=null;
   outer:for(const it of items){if(it.def)continue;for(const ce of it.vals){const c=ev(ce,scope,w);if(caseMatch(s.kind,ext(v,w,false),ext(c,w,false))){hit=it;break outer}}}
   if(!hit)hit=items.find(i=>i.def);if(hit)yield* this.execStmt(hit.s,scope,inFunc);return}
  case'for':{yield* this.execStmt(s.init,scope,inFunc);let n=0;while(truth(ev(s.c,scope,null))===1){if(++n>1000000)throw new VErr('This for loop runs more than a million times. Check its condition',s.line);yield* this.execStmt(s.s,scope,inFunc);yield* this.execStmt(s.step,scope,inFunc)}return}
  case'while':{let n=0;while(truth(ev(s.c,scope,null))===1){if(++n>1000000)throw new VErr('This while loop runs more than a million times without stopping',s.line);yield* this.execStmt(s.s,scope,inFunc)}return}
  case'repeat':{const v=ev(s.c,scope,null);const n=known(v)?Number(sval(v)):0;for(let i=0;i<n;i++)yield* this.execStmt(s.s,scope,inFunc);return}
  case'forever':{const p=this.cur;for(;;){const y0=p?p.y:0;yield* this.execStmt(s.s,scope,inFunc);if(p&&p.y===y0)throw new VErr('forever loops without waiting. Put a # delay or @(...) inside it',s.line)}}
  case'delay':{if(inFunc)throw new VErr('Delays cannot be used inside a function',s.line);const v=ev(s.d,scope,null);const d=known(v)?Number(sval(v)):0;if(d<0)throw new VErr('A delay cannot be negative',s.line);yield{delay:d};yield* this.execStmt(s.s,scope,inFunc);return}
  case'event':{if(inFunc)throw new VErr('Events cannot be used inside a function',s.line);let list;if(s.ev.k==='star'){const reads=new Set();collectStmtReads(s.s,scope,reads);list=[...reads].map(sig=>({sig,edge:null}));if(!list.length)throw new VErr('always @(*) reads no signals, so it never runs',s.line)}else list=s.ev.list.map(it=>{const reads=new Set();collectReads(it.e,scope,reads);if(!reads.size)throw new VErr('The event list has no signal',s.line);if(it.edge&&it.e.k!=='id'&&it.e.k!=='bit')throw new VErr('posedge and negedge need a signal name',s.line);return[...reads].map(sig=>({sig,edge:it.edge,e:it.e}))}).flat();
   for(const it of list)it.old=it.sig.val;yield{ev:list};yield* this.execStmt(s.s,scope,inFunc);return}
  case'wait':{if(truth(ev(s.c,scope,null))!==1){const reads=new Set();collectReads(s.c,scope,reads);do{yield{wait:true,sigs:[...reads]}}while(truth(ev(s.c,scope,null))!==1)}yield* this.execStmt(s.s,scope,inFunc);return}
  case'bas':{let v;if(s.d){const val=ev(s.e,scope,lvWidth(s.lv,scope));const d=Number(sval(ev(s.d,scope,null)));yield{delay:d};this.writeLv(s.lv,val,scope,'bas');return}if(s.ev){const val=ev(s.e,scope,lvWidth(s.lv,scope));yield* this.execStmt({k:'event',ev:s.ev,s:{k:'nop'},line:s.line},scope,inFunc);this.writeLv(s.lv,val,scope,'bas');return}
   v=ev(s.e,scope,lvWidth(s.lv,scope));this.writeLv(s.lv,v,scope,'bas');return}
  case'nba':{if(inFunc)throw new VErr('Use = inside functions, not <=',s.line);const v=ev(s.e,scope,lvWidth(s.lv,scope));const tgt=resolveLv(s.lv,scope);const d=s.d?Number(sval(ev(s.d,scope,null))):0;const job=()=>this.writeResolved(tgt,v,scope);if(d>0)this.at(this.t+d,job,'nba');else this.nba.push(job);return}
  case'sys':yield* this.sysTask(s,scope);return;
  case'task':{const tk=scope.tasks[s.name];if(!tk)throw new VErr(`Unknown task '${s.name}'`,s.line);if(s.args.length!==tk.args.length)throw new VErr(`Task ${s.name} takes ${tk.args.length} argument${tk.args.length===1?'':'s'}`,s.line);
   const loc=new Map();const mk=(n,r,sg)=>{let msb=0,lsb=0;if(r){msb=constEval(r.msb,scope);lsb=constEval(r.lsb,scope)}const g=new Sig(n,Math.abs(msb-lsb)+1,msb,lsb,!!sg,'reg');g.temp=true;loc.set(n,g);return g};
   tk.args.forEach((a,i)=>{const g=mk(a.name,a.range);if(a.dir==='input')g.val=ext(ev(s.args[i],scope,g.w),g.w)});for(const d of tk.decls)mk(d.name,d.range,d.signed);
   const ts=Object.assign({},scope,{sigs:new Map([...scope.sigs,...loc]),locals:loc});yield* this.execStmt(tk.body,ts,inFunc);
   tk.args.forEach((a,i)=>{if(a.dir==='output')this.writeLv(s.args[i],loc.get(a.name).val,scope,'bas')});return}
  }
  throw new VErr('This statement is not supported',s.line)}
 *sysTask(s,scope){const n=s.name;switch(n){
  case'$display':case'$displayb':case'$displayh':case'$write':this.print(this.format(s.args,scope,n.endsWith('b')?'b':n.endsWith('h')?'h':'d')+(n==='$write'?'':'\n'));return;
  case'$strobe':{const args=s.args;this.strobes.push(()=>this.print(this.format(args,scope,'d')+'\n'));return}
  case'$monitor':{this.monitor={args:s.args,scope,last:null};return}
  case'$monitoron':case'$monitoroff':return;
  case'$finish':case'$stop':this.finished=true;this.finishMsg=`${n} at time ${this.t}`;yield{delay:0};return;
  case'$dumpfile':case'$dumpvars':case'$dumpon':case'$dumpoff':case'$timeformat':case'$printtimescale':case'$dumpall':case'$dumpflush':return;
  case'$readmemh':case'$readmemb':throw new VErr(`${n} reads a file, which this simulator cannot do. Fill the memory in an initial block instead`,s.line);
  case'$error':case'$fatal':case'$warning':case'$info':this.print((n==='$info'?'':n.slice(1).toUpperCase()+': ')+this.format(s.args.slice(n==='$fatal'&&s.args.length>1?1:0),scope,'d')+'\n');if(n==='$fatal'){this.finished=true;this.finishMsg='$fatal'}return;
  case'$random':return;
  }throw new VErr(`${n} is not supported`,s.line)}
 print(t){this.out+=t;if(this.out.length>400000)this.out=this.out.slice(-300000)}
 format(args,scope,def){if(!args.length)return'';let i=0,out='';const nextVal=()=>{const a=args[i++];if(!a||a.k==='empty')return null;return a};
  if(args[0].k!=='str'){while(i<args.length){const a=nextVal();if(!a){out+=' ';continue}const v=ev(a,scope,null);out+=fmtVal(v,def,null,exprSigned(a,scope))}return out}
  while(i<args.length){const a=args[i++];if(a.k==='str'){const f=a.v;let j=0;while(j<f.length){const c=f[j];if(c!=='%'){out+=c;j++;continue}const m=f.slice(j).match(/^%(-?)(\d*)([bBoOdDhHxXtTsScCmMeEfFgGlLvVuUzZ%])/);if(!m){out+=c;j++;continue}j+=m[0].length;const k=m[3].toLowerCase();if(k==='%'){out+='%';continue}if(k==='m'){out+=scope.path;continue}const e=nextVal();if(!e){out+='<missing>';continue}
    if(k==='s'){const v=e.k==='str'?null:ev(e,scope,null);let str=e.k==='str'?e.v:'';if(v){for(let b=Math.ceil(v.w/8)-1;b>=0;b--){const ch=Number((v.a>>BigInt(b*8))&255n);if(ch)str+=String.fromCharCode(ch)}}const wd=m[2]?parseInt(m[2]):0;out+=m[1]?str.padEnd(wd):str.padStart(wd);continue}
    const v=ev(e,scope,null);if(k==='c'){out+=String.fromCharCode(Number(v.a&255n));continue}if(k==='t'){out+=fmtDec(v).padStart(m[2]===''?20:parseInt(m[2]));continue}
    const zero=m[2]==='0';let s=fmtVal(v,k==='x'?'h':k,zero?0:(m[2]?parseInt(m[2]):null),exprSigned(e,scope)||v.s);if(m[2].length>1&&m[2][0]==='0'&&!m[1]){s=s.trim();const neg=s[0]==='-';s=(neg?'-':'')+(neg?s.slice(1):s).padStart(parseInt(m[2])-(neg?1:0),'0')}out+=m[1]?s.trim().padEnd(m[2]?parseInt(m[2]):0):s}}
   else{const v=ev(a,scope,null);out+=fmtVal(v,def,null,exprSigned(a,scope))}}
  return out}
 checkMonitor(){const m=this.monitor;if(!m)return;const vals=m.args.filter(a=>a.k!=='str'&&!(a.k==='sysf'&&a.name==='$time')).map(a=>{const v=ev(a,m.scope,null);return v.a+':'+v.b}).join(',');if(vals!==m.last){m.last=vals;this.print(this.format(m.args,m.scope,'d')+'\n')}}
 /* writing values */
 writeLv(lv,v,scope,kind){this.writeResolved(resolveLv(lv,scope,this),v,scope)}
 writeResolved(t,v,scope){if(t.parts){let off=0;const total=t.parts.reduce((a,p)=>a+p.w,0);const vv=ext(v,total,false);for(let i=t.parts.length-1;i>=0;i--){const p=t.parts[i];this.writeResolved(p,getBits(vv,off,p.w),scope);off+=p.w}return}
  const s=t.sig;if(t.mem!=null){if(t.mem<0)return;const old=s.arr.data[t.mem];let nv=ext(v,s.w,false);if(t.pos!=null){nv=splice(old,t.pos,t.w,v)}s.arr.data[t.mem]=nv;s.arr.ver=(s.arr.ver||0)+1;this.memChanged(s,t.mem);return}
  if(t.pos!=null){if(t.pos===-999)return;this.setSig(s,splice(s.val,t.pos,t.w,v));return}
  this.setSig(s,ext(v,s.w,false))}
 memChanged(s,i){for(const c of s.conts)this.schedCont(c);for(const p of[...s.waiters])this.wake(p,s,null,null)}
 setSig(s,nv){const old=s.val;nv=new V(s.w,nv.a,nv.b,s.signed);if(old.a===nv.a&&old.b===nv.b)return;s.val=nv;if(!s.temp){this.events++;s.wave.push([this.t,nv.a,nv.b]);if(s.wave.length>200000)s.wave.splice(0,50000)}
  for(const c of s.conts)this.schedCont(c);
  if(s.waiters.size)for(const p of[...s.waiters])this.wake(p,s,old,nv)}
 schedCont(c){if(c.pending)return;c.pending=true;this.active.push(c.run)}
 wake(p,s,old,nv){if(p.waitFor){for(const g of p.waitFor.sigs)g.waiters.delete(p);p.waitFor=null;this.active.push(()=>this.resume(p));return}
  if(!p.ev)return;let hit=false;for(const it of p.ev){if(it.sig!==s)continue;if(!it.edge){if(old===null||it.e&&it.e.k==='bit'){hit=true;break}hit=true;break}let o,n;if(it.e&&it.e.k==='bit'){try{o=getBits(old,0,1);n=getBits(nv,0,1);const iv=ev(it.e.i,p.scope,null);const pos=selPos(s,Number(sval(iv)));o=getBits(old,pos,1);n=getBits(nv,pos,1)}catch(e){continue}}else{o=getBits(old,0,1);n=getBits(nv,0,1)}const ov=o.b?2:Number(o.a),nn=n.b?2:Number(n.a);if(it.edge==='pos'&&((ov===0&&nn!==0)||(ov===2&&nn===1))){hit=true;break}if(it.edge==='neg'&&((ov===1&&nn!==1)||(ov===2&&nn===0))){hit=true;break}}
  if(!hit)return;for(const it of p.ev)it.sig.waiters.delete(p);p.ev=null;this.active.push(()=>this.resume(p))}
 /* main loop */
 start(){for(const it of this.inits){it.sig.val=ext(ev(it.e,it.scope,it.sig.w),it.sig.w,false);it.sig.wave.push([0,it.sig.val.a,it.sig.val.b])}for(const s of this.sigs)if(!s.wave.length&&!s.arr)s.wave.push([0,s.val.a,s.val.b])}
 run(maxTime,budgetMs){const t0=Date.now();const lim=maxTime!=null?maxTime:this.limit;let steps=0;
  while(!this.finished){
   let spins=0;
   while(this.active.length||this.nba.length||this.inactive.length){while(this.active.length){const f=this.active.shift();f();if(++steps>5e6)throw new VErr('The simulation does too much work in one time step. A loop without a delay may be running forever',0);if(this.finished)break}
    if(this.finished)break;if(this.inactive.length){this.active=this.inactive;this.inactive=[];continue}if(this.nba.length){const n=this.nba;this.nba=[];for(const j of n)j()}if(++spins>200000)throw new VErr(`Signals keep changing at time ${this.t} without settling. There may be a combinational loop (for example assign a = ~a)`,0)}
   for(const f of this.strobes)f();this.strobes=[];this.checkMonitor();
   if(this.finished)break;
   if(!this.times.length){this.idle=true;break}
   const nt=this.times[0];if(nt>lim){this.hitLimit=true;break}
   this.times.shift();const q=this.queue.get(nt);this.queue.delete(nt);this.t=nt;this.active.push(...q.active);this.nba.push(...q.nba);
   if(budgetMs&&Date.now()-t0>budgetMs){this.paused=true;break}}
  return this}
}
function resolve(a,b){const w=a.w;let ra=0n,rb=0n;for(let i=0;i<w;i++){const I=BigInt(i);const az=((a.b>>I)&1n)&&!((a.a>>I)&1n),bz=((b.b>>I)&1n)&&!((b.a>>I)&1n);let r;if(az)r=[(b.a>>I)&1n,(b.b>>I)&1n];else if(bz)r=[(a.a>>I)&1n,(a.b>>I)&1n];else if(((a.a^b.a)>>I)&1n||((a.b|b.b)>>I)&1n)r=[1n,1n];else r=[(a.a>>I)&1n,0n];ra|=r[0]<<I;rb|=r[1]<<I}return new V(w,ra,rb)}
function splice(old,pos,w,v){if(pos<0)return old;const m=(MK(w)<<BigInt(pos))&MK(old.w);const vv=ext(v,w,false);return new V(old.w,(old.a&~m)|((vv.a<<BigInt(pos))&m),(old.b&~m)|((vv.b<<BigInt(pos))&m),old.s)}
function caseMatch(kind,v,c){if(kind==='case')return v.a===c.a&&v.b===c.b;const zv=v.b&~v.a,zc=c.b&~c.a;let care=MK(v.w);if(kind==='casez')care&=~(zv|zc);else care&=~(v.b|c.b);return((v.a^c.a)&care)===0n&&((v.b^c.b)&care)===0n}
function lvBaseSig(lv,scope){if(lv.k==='concat')return null;let b=lv;while(b.k!=='id')b=b.base;return scope.sigs.get(b.name)}
function lvWidth(lv,scope){if(lv.k==='concat')return lv.parts.reduce((a,p)=>a+lvWidth(p,scope),0);return exprWidth(lv,scope)}
function resolveLv(lv,scope,sim){if(lv.k==='concat')return{parts:lv.parts.map(p=>resolveLv(p,scope,sim)),w:lvWidth(lv,scope)};
 if(lv.k==='id'){const s=lookup(scope,lv.name,lv.line);if(s.arr)throw new VErr(`'${lv.name}' is a memory. Write one word with ${lv.name}[index]`,lv.line);return{sig:s,w:s.w}}
 const b=lv.base;if(b.k==='id'){const s=lookup(scope,b.name,b.line);
  if(s.arr&&lv.k==='bit'){const iv=ev(lv.i,scope,null);if(!known(iv)){return{sig:s,mem:-1,w:s.w}}const i=Number(sval(iv));if(i<s.arr.lo||i>s.arr.hi){if(sim)sim.warn(lv.line,`Index ${i} is outside the memory ${b.name} [${s.arr.lo}:${s.arr.hi}]`);return{sig:s,mem:-1,w:s.w}}return{sig:s,mem:i-s.arr.lo,w:s.w}}
  if(lv.k==='bit'){const iv=ev(lv.i,scope,null);if(!known(iv))return{sig:s,pos:-999,w:1};const i=Number(sval(iv));const pos=selPos(s,i);if(pos<0||pos>=s.w)return{sig:s,pos:-999,w:1};return{sig:s,pos,w:1}}
  if(lv.k==='part'){const m=constEval(lv.msb,scope,lv.line),l=constEval(lv.lsb,scope,lv.line);return{sig:s,pos:Math.min(selPos(s,m),selPos(s,l)),w:Math.abs(m-l)+1}}
  if(lv.k==='ipart'){const w=constEval(lv.width,scope,lv.line);const st=ev(lv.start,scope,null);if(!known(st))return{sig:s,pos:-999,w};const s0=Number(sval(st));const lo=lv.up?s0:s0-w+1;return{sig:s,pos:Math.min(selPos(s,lo),selPos(s,lo+w-1)),w}}}
 if(b.k==='bit'&&b.base.k==='id'){const s=lookup(scope,b.base.name,b.line);if(s.arr){const iv=ev(b.i,scope,null);const i=Number(sval(iv))-s.arr.lo;if(lv.k==='bit'){const bi=Number(sval(ev(lv.i,scope,null)));return{sig:s,mem:i,pos:selPos(s,bi),w:1}}if(lv.k==='part'){const m=constEval(lv.msb,scope),l=constEval(lv.lsb,scope);return{sig:s,mem:i,pos:Math.min(selPos(s,m),selPos(s,l)),w:Math.abs(m-l)+1}}}}
 throw new VErr('This cannot be assigned',lv.line)}
function collectReads(e,scope,out){if(!e)return;switch(e.k){case'id':{if(scope.params.has(e.name))return;const s=scope.locals&&scope.locals.get(e.name)||scope.sigs.get(e.name)||lookupQ(scope,e.name);if(!s)fail(`'${e.name}' is not declared`,e.line);if(!s.temp)out.add(s);return}
 case'bit':case'part':case'ipart':{collectReads(e.base,scope,out);if(e.i)collectReads(e.i,scope,out);if(e.start)collectReads(e.start,scope,out);return}
 case'concat':e.parts.forEach(p=>collectReads(p,scope,out));return;case'repl':e.parts.forEach(p=>collectReads(p,scope,out));return;
 case'un':collectReads(e.a,scope,out);return;case'bin':collectReads(e.a,scope,out);collectReads(e.b,scope,out);return;case'cond':collectReads(e.c,scope,out);collectReads(e.a,scope,out);collectReads(e.b,scope,out);return;
 case'call':{e.args.forEach(a=>collectReads(a,scope,out));const f=scope.funcs[e.name];if(!f)fail(`Unknown function '${e.name}'`,e.line);return}
 case'sysf':e.args.forEach(a=>collectReads(a,scope,out));return}}
function collectStmtReads(s,scope,out,writes){if(!s)return;switch(s.k){case'block':s.body.forEach(x=>collectStmtReads(x,scope,out));return;case'if':collectReads(s.c,scope,out);collectStmtReads(s.t,scope,out);collectStmtReads(s.f,scope,out);return;case'case':collectReads(s.e,scope,out);s.items.forEach(i=>{(i.vals||[]).forEach(v=>collectReads(v,scope,out));collectStmtReads(i.s,scope,out)});return;
 case'for':collectStmtReads(s.init,scope,out);collectReads(s.c,scope,out);collectStmtReads(s.s,scope,out);return;case'while':case'repeat':collectReads(s.c,scope,out);collectStmtReads(s.s,scope,out);return;
 case'bas':case'nba':collectReads(s.e,scope,out);if(s.lv.k!=='id'&&s.lv.k!=='concat'){if(s.lv.i)collectReads(s.lv.i,scope,out)}return;case'task':s.args.forEach(a=>collectReads(a,scope,out));return;case'sys':return}}
function fmtVal(v,k,width,signed){let s;switch(k){case'b':s=fmtBits(v);break;case'o':{let r='';for(let i=Math.ceil(v.w/3)-1;i>=0;i--){const g=getBits(v,i*3,3);r+=g.b?(g.b===7n?(g.a===7n?'x':g.a===0n?'z':'X'):((g.a&g.b)?'X':'Z')):Number(g.a).toString(8)}s=r;break}case'h':s=fmtHex(v);break;default:{s=fmtDec(v,signed);if(width==null){const max=signed?(1n<<BigInt(v.w-1)).toString().length+1:MK(v.w).toString().length;return s.padStart(max)}}}
 if(width===0){if(k==='b'||k==='h'||k==='o'){s=s.replace(/^0+(?=.)/,'')}return s}if(width)return s.padStart(width);return s}

/* ---------------- public API ---------------- */
function compile(src,top){try{const toks=lex(String(src));const mods=new Parser(toks).source();if(!mods.length)fail('The file has no module',1);const sim=new Sim();elaborate(mods,top,sim);return{ok:true,sim,mods:mods.map(m=>({name:m.name,ports:m.ports,line:m.line})),top:sim.top,warnings:sim.warns}}
 catch(e){if(e instanceof VErr)return{ok:false,errors:[{line:e.line,msg:e.message}]};throw e}}
function simulate(src,opts){opts=opts||{};const c=compile(src,opts.top);if(!c.ok)return c;const sim=c.sim;if(opts.limit)sim.limit=opts.limit;try{sim.start();sim.run()}catch(e){if(e instanceof VErr){c.runtimeError={line:e.line,msg:e.message};return c}throw e}return c}
function moduleInfo(src){const toks=lex(String(src));const mods=new Parser(toks).source();return mods.map(m=>{const sc={params:new Map(),sigs:new Map(),funcs:m.funcs,sim:{}};for(const p of m.params)try{sc.params.set(p.name,evalE(p.e,sc,null))}catch(e){}for(const d of m.decls)if(d.kind==='param')try{sc.params.set(d.name,evalE(d.e,sc,null))}catch(e){}
 const ports=m.ports.map(n=>{const ds=m.decls.filter(d=>d.name===n);const d=ds.find(x=>x.dir)||{};const r=ds.map(x=>x.range).find(Boolean);let w=1;if(r)try{w=Math.abs(constEval(r.msb,sc)-constEval(r.lsb,sc))+1}catch(e){}return{name:n,dir:d.dir,w}});return{name:m.name,ports,hasClock:ports.some(p=>/^(clk|clock|clk_i|i_clk)$/i.test(p.name)),hasReset:ports.find(p=>/^(rst|reset|rst_n|reset_n|rstn|clr|i_rst)$/i.test(p.name)),line:m.line,uses:m.items.filter(i=>i.k==='inst').map(i=>i.mod)}})}
function vcd(sim,sigs,timescale){const ids=new Map();let n=0;const id=()=>{let k=n++,s='';do{s+=String.fromCharCode(33+k%94);k=Math.floor(k/94)}while(k>0);return s};
 const list=(sigs||sim.sigs).filter(s=>!s.arr&&!s.temp);const tree={};for(const s of list){const parts=s.name.split('.');let node=tree;for(const p of parts.slice(0,-1)){node[p]=node[p]||{};node=node[p]}(node.__s=node.__s||[]).push(s);ids.set(s,id())}
 let out=`$date ${new Date().toUTCString()} $end\n$version CEsim Studio $end\n$timescale ${timescale||'1ns'} $end\n`;const walk=(node,name)=>{out+=`$scope module ${name} $end\n`;for(const s of node.__s||[])out+=`$var ${s.kind==='reg'?'reg':'wire'} ${s.w} ${ids.get(s)} ${s.name.split('.').pop()}${s.w>1?` [${s.msb}:${s.lsb}]`:''} $end\n`;for(const k of Object.keys(node))if(k!=='__s')walk(node[k],k);out+='$upscope $end\n'};for(const k of Object.keys(tree))walk(tree[k],k);out+='$enddefinitions $end\n';
 const ev=[];for(const s of list)for(const[t,a,b]of s.wave)ev.push([t,s,a,b]);ev.sort((x,y)=>x[0]-y[0]);let ct=-1;
 for(const[t,s,a,b]of ev){if(t!==ct){out+=`#${t}\n`;ct=t}const v=new V(s.w,a,b);if(s.w===1)out+=fmtBits(v)+ids.get(s)+'\n';else out+='b'+fmtBits(v).replace(/^0+(?=.)/,'')+' '+ids.get(s)+'\n'}
 out+=`#${sim.t}\n`;return out}
function parseVcd(text){const sigs=[];const byId=new Map();const scope=[];let t=0;let ts='1ns';const toks=text.split(/\s+/);let i=0;
 while(i<toks.length){const k=toks[i++];if(k==='$scope'){i++;scope.push(toks[i++]);while(toks[i]!=='$end')i++;i++}else if(k==='$upscope'){scope.pop();while(toks[i]!=='$end')i++;i++}else if(k==='$var'){const type=toks[i++],w=+toks[i++],id=toks[i++],name=toks[i++];let rng='';while(toks[i]!=='$end')rng+=toks[i++];i++;let msb=w-1,lsb=0;const m=rng.match(/\[(\d+):(\d+)\]/);if(m){msb=+m[1];lsb=+m[2]}if(byId.has(id)){continue}const s={name:[...scope,name].join('.'),w,msb,lsb,kind:type==='reg'?'reg':'wire',wave:[],signed:false};sigs.push(s);byId.set(id,[s])}else if(k==='$timescale'){let s='';while(toks[i]!=='$end')s+=toks[i++];i++;ts=s}else if(k[0]==='$'){while(i<toks.length&&toks[i]!=='$end')i++;i++}else if(k[0]==='#'){t=parseInt(k.slice(1))}else if(k.length){let val,id;if(k[0]==='b'||k[0]==='B'){val=k.slice(1);id=toks[i++]}else if(k[0]==='r'||k[0]==='R'){i++;continue}else{val=k[0];id=k.slice(1)}const ss=byId.get(id);if(!ss)continue;for(const s of ss){let a=0n,b=0n;const bits=val.toLowerCase().padStart(s.w,/^[xz]/i.test(val)?val[0].toLowerCase():'0').slice(-s.w);for(const c of bits){a<<=1n;b<<=1n;if(c==='1')a|=1n;else if(c==='x'){a|=1n;b|=1n}else if(c==='z')b|=1n}s.wave.push([t,a,b])}}}
 return{sigs,end:t,timescale:ts}}
const api={compile,simulate,moduleInfo,vcd,parseVcd,V,fmtBits,fmtHex,fmtDec,fmtVal,X,lex};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HDL=api;
})(typeof window!=='undefined'?window:globalThis);
