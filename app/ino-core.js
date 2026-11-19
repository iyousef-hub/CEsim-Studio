/* CEsim Arduino: compiles an Arduino sketch (C/C++ subset) to a JavaScript generator and simulates an Uno on a virtual clock. */
(function(root){
'use strict';
class CErr extends Error{constructor(m,line){super(m);this.line=line|0}}
class RErr extends Error{constructor(m,line){super(m);this.line=line|0;this.rt=true}}
const fail=(m,l)=>{throw new CErr(m,l)};

/* ---------------- lexer and preprocessor ---------------- */
const OPS=['<<=','>>=','...','->','++','--','<<','>>','<=','>=','==','!=','&&','||','+=','-=','*=','/=','%=','&=','|=','^=','::','+','-','*','/','%','<','>','=','!','~','&','|','^','?',':',';',',','.','(',')','[',']','{','}'];
function lex(src){const t=[];let i=0,line=1;const n=src.length;let bol=true;
 while(i<n){const c=src[i];
  if(c==='\n'){line++;i++;bol=true;continue}
  if(c===' '||c==='\t'||c==='\r'||c==='\f'||c==='\v'){i++;continue}
  if(c==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;continue}
  if(c==='/'&&src[i+1]==='*'){const st=line;i+=2;while(i<n&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++}if(i>=n)fail('A /* comment is never closed with */',st);i+=2;continue}
  if(c==='#'&&bol){const st=line;let s='';i++;while(i<n&&src[i]!=='\n'){if(src[i]==='\\'&&src[i+1]==='\n'){i+=2;line++;s+=' ';continue}if(src[i]==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;break}if(src[i]==='/'&&src[i+1]==='*'){i+=2;while(i<n&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++}i+=2;continue}s+=src[i++]}t.push({t:'pp',v:s.trim(),line:st});continue}
  bol=false;
  if(/[A-Za-z_]/.test(c)){let j=i;while(j<n&&/\w/.test(src[j]))j++;t.push({t:'id',v:src.slice(i,j),line});i=j;continue}
  if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]))){const m=src.slice(i).match(/^(0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)([uUlLfF]*)/);const raw=m[1],suf=m[2].toLowerCase();let v,isF=false;
   if(/^0[xX]/.test(raw))v=parseInt(raw.slice(2),16);else if(/^0[bB]/.test(raw))v=parseInt(raw.slice(2),2);else if(/[.eE]/.test(raw)){v=parseFloat(raw);isF=true}else if(/^0\d/.test(raw)){if(/[89]/.test(raw))fail(`${raw} starts with 0, which makes it an octal number, but it has the digit 8 or 9`,line);v=parseInt(raw,8)}else v=parseInt(raw,10);
   if(suf.includes('f'))isF=true;t.push({t:'num',v,f:isF,u:suf.includes('u'),l:suf.includes('l'),raw:m[0],line});i+=m[0].length;continue}
  if(c==='"'||c==="'"){let j=i+1,s='';while(j<n&&src[j]!==c){if(src[j]==='\n')fail(c==='"'?'A text in double quotes is missing its closing "':"A character in single quotes is missing its closing '",line);if(src[j]==='\\'){j++;const e=src[j];const map={n:'\n',t:'\t',r:'\r','0':'\0','\\':'\\',"'":"'",'"':'"',a:'\x07',b:'\b',f:'\f',v:'\v'};if(e==='x'){const h=src.slice(j+1).match(/^[0-9a-fA-F]{1,2}/);s+=String.fromCharCode(parseInt(h[0],16));j+=h[0].length+1;continue}s+=map[e]!=null?map[e]:e;j++;continue}s+=src[j++]}if(j>=n)fail('A text is missing its closing quote',line);
   if(c==="'"){if(s.length!==1)fail(s.length?`'${s}' has more than one character. Use double quotes for text: "${s}"`:"Empty character ''",line);t.push({t:'chr',v:s.charCodeAt(0),line})}else{const last=t[t.length-1];if(last&&last.t==='str')last.v+=s;else t.push({t:'str',v:s,line})}i=j+1;continue}
  let op=null;for(const o of OPS)if(src.startsWith(o,i)){op=o;break}
  if(!op)fail(`Unexpected character '${c}'`,line);t.push({t:'op',v:op,line});i+=op.length}
 t.push({t:'eof',v:'',line});return t}
function preprocess(toks){const defs=new Map(),out=[],includes=[],warns=[];const stack=[];const active=()=>stack.every(s=>s.on);
 for(const tk of toks){
  if(tk.t==='pp'){const m=tk.v.match(/^(\w+)\s*(.*)$/s);if(!m)continue;const d=m[1],rest=m[2].trim();
   if(d==='ifdef'||d==='ifndef'){const on=defs.has(rest.split(/\s/)[0])===(d==='ifdef');stack.push({on,done:on});continue}
   if(d==='if'){let v=0;try{const e=rest.replace(/defined\s*\(?\s*(\w+)\s*\)?/g,(_,x)=>defs.has(x)?'1':'0').replace(/\b[A-Za-z_]\w*\b/g,x=>{const d2=defs.get(x);return d2&&d2.body.length===1&&d2.body[0].t==='num'?String(d2.body[0].v):'0'});v=/^[\d\s()+\-*/<>=!&|]+$/.test(e)?Function('return ('+e+')')():0}catch(e){v=0}stack.push({on:!!v,done:!!v});continue}
   if(d==='elif'){const s=stack[stack.length-1];if(!s)fail('#elif without #if',tk.line);s.on=false;continue}
   if(d==='else'){const s=stack[stack.length-1];if(!s)fail('#else without #if',tk.line);s.on=!s.done;s.done=true;continue}
   if(d==='endif'){if(!stack.length)fail('#endif without #if',tk.line);stack.pop();continue}
   if(!active())continue;
   if(d==='include'){includes.push({name:rest.replace(/[<>"]/g,''),line:tk.line});continue}
   if(d==='define'){const mm=rest.match(/^(\w+)(\(([^)]*)\))?\s*(.*)$/s);if(!mm)fail('#define needs a name',tk.line);let body=[];try{body=lex(mm[4]).filter(x=>x.t!=='eof')}catch(e){fail(e.message,tk.line)}defs.set(mm[1],{params:mm[2]?mm[3].split(',').map(s=>s.trim()).filter(Boolean):null,body,line:tk.line});continue}
   if(d==='undef'){defs.delete(rest);continue}
   if(d==='pragma'||d==='error'||d==='warning'||d==='line')continue;
   fail(`Unknown preprocessor directive #${d}`,tk.line)}
  if(!active())continue;out.push(tk)}
 if(stack.length)fail('#if or #ifdef without #endif',toks[toks.length-1].line);
 const exp=(list,depth,hide)=>{const r=[];for(let i=0;i<list.length;i++){const tk=list[i];const d=tk.t==='id'&&!hide.has(tk.v)?defs.get(tk.v):null;
   if(!d){r.push(tk);continue}if(depth>40)fail('A #define refers to itself too many times',tk.line);
   let body=d.body;if(d.params){if(!(list[i+1]&&list[i+1].v==='(')){r.push(tk);continue}let j=i+2,dep=1,args=[[]];while(j<list.length&&dep>0){const x=list[j];if(x.v==='('&&x.t==='op')dep++;else if(x.v===')'&&x.t==='op'){dep--;if(!dep)break}if(x.v===','&&x.t==='op'&&dep===1){args.push([]);j++;continue}args[args.length-1].push(x);j++}
    if(args.length===1&&!args[0].length)args=[];i=j;body=[];for(const b of d.body){const k=b.t==='id'?d.params.indexOf(b.v):-1;if(k>=0)body.push(...(args[k]||[]));else body.push(b)}}
   const nh=new Set(hide);nh.add(tk.v);r.push(...exp(body.map(b=>Object.assign({},b,{line:tk.line})),depth+1,nh))}return r};
 return{toks:exp(out,0,new Set()),includes,defs,warns}}

/* ---------------- types ---------------- */
const INFO={char:{b:8,s:1,sz:1},u8:{b:8,s:0,sz:1},int:{b:16,s:1,sz:2},uint:{b:16,s:0,sz:2},long:{b:32,s:1,sz:4},ulong:{b:32,s:0,sz:4},bool:{b:1,s:0,sz:1},float:{sz:4}};
const isInt=t=>typeof t==='string'&&INFO[t]&&t!=='float';
const isNum=t=>typeof t==='string'&&!!INFO[t];
const isArr=t=>t&&typeof t==='object'&&t.arr;
const TNAME={char:'char',u8:'byte',int:'int',uint:'unsigned int',long:'long',ulong:'unsigned long',bool:'bool',float:'float',String:'String',cstr:'text',void:'void',Servo:'Servo',LCD:'LiquidCrystal',OLED:'Adafruit_SSD1306'};
const tname=t=>isArr(t)?tname(t.el)+'[]':TNAME[t]||String(t);
function promote(t){return t==='char'||t==='u8'||t==='bool'?'int':t}
function common(a,b){if(a==='float'||b==='float')return'float';a=promote(a);b=promote(b);if(a===b)return a;const A=INFO[a],B=INFO[b];if(A.b!==B.b)return A.b>B.b?a:b;return A.s?b:a}
function wrap(t,c){switch(t){case'char':return`((${c})<<24>>24)`;case'u8':return`((${c})&255)`;case'int':return`((${c})<<16>>16)`;case'uint':return`((${c})&65535)`;case'long':return`((${c})|0)`;case'ulong':return`((${c})>>>0)`;case'bool':return`((${c})?1:0)`;case'float':return`Math.fround(${c})`}return c}
function fits(f,t){if(f===t)return true;if(f==='bool')return isInt(t);const F=INFO[f],T=INFO[t];if(!F||!T||t==='float'||f==='float')return false;return F.b<T.b&&(T.s||!F.s)}

/* ---------------- parser ---------------- */
const TYPEKW=new Set(['void','int','char','long','short','unsigned','signed','float','double','bool','boolean','byte','word','String','uint8_t','int8_t','uint16_t','int16_t','uint32_t','int32_t','uint64_t','int64_t','size_t','const','static','volatile','Servo','LiquidCrystal','LiquidCrystal_I2C','Adafruit_SSD1306','unsigned_long','inline','constexpr']);
function Parser(toks){this.t=toks;this.p=0;this.enums=new Set();this.warns=[]}
const P=Parser.prototype;
P.peek=function(k){return this.t[this.p+(k||0)]};
P.next=function(){return this.t[this.p++]};
P.is=function(v,k){const x=this.peek(k);return x&&(x.t==='op'||x.t==='id')&&x.v===v};
P.eat=function(v){if(this.is(v)){this.p++;return true}return false};
P.expect=function(v,what){if(this.is(v))return this.next();const x=this.peek(),prev=this.t[this.p-1];
 if(v===';'&&prev&&x.line>prev.line)fail(`Missing ';' at the end of this line`,prev.line);
 if(v===';')fail(`Expected ';' before '${x.v||'end of file'}'`,x.line);
 fail(`Expected '${v}'${what?' '+what:''} but found '${x.v||'end of file'}'`,x.line)};
P.ident=function(what){const x=this.peek();if(x.t!=='id')fail(`Expected ${what||'a name'} but found '${x.v||'end of file'}'`,x.line);this.p++;return x.v};
P.isType=function(k){const x=this.peek(k||0);return x&&x.t==='id'&&TYPEKW.has(x.v)};
P.type=function(){const st=this.peek().line;let sg=null,len=0,base=null,cnst=false,stat=false;let any=false;
 for(;;){const x=this.peek();if(x.t!=='id')break;const v=x.v;
  if(v==='const'||v==='constexpr'){cnst=true}else if(v==='static'){stat=true}else if(v==='volatile'||v==='inline'){}
  else if(v==='unsigned'){sg='u'}else if(v==='signed'){sg='s'}else if(v==='long'){len++}else if(v==='short'){base=base||'short'}
  else if(['void','int','char','float','double','bool','boolean','byte','word','String','uint8_t','int8_t','uint16_t','int16_t','uint32_t','int32_t','uint64_t','int64_t','size_t','Servo','LiquidCrystal','LiquidCrystal_I2C','Adafruit_SSD1306'].includes(v)){if(base&&base!=='short'||(base==='short'&&v!=='int'))break;base=v}
  else break;this.p++;any=true}
 if(!any)return null;let t;
 if(base==='float'||base==='double')t='float';else if(base==='void')t='void';else if(base==='bool'||base==='boolean')t='bool';else if(base==='String')t='String';else if(base==='Servo')t='Servo';else if(base==='LiquidCrystal'||base==='LiquidCrystal_I2C')t='LCD';else if(base==='Adafruit_SSD1306')t='OLED';
 else if(base==='byte'||base==='uint8_t')t='u8';else if(base==='int8_t')t='char';else if(base==='word'||base==='uint16_t')t='uint';else if(base==='int16_t'||base==='short')t=sg==='u'?'uint':'int';else if(base==='uint32_t'||base==='uint64_t')t='ulong';else if(base==='int32_t'||base==='int64_t')t='long';else if(base==='size_t')t='uint';
 else if(base==='char')t=sg==='u'?'u8':'char';else if(len)t=sg==='u'?'ulong':'long';else t=sg==='u'?'uint':'int';
 if(base==='LiquidCrystal_I2C')this.i2c=true;
 if(this.is('*')){if(t==='char'){this.p++;t='cstr';if(this.eat('const')){}}else fail('Pointers are not supported in this simulator. Use an array or a variable instead',st)}
 if(this.is('&')&&t!=='String')fail('Reference parameters (&) are not supported yet. Return the value, or use a global variable',st);
 if(this.is('&'))this.p++;
 return{t,cnst,stat,line:st}};
P.program=function(){const items=[];while(this.peek().t!=='eof'){
  if(this.eat(';'))continue;
  if(this.is('enum')){items.push(this.enumDecl());continue}
  if(this.is('struct')||this.is('class')||this.is('typedef')||this.is('union'))fail(`'${this.peek().v}' is not supported in this simulator yet`,this.peek().line);
  if(this.is('using')||this.is('namespace')){while(!this.is(';')&&this.peek().t!=='eof')this.p++;this.eat(';');continue}
  const ty=this.type();if(!ty){const x=this.peek();if(x.t==='id'&&this.is('(',1))fail(`'${x.v}' needs a return type, for example: void ${x.v}()`,x.line);fail(`Expected a declaration but found '${x.v}'${x.t==='id'?'. Is the type spelled correctly?':''}`,x.line)}
  const nameTok=this.peek();const name=this.ident('a name');
  if(this.is('(')&&!(ty.t==='Servo'||ty.t==='LCD'||ty.t==='OLED')){this.p++;const params=this.params();if(this.eat(';')){items.push({k:'proto',name,ret:ty.t,params,line:nameTok.line});continue}const body=this.block();items.push({k:'func',name,ret:ty.t,params,body,line:nameTok.line,end:this.t[this.p-1].line});continue}
  this.p--;items.push(this.declRest(ty));}
 return items};
P.enumDecl=function(){const line=this.next().line;if(this.peek().t==='id')this.p++;this.expect('{');const vals=[];while(!this.is('}')){const n=this.ident('an enum name');let e=null;if(this.eat('='))e=this.expr(true);vals.push({name:n,e});this.enums.add(n);if(!this.eat(','))break}this.expect('}');if(this.peek().t==='id'){while(!this.is(';'))this.p++}this.expect(';');return{k:'enum',vals,line}};
P.params=function(){const ps=[];if(this.eat(')'))return ps;if(this.is('void')&&this.is(')',1)){this.p+=2;return ps}
 for(;;){const ty=this.type();if(!ty)fail(`Expected a parameter type but found '${this.peek().v}'`,this.peek().line);let name='_p'+ps.length;if(this.peek().t==='id')name=this.next().v;let t=ty.t;const dims=[];while(this.eat('[')){if(!this.is(']'))dims.push(this.expr(true));else dims.push(null);this.expect(']')}if(dims.length)t={arr:true,el:t,dims:dims.map(()=>0)};if(this.eat('='))this.expr(true);ps.push({name,type:t});if(!this.eat(','))break}
 this.expect(')');return ps};
P.declRest=function(ty){const items=[];const line=this.peek().line;
 for(;;){const nl=this.peek().line;const name=this.ident('a variable name');const dims=[];while(this.eat('[')){dims.push(this.is(']')?null:this.expr(true));this.expect(']')}
  let init=null,ctor=null;if(this.eat('=')){init=this.is('{')?this.initList():this.expr(true)}else if(this.is('(')){this.p++;ctor=[];if(!this.is(')'))for(;;){ctor.push(this.expr(true));if(!this.eat(','))break}this.expect(')')}else if(this.is('{')){init=this.initList()}
  items.push({name,dims,init,ctor,line:nl});if(!this.eat(','))break}
 this.expect(';');return{k:'decl',ty,items,line}};
P.initList=function(){const line=this.expect('{').line;const items=[];while(!this.is('}')){items.push(this.is('{')?this.initList():this.expr(true));if(!this.eat(','))break}this.expect('}');return{k:'init',items,line}};
P.block=function(){const l=this.expect('{').line;const body=[];while(!this.is('}')){if(this.peek().t==='eof')fail('A { is never closed with }',l);body.push(this.stmt())}this.next();return{k:'block',body,line:l}};
P.stmt=function(){const x=this.peek(),line=x.line;
 if(this.is('{'))return this.block();
 if(this.eat(';'))return{k:'empty',line};
 if(x.t==='id'&&this.isType()){let k=0;while(this.isType(k))k++;if(this.peek(k).t==='id'&&this.is('(',k+1)){let j=k+2,d=1;while(d>0&&this.peek(j).t!=='eof'){if(this.is('(',j))d++;else if(this.is(')',j))d--;j++}if(this.is('{',j))fail(`A function cannot be written inside another function. Is a } missing before line ${line}?`,line)}}
 if(x.t==='id'){switch(x.v){
  case'if':{this.p++;this.expect('(');const c=this.expr();this.expect(')');const th=this.stmt();let el=null;if(this.eat('else'))el=this.stmt();return{k:'if',c,t:th,f:el,line}}
  case'while':{this.p++;this.expect('(');const c=this.expr();this.expect(')');return{k:'while',c,b:this.stmt(),line}}
  case'do':{this.p++;const b=this.stmt();if(!this.eat('while'))fail("Expected 'while' after the do block",this.peek().line);this.expect('(');const c=this.expr();this.expect(')');this.expect(';');return{k:'do',b,c,line}}
  case'for':{this.p++;this.expect('(');let init=null;if(!this.is(';')){if(this.isType()){const ty=this.type();init=this.declRest(ty)}else{init={k:'expr',e:this.expr(),line};this.expect(';')}}else this.p++;const c=this.is(';')?null:this.expr();this.expect(';');const step=this.is(')')?null:this.expr();this.expect(')');return{k:'for',init,c,step,b:this.stmt(),line}}
  case'switch':{this.p++;this.expect('(');const e=this.expr();this.expect(')');this.expect('{');const cases=[];let cur=null;while(!this.is('}')){if(this.eat('case')){const v=this.expr(true);this.expect(':');cur={v,body:[],line:this.t[this.p-1].line};cases.push(cur);continue}if(this.eat('default')){this.expect(':');cur={v:null,body:[]};cases.push(cur);continue}if(!cur)fail("Expected 'case' inside switch",this.peek().line);cur.body.push(this.stmt())}this.next();return{k:'switch',e,cases,line}}
  case'break':this.p++;this.expect(';');return{k:'break',line};
  case'continue':this.p++;this.expect(';');return{k:'continue',line};
  case'return':{this.p++;const e=this.is(';')?null:this.expr();this.expect(';');return{k:'return',e,line}}
  case'goto':fail('goto is not supported',line);
  case'enum':return this.enumDecl();
 }
  if(this.isType()&&!(this.is('(',1)&&['int','float','byte','char','long','word','String','bool','unsigned'].includes(x.v)&&!this.isType(1))){const ty=this.type();return this.declRest(ty)}}
 const e=this.expr();this.expect(';');return{k:'expr',e,line}};
const BIN=[['||'],['&&'],['|'],['^'],['&'],['==','!='],['<','>','<=','>='],['<<','>>'],['+','-'],['*','/','%']];
P.expr=function(noComma){let e=this.assign();if(!noComma)while(this.is(',')){const l=this.next().line;e={k:'comma',a:e,b:this.assign(),line:l}}return e};
P.assign=function(){const a=this.tern();const x=this.peek();if(x.t==='op'&&['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>='].includes(x.v)){this.p++;const b=this.assign();return{k:'asg',op:x.v,a,b,line:x.line}}return a};
P.tern=function(){const c=this.bin(0);if(this.is('?')){const l=this.next().line;const a=this.expr(true);this.expect(':');const b=this.assign();return{k:'tern',c,a,b,line:l}}return c};
P.bin=function(lv){if(lv>=BIN.length)return this.unary();let a=this.bin(lv+1);for(;;){const x=this.peek();if(x.t==='op'&&BIN[lv].includes(x.v)){this.p++;a={k:'bin',op:x.v,a,b:this.bin(lv+1),line:x.line}}else return a}};
P.unary=function(){const x=this.peek();
 if(x.t==='op'&&['-','+','!','~'].includes(x.v)){this.p++;return{k:'un',op:x.v,a:this.unary(),line:x.line}}
 if(x.t==='op'&&(x.v==='++'||x.v==='--')){this.p++;return{k:'pre',op:x.v,a:this.unary(),line:x.line}}
 if(x.t==='op'&&(x.v==='&'||x.v==='*'))fail('Pointers are not supported in this simulator',x.line);
 if(x.t==='id'&&x.v==='sizeof'){this.p++;let paren=this.eat('(');let r;if(paren&&this.isType()){const ty=this.type();r={k:'sizeof',type:ty.t,line:x.line}}else{r={k:'sizeof',e:paren?this.expr():this.unary(),line:x.line}}if(paren)this.expect(')');return r}
 if(this.is('(')&&this.isType(1)){let k=1;while(this.isType(k))k++;if(this.is('*',k))k++;if(this.is(')',k)){this.p++;const ty=this.type();this.expect(')');return{k:'cast',type:ty.t,a:this.unary(),line:x.line}}}
 return this.postfix()};
P.postfix=function(){let e=this.primary();for(;;){const x=this.peek();
  if(this.is('[')){this.p++;const i=this.expr();this.expect(']');e={k:'idx',a:e,i,line:x.line};continue}
  if(this.is('(')){this.p++;const args=[];if(!this.is(')'))for(;;){args.push(this.assign());if(!this.eat(','))break}this.expect(')',"to close the function call");e={k:'call',f:e,args,line:x.line};continue}
  if(this.is('.')||this.is('->')){this.p++;const n=this.ident('a member name');e={k:'mem',a:e,name:n,line:x.line};continue}
  if(this.is('++')||this.is('--')){this.p++;e={k:'post',op:x.v,a:e,line:x.line};continue}
  return e}};
P.primary=function(){const x=this.next();
 if(x.t==='num'){let type;if(x.f)type='float';else{const v=x.v;if(x.u)type=x.l||v>65535?'ulong':'uint';else if(x.l)type=v>2147483647?'ulong':'long';else type=v<=32767?'int':v<=2147483647?'long':'ulong'}return{k:'num',v:x.v,type,line:x.line}}
 if(x.t==='chr')return{k:'num',v:x.v,type:'char',line:x.line};
 if(x.t==='str')return{k:'str',v:x.v,line:x.line};
 if(x.t==='op'&&x.v==='('){const e=this.expr();this.expect(')');return e}
 if(x.t==='op'&&x.v==='{'){this.p--;return this.initList()}
 if(x.t==='id'){if(TYPEKW.has(x.v)&&this.is('(')){this.p--;const ty=this.type();this.expect('(');const a=this.is(')')?{k:'num',v:0,type:'int',line:x.line}:this.expr();this.expect(')');return{k:'cast',type:ty.t,a,line:x.line,fn:true}}
  if(x.v==='true'||x.v==='false')return{k:'num',v:x.v==='true'?1:0,type:'bool',line:x.line};
  if(this.is('::')){this.p++;const n=this.ident();return{k:'id',name:x.v+'::'+n,line:x.line}}
  return{k:'id',name:x.v,line:x.line}}
 if(x.t==='eof')fail('The sketch ends too early. Is a } or ) missing?',x.line);
 fail(`Unexpected '${x.v}'`,x.line)};

/* ---------------- code generator ---------------- */
const CONSTS={WHITE:[1,'int'],BLACK:[0,'int'],INVERSE:[2,'int'],SSD1306_WHITE:[1,'int'],SSD1306_BLACK:[0,'int'],SSD1306_INVERSE:[2,'int'],SSD1306_SWITCHCAPVCC:[2,'int'],SSD1306_EXTERNALVCC:[1,'int'],HIGH:[1,'int'],LOW:[0,'int'],INPUT:[0,'int'],OUTPUT:[1,'int'],INPUT_PULLUP:[2,'int'],LED_BUILTIN:[13,'int'],A0:[14,'int'],A1:[15,'int'],A2:[16,'int'],A3:[17,'int'],A4:[18,'int'],A5:[19,'int'],DEC:[10,'int'],HEX:[16,'int'],BIN:[2,'int'],OCT:[8,'int'],PI:[Math.PI,'float'],HALF_PI:[Math.PI/2,'float'],TWO_PI:[Math.PI*2,'float'],DEG_TO_RAD:[Math.PI/180,'float'],RAD_TO_DEG:[180/Math.PI,'float'],EULER:[Math.E,'float'],CHANGE:[1,'int'],FALLING:[2,'int'],RISING:[3,'int'],LSBFIRST:[0,'int'],MSBFIRST:[1,'int'],NULL:[0,'int'],SERIAL:[0,'int'],DISPLAY:[1,'int']};
const PWM=new Set([3,5,6,9,10,11]);
function Gen(items,includes,warns){this.items=items;this.out=[];this.scopes=[new Map()];this.funcs=new Map();this.tmp=0;this.warns=warns;this.includes=includes;this.statics=[];this.loopDepth=0;this.switchDepth=0}
const G=Gen.prototype;
G.lookup=function(n){for(let i=this.scopes.length-1;i>=0;i--){const s=this.scopes[i].get(n);if(s)return s}return null};
G.declare=function(n,info,line){const s=this.scopes[this.scopes.length-1];if(s.has(n))fail(`'${n}' is declared twice in the same place`,line);if(CONSTS[n]||n==='Serial')fail(`'${n}' is a reserved Arduino name`,line);s.set(n,info);return info};
G.t=function(){return'_t'+(this.tmp++)};
G.conv=function(e,to,line,what){const f=e.type;if(to==='void')return e.code;
 if(isArr(to)){if(!isArr(f)&&!(f==='cstr'&&to.el==='char'))fail(`Expected an array for ${what||'this value'}, not ${tname(f)}`,line);return e.code}
 if(to==='String'){if(f==='String'||f==='cstr')return e.code;if(isArr(f)&&f.el==='char')return`RT.cs(${e.code})`;if(f==='char')return`String.fromCharCode(${e.code}&255)`;if(isNum(f))return`RT.fmt(${e.code},'${f}')`;fail(`Cannot turn ${tname(f)} into a String`,line)}
 if(to==='cstr'){if(f==='cstr'||f==='String')return e.code;if(isArr(f)&&f.el==='char')return`RT.cs(${e.code})`;fail(`Expected text for ${what||'this value'}, not ${tname(f)}`,line)}
 if(to==='Servo'||to==='LCD'||to==='OLED'){if(f!==to)fail(`Expected a ${tname(to)}`,line);return e.code}
 if(isNum(to)){if(f==='void')fail(`${what?what[0].toUpperCase()+what.slice(1):'This'} uses a function that returns nothing (void)`,line);
  if(f==='String'||f==='cstr'||isArr(f))fail(`Cannot use ${f==='cstr'?'text':tname(f)} as a number${what?' for '+what:''}${f==='String'?'. Use .toInt()':''}`,line);
  if(isNum(f)&&fits(f,to))return e.code;
  if(f==='float'&&to!=='float'){if(to==='bool')return`((${e.code})?1:0)`;return wrap(to,`Math.trunc(${e.code})`)}
  if(e.k==='const'&&to!=='float'){const v=Number(Function('return '+wrap(to,String(e.v)))());return String(v)}
  return wrap(to,e.code)}
 fail(`Cannot use ${tname(f)} here`,line)};
G.cond=function(e,line){const r=this.expr(e);if(r.type==='void')fail('A condition uses a function that returns nothing',line);if(r.type==='String')return`(${r.code}).length>0`;return r.code};
G.lval=function(e){if(e.k==='id'){const s=this.lookup(e.name);if(!s){fail(`'${e.name}' was not declared in this scope`,e.line)}if(s.kind==='const'||s.cnst)fail(`'${e.name}' is a constant and cannot be changed`,e.line);if(s.kind!=='var')fail(`'${e.name}' cannot be assigned`,e.line);if(isArr(s.type))fail(`A whole array cannot be assigned. Assign one element, like ${e.name}[0] = ...`,e.line);return{get:s.js,set:v=>`${s.js}=${v}`,type:s.type,pre:''}}
 if(e.k==='idx'){const a=this.expr(e.a);if(!isArr(a.type)){if(a.type==='String'){const i=this.expr(e.i);const t=this.t();return{get:`(${a.code}).charCodeAt(${t})`,type:'char',pre:`${t}=${i.code},`,set:v=>`${this.lval(e.a).set(`RT.setCh(${a.code},${t},${v})`)}`}}fail(`'${exprName(e.a)}' is not an array`,e.line)}const i=this.expr(e.i);if(!isInt(i.type))fail('An array index must be a whole number',e.line);const ta=this.t(),ti=this.t();const el=a.type.dims.length>1?{arr:true,el:a.type.el,dims:a.type.dims.slice(1)}:a.type.el;
  return{get:`${ta}[${ti}]`,set:v=>`${ta}[${ti}]=${v}`,type:el,pre:`${ta}=${a.code},${ti}=RT.ix(${ta},${i.code},${e.line},${JSON.stringify(exprName(e.a))}),`}}
 if(e.k==='mem')fail('This member cannot be assigned',e.line);
 fail('The left side of = must be a variable or an array element',e.line)};
function exprName(e){return e.k==='id'?e.name:e.k==='idx'?exprName(e.a)+'[]':'value'}
G.expr=function(e){const R=(code,type,extra)=>Object.assign({code,type},extra||{});
 switch(e.k){
 case'num':return R(String(e.v),e.type,{k:'const',v:e.v});
 case'str':return R(JSON.stringify(e.v),'cstr');
 case'init':fail('A { } list can only be used to set up an array',e.line);
 case'id':{const s=this.lookup(e.name);
  if(s){if(s.kind==='const')return R(String(s.v),s.type,{k:'const',v:s.v});if(s.kind==='func')fail(`'${e.name}' is a function. Call it with ${e.name}()`,e.line);return R(s.js,s.type,{sym:s,name:e.name})}
  if(CONSTS[e.name]){const[v,t]=CONSTS[e.name];return R(String(v),t,{k:'const',v})}
  if(/^B[01]{1,8}$/.test(e.name)){const v=parseInt(e.name.slice(1),2);return R(String(v),'int',{k:'const',v})}
  if(e.name==='Serial')return R('RT.ser','Serial');
  const near=this.near(e.name);fail(`'${e.name}' was not declared in this scope${near?`. Did you mean '${near}'?`:''}`,e.line)}
 case'sizeof':{let t=e.type;if(!t){const r=this.expr(e.e);t=r.type}const sz=t=>isArr(t)?t.dims.reduce((a,b)=>a*b,1)*sz(t.el):t==='String'?6:t==='cstr'?2:(INFO[t]||{sz:2}).sz;return R(String(sz(t)),'uint',{k:'const',v:sz(t)})}
 case'cast':{if(e.type==='String'&&e.fn&&e.a.k==='comma'){const v=this.expr(e.a.a),f=this.expr(e.a.b);if(!isNum(v.type))fail('String(value, digits) needs a number',e.line);return R(`RT.fmt(${v.code},'${v.type}',${f.code})`,'String')}const a=this.expr(e.a);if(e.type==='String'){return R(this.conv(a,'String',e.line),'String')}if(!isNum(e.type))fail(`Cannot convert to ${tname(e.type)}`,e.line);if(a.type==='String'||a.type==='cstr')fail(`Cannot convert text to a number with a cast. Use .toInt() on a String`,e.line);return R(this.conv(a,e.type,e.line),e.type)}
 case'comma':{const a=this.expr(e.a),b=this.expr(e.b);return R(`(${a.code},${b.code})`,b.type)}
 case'tern':{const c=this.cond(e.c,e.line);const a=this.expr(e.a),b=this.expr(e.b);let t;if(isNum(a.type)&&isNum(b.type))t=common(a.type,b.type);else if(a.type==='String'||b.type==='String')t='String';else if(a.type===b.type)t=a.type;else if((a.type==='cstr'||a.type==='String')&&(b.type==='cstr'||b.type==='String'))t='String';else fail('Both sides of ? : must have the same kind of value',e.line);return R(`((${c})?(${this.conv(a,t,e.line)}):(${this.conv(b,t,e.line)}))`,t)}
 case'un':{const a=this.expr(e.a);if(e.op==='!')return R(`((${a.type==='String'?a.code+'.length':a.code})?0:1)`,'bool');if(!isNum(a.type))fail(`'${e.op}' needs a number`,e.line);
  if(e.op==='+')return R(a.code,promote(a.type));if(e.op==='-'){const t=promote(a.type);if(a.k==='const'&&t!=='float'&&a.v>32767){return R(String(-a.v),'long',{k:'const',v:-a.v})}if(a.k==='const')return R(`(${-a.v})`,t,{k:'const',v:-a.v});return R(wrap(t,`-(${a.code})`),t)}
  if(e.op==='~'){if(a.type==='float')fail("'~' needs a whole number",e.line);const t=promote(a.type);return R(wrap(t,`~(${a.code})`),t)}}
 case'pre':case'post':{const L=this.lval(e.a);if(!isNum(L.type))fail(`'${e.op}' needs a number variable`,e.line);const d=e.op==='++'?'+1':'-1';const nv=wrap(L.type,`${L.get}${d}`);if(e.k==='pre')return R(`(${L.pre}${L.set(nv)})`,L.type);const t=this.t();return R(`(${L.pre}${t}=${L.get},${L.set(nv)},${t})`,L.type)}
 case'asg':{const L=this.lval(e.a);let b;if(e.op==='='){if(e.b.k==='init')fail('A { } list can only be used when an array is declared',e.line);b=this.expr(e.b);if(L.type==='String'){return R(`(${L.pre}${L.set(this.conv(b,'String',e.line))})`,'String')}return R(`(${L.pre}${L.set(this.conv(b,L.type,e.line,'the assignment'))})`,L.type)}
  const op=e.op.slice(0,-1);const r=this.binop(op,{code:L.get,type:L.type},this.expr(e.b),e.line);return R(`(${L.pre}${L.set(this.conv(r,L.type,e.line))})`,L.type)}
 case'bin':{if(e.op==='&&'||e.op==='||'){const a=this.cond(e.a,e.line),b=this.cond(e.b,e.line);return R(`((${a})${e.op}(${b})?1:0)`,'bool')}return this.binop(e.op,this.expr(e.a),this.expr(e.b),e.line)}
 case'idx':{const a=this.expr(e.a);const i=this.expr(e.i);if(a.type==='String'||a.type==='cstr'){return R(`RT.chAt(${a.code},${i.code})`,'char')}if(!isArr(a.type))fail(`'${exprName(e.a)}' is not an array`,e.line);if(!isInt(i.type))fail('An array index must be a whole number',e.line);const el=a.type.dims.length>1?{arr:true,el:a.type.el,dims:a.type.dims.slice(1)}:a.type.el;return R(`${a.code}[RT.ix(${a.code},${i.code},${e.line},${JSON.stringify(exprName(e.a))})]`,el)}
 case'mem':{const a=this.expr(e.a);if(a.type==='String'&&e.name==='length')fail('length is a function: write .length()',e.line);fail(`'${e.name}' must be called with ( )`,e.line)}
 case'call':return this.call(e);
 }
 fail('This expression is not supported',e.line)};
G.near=function(n){const all=[...this.funcs.keys(),...Object.keys(BUILTIN),...Object.keys(CONSTS)];for(const s of this.scopes)all.push(...s.keys());const l=n.toLowerCase();let best=null,bd=3;for(const c of all){if(c.toLowerCase()===l)return c;const d=lev(l,c.toLowerCase());if(d<bd){bd=d;best=c}}return best};
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i?Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j}return d[a.length][b.length]}
G.binop=function(op,a,b,line){const R=(code,type)=>({code,type});
 if(op==='+'&&(a.type==='String'||b.type==='String')){return R(`(${this.conv(a,'String',line)}+${this.conv(b,'String',line)})`,'String')}
 if((a.type==='cstr'||b.type==='cstr')&&(op==='+'||op==='-')){if(a.type==='cstr'&&b.type==='cstr')fail('Two texts in quotes cannot be added. Write String("...") + "..." instead',line);const s=a.type==='cstr'?a:b,n=a.type==='cstr'?b:a;if(isInt(n.type)){this.warns.push({line,msg:'Adding a number to a text in quotes does not join them in C++: it skips characters instead. Use String("text") + value, or print them separately'});return R(`(${s.code}).slice(${n.code})`,'cstr')}fail('Cannot add this to a text',line)}
 if(['==','!=','<','>','<=','>='].includes(op)&&(a.type==='String'||b.type==='String'||(a.type==='cstr'&&b.type==='cstr'))){const x=this.conv(a,'String',line),y=this.conv(b,'String',line);const js=op==='=='?'===':op==='!='?'!==':op;return R(`((${x})${js}(${y})?1:0)`,'bool')}
 if(!isNum(a.type)||!isNum(b.type)){const bad=!isNum(a.type)?a:b;fail(`'${op}' needs numbers, but one side is ${bad.type==='cstr'?'text':bad.type==='void'?'a function that returns nothing':tname(bad.type)}`,line)}
 if(['<<','>>'].includes(op)){if(a.type==='float'||b.type==='float')fail(`'${op}' needs whole numbers`,line);const t=promote(a.type);const x=a.code,y=b.code;if(op==='<<')return R(wrap(t,`(${x})<<(${y})`),t);return R(t==='ulong'?`((${x})>>>(${y}))`:`((${x})>>(${y}))`,t)}
 const t=common(a.type,b.type);const x=this.conv(a,t,line),y=this.conv(b,t,line);
 if(['==','!=','<','>','<=','>='].includes(op)){const js=op==='=='?'===':op==='!='?'!==':op;return R(`((${x})${js}(${y})?1:0)`,'bool')}
 if(['&','|','^'].includes(op)){if(t==='float')fail(`'${op}' needs whole numbers`,line);return R(wrap(t,`(${x})${op}(${y})`),t)}
 if(t==='float'){if(op==='%')fail("'%' needs whole numbers. Use fmod() for decimals",line);return R(`Math.fround((${x})${op}(${y}))`,'float')}
 if(op==='/'||op==='%'){if(b.k==='const'&&b.v===0)fail('Division by zero',line);return R(wrap(t,`RT.${op==='/'?'div':'mod'}(${x},${y},${line})`),t)}
 if(op==='*'&&INFO[t].b===32)return R(wrap(t,`Math.imul(${x},${y})`),t);
 return R(wrap(t,`(${x})${op}(${y})`),t)};
G.args=function(e,n,m,name){if(e.args.length<n||e.args.length>(m==null?n:m))fail(`${name}() takes ${m==null||m===n?n:n+' to '+m} value${(m||n)===1?'':'s'} but got ${e.args.length}`,e.line);return e.args.map(a=>this.expr(a))};
G.num=function(r,line,what){return this.conv(r,r.type==='float'?'float':'long',line,what)};
G.call=function(e){const R=(code,type)=>({code,type});const line=e.line;
 if(e.f.k==='mem'){const obj=this.expr(e.f.a);const m=e.f.name;return this.method(obj,m,e,e.f.a)}
 if(e.f.k!=='id')fail('This cannot be called like a function',line);const name=e.f.name;
 const fn=this.funcs.get(name);const loc=this.lookup(name);
 if(fn&&!(loc&&loc.kind!=='func')){if(e.args.length!==fn.params.length)fail(`${name}() takes ${fn.params.length} value${fn.params.length===1?'':'s'} but got ${e.args.length}`,line);const as=e.args.map((a,i)=>this.conv(this.expr(a),fn.params[i].type,line,`value ${i+1} of ${name}()`));return R(`(yield* f_${name}(${as.join(',')}))`,fn.ret)}
 const b=BUILTIN[name];if(b)return b.call(this,e,line);
 if(loc)fail(`'${name}' is a variable, not a function`,line);
 const near=this.near(name);fail(`'${name}' was not declared in this scope${near?`. Did you mean '${near}'?`:''}`,line)};
const BUILTIN={
 pinMode(e,l){const[p,m]=this.args(e,2,2,'pinMode');return{code:`RT.pinMode(${this.num(p,l)},${this.num(m,l)},${l})`,type:'void'}},
 digitalWrite(e,l){const[p,v]=this.args(e,2,2,'digitalWrite');return{code:`RT.dw(${this.num(p,l)},${this.num(v,l)},${l})`,type:'void'}},
 digitalRead(e,l){const[p]=this.args(e,1,1,'digitalRead');return{code:`RT.dr(${this.num(p,l)},${l})`,type:'int'}},
 analogRead(e,l){const[p]=this.args(e,1,1,'analogRead');return{code:`RT.ar(${this.num(p,l)},${l})`,type:'int'}},
 analogWrite(e,l){const[p,v]=this.args(e,2,2,'analogWrite');return{code:`RT.aw(${this.num(p,l)},${this.num(v,l)},${l})`,type:'void'}},
 analogReference(e){this.args(e,1,1,'analogReference');return{code:'0',type:'void'}},
 delay(e,l){const[m]=this.args(e,1,1,'delay');return{code:`(yield* RT.delay(${this.num(m,l)}))`,type:'void'}},
 delayMicroseconds(e,l){const[m]=this.args(e,1,1,'delayMicroseconds');return{code:`(yield* RT.delayUs(${this.num(m,l)}))`,type:'void'}},
 millis(e){this.args(e,0,0,'millis');return{code:'RT.millis()',type:'ulong'}},
 micros(e){this.args(e,0,0,'micros');return{code:'RT.micros()',type:'ulong'}},
 map(e,l){const a=this.args(e,5,5,'map');return{code:`RT.map(${a.map(x=>this.conv(x,'long',l)).join(',')},${l})`,type:'long'}},
 constrain(e,l){const a=this.args(e,3,3,'constrain');const t=a.reduce((t,x)=>common(t,x.type),promote(a[0].type));return{code:`RT.constrain(${a.map(x=>this.conv(x,t,l)).join(',')})`,type:t}},
 min(e,l){const a=this.args(e,2,2,'min');const t=common(a[0].type,a[1].type);return{code:`Math.min(${this.conv(a[0],t,l)},${this.conv(a[1],t,l)})`,type:t}},
 max(e,l){const a=this.args(e,2,2,'max');const t=common(a[0].type,a[1].type);return{code:`Math.max(${this.conv(a[0],t,l)},${this.conv(a[1],t,l)})`,type:t}},
 abs(e,l){const[a]=this.args(e,1,1,'abs');const t=promote(a.type);if(!isNum(t))fail('abs() needs a number',l);return{code:wrap(t,`Math.abs(${a.code})`),type:t}},
 sq(e,l){const[a]=this.args(e,1,1,'sq');const t=promote(a.type);return{code:t==='float'?`Math.fround((${a.code})*(${a.code}))`:wrap(t,`Math.imul(${a.code},${a.code})`),type:t}},
 sqrt(e,l){const[a]=this.args(e,1,1,'sqrt');return{code:`Math.fround(Math.sqrt(${this.conv(a,'float',l)}))`,type:'float'}},
 pow(e,l){const a=this.args(e,2,2,'pow');return{code:`Math.fround(Math.pow(${this.conv(a[0],'float',l)},${this.conv(a[1],'float',l)}))`,type:'float'}},
 random(e,l){const a=this.args(e,1,2,'random');return{code:a.length===1?`RT.random(0,${this.conv(a[0],'long',l)})`:`RT.random(${this.conv(a[0],'long',l)},${this.conv(a[1],'long',l)})`,type:'long'}},
 randomSeed(e,l){const[a]=this.args(e,1,1,'randomSeed');return{code:`RT.seed(${this.num(a,l)})`,type:'void'}},
 tone(e,l){const a=this.args(e,2,3,'tone');return{code:`RT.tone(${a.map(x=>this.num(x,l)).join(',')})`,type:'void'}},
 noTone(e,l){const[a]=this.args(e,1,1,'noTone');return{code:`RT.noTone(${this.num(a,l)})`,type:'void'}},
 pulseIn(e,l){const a=this.args(e,2,3,'pulseIn');return{code:`(yield* RT.pulseIn(${a.map(x=>this.num(x,l)).join(',')}))`,type:'ulong'}},
 bitRead(e,l){const a=this.args(e,2,2,'bitRead');return{code:`(((${this.conv(a[0],'ulong',l)})>>>(${a[1].code}))&1)`,type:'int'}},
 bit(e,l){const[a]=this.args(e,1,1,'bit');return{code:`((1<<(${a.code}))>>>0)`,type:'ulong'}},
 highByte(e,l){const[a]=this.args(e,1,1,'highByte');return{code:`(((${a.code})>>8)&255)`,type:'u8'}},
 lowByte(e,l){const[a]=this.args(e,1,1,'lowByte');return{code:`((${a.code})&255)`,type:'u8'}},
 bitSet(e,l){return bitMod.call(this,e,l,'bitSet',(g,n)=>`(${g})|(1<<(${n}))`)},
 bitClear(e,l){return bitMod.call(this,e,l,'bitClear',(g,n)=>`(${g})&~(1<<(${n}))`)},
 bitWrite(e,l){if(e.args.length!==3)fail('bitWrite() takes 3 values',l);const v=this.expr(e.args[2]);return bitMod.call(this,{args:e.args.slice(0,2),line:l},l,'bitWrite',(g,n)=>`((${v.code})?((${g})|(1<<(${n}))):((${g})&~(1<<(${n}))))`)},
 attachInterrupt(e,l){if(e.args.length!==3)fail('attachInterrupt() takes 3 values: the interrupt, the function and the mode',l);const n=this.expr(e.args[0]);const f=e.args[1];if(f.k!=='id'||!this.funcs.has(f.name))fail('The second value of attachInterrupt() must be the name of a function',l);const fn=this.funcs.get(f.name);if(fn.params.length)fail('An interrupt function cannot take values',l);const m=this.expr(e.args[2]);return{code:`RT.attachInt(${n.code},f_${f.name},${m.code},${l})`,type:'void'}},
 detachInterrupt(e,l){const[n]=this.args(e,1,1,'detachInterrupt');return{code:`RT.detachInt(${n.code})`,type:'void'}},
 digitalPinToInterrupt(e,l){const[p]=this.args(e,1,1,'digitalPinToInterrupt');return{code:`(${p.code}===2?0:${p.code}===3?1:-1)`,type:'int'}},
 interrupts(e){return{code:'0',type:'void'}},noInterrupts(e){return{code:'0',type:'void'}},
 yield(e){return{code:'0',type:'void'}},
 isDigit(e,l){const[a]=this.args(e,1,1,'isDigit');return{code:`(/[0-9]/.test(String.fromCharCode(${a.code}))?1:0)`,type:'bool'}},
 isAlpha(e,l){const[a]=this.args(e,1,1,'isAlpha');return{code:`(/[A-Za-z]/.test(String.fromCharCode(${a.code}))?1:0)`,type:'bool'}},
 isSpace(e,l){const[a]=this.args(e,1,1,'isSpace');return{code:`(/\\s/.test(String.fromCharCode(${a.code}))?1:0)`,type:'bool'}},
 isUpperCase(e,l){const[a]=this.args(e,1,1,'isUpperCase');return{code:`(/[A-Z]/.test(String.fromCharCode(${a.code}))?1:0)`,type:'bool'}},
 isLowerCase(e,l){const[a]=this.args(e,1,1,'isLowerCase');return{code:`(/[a-z]/.test(String.fromCharCode(${a.code}))?1:0)`,type:'bool'}},
 toupper(e,l){const[a]=this.args(e,1,1,'toupper');return{code:`String.fromCharCode(${a.code}).toUpperCase().charCodeAt(0)`,type:'int'}},
 tolower(e,l){const[a]=this.args(e,1,1,'tolower');return{code:`String.fromCharCode(${a.code}).toLowerCase().charCodeAt(0)`,type:'int'}},
 shiftOut(e,l){const a=this.args(e,4,4,'shiftOut');return{code:`RT.shiftOut(${a.map(x=>this.num(x,l)).join(',')})`,type:'void'}},
};
for(const f of['sin','cos','tan','asin','acos','atan','exp','log','log10','floor','ceil','fabs','round','trunc'])BUILTIN[f]=function(e,l){const[a]=this.args(e,1,1,f);const js=f==='fabs'?'abs':f;if(f==='round')return{code:`Math.round(${this.conv(a,'float',l)})|0`,type:'long'};return{code:`Math.fround(Math.${js}(${this.conv(a,'float',l)}))`,type:'float'}};
BUILTIN.atan2=function(e,l){const a=this.args(e,2,2,'atan2');return{code:`Math.fround(Math.atan2(${this.conv(a[0],'float',l)},${this.conv(a[1],'float',l)}))`,type:'float'}};
BUILTIN.fmod=function(e,l){const a=this.args(e,2,2,'fmod');return{code:`Math.fround((${this.conv(a[0],'float',l)})%(${this.conv(a[1],'float',l)}))`,type:'float'}};
function bitMod(e,l,name,f){if(e.args.length<2)fail(`${name}() takes 2 values`,l);const L=this.lval(e.args[0]);if(!isInt(L.type))fail(`${name}() needs a whole-number variable`,l);const n=this.expr(e.args[1]);return{code:`(${L.pre}${L.set(wrap(L.type,f(L.get,n.code)))})`,type:L.type}}
const PRINTABLE=t=>isNum(t)||t==='String'||t==='cstr'||(isArr(t)&&t.el==='char');
G.printArgs=function(e,l,name){if(e.args.length>2)fail(`${name}() takes at most 2 values`,l);if(!e.args.length)return'""';const v=this.expr(e.args[0]);if(!PRINTABLE(v.type))fail(`${name}() cannot print ${v.type==='void'?'a function that returns nothing':tname(v.type)}`,l);const f=e.args[1]?this.expr(e.args[1]).code:'-1';if(isArr(v.type))return`RT.cs(${v.code})`;return`RT.fmt(${v.code},'${v.type}',${f})`};
G.method=function(obj,m,e,ae){const l=e.line;const R=(code,type)=>({code,type});
 if(obj.type==='Serial'){switch(m){
  case'begin':{const[b]=this.args(e,1,2,'Serial.begin');return R(`RT.serBegin(${b.code})`,'void')}
  case'print':return R(`RT.out(${this.printArgs(e,l,'Serial.print')})`,'uint');
  case'println':return R(`RT.out(${this.printArgs(e,l,'Serial.println')}+"\\r\\n")`,'uint');
  case'write':{const[a]=this.args(e,1,1,'Serial.write');return R(a.type==='cstr'||a.type==='String'?`RT.out(${a.code})`:`RT.out(String.fromCharCode((${a.code})&255))`,'uint')}
  case'available':this.args(e,0,0,'Serial.available');return R('RT.rx.length','int');
  case'availableForWrite':return R('63','int');
  case'read':this.args(e,0,0,'Serial.read');return R('(RT.rx.length?RT.rx.shift():-1)','int');
  case'peek':this.args(e,0,0,'Serial.peek');return R('(RT.rx.length?RT.rx[0]:-1)','int');
  case'parseInt':this.args(e,0,1,'Serial.parseInt');return R('(yield* RT.parseNum(0))','long');
  case'parseFloat':this.args(e,0,1,'Serial.parseFloat');return R('(yield* RT.parseNum(1))','float');
  case'readString':this.args(e,0,0,'Serial.readString');return R('(yield* RT.readStr(-1))','String');
  case'readStringUntil':{const[c]=this.args(e,1,1,'Serial.readStringUntil');return R(`(yield* RT.readStr(${c.code}))`,'String')}
  case'setTimeout':{const[c]=this.args(e,1,1,'Serial.setTimeout');return R(`(RT.serTimeout=${c.code})`,'void')}
  case'flush':case'end':return R('0','void');
  }fail(`Serial.${m}() is not supported`,l)}
 if(obj.type==='String'){const S=obj.code;const mut=v=>{if(ae.k!=='id'&&ae.k!=='idx')return`(${v})`;const L=this.lval(ae);return`(${L.pre}${L.set(v)})`};switch(m){
  case'length':this.args(e,0,0,'length');return R(`(${S}).length`,'uint');
  case'charAt':{const[i]=this.args(e,1,1,'charAt');return R(`RT.chAt(${S},${i.code})`,'char')}
  case'substring':{const a=this.args(e,1,2,'substring');return R(`(${S}).substring(${a.map(x=>x.code).join(',')})`,'String')}
  case'indexOf':{const a=this.args(e,1,2,'indexOf');const x=a[0].type==='char'?`String.fromCharCode(${a[0].code})`:this.conv(a[0],'String',l);return R(`(${S}).indexOf(${x}${a[1]?','+a[1].code:''})`,'int')}
  case'lastIndexOf':{const[a]=this.args(e,1,1,'lastIndexOf');const x=a.type==='char'?`String.fromCharCode(${a.code})`:this.conv(a,'String',l);return R(`(${S}).lastIndexOf(${x})`,'int')}
  case'toInt':this.args(e,0,0,'toInt');return R(`RT.toInt(${S})`,'long');
  case'toFloat':this.args(e,0,0,'toFloat');return R(`Math.fround(parseFloat(${S})||0)`,'float');
  case'equals':{const[a]=this.args(e,1,1,'equals');return R(`((${S})===(${this.conv(a,'String',l)})?1:0)`,'bool')}
  case'equalsIgnoreCase':{const[a]=this.args(e,1,1,'equalsIgnoreCase');return R(`((${S}).toLowerCase()===(${this.conv(a,'String',l)}).toLowerCase()?1:0)`,'bool')}
  case'startsWith':{const[a]=this.args(e,1,1,'startsWith');return R(`((${S}).startsWith(${this.conv(a,'String',l)})?1:0)`,'bool')}
  case'endsWith':{const[a]=this.args(e,1,1,'endsWith');return R(`((${S}).endsWith(${this.conv(a,'String',l)})?1:0)`,'bool')}
  case'compareTo':{const[a]=this.args(e,1,1,'compareTo');return R(`RT.cmp(${S},${this.conv(a,'String',l)})`,'int')}
  case'concat':{const[a]=this.args(e,1,1,'concat');return R(mut(`(${S})+${this.conv(a,'String',l)}`)+',1','bool')}
  case'toUpperCase':this.args(e,0,0,'toUpperCase');return R(mut(`(${S}).toUpperCase()`)+',0','void');
  case'toLowerCase':this.args(e,0,0,'toLowerCase');return R(mut(`(${S}).toLowerCase()`)+',0','void');
  case'trim':this.args(e,0,0,'trim');return R(mut(`(${S}).trim()`)+',0','void');
  case'replace':{const a=this.args(e,2,2,'replace');const c=x=>x.type==='char'?`String.fromCharCode(${x.code})`:this.conv(x,'String',l);return R(mut(`(${S}).split(${c(a[0])}).join(${c(a[1])})`)+',0','void')}
  case'remove':{const a=this.args(e,1,2,'remove');return R(mut(a[1]?`(${S}).slice(0,${a[0].code})+(${S}).slice(${a[0].code}+${a[1].code})`:`(${S}).slice(0,${a[0].code})`)+',0','void')}
  case'setCharAt':{const a=this.args(e,2,2,'setCharAt');return R(mut(`RT.setCh(${S},${a[0].code},${a[1].code})`)+',0','void')}
  case'c_str':this.args(e,0,0,'c_str');return R(S,'cstr');
  case'isEmpty':return R(`((${S}).length?0:1)`,'bool');
  }fail(`String.${m}() is not supported`,l)}
 if(obj.type==='OLED'){const O=obj.code;const A=(a,b,nm)=>this.args(e,a,b,nm).map(x=>this.num(x,l));switch(m){
  case'begin':return R(`${O}.begin()`,'bool');case'display':return R(`${O}.show()`,'void');case'clearDisplay':return R(`${O}.clear()`,'void');
  case'setTextSize':{const a=A(1,2,'setTextSize');return R(`${O}.ts=Math.max(1,(${a[0]})|0)`,'void')}case'setTextColor':{const a=A(1,2,'setTextColor');return R(`${O}.tc=(${a[0]})?1:0`,'void')}
  case'setCursor':{const a=A(2,2,'setCursor');return R(`${O}.setCursor(${a[0]},${a[1]})`,'void')}case'setRotation':case'cp437':case'dim':case'setTextWrap':case'startscrollright':case'startscrollleft':case'stopscroll':this.args(e,0,4,m);return R('0','void');
  case'invertDisplay':{const a=A(1,1,'invertDisplay');return R(`${O}.inv=(${a[0]})?1:0`,'void')}case'width':return R('128','int');case'height':return R(`${O}.h`,'int');
  case'drawPixel':{const a=A(3,3,'drawPixel');return R(`${O}.px(${a.join(',')})`,'void')}case'drawLine':{const a=A(5,5,'drawLine');return R(`${O}.line(${a.join(',')})`,'void')}
  case'drawFastHLine':{const a=A(4,4,m);return R(`${O}.line(${a[0]},${a[1]},(${a[0]})+(${a[2]})-1,${a[1]},${a[3]})`,'void')}case'drawFastVLine':{const a=A(4,4,m);return R(`${O}.line(${a[0]},${a[1]},${a[0]},(${a[1]})+(${a[2]})-1,${a[3]})`,'void')}
  case'drawRect':case'fillRect':case'drawRoundRect':case'fillRoundRect':{const a=A(5,6,m);return R(`${O}.rect(${a[0]},${a[1]},${a[2]},${a[3]},${a[a.length-1]},${/fill/.test(m)?1:0})`,'void')}
  case'drawCircle':case'fillCircle':{const a=A(4,4,m);return R(`${O}.circ(${a.join(',')},${m==='fillCircle'?1:0})`,'void')}
  case'drawTriangle':case'fillTriangle':{const a=A(7,7,m);return R(`${O}.tri(${a.join(',')},${m==='fillTriangle'?1:0})`,'void')}
  case'print':return R(`${O}.print(${this.printArgs(e,l,'display.print')})`,'uint');case'println':return R(`${O}.print((${e.args.length?this.printArgs(e,l,'display.println'):"''"})+'\\n')`,'uint');
  case'write':{const[a]=this.args(e,1,1,'display.write');return R(`${O}.print(String.fromCharCode((${a.code})&255))`,'uint')}
  }fail(`display.${m}() is not supported`,l)}
 if(obj.type==='Servo'){const O=obj.code;switch(m){
  case'attach':{const a=this.args(e,1,3,'attach');return R(`${O}.attach(${a[0].code},${l})`,'uint')}
  case'write':{const[a]=this.args(e,1,1,'write');return R(`${O}.write(${this.num(a,l)})`,'void')}
  case'writeMicroseconds':{const[a]=this.args(e,1,1,'writeMicroseconds');return R(`${O}.write(Math.round(((${a.code})-544)*180/1856))`,'void')}
  case'read':this.args(e,0,0,'read');return R(`${O}.angle`,'int');
  case'attached':return R(`(${O}.pin>=0?1:0)`,'bool');
  case'detach':return R(`${O}.detach()`,'void');
  }fail(`Servo.${m}() is not supported`,l)}
 if(obj.type==='LCD'){const O=obj.code;switch(m){
  case'begin':{this.args(e,2,3,'lcd.begin');const a=e.args.map(x=>this.expr(x).code);return R(`${O}.begin(${a[0]},${a[1]})`,'void')}
  case'init':case'backlight':case'noBacklight':case'display':case'noDisplay':case'cursor':case'noCursor':case'blink':case'noBlink':case'leftToRight':case'rightToLeft':case'autoscroll':case'noAutoscroll':return R(`${O}.cmd('${m}')`,'void');
  case'clear':return R(`${O}.clear()`,'void');case'home':return R(`${O}.setCursor(0,0)`,'void');
  case'setCursor':{const a=this.args(e,2,2,'setCursor');return R(`${O}.setCursor(${a[0].code},${a[1].code})`,'void')}
  case'print':return R(`${O}.print(${this.printArgs(e,l,'lcd.print')})`,'uint');
  case'write':{const[a]=this.args(e,1,1,'lcd.write');return R(`${O}.print(String.fromCharCode((${a.code})&255))`,'uint')}
  case'scrollDisplayLeft':return R(`${O}.scroll(-1)`,'void');case'scrollDisplayRight':return R(`${O}.scroll(1)`,'void');
  case'createChar':return R('0','void');
  }fail(`lcd.${m}() is not supported`,l)}
 if(obj.type==='cstr'&&m==='length')fail('Text in quotes has no .length(). Use a String, or strlen()',l);
 fail(`'${m}' cannot be used on ${tname(obj.type)}`,l)};
BUILTIN.strlen=function(e,l){const[a]=this.args(e,1,1,'strlen');return{code:isArr(a.type)?`RT.cs(${a.code}).length`:`(${a.code}).length`,type:'uint'}};
G.arrInit=function(type,dims,init,line,name){
 const build=(d,list)=>{const n=dims[d];const out=[];if(d===dims.length-1){
   if(list&&list.k==='str'){if(type!=='char'&&type!=='u8')fail('Text can only set up a char array',line);const s=list.v;if(s.length+1>n)fail(`"${s}" needs ${s.length+1} characters (with the hidden end mark) but ${name} holds ${n}`,line);for(let i=0;i<n;i++)out.push(i<s.length?String(s.charCodeAt(i)):'0');return`[${out.join(',')}]`}
   const items=list?list.items:[];if(items.length>n)fail(`Too many values for ${name}: it holds ${n}`,line);for(let i=0;i<n;i++){if(i<items.length){if(items[i].k==='init')fail('Too many { } levels',line);out.push(this.conv(this.expr(items[i]),type,line))}else out.push(type==='String'?'""':'0')}return`[${out.join(',')}]`}
  const items=list?list.items:[];if(items.length>n)fail(`Too many rows for ${name}`,line);for(let i=0;i<n;i++)out.push(build(d+1,items[i]||null));return`[${out.join(',')}]`};
 return build(0,init)};
G.constVal=function(e,line,what){const r=this.expr(e);if(r.k!=='const'||!isInt(r.type)&&r.type!=='float')fail(`${what} must be a fixed number`,line);return r.v};
G.decl=function(d,global){const ty=d.ty;const out=[];
 for(const it of d.items){const line=it.line;let t=ty.t;
  if(t==='void')fail(`'${it.name}' cannot be void`,line);
  if(t==='OLED'){if(it.dims.length)fail('Arrays of objects are not supported',line);const js=(global?'g_':'v_')+it.name;this.declare(it.name,{kind:'var',type:t,js,cnst:true},line);out.push(`${js}=RT.newOLED(${JSON.stringify(it.name)})`);continue}
  if(t==='Servo'||t==='LCD'){if(it.dims.length)fail('Arrays of objects are not supported',line);const js=(global?'g_':'v_')+it.name;this.declare(it.name,{kind:'var',type:t,js,cnst:true},line);
   if(t==='Servo')out.push(`${js}=RT.newServo(${JSON.stringify(it.name)})`);else{const a=(it.ctor||[]).map(x=>this.expr(x).code);out.push(`${js}=RT.newLCD(${JSON.stringify(it.name)},[${a.join(',')}],${this.i2c?1:0})`)}continue}
  if(it.ctor){if(it.ctor.length!==1)fail(`'${it.name}' takes one value in ( )`,line);it.init=it.ctor[0]}
  const js=(global?'g_':'v_')+it.name+(this.statics.length&&!global&&ty.stat?'':'' );
  if(it.dims.length){const dims=it.dims.map((x,i)=>{if(x===null){if(i>0)fail('Only the first array size can be left empty',line);if(!it.init)fail(`'${it.name}[]' needs a size or a list of values`,line);return it.init.k==='str'?it.init.v.length+1:it.init.items.length}const v=this.constVal(x,line,'An array size');if(v<=0||v>4096)fail(`An array size must be from 1 to 4096 on the simulated board (got ${v})`,line);return v});
   if(it.init&&it.init.k!=='init'&&it.init.k!=='str')fail('Set up an array with { } values',line);
   const at={arr:true,el:t,dims};const code=this.arrInit(t,dims,it.init,line,it.name);const info={kind:'var',type:at,js:null,cnst:ty.cnst};
   if(ty.stat&&!global){const gname='s_'+(this.statics.length)+'_'+it.name;this.statics.push(`${gname}=${code}`);info.js=gname;this.declare(it.name,info,line);continue}
   info.js=js;this.declare(it.name,info,line);out.push(`${js}=${code}`);continue}
  if(it.init&&it.init.k==='init')fail(`'${it.name}' is not an array, so it cannot take { } values`,line);
  let code;if(it.init){const r=this.expr(it.init);code=this.conv(r,t,line,`'${it.name}'`);if(ty.cnst&&r.k==='const'&&isNum(t)){const v=Number(Function('return '+code)());this.declare(it.name,{kind:'const',type:t,v,js},line);if(global)continue;continue}}else code=t==='String'?'""':t==='cstr'?'""':'0';
  const info={kind:'var',type:t,js,cnst:ty.cnst};
  if(ty.stat&&!global){const gname='s_'+(this.statics.length)+'_'+it.name;this.statics.push(`${gname}=${code}`);info.js=gname;this.declare(it.name,info,line);continue}
  this.declare(it.name,info,line);out.push(`${js}=${code}`)}
 return out};
const TICK='if((RT.us+=4)>=RT.until)yield 0;';
G.stmt=function(s,ind){const I='  '.repeat(ind);const L=`RT.ln=${s.line};`;
 switch(s.k){
 case'empty':return'';
 case'block':{this.scopes.push(new Map());const r=s.body.map(x=>this.stmt(x,ind+1)).join('');this.scopes.pop();return`${I}{\n${r}${I}}\n`}
 case'decl':{const parts=this.decl(s,false);return parts.length?`${I}${L}let ${parts.join(',')};\n`:''}
 case'enum':{this.enumVals(s);return''}
 case'expr':{const r=this.expr(s.e);return`${I}${L}${r.code};\n`}
 case'if':{const c=this.cond(s.c,s.line);let r=`${I}${L}if(${c})${this.sub(s.t,ind)}`;if(s.f)r+=`${I}else${this.sub(s.f,ind)}`;return r}
 case'while':{const c=this.cond(s.c,s.line);this.loopDepth++;const b=this.sub(s.b,ind,true);this.loopDepth--;return`${I}${L}while(${c})${b}`}
 case'do':{this.loopDepth++;const b=this.sub(s.b,ind,true);this.loopDepth--;const c=this.cond(s.c,s.line);return`${I}${L}do${b}${I}while(${c});\n`}
 case'for':{this.scopes.push(new Map());let init='';if(s.init){if(s.init.k==='decl'){const p=this.decl(s.init,false);init=p.length?'let '+p.join(','):''}else init=this.expr(s.init.e).code}const c=s.c?this.cond(s.c,s.line):'';const st=s.step?this.expr(s.step).code:'';this.loopDepth++;const b=this.sub(s.b,ind,true);this.loopDepth--;this.scopes.pop();return`${I}${L}for(${init};${c};${st})${b}`}
 case'switch':{const e=this.expr(s.e);if(!isInt(e.type))fail('switch needs a whole number or a character',s.line);this.switchDepth++;this.scopes.push(new Map());let r=`${I}${L}switch(${e.code}){\n`;const seen=new Set();for(const c of s.cases){if(c.v){const v=this.constVal(c.v,c.line||s.line,'A case value');if(seen.has(v))fail(`case ${v} appears twice`,c.line||s.line);seen.add(v);r+=`${I}case ${v}:\n`}else r+=`${I}default:\n`;r+=c.body.map(x=>this.stmt(x,ind+1)).join('')}this.scopes.pop();this.switchDepth--;return r+`${I}}\n`}
 case'break':if(!this.loopDepth&&!this.switchDepth)fail('break can only be used inside a loop or switch',s.line);return`${I}break;\n`;
 case'continue':if(!this.loopDepth)fail('continue can only be used inside a loop',s.line);return`${I}continue;\n`;
 case'return':{const f=this.curFn;if(!s.e){if(f.ret!=='void')this.warns.push({line:s.line,msg:`${f.name}() should return a ${tname(f.ret)} value here`});return`${I}${L}return${f.ret==='void'?'':' 0'};\n`}if(f.ret==='void')fail(`${f.name}() is void, so it cannot return a value`,s.line);const r=this.expr(s.e);return`${I}${L}return ${this.conv(r,f.ret,s.line,'the returned value')};\n`}
 }
 fail('This statement is not supported',s.line)};
G.sub=function(s,ind,loop){if(s.k==='block'){this.scopes.push(new Map());const r=s.body.map(x=>this.stmt(x,ind+1)).join('');this.scopes.pop();return`{${loop?TICK:''}\n${r}${'  '.repeat(ind)}}\n`}this.scopes.push(new Map());const r=this.stmt(s,ind+1);this.scopes.pop();return`{${loop?TICK:''}\n${r}${'  '.repeat(ind)}}\n`};
G.enumVals=function(s){let prev=-1;for(const v of s.vals){const val=v.e?this.constVal(v.e,s.line,'An enum value'):prev+1;this.declare(v.name,{kind:'const',type:'int',v:val},s.line);prev=val}};
G.program=function(){const out=[];const globals=[];
 for(const it of this.items){if(it.k==='func'){if(this.funcs.has(it.name)&&this.funcs.get(it.name).body)fail(`The function ${it.name}() is defined twice`,it.line);if(BUILTIN[it.name]&&!['yield'].includes(it.name))fail(`${it.name}() is already an Arduino function. Choose another name`,it.line);this.funcs.set(it.name,it)}else if(it.k==='proto'){if(!this.funcs.has(it.name))this.funcs.set(it.name,it)}}
 for(const[n,f]of this.funcs)if(!f.body)fail(`The function ${n}() is declared but never written`,f.line);
 const ginit=[];
 for(const it of this.items){if(it.k==='decl'){const parts=this.decl(it,true);for(const p of parts){globals.push(p.split('=')[0]);ginit.push(`RT.ln=${it.line};${p};`)}}else if(it.k==='enum')this.enumVals(it)}
 const gtmp=this.tmp;const fns=[];
 for(const[n,f]of this.funcs){this.curFn=f;this.tmp=0;this.scopes.push(new Map());
  for(const p of f.params){const t=p.type;this.declare(p.name,{kind:'var',type:t,js:'v_'+p.name},f.line)}
  const body=f.body.body.map(x=>this.stmt(x,2)).join('');this.scopes.pop();
  const temps=[];for(let i=0;i<this.tmp;i++)temps.push('_t'+i);
  fns.push(`function* f_${n}(${f.params.map(p=>'v_'+p.name).join(',')}){\n  RT.depth++;if(RT.depth>RT.maxDepth)RT.overflow(${f.line});${TICK}${temps.length?'let '+temps.join(',')+';':''}\n  try{\n${body}  }finally{RT.depth--}\n${f.ret!=='void'?'  return 0;\n':''}}`)}
 if(!this.funcs.has('setup'))fail('The sketch has no setup() function. Every sketch needs void setup() { } and void loop() { }',1);
 if(!this.funcs.has('loop'))fail('The sketch has no loop() function. Every sketch needs void setup() { } and void loop() { }',1);
 for(const n of['setup','loop']){const f=this.funcs.get(n);if(f.params.length)fail(`${n}() must not take any values`,f.line)}
 const gnames=[...this.scopes[0]].filter(([k,v])=>v.kind==='var').map(([k,v])=>({name:k,js:v.js,type:v.type}));
 const gvars=gnames.map(g=>g.js).concat(this.statics.map(s=>s.split('=')[0]));
 const watch=`function watch(){return[${gnames.map(g=>`[${JSON.stringify(g.name)},${JSON.stringify(tname(g.type))},${g.type==='Servo'||g.type==='LCD'||g.type==='OLED'?'null':g.js}]`).join(',')}]}`;
 const ginitTemps=[];for(let i=0;i<gtmp;i++)ginitTemps.push('_t'+i);
 const code=`"use strict";\n${gvars.length?'let '+gvars.join(',')+';':''}\n${this.statics.length?this.statics.map(s=>s+';').join('\n'):''}\nfunction* init(){${ginitTemps.length?'let '+ginitTemps.join(',')+';':''}\n${ginit.join('\n')}\n}\n${fns.join('\n')}\n${watch}\nreturn{init,setup:f_setup,loop:f_loop,watch};`;
 return code};

function compile(src){
 const warns=[];
 try{const toks=lex(String(src));const pp=preprocess(toks);const ps=new Parser(pp.toks);const items=ps.program();const g=new Gen(items,pp.includes,warns);g.i2c=!!ps.i2c;const code=g.program();
  let factory;try{factory=new Function('RT',code)}catch(e){return{ok:false,errors:[{line:0,msg:'Internal compiler error: '+e.message}],warnings:warns,code}}
  const libs=pp.includes.map(i=>i.name);const known=['Servo.h','LiquidCrystal.h','LiquidCrystal_I2C.h','Adafruit_SSD1306.h','Adafruit_GFX.h','Wire.h','Arduino.h','SPI.h','math.h','stdlib.h','string.h','avr/io.h','avr/interrupt.h'];
  for(const i of pp.includes)if(!known.includes(i.name))warns.push({line:i.line,msg:`The library ${i.name} is not simulated. Its functions will not be available`});
  return{ok:true,errors:[],warnings:warns,code,factory,includes:libs}}
 catch(e){if(e instanceof CErr)return{ok:false,errors:[{line:e.line,msg:e.message}],warnings:warns};throw e}}

/* ---------------- runtime ---------------- */
const SEG='abcdefg';
class Sim{
 constructor(prog,parts){this.prog=prog;this.parts=parts||[];this.listeners={};this.reset()}
 reset(){this.us=0;this.until=0;this.ln=0;this.depth=0;this.maxDepth=180;this.pins=[];for(let i=0;i<20;i++)this.pins.push({mode:0,v:0,pwm:-1,tone:0,touched:false});
  this.ser={};this.serial='';this.serOn=false;this.serWarned=false;this.rx=[];this.serTimeout=1000;this.servos=[];this.lcds=[];this.ints={};this.state='ready';this.error=null;this.rng=1;this.txBlink=0;this.events=[];this.lastIn={};this.trigAt={};this.pendingInts=[];this.serBaud=0;
  const RT=this;try{this.m=this.prog.factory(RT)}catch(e){this.state='error';this.error={line:0,msg:e.message};return}
  this.gen=(function*(m,rt){yield* m.init();rt.phase='setup';yield* m.setup();rt.phase='loop';for(;;){yield* m.loop();if((rt.us+=4)>=rt.until)yield 0}})(this.m,this);
  this.phase='init';this.snapInputs()}
 snapInputs(){for(let p=0;p<20;p++)this.lastIn[p]=this.level(p)}
 /* time */
 millis(){return Math.floor(this.us/1000)>>>0}
 micros(){return Math.floor(this.us)>>>0}
 *delay(ms){if(ms<0)ms=0;ms=ms>>>0;this.us+=ms*1000;if(this.us>=this.until)yield 0}
 *delayUs(u){this.us+=Math.max(0,u)+1;if(this.us>=this.until)yield 0}
 /* run the program up to a virtual time; returns state */
 run(toUs,wallMs){if(this.state==='error'||this.state==='done')return this.state;this.until=toUs;this.state='running';const t0=Date.now();
  try{while(this.us<this.until){this.checkInts();const r=this.gen.next();if(r.done){this.state='done';break}if(Date.now()-t0>(wallMs||40)){this.until=this.us;break}}}
  catch(e){this.state='error';if(e instanceof RErr)this.error={line:e.line,msg:e.message};else if(e instanceof RangeError)this.error={line:this.ln,msg:'The program ran out of memory for function calls (a function probably calls itself forever)'};else this.error={line:this.ln,msg:'Runtime error: '+e.message}}
  for(const p of this.pins)if(p.tone&&p.toneEnd&&this.us>=p.toneEnd){p.tone=0;p.toneEnd=0;this.dirty=true}
  if(this.state==='running')this.state='paused';return this.state}
 /* errors */
 overflow(l){throw new RErr('Stack overflow: functions call each other too deeply (more than '+this.maxDepth+' levels). A function probably calls itself without stopping',l)}
 ix(a,i,l,n){if(i<0||i>=a.length||i!==Math.floor(i))throw new RErr(`Index ${i} is outside the array ${n.replace('[]','')} (valid: 0 to ${a.length-1}). On a real board this silently corrupts memory`,l);return i}
 div(a,b,l){if(b===0)throw new RErr('Division by zero. On a real board the result is garbage',l);return Math.trunc(a/b)}
 mod(a,b,l){if(b===0)throw new RErr('Remainder (%) by zero',l);return a%b}
 /* pins */
 pinOk(p,l){p=p|0;if(p<0||p>19)throw new RErr(`Pin ${p} does not exist on the Uno. Use 0 to 13, or A0 to A5`,l);return p}
 pinMode(p,m,l){p=this.pinOk(p,l);const s=this.pins[p];s.mode=m===1?1:m===2?2:0;s.touched=true;if(m===1){s.pwm=-1}if((p===0||p===1)&&this.serOn)this.warn(l,`Pin ${p} is used by Serial (${p?'TX':'RX'}). Using it for other parts disturbs the Serial Monitor`);this.emit('pins')}
 dw(p,v,l){p=this.pinOk(p,l);const s=this.pins[p];s.v=v?1:0;s.pwm=-1;s.touched=true;if(s.mode!==1&&p>=0){if(s.mode===0&&v){s.mode=2;s.pullupByWrite=true}else if(s.mode===2&&!v&&s.pullupByWrite){s.mode=0}}if(v)s.lastHigh=this.us;this.emit('pins')}
 dr(p,l){p=this.pinOk(p,l);const s=this.pins[p];if(s.mode===1)return s.v;return this.level(p)}
 level(p){const s=this.pins[p];let drive=null;
  for(const pt of this.parts){if(pt.type==='button'&&pt.pin===p||pt.type==='switch'&&pt.pin===p){const on=pt.type==='button'?!!pt.pressed:!!pt.on;if(pt.wiring==='vcc'){drive=on?1:0}else{if(on)drive=0;else if(drive==null)drive=null}}
   else if(pt.type==='pir'&&pt.pin===p)drive=pt.on?1:0;
   else if(pt.type==='ultrasonic'&&pt.echo===p)drive=0}
  if(drive!=null)return drive;if(s.mode===2)return 1;if(s.mode===1)return s.v;
  if(this.parts.some(pt=>(pt.type==='button'||pt.type==='switch')&&pt.pin===p))return(this.rand()>>8)&1;
  return(this.rand()>>8)&1}
 ar(p,l){p=p|0;if(p>=0&&p<=5)p+=14;if(p<14||p>19)throw new RErr(`analogRead() needs an analog pin: A0 to A5 (got ${p})`,l);this.us+=100;this.readA=this.readA||new Set();this.readA.add(p);
  for(const pt of this.parts){if(pt.pin!==p)continue;if(pt.type==='pot')return Math.max(0,Math.min(1023,Math.round(pt.value)));if(pt.type==='ldr')return Math.round(Math.max(0,Math.min(100,pt.value))*10.23*0.92+20);if(pt.type==='lm35')return Math.max(0,Math.min(1023,Math.round(pt.value*1023/500)));if(pt.type==='joyx'||pt.type==='soil')return Math.round(pt.value)}
  const s=this.pins[p];if(s.mode===1)return s.v?1023:0;if(s.mode===2)return 1015+(this.rand()&7);return 300+(this.rand()%160)}
 aw(p,v,l){p=this.pinOk(p,l);v=Math.max(0,Math.min(255,v|0));const s=this.pins[p];s.touched=true;s.mode=1;if(!PWM.has(p)){s.pwm=-1;s.v=v>=128?1:0;if(!this.pwmWarned){this.pwmWarned=true;this.warn(l,`Pin ${p} has no PWM. analogWrite() works on pins 3, 5, 6, 9, 10 and 11. Other pins are only fully on or off`)}}else{s.pwm=v;s.v=v>0?1:0}this.emit('pins')}
 tone(p,f,d){p=p|0;this.pins[p].tone=f;this.pins[p].lastTone=f;this.pins[p].mode=1;this.pins[p].toneEnd=d?this.us+d*1000:0;this.emit('pins')}
 noTone(p){this.pins[p|0].tone=0;this.emit('pins')}
 *pulseIn(p,st,to){this.pulsePins=this.pulsePins||new Set();this.pulsePins.add(p);to=to||1000000;for(const pt of this.parts){if(pt.type==='ultrasonic'&&pt.echo===p){const th=this.pins[pt.trig]&&this.pins[pt.trig].lastHigh;const fired=th!=null&&this.us-th<5000&&!this.pins[pt.trig].v;if(!fired||pt.value>400){this.us+=Math.min(to,38000);if(this.us>=this.until)yield 0;return 0}const d=Math.round(pt.value*58.2);if(d>to){this.us+=to;return 0}this.us+=d;if(this.us>=this.until)yield 0;return d}}
  this.us+=to;if(this.us>=this.until)yield 0;return 0}
 shiftOut(dp,cp,order,val){for(let i=0;i<8;i++){const b=order?(val>>(7-i))&1:(val>>i)&1;this.pins[dp].v=b;}this.emit('pins')}
 /* math */
 map(x,a,b,c,d,l){if(b===a)throw new RErr('map() divides by zero because the two "from" values are the same',l);return Math.trunc((x-a)*(d-c)/(b-a))+c|0}
 constrain(x,a,b){return x<a?a:x>b?b:x}
 rand(){let x=this.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x;return x>>>0}
 seed(s){this.rng=(s|0)||1}
 random(a,b){if(b<=a)return a;return a+Math.floor((this.rand()/4294967296)*(b-a))}
 toInt(s){const m=String(s).trim().match(/^[+-]?\d+/);return m?parseInt(m[0],10)|0:0}
 cmp(a,b){return a<b?-1:a>b?1:0}
 chAt(s,i){return i>=0&&i<s.length?s.charCodeAt(i):0}
 setCh(s,i,c){if(i<0||i>=s.length)return s;return s.slice(0,i)+String.fromCharCode(c&255)+s.slice(i+1)}
 cs(a){let s='';for(const c of a){if(!c)break;s+=String.fromCharCode(c)}return s}
 fmt(v,t,f){if(f==null)f=-1;if(t==='String'||t==='cstr')return v;if(t==='char'&&f<0)return String.fromCharCode(v&255);
  if(t==='float'){if(isNaN(v))return'nan';if(!isFinite(v))return v>0?'inf':'-inf';if(Math.abs(v)>4294967040)return'ovf';const d=f>=0?f:2;return v.toFixed(d)}
  const base=f>=2&&f!==10?f:10;if(base!==10){const u=t==='ulong'||t==='long'?v>>>0:(v<0?v>>>0:v);return u.toString(base).toUpperCase()}return String(v)}
 /* serial */
 serBegin(b){this.serOn=true;this.serBaud=b;if(![300,600,1200,2400,4800,9600,14400,19200,28800,31250,38400,57600,74880,115200,230400,250000,500000,1000000,2000000].includes(b))this.warn(this.ln,`${b} is an unusual baud rate`);this.emit('serial')}
 out(s){s=String(s);if(!this.serOn){if(!this.serWarned){this.serWarned=true;this.warn(this.ln,'Nothing is sent to the Serial Monitor until Serial.begin(9600) runs in setup()')}return s.length}this.serial+=s;if(this.serial.length>200000)this.serial=this.serial.slice(-150000);this.txBlink=this.us;this.us+=Math.ceil(s.length*10e6/Math.max(300,this.serBaud||9600))/100;this.emit('serial');return s.length}
 send(text){for(const ch of text)this.rx.push(ch.charCodeAt(0)&255);this.emit('serial')}
 *parseNum(fl){const t0=this.us;const re=fl?/[-0-9.]/:/[-0-9]/;for(;;){while(this.rx.length&&!re.test(String.fromCharCode(this.rx[0])))this.rx.shift();if(this.rx.length)break;if(this.us-t0>=this.serTimeout*1000)return 0;this.us+=1000;if(this.us>=this.until)yield 0}
  let s='';for(;;){while(this.rx.length&&re.test(String.fromCharCode(this.rx[0]))&&!(s.length&&this.rx[0]===45)){s+=String.fromCharCode(this.rx.shift())}if(this.rx.length||this.us-t0>=this.serTimeout*1000)break;const t1=this.us;while(!this.rx.length&&this.us-t1<this.serTimeout*1000){this.us+=1000;if(this.us>=this.until)yield 0}if(!this.rx.length)break}
  return fl?Math.fround(parseFloat(s)||0):(parseInt(s,10)|0)}
 *readStr(stop){let s='';const to=this.serTimeout*1000;let t=this.us;for(;;){if(this.rx.length){const c=this.rx.shift();if(stop>=0&&c===stop)return s;s+=String.fromCharCode(c);t=this.us;continue}if(this.us-t>=to)return s;this.us+=1000;if(this.us>=this.until)yield 0}}
 /* interrupts */
 attachInt(n,fn,mode,l){const pin=n===0?2:n===1?3:-1;if(pin<0)throw new RErr('The Uno has interrupts only on pins 2 and 3. Use digitalPinToInterrupt(2) or digitalPinToInterrupt(3)',l);this.ints[pin]={fn,mode};this.lastIn[pin]=this.dr(pin,l)}
 detachInt(n){delete this.ints[n===0?2:3]}
 checkInts(){for(const k in this.ints){const p=+k;const v=this.level(p);const old=this.lastIn[p];this.lastIn[p]=v;if(old===v)continue;const m=this.ints[k].mode;if(m===1||(m===2&&!v)||(m===3&&v)){const g=this.ints[k].fn();const svl=this.ln;let r;let guard=0;while(!(r=g.next()).done&&guard++<100000){}this.ln=svl}}}
 /* objects */
 newServo(name){const s={name,pin:-1,angle:90,sim:this,attach(p,l){p=this.sim.pinOk(p,l);this.pin=p;this.sim.pins[p].mode=1;this.sim.pins[p].servo=this;this.sim.emit('pins');return 1},write(a){a=a|0;if(a>180){a=Math.round((a-544)*180/1856)}this.angle=Math.max(0,Math.min(180,a));this.sim.emit('pins')},detach(){this.pin=-1}};this.servos.push(s);return s}
 newLCD(name,args,i2c){const cols=i2c?args[1]||16:16,rows=i2c?args[2]||2:2;const L={name,args,i2c,cols,rows,buf:[],cx:0,cy:0,on:true,light:!i2c,sim:this,shift:0,
  begin(c,r){this.cols=c|0||16;this.rows=r|0||2;this.clear();this.on=true;this.light=true;this.sim.us+=2000},clear(){this.buf=Array.from({length:4},()=>Array(40).fill(' '));this.cx=0;this.cy=0;this.shift=0;this.sim.us+=1600;this.sim.emit('lcd')},
  setCursor(c,r){this.cx=Math.max(0,c|0);this.cy=Math.max(0,Math.min(this.rows-1,r|0))},
  print(s){s=String(s);for(const ch of s){if(this.cx<40)this.buf[this.cy][this.cx]=ch;this.cx++}this.sim.us+=40*s.length;this.sim.emit('lcd');return s.length},
  scroll(d){this.shift+=d;this.sim.emit('lcd')},
  cmd(c){if(c==='init'){this.clear();this.on=true}if(c==='backlight')this.light=true;if(c==='noBacklight')this.light=false;if(c==='display')this.on=true;if(c==='noDisplay')this.on=false;this.sim.emit('lcd')},
  text(){const out=[];for(let r=0;r<this.rows;r++){let s='';for(let c=0;c<this.cols;c++){const k=c-this.shift;s+=k>=0&&k<40?this.buf[r][k]:' '}out.push(s)}return out}};L.clear();this.us-=1600;this.lcds.push(L);return L}
 /* 128 x 64 monochrome OLED: drawing goes to a back buffer; display() shows it */
 newOLED(name){const W=128,H=64;const O={name,h:H,buf:new Uint8Array(W*H),shown:new Uint8Array(W*H),txt:[],txtShown:[],cx:0,cy:0,ts:1,tc:1,inv:0,on:false,sim:this,
  begin(){this.on=true;this.sim.us+=20000;return 1},clear(){this.buf.fill(0);this.txt=[];this.cx=0;this.cy=0},show(){this.shown=this.buf.slice();this.txtShown=this.txt.slice();this.sim.us+=2500;this.sim.emit('oled')},
  setCursor(x,y){this.cx=x|0;this.cy=y|0},px(x,y,c){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;if(c===2)this.buf[y*W+x]^=1;else this.buf[y*W+x]=c?1:0},
  line(x0,y0,x1,y1,c){x0|=0;y0|=0;x1|=0;y1|=0;const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let er=dx+dy;for(let k=0;k<4096;k++){this.px(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}},
  rect(x,y,w,h,c,f){if(f){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.px(x+i,y+j,c)}else{this.line(x,y,x+w-1,y,c);this.line(x,y+h-1,x+w-1,y+h-1,c);this.line(x,y,x,y+h-1,c);this.line(x+w-1,y,x+w-1,y+h-1,c)}},
  circ(x0,y0,r,c,f){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=x*x+y*y;if(f?d<=r*r+r:Math.abs(Math.sqrt(d)-r)<0.5)this.px(x0+x,y0+y,c)}},
  tri(x0,y0,x1,y1,x2,y2,c,f){this.line(x0,y0,x1,y1,c);this.line(x1,y1,x2,y2,c);this.line(x2,y2,x0,y0,c);if(f){const mnx=Math.min(x0,x1,x2),mxx=Math.max(x0,x1,x2),mny=Math.min(y0,y1,y2),mxy=Math.max(y0,y1,y2);const s=(ax,ay,bx,by,px,py)=>(bx-ax)*(py-ay)-(by-ay)*(px-ax);for(let y=mny;y<=mxy;y++)for(let x=mnx;x<=mxx;x++){const a=s(x0,y0,x1,y1,x,y),b=s(x1,y1,x2,y2,x,y),d=s(x2,y2,x0,y0,x,y);if((a>=0&&b>=0&&d>=0)||(a<=0&&b<=0&&d<=0))this.px(x,y,c)}}},
  /* text is kept as runs of characters, 6 x 8 pixels per character at size 1 */
  print(s){s=String(s);let run='';const flush=()=>{if(run){this.txt.push({x:this.cx-run.length*6*this.ts,y:this.cy,s:run,z:this.ts,c:this.tc});run=''}};for(const ch of s){if(ch==='\n'){flush();this.cx=0;this.cy+=8*this.ts;continue}if(ch==='\r')continue;if(this.cx+6*this.ts>W){flush();this.cx=0;this.cy+=8*this.ts}run+=ch;this.cx+=6*this.ts}flush();this.sim.us+=20*s.length;return s.length}};
  this.oleds=this.oleds||[];this.oleds.push(O);return O}
 warn(l,m){if(this.events.some(e=>e.msg===m))return;this.events.push({line:l,msg:m});this.emit('warn')}
 emit(k){this.dirty=true}
 watch(){try{return this.m.watch()}catch(e){return[]}}
}
const api={compile,Sim,lex,PWM,tname};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.INO=api;
})(typeof window!=='undefined'?window:globalThis);
