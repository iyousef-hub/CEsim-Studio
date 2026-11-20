/* CEsim Python: a small Python 3 interpreter for Raspberry Pi programs on the breadboard.
   It runs step by step against simulated time, so time.sleep() and loops that never end are fine.
   Supported: the usual statements and expressions, functions, lists, tuples, dicts, f-strings,
   time, random, math, RPi.GPIO (with PWM) and gpiozero (LED, PWMLED, Button, Buzzer, ...). */
(function(root){
'use strict';
class PyErr extends Error{constructor(type,msg,line){super(msg);this.type=type;this.line=line}}
class Flt{constructor(v){this.v=v}}
const isF=x=>x instanceof Flt,nv=x=>x instanceof Flt?x.v:x===true?1:x===false?0:x;
class Tup extends Array{}
const tup=a=>{const t=new Tup();t.push(...a);return t};
class PyDict{constructor(){this.m=new Map()}key(k){return typeof k==='object'&&k!==null?(isF(k)?'f'+k.v:JSON.stringify(k)):typeof k+':'+k}get(k){const e=this.m.get(this.key(k));return e?e[1]:undefined}set(k,v){this.m.set(this.key(k),[k,v])}has(k){return this.m.has(this.key(k))}del(k){this.m.delete(this.key(k))}keys(){return[...this.m.values()].map(e=>e[0])}vals(){return[...this.m.values()].map(e=>e[1])}}
class PyObj{constructor(cls,attrs){this.cls=cls;Object.assign(this,attrs||{})}}
/* ---------------- lexer ---------------- */
const KW=new Set(['False','None','True','and','as','assert','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield']);
function lex(src){const toks=[];const lines=String(src).replace(/\r\n?/g,'\n').replace(/\t/g,'    ').split('\n');const ind=[0];let depth=0;let i=0;
 const push=(t,v,line)=>toks.push({t,v,line});
 let buf=null;// continued logical line
 for(let ln=0;ln<lines.length;ln++){let s=lines[ln];const line=ln+1;let p=0;
  if(depth===0&&!buf){const m=s.match(/^ */)[0].length;const rest=s.slice(m);if(!rest.trim()||rest.trim()[0]==='#')continue;
   if(m>ind[ind.length-1]){ind.push(m);push('INDENT',null,line)}else{while(m<ind[ind.length-1]){ind.pop();push('DEDENT',null,line)}if(m!==ind[ind.length-1])throw new PyErr('IndentationError','unindent does not match any outer indentation level',line)}p=m}
  buf=null;
  while(p<s.length){const c=s[p];
   if(c===' '){p++;continue}if(c==='#')break;
   if(c==='\\'&&p===s.length-1){buf=true;p++;break}
   let m;
   if((m=/^(\d[\d_]*\.?[\d_]*(?:[eE][-+]?\d+)?|\.\d[\d_]*(?:[eE][-+]?\d+)?|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)/.exec(s.slice(p)))){const t=m[0].replace(/_/g,'');let v;if(/^0[xX]/.test(t))v=parseInt(t,16);else if(/^0[bB]/.test(t))v=parseInt(t.slice(2),2);else if(/^0[oO]/.test(t))v=parseInt(t.slice(2),8);else if(/[.eE]/.test(t))v=new Flt(parseFloat(t));else v=parseInt(t,10);push('NUM',v,line);p+=m[0].length;continue}
   if((m=/^([rRbBfF]{0,2})("""|'''|"|')/.exec(s.slice(p)))&&(m[1]===''||/^[rRbBfF]+$/.test(m[1]))&&(p===0||!/[A-Za-z0-9_]/.test(s[p-1])||m[1])){const pre=m[1].toLowerCase(),q=m[2];p+=m[0].length;let out='';let raw=pre.includes('r');
    for(;;){if(p>=s.length){if(q.length===3){out+='\n';ln++;if(ln>=lines.length)throw new PyErr('SyntaxError','the string is not closed',line);s=lines[ln];p=0;continue}throw new PyErr('SyntaxError','the string is not closed',line)}
     if(s.startsWith(q,p)){p+=q.length;break}const ch=s[p];
     if(ch==='\\'&&!raw){const n=s[p+1];const E={n:'\n',t:'\t','\\':'\\',"'":"'",'"':'"',r:'\r','0':'\0'};if(n===undefined){p++;continue}out+=E[n]!=null?E[n]:'\\'+n;p+=2;continue}
     out+=ch;p++}
    push(pre.includes('f')?'FSTR':'STR',out,line);continue}
   if((m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(p)))){push(KW.has(m[0])?'KW':'NAME',m[0],line);p+=m[0].length;continue}
   if((m=/^(\*\*=|\/\/=|>>=|<<=|\*\*|\/\/|>>|<<|<=|>=|==|!=|->|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|:=|[-+*\/%<>=()\[\]{}:,.;@&|^~])/.exec(s.slice(p)))){const o=m[0];if('([{'.includes(o))depth++;if(')]}'.includes(o))depth=Math.max(0,depth-1);push('OP',o,line);p+=o.length;continue}
   throw new PyErr('SyntaxError',`unexpected character "${c}"`,line)}
  if(depth===0&&!buf)push('NL',null,line)}
 while(ind.length>1){ind.pop();push('DEDENT',null,lines.length)}push('EOF',null,lines.length);return toks}
/* ---------------- parser ---------------- */
function parse(src){const T=lex(src);let i=0;const pk=(o=0)=>T[i+o];const nx=()=>T[i++];
 const is=(t,v)=>{const k=T[i];return k.t===t&&(v===undefined||k.v===v)};const isOp=v=>is('OP',v),isKw=v=>is('KW',v);
 const err=(msg,tk)=>{tk=tk||T[i];throw new PyErr('SyntaxError',msg,tk.line)};
 const eat=(t,v)=>{if(!is(t,v))err(v?`expected "${v}"`:`expected ${t==='NAME'?'a name':t}`);return nx()};
 const block=()=>{eat('OP',':');if(is('NL')){nx();eat('INDENT');const b=[];while(!is('DEDENT')&&!is('EOF'))b.push(...stmt());eat('DEDENT');return b}return simple()};
 function simple(){const out=[small()];while(isOp(';')){nx();if(is('NL'))break;out.push(small())}if(!is('EOF'))eat('NL');return out}
 function small(){const tk=pk(),line=tk.line;
  if(isKw('pass')){nx();return{k:'pass',line}}if(isKw('break')){nx();return{k:'break',line}}if(isKw('continue')){nx();return{k:'continue',line}}
  if(isKw('return')){nx();const v=is('NL')||isOp(';')?null:exprList();return{k:'return',v,line}}
  if(isKw('global')||isKw('nonlocal')){nx();const n=[eat('NAME').v];while(isOp(',')){nx();n.push(eat('NAME').v)}return{k:'global',n,line}}
  if(isKw('del')){nx();return{k:'del',t:exprList(),line}}
  if(isKw('raise')){nx();const v=is('NL')?null:expr();return{k:'raise',v,line}}
  if(isKw('assert')){nx();const c=expr();let m=null;if(isOp(',')){nx();m=expr()}return{k:'assert',c,m,line}}
  if(isKw('import')){nx();const n=[];do{if(n.length)nx();let mod=eat('NAME').v;while(isOp('.')){nx();mod+='.'+eat('NAME').v}let as=null;if(isKw('as')){nx();as=eat('NAME').v}n.push({mod,as})}while(isOp(','));return{k:'import',n,line}}
  if(isKw('from')){nx();let mod=eat('NAME').v;while(isOp('.')){nx();mod+='.'+eat('NAME').v}eat('KW','import');const n=[];if(isOp('*')){nx();n.push({name:'*'})}else{const par=isOp('(');if(par)nx();do{if(n.length)nx();if(par&&isOp(')'))break;const name=eat('NAME').v;let as=null;if(isKw('as')){nx();as=eat('NAME').v}n.push({name,as})}while(isOp(','));if(par)eat('OP',')')}return{k:'from',mod,n,line}}
  const e=exprList(true);
  if(isOp('=')){const targets=[e];let v;while(isOp('=')){nx();v=exprList(true);if(isOp('='))targets.push(v)}return{k:'assign',targets,v,line}}
  const aug=['+=','-=','*=','/=','//=','%=','**=','&=','|=','^=','>>=','<<='];if(is('OP')&&aug.includes(pk().v)){const op=nx().v.slice(0,-1);return{k:'aug',t:e,op,v:exprList(),line}}
  if(isOp(':')){nx();expr();let v=null;if(isOp('=')){nx();v=exprList()}return v?{k:'assign',targets:[e],v,line}:{k:'pass',line}}
  return{k:'expr',e,line}}
 function stmt(){const tk=pk(),line=tk.line;
  if(isKw('if')){nx();const c=expr();const b=block();const ow=[];let els=null;while(isKw('elif')){nx();const c2=expr();ow.push({c:c2,b:block()})}if(isKw('else')){nx();els=block()}
   let node={k:'if',c,b,e:els,line};for(let j=ow.length-1;j>=0;j--){node.e=node.e;}// chain elifs
   let tail=els;for(let j=ow.length-1;j>=0;j--)tail=[{k:'if',c:ow[j].c,b:ow[j].b,e:tail,line}];node.e=tail;return[node]}
  if(isKw('while')){nx();const c=expr();const b=block();let els=null;if(isKw('else')){nx();els=block()}return[{k:'while',c,b,els,line}]}
  if(isKw('for')){nx();const t=targetList();eat('KW','in');const it=exprList();const b=block();let els=null;if(isKw('else')){nx();els=block()}return[{k:'for',t,it,b,els,line}]}
  if(isKw('def')){nx();const name=eat('NAME').v;const params=paramList(')');if(isOp('->')){nx();expr()}const b=block();return[{k:'def',name,params,b,line}]}
  if(isOp('@')){nx();const d=expr();eat('NL');const s=stmt();s[0].deco=(s[0].deco||[]).concat([d]);return s}
  if(isKw('class')){nx();const name=eat('NAME').v;let bases=[];if(isOp('(')){nx();if(!isOp(')'))bases=exprListItems(')');eat('OP',')')}const b=block();return[{k:'class',name,bases,b,line}]}
  if(isKw('try')){nx();const b=block();const hs=[];let els=null,fin=null;while(isKw('except')){nx();let ty=null,as=null;if(!isOp(':')){ty=expr();if(isKw('as')){nx();as=eat('NAME').v}}hs.push({ty,as,b:block()})}if(isKw('else')){nx();els=block()}if(isKw('finally')){nx();fin=block()}return[{k:'try',b,hs,els,fin,line}]}
  if(isKw('with')){nx();const items=[];do{if(items.length)nx();const e=expr();let as=null;if(isKw('as')){nx();as=targetList()}items.push({e,as})}while(isOp(','));const b=block();return[{k:'with',items,b,line}]}
  return simple()}
 function paramList(close){eat('OP','(');const ps=[];while(!isOp(close)){let star='';if(isOp('*')||isOp('**')){star=nx().v;if(isOp(',')||isOp(close)){if(isOp(','))nx();continue}}const name=eat('NAME').v;if(isOp(':')){nx();expr()}let def=null;if(isOp('=')){nx();def=expr()}ps.push({name,def,star});if(!isOp(close))eat('OP',',')}eat('OP',close);return ps}
 function targetList(){const first=bitor();if(!isOp(','))return first;const items=[first];while(isOp(',')){nx();if(isKw('in')||isOp('='))break;items.push(bitor())}return{k:'tuple',items}}
 function exprListItems(close){const items=[];while(!isOp(close)){if(isOp('*')){nx();items.push({k:'star',v:expr()})}else items.push(expr());if(!isOp(close))eat('OP',',')}return items}
 function exprList(allowStar){const first=isOp('*')&&allowStar?(nx(),{k:'star',v:expr()}):expr();if(!isOp(','))return first;const items=[first];while(isOp(',')){nx();if(is('NL')||isOp('=')||isOp(')')||is('EOF')||isOp(';'))break;items.push(isOp('*')?(nx(),{k:'star',v:expr()}):expr())}return{k:'tuple',items}}
 function expr(){if(isKw('lambda')){nx();const ps=[];while(!isOp(':')){const name=eat('NAME').v;let def=null;if(isOp('=')){nx();def=expr()}ps.push({name,def,star:''});if(!isOp(':'))eat('OP',',')}eat('OP',':');const body=expr();return{k:'lambda',ps,body}}
  const a=orx();if(isKw('if')&&!isNewlineAhead()){nx();const c=orx();eat('KW','else');const b=expr();return{k:'ifx',c,a,b}}if(isOp(':=')){nx();return{k:'walrus',t:a,v:expr()}}return a}
 function isNewlineAhead(){return false}
 function orx(){let a=andx();while(isKw('or')){nx();a={k:'or',a,b:andx()}}return a}
 function andx(){let a=notx();while(isKw('and')){nx();a={k:'and',a,b:notx()}}return a}
 function notx(){if(isKw('not')){nx();return{k:'not',a:notx()}}return cmp()}
 function cmp(){const a=bitor();const ops=[],vs=[];for(;;){let op=null;if(is('OP')&&['<','>','==','>=','<=','!='].includes(pk().v))op=nx().v;else if(isKw('in')){nx();op='in'}else if(isKw('not')&&pk(1).t==='KW'&&pk(1).v==='in'){nx();nx();op='not in'}else if(isKw('is')){nx();if(isKw('not')){nx();op='is not'}else op='is'}if(!op)break;ops.push(op);vs.push(bitor())}return ops.length?{k:'cmp',a,ops,vs}:a}
 const binl=(next,ops)=>()=>{let a=next();while(is('OP')&&ops.includes(pk().v)){const op=nx().v;a={k:'bin',op,a,b:next()}}return a};
 const unary=()=>{if(is('OP')&&['-','+','~'].includes(pk().v)){const op=nx().v;return{k:'un',op,a:unary()}}return power()};
 const term=binl(unary,['*','/','//','%','@']),arith=binl(term,['+','-']),shift=binl(arith,['<<','>>']),band=binl(shift,['&']),bxor=binl(band,['^']);const bitor=binl(bxor,['|']);
 function power(){const a=primary();if(isOp('**')){nx();return{k:'bin',op:'**',a,b:unary()}}return a}
 function primary(){let a=atom();for(;;){if(isOp('(')){const line=nx().line;const args=[],kw=[];while(!isOp(')')){if(isOp('*')||isOp('**')){const st=nx().v;args.push({k:'star',v:expr(),dbl:st==='**'})}else if(is('NAME')&&pk(1).t==='OP'&&pk(1).v==='='){const n=nx().v;nx();kw.push({n,v:expr()})}else{const e=expr();if(isKw('for')){args.push(compr(e,')'));break}args.push(e)}if(!isOp(')'))eat('OP',',')}eat('OP',')');a={k:'call',f:a,args,kw,line};continue}
   if(isOp('[')){nx();const sl=sliceOrIndex();eat('OP',']');a={k:'idx',a,i:sl};continue}if(isOp('.')){nx();a={k:'attr',a,n:eat('NAME').v};continue}return a}}
 function sliceOrIndex(){const part=()=>isOp(':')||isOp(']')||isOp(',')?null:expr();const s=part();if(!isOp(':')){if(isOp(',')){const items=[s];while(isOp(',')){nx();if(isOp(']'))break;items.push(expr())}return{k:'tuple',items}}return s}nx();const e=part();let st=null;if(isOp(':')){nx();st=part()}return{k:'slice',s,e,st}}
 function compr(e,close){const gens=[];while(isKw('for')){nx();const t=targetList();eat('KW','in');const it=orx();const ifs=[];while(isKw('if')){nx();ifs.push(orx())}gens.push({t,it,ifs})}return{k:'comp',e,gens}}
 function atom(){const tk=pk();
  if(tk.t==='NUM'){nx();return{k:'const',v:tk.v}}
  if(tk.t==='STR'||tk.t==='FSTR'){const parts=[];while(is('STR')||is('FSTR')){const t=nx();parts.push(t.t==='FSTR'?fstr(t.v,t.line):{k:'const',v:t.v})}return parts.length===1?parts[0]:{k:'join',parts}}
  if(tk.t==='NAME'){nx();return{k:'name',n:tk.v,line:tk.line}}
  if(tk.t==='KW'){if(tk.v==='True'){nx();return{k:'const',v:true}}if(tk.v==='False'){nx();return{k:'const',v:false}}if(tk.v==='None'){nx();return{k:'const',v:null}}}
  if(isOp('(')){nx();if(isOp(')')){nx();return{k:'tuple',items:[]}}const e=isOp('*')?(nx(),{k:'star',v:expr()}):expr();if(isKw('for')){const c=compr(e);eat('OP',')');c.gen=true;return c}if(isOp(',')){const items=[e];while(isOp(',')){nx();if(isOp(')'))break;items.push(isOp('*')?(nx(),{k:'star',v:expr()}):expr())}eat('OP',')');return{k:'tuple',items}}eat('OP',')');return e}
  if(isOp('[')){nx();if(isOp(']')){nx();return{k:'list',items:[]}}const first=isOp('*')?(nx(),{k:'star',v:expr()}):expr();if(isKw('for')){const c=compr(first);eat('OP',']');return c}const items=[first];while(isOp(',')){nx();if(isOp(']'))break;items.push(isOp('*')?(nx(),{k:'star',v:expr()}):expr())}eat('OP',']');return{k:'list',items}}
  if(isOp('{')){nx();const keys=[],vals=[];let set=false;while(!isOp('}')){const kx=expr();if(isOp(':')){nx();keys.push(kx);vals.push(expr())}else{set=true;keys.push(kx)}if(isKw('for')){const c=compr(set?kx:{k:'tuple',items:[kx,vals[0]]});c.dict=!set;c.set=set;eat('OP','}');return c}if(!isOp('}'))eat('OP',',')}eat('OP','}');return set?{k:'list',items:keys,set:true}:{k:'dict',keys,vals}}
  err(tk.t==='NL'||tk.t==='EOF'?'the line ends too early':tk.t==='INDENT'?'unexpected indent':`unexpected "${tk.v}"`)}
 function fstr(s,line){const parts=[];let p=0,lit='';while(p<s.length){const c=s[p];if(c==='{'&&s[p+1]==='{'){lit+='{';p+=2;continue}if(c==='}'&&s[p+1]==='}'){lit+='}';p+=2;continue}
   if(c==='{'){if(lit){parts.push({k:'const',v:lit});lit=''}let d=1,q=p+1;while(q<s.length&&d){if(s[q]==='{')d++;else if(s[q]==='}')d--;if(d)q++}const inner=s.slice(p+1,q);let spec='',conv='';let body=inner;const cm=findTop(inner,':');if(cm>=0){spec=inner.slice(cm+1);body=inner.slice(0,cm)}const bm=/!(r|s|a)$/.exec(body);if(bm){conv=bm[1];body=body.slice(0,-2)}let selfDoc=false;if(/=\s*$/.test(body)&&!/[=!<>]=\s*$/.test(body)){selfDoc=true;body=body.replace(/=\s*$/,'')}
    const sub=parse(body.trim()+'\n');const ex=sub[0]&&sub[0].k==='expr'?sub[0].e:null;if(!ex)throw new PyErr('SyntaxError','bad expression in an f-string',line);if(selfDoc)parts.push({k:'const',v:body+'='});parts.push({k:'fmt',e:ex,spec:spec?fstr(spec,line):null,conv});p=q+1;continue}lit+=c;p++}
  if(lit)parts.push({k:'const',v:lit});return{k:'join',parts}}
 function findTop(s,ch){let d=0;for(let j=0;j<s.length;j++){const c=s[j];if('([{'.includes(c))d++;else if(')]}'.includes(c))d--;else if(c===ch&&!d&&s[j+1]!=='=')return j;else if((c==="'"||c==='"')){const e=s.indexOf(c,j+1);if(e>0)j=e}}return-1}
 const prog=[];while(!is('EOF')){if(is('NL')){nx();continue}if(is('INDENT'))err('unexpected indent');prog.push(...stmt())}return prog}
/* ---------------- values ---------------- */
const typeName=v=>v===null?'NoneType':typeof v==='boolean'?'bool':typeof v==='number'?'int':isF(v)?'float':typeof v==='string'?'str':v instanceof Tup?'tuple':Array.isArray(v)?'list':v instanceof PyDict?'dict':v instanceof Set?'set':v&&v.__fn?'function':v&&v.cls?v.cls.name:'object';
function repr(v){if(typeof v==='string')return v.includes("'")&&!v.includes('"')?'"'+v+'"':"'"+v.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')+"'";return str(v)}
function fmtFloat(x){if(!isFinite(x))return x>0?'inf':x<0?'-inf':'nan';if(Number.isInteger(x)&&Math.abs(x)<1e16)return x.toFixed(1);let s=String(x);if(/e/.test(s)){s=s.replace(/e\+?/,'e+').replace(/e\+-/,'e-');const m=s.match(/e([+-])(\d+)$/);if(m&&m[2].length<2)s=s.replace(/e([+-])(\d)$/,'e$10$2')}return s}
function str(v){if(v===null||v===undefined)return'None';if(v===true)return'True';if(v===false)return'False';if(typeof v==='number')return String(v);if(isF(v))return fmtFloat(v.v);if(typeof v==='string')return v;
 if(v instanceof Tup)return'('+v.map(repr).join(', ')+(v.length===1?',':'')+')';if(Array.isArray(v))return'['+v.map(repr).join(', ')+']';if(v instanceof PyDict)return'{'+v.keys().map(k=>repr(k)+': '+repr(v.get(k))).join(', ')+'}';if(v instanceof Set)return v.size?'{'+[...v].map(repr).join(', ')+'}':'set()';
 if(v&&v.__fn)return`<function ${v.name}>`;if(v&&v.cls&&v.cls.__str)return v.cls.__str(v);if(v instanceof PyErr)return v.message;if(v&&v.cls)return`<${v.cls.name} object>`;if(v&&v.__mod)return`<module '${v.__mod}'>`;return String(v)}
const truth=v=>v===null||v===undefined?false:typeof v==='boolean'?v:typeof v==='number'?v!==0:isF(v)?v.v!==0:typeof v==='string'||Array.isArray(v)?v.length>0:v instanceof PyDict?v.m.size>0:v instanceof Set?v.size>0:v&&v.cls&&v.cls.__bool?v.cls.__bool(v):true;
const isNum=v=>typeof v==='number'||typeof v==='boolean'||isF(v);
function num(v,what){if(typeof v==='number')return v;if(typeof v==='boolean')return v?1:0;if(isF(v))return v.v;throw new PyErr('TypeError',`${what||'a number'} was expected, not ${typeName(v)}`)}
const mk=(x,flt)=>flt?new Flt(x):x;
function eq(a,b){if(isNum(a)&&isNum(b))return nv(a)===nv(b);if(typeof a==='string'||typeof b==='string')return a===b;if(a===null||b===null)return a===b;if(Array.isArray(a)&&Array.isArray(b))return(a instanceof Tup)===(b instanceof Tup)&&a.length===b.length&&a.every((x,i)=>eq(x,b[i]));if(a instanceof PyDict&&b instanceof PyDict)return a.m.size===b.m.size&&a.keys().every(k=>b.has(k)&&eq(a.get(k),b.get(k)));return a===b}
function lt(a,b){if(isNum(a)&&isNum(b))return nv(a)<nv(b);if(typeof a==='string'&&typeof b==='string')return a<b;if(Array.isArray(a)&&Array.isArray(b)){for(let i=0;i<Math.min(a.length,b.length);i++){if(eq(a[i],b[i]))continue;return lt(a[i],b[i])}return a.length<b.length}throw new PyErr('TypeError',`'<' is not supported between ${typeName(a)} and ${typeName(b)}`)}
function binop(op,a,b){
 if(op==='+'){if(typeof a==='string'&&typeof b==='string')return a+b;if(Array.isArray(a)&&Array.isArray(b)){const r=a.concat(b);return a instanceof Tup?tup(r):r}}
 if(op==='*'){if(typeof a==='string'&&isNum(b)&&!isF(b))return a.repeat(Math.max(0,num(b)));if(typeof b==='string'&&isNum(a)&&!isF(a))return b.repeat(Math.max(0,num(a)));if(Array.isArray(a)&&isNum(b)){let r=[];for(let k=0;k<num(b);k++)r=r.concat(a);return a instanceof Tup?tup(r):r}}
 if(op==='%'&&typeof a==='string')return pctFormat(a,b);
 if(op==='|'&&a instanceof PyDict&&b instanceof PyDict){const d=new PyDict();for(const k of a.keys())d.set(k,a.get(k));for(const k of b.keys())d.set(k,b.get(k));return d}
 if(!isNum(a)||!isNum(b))throw new PyErr('TypeError',`unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`);
 const f=isF(a)||isF(b);const x=nv(a),y=nv(b);
 switch(op){case'+':return mk(x+y,f);case'-':return mk(x-y,f);case'*':return mk(x*y,f);case'/':if(y===0)throw new PyErr('ZeroDivisionError','division by zero');return new Flt(x/y);
  case'//':if(y===0)throw new PyErr('ZeroDivisionError','integer division or modulo by zero');return mk(Math.floor(x/y),f);case'%':if(y===0)throw new PyErr('ZeroDivisionError','integer division or modulo by zero');return mk(((x%y)+y)%y,f);
  case'**':{const r=Math.pow(x,y);return mk(r,f||y<0)}case'&':return x&y;case'|':return x|y;case'^':return x^y;case'<<':return x*Math.pow(2,y);case'>>':return Math.floor(x/Math.pow(2,y))}
 throw new PyErr('TypeError','unsupported operator '+op)}
function pctFormat(s,args){const a=args instanceof Tup?[...args]:[args];let k=0;return s.replace(/%([-+ 0#]*)(\d*)(?:\.(\d+))?([sdifrxXeEgc%])/g,(m,fl,w,pr,c)=>{if(c==='%')return'%';const v=a[k++];return fmtSpec(v,fl+(w||'')+(pr!=null?'.'+pr:'')+(c==='i'?'d':c==='r'?'':c),c==='r')})}
function fmtSpec(v,spec,useRepr){if(useRepr)return repr(v);const m=/^(?:(.)?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec||'');if(!m)return str(v);
 let[,fill,align,sign,,zero,width,grp,prec,type]=m;let s;
 if(type&&'eEfFgG%'.includes(type)||(prec!=null&&!type&&isNum(v))){const x=num(v);const p=prec!=null?+prec:6;if(type==='e'||type==='E'){s=x.toExponential(p).replace(/e([+-])(\d)$/,'e$10$2');if(type==='E')s=s.toUpperCase()}else if(type==='%')s=(x*100).toFixed(p)+'%';else if(type==='g'||type==='G')s=String(Number(x.toPrecision(p||1)));else s=x.toFixed(p)}
 else if(type==='d'||type==='n')s=String(Math.trunc(num(v)));else if(type==='x')s=(num(v)>>>0).toString(16);else if(type==='X')s=(num(v)>>>0).toString(16).toUpperCase();else if(type==='b')s=(num(v)>>>0).toString(2);else if(type==='o')s=(num(v)>>>0).toString(8);else if(type==='c')s=String.fromCharCode(num(v));
 else{s=str(v);if(prec!=null&&typeof v==='string')s=s.slice(0,+prec)}
 if(grp&&/^-?\d/.test(s)){const[ip,fp]=s.split('.');s=ip.replace(/\B(?=(\d{3})+(?!\d))/g,grp)+(fp!=null?'.'+fp:'')}
 if(sign==='+'&&isNum(v)&&num(v)>=0)s='+'+s;else if(sign===' '&&isNum(v)&&num(v)>=0)s=' '+s;
 const W=+width||0;if(s.length<W){if(zero&&!align){const neg=/^[-+ ]/.test(s)?s[0]:'';const body=neg?s.slice(1):s;s=neg+body.padStart(W-neg.length,'0')}else{const fc=fill||' ';const al=align||(isNum(v)?'>':'<');const n=W-s.length;s=al==='<'?s+fc.repeat(n):al==='^'?fc.repeat(Math.floor(n/2))+s+fc.repeat(Math.ceil(n/2)):fc.repeat(n)+s}}return s}
/* ---------------- runtime ---------------- */
class Ctl{constructor(k,v){this.k=k;this.v=v}}
const SLEEP=Symbol('sleep');
function compile(src){try{const ast=parse(src);return{ok:true,ast,errors:[],warnings:[]}}catch(e){if(e instanceof PyErr)return{ok:false,errors:[{line:e.line,msg:`${e.type}: ${e.message}`}],warnings:[]};return{ok:false,errors:[{line:0,msg:String(e.message||e)}],warnings:[]}}}
/* physical header pin -> BCM GPIO number (GPIO.BOARD mode) */
const PHYS={3:2,5:3,7:4,8:14,10:15,11:17,12:18,13:27,15:22,16:23,18:24,19:10,21:9,22:25,23:11,24:8,26:7,27:0,28:1,29:5,31:6,32:12,33:13,35:19,36:16,37:26,38:20,40:21};
class Sim{
 constructor(prog,opts){opts=opts||{};this.prog=prog;this.pins=[];for(let k=0;k<(opts.count||28);k++)this.pins.push({mode:0,v:0,pwm:-1,tone:0,touched:false});
  this.us=0;this.serial='';this.inbox=[];this.state='run';this.error=null;this.wake=0;this.events=[];this.listeners={};this.gpioMode=null;this.ops=0;this.seed=1234567;
  this.globals=new Map();this.setupBuiltins();this.gen=this.runModule(prog.ast)}
 on(ev,f){(this.listeners[ev]=this.listeners[ev]||[]).push(f)}emit(ev){for(const f of this.listeners[ev]||[])f()}
 warn(l,m){if(this.events.some(e=>e.msg===m))return;this.events.push({line:l,msg:m});this.emit('warn')}
 level(p){const s=this.pins[p];return s&&s.mode===1?s.v:0}
 pinOk(p){p=p|0;if(p<0||p>=this.pins.length)throw new PyErr('ValueError',`GPIO ${p} does not exist. The header has GPIO 0 to 27`);return p}
 send(t){this.inbox.push(String(t).replace(/\n$/,''))}
 out(s){this.serial+=s;if(this.serial.length>20000)this.serial=this.serial.slice(-15000);this.emit('serial')}
 rand(){this.seed=(this.seed*1103515245+12345)&0x7fffffff;return this.seed/0x7fffffff}
 /* run until the simulated time reaches 'until' (µs), or the step budget is used */
 run(until,budget){if(this.state!=='run'&&this.state!=='sleep'&&this.state!=='input')return;let n=(budget||25)*400;
  while(n-->0){if(this.state==='input'){if(!this.inbox.length){this.us=until;return}this.state='run';this.resume=this.inbox.shift();this.out(this.resume+'\n')}
   if(this.wake>this.us){if(this.wake>until){this.us=until;this.state='sleep';return}this.us=this.wake}this.state='run';
   let r;try{r=this.gen.next(this.resume);this.resume=undefined}catch(e){this.fail(e);return}
   if(r.done){this.state='done';this.out('');return}const y=r.value;
   if(y&&y.sleep!=null){this.wake=this.us+Math.max(0,y.sleep)*1e6}else if(y&&y.input){this.state='input';if(y.prompt)this.out(y.prompt);continue}else this.us+=0.5;
   if(this.us>=until)return}}
 fail(e){this.state='error';if(e instanceof PyErr){this.error={line:e.line||this.line,msg:`${e.type}: ${e.message}`}}else if(e instanceof Ctl){this.error={line:this.line,msg:`SyntaxError: '${e.k}' outside a loop or function`}}else this.error={line:this.line,msg:'Error: '+(e&&e.message||e)};this.out(`Traceback: line ${this.error.line}\n${this.error.msg}\n`)}
 *runModule(ast){const env={vars:this.globals,parent:null,glob:null};env.glob=env;yield*this.block(ast,env)}
 *block(b,env){for(const s of b){yield*this.exec(s,env)}}
 lookup(n,env,line){for(let e=env;e;e=e.parent){if(e.vars.has(n))return e.vars.get(n)}if(this.builtins.has(n))return this.builtins.get(n);throw new PyErr('NameError',`name '${n}' is not defined`,line)}
 setVar(n,v,env){if(env.globalNames&&env.globalNames.has(n)){env.glob.vars.set(n,v);return}env.vars.set(n,v)}
 *exec(s,env){this.line=s.line||this.line;this.ops++;if(this.ops%50===0)yield null;
  switch(s.k){
   case'expr':yield*this.ev(s.e,env);return;
   case'pass':return;
   case'assign':{const v=yield*this.ev(s.v,env);for(const t of s.targets)yield*this.assign(t,v,env);return}
   case'aug':{const cur=yield*this.ev(s.t,env);const v=yield*this.ev(s.v,env);let r;if(Array.isArray(cur)&&!(cur instanceof Tup)&&s.op==='+'){for(const x of this.iter(v))cur.push(x);r=cur}else r=binop(s.op,cur,v);yield*this.assign(s.t,r,env);return}
   case'if':{if(truth(yield*this.ev(s.c,env)))yield*this.block(s.b,env);else if(s.e)yield*this.block(s.e,env);return}
   case'while':{let broke=false;while(truth(yield*this.ev(s.c,env))){try{yield*this.block(s.b,env)}catch(c){if(c instanceof Ctl&&c.k==='break'){broke=true;break}if(c instanceof Ctl&&c.k==='continue'){yield null;continue}throw c}yield null}if(!broke&&s.els)yield*this.block(s.els,env);return}
   case'for':{const it=yield*this.ev(s.it,env);let broke=false;for(const x of this.iter(it)){yield*this.assign(s.t,x,env);try{yield*this.block(s.b,env)}catch(c){if(c instanceof Ctl&&c.k==='break'){broke=true;break}if(c instanceof Ctl&&c.k==='continue')continue;throw c}}if(!broke&&s.els)yield*this.block(s.els,env);return}
   case'break':case'continue':throw new Ctl(s.k);
   case'return':throw new Ctl('return',s.v?yield*this.ev(s.v,env):null);
   case'global':{env.globalNames=env.globalNames||new Set();if(env.parent)for(const n of s.n)env.globalNames.add(n);return}
   case'def':{let f=this.mkFunc(s.name,s.params,s.b,env);for(const d of (s.deco||[]).slice().reverse()){const dv=yield*this.ev(d,env);f=yield*this.call(dv,[f],{})}this.setVar(s.name,f,env);return}
   case'class':{const cenv={vars:new Map(),parent:env,glob:env.glob};yield*this.block(s.b,cenv);const cls={name:s.name,attrs:cenv.vars,__user:true};const bases=[];for(const b of s.bases)bases.push(yield*this.ev(b,env));cls.bases=bases;cls.__call=true;this.setVar(s.name,cls,env);return}
   case'import':for(const{mod,as}of s.n){const m=this.module(mod);if(as)this.setVar(as,m,env);else{const top=mod.split('.')[0];this.setVar(top,mod.includes('.')?this.module(top):m,env)}}return;
   case'from':{const m=this.module(s.mod);for(const{name,as}of s.n){if(name==='*'){for(const[k,v]of Object.entries(m))if(!k.startsWith('__'))this.setVar(k,v,env);continue}if(!(name in m))throw new PyErr('ImportError',`cannot import name '${name}' from '${s.mod}'`,s.line);this.setVar(as||name,m[name],env)}return}
   case'try':{try{try{yield*this.block(s.b,env)}catch(e){if(e instanceof Ctl)throw e;const pe=e instanceof PyErr?e:new PyErr('RuntimeError',String(e&&e.message||e));let h=null;for(const hh of s.hs){if(!hh.ty){h=hh;break}const ty=yield*this.ev(hh.ty,env);const tys=Array.isArray(ty)?ty:[ty];if(tys.some(t=>t&&(t.__exc===pe.type||t.__exc==='Exception'&&pe.type!=='KeyboardInterrupt'||t.__exc==='BaseException'))){h=hh;break}}
       if(!h)throw pe;if(h.as)this.setVar(h.as,pe,env);yield*this.block(h.b,env);return}if(s.els)yield*this.block(s.els,env)}finally{if(s.fin)yield*this.block(s.fin,env)}return}
   case'raise':{if(!s.v)throw new PyErr('RuntimeError','No active exception to reraise',s.line);const v=yield*this.ev(s.v,env);if(v instanceof PyErr)throw v;if(v&&v.__exc)throw new PyErr(v.__exc,'',s.line);throw new PyErr('TypeError','exceptions must derive from BaseException',s.line)}
   case'assert':{if(!truth(yield*this.ev(s.c,env)))throw new PyErr('AssertionError',s.m?str(yield*this.ev(s.m,env)):'',s.line);return}
   case'del':{const ts=s.t.k==='tuple'?s.t.items:[s.t];for(const t of ts){if(t.k==='name'){env.vars.delete(t.n)}else if(t.k==='idx'){const o=yield*this.ev(t.a,env);const i=yield*this.ev(t.i,env);if(o instanceof PyDict)o.del(i);else if(Array.isArray(o))o.splice(this.index(o,i),1)}}return}
   case'with':{const ctx=[];for(const it of s.items){const v=yield*this.ev(it.e,env);ctx.push(v);if(it.as)yield*this.assign(it.as,v&&v.__enter?v.__enter():v,env)}try{yield*this.block(s.b,env)}finally{for(const v of ctx)if(v&&v.__exit)v.__exit()}return}
  }throw new PyErr('SyntaxError','unknown statement',s.line)}
 index(o,i){let k=num(i,'an index');if(k<0)k+=o.length;if(k<0||k>=o.length)throw new PyErr('IndexError',`${typeName(o)} index out of range`);return k}
 *assign(t,v,env){switch(t.k){case'name':this.setVar(t.n,v,env);return;
   case'tuple':case'list':{const arr=[...this.iter(v)];const star=t.items.findIndex(x=>x.k==='star');if(star<0&&arr.length!==t.items.length)throw new PyErr('ValueError',`expected ${t.items.length} values to unpack, got ${arr.length}`);
    if(star<0){for(let k=0;k<t.items.length;k++)yield*this.assign(t.items[k],arr[k],env)}else{const after=t.items.length-star-1;for(let k=0;k<star;k++)yield*this.assign(t.items[k],arr[k],env);yield*this.assign(t.items[star].v,arr.slice(star,arr.length-after),env);for(let k=0;k<after;k++)yield*this.assign(t.items[star+1+k],arr[arr.length-after+k],env)}return}
   case'idx':{const o=yield*this.ev(t.a,env);const i=yield*this.ev(t.i,env);if(o instanceof PyDict){o.set(i,v);return}if(Array.isArray(o)&&!(o instanceof Tup)){if(i&&i.slice){const[a,b]=this.sliceRange(o,i);o.splice(a,Math.max(0,b-a),...this.iter(v));return}o[this.index(o,i)]=v;return}throw new PyErr('TypeError',`'${typeName(o)}' object does not support item assignment`)}
   case'attr':{const o=yield*this.ev(t.a,env);if(o&&o.__set&&o.__set(t.n,v))return;if(o&&typeof o==='object'){o[t.n]=v;if(o.attrs instanceof Map)o.attrs.set(t.n,v);return}throw new PyErr('AttributeError',`cannot set '${t.n}'`)}}
  throw new PyErr('SyntaxError','cannot assign to this')}
 *iter(v){if(Array.isArray(v)||typeof v==='string'){yield*v;return}if(v instanceof PyDict){yield*v.keys();return}if(v instanceof Set){yield*[...v];return}if(v&&v.__iter){yield*v.__iter();return}throw new PyErr('TypeError',`'${typeName(v)}' object is not iterable`)}
 sliceRange(o,sl){const n=o.length;const st=sl.st==null?1:sl.st;const fix=(x,d)=>{if(x==null)return d;x=num(x);if(x<0)x+=n;return Math.max(st<0?-1:0,Math.min(st<0?n-1:n,x))};return[fix(sl.s,st<0?n-1:0),fix(sl.e,st<0?-1:n),st]}
 mkFunc(name,params,body,env,isExpr){return{__fn:true,name,params,body,env,isExpr}}
 *call(f,args,kw){
  if(f&&f.__fn){const fenv={vars:new Map(),parent:f.env,glob:f.env.glob};let ai=0;
   for(const p of f.params){if(p.star==='*'){fenv.vars.set(p.name,tup(args.slice(ai)));ai=args.length;continue}if(p.star==='**'){const d=new PyDict();for(const k in kw)d.set(k,kw[k]);fenv.vars.set(p.name,d);continue}
    let v;if(ai<args.length)v=args[ai++];else if(p.name in kw)v=kw[p.name];else if(p.def)v=yield*this.ev(p.def,f.env);else throw new PyErr('TypeError',`${f.name}() missing required argument: '${p.name}'`);fenv.vars.set(p.name,v)}
   if(ai<args.length)throw new PyErr('TypeError',`${f.name}() takes ${f.params.length} arguments but ${args.length} were given`);
   if(f.isExpr)return yield*this.ev(f.body,fenv);
   this.depth=(this.depth||0)+1;if(this.depth>400){this.depth=0;throw new PyErr('RecursionError','maximum recursion depth exceeded')}
   try{yield*this.block(f.body,fenv)}catch(c){if(c instanceof Ctl&&c.k==='return')return c.v;throw c}finally{this.depth--}return null}
  if(f&&f.__user){const o=new PyObj({name:f.name,user:f});o.attrs=new Map();const init=this.classAttr(f,'__init__');if(init)yield*this.call(init,[o,...args],kw);return o}
  if(f&&f.__bound){return yield*this.call(f.f,[f.self,...args],kw)}
  if(typeof f==='function'){const r=f.call(this,args,kw);if(r&&r[SLEEP]!=null){yield{sleep:r[SLEEP]};return r.v===undefined?null:r.v}if(r&&r.__input){const v=yield{input:true,prompt:r.prompt};return v}if(r&&r.__gen){return yield*r.__gen}return r===undefined?null:r}
  if(f&&f.__exc){return new PyErr(f.__exc,args.length?str(args[0]):'')}
  throw new PyErr('TypeError',`'${typeName(f)}' object is not callable`)}
 classAttr(cls,n){if(cls.attrs&&cls.attrs.has(n))return cls.attrs.get(n);for(const b of cls.bases||[]){const r=this.classAttr(b,n);if(r)return r}return null}
 getAttr(o,n){if(o&&o.cls&&o.cls.user){if(o.attrs.has(n))return o.attrs.get(n);const m=this.classAttr(o.cls.user,n);if(m)return m.__fn?{__bound:true,f:m,self:o}:m;throw new PyErr('AttributeError',`'${o.cls.name}' object has no attribute '${n}'`)}
  if(o&&o.__get){const r=o.__get(n);if(r!==undefined)return r}
  if(o&&typeof o==='object'&&!Array.isArray(o)&&!(o instanceof PyDict)&&!(o instanceof Set)&&!isF(o)&&n in o&&!n.startsWith('__'))return o[n];
  const m=this.method(o,n);if(m)return m;throw new PyErr('AttributeError',`'${typeName(o)}' object has no attribute '${n}'`)}
 method(o,n){const S=this;const f=fn=>fn;
  if(typeof o==='string'){const M={upper:()=>o.toUpperCase(),lower:()=>o.toLowerCase(),strip:a=>a[0]!=null?o.replace(new RegExp('^['+esc(a[0])+']+|['+esc(a[0])+']+$','g'),''):o.trim(),lstrip:()=>o.replace(/^\s+/,''),rstrip:()=>o.replace(/\s+$/,''),
    split:a=>{const r=a[0]==null?o.trim().split(/\s+/).filter(x=>x!==''):o.split(a[0]);return a[1]!=null&&a[0]!=null?[...r.slice(0,a[1]),r.slice(a[1]).join(a[0])].filter((x,i)=>i<=a[1]):r},join:a=>[...S.iter(a[0])].map(x=>{if(typeof x!=='string')throw new PyErr('TypeError','join() needs strings');return x}).join(o),
    replace:a=>o.split(a[0]).join(a[1]),startswith:a=>o.startsWith(a[0]),endswith:a=>o.endsWith(a[0]),find:a=>o.indexOf(a[0]),index:a=>{const k=o.indexOf(a[0]);if(k<0)throw new PyErr('ValueError','substring not found');return k},count:a=>o.split(a[0]).length-1,
    format:(a,kw)=>{let k=0;return o.replace(/\{\{|\}\}|\{([^{}]*)\}/g,(m,inner)=>{if(m==='{{')return'{';if(m==='}}')return'}';const ci=inner.indexOf(':');const key=ci>=0?inner.slice(0,ci):inner;const spec=ci>=0?inner.slice(ci+1):'';const v=key===''?a[k++]:/^\d+$/.test(key)?a[+key]:kw[key];return fmtSpec(v,spec)})},
    isdigit:()=>/^\d+$/.test(o),isalpha:()=>/^[A-Za-z]+$/.test(o),title:()=>o.replace(/\b\w/g,c=>c.toUpperCase()),capitalize:()=>o.charAt(0).toUpperCase()+o.slice(1).toLowerCase(),center:a=>{const w=a[0];const n=Math.max(0,w-o.length);return' '.repeat(Math.floor(n/2))+o+' '.repeat(Math.ceil(n/2))},
    zfill:a=>o.padStart(a[0],'0'),ljust:a=>o.padEnd(a[0],a[1]||' '),rjust:a=>o.padStart(a[0],a[1]||' '),encode:()=>o};if(M[n])return f(M[n])}
  if(Array.isArray(o)){const M={append:a=>{o.push(a[0])},extend:a=>{for(const x of S.iter(a[0]))o.push(x)},pop:a=>{if(!o.length)throw new PyErr('IndexError','pop from empty list');return a.length?o.splice(S.index(o,a[0]),1)[0]:o.pop()},insert:a=>{let k=num(a[0]);if(k<0)k+=o.length;o.splice(Math.max(0,k),0,a[1])},
    remove:a=>{const k=o.findIndex(x=>eq(x,a[0]));if(k<0)throw new PyErr('ValueError','list.remove(x): x not in list');o.splice(k,1)},index:a=>{const k=o.findIndex(x=>eq(x,a[0]));if(k<0)throw new PyErr('ValueError',`${repr(a[0])} is not in list`);return k},count:a=>o.filter(x=>eq(x,a[0])).length,
    sort:(a,kw)=>{sortArr(S,o,kw)},reverse:()=>{o.reverse()},clear:()=>{o.length=0},copy:()=>o.slice()};if(M[n])return f(M[n])}
  if(o instanceof PyDict){const M={get:a=>o.has(a[0])?o.get(a[0]):a.length>1?a[1]:null,keys:()=>o.keys(),values:()=>o.vals(),items:()=>o.keys().map(k=>tup([k,o.get(k)])),pop:a=>{const v=o.has(a[0])?o.get(a[0]):a[1];o.del(a[0]);return v},update:a=>{const d=a[0];for(const k of d.keys())o.set(k,d.get(k))},setdefault:a=>{if(!o.has(a[0]))o.set(a[0],a[1]===undefined?null:a[1]);return o.get(a[0])},clear:()=>{o.m.clear()},copy:()=>{const d=new PyDict();for(const k of o.keys())d.set(k,o.get(k));return d}};if(M[n])return f(M[n])}
  if(o instanceof Set){const M={add:a=>{o.add(a[0])},remove:a=>{o.delete(a[0])},discard:a=>{o.delete(a[0])}};if(M[n])return f(M[n])}
  if(isNum(o)&&n==='is_integer')return()=>Number.isInteger(nv(o));
  return null}
 *ev(e,env){switch(e.k){
   case'const':return e.v;
   case'name':return this.lookup(e.n,env,e.line);
   case'join':{let s='';for(const p of e.parts)s+=p.k==='const'?p.v:yield*this.ev(p,env);return s}
   case'fmt':{const v=yield*this.ev(e.e,env);const spec=e.spec?yield*this.ev(e.spec,env):'';return e.conv==='r'?repr(v):fmtSpec(v,spec)}
   case'tuple':{const r=[];for(const x of e.items){if(x.k==='star')r.push(...this.iter(yield*this.ev(x.v,env)));else r.push(yield*this.ev(x,env))}return tup(r)}
   case'list':{const r=[];for(const x of e.items){if(x.k==='star')r.push(...this.iter(yield*this.ev(x.v,env)));else r.push(yield*this.ev(x,env))}if(e.set){const s=new Set();for(const x of r)s.add(x);return s}return r}
   case'dict':{const d=new PyDict();for(let k=0;k<e.keys.length;k++)d.set(yield*this.ev(e.keys[k],env),yield*this.ev(e.vals[k],env));return d}
   case'comp':{const out=[];const cenv={vars:new Map(),parent:env,glob:env.glob};const self=this;
    function*loop(g){if(g>=e.gens.length){const v=yield*self.ev(e.e,cenv);out.push(v);return}const G=e.gens[g];for(const x of self.iter(yield*self.ev(G.it,g?cenv:env))){yield*self.assign(G.t,x,cenv);let ok=true;for(const c of G.ifs)if(!truth(yield*self.ev(c,cenv))){ok=false;break}if(ok)yield*loop(g+1)}}
    yield*loop(0);if(e.dict){const d=new PyDict();for(const t of out)d.set(t[0],t[1]);return d}if(e.set)return new Set(out);return out}
   case'lambda':return this.mkFunc('<lambda>',e.ps,e.body,env,true);
   case'ifx':return truth(yield*this.ev(e.c,env))?yield*this.ev(e.a,env):yield*this.ev(e.b,env);
   case'walrus':{const v=yield*this.ev(e.v,env);yield*this.assign(e.t,v,env);return v}
   case'or':{const a=yield*this.ev(e.a,env);return truth(a)?a:yield*this.ev(e.b,env)}
   case'and':{const a=yield*this.ev(e.a,env);return truth(a)?yield*this.ev(e.b,env):a}
   case'not':return!truth(yield*this.ev(e.a,env));
   case'un':{const a=yield*this.ev(e.a,env);if(e.op==='-')return mk(-num(a),isF(a));if(e.op==='+')return a;return~num(a)}
   case'bin':{const a=yield*this.ev(e.a,env),b=yield*this.ev(e.b,env);if(a&&a.cls&&a.cls.user){const m=this.classAttr(a.cls.user,{'+':'__add__','-':'__sub__','*':'__mul__'}[e.op]);if(m)return yield*this.call(m,[a,b],{})}return binop(e.op,a,b)}
   case'cmp':{let a=yield*this.ev(e.a,env);for(let k=0;k<e.ops.length;k++){const b=yield*this.ev(e.vs[k],env);const op=e.ops[k];let r;
     switch(op){case'==':r=eq(a,b);break;case'!=':r=!eq(a,b);break;case'<':r=lt(a,b);break;case'>':r=lt(b,a);break;case'<=':r=!lt(b,a);break;case'>=':r=!lt(a,b);break;
      case'in':case'not in':{let h;if(typeof b==='string')h=b.includes(a);else if(b instanceof PyDict)h=b.has(a);else if(b instanceof Set)h=[...b].some(x=>eq(x,a));else h=[...this.iter(b)].some(x=>eq(x,a));r=op==='in'?h:!h;break}
      case'is':r=a===b||(a===null&&b===null);break;case'is not':r=!(a===b);break}
     if(!r)return false;a=b}return true}
   case'attr':{const o=yield*this.ev(e.a,env);return this.getAttr(o,e.n)}
   case'idx':{const o=yield*this.ev(e.a,env);if(e.i.k==='slice'){const sl={s:e.i.s?yield*this.ev(e.i.s,env):null,e:e.i.e?yield*this.ev(e.i.e,env):null,st:e.i.st?num(yield*this.ev(e.i.st,env)):null};const[a,b,st]=this.sliceRange(o,sl);const r=[];if(st>0)for(let k=a;k<b;k+=st)r.push(o[k]);else for(let k=a;k>b;k+=st)r.push(o[k]);return typeof o==='string'?r.join(''):o instanceof Tup?tup(r):r}
    const i=yield*this.ev(e.i,env);if(o instanceof PyDict){if(!o.has(i))throw new PyErr('KeyError',repr(i),e.line);return o.get(i)}if(typeof o==='string'||Array.isArray(o))return o[this.index(o,i)];if(o&&o.__getitem)return o.__getitem(i);throw new PyErr('TypeError',`'${typeName(o)}' object is not subscriptable`)}
   case'call':{const f=yield*this.ev(e.f,env);const args=[],kw={};for(const a of e.args){if(a.k==='star'){const v=yield*this.ev(a.v,env);if(a.dbl){for(const k of v.keys())kw[k]=v.get(k)}else args.push(...this.iter(v))}else if(a.k==='comp'&&!a.dict){args.push(yield*this.ev(a,env))}else args.push(yield*this.ev(a,env))}for(const k of e.kw)kw[k.n]=yield*this.ev(k.v,env);
    const ln=this.line;this.line=e.line||ln;const r=yield*this.call(f,args,kw);this.line=ln;return r}
  }throw new PyErr('SyntaxError','unknown expression '+e.k)}
 /* ---------- built-ins and modules ---------- */
 setupBuiltins(){const S=this;const B=this.builtins=new Map();const sleep=s=>({[SLEEP]:s});
  const exc=n=>({__exc:n,name:n});for(const n of['Exception','BaseException','ValueError','TypeError','KeyError','IndexError','ZeroDivisionError','NameError','RuntimeError','KeyboardInterrupt','AttributeError','StopIteration','AssertionError','OSError','ImportError'])B.set(n,exc(n));
  B.set('print',(a,kw)=>{S.out(a.map(str).join(kw.sep!=null?kw.sep:' ')+(kw.end!=null?kw.end:'\n'))});
  B.set('input',a=>({__input:true,prompt:a[0]!=null?str(a[0]):''}));
  B.set('range',a=>{const n=a.map(x=>num(x));let[s,e,st]=n.length===1?[0,n[0],1]:[n[0],n[1],n[2]||1];if(!st)throw new PyErr('ValueError','range() arg 3 must not be zero');const r=[];if(Math.abs((e-s)/st)>2e6)throw new PyErr('MemoryError','range too large');if(st>0)for(let k=s;k<e;k+=st)r.push(k);else for(let k=s;k>e;k+=st)r.push(k);return tup(r)});
  B.set('len',a=>{const o=a[0];if(typeof o==='string'||Array.isArray(o))return o.length;if(o instanceof PyDict)return o.m.size;if(o instanceof Set)return o.size;throw new PyErr('TypeError',`object of type '${typeName(o)}' has no len()`)});
  B.set('int',a=>{const v=a[0];if(v===undefined)return 0;if(typeof v==='string'){const base=a[1]!=null?num(a[1]):10;const t=v.trim().replace(/_/g,'');const x=base===10?(/^[-+]?\d+$/.test(t)?parseInt(t,10):NaN):parseInt(t.replace(/^0[xbo]/i,''),base);if(isNaN(x))throw new PyErr('ValueError',`invalid literal for int() with base ${base}: ${repr(v)}`);return x}return Math.trunc(num(v))});
  B.set('float',a=>{const v=a[0];if(v===undefined)return new Flt(0);if(typeof v==='string'){const x=parseFloat(v);if(isNaN(x)&&!/nan/i.test(v))throw new PyErr('ValueError',`could not convert string to float: ${repr(v)}`);return new Flt(/inf/i.test(v)?(v.trim()[0]==='-'?-Infinity:Infinity):x)}return new Flt(num(v))});
  B.set('str',a=>a.length?str(a[0]):'');B.set('repr',a=>repr(a[0]));B.set('bool',a=>truth(a[0]));
  B.set('abs',a=>mk(Math.abs(num(a[0])),isF(a[0])));
  B.set('round',a=>{const x=num(a[0]);if(a[1]==null||a[1]===null){const r=Math.round(x);return Math.abs(x%1)===0.5?(r%2?r-1:r):r}const p=Math.pow(10,num(a[1]));return new Flt(Math.round(x*p)/p)});
  const mm=(a,kw,mx)=>{const xs=a.length===1?[...S.iter(a[0])]:a;if(!xs.length){if('default'in kw)return kw.default;throw new PyErr('ValueError','arg is an empty sequence')}let best=xs[0];for(const x of xs.slice(1))if(mx?lt(best,x):lt(x,best))best=x;return best};
  B.set('min',(a,kw)=>mm(a,kw,false));B.set('max',(a,kw)=>mm(a,kw,true));
  B.set('sum',a=>{let s=a[1]!=null?a[1]:0;for(const x of S.iter(a[0]))s=binop('+',s,x);return s});
  B.set('list',a=>a.length?[...S.iter(a[0])]:[]);B.set('tuple',a=>tup(a.length?[...S.iter(a[0])]:[]));B.set('set',a=>new Set(a.length?[...S.iter(a[0])]:[]));
  B.set('dict',(a,kw)=>{const d=new PyDict();if(a[0])for(const p of S.iter(a[0]))d.set(p[0],p[1]);for(const k in kw)d.set(k,kw[k]);return d});
  B.set('sorted',(a,kw)=>{const r=[...S.iter(a[0])];sortArr(S,r,kw);return r});B.set('reversed',a=>[...S.iter(a[0])].reverse());
  B.set('enumerate',a=>{const s=a[1]?num(a[1]):0;return[...S.iter(a[0])].map((x,k)=>tup([k+s,x]))});
  B.set('zip',a=>{const ls=a.map(x=>[...S.iter(x)]);const n=Math.min(...ls.map(l=>l.length));const r=[];for(let k=0;k<n;k++)r.push(tup(ls.map(l=>l[k])));return r});
  B.set('map',a=>{const f=a[0];const ls=a.slice(1).map(x=>[...S.iter(x)]);const n=Math.min(...ls.map(l=>l.length));return{__gen:(function*(){const r=[];for(let k=0;k<n;k++)r.push(yield*S.call(f,ls.map(l=>l[k]),{}));return r})()}});
  B.set('filter',a=>{const f=a[0];const l=[...S.iter(a[1])];return{__gen:(function*(){const r=[];for(const x of l)if(truth(f===null?x:yield*S.call(f,[x],{})))r.push(x);return r})()}});
  B.set('any',a=>[...S.iter(a[0])].some(truth));B.set('all',a=>[...S.iter(a[0])].every(truth));
  B.set('chr',a=>String.fromCharCode(num(a[0])));B.set('ord',a=>String(a[0]).charCodeAt(0));B.set('hex',a=>(num(a[0])<0?'-0x':'0x')+Math.abs(num(a[0])).toString(16));B.set('bin',a=>(num(a[0])<0?'-0b':'0b')+Math.abs(num(a[0])).toString(2));
  B.set('divmod',a=>tup([binop('//',a[0],a[1]),binop('%',a[0],a[1])]));B.set('pow',a=>binop('**',a[0],a[1]));
  B.set('isinstance',a=>{const t=a[1];const ts=Array.isArray(t)?t:[t];return ts.some(x=>x&&(x.__type===typeName(a[0])||(x.__type==='int'&&typeName(a[0])==='bool')||(x.__user&&a[0]&&a[0].cls&&a[0].cls.user===x)))});
  for(const t of['int','float','str','bool','list','tuple','dict','set'])B.get(t).__type=t;
  B.set('type',a=>({__type:typeName(a[0]),name:typeName(a[0])}));
  B.set('id',a=>1);B.set('hash',a=>0);B.set('callable',a=>!!(a[0]&&(a[0].__fn||typeof a[0]==='function')));
  B.set('exit',()=>{throw new PyErr('SystemExit','')});B.set('quit',B.get('exit'));
  this.sleep=sleep}
 module(name){const S=this;if(!this.mods)this.mods={};if(this.mods[name])return this.mods[name];const sleep=this.sleep;let m=null;
  const pinOf=p=>{p=num(p,'a pin number');if(S.gpioMode==='BOARD'){const g=PHYS[p];if(g==null)throw new PyErr('ValueError',`header pin ${p} is not a GPIO pin (it is power or ground)`);return g}return S.pinOk(p)};
  const pins=a=>Array.isArray(a)?a.map(pinOf):[pinOf(a)];
  switch(name){
   case'time':m={__mod:'time',sleep:a=>sleep(num(a[0])),time:()=>new Flt(1.7e9+S.us/1e6),monotonic:()=>new Flt(S.us/1e6),perf_counter:()=>new Flt(S.us/1e6),time_ns:()=>Math.round(S.us*1000),sleep_ms:a=>sleep(num(a[0])/1000),sleep_us:a=>sleep(num(a[0])/1e6),ticks_ms:()=>Math.floor(S.us/1000),strftime:a=>{const t=Math.floor(S.us/1e6);return String(a[0]).replace('%H',String(Math.floor(t/3600)%24).padStart(2,'0')).replace('%M',String(Math.floor(t/60)%60).padStart(2,'0')).replace('%S',String(t%60).padStart(2,'0'))}};break;
   case'random':m={__mod:'random',random:()=>new Flt(S.rand()),randint:a=>num(a[0])+Math.floor(S.rand()*(num(a[1])-num(a[0])+1)),uniform:a=>new Flt(num(a[0])+S.rand()*(num(a[1])-num(a[0]))),choice:a=>{const l=[...S.iter(a[0])];return l[Math.floor(S.rand()*l.length)]},shuffle:a=>{const l=a[0];for(let k=l.length-1;k>0;k--){const j=Math.floor(S.rand()*(k+1));[l[k],l[j]]=[l[j],l[k]]}},seed:a=>{S.seed=num(a[0]||0)|0}};break;
   case'math':m={__mod:'math',pi:new Flt(Math.PI),e:new Flt(Math.E),sqrt:a=>new Flt(Math.sqrt(num(a[0]))),sin:a=>new Flt(Math.sin(num(a[0]))),cos:a=>new Flt(Math.cos(num(a[0]))),tan:a=>new Flt(Math.tan(num(a[0]))),atan2:a=>new Flt(Math.atan2(num(a[0]),num(a[1]))),log:a=>new Flt(a[1]!=null?Math.log(num(a[0]))/Math.log(num(a[1])):Math.log(num(a[0]))),log10:a=>new Flt(Math.log10(num(a[0]))),exp:a=>new Flt(Math.exp(num(a[0]))),floor:a=>Math.floor(num(a[0])),ceil:a=>Math.ceil(num(a[0])),fabs:a=>new Flt(Math.abs(num(a[0]))),radians:a=>new Flt(num(a[0])*Math.PI/180),degrees:a=>new Flt(num(a[0])*180/Math.PI),pow:a=>new Flt(Math.pow(num(a[0]),num(a[1])))};break;
   case'sys':m={__mod:'sys',exit:()=>{throw new PyErr('SystemExit','')},argv:['main.py']};break;
   case'signal':m={__mod:'signal',pause:()=>sleep(1e9),signal:()=>null,SIGINT:2,SIGTERM:15};break;
   case'RPi':m={__mod:'RPi',GPIO:this.module('RPi.GPIO')};break;
   case'RPi.GPIO':{const G={__mod:'RPi.GPIO',BCM:11,BOARD:10,OUT:0,IN:1,HIGH:1,LOW:0,PUD_UP:22,PUD_DOWN:21,PUD_OFF:20,RISING:31,FALLING:32,BOTH:33,VERSION:'0.7.1',RPI_INFO:new PyDict()};
    G.setmode=a=>{S.gpioMode=num(a[0])===10?'BOARD':'BCM'};G.getmode=()=>S.gpioMode==='BOARD'?10:S.gpioMode==='BCM'?11:null;G.setwarnings=()=>null;
    const need=()=>{if(!S.gpioMode)throw new PyErr('RuntimeError','Please set pin numbering mode using GPIO.setmode(GPIO.BOARD) or GPIO.setmode(GPIO.BCM)')};
    G.setup=(a,kw)=>{need();const dir=num(a[1]!==undefined?a[1]:kw.direction);const pud=kw.pull_up_down!=null?num(kw.pull_up_down):a[2]!=null?num(a[2]):20;for(const p of pins(a[0])){const s=S.pins[p];s.touched=true;s.pwm=-1;if(dir===0){s.mode=1;s.v=kw.initial!=null?(truth(kw.initial)?1:0):0}else s.mode=pud===22?2:pud===21?3:0}S.emit('pins')};
    G.output=a=>{need();const vs=Array.isArray(a[1])?a[1]:null;pins(a[0]).forEach((p,k)=>{const s=S.pins[p];if(s.mode!==1)throw new PyErr('RuntimeError','The GPIO channel has not been set up as an OUTPUT');s.v=truth(vs?vs[k]:a[1])?1:0;s.pwm=-1;s.touched=true});S.emit('pins')};
    G.input=a=>{need();const p=pinOf(a[0]);return S.level(p)?1:0};
    G.cleanup=a=>{for(const p of a.length?pins(a[0]):S.pins.map((_,k)=>k)){const s=S.pins[p];s.mode=0;s.v=0;s.pwm=-1}S.emit('pins')};
    G.wait_for_edge=(a,kw)=>{need();const p=pinOf(a[0]);const ed=num(a[1]);const to=kw.timeout!=null?num(kw.timeout)/1000:1e9;return{__gen:(function*(){let last=S.level(p);const t0=S.us;for(;;){yield{sleep:0.0005};const v=S.level(p);if(v!==last&&(ed===33||(ed===31&&v)||(ed===32&&!v)))return a[0];last=v;if((S.us-t0)/1e6>to)return null}})()}};
    const ev=new Map();G.add_event_detect=(a,kw)=>{const p=pinOf(a[0]);ev.set(p,{ed:num(a[1]),cb:kw.callback||null,last:S.level(p),hit:false,bounce:(kw.bouncetime?num(kw.bouncetime):0)/1000,t:-1})};G.event_detected=a=>{const e=ev.get(pinOf(a[0]));if(e&&e.hit){e.hit=false;return true}return false};G.remove_event_detect=a=>{ev.delete(pinOf(a[0]))};
    G.add_event_callback=a=>{const e=ev.get(pinOf(a[0]));if(e)e.cb=a[1]};S.edgeWatch=ev;
    G.PWM=a=>{const p=pinOf(a[0]);let dc=0,on=false;const o={__get:n=>({start:x=>{dc=num(x[0]);on=true;upd()},ChangeDutyCycle:x=>{dc=num(x[0]);upd()},ChangeFrequency:()=>null,stop:()=>{on=false;upd()}})[n]};
     const upd=()=>{const s=S.pins[p];if(s.mode!==1)throw new PyErr('RuntimeError','You must setup() the GPIO channel as an output first');s.touched=true;if(!on){s.pwm=-1;s.v=0}else{const d=Math.max(0,Math.min(100,dc));s.pwm=Math.round(d*2.55);s.v=d>0?1:0}S.emit('pins')};return o};
    G.gpio_function=()=>1;m=G;break}
   case'gpiozero':{const Z={__mod:'gpiozero'};const out=(p,v)=>{const s=S.pins[p];s.mode=1;s.touched=true;if(typeof v==='number'&&v>0&&v<1){s.pwm=Math.round(v*255);s.v=1}else{s.pwm=-1;s.v=v?1:0}S.emit('pins')};
    const gp=x=>{if(typeof x==='string'){const m_=/^(?:GPIO|BCM)?(\d+)$/i.exec(x)||/^BOARD(\d+)$/i.exec(x);if(!m_)throw new PyErr('ValueError',`unknown pin ${x}`);return /^BOARD/i.test(x)?PHYS[+m_[1]]:+m_[1]}return S.pinOk(num(x))};
    const blinker=(p,onT,offT,n,fadeIn,fadeOut,pwm)=>{const tok={};S.blinks=S.blinks||new Map();S.blinks.set(p,tok);const start=S.us;S.after=S.after||[];S.after.push(function tick(){if(S.blinks.get(p)!==tok)return false;const per=onT+offT+fadeIn+fadeOut;const t=(S.us-start)/1e6;if(n!=null&&t>=per*n){out(p,0);return false}const ph=t%per;let v;if(ph<fadeIn)v=ph/fadeIn;else if(ph<fadeIn+onT)v=1;else if(ph<fadeIn+onT+fadeOut)v=1-(ph-fadeIn-onT)/fadeOut;else v=0;out(p,pwm?v:(v>=0.5?1:0));return true})};
    const stopBlink=p=>{if(S.blinks)S.blinks.delete(p)};
    const outDev=(cls,pwmOk)=>(a,kw)=>{const p=gp(a[0]);const activeHigh=kw.active_high!==false;const ini=kw.initial_value?1:0;let val=ini;const set=v=>{val=v;const phys=activeHigh?v:(typeof v==='number'?1-v:!v);out(p,typeof phys==='boolean'?(phys?1:0):phys)};set(ini);
     const o={cls:{name:cls},__get:n=>{switch(n){case'on':return()=>{stopBlink(p);set(1)};case'off':return()=>{stopBlink(p);set(0)};case'toggle':return()=>{stopBlink(p);set(val?0:1)};
       case'blink':return(b,k)=>{const onT=num(b[0]??k.on_time??1),offT=num(b[1]??k.off_time??1),fi=pwmOk?num(b[2]??k.fade_in_time??0):0,fo=pwmOk?num(b[3]??k.fade_out_time??0):0;const nn=b[4]??k.n??null;blinker(p,onT,offT,nn===null?null:num(nn),fi,fo,pwmOk);const bg=b[5]??k.background;if(bg===false&&nn!=null)return sleep((onT+offT+fi+fo)*num(nn))};
       case'pulse':return(b,k)=>{const fi=num(b[0]??k.fade_in_time??1),fo=num(b[1]??k.fade_out_time??1);blinker(p,0,0,null,fi,fo,true)};
       case'beep':return(b,k)=>{const onT=num(b[0]??k.on_time??1),offT=num(b[1]??k.off_time??1);blinker(p,onT,offT,b[2]!=null?num(b[2]):null,0,0,false)};
       case'value':return pwmOk?new Flt(val):val;case'is_lit':case'is_active':return!!(typeof val==='number'?val>0:val);case'pin':return{__get:x=>x==='number'?p:undefined,cls:{name:'Pin',__str:()=>'GPIO'+p}};case'close':return()=>{stopBlink(p);S.pins[p].mode=0};case'max_steps':return 1}},
      __set:(n,v)=>{if(n==='value'){stopBlink(p);set(pwmOk?Math.max(0,Math.min(1,num(v))):(truth(v)?1:0));return true}return false}};return o};
    Z.LED=outDev('LED',false);Z.PWMLED=outDev('PWMLED',true);Z.Buzzer=outDev('Buzzer',false);Z.DigitalOutputDevice=outDev('DigitalOutputDevice',false);Z.OutputDevice=Z.DigitalOutputDevice;Z.PWMOutputDevice=outDev('PWMOutputDevice',true);
    const inDev=(cls,inv)=>(a,kw)=>{const p=gp(a[0]);const pu=kw.pull_up===undefined?true:kw.pull_up;const s=S.pins[p];s.mode=pu===null||pu===undefined&&false?0:pu?2:3;s.touched=true;S.emit('pins');
     const active=()=>{const lv=S.level(p);return pu?!lv:!!lv};let wp=null,wr=null;
     const o={cls:{name:cls},__get:n=>{switch(n){case'is_pressed':case'is_active':case'motion_detected':case'is_held':return inv?!active():active();case'value':return(inv?!active():active())?1:0;
       case'wait_for_press':case'wait_for_active':case'wait_for_motion':return(b,k)=>({__gen:(function*(){const to=b[0]!=null?num(b[0]):k.timeout!=null?num(k.timeout):1e9;const t0=S.us;while(!(inv?!active():active())){yield{sleep:0.001};if((S.us-t0)/1e6>to)return false}return true})()});
       case'wait_for_release':case'wait_for_inactive':case'wait_for_no_motion':return(b,k)=>({__gen:(function*(){const to=b[0]!=null?num(b[0]):1e9;const t0=S.us;while(inv?!active():active()){yield{sleep:0.001};if((S.us-t0)/1e6>to)return false}return true})()});
       case'when_pressed':case'when_activated':case'when_motion':return wp;case'when_released':case'when_deactivated':case'when_no_motion':return wr;case'pin':return{cls:{name:'Pin',__str:()=>'GPIO'+p}};case'close':return()=>{}}},
      __set:(n,v)=>{if(/^when_(pressed|activated|motion)$/.test(n)){wp=v;watch();return true}if(/^when_(released|deactivated|no_motion)$/.test(n)){wr=v;watch();return true}return false}};
     let watching=false;const watch=()=>{if(watching)return;watching=true;let last=active();S.after=S.after||[];S.after.push(()=>{const a_=active();if(a_!==last){last=a_;const cb=a_?wp:wr;if(cb)S.queue.push(cb)}return true})};return o};
    Z.Button=inDev('Button',false);Z.MotionSensor=(a,kw)=>inDev('MotionSensor',false)(a,Object.assign({pull_up:false},kw));Z.LineSensor=(a,kw)=>inDev('LineSensor',false)(a,Object.assign({pull_up:false},kw));Z.DigitalInputDevice=(a,kw)=>inDev('DigitalInputDevice',false)(a,Object.assign({pull_up:false},kw));Z.InputDevice=Z.DigitalInputDevice;
    Z.RGBLED=(a,kw)=>{const ps=[a[0]??kw.red,a[1]??kw.green,a[2]??kw.blue].map(gp);let col=[0,0,0];const set=c=>{col=c;ps.forEach((p,k)=>out(p,c[k]))};set([0,0,0]);
     return{cls:{name:'RGBLED'},__get:n=>({on:()=>set([1,1,1]),off:()=>set([0,0,0]),color:tup(col.map(x=>new Flt(x))),value:tup(col.map(x=>new Flt(x))),red:new Flt(col[0]),green:new Flt(col[1]),blue:new Flt(col[2])})[n],__set:(n,v)=>{if(n==='color'||n==='value'){set([...S.iter(v)].map(x=>Math.max(0,Math.min(1,num(x)))));return true}const k=['red','green','blue'].indexOf(n);if(k>=0){const c=col.slice();c[k]=num(v);set(c);return true}return false}}};
    Z.TrafficLights=(a,kw)=>{const r=Z.LED([a[0]??kw.red],{}),am=Z.LED([a[1]??kw.amber??kw.yellow],{}),g=Z.LED([a[2]??kw.green],{});const all=[r,am,g];return{cls:{name:'TrafficLights'},red:r,amber:am,yellow:am,green:g,__get:n=>n==='on'?()=>all.forEach(x=>x.__get('on')()):n==='off'?()=>all.forEach(x=>x.__get('off')()):undefined}};
    Z.Servo=(a,kw)=>{const p=gp(a[0]);let v=0;const set=x=>{v=Math.max(-1,Math.min(1,x));const s=S.pins[p];s.mode=1;s.touched=true;s.servo=90+v*90;s.pwm=Math.round((1.5+v*0.5)/20*255);s.v=1;S.emit('pins')};set(kw.initial_value!=null?num(kw.initial_value):0);
     return{cls:{name:'Servo'},__get:n=>({min:()=>set(-1),mid:()=>set(0),max:()=>set(1),value:new Flt(v)})[n],__set:(n,x)=>{if(n==='value'){set(num(x));return true}return false}}};
    Z.AngularServo=(a,kw)=>{const sv=Z.Servo(a,kw);const lo=kw.min_angle!=null?num(kw.min_angle):-90,hi=kw.max_angle!=null?num(kw.max_angle):90;let ang=0;return{cls:{name:'AngularServo'},__get:n=>n==='angle'?ang:sv.__get(n),__set:(n,x)=>{if(n==='angle'){ang=num(x);sv.__set('value',((ang-lo)/(hi-lo))*2-1);return true}return sv.__set(n,x)}}};
    Z.Device={__type:'Device'};m=Z;break}
   case'smbus':case'smbus2':case'spidev':case'board':case'busio':m={__mod:name};break;
   default:throw new PyErr('ModuleNotFoundError',`No module named '${name}'. On this simulated Pi you can use time, random, math, RPi.GPIO and gpiozero`)}
  this.mods[name]=m;return m}
}
/* callbacks (gpiozero when_pressed, GPIO events) run between statements */
const baseRun=Sim.prototype.run;
Sim.prototype.run=function(until,budget){this.queue=this.queue||[];if(this.after){this.after=this.after.filter(f=>{try{return f()!==false}catch(e){return false}})}
 if(this.edgeWatch){for(const[p,e]of this.edgeWatch){const v=this.level(p);if(v!==e.last){const rising=v&&!e.last;e.last=v;if((e.ed===33||(e.ed===31&&rising)||(e.ed===32&&!rising))&&(this.us-e.t)/1e6>=e.bounce){e.t=this.us;e.hit=true;if(e.cb)this.queue.push({cb:e.cb,arg:p})}}}}
 if(this.queue.length&&this.state!=='error'&&this.state!=='done'){const items=this.queue.splice(0);const S=this;const prev=this.gen;const wake=this.wake;
  this.gen=(function*(){for(const it of items){const f=it.cb||it;yield*S.call(f,it.cb?[it.arg]:[],{})}S.gen=prev;S.wake=wake;return undefined})();const g=this.gen;
  const next=g.next.bind(g);g.next=v=>{const r=next(v);if(r.done){S.gen=prev;S.wake=wake;return{done:false,value:null}}return r};this.wake=0}
 return baseRun.call(this,until,budget)};
function sortArr(S,arr,kw){const key=kw&&kw.key;const keys=key?arr.map(x=>{const g=S.call(key,[x],{});let r=g.next();while(!r.done)r=g.next();return r.value}):arr.slice();const idx=arr.map((_,k)=>k);idx.sort((a,b)=>lt(keys[a],keys[b])?-1:lt(keys[b],keys[a])?1:a-b);if(kw&&truth(kw.reverse))idx.reverse();const out=idx.map(k=>arr[k]);for(let k=0;k<arr.length;k++)arr[k]=out[k]}
function esc(s){return String(s).replace(/[\\\]\[^-]/g,'\\$&')}
const api={compile,Sim,parse,str,repr,PHYS,PyErr};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PYRT=api;
})(typeof window!=='undefined'?window:globalThis);
