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
const ESP32_PINS=['EN','VP','VN','D34','D35','D32','D33','D25','D26','D27','D14','D12','D13','GND','VIN','D23','D22','TX0','RX0','D21','D19','D18','D5','D17','D16','D4','D2','D15','GND','3V3'];
const ESP32_LEGS=[...Array.from({length:15},(_,i)=>[0,i]),...Array.from({length:15},(_,i)=>[9,i])];
const PICO_PINS=['GP0','GP1','GND','GP2','GP3','GP4','GP5','GND','GP6','GP7','GP8','GP9','GND','GP10','GP11','GP12','GP13','GND','GP14','GP15','VBUS','VSYS','GND','3V3_EN','3V3','ADC_VREF','GP28','AGND','GP27','GP26','RUN','GP22','GND','GP21','GP20','GP19','GP18','GND','GP17','GP16'];
const PICO_LEGS=[...Array.from({length:20},(_,i)=>[0,i]),...Array.from({length:20},(_,i)=>[7,i])];
const ESP32_BLINK='// Blink the on-board LED (GPIO 2). Wire GPIO 4 through 220 ohm to an LED for an outside LED\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  pinMode(4, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  digitalWrite(4, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  digitalWrite(4, LOW);\n  delay(500);\n}\n';
const PICO_BLINK='// Blink the on-board LED (GP25). Wire GP15 through 220 ohm to an LED for an outside LED\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  pinMode(15, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  digitalWrite(15, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  digitalWrite(15, LOW);\n  delay(500);\n}\n';
/* how each board's legs map to GPIO numbers, power and ground */
function mcuMap(names,gpioOf){const gpio=new Map(),gnd=[];let v5=-1,v33=-1;names.forEach((n,i)=>{const g=gpioOf(n);if(g!=null)gpio.set(g,i);if(/^A?GND$/.test(n))gnd.push(i);if(/^(5V|VIN|VBUS|VCC)$/.test(n)&&!(v5>=0&&names[v5]==='5V'))v5=i;if(/^(3\.3V|3V3)$/.test(n))v33=i});return{gpio,gnd,v5,v33}}
const MCU={
 uno:Object.assign(mcuMap(UNO_PINS,n=>{const m=n.match(/^D(\d+)$/);if(m)return+m[1];const a=n.match(/^A(\d)$/);return a?14+(+a[1]):null}),{name:'Uno',vl:5,count:20,adc:{bits:10,vref:5,pins:[14,15,16,17,18,19],alias:p=>p>=0&&p<=5?p+14:p},pwm:new Set([3,5,6,9,10,11]),i2c:{sda:18,scl:19},led:13,rout:25,pull:20000,blink:UNO_BLINK,consts:{}}),
 esp32:Object.assign(mcuMap(ESP32_PINS,n=>{const m=n.match(/^D(\d+)$/);if(m)return+m[1];return{VP:36,VN:39,TX0:1,RX0:3}[n]??null}),{name:'ESP32',vl:3.3,count:40,adc:{bits:12,vref:3.3,pins:[32,33,34,35,36,39,0,2,4,12,13,14,15,25,26,27],alias:p=>p},pwm:null,i2c:{sda:21,scl:22},led:2,rout:30,pull:45000,blink:ESP32_BLINK,
  consts:{LED_BUILTIN:2,A0:36,A3:39,A4:32,A5:33,A6:34,A7:35,A10:4,A11:0,A12:2,A13:15,A14:13,A15:12,A16:14,A17:27,A18:25,A19:26,SDA:21,SCL:22}}),
 pico:Object.assign(mcuMap(PICO_PINS,n=>{const m=n.match(/^GP(\d+)$/);return m?+m[1]:null}),{name:'Pico',vl:3.3,count:30,adc:{bits:12,vref:3.3,pins:[26,27,28],alias:p=>p},pwm:null,i2c:{sda:4,scl:5},led:25,rout:30,pull:50000,blink:PICO_BLINK,consts:{LED_BUILTIN:25,A0:26,A1:27,A2:28,SDA:4,SCL:5}})};
/* ---------- more boards: the header rows give the legs, and one drawing serves them all ---------- */
const colP=(x,names,y0)=>names.map((n,i)=>[n,[x,(y0||0)+i]]);const rowP=(y,names,x0)=>names.map((n,i)=>[n,[(x0||0)+i,y]]);
const blinkFor=(led,name,extra)=>`// Blink the on-board LED of the ${name} (pin ${led}). ${extra||'Wire a pin through 220 ohm to an LED for an outside LED'}\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}\n`;
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const anaConsts=(n,base,extra)=>Object.assign(Object.fromEntries(range(0,n-1).map(i=>['A'+i,base+i])),extra||{});
function defBoard(key,o){const list=o.unoForm?UNO_PINS.map((n,i)=>[n,UNO_LEGS[i]]):o.layout;const pins=list.map(q=>q[0]),legs=list.map(q=>q[1]);
 const m=mcuMap(pins,o.gpioOf);m.same=[];const by={};pins.forEach((n,i)=>{if(/^(5V|3V3|3\.3V|VIN|RST|IOREF|VCC)$/.test(n))(by[n]=by[n]||[]).push(i)});for(const k in by)if(by[k].length>1)m.same.push(by[k]);
 MCU[key]=Object.assign(m,{name:o.name,vl:o.vl,count:o.count,adc:o.adc,pwm:o.pwm,i2c:o.i2c,led:o.led,rout:o.rout||(o.vl>4?25:30),pull:o.pull||(o.vl>4?20000:45000),blink:o.blink||blinkFor(o.led,o.name),consts:o.consts||{},ex:o.ex,hint:o.hint||''});
 LIB[key]={name:o.title,legs,props:{code:MCU[key].blink},pins,offboard:true,board:true,mcu:key,look:o.look,unoForm:!!o.unoForm}}
const dA=(base)=>n=>{const m=n.match(/^D(\d+)$/);if(m)return+m[1];const a=n.match(/^A(\d+)$/);return a?base+(+a[1]):null};
const UNO_ADC={bits:10,vref:5,pins:range(14,19),alias:p=>p>=0&&p<=5?p+14:p};
function addBoards(){
defBoard('unor4',{unoForm:true,title:'Arduino UNO R4 Minima board',name:'UNO R4',vl:5,count:20,gpioOf:dA(14),adc:UNO_ADC,pwm:new Set([3,5,6,9,10,11]),i2c:{sda:18,scl:19},led:13,consts:anaConsts(6,14,{LED_BUILTIN:13,SDA:18,SCL:19,DAC:14}),
 look:{color:'#0a7d8c',label:'UNO R4',chip:'RA4M1'},ex:{led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:5,buz:8,stp:[8,9,10,11],rel:7}});
defBoard('leonardo',{unoForm:true,title:'Arduino Leonardo board',name:'Leonardo',vl:5,count:20,gpioOf:dA(14),adc:UNO_ADC,pwm:new Set([3,5,6,9,10,11,13]),i2c:{sda:2,scl:3},led:13,consts:anaConsts(6,14,{LED_BUILTIN:13,SDA:2,SCL:3}),
 look:{color:'#0d6e7a',label:'LEONARDO',chip:'ATMEGA32U4'},ex:{led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:5,buz:8,stp:[8,9,10,11],rel:7},hint:'. Use 0 to 13, or A0 to A5'});
const NANO_L=['D13','3V3','AREF','A0','A1','A2','A3','A4','A5','A6','A7','5V','RST','GND','VIN'],NANO_R=['D12','D11','D10','D9','D8','D7','D6','D5','D4','D3','D2','GND','RST','D0','D1'];
const NANO_LAY=[...colP(0,NANO_L),...colP(7,NANO_R)];const NANO_ADC={bits:10,vref:5,pins:range(14,21),alias:p=>p>=0&&p<=7?p+14:p};
const NANO_EX={led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:5,buz:8,stp:[8,9,10,11],rel:7};
defBoard('nano',{layout:NANO_LAY,title:'Arduino Nano board',name:'Nano',vl:5,count:22,gpioOf:dA(14),adc:NANO_ADC,pwm:new Set([3,5,6,9,10,11]),i2c:{sda:18,scl:19},led:13,consts:anaConsts(8,14,{LED_BUILTIN:13,SDA:18,SCL:19}),look:{color:'#1f5fae',label:'NANO',chip:'ATMEGA328P'},ex:NANO_EX,hint:'. Use 0 to 13, or A0 to A7'});
defBoard('nanoevery',{layout:NANO_LAY,title:'Arduino Nano Every board',name:'Nano Every',vl:5,count:22,gpioOf:dA(14),adc:NANO_ADC,pwm:new Set([3,5,6,9,10]),i2c:{sda:18,scl:19},led:13,consts:anaConsts(8,14,{LED_BUILTIN:13,SDA:18,SCL:19}),look:{color:'#1f5fae',label:'NANO EVERY',chip:'ATMEGA4809'},ex:NANO_EX,hint:'. Use 0 to 13, or A0 to A7'});
const N33_ADC={bits:10,vref:3.3,pins:range(14,21),alias:p=>p>=0&&p<=7?p+14:p};const N33_EX={led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:3.3,buz:8,stp:[8,9,10,11],rel:7};
defBoard('nano33iot',{layout:NANO_LAY,title:'Arduino Nano 33 IoT board',name:'Nano 33 IoT',vl:3.3,count:22,gpioOf:dA(14),adc:N33_ADC,pwm:new Set([2,3,5,6,9,10,11,12,16,17,19]),i2c:{sda:18,scl:19},led:13,consts:anaConsts(8,14,{LED_BUILTIN:13,SDA:18,SCL:19}),look:{color:'#0b7a6e',label:'NANO 33 IoT',chip:'SAMD21'},ex:N33_EX,hint:'. Use 0 to 13, or A0 to A7'});
defBoard('nano33ble',{layout:NANO_LAY,title:'Arduino Nano 33 BLE board',name:'Nano 33 BLE',vl:3.3,count:22,gpioOf:dA(14),adc:N33_ADC,pwm:new Set(range(0,21)),i2c:{sda:18,scl:19},led:13,consts:anaConsts(8,14,{LED_BUILTIN:13,SDA:18,SCL:19}),look:{color:'#0b7a6e',label:'NANO 33 BLE',chip:'nRF52840'},ex:N33_EX,hint:'. Use 0 to 13, or A0 to A7'});
defBoard('micro',{layout:[...colP(0,['D13','3V3','AREF','A0','A1','A2','A3','A4','A5','NC','NC','5V','RST','GND','VIN']),...colP(7,['D12','D11','D10','D9','D8','D7','D6','D5','D4','D3','D2','GND','RST','D0','D1'])],
 title:'Arduino Micro board',name:'Micro',vl:5,count:24,gpioOf:dA(18),adc:{bits:10,vref:5,pins:range(18,23),alias:p=>p>=0&&p<=5?p+18:p},pwm:new Set([3,5,6,9,10,11,13]),i2c:{sda:2,scl:3},led:13,consts:anaConsts(6,18,{LED_BUILTIN:13,SDA:2,SCL:3}),look:{color:'#1f5fae',label:'MICRO',chip:'ATMEGA32U4'},ex:NANO_EX,hint:'. Use 0 to 13, or A0 to A5'});
defBoard('promini',{layout:[...colP(0,['D1','D0','RST','GND','D2','D3','D4','D5','D6','D7','D8','D9']),...colP(7,['RAW','GND','RST','VCC','A3','A2','A1','A0','D13','D12','D11','D10'])],
 title:'Arduino Pro Mini board (5 V)',name:'Pro Mini',vl:5,count:20,gpioOf:dA(14),adc:{bits:10,vref:5,pins:range(14,17),alias:p=>p>=0&&p<=3?p+14:p},pwm:new Set([3,5,6,9,10,11]),i2c:{sda:18,scl:19},led:13,consts:anaConsts(4,14,{LED_BUILTIN:13}),look:{color:'#b3261e',label:'PRO MINI',chip:'ATMEGA328P'},ex:NANO_EX,hint:'. Use 0 to 13, or A0 to A3'});
defBoard('mkr1010',{layout:[...colP(0,['AREF','A0','A1','A2','A3','A4','A5','A6','D0','D1','D2','D3','D4','D5']),...colP(9,['5V','VIN','3V3','GND','RST','D14','D13','D12','D11','D10','D9','D8','D7','D6'])],
 title:'Arduino MKR WiFi 1010 board',name:'MKR WiFi 1010',vl:3.3,count:22,gpioOf:dA(15),adc:{bits:10,vref:3.3,pins:range(15,21),alias:p=>p>=0&&p<=6?p+15:p},pwm:new Set([0,1,2,3,4,5,6,7,8,10,12,18,19]),i2c:{sda:11,scl:12},led:6,consts:anaConsts(7,15,{LED_BUILTIN:6,SDA:11,SCL:12}),look:{color:'#0b7a6e',label:'MKR 1010',chip:'SAMD21'},
 ex:{led:5,servo:5,trig:7,echo:8,ain:'A1',bits:1023,vr:3.3,buz:4,stp:[0,1,2,3],rel:7},hint:'. Use 0 to 14, or A0 to A6'});
/* Mega and Due: digital pins along the top and down the double row at the end, analog and power along the bottom */
const megaLayout=(an,extra)=>{const L=[...rowP(0,range(0,21).map(i=>'D'+i))];L.push(['5V',[25,0]],['5V',[26,0]]);for(let k=0;k<16;k++)L.push(['D'+(22+2*k),[25,1+k]],['D'+(23+2*k),[26,1+k]]);L.push(['GND',[25,17]],['GND',[26,17]]);
 L.push(...rowP(19,['IOREF','RST','3V3','5V','GND','GND','VIN']));L.push(...rowP(19,range(0,an-1).map(i=>'A'+i),8));if(extra)L.push(...rowP(19,extra,8+an));return L};
defBoard('mega',{layout:megaLayout(16),title:'Arduino Mega 2560 board',name:'Mega 2560',vl:5,count:70,gpioOf:dA(54),adc:{bits:10,vref:5,pins:range(54,69),alias:p=>p>=0&&p<=15?p+54:p},pwm:new Set([...range(2,13),44,45,46]),i2c:{sda:20,scl:21},led:13,consts:anaConsts(16,54,{LED_BUILTIN:13,SDA:20,SCL:21}),
 look:{color:'#0f7c8c',label:'MEGA 2560',chip:'ATMEGA2560'},ex:{led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:5,buz:8,stp:[22,24,26,28],rel:30},hint:'. Use 0 to 53, or A0 to A15'});
defBoard('due',{layout:megaLayout(12,['DAC0','DAC1']),title:'Arduino Due board',name:'Due',vl:3.3,count:66,gpioOf:dA(54),adc:{bits:10,vref:3.3,pins:range(54,65),alias:p=>p>=0&&p<=11?p+54:p},pwm:new Set(range(2,13)),i2c:{sda:20,scl:21},led:13,consts:anaConsts(12,54,{LED_BUILTIN:13,SDA:20,SCL:21}),
 look:{color:'#1f5fae',label:'DUE',chip:'SAM3X8E'},ex:{led:9,servo:9,trig:7,echo:8,ain:'A0',bits:1023,vr:3.3,buz:8,stp:[22,24,26,28],rel:30},hint:'. Use 0 to 53, or A0 to A11'});
}
/* ESP32-S3 DevKitC-1: two 22-pin headers, GPIO numbers as printed on the board */
function addS3(){const J1=['3V3','3V3','RST','IO4','IO5','IO6','IO7','IO15','IO16','IO17','IO18','IO8','IO3','IO46','IO9','IO10','IO11','IO12','IO13','IO14','5V','GND'],J3=['GND','TX','RX','IO1','IO2','IO42','IO41','IO40','IO39','IO38','IO37','IO36','IO35','IO0','IO45','IO48','IO47','IO21','IO20','IO19','GND','GND'];
 defBoard('esp32s3',{layout:[...colP(0,J1),...colP(10,J3)],title:'ESP32-S3 DevKitC-1 board',name:'ESP32-S3',vl:3.3,count:49,gpioOf:n=>{const m=n.match(/^IO(\d+)$/);if(m)return+m[1];return{TX:43,RX:44}[n]??null},
  adc:{bits:12,vref:3.3,pins:range(1,20),alias:p=>p},pwm:null,i2c:{sda:8,scl:9},led:48,
  consts:Object.assign(Object.fromEntries(range(0,19).map(i=>['A'+i,i+1])),{LED_BUILTIN:48,RGB_BUILTIN:48,SDA:8,SCL:9,TX:43,RX:44}),
  blink:'// Blink the RGB LED of the ESP32-S3 DevKitC-1 (GPIO 48). Wire GPIO 4 through 220 ohm to an LED for an outside LED\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  pinMode(4, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  digitalWrite(4, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  digitalWrite(4, LOW);\n  delay(500);\n}\n',
  look:{color:'#1d1f24',label:'ESP32-S3',chip:'ESP32-S3'},ex:{led:4,servo:5,trig:6,echo:7,ain:1,bits:4095,vr:3.3,buz:15,stp:[10,11,12,13],rel:16},hint:'. Use the GPIO numbers printed on the board (0 to 21, 35 to 48)'})}
/* Raspberry Pi: the 40-pin header (odd pins in the lower row, pin 1 on the left), programs in Python */
const PI_HDR=['3V3','5V','GPIO2','5V','GPIO3','GND','GPIO4','GPIO14','GND','GPIO15','GPIO17','GPIO18','GPIO27','GND','GPIO22','GPIO23','3V3','GPIO24','GPIO10','GND','GPIO9','GPIO25','GPIO11','GPIO8','GND','GPIO7','GPIO0','GPIO1','GPIO5','GND','GPIO6','GPIO12','GPIO13','GND','GPIO19','GPIO16','GPIO26','GPIO20','GND','GPIO21'];
const PI_LAY=PI_HDR.map((n,i)=>[n,[Math.floor(i/2),i%2?0:1]]);
const PI_BLINK='# Blink an LED: GPIO 17 (header pin 11) through 220 ohm to the LED, LED to GND (pin 9)\nimport RPi.GPIO as GPIO\nimport time\n\nGPIO.setmode(GPIO.BCM)\nGPIO.setup(17, GPIO.OUT)\n\nwhile True:\n    GPIO.output(17, GPIO.HIGH)\n    print("LED on")\n    time.sleep(0.5)\n    GPIO.output(17, GPIO.LOW)\n    print("LED off")\n    time.sleep(0.5)\n';
const PI_GP=n=>{const m=n.match(/^GPIO(\d+)$/);return m?+m[1]:null};
const PI_MODELS=[['pi1bplus','Raspberry Pi 1 Model B+','PI 1 B+','BCM2835'],['pi2b','Raspberry Pi 2 Model B','PI 2 B','BCM2836'],['pi3b','Raspberry Pi 3 Model B','PI 3 B','BCM2837'],['pi3bplus','Raspberry Pi 3 Model B+','PI 3 B+','BCM2837B0'],['pi4b','Raspberry Pi 4 Model B','PI 4 B','BCM2711'],['pi400','Raspberry Pi 400','PI 400','BCM2711'],['pi5','Raspberry Pi 5','PI 5','BCM2712'],['pizero','Raspberry Pi Zero','PI ZERO','BCM2835'],['pizero2w','Raspberry Pi Zero 2 W','PI ZERO 2 W','RP3A0']];
function addPis(){for(const[k,title,label,chip]of PI_MODELS)defBoard(k,{layout:PI_LAY,title:title+' board',name:title.replace(/^Raspberry /,''),vl:3.3,count:28,gpioOf:PI_GP,adc:{bits:10,vref:3.3,pins:[],alias:p=>p},pwm:null,i2c:{sda:2,scl:3},led:-1,rout:40,pull:50000,blink:PI_BLINK,consts:{},
  look:{color:k==='pi400'?'#c8102e':'#2f8a3a',label,chip,box:/zero/.test(k)?[-30,-30,220,110]:k==='pi400'?[-60,-30,330,190]:[-70,-30,260,200]},lang:'python',hint:'',ex:{led:17,btn:27,pwm:18}});
 for(const k of PI_MODELS.map(m=>m[0]))MCU[k].lang='python';
 /* Pico W and Pico 2: the Pico pins, sketches in Arduino C */
 const PL=PICO_PINS.map((n,i)=>[n,[i<20?0:7,i<20?i:39-i]]);
 for(const[k,title,label,chip]of[['picow','Raspberry Pi Pico W board','PICO W','RP2040'],['pico2','Raspberry Pi Pico 2 board','PICO 2','RP2350']])defBoard(k,{layout:PL,title,name:title.replace(/ board$/,'').replace(/^Raspberry Pi /,''),vl:3.3,count:30,gpioOf:n=>{const m=n.match(/^GP(\d+)$/);return m?+m[1]:null},adc:{bits:10,vref:3.3,pins:[26,27,28],alias:p=>p>=0&&p<=2?p+26:p},pwm:null,i2c:{sda:4,scl:5},led:25,consts:{LED_BUILTIN:25,A0:26,A1:27,A2:28,SDA:4,SCL:5},blink:PICO_BLINK,look:{color:'#1f7a3f',label,chip},ex:{led:15,servo:16,trig:2,echo:3,ain:26,bits:1023,vr:3.3,buz:14,stp:[10,11,12,13],rel:22},hint:'. Use GP0 to GP28'})}
const AVR8=new Set(['uno','leonardo','nano','nanoevery','micro','promini','mega']);
const BOARD_KEYS=['uno','unor4','leonardo','nano','nanoevery','nano33iot','nano33ble','micro','promini','mkr1010','mega','due','esp32','esp32s3','pico','picow','pico2','pi1bplus','pi2b','pi3b','pi3bplus','pi4b','pi400','pi5','pizero','pizero2w'];
/* the sketch is written for the board: its pin names become numbers, and calls the board does not need are dropped */
function boardSource(type,src){const m=MCU[type];let s=String(src||'');if(type!=='uno'){for(const[k,v]of Object.entries(m.consts))s=s.replace(new RegExp('\\b'+k+'\\b','g'),String(v));s=s.replace(/\b(analogReadResolution|analogWriteResolution|analogSetAttenuation|analogWriteFreq|analogWriteRange)\s*\([^;]*\)\s*;/g,'')}return s.replace(/&\s*Wire\b/g,'0')}
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
 uno:{name:'Arduino Uno board',legs:UNO_LEGS,props:{code:UNO_BLINK},pins:UNO_PINS,offboard:true,board:true,mcu:'uno'},
 esp32:{name:'ESP32 DevKit board',legs:ESP32_LEGS,props:{code:ESP32_BLINK},pins:ESP32_PINS,offboard:true,board:true,mcu:'esp32'},
 pico:{name:'Raspberry Pi Pico board',legs:PICO_LEGS,props:{code:PICO_BLINK},pins:PICO_PINS,offboard:true,board:true,mcu:'pico'},
 rgbled:{name:'RGB LED (common cathode)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{},pins:['R','−','G','B']},
 pir:{name:'PIR motion sensor (HC-SR501)',legs:[[0,0],[1,0],[2,0]],props:{on:false},pins:['VCC','OUT','GND']},
 tilt:{name:'Tilt switch (SW-520D)',legs:[[0,0],[2,0]],props:{on:false},pins:['1','2']},
 joystick:{name:'Joystick module (KY-023)',legs:[[0,0],[1,0],[2,0],[3,0],[4,0]],props:{x:0.5,y:0.5,pressed:false},pins:['GND','+5V','VRx','VRy','SW']},
 motor:{name:'DC motor',legs:[[0,0],[2,0]],props:{kind:'hobby'},pins:['+','−'],offboard:true,module:true},
 servo:{name:'Servo motor (SG90)',legs:[[0,0],[1,0],[2,0]],props:{model:'sg90'},pins:['GND (brown)','V+ (red)','Signal (orange)'],offboard:true,module:true},
 stepper:{name:'Stepper motor 28BYJ-48 with ULN2003 driver',legs:[[0,0],[1,0],[2,0],[3,0],[5,0],[6,0]],props:{},pins:['IN1','IN2','IN3','IN4','+5V','GND'],offboard:true,module:true},
 relay:{name:'Relay module (5 V, active high)',legs:[[0,0],[1,0],[2,0],[0,5],[1,5],[2,5]],props:{},pins:['IN','VCC','GND','NO','COM','NC'],offboard:true,module:true},
 lcd:{name:'LCD 16×2 with I2C backpack',legs:[[0,0],[1,0],[2,0],[3,0]],props:{},pins:['GND','VCC','SDA','SCL'],offboard:true,module:true},
 oled:{name:'OLED 0.96" 128×64 (I2C)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{},pins:['GND','VCC','SCL','SDA'],offboard:true,module:true},
 ultrasonic:{name:'Ultrasonic distance sensor HC-SR04',legs:[[0,0],[1,0],[2,0],[3,0]],props:{cm:50},pins:['VCC','Trig','Echo','GND'],offboard:true,module:true},
 tempsensor:{name:'Temperature sensor (LM35 or TMP36)',legs:[[0,0],[1,0],[2,0]],props:{temp:25,model:'LM35'},pins:['+Vs','Vout','GND']},
 sht31:{name:'Temperature and humidity sensor SHT31-D (I2C)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{temp:25,hum:50},pins:['VIN','GND','SCL','SDA'],offboard:true,module:true,i2c:true},
 mlx90640:{name:'Thermal camera MLX90640 (32×24, I2C)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{amb:24,obj:36,ox:0.5,oy:0.5,size:0.3},pins:['VIN','GND','SCL','SDA'],offboard:true,module:true,i2c:true},
 lidar:{name:'LiDAR distance sensor VL53L0X (I2C)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{mm:500,mount:'desk'},pins:['VCC','GND','SCL','SDA'],offboard:true,module:true,i2c:true},
 camera:{name:'RGB camera OV2640 (18-pin module)',legs:Array.from({length:18},(_,i)=>[i,0]),props:{color:'red',ox:0.5,oy:0.5,size:0.25,light:0.8},pins:['3V3','GND','SIOC','SIOD','VSYNC','HREF','PCLK','XCLK','D7','D6','D5','D4','D3','D2','D1','D0','RESET','PWDN'],offboard:true,module:true,i2c:true},
 piezo:{name:'Piezoelectric disc (knock sensor)',legs:[[0,0],[2,0]],props:{strength:0.6},pins:['+ (red)','− (black)']},
 vibration:{name:'Vibration sensor module (SW-420)',legs:[[0,0],[1,0],[2,0]],props:{on:false},pins:['VCC','GND','DO']},
 mic:{name:'Microphone module (MAX4466)',legs:[[0,0],[1,0],[2,0]],props:{sound:'tone',level:0.5,freq:440},pins:['OUT','GND','VCC']},
 mpu6050:{name:'Gyro and accelerometer MPU6050 (I2C)',legs:[[0,0],[1,0],[2,0],[3,0]],props:{roll:0,pitch:0,yawRate:0,temp:25,mount:'desk'},pins:['VCC','GND','SCL','SDA'],offboard:true,module:true,i2c:true},
 lipo:{name:'LiPo battery (drone)',legs:[[0,0],[2,0]],props:{cells:4,mah:1500,c:100},pins:['+ (red)','− (black)'],offboard:true},
 esc:{name:'Brushless ESC (electronic speed controller)',legs:[[0,0],[1,0],[2,0],[3,0],[5,0],[6,0],[7,0]],props:{amps:35},pins:['BAT +','BAT −','Signal','Signal GND','A','B','C'],offboard:true,module:true},
 bldc:{name:'Brushless drone motor',legs:[[0,0],[1,0],[2,0]],props:{model:'2207',dir:'CW',arm:0},pins:['A','B','C'],offboard:true,module:true},
 frame:{name:'Drone frame',legs:[],props:{kind:'quad5',payload:0},pins:[],offboard:true,module:true},
 fc:{name:'Flight controller F405 (30 × 30 mm)',legs:[[0,0],[1,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[0,7],[1,7],[2,7],[3,7],[4,7]],props:{thr:0,roll:0,pitch:0,yaw:0,arm:false,mode:'angle',hold:false},pins:['VBAT','GND','M1','M2','M3','M4','M5','M6','M7','M8','THR in','ROLL in','PITCH in','YAW in','AUX1 in'],offboard:true,module:true},
 l298n:{name:'Motor driver L298N (two DC motors)',legs:[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[7,0],[8,0],[9,0],[0,-9],[1,-9],[8,-9],[9,-9]],props:{},pins:['ENA','IN1','IN2','IN3','IN4','ENB','+12V','GND','+5V','OUT1','OUT2','OUT3','OUT4'],offboard:true,module:true},
 'motor:coin':{alias:'motor',name:'Coin vibration motor (3 V)',legs:[[0,0],[2,0]],props:{kind:'coin'},pins:['+','−'],offboard:true,module:true},
 'motor:pump':{alias:'motor',name:'Mini water pump (5 V)',legs:[[0,0],[2,0]],props:{kind:'pump'},pins:['+','−'],offboard:true,module:true},
 'motor:fan':{alias:'motor',name:'Fan 40 mm (5 V)',legs:[[0,0],[2,0]],props:{kind:'fan'},pins:['+','−'],offboard:true,module:true},
 'servo:mg996r':{alias:'servo',name:'Servo motor MG996R (metal gear, 11 kg·cm)',legs:[[0,0],[1,0],[2,0]],props:{model:'mg996r'},pins:['GND (brown)','V+ (red)','Signal (orange)'],offboard:true,module:true},
 'servo:fs90r':{alias:'servo',name:'Continuous rotation servo FS90R (360°)',legs:[[0,0],[1,0],[2,0]],props:{model:'fs90r'},pins:['GND (brown)','V+ (red)','Signal (orange)'],offboard:true,module:true},
 nema17:{name:'Stepper motor NEMA 17 with A4988 driver',legs:[[0,0],[1,0],[2,0],[4,0],[5,0],[6,0],[7,0]],props:{micro:1},pins:['EN','STEP','DIR','VMOT','GND','VDD','GND'],offboard:true,module:true},
 solenoid:{name:'Push solenoid (12 V)',legs:[[0,0],[2,0]],props:{},pins:['+','−'],offboard:true,module:true},
 scope:{name:'Oscilloscope (2 channels)',legs:[[0,0],[2,0],[4,0]],props:{tb:0.002,vd:1,trig:true},pins:['CH1','CH2','GND'],offboard:true,module:true},
 fgen:{name:'Function generator',legs:[[0,0],[2,0]],props:{wave:'sine',freq:100,amp:2,off:2.5},pins:['OUT','GND'],offboard:true,module:true},
 logicprobe:{name:'Logic probe',legs:[[0,0],[2,0],[4,0]],props:{},pins:['TIP','VCC (red)','GND (black)'],offboard:true,module:true},
 buzzer:{name:'Buzzer',legs:[[0,0],[2,0]],props:{kind:'active'},pins:['+','−']},
 voltmeter:{name:'Voltmeter',flex:true,legs:2,span:3,probes:true,props:{},pins:['red +','black −']},
 ammeter:{name:'Ammeter',flex:true,legs:2,span:3,probes:true,props:{},pins:['red (in)','black (out)']},
};
addBoards();addPis();addS3();
const GATES={7400:{f:(a,b)=>!(a&&b),n:4},7402:{f:(a,b)=>!(a||b),n:4,nor:true},7404:{f:a=>!a,n:6,not:true},7408:{f:(a,b)=>a&&b,n:4},7432:{f:(a,b)=>a||b,n:4},7486:{f:(a,b)=>a!==b,n:4}};
// pin numbers (1-based) of each gate: [in1,in2,out]
function gatePins(ic){if(ic==='7404')return[[1,2],[3,4],[5,6],[9,8],[11,10],[13,12]].map(([i,o])=>[i,null,o]);if(ic==='7402')return[[2,3,1],[5,6,4],[8,9,10],[11,12,13]];return[[1,2,3],[4,5,6],[9,10,8],[12,13,11]]}
const LED_VF={red:1.85,yellow:2.0,green:2.1,orange:1.95,blue:2.9,white:3.0};
function ldrOhms(p){const d=Math.max(1,+p.props.dark||1e6),b=Math.max(1e-3,+p.props.bright||1e3),a=Math.max(0,Math.min(1,+p.props.light));return d*Math.pow(b/d,a)}
const LED_RGB={red:'#ff3b30',yellow:'#ffd60a',green:'#34c759',orange:'#ff9500',blue:'#2f8bff',white:'#f4f7ff'};
function legsOf(p){const L=LIB[p.type];if(L.flex)return p.legs.map(l=>l.slice());const r=((p.rot||0)%360+360)%360;return L.legs.map(([dx,dy])=>{let x=dx*P,y=dy*P;for(let k=0;k<r/90;k++){const t=x;x=-y;y=t}return[p.pos[0]+x,p.pos[1]+y]})}
function newPart(type,at){const L=LIB[type];const p={id:'p'+Math.random().toString(36).slice(2,8),type:L.alias||type,props:JSON.parse(JSON.stringify(L.props||{}))};if(L.flex){const span=L.span||1;p.legs=[[at[0],at[1]],[at[0]+span*P,at[1]]];if(L.probes)p.pos=[at[0]+span*P/2,at[1]-60]}else{p.pos=[at[0],at[1]];p.rot=0}return p}

/* ---------- motors and drone parts ---------- */
const DCM={hobby:{name:'130 hobby motor (3 to 6 V)',R:10,kt:0.005,gear:1,J:2.5e-7,b:5e-8},tt:{name:'TT gear motor 1:48 (yellow, robot car)',R:7.5,kt:0.0045,gear:48,J:3e-7,b:6e-8},n20:{name:'N20 gear motor 1:100 (6 V)',R:25,kt:0.004,gear:100,J:1e-7,b:3e-8},coreless:{name:'Coreless 8520 (micro drone, 3.7 V)',R:1.6,kt:0.0012,gear:1,J:2e-8,b:4e-9},m775:{name:'775 motor (12 V, high torque)',R:1.2,kt:0.011,gear:1,J:4e-6,b:1e-6},m370:{name:'370 motor (6 V)',R:4,kt:0.006,gear:1,J:6e-7,b:1.2e-7},coin:{name:'Coin vibration motor (3 V)',R:25,kt:0.00025,gear:1,J:4e-9,b:8e-10},pump:{name:'Mini water pump (5 V)',R:12,kt:0.004,gear:1,J:4e-7,b:1.5e-7},fan:{name:'Fan 40 mm (5 V)',R:28,kt:0.0045,gear:1,J:5e-7,b:1.6e-7}};
/* brushless motors: kv, prop, rated cells, thrust and current at full throttle */
const BLDC={'0802':{name:'0802 19000 KV · Tiny Whoop, 31 mm prop, 1S',kv:19000,prop:'31 mm',cells:1,thrust:24,amps:4,w:2},'1404':{name:'1404 3800 KV · 3-inch, 4S',kv:3800,prop:'3 inch',cells:4,thrust:420,amps:14,w:9},'2207':{name:'2207 1950 KV · 5-inch freestyle, 6S',kv:1950,prop:'5 inch',cells:6,thrust:1550,amps:45,w:32},'2306':{name:'2306 2450 KV · 5-inch racing, 4S',kv:2450,prop:'5 inch',cells:4,thrust:1500,amps:40,w:31},'2212':{name:'2212 920 KV · F450 frame, 10-inch, 3S',kv:920,prop:'10 inch',cells:3,thrust:850,amps:15,w:55},'2814':{name:'2814 700 KV · long range 10-inch, 4S',kv:700,prop:'10 inch',cells:4,thrust:1700,amps:30,w:90},'4114':{name:'4114 400 KV · heavy lift 15-inch, 6S',kv:400,prop:'15 inch',cells:6,thrust:3800,amps:25,w:150}};
const FRAMES={whoop:{name:'Tiny Whoop 65 mm (ducted)',arms:4,w:5,size:65},quad3:{name:'3-inch quad X (130 mm)',arms:4,w:45,size:130},quad5:{name:'5-inch quad X freestyle (220 mm)',arms:4,w:110,size:220},f450:{name:'F450 quad X (450 mm)',arms:4,w:280,size:450},hex550:{name:'S550 hexacopter (550 mm)',arms:6,w:480,size:550},octo:{name:'X8 octocopter (1000 mm)',arms:8,w:1600,size:1000}};
function droneMass(doc){const fr=doc.parts.find(p=>p.type==='frame');const F=FRAMES[fr?fr.props.kind:'quad5']||FRAMES.quad5;let w=F.w+(fr?+fr.props.payload||0:0);for(const p of doc.parts){if(p.type==='bldc'){const B=BLDC[p.props.model]||BLDC['2207'];w+=B.w+(p.props.model==='0802'?0.5:/10|15/.test(B.prop)?18:4)}if(p.type==='esc')w+=8;if(p.type==='fc')w+=8;if(p.type==='lipo')w+=Math.round((+p.props.mah||1500)*(+p.props.cells||4)*0.03);if(LIB[p.type]&&LIB[p.type].mcu)w+=10;if(['mpu6050','camera','lidar','mlx90640','sht31'].includes(p.type))w+=3}return w}
function lipoV(p,st){const n=+p.props.cells||3,cap=+p.props.mah||1500;const soc=Math.max(0,1-((st&&st.used)||0)/cap);return n*(3.45+0.75*soc)}
function pinAtNode(sim,node){for(const m of sim.els)if(m.mcu)for(const[g,li]of m.mcu.gpio)if(m.nodes[li]===node)return{e:m,g};return null}
/* ---------- what the sensors see ---------- */
/* MLX90640: 24 rows x 32 columns of temperatures, a warm object on a background */
function thermFrame(pr,out){const amb=+pr.amb,obj=+pr.obj,cx=(+pr.ox)*31,cy=(+pr.oy)*23,r=Math.max(0.6,(+pr.size)*16);out=out||new Array(768);
 for(let y=0;y<24;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-cx,(y-cy)*1.05)/r;const k=Math.exp(-Math.pow(d,4));out[y*32+x]=amb+(obj-amb)*k+(Math.random()-0.5)*0.25+(y/23-0.5)*0.4}return out}
/* OV2640 picture: a coloured ball in front of a wall and a table */
const CAM_COL={red:[220,40,35],green:[40,170,70],blue:[40,90,220],yellow:[240,200,40],orange:[245,130,30],purple:[140,60,190],white:[240,240,240],black:[25,25,25]};
function camPixel(pr,x,y,W,H){const u=x/(W-1),v=y/(H-1);const lt=0.15+0.85*Math.max(0,Math.min(1,+pr.light));let c;
 if(v>0.72){const k=0.75+0.25*((Math.floor(u*12)+Math.floor(v*30))%2);c=[150*k,105*k,70*k]}else{c=[205-40*v,200-40*v,190-35*v]}
 const r=Math.max(0.02,+pr.size)*0.5,dx=(u-(+pr.ox))*W/H,dy=v-(+pr.oy),d=Math.hypot(dx,dy);
 if(d<r){const b=CAM_COL[pr.color]||CAM_COL.red;const sh=0.65+0.35*Math.max(0,1-Math.hypot(dx+r*0.35,dy+r*0.35)/(r*1.4));c=b.map(q=>q*sh)}else if(d<r*1.25&&v>(+pr.oy)){c=c.map(q=>q*(0.7+0.3*(d-r)/(r*0.25)))}
 return c.map(q=>Math.max(0,Math.min(255,Math.round(q*lt+(Math.random()-0.5)*6))))}
/* microphone waveform, -1 to 1 */
function micWave(pr,t){const f=Math.max(20,+pr.freq||440);switch(pr.sound){
 case'tone':return Math.sin(2*Math.PI*f*t);
 case'voice':{const syl=Math.max(0,Math.sin(2*Math.PI*2.6*t))*(t%2<1.4?1:0.05);return syl*(0.6*Math.sin(2*Math.PI*170*t)+0.3*Math.sin(2*Math.PI*340*t+1)+0.15*Math.sin(2*Math.PI*690*t+2))}
 case'clap':{const k=t%1;return k<0.12?Math.exp(-k/0.025)*(Math.random()*2-1):(Math.random()*2-1)*0.01}
 case'music':{const notes=[262,330,392,523],n=notes[Math.floor(t*4)%4];return 0.6*Math.sin(2*Math.PI*n*t)+0.25*Math.sin(2*Math.PI*n*2*t)}
 default:return(Math.random()*2-1)*0.02}}
/* ---------------- netlist ---------------- */
function connectivity(doc){const parent=new Map();const find=k=>{let r=k;while(parent.has(r)&&parent.get(r)!==r)r=parent.get(r);let c=k;while(parent.has(c)&&parent.get(c)!==r){const n=parent.get(c);parent.set(c,r);c=n}return r};const add=k=>{if(!parent.has(k))parent.set(k,k)};const union=(a,b)=>{add(a);add(b);const ra=find(a),rb=find(b);if(ra!==rb)parent.set(ra,rb)};
 const ptNode=(x,y)=>{const k=key(x,y);const h=HOLES.get(k);if(h){union('pt:'+k,'strip:'+h.strip);return'pt:'+k}add('pt:'+k);return'pt:'+k};
 const legPts=new Set();for(const p of doc.parts)for(const[x,y]of legsOf(p))legPts.add(key(x,y));
 /* a wire end joins a hole or a part terminal; two wire ends that only touch in the air stay apart */
 doc.wires.forEach((w,i)=>{const end=(q,s)=>{const k=key(q[0],q[1]);if(HOLES.has(k)||legPts.has(k))return ptNode(q[0],q[1]);const id='wf:'+i+s;add(id);return id};union(end(w.a,'a'),end(w.b,'b'))});
 const partLegs=new Map();for(const p of doc.parts){const legs=legsOf(p);const ids=legs.map(([x,y])=>ptNode(x,y));partLegs.set(p.id,ids);if(p.type==='seg7')union(ids[2],ids[7]);{const L_=LIB[p.type];if(L_&&L_.mcu){const M_=MCU[L_.mcu];const g=M_.gnd;g.forEach(k=>union(ids[g[0]],ids[k]));(M_.same||[]).forEach(q=>q.forEach(k=>union(ids[q[0]],ids[k])))}}}
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
   if(p.type==='battery'||p.type==='supply'||p.type==='lipo'){e.rint=internal();if(this.refNode==null)this.refNode=nodes[1]}
   if(p.type==='led'||p.type==='pled'||p.type==='diode')e.mid=internal();if(p.type==='rgbled'){e.mids=[internal(),internal(),internal()];e.subs=[{},{},{}]}
   if(p.type==='ne555')e.n1=internal();
   if(LIB[p.type].mcu){e.mcu=MCU[LIB[p.type].mcu];e.gndN=nodes[e.mcu.gnd[0]];this.unoStart(e)}
   if(p.type==='motor'){e.w=0;e.th=0}if(p.type==='relay'){e.on=false}if(p.type==='stepper'){e.idx=-1;e.ang=0}
   if(p.type==='seg7')e.mids=Array.from({length:8},internal);
   this.els.push(e)}
  this.n=n;if(this.refNode==null){const m=this.els.find(x=>x.mcu);this.refNode=m?m.gndN:0}this.linkModules();
  this.frameE=this.els.find(x=>x.type==='frame')||null;if(this.frameE){const F=FRAMES[this.frameE.p.props.kind]||FRAMES.quad5;let k=0;const used=new Set(this.els.filter(x=>x.type==='bldc'&&+x.p.props.arm>0).map(x=>+x.p.props.arm-1));for(const m of this.els.filter(x=>x.type==='bldc')){let a=+m.p.props.arm-1;if(!(a>=0)){while(used.has(k))k++;a=k++}m.arm=a<F.arms?a:-1}this.drone={x:0,y:0,z:0,vx:0,vy:0,vz:0,ro:0,pi:0,ya:0,p:0,q:0,r:0,az:0,spin:0,crashed:false,air:false,maxZ:0,mass:droneMass(this.doc)}}
  this.vsrc=this.els.filter(e=>e.type==='battery'||e.type==='supply'||e.type==='lipo'||e.type==='ammeter');this.vsrc.forEach((e,i)=>e.vi=n+i);this.N=n+this.vsrc.length;
  this.x=new Float64Array(this.N);this.xprev=new Float64Array(this.N);
  for(const e of this.els){const s=this.state[e.p.id]=this.state[e.p.id]||{};if(e.p.type==='ne555')s.q=0;if(LIB[e.p.type].ic)s.out=[]}
  this.dc()}
 V(i){return i===this.refNode?0:this.x[i]-this.x[this.refNode]}
 dc(){/* initial operating point: capacitors open, a few hundred settling steps */const dt0=this.dt;this.dcMode=true;for(let k=0;k<4;k++)this.solve(1e9);this.dcMode=false;this.xprev.set(this.x);this.dt=dt0}
 step(n){for(let i=0;i<n;i++){for(const e of this.els)if(e.rt)this.unoRun(e);for(const e of this.els)if(e.type==='fc')this.fcStep(e);for(const e of this.els)if(e.type==='servo'||e.type==='nema17'||e.type==='stepper'||e.type==='motor'||e.type==='esc'||e.type==='l298n')this.mech(e);if(this.frameE)this.droneStep();this.solve(this.dt);this.updateLogic();this.afterStep();this.xprev.set(this.x);this.t+=this.dt}}
 solve(dt){const N=this.N;let x=this.x;for(let it=0;it<60;it++){const G=Array.from({length:N},()=>new Float64Array(N));const I=new Float64Array(N);this.stamp(G,I,x,dt);
   for(let i=0;i<this.n;i++)G[i][i]+=1e-9;const r=this.ref=this.refNode;for(let j=0;j<N;j++){G[r][j]=0}G[r][r]=1;I[r]=0;
   const xn=gauss(G,I);if(!xn)return;let conv=true;for(let i=0;i<N;i++){if(!isFinite(xn[i]))return;if(Math.abs(xn[i]-x[i])>1e-4+1e-3*Math.abs(xn[i]))conv=false}x.set(xn);this.limited=false;if(conv&&it>0)break}}
 stamp(G,I,x,dt){const cond=(a,b,g)=>{G[a][a]+=g;G[b][b]+=g;G[a][b]-=g;G[b][a]-=g};const cur=(a,b,i)=>{I[a]-=i;I[b]+=i};/* current i flows a->b through element */
  const diode=(a,b,e,Is,nf,key)=>{const vd0=x[a]-x[b];const st=this.state[e.p.id];const vt=nf*VT;const vcrit=vt*Math.log(vt/(Math.SQRT2*Is));const old=st[key]==null?0:st[key];let vd=pnjlim(vd0,old,vt,vcrit);st[key]=vd;const ex=Math.exp(Math.min(vd/vt,80));const id=Is*(ex-1),gd=Is*ex/vt+1e-12;cond(a,b,gd);cur(a,b,id-gd*vd)};
  for(const e of this.els){const nd=e.nodes,p=e.p,st=this.state[p.id];
   switch(e.mcu?'__mcu':e.type){
    case'resistor':cond(nd[0],nd[1],1/Math.max(1e-3,+p.props.ohms||1));break;
    case'pot':{const R=Math.max(10,+p.props.ohms||10000),a=Math.max(0.001,Math.min(0.999,+p.props.pos));cond(nd[0],nd[1],1/(R*a));cond(nd[1],nd[2],1/(R*(1-a)));break}
    case'button':cond(nd[0],nd[1],p.props.pressed?100:1e-12);break;
    case'switch':{const on=!!p.props.on;cond(nd[1],on?nd[2]:nd[0],100);cond(nd[1],on?nd[0]:nd[2],1e-12);break}
    case'capacitor':case'ecap':{if(this.dcMode){cond(nd[0],nd[1],1e-10);break}const g=(+p.props.farads||1e-9)/dt;cond(nd[0],nd[1],g);const vp=this.xprev[nd[0]]-this.xprev[nd[1]];cur(nd[1],nd[0],g*vp);break}
    case'led':{if(st.burned){cond(nd[0],nd[1],1e-10);break}const vf=LED_VF[p.props.color]||1.9;const nf=2.0;const Is=0.01/(Math.exp(vf/(nf*VT))-1);diode(nd[0],e.mid,e,Is,nf,'vd');cond(e.mid,nd[1],1/8);break}
    case'pled':{if(st.burned){cond(nd[0],nd[1],1e-10);break}const vf=(LED_VF[p.props.color]||2.9)+0.25;const nf=2.0;const Is=0.35/(Math.exp(vf/(nf*VT))-1);diode(nd[0],e.mid,e,Is,nf,'vd');cond(e.mid,nd[1],1/1);break}
    case'ldr':cond(nd[0],nd[1],1/ldrOhms(p));break;
    case'rgbled':{[[0,'red'],[2,'green'],[3,'blue']].forEach(([k,c],j)=>{const vf=LED_VF[c]||2;const nf=2.0;const Is=0.01/(Math.exp(vf/(nf*VT))-1);diode(nd[k],e.mids[j],e,Is,nf,'vd'+j);cond(e.mids[j],nd[1],1/8)});break}
    case'pir':{const on=!!p.props.on;cond(nd[1],on?nd[0]:nd[2],1/100);cond(nd[1],on?nd[2]:nd[0],1e-9);cond(nd[0],nd[2],1/50000);break}
    case'tilt':cond(nd[0],nd[1],p.props.on?100:1e-12);break;
    case'joystick':{const R=10000;for(const[k,v]of[[2,+p.props.x],[3,+p.props.y]]){const a=Math.max(0.001,Math.min(0.999,1-v));cond(nd[1],nd[k],1/(R*a));cond(nd[k],nd[0],1/(R*(1-a)))}cond(nd[4],nd[0],p.props.pressed?100:1e-12);break}
    case'diode':{diode(nd[0],e.mid,e,1e-9,1.8,'vd');cond(e.mid,nd[1],1/0.05);break}
    case'npn':{const[E,B,C]=nd;const Is=1e-14,bf=150,br=4;const vt=VT,vcrit=vt*Math.log(vt/(Math.SQRT2*Is));let vbe=x[B]-x[E],vbc=x[B]-x[C];vbe=pnjlim(vbe,st.vbe||0,vt,vcrit);vbc=pnjlim(vbc,st.vbc||0,vt,vcrit);st.vbe=vbe;st.vbc=vbc;
     const ef=Math.exp(Math.min(vbe/vt,80)),er=Math.exp(Math.min(vbc/vt,80));const ict=Is*(ef-er),ibe=Is/bf*(ef-1),ibc=Is/br*(er-1);const gmf=Is*ef/vt,gmr=Is*er/vt,gbe=Is/bf*ef/vt+1e-12,gbc=Is/br*er/vt+1e-12;
     const Ic=ict-ibc,Ib=ibe+ibc;const dIc={C:gmr+gbc,B:gmf-gmr-gbc,E:-gmf},dIb={C:-gbc,B:gbe+gbc,E:-gbe};const dIe={C:-(dIc.C+dIb.C),B:-(dIc.B+dIb.B),E:-(dIc.E+dIb.E)};const Ie=-(Ic+Ib);const v={C:x[C],B:x[B],E:x[E]};const nodeOf={C,B,E};
     const cIc=Ic-gmf*vbe+(gmr+gbc)*vbc,cIb=Ib-gbe*vbe-gbc*vbc,cIe=-(cIc+cIb);
     for(const[t,c0,d]of[['C',cIc,dIc],['B',cIb,dIb],['E',cIe,dIe]]){const k=nodeOf[t];for(const j of['C','B','E'])G[k][nodeOf[j]]+=d[j];I[k]-=c0}
     st.ic=Ic;st.ib=Ib;break}
    case'lipo':case'battery':case'supply':{const vi=e.vi;const Rin=e.type==='battery'?1.5:e.type==='lipo'?0.004*(+p.props.cells||3):0.05;/* source between + and internal node, internal R to - */G[nd[0]][vi]+=1;G[e.rint][vi]-=1;G[vi][nd[0]]+=1;G[vi][e.rint]-=1;I[vi]+=e.type==='lipo'?lipoV(p,st):(+p.props.volts||0);cond(e.rint,nd[1],1/Rin);break}
    case'ammeter':{const vi=e.vi;G[nd[0]][vi]+=1;G[nd[1]][vi]-=1;G[vi][nd[0]]+=1;G[vi][nd[1]]-=1;break}
    case'voltmeter':cond(nd[0],nd[1],1e-7);break;
    case'__mcu':{const M=e.mcu,GND=e.gndN;const src=(k,V,g)=>{if(k===GND)return;cond(k,GND,g);cur(GND,k,g*V)};if(M.v5>=0)src(nd[M.v5],5,10);if(M.v33>=0)src(nd[M.v33],3.3,10);
     const rt=e.rt;for(const[g,li]of M.gpio){const k=nd[li];const s=rt&&rt.state!=='error'?rt.pins[g]:null;if(!s||s.mode===0){cond(k,GND,1e-8);continue}
      if(s.mode===2){src(k,M.vl,1/M.pull);continue}if(s.mode===3){src(k,0,1/M.pull);continue}let V=s.v?M.vl:0;if(s.tone)V=M.vl/2;else if(s.pwm>=0)V=M.vl*s.pwm/255;src(k,V,1/M.rout)}break}
    case'motor':{/* winding resistance and a back EMF that grows with speed */const K=DCM[p.props.kind]||DCM.hobby;const g=1/K.R,E=K.kt*e.w;cond(nd[0],nd[1],g);cur(nd[1],nd[0],g*E);break}
    case'servo':cond(nd[1],nd[0],1/250);cond(nd[2],nd[0],1e-7);break;
    case'stepper':{const V=x[nd[4]]-x[nd[5]];for(let k=0;k<4;k++){cond(nd[k],nd[5],1/10000);if(V>3.5&&x[nd[k]]-x[nd[5]]>2)cond(nd[4],nd[5],1/60)}break}
    case'relay':{cond(nd[0],nd[2],1/10000);if(e.on)cond(nd[1],nd[2],1/70);else cond(nd[1],nd[2],1/20000);cond(nd[4],nd[3],e.on?20:1e-12);cond(nd[4],nd[5],e.on?1e-12:20);break}
    case'lcd':cond(nd[1],nd[0],1/2500);cond(nd[2],nd[0],1e-7);cond(nd[3],nd[0],1e-7);break;
    case'oled':cond(nd[1],nd[0],1/1000);cond(nd[2],nd[0],1e-7);cond(nd[3],nd[0],1e-7);break;
    case'ultrasonic':cond(nd[0],nd[3],1/350);cond(nd[1],nd[3],1e-6);{const on=e.echoHigh&&x[nd[0]]-x[nd[3]]>4;const g=1/100;cond(nd[2],nd[3],on?g:1e-7);if(on)cur(nd[3],nd[2],g*5)}break;
    case'tempsensor':{const V=x[nd[0]]-x[nd[2]];cond(nd[0],nd[2],1/50000);const lm=p.props.model!=='TMP36';const ok=lm?V>3.8:V>2.6;const t=+p.props.temp||0;const vo=ok?Math.max(0,lm?t*0.01:0.5+t*0.01):0;const g=1/100;cond(nd[1],nd[2],g);cur(nd[2],nd[1],g*vo);break}
    case'sht31':case'mlx90640':case'lidar':case'camera':cond(nd[0],nd[1],1/(p.type==='mlx90640'?1000:p.type==='camera'?400:4000));for(let k=2;k<nd.length;k++)cond(nd[k],nd[1],1e-7);break;
    case'piezo':{const g=1/20000;cond(nd[0],nd[1],g);let vo=0;if(st.tap!=null&&!this.dcMode){const k=this.t-st.tap;if(k>=0&&k<0.25)vo=(+p.props.strength||0.5)*9*Math.exp(-k/0.012)*Math.cos(2*Math.PI*330*k)}st.vo=vo;if(vo)cur(nd[1],nd[0],g*vo);break}
    case'vibration':{const on=!!p.props.on&&(Math.sin(this.t*2*Math.PI*35)>-0.6);cond(nd[2],on?nd[0]:nd[1],1/100);cond(nd[2],on?nd[1]:nd[0],1e-9);cond(nd[0],nd[1],1/8000);break}
    case'mic':{const V=x[nd[2]]-x[nd[1]];cond(nd[2],nd[1],1/12000);const g=1/150;let vo=0;if(V>2.3){const lv=Math.max(0,Math.min(1,+p.props.level));vo=V/2+(this.dcMode?0:lv*0.97*(V/2)*Math.max(-1,Math.min(1,micWave(p.props,this.t))))}cond(nd[0],nd[1],g);cur(nd[1],nd[0],g*vo);break}
    case'fc':cond(nd[0],nd[1],1/600);for(let k=2;k<15;k++)cond(nd[k],nd[1],1e-6);break;
    case'mpu6050':cond(nd[0],nd[1],1/5000);cond(nd[2],nd[1],1e-7);cond(nd[3],nd[1],1e-7);break;
    case'esc':{cond(nd[0],nd[1],1/20000);cond(nd[1],nd[3],50);cond(nd[2],nd[3],1e-6);const V=x[nd[0]]-x[nd[1]];const I=e.iBat||0;if(I>0&&V>1)cond(nd[0],nd[1],I/V);break}
    case'l298n':{const[ENA,IN1,IN2,IN3,IN4,ENB,V12,GND,V5,O1,O2,O3,O4]=nd;cond(V12,GND,1/20000);for(const k of[ENA,IN1,IN2,IN3,IN4,ENB])cond(k,GND,1e-5);const vs=x[V12]-x[GND];
     /* the on-board regulator gives 5 V when the supply is above 7 V */if(vs>7){cond(V5,GND,1/2);cur(GND,V5,5/2)}else cond(V5,GND,1e-6);
     const lv=k=>x[k]-x[GND]>2.3;const ch=[[ENA,IN1,IN2,O1,O2,0],[ENB,IN3,IN4,O3,O4,1]];for(const[en,a,b,oa,ob,j]of ch){const d=e.duty?e.duty[j]:(lv(en)?1:0);const on=d>0.01;const vh=Math.max(0,vs-1.4)*d;
      for(const[o,i]of[[oa,a],[ob,b]]){if(!on){cond(o,GND,1e-6);continue}const g=1/1.5;cond(o,GND,g);cur(GND,o,g*(lv(i)?vh:0))}}break}
    case'solenoid':cond(nd[0],nd[1],1/30);break;
    case'nema17':{cond(nd[3],nd[4],e.stepOn?1/6:1/20000);cond(nd[5],nd[6],1/5000);cond(nd[0],nd[4],1/50000);cond(nd[1],nd[4],1/100000);cond(nd[2],nd[4],1/100000);break}
    case'scope':cond(nd[0],nd[2],1e-6);cond(nd[1],nd[2],1e-6);break;
    case'logicprobe':cond(nd[1],nd[2],1/5000);cond(nd[0],nd[2],1e-6);break;
    case'fgen':{const pr=p.props,f=Math.max(0.1,Math.min(2000,+pr.freq||100)),A=+pr.amp||0,O=+pr.off||0;const ph=(this.t*f)%1;let w;switch(pr.wave){case'square':w=ph<0.5?1:-1;break;case'triangle':w=ph<0.5?4*ph-1:3-4*ph;break;case'saw':w=2*ph-1;break;default:w=Math.sin(2*Math.PI*ph)}const v=this.dcMode?O:O+A*w;st.vo=v;const g=1/50;cond(nd[0],nd[1],g);cur(nd[1],nd[0],g*v);break}
    case'buzzer':cond(nd[0],nd[1],1/120);break;
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
   if(e.type==='lipo'){const i=-x[e.vi];st.i=i;st.v=x[nd[0]]-x[nd[1]];st.used=(st.used||0)+Math.max(0,i)*dt/3.6;const cap=+p.props.mah||1500,lim=cap*(+p.props.c||75)/1000;if(i>lim)this.addWarn(p.id,'c',`The LiPo gives ${i.toFixed(0)} A, more than its ${lim.toFixed(0)} A limit (${cap} mAh × ${p.props.c||75}C). It heats up and swells`);if(i>400)this.addWarn(p.id,'short','Short circuit on the LiPo battery. This can start a fire');if(lipoV(p,st)/(+p.props.cells||3)<3.5)this.addWarn(p.id,'low',`The LiPo is nearly empty (${(lipoV(p,st)/(+p.props.cells||3)).toFixed(2)} V per cell). Land and charge it; below 3.3 V per cell the cells are damaged`)}
   if(e.type==='battery'||e.type==='supply'){const i=-x[e.vi];st.i=i;st.v=x[nd[0]]-x[nd[1]];if(i>(e.type==='battery'?1.5:2)){this.addWarn(p.id,'short',`Short circuit: the ${e.type==='battery'?'battery':'power supply'} gives ${i.toFixed(1)} A. Check for a wire or part that connects + to − directly`)}}
   if(e.type==='ammeter')st.i=x[e.vi];
   if(e.type==='voltmeter')st.v=x[nd[0]]-x[nd[1]];
   if(e.mcu&&e.rt){st.serial=e.rt.serial;st.pins=e.rt.pins;const lp=e.rt.pins[e.mcu.led];st.l13=!!(lp&&lp.mode===1&&(lp.v||lp.pwm>0));st.rt=e.rt}
   if(e.type==='motor'){st.rpm=e.w*60/(2*Math.PI);st.th=e.th;st.i=(x[nd[0]]-x[nd[1]]-0.005*e.w)/10}
   if(e.type==='servo'){st.ang=e.ang;st.spd=e.spd||0;st.powered=x[nd[1]]-x[nd[0]]>4}
   if(e.type==='solenoid'){const i=(x[nd[0]]-x[nd[1]])/30;st.i=i;st.on=i>0.25}
   if(e.type==='scope')this.scopeStep(e,st);
   if(e.type==='logicprobe'){const vt=x[nd[0]]-x[nd[2]],vc=x[nd[1]]-x[nd[2]];st.pw=vc>2;const lv=vc>2?(vt>0.7*vc?1:vt<0.3*vc?0:-1):-1;if(lv!==st.lv&&lv>=0&&st.lv>=0)st.pulseT=this.t;st.lv=lv;st.pulse=st.pulseT!=null&&this.t-st.pulseT<0.2;st.v=vt}
   if(e.type==='stepper'){st.ang=e.ang;st.coils=[0,1,2,3].map(k=>x[nd[k]]-x[nd[5]]>2&&x[nd[4]]-x[nd[5]]>3.5)}
   if(e.type==='relay'){const vin=x[nd[0]]-x[nd[2]],vcc=x[nd[1]]-x[nd[2]];const on=vcc>3.8&&(e.on?vin>1.5:vin>2);if(on!==e.on){e.on=on;st.clicks=(st.clicks||0)+1}st.on=on;st.powered=vcc>3.8}
   if(e.type==='lcd'||e.type==='oled'){st.powered=x[nd[1]]-x[nd[0]]>(e.type==='lcd'?4:2.8);st.dev=null;if(st.powered&&e.bus&&e.bus.rt){const r=e.bus.rt;st.dev=e.type==='lcd'?(r.lcds||[]).find(L=>L.i2c)||null:(r.oleds||[])[0]||null}}
   if(e.type==='ultrasonic'){st.powered=x[nd[0]]-x[nd[3]]>4;st.echo=!!e.echoHigh}
   if(e.type==='tempsensor'){st.v=x[nd[1]]-x[nd[2]]}
   if(LIB[e.type].i2c){st.powered=x[nd[0]]-x[nd[1]]>2.5;st.linked=!!e.dev;st.used=!!(e.dev&&e.dev.used)}
   if(e.type==='mic'){st.v=x[nd[0]]-x[nd[1]];st.powered=x[nd[2]]-x[nd[1]]>2.3}
   if(e.type==='vibration'){st.v=x[nd[2]]-x[nd[1]]}
   if(e.type==='piezo'){st.v=x[nd[0]]-x[nd[1]]}
   if(e.type==='buzzer'){const v=x[nd[0]]-x[nd[1]];st.i=v/120;let f=0;if(e.tonePin){const s=e.tonePin.e.rt&&e.tonePin.e.rt.pins[e.tonePin.g];if(s&&s.mode===1&&s.tone)f=s.tone}st.on=f>0||(p.props.kind!=='passive'&&v>2);st.freq=f||(p.props.kind!=='passive'?2700:0);st.vol=Math.min(1,Math.abs(v)/5)}
   if(e.type==='ecap'){const v=x[nd[0]]-x[nd[1]];st.v=v;if(v<-1)this.addWarn(p.id,'rev','An electrolytic capacitor is connected backwards (its − leg is at the higher voltage). It can be damaged')}
   if(e.type==='capacitor')st.v=x[nd[0]]-x[nd[1]];
   if(e.type==='npn'){st.vce=x[nd[2]]-x[nd[0]];st.vbe=x[nd[1]]-x[nd[0]]}
   if(e.type==='rgbled')st.rgb=[0,2,3].map((k,j)=>Math.max(0,Math.min(1,(x[e.mids[j]]-x[nd[1]])*8/0.015)));
   if(LIB[e.type]&&LIB[e.type].ic&&!st.powered&&this.t>0.01)this.addWarn(p.id,'pwr',`${LIB[e.type].name.split(' ')[0]} has no power: connect pin 14 to + and pin 7 to −`)
   if(e.type==='ne555'&&!st.powered&&this.t>0.01)this.addWarn(p.id,'pwr','The 555 has no power: connect pin 8 to + and pin 1 to −')}}
 unoStart(e){const st=this.state[e.p.id]=this.state[e.p.id]||{};const M=e.mcu;if(M.lang==='python')return this.piStart(e,st);const I=root.INO;if(!I){st.err='The sketch runner is not loaded';return}
  const prog=I.compile(boardSource(e.type,e.p.props.code),{int32:!AVR8.has(e.type)});if(!prog.ok){st.err=prog.errors.map(x=>(x.line?'Line '+x.line+': ':'')+x.msg).join('\n');return}
  const rt=new I.Sim(prog,[]);const self=this;while(rt.pins.length<M.count)rt.pins.push({mode:0,v:0,pwm:-1,tone:0,touched:false});
  const volt=g=>{const x=self.x,li=M.gpio.get(g);return x&&li!=null?x[e.nodes[li]]-x[e.gndN]:0};
  rt.pinOk=function(p,l){p=p|0;if(p<0||p>=M.count||(!M.gpio.has(p)&&p!==M.led))throw new Error(`Pin ${p} does not exist on the ${M.name}`+(e.type==='uno'?'. Use 0 to 13, or A0 to A5':M.hint||''));return p};
  rt.level=function(p){const s=this.pins[p];if(s&&s.mode===1)return s.v;return volt(p)>M.vl/2?1:0};
  rt.ar=function(p,l){p=M.adc.alias(p|0);if(!M.adc.pins.includes(p))throw new Error(`analogRead() needs an analog pin of the ${M.name} (got ${p})`);this.us+=100;const mx=(1<<M.adc.bits)-1;return Math.max(0,Math.min(mx,Math.round(volt(p)/M.adc.vref*mx)))};
  if(M.pwm&&e.type!=='uno')rt.aw=function(p,v,l){p=this.pinOk(p,l);v=Math.max(0,Math.min(255,v|0));const s=this.pins[p];s.touched=true;s.mode=1;if(M.pwm.has(p)){s.pwm=v;s.v=v>0?1:0}else{s.pwm=-1;s.v=v>=128?1:0;if(!this.pwmWarned){this.pwmWarned=true;if(this.warn)this.warn(l,`Pin ${p} has no PWM on the ${M.name}. analogWrite() works on pins ${[...M.pwm].join(', ')}`)}}this.emit('pins')};
  if(!M.pwm)rt.aw=function(p,v,l){p=this.pinOk(p,l);v=Math.max(0,Math.min(255,v|0));const s=this.pins[p];s.touched=true;s.mode=1;s.pwm=v;s.v=v>0?1:0;this.emit('pins')};
  e.rt=rt;st.err=null;st.warns=prog.warnings||[]}
 piStart(e,st){const Y=root.PYRT;if(!Y){st.err='The Python runner is not loaded';return}const M=e.mcu;const prog=Y.compile(e.p.props.code||'');if(!prog.ok){st.err=prog.errors.map(x=>(x.line?'Line '+x.line+': ':'')+x.msg).join('\n');return}
  const rt=new Y.Sim(prog,{count:M.count});const self=this;const volt=g=>{const x=self.x,li=M.gpio.get(g);return x&&li!=null?x[e.nodes[li]]-x[e.gndN]:0};
  rt.level=function(p){const s=this.pins[p];if(s&&s.mode===1)return s.v;return volt(p)>1.6?1:0};rt.pinOk=function(p){p=p|0;if(p<0||p>27)throw new Y.PyErr('ValueError',`GPIO ${p} is not on the header. Use GPIO 0 to 27 (BCM numbers), or GPIO.setmode(GPIO.BOARD) for header pin numbers`);return p};
  e.rt=rt;st.err=null;st.warns=[]}
 /* which board pin drives each module: found from the nodes they share */
 linkModules(){const mcus=this.els.filter(e=>e.mcu);const pinAt=node=>{for(const m of mcus)for(const[g,li]of m.mcu.gpio)if(m.nodes[li]===node)return{e:m,g};return null};
  for(const e of this.els){const nd=e.nodes;
   if(e.type==='servo')e.sig=pinAt(nd[2]);if(e.type==='buzzer')e.tonePin=pinAt(nd[0]);
   if(e.type==='lcd'||e.type==='oled'){const sda=pinAt(nd[e.type==='lcd'?2:3]),scl=pinAt(nd[e.type==='lcd'?3:2]);e.bus=sda&&scl&&sda.e===scl.e&&sda.g===sda.e.mcu.i2c.sda&&scl.g===sda.e.mcu.i2c.scl?sda.e:null;if(sda&&scl&&!e.bus)this.addWarn(e.p.id,'i2c',`Wire SDA and SCL of the display to the ${sda.e.mcu.name} I2C pins: SDA ${sda.e.mcu.i2c.sda}, SCL ${sda.e.mcu.i2c.scl}`)}
   if(LIB[e.type].i2c){const scl=pinAt(nd[2]),sda=pinAt(nd[3]);const cam=e.type==='camera';const bus=sda&&scl&&sda.e===scl.e&&(cam||sda.g===sda.e.mcu.i2c.sda&&scl.g===sda.e.mcu.i2c.scl)?sda.e:null;e.dev=null;
    if(sda&&scl&&!bus&&!cam){const sw=sda.e===scl.e&&sda.g===sda.e.mcu.i2c.scl&&scl.g===sda.e.mcu.i2c.sda;this.addWarn(e.p.id,'i2c',sw?`SDA and SCL of the ${LIB[e.type].name.split(' (')[0]} are swapped. SDA goes to ${sda.e.mcu.name} pin ${sda.e.mcu.i2c.sda}, SCL to pin ${sda.e.mcu.i2c.scl}`:`Wire SDA and SCL of the ${LIB[e.type].name.split(' (')[0]} to the ${sda.e.mcu.name} I2C pins: SDA ${sda.e.mcu.i2c.sda}, SCL ${sda.e.mcu.i2c.scl}`)}
    if(bus&&bus.rt){const self=this,pr=e.p.props;const pt={type:e.type,src:e,props:pr,used:false,ok:()=>self.x&&self.x[nd[0]]-self.x[nd[1]]>2.5,
      temp:()=>+pr.temp+(Math.random()-0.5)*0.1,hum:()=>Math.max(0,Math.min(100,+pr.hum+(Math.random()-0.5)*0.4)),mm:()=>{const D=self.drone;if(pr.mount==='drone'&&D){const h=D.z*1000/Math.max(0.2,Math.cos(D.ro)*Math.cos(D.pi))+30;return h>2000?8190:Math.round(h+(Math.random()-0.5)*6)}const m=+pr.mm;return m>2000?8190:Math.max(20,Math.round(m+(Math.random()-0.5)*6))},
      pins:e.type==='camera'?Object.fromEntries(LIB.camera.pins.slice(2).map((n,k)=>{const q=pinAt(nd[k+2]);return[n,q&&q.e===bus?q.g:-1]})):null,frame:a=>thermFrame(pr,a),pix:(x,y,W,H)=>camPixel(pr,x,y,W,H),imu:k=>{const D=pr.mount==='drone'?self.drone:null;const r=D?D.ro:(+pr.roll||0)*Math.PI/180,pp=D?D.pi:(+pr.pitch||0)*Math.PI/180,n=()=>(Math.random()-0.5)*0.004;if(D){const vib=D.spin*0.02;switch(k){case'ax':return-Math.sin(pp)+n()*(1+vib*50);case'ay':return Math.sin(r)*Math.cos(pp)+n()*(1+vib*50);case'az':return Math.cos(r)*Math.cos(pp)+n()*(1+vib*50)+D.az/9.81;case'gx':return D.p*57.3+(Math.random()-0.5)*0.3;case'gy':return D.q*57.3+(Math.random()-0.5)*0.3;case'gz':return D.r*57.3+(Math.random()-0.5)*0.3}}switch(k){case'ax':return-Math.sin(pp)+n();case'ay':return Math.sin(r)*Math.cos(pp)+n();case'az':return Math.cos(r)*Math.cos(pp)+n();case'gx':case'gy':return(Math.random()-0.5)*0.3;case'gz':return(+pr.yawRate||0)+(Math.random()-0.5)*0.3;case't':return+pr.temp||25}return 0}};if(!bus.rt.parts)bus.rt.parts=[];bus.rt.parts.push(pt);e.dev=pt}}
   if(e.type==='esc'){e.sig=pinAt(nd[2]);e.fcSig=null;if(!e.sig)for(const f of this.els)if(f.type==='fc'){const k=f.nodes.indexOf(nd[2]);if(k>=2&&k<=9)e.fcSig={f,k:k-2}}e.motor=null;const ph=[nd[4],nd[5],nd[6]];for(const m of this.els){if(m.type!=='bldc')continue;const mn=m.nodes;if(ph.every(k=>mn.includes(k))&&new Set(mn).size===3){e.motor=m;const perm=ph.map(k=>mn.indexOf(k));const inv=(perm[0]>perm[1])+(perm[0]>perm[2])+(perm[1]>perm[2]);m.rev=inv%2===1;m.escE=e}}
    if(!e.sig&&!e.fcSig)this.addWarn(e.p.id,'nosig','Wire the ESC Signal to a flight controller motor pad (M1 to M8) or a board pin, and Signal GND to GND')}
   if(e.type==='fc'){e.inp=[10,11,12,13,14].map(k=>pinAt(nd[k]));e.out=new Array(8).fill(1000);e.armed=false;e.I=[0,0,0]}
   if(e.type==='ultrasonic'){const tr=pinAt(nd[1]),ec=pinAt(nd[2]);if(tr&&ec&&tr.e===ec.e&&tr.e.rt){const pt={type:'ultrasonic',trig:tr.g,echo:ec.g,value:+e.p.props.cm||50,src:e};tr.e.rt.parts.push(pt);e.us=pt}}}}
 /* ESC: reads servo pulses (1000 to 2000 µs), arms after a low signal, spins its brushless motor */
 escStep(e){const x=this.x,nd=e.nodes,dt=this.dt,st=this.state[e.p.id];const V=x[nd[0]]-x[nd[1]];st.vbat=V;let us=null;
  if(e.fcSig){const f=e.fcSig.f;us=this.state[f.p.id]&&this.state[f.p.id].powered?f.out[e.fcSig.k]:null}else if(e.sig&&e.sig.e.rt){const s=e.sig.e.rt.pins[e.sig.g];if(s&&s.servo&&s.servo.pin!=null&&s.servo.us!=null)us=s.servo.us;else if(s&&s.servo)us=Math.round(s.servo.angle*1856/180+544);else if(s&&s.mode===1&&(s.v||s.pwm>0)){if(!e.badSig){e.badSig=1;this.addWarn(e.p.id,'sig','The ESC signal needs servo pulses from 1000 to 2000 µs: use the Servo library (esc.attach(pin); esc.writeMicroseconds(1000);), not digitalWrite or analogWrite')}}}
  st.us=us;const pw=V>3;if(!pw){e.armed=false;e.lowT=0}
  if(pw&&!e.armed){if(us!=null&&us<=1060){e.lowT=(e.lowT||0)+dt;if(e.lowT>1.0){e.armed=true;st.beeps=(st.beeps||0)+1}}else{e.lowT=0;if(us!=null&&us>1100&&this.t>2)this.addWarn(e.p.id,'arm','The ESC did not arm: send 1000 µs (zero throttle) for 2 seconds after the battery is connected, then raise the throttle')}}
  st.armed=!!e.armed;const thr=e.armed&&us!=null?Math.max(0,Math.min(1,(us-1040)/960)):0;st.thr=thr;
  const m=e.motor;let I=0.05;if(m){const B=BLDC[m.p.props.model]||BLDC['2207'];const rpmMax=B.kv*B.cells*3.9*0.82;const tgt=B.kv*Math.max(0,V)*thr*0.82;const ms=this.state[m.p.id];ms.rpm=(ms.rpm||0)+(tgt-(ms.rpm||0))*Math.min(1,dt/0.08);const r=ms.rpm/rpmMax;ms.thrust=B.thrust*r*r;ms.amps=B.amps*r*r*r;ms.ang=((ms.ang||0)+ms.rpm*6*dt*(m.rev?-1:1))%360;ms.rev=m.rev;ms.esc=e.p.id;I+=ms.amps;
   if(ms.amps>(+e.p.props.amps||35)*1.05)this.addWarn(e.p.id,'amp',`The motor draws ${ms.amps.toFixed(0)} A, more than the ${e.p.props.amps} A ESC can give. Use a bigger ESC or a smaller prop`);
   if(V>B.cells*4.25+0.5)this.addWarn(m.p.id,'volt',`The ${B.name.split(' ·')[0]} motor is made for ${B.cells}S (${(B.cells*4.2).toFixed(1)} V) but gets ${V.toFixed(1)} V. It spins too fast and overheats`)}
  else if(thr>0)this.addWarn(e.p.id,'nomotor','Connect the ESC outputs A, B and C to the three wires of a brushless motor');
  e.iBat=I;st.iBat=I}
 /* flight controller: built-in gyro, angle or acro mode, PID, mixer to M1..M8 */
 fcStep(e){const x=this.x,nd=e.nodes,dt=this.dt,p=e.p,pr=p.props,st=this.state[p.id];const V=x[nd[0]]-x[nd[1]];st.powered=V>3;st.vbat=V;if(!st.powered){e.armed=false;e.out.fill(1000);st.armed=false;return}
  const pulse=q=>{if(!q||!q.e.rt)return null;const s=q.e.rt.pins[q.g];if(s&&s.servo&&s.servo.pin!=null&&s.servo.pin>=0)return s.servo.us;return null};
  const ins=e.inp.map(pulse);const norm=(u,c)=>u==null?null:c?Math.max(-1,Math.min(1,(u-1500)/500)):Math.max(0,Math.min(1,(u-1000)/1000));
  const thr=norm(ins[0],0)??(+pr.thr||0),rc=[norm(ins[1],1)??(+pr.roll||0),norm(ins[2],1)??(+pr.pitch||0),norm(ins[3],1)??(+pr.yaw||0)];const armSw=ins[4]!=null?ins[4]>1500:!!pr.arm;st.ext=ins.some(v=>v!=null);
  if(armSw&&!e.armed){if(thr<0.05)e.armed=true;else if(this.t>0.5)this.addWarn(p.id,'armthr','The flight controller does not arm while the throttle is up. Lower the throttle, then arm')}if(!armSw)e.armed=false;st.armed=e.armed;st.thr=thr;st.rc=rc;
  const D=this.drone;const F=this.frameE?FRAMES[this.frameE.p.props.kind]||FRAMES.quad5:FRAMES.quad5;const n=F.arms;
  if(!e.armed){e.out.fill(1000);e.I=[0,0,0];return}
  const ro=D?D.ro:0,pi=D?D.pi:0,rates=D?[D.p,D.q,D.r]:[0,0,0];let sp;
  if(pr.mode==='acro')sp=[rc[0]*6,-rc[1]*6,rc[2]*3.5];else{const maxA=0.6;sp=[(rc[0]*maxA-ro)*6,(-rc[1]*maxA-pi)*6,rc[2]*3.5]}
  const kp=[0.09,0.09,0.25],ki=[0.15,0.15,0.3];const u=[0,1,2].map(i=>{const er=sp[i]-rates[i];if(thr>0.08)e.I[i]=Math.max(-0.4,Math.min(0.4,e.I[i]+er*ki[i]*dt));return kp[i]*er+e.I[i]});
  let base=thr;st.hold=!!pr.hold;if(pr.hold&&D){const tgt=thr*10;st.tgtZ=tgt;const vzT=Math.max(-1.5,Math.min(1.5,(tgt-D.z)*1.2));if(e.hb==null)e.hb=0.25;if(thr>0.03)e.hb=Math.max(0.05,Math.min(0.9,e.hb+(vzT-D.vz)*0.25*dt));base=thr<0.03&&D.z<0.05?0:Math.max(0,Math.min(1,e.hb+(vzT-D.vz)*0.12))}
  for(let i=0;i<8;i++){if(i>=n){e.out[i]=1000;continue}const th=(i+0.5)*2*Math.PI/n-Math.PI/2;const px=Math.cos(th),py=-Math.sin(th);const cw=i%2===0;
   /* positive roll command = right side down: lift the left motors; positive pitch = nose up: lift the front motors; positive yaw = turn right */
   let o=base+u[0]*(-px)+u[1]*py+u[2]*(cw?1:-1);o=Math.max(0.04,Math.min(1,o));e.out[i]=Math.round(1000+1000*o)}}
 /* the drone: thrust of each motor at its arm, reaction torque, gravity, drag, ground */
 droneStep(){const D=this.drone,dt=this.dt;if(!D)return;const F=FRAMES[this.frameE.p.props.kind]||FRAMES.quad5;const n=F.arms,L=F.size/2000,m=Math.max(0.01,D.mass/1000),g=9.81;
  let T=0,tr=0,tp=0,ty=0,spin=0;for(const e of this.els){if(e.type!=='bldc'||e.arm<0||e.arm==null)continue;const ms=this.state[e.p.id];const Tn=(ms.thrust||0)/1000*g;const th=(e.arm+0.5)*2*Math.PI/n-Math.PI/2;const px=L*Math.cos(th),py=-L*Math.sin(th);const cw=(e.p.props.dir!=='CCW')!==!!e.rev;
   T+=Tn;tr+=-Tn*px;tp+=Tn*py;ty+=(cw?1:-1)*0.018*Tn;spin+=(ms.rpm||0)/30000;ms.arm=e.arm}
  D.spin=spin;D.T=T;if(D.crashed)return;
  const Irp=m*L*L*0.45+1e-5,Iy=m*L*L*0.8+1e-5;
  const onG=D.z<=0.0005&&D.vz<=0.01;const Tz=T*Math.cos(D.ro)*Math.cos(D.pi);
  if(onG&&Tz<m*g*1.0005){D.z=0;D.vz=0;D.vx*=0.9;D.vy*=0.9;D.p=D.q=0;D.r*=0.9;D.ro*=0.98;D.pi*=0.98;D.az=0;D.ya+=D.r*dt;return}
  D.p+=(tr/Irp-1.2*D.p)*dt;D.q+=(tp/Irp-1.2*D.q)*dt;D.r+=(ty/Iy-0.8*D.r)*dt;D.ro+=D.p*dt;D.pi+=D.q*dt;D.ya+=D.r*dt;
  const az=Tz/m-g-0.4*D.vz;D.az=az;D.vz+=az*dt;D.z+=D.vz*dt;const ah=T/m;const cy=Math.cos(D.ya),sy=Math.sin(D.ya);const af=-ah*Math.sin(D.pi),ar=ah*Math.sin(D.ro)*Math.cos(D.pi);
  D.vx+=(af*cy-ar*sy-0.5*D.vx)*dt;D.vy+=(af*sy+ar*cy-0.5*D.vy)*dt;D.x+=D.vx*dt;D.y+=D.vy*dt;D.maxZ=Math.max(D.maxZ,D.z);if(D.z>0.05)D.air=true;
  if(D.z<0){const hit=-D.vz;D.z=0;if(hit>3.5||Math.abs(D.ro)>1.1||Math.abs(D.pi)>1.1){D.crashed=true;this.addWarn(this.frameE.p.id,'crash',`The drone crashed (hit the ground at ${hit.toFixed(1)} m/s${Math.abs(D.ro)>1.1||Math.abs(D.pi)>1.1?', tilted over':''}). Stop and run again to reset it`)}else{D.vz=0;D.p=D.q=0}}
  if(Math.abs(D.r)>12)this.addWarn(this.frameE.p.id,'yaw','The drone spins around fast: the props do not alternate. On a quad, M1 and M3 spin CW and M2 and M4 spin CCW (or swap two wires of a motor)');
  if(Math.abs(D.ro)>1.6||Math.abs(D.pi)>1.6)this.addWarn(this.frameE.p.id,'flip','The drone flipped over. Check the motor order (M1 to M4 on arms 1 to 4) and the prop directions (CW and CCW alternate)')}
 /* A4988: each rising edge on STEP moves one (micro)step in the DIR direction while EN is low */
 stepStep(e){const x=this.x,nd=e.nodes,st=this.state[e.p.id];const G=x[nd[4]];const vm=x[nd[3]]-G,vdd=x[nd[5]]-x[nd[6]];const en=x[nd[0]]-x[nd[6]]<1.2;const stp=x[nd[1]]-x[nd[6]]>Math.max(1.5,vdd*0.5);const dir=x[nd[2]]-x[nd[6]]>Math.max(1.5,vdd*0.5);
  st.powered=vm>8&&vdd>2.5;e.stepOn=st.powered&&en;st.en=en;if(stp&&!e.lastStp&&st.powered&&en){const ms=+e.p.props.micro||1;e.ang=(e.ang||0)+(dir?1:-1)*1.8/ms;e.steps=(e.steps||0)+1;e.lastT=e.tStep;e.tStep=this.t}e.lastStp=stp;
  st.ang=e.ang||0;st.steps=e.steps||0;st.rpm=e.tStep!=null&&e.lastT!=null&&this.t-e.tStep<0.2?(1.8/(+e.p.props.micro||1))/(e.tStep-e.lastT)/6:0;if(vm>0.5&&vm<8)this.addWarn(e.p.id,'vmot',`VMOT has ${vm.toFixed(1)} V. The A4988 needs 8 to 35 V for the motor (a 12 V supply)`)}
 /* oscilloscope: keeps the last screen of samples */
 scopeStep(e,st){const x=this.x,nd=e.nodes;const tb=+e.p.props.tb||0.002,span=tb*10;if(!e.buf){e.buf=[];e.next=0}if(this.t>=e.next){e.buf.push([this.t,x[nd[0]]-x[nd[2]],x[nd[1]]-x[nd[2]]]);e.next=this.t+span/200;while(e.buf.length&&e.buf[0][0]<this.t-span*2)e.buf.shift()}
  if(this.t-(e.lastTr||-1)<0.03)return;e.lastTr=this.t;const b=e.buf;let start=this.t-span;if(e.p.props.trig&&b.length>4){for(let k=b.length-2;k>0;k--){if(b[k][0]<this.t-span*2)break;if(b[k][0]<=this.t-span&&b[k-1][1]<b[k][1]&&b[k-1][1]<=(st.mid??0)&&b[k][1]>(st.mid??0)){start=b[k][0];break}}}
  const v1=b.map(q=>q[1]);st.mid=v1.length?(Math.max(...v1)+Math.min(...v1))/2:0;st.trace=b.filter(q=>q[0]>=start&&q[0]<=start+span).map(q=>[(q[0]-start)/span,q[1],q[2]]);st.vpp=v1.length?Math.max(...v1)-Math.min(...v1):0;
  let cr=0,lastC=null,per=0;for(let k=1;k<b.length;k++)if(b[k-1][1]<st.mid&&b[k][1]>=st.mid){if(lastC!=null){per+=b[k][0]-lastC;cr++}lastC=b[k][0]}st.freq=cr?cr/per:0}
 mech(e){const p=e.p,x=this.x,nd=e.nodes,dt=this.dt;
  if(e.type==='motor'){const K=DCM[p.props.kind]||DCM.hobby;const i=(x[nd[0]]-x[nd[1]]-K.kt*e.w)/K.R;e.w+=dt*(K.kt*i-K.b*e.w)/K.J;e.th+=e.w*dt/K.gear}
  if(e.type==='esc')this.escStep(e);
  if(e.type==='l298n'){const pins=[0,5].map(k=>pinAtNode(this,e.nodes[k]));e.duty=pins.map((q,j)=>{if(!q)return null;const s=q.e.rt&&q.e.rt.pins[q.g];if(!s||s.mode!==1)return null;return s.pwm>=0?s.pwm/255:(s.v?1:0)});if(e.duty.every(d=>d==null))e.duty=null;else e.duty=e.duty.map((d,j)=>d==null?(x[e.nodes[j?5:0]]-x[e.nodes[7]]>2.3?1:0):d)}
  if(e.type==='servo'){const md=p.props.model||'sg90';let tgt=e.ang??90,cmd=null;if(e.sig&&e.sig.e.rt){const s=e.sig.e.rt.pins[e.sig.g];if(s&&s.servo){tgt=s.servo.angle;cmd=s.servo.angle}}const pw=x[nd[1]]-x[nd[0]]>4;if(e.ang==null)e.ang=90;
   if(md==='fs90r'){e.spd=pw&&cmd!=null?Math.abs(cmd-90)<3?0:(cmd-90)/90*130*6:0;e.ang=(e.ang+e.spd*dt)%360}else if(pw){const d=tgt-e.ang,mx=(md==='mg996r'?450:600)*dt;e.ang+=Math.max(-mx,Math.min(mx,d))}}
  if(e.type==='nema17')this.stepStep(e);
  if(e.type==='stepper'){const on=[0,1,2,3].map(k=>x[nd[k]]-x[nd[5]]>2);const pw=x[nd[4]]-x[nd[5]]>3.5;if(!pw)return;const pat=on.map(b=>b?1:0).join('');const T={'1000':0,'1100':1,'0100':2,'0110':3,'0010':4,'0011':5,'0001':6,'1001':7};const k=T[pat];if(k==null)return;if(e.idx>=0&&k!==e.idx){let d=k-e.idx;if(d>4)d-=8;if(d<-4)d+=8;e.ang+=d*360/4096}e.idx=k}
  if(e.type==='ultrasonic'&&e.us)e.us.value=+p.props.cm||0}
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
 const src=doc.parts.find(p=>p.type==='battery'||p.type==='supply'||p.type==='lipo');if(src){const r=con.find(con.partLegs.get(src.id)[1]);names.set(r,'0')}else{const u=doc.parts.find(p=>LIB[p.type]&&LIB[p.type].mcu);if(u)names.set(con.find(con.partLegs.get(u.id)[MCU[LIB[u.type].mcu].gnd[0]]),'0')}
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
  case'esp32':case'pico':{const M=MCU[p.type];L.push(`${id('V')} ${n[M.v33]} ${n[M.gnd[0]]} DC 3.3  ; ${M.name} 3.3V pin (the sketch outputs are not exported)`);break}
  default:if(LIB[p.type]&&LIB[p.type].mcu){const M=MCU[LIB[p.type].mcu];const k=M.vl>4&&M.v5>=0?M.v5:M.v33>=0?M.v33:M.v5;if(k>=0)L.push(`${id('V')} ${n[k]} ${n[M.gnd[0]]} DC ${M.vl>4?5:3.3}  ; ${M.name} supply pin (the sketch outputs are not exported)`);break}skipped.push(LIB[p.type].name)}}
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
const api={MCU,BOARD_KEYS,boardSource,ESP32_BLINK,PICO_BLINK,UNO_PINS,UNO_BLINK,P,COLS,ROWS,ROWY,RAILS,RAIL_N,colX,railX,HOLES,holeXY,key,LIB,GATES,gatePins,LED_RGB,LED_VF,legsOf,newPart,connectivity,Sim,fmtOhm,fmtF,parseValue,bands,toNetlist,toPcb,stripLabel,engNum,ldrOhms,AVR8,droneMass,thermFrame,camPixel,CAM_COL,micWave,DCM,BLDC,FRAMES,lipoV};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BB=api;
})(typeof window!=='undefined'?window:globalThis);
