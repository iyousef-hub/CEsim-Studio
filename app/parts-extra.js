/* CEsim: extra breadboard parts. One catalog feeds the breadboard (pins, simulation, drawing, palette) and the 3D library (model). */
(function(root){
'use strict';
/* sim kinds:
   battery, lipo, motor, servo, bldc, esc : variants of the existing parts (same legs, other values)
   asens  : analog module VCC GND DO AO (LM393 comparator board): AO follows the reading, DO switches at the threshold
   asens3 : analog module VCC GND AO
   dsens  : digital module VCC GND DO: click it while the simulation runs to trigger it
   pdb    : power distribution board: every + joined, every − joined
   module : wiring only (a small load between VCC and GND), the board reads nothing from it */
const A=[]; // [key, sim, group, name, extra]
const add=(key,sim,group,name,x)=>A.push(Object.assign({key,sim,group,name},x||{}));

/* ---------------- power ---------------- */
const cell=(key,name,volts,rint,shape,m3,kw)=>add('battery:'+key,'battery','Power',name,{props:{volts,kind:key,rint},look:{shape},m3d:m3,kw});
cell('aa','AA battery 1.5 V (alkaline)',1.5,0.15,'cyl',{name:'AA battery',w:14.5,d:50.5,shape:'cell',col:'#2b2f36',band:'#d4a83c'},'aa cell alkaline 1.5v');
cell('aaa','AAA battery 1.5 V',1.5,0.25,'cyl',{name:'AAA battery',w:10.5,d:44.5,shape:'cell',col:'#2b2f36',band:'#c62828'},'aaa cell 1.5v');
cell('c','C battery 1.5 V',1.5,0.1,'cyl',{name:'C battery',w:26.2,d:50,shape:'cell',col:'#2b2f36',band:'#d4a83c'},'c cell');
cell('d','D battery 1.5 V',1.5,0.08,'cyl',{name:'D battery',w:34.2,d:61.5,shape:'cell',col:'#2b2f36',band:'#d4a83c'},'d cell');
cell('cr2032','Coin cell CR2032 3 V',3,15,'coin',{name:'CR2032 coin cell',w:20,d:20,shape:'coin',col:'#c9ccd1'},'coin button cell lithium cr2032');
cell('lr44','Button cell LR44 1.5 V',1.5,8,'coin',{name:'LR44 button cell',w:11.6,d:11.6,shape:'coin',col:'#c9ccd1',h:5.4},'button cell ag13');
cell('18650','Li-ion 18650 cell 3.7 V',3.7,0.05,'cyl',{name:'18650 Li-ion cell',w:18.6,d:65,shape:'cell',col:'#1f6fd6',band:'#e9ecef'},'18650 lithium ion li-ion 3.7v');
cell('21700','Li-ion 21700 cell 3.7 V',3.7,0.03,'cyl',{name:'21700 Li-ion cell',w:21.7,d:70,shape:'cell',col:'#3a9a52',band:'#e9ecef'},'21700 lithium');
cell('2x18650','Li-ion pack 2S 18650 (7.4 V)',7.4,0.1,'pack',{name:'2S 18650 battery pack',w:37.2,d:70,shape:'pack',n:2,col:'#1f6fd6'},'2s pack 7.4v 18650 robot');
cell('3x18650','Li-ion pack 3S 18650 (11.1 V)',11.1,0.15,'pack',{name:'3S 18650 battery pack',w:56,d:70,shape:'pack',n:3,col:'#1f6fd6'},'3s pack 11.1v 12v');
cell('2aa','Battery holder 2 × AA (3 V)',3,0.3,'pack',{name:'2 × AA battery holder',w:32,d:58,shape:'holder',n:2,col:'#1d1d1d'},'holder 2aa 3v');
cell('4aa','Battery holder 4 × AA (6 V)',6,0.6,'pack',{name:'4 × AA battery holder',w:63,d:58,shape:'holder',n:4,col:'#1d1d1d'},'holder 4aa 6v robot car');
cell('6aa','Battery holder 6 × AA (9 V)',9,0.9,'pack',{name:'6 × AA battery holder',w:94,d:58,shape:'holder',n:6,col:'#1d1d1d'},'holder 6aa');
cell('nimh72','NiMH pack 7.2 V 2000 mAh',7.2,0.08,'pack',{name:'NiMH 7.2 V pack',w:48,d:96,shape:'pack',n:3,col:'#3a5fa8'},'nimh rc car pack');
cell('sla12','Lead-acid battery 12 V 7 Ah',12,0.03,'box',{name:'12 V 7 Ah lead-acid battery',w:151,d:65,h:94,shape:'box',col:'#20242a',top:'#3a3f47'},'sla lead acid 12v ups');
cell('lifepo4','LiFePO4 cell 3.2 V',3.2,0.02,'cyl',{name:'LiFePO4 32650 cell',w:32,d:70,shape:'cell',col:'#3a9a52',band:'#e9ecef'},'lifepo4 lfp 3.2v');
cell('powerbank','USB power bank 5 V',5,0.15,'box',{name:'USB power bank',w:70,d:140,h:15,shape:'box',col:'#e9ecef',top:'#d5d9df'},'usb 5v power bank');
cell('solar6','Solar panel 6 V (full sun)',6,20,'solar',{name:'Solar panel 6 V 1 W',w:110,d:60,h:3,shape:'solar',col:'#1b2a4a'},'solar panel pv photovoltaic');
const lp=(key,name,cells,mah,c,kw)=>add('lipo:'+key,'lipo','Power',name,{props:{cells,mah,c},m3d:{name:`LiPo ${cells}S ${mah} mAh`,w:[0,34,45,55,72,0,80][cells]*(mah>2500?1.4:1),d:[0,12,18,28,35,0,40][cells]+(mah>2500?10:0),h:Math.max(8,Math.round(mah/100*([0,1.2,1,0.9,0.8,0,0.6][cells]))),shape:'lipo',col:'#20242a'},kw});
lp('1s300','LiPo 1S 300 mAh (Tiny Whoop)',1,300,30,'1s whoop micro');lp('1s650','LiPo 1S 650 mAh',1,650,30,'1s');
lp('2s850','LiPo 2S 850 mAh',2,850,75,'2s');lp('3s1300','LiPo 3S 1300 mAh',3,1300,75,'3s');lp('3s2200','LiPo 3S 2200 mAh',3,2200,30,'3s rc plane');
lp('4s1300','LiPo 4S 1300 mAh',4,1300,100,'4s fpv');lp('4s1500','LiPo 4S 1500 mAh',4,1500,100,'4s fpv');lp('6s1300','LiPo 6S 1300 mAh',6,1300,120,'6s fpv');
lp('6s5000','LiPo 6S 5000 mAh',6,5000,50,'6s heavy lift');
add('pdb','pdb','Drone','Power distribution board (PDB)',{pins:['BAT +','BAT −','OUT1 +','OUT1 −','OUT2 +','OUT2 −','OUT3 +','OUT3 −','OUT4 +','OUT4 −'],look:{col:'#1d1f24',title:'PDB',sub:'4 × ESC'},m3d:{name:'Power distribution board',w:36,d:36,shape:'module',col:'#1d1f24',el:'pads'},kw:'pdb power distribution xt60'});

/* ---------------- motors ---------------- */
const mot=(key,name,kind,m3,kw)=>add('motor:'+key,'motor','Motors and outputs',name,{props:{kind},m3d:m3,kw});
mot('tt','TT gear motor 1:48 (robot car)','tt',{name:'TT gear motor',w:70,d:22.5,shape:'ttmotor',col:'#f2c21b'},'tt yellow gear robot car');
mot('n20','N20 gear motor 1:100','n20',null,'n20 micro gear');
mot('coreless','Coreless motor 8520 (micro drone)','coreless',null,'coreless 8520 micro drone');
mot('370','DC motor 370 (12 V)','m370',null,'370 dc');
mot('775','DC motor 775 (12 V, high torque)','m775',null,'775 dc high torque');
mot('jga25','JGA25-370 gear motor 1:34 (12 V)','jga25',{name:'JGA25-370 gear motor',w:60,d:25,shape:'gearmotor',col:'#c9ccd1'},'jga25 370 gearbox encoder 12v');
mot('280','DC motor 280 (6 V)','m280',{name:'DC motor 280',w:38,d:30,shape:'can',col:'#c9ccd1'},'280 dc');
mot('vib1027','Flat vibration motor 1027 (3 V)','coin',null,'flat vibration haptic');
const srv=(key,name,model,m3,kw)=>add('servo:'+key,'servo','Motors and outputs',name,{props:{model},m3d:m3,kw});
srv('mg90s','Servo MG90S (metal gear, 2.2 kg·cm)','mg90s',{name:'MG90S micro servo',w:32.2,d:12.2,shape:'servo',col:'#1d1d1d'},'mg90s metal micro');
srv('sg92r','Servo SG92R (carbon gear, 2.5 kg·cm)','sg92r',{name:'SG92R micro servo',w:32.2,d:12.2,shape:'servo',col:'#2b62c9'},'sg92r');
srv('ds3218','Servo DS3218 (digital, 20 kg·cm)','ds3218',{name:'DS3218 servo',w:54.5,d:20,shape:'servo',col:'#1d1d1d'},'ds3218 20kg digital');
srv('mg995','Servo MG995 (metal gear, 10 kg·cm)','mg995',null,'mg995');
const bl=(m,kw)=>add('bldc:'+m,'bldc','Drone','Brushless motor '+m,{props:{model:m,dir:'CW',arm:0},kw});
['0802','1404','2207','2306','2212','2814','4114'].forEach(m=>bl(m,'bldc brushless '+m));
const es=a=>add('esc:'+a,'esc','Drone',`Brushless ESC ${a} A`,{props:{amps:a},kw:'esc speed controller '+a+'a'});
[6,12,20,30,45,60].forEach(es);

/* ---------------- sensors: analog modules with a comparator (VCC GND DO AO) ---------------- */
const P4=['VCC','GND','DO','AO'],P3=['VCC','GND','AO'],PD=['VCC','GND','DO'];
const as=(key,name,ui,look,m3,kw,inv)=>add(key,'asens','Sensors',name,{pins:P4,props:{val:ui.def,thr:ui.thr==null?0.5:ui.thr,inv:!!inv},ui,look,m3d:m3,kw});
as('soil','Soil moisture sensor (FC-28)',{label:'Soil moisture',unit:'%',min:0,max:100,def:40,v:x=>1-x/100*0.85,thr:0.5,hint:'Dry soil reads high on AO; DO goes LOW when the soil is wetter than the blue pot setting.'},{col:'#1f5fae',title:'SOIL',el:'fork'},{name:'Soil moisture sensor FC-28',w:20,d:60,shape:'fork',col:'#1f5fae'},'soil moisture hygrometer fc-28 yl-69 plant');
as('rain','Rain sensor (FC-37)',{label:'Water on the plate',unit:'%',min:0,max:100,def:0,v:x=>1-x/100*0.9,thr:0.5,hint:'AO drops as the plate gets wet; DO goes LOW when it rains.'},{col:'#1f5fae',title:'RAIN',el:'plate'},{name:'Rain sensor plate FC-37',w:54,d:40,shape:'plate',col:'#1f5fae'},'rain raindrop water fc-37 yl-83');
const mq=(n,gas,kw)=>as('mq'+n,`Gas sensor MQ-${n} (${gas})`,{label:gas+' level',unit:'ppm',min:0,max:10000,def:300,v:x=>0.08+0.85*Math.min(1,Math.log10(1+x)/4),thr:0.6,hint:`AO rises with ${gas}; DO goes LOW above the threshold. The heater needs 5 V and about 150 mA.`},{col:'#1f5fae',title:'MQ-'+n,el:'can'},{name:'MQ-'+n+' gas sensor',w:32,d:22,shape:'module',col:'#1f5fae',el:'can'},'mq gas smoke '+kw,true);
mq(2,'smoke and LPG','mq2 lpg smoke');mq(3,'alcohol','mq3 alcohol breath');mq(4,'methane','mq4 methane natural gas');mq(7,'carbon monoxide','mq7 co');mq(135,'air quality','mq135 co2 air quality nh3');
as('flame','Flame sensor (KY-026)',{label:'Flame (IR light)',unit:'%',min:0,max:100,def:0,v:x=>1-x/100*0.9,thr:0.5,hint:'AO drops when it sees a flame; DO goes LOW.'},{col:'#1f5fae',title:'FLAME',el:'irled'},{name:'Flame sensor KY-026',w:32,d:14,shape:'module',col:'#1f5fae',el:'irled'},'flame fire ir ky-026');
as('sound','Sound sensor (KY-038)',{label:'Sound level',unit:'dB',min:30,max:110,def:45,v:x=>0.45+((x-30)/80)*0.5,thr:0.7,hint:'AO follows the loudness; DO goes HIGH on a loud sound (set the level with the pot).'},{col:'#1f5fae',title:'SOUND',el:'mic'},{name:'Sound sensor KY-038',w:40,d:15,shape:'module',col:'#1f5fae',el:'mic'},'sound clap microphone ky-038 ky-037');
as('ldrmod','Light sensor module (LDR)',{label:'Light',unit:'lux',min:0,max:1000,def:300,v:x=>1-Math.min(1,Math.log10(1+x)/3),thr:0.5,hint:'AO is low in bright light; DO goes LOW when it is brighter than the setting.'},{col:'#1f5fae',title:'LIGHT',el:'ldr'},{name:'LDR light sensor module',w:32,d:14,shape:'module',col:'#1f5fae',el:'ldr'},'ldr light photoresistor module');
as('hallA','Hall sensor (KY-024, linear)',{label:'Magnetic field',unit:'mT',min:-50,max:50,def:0,v:x=>0.5+x/100*0.9,thr:0.7,hint:'AO sits at half the supply and moves with the field; DO goes HIGH near a strong magnet.'},{col:'#1f5fae',title:'HALL',el:'to92'},{name:'Hall sensor KY-024',w:40,d:15,shape:'module',col:'#1f5fae',el:'to92'},'hall magnet magnetic ky-024 49e');
as('tcrt','Line tracking sensor (TCRT5000)',{label:'Surface',unit:'% black',min:0,max:100,def:0,v:x=>0.1+x/100*0.8,thr:0.5,hint:'A black line reflects little IR: AO rises and DO goes HIGH over the line.'},{col:'#1f5fae',title:'TCRT5000',el:'irpair'},{name:'TCRT5000 line sensor',w:32,d:14,shape:'module',col:'#1f5fae',el:'irpair'},'line follower tracking ir tcrt5000 reflective',false);
/* analog only (VCC GND AO) */
const a3=(key,name,ui,look,m3,kw)=>add(key,'asens3','Sensors',name,{pins:P3,props:{val:ui.def},ui,look,m3d:m3,kw});
a3('water','Water level sensor',{label:'Water depth',unit:'mm',min:0,max:40,def:0,v:x=>x/40*0.8,hint:'AO rises as the traces go under water.'},{col:'#b3261e',title:'WATER',el:'traces'},{name:'Water level sensor',w:20,d:62,shape:'fork',col:'#b3261e'},'water level depth tank');
a3('sharp','IR distance sensor Sharp GP2Y0A21 (10 to 80 cm)',{label:'Distance',unit:'cm',min:10,max:80,def:30,v:x=>Math.min(0.62,(27.86*Math.pow(Math.max(10,x),-1.15)*1.0)/5+0.01),hint:'AO falls as the object moves away (about 2.3 V at 10 cm, 0.4 V at 80 cm).'},{col:'#1d1d1d',title:'SHARP',el:'irpair'},{name:'Sharp GP2Y0A21 IR sensor',w:44.5,d:18.9,shape:'sharp',col:'#1d1d1d'},'sharp ir distance gp2y0a21 infrared');
a3('acs712','Current sensor ACS712 (5 A)',{label:'Current',unit:'A',min:-5,max:5,def:0,v:x=>0.5+x*0.185/5,hint:'AO = 2.5 V + 0.185 V per amp (on 5 V).'},{col:'#b3261e',title:'ACS712',el:'chip'},{name:'ACS712 current sensor',w:31,d:13,shape:'module',col:'#b3261e',el:'terminal'},'current acs712 ampere hall');
a3('ntc','Thermistor module (NTC 10k)',{label:'Temperature',unit:'°C',min:-20,max:100,def:25,v:x=>{const R=10000*Math.exp(3950*(1/(x+273.15)-1/298.15));return R/(R+10000)},hint:'AO = R_ntc / (R_ntc + 10k): 0.5 at 25 °C, lower when it is hotter.'},{col:'#1f5fae',title:'NTC',el:'bead'},{name:'NTC thermistor module',w:32,d:14,shape:'module',col:'#1f5fae',el:'bead'},'ntc thermistor temperature 10k');
a3('uv','UV sensor GUVA-S12SD',{label:'UV index',unit:'',min:0,max:11,def:3,v:x=>x*0.1/5*1.0+0.0,hint:'AO is about 0.1 V per UV index step.'},{col:'#5b2a86',title:'UV',el:'chip'},{name:'GUVA-S12SD UV sensor',w:24,d:15,shape:'module',col:'#5b2a86',el:'chip'},'uv ultraviolet guva');
a3('pulse','Heart rate pulse sensor',{label:'Heart rate',unit:'bpm',min:40,max:180,def:72,v:x=>0.5,pulse:true,hint:'AO pulses with each heart beat around half the supply.'},{col:'#2f6fd6',title:'♥',el:'heart',round:true},{name:'Pulse sensor',w:16,d:16,shape:'disc',col:'#2f6fd6'},'heart pulse bpm heartbeat');
a3('fsr','Force sensor FSR402',{label:'Force',unit:'N',min:0,max:20,def:0,v:x=>x<=0?0:Math.min(0.95,x/(x+3)),hint:'With a 10k pull-down, AO rises with the force.'},{col:'#1d1d1d',title:'FSR',el:'pad'},{name:'FSR402 force sensor',w:18,d:56,shape:'fsr',col:'#1d1d1d'},'force pressure fsr touch');
a3('flex','Flex sensor 2.2 inch',{label:'Bend',unit:'°',min:0,max:90,def:0,v:x=>0.5+x/90*0.3,hint:'With a 47k divider, AO rises as it bends.'},{col:'#1d1d1d',title:'FLEX',el:'strip'},{name:'Flex sensor 2.2 inch',w:7,d:73,shape:'strip',col:'#d4a83c'},'flex bend glove');
a3('slidepot','Slide potentiometer module 10k',{label:'Slider',unit:'%',min:0,max:100,def:50,v:x=>x/100,hint:'AO goes from 0 to the supply along the slider.'},{col:'#1d1d1d',title:'SLIDE',el:'slider'},{name:'Slide potentiometer 60 mm',w:80,d:14,shape:'module',col:'#1d1d1d',el:'slider'},'slide potentiometer fader');
a3('ph','pH sensor module',{label:'pH',unit:'',min:0,max:14,def:7,v:x=>(3.5-0.18*(x-7))/5,hint:'AO is about 2.5 V at pH 7 and falls about 0.18 V per pH step (calibrate in code).'},{col:'#1f5fae',title:'pH',el:'bnc'},{name:'pH sensor board',w:42,d:32,shape:'module',col:'#1f5fae',el:'bnc'},'ph acid water quality');
a3('turb','Turbidity sensor',{label:'Turbidity',unit:'NTU',min:0,max:3000,def:0,v:x=>Math.max(0.5,4.2-x/1000)/5,hint:'AO is about 4.2 V in clear water and falls as the water gets cloudy.'},{col:'#1f5fae',title:'TURBIDITY',el:'chip'},{name:'Turbidity sensor',w:38,d:28,shape:'module',col:'#1f5fae',el:'chip'},'turbidity water clarity');
/* digital modules (VCC GND DO) */
const ds=(key,name,ui,look,m3,kw,activeLow)=>add(key,'dsens','Sensors',name,{pins:PD,props:{on:false,inv:!!activeLow},ui,look,m3d:m3,kw});
ds('irobs','IR obstacle sensor (FC-51)',{hint:'DO goes LOW when an object is in front (2 to 30 cm). Click it while the simulation runs.'},{col:'#1f5fae',title:'IR OBST',el:'irpair'},{name:'IR obstacle sensor FC-51',w:31,d:14,shape:'module',col:'#1f5fae',el:'irpair'},'ir obstacle avoidance infrared fc-51 proximity',true);
ds('touch','Touch sensor TTP223',{hint:'DO goes HIGH while it is touched. Click it while the simulation runs.'},{col:'#d33',title:'TOUCH',el:'pad',round:true},{name:'TTP223 touch sensor',w:24,d:24,shape:'module',col:'#d33',el:'pad'},'touch capacitive ttp223 button');
ds('reed','Reed switch module',{hint:'DO goes LOW when a magnet is near. Click it while the simulation runs.'},{col:'#1f5fae',title:'REED',el:'glass'},{name:'Reed switch module',w:32,d:14,shape:'module',col:'#1f5fae',el:'glass'},'reed magnet door window',true);
ds('hallD','Hall switch A3144 module',{hint:'DO goes LOW near the south pole of a magnet. Click it while the simulation runs.'},{col:'#1f5fae',title:'A3144',el:'to92'},{name:'A3144 hall switch module',w:32,d:14,shape:'module',col:'#1f5fae',el:'to92'},'hall switch a3144 magnet rpm',true);
ds('tiltmod','Tilt switch module (SW-520D)',{hint:'DO goes LOW when it is upright and HIGH when tilted. Click it while the simulation runs.'},{col:'#1f5fae',title:'TILT',el:'can'},{name:'Tilt switch module',w:32,d:14,shape:'module',col:'#1f5fae',el:'can'},'tilt ball switch');
ds('limit','Limit switch (micro switch)',{hint:'DO goes LOW while the lever is pressed. Click it while the simulation runs.'},{col:'#1d1d1d',title:'LIMIT',el:'lever'},{name:'Micro limit switch',w:28,d:16,shape:'limit',col:'#1d1d1d'},'limit end stop microswitch 3d printer cnc',true);
ds('radar','Microwave radar RCWL-0516',{hint:'DO goes HIGH for 2 s when it senses motion. Click it while the simulation runs.'},{col:'#1f5fae',title:'RCWL-0516',el:'traces'},{name:'RCWL-0516 radar',w:36,d:17,shape:'module',col:'#1f5fae',el:'traces'},'radar microwave motion doppler rcwl');
ds('knock','Knock sensor (KY-031)',{hint:'DO goes LOW on a knock. Click it while the simulation runs.'},{col:'#1d1d1d',title:'KNOCK',el:'spring'},{name:'Knock sensor KY-031',w:25,d:15,shape:'module',col:'#1d1d1d',el:'can'},'knock tap shock',true);
ds('doorsw','Magnetic door switch (MC-38)',{hint:'DO goes LOW while the door is closed (magnet near). Click it while the simulation runs.'},{col:'#f2f2f2',title:'DOOR',el:'none'},{name:'MC-38 door switch',w:28,d:14,shape:'box',col:'#f2f2f2',h:10},'door window alarm magnetic',true);

/* ---------------- modules that only need wiring (the board reads nothing from them) ---------------- */
const md=(key,group,name,pins,look,m3,kw)=>add(key,'module',group,name,{pins,look,m3d:m3,kw});
md('gps6m','Drone','GPS module NEO-6M',['VCC','RX','TX','GND'],{col:'#1f5fae',title:'GPS',sub:'NEO-6M',el:'patch'},{name:'GPS NEO-6M with antenna',w:36,d:26,shape:'module',col:'#1f5fae',el:'patch'},'gps neo-6m ublox gnss navigation');
md('gpsm8n','Drone','GPS M8N with compass (drone)',['5V','GND','TX','RX','SDA','SCL'],{col:'#1d1d1d',title:'M8N',sub:'GPS + compass',el:'patch'},{name:'M8N GPS puck',w:50,d:50,shape:'puck',col:'#1d1d1d'},'gps m8n compass drone puck');
md('rcrx','Drone','RC receiver (6 channels, PWM)',['CH1','CH2','CH3','CH4','CH5','CH6','5V','GND'],{col:'#1d1d1d',title:'RX',sub:'2.4 GHz',el:'antenna'},{name:'RC receiver 6 channel',w:36,d:22,shape:'module',col:'#1d1d1d',el:'antenna'},'receiver rc radio flysky frsky elrs pwm');
md('elrs','Drone','ELRS receiver (CRSF)',['5V','GND','TX','RX'],{col:'#1d1f24',title:'ELRS',el:'antenna'},{name:'ELRS nano receiver',w:12,d:19,shape:'module',col:'#1d1f24',el:'antenna'},'elrs expresslrs crsf receiver');
md('vtx','Drone','Video transmitter 5.8 GHz (VTX)',['VBAT','GND','VIDEO','SA'],{col:'#1d1f24',title:'VTX',sub:'5.8 GHz',el:'antenna'},{name:'5.8 GHz VTX 20 × 20',w:27,d:27,shape:'module',col:'#1d1f24',el:'sma'},'vtx video transmitter fpv analog');
md('fpvcam','Drone','FPV camera',['5V','GND','VIDEO'],{col:'#1d1d1d',title:'FPV CAM',el:'lens'},{name:'FPV camera 19 mm',w:19,d:19,shape:'cam',col:'#1d1d1d'},'fpv camera runcam caddx');
md('baro','Sensors','Barometer BMP280 (I2C)',['VCC','GND','SCL','SDA'],{col:'#5b2a86',title:'BMP280',sub:'pressure',el:'chip'},{name:'BMP280 barometer',w:15,d:12,shape:'module',col:'#5b2a86',el:'chip'},'bmp280 bme280 barometer pressure altitude');
md('compass','Sensors','Compass QMC5883L (I2C)',['VCC','GND','SCL','SDA','DRDY'],{col:'#1f5fae',title:'QMC5883L',sub:'compass',el:'chip'},{name:'QMC5883L compass',w:18,d:14,shape:'module',col:'#1f5fae',el:'chip'},'compass magnetometer hmc5883l qmc5883l gy-271');
md('ina219','Sensors','Current and voltage sensor INA219 (I2C)',['VCC','GND','SCL','SDA','VIN+','VIN−'],{col:'#5b2a86',title:'INA219',el:'terminal'},{name:'INA219 current sensor',w:25,d:20,shape:'module',col:'#5b2a86',el:'terminal'},'ina219 current voltage power monitor');
md('bh1750','Sensors','Light sensor BH1750 (I2C)',['VCC','GND','SCL','SDA','ADDR'],{col:'#1f5fae',title:'BH1750',sub:'lux',el:'chip'},{name:'BH1750 light sensor',w:18.5,d:13.9,shape:'module',col:'#1f5fae',el:'chip'},'bh1750 lux light');
md('dht22','Sensors','Temperature and humidity DHT22',['VCC','DATA','NC','GND'],{col:'#f2f2f2',title:'DHT22',el:'grille'},{name:'DHT22 sensor',w:15.1,d:25,shape:'box',col:'#f2f2f2',h:7.7},'dht22 am2302 dht11 temperature humidity');
md('ds18b20','Sensors','Temperature probe DS18B20 (waterproof)',['VCC','DATA','GND'],{col:'#1d1d1d',title:'DS18B20',el:'probe'},{name:'DS18B20 probe',w:6,d:50,shape:'probe',col:'#c9ccd1'},'ds18b20 onewire temperature probe waterproof');
md('ws2812','Motors and outputs','LED strip WS2812B (8 LEDs)',['5V','DIN','GND'],{col:'#f2f2f2',title:'WS2812B',el:'leds'},{name:'WS2812B 8 LED stick',w:51,d:10,shape:'module',col:'#1d1d1d',el:'leds'},'ws2812 neopixel rgb strip addressable');
md('hc05','Sensors','Bluetooth module HC-05',['STATE','RXD','TXD','GND','VCC','EN'],{col:'#1f5fae',title:'HC-05',sub:'Bluetooth',el:'antenna'},{name:'HC-05 Bluetooth module',w:37,d:16,shape:'module',col:'#1f5fae',el:'antenna'},'bluetooth hc-05 hc-06 serial');
md('nrf24','Sensors','Radio nRF24L01 (2.4 GHz)',['GND','VCC','CE','CSN','SCK','MOSI','MISO','IRQ'],{col:'#1d1f24',title:'nRF24L01',el:'antenna'},{name:'nRF24L01 radio',w:29,d:15,shape:'module',col:'#1d1f24',el:'antenna'},'nrf24 radio 2.4ghz wireless');
md('rfid','Sensors','RFID reader RC522',['SDA','SCK','MOSI','MISO','IRQ','GND','RST','3.3V'],{col:'#1f5fae',title:'RC522',sub:'RFID 13.56 MHz',el:'coil'},{name:'RC522 RFID reader',w:60,d:40,shape:'module',col:'#1f5fae',el:'coil'},'rfid rc522 nfc card');
md('rtc','Sensors','Real time clock DS3231 (I2C)',['32K','SQW','SCL','SDA','VCC','GND'],{col:'#1f5fae',title:'DS3231',sub:'RTC',el:'coin'},{name:'DS3231 RTC module',w:38,d:22,shape:'module',col:'#1f5fae',el:'coin'},'rtc ds3231 clock time');
md('sdcard','Sensors','Micro SD card module (SPI)',['GND','VCC','MISO','MOSI','SCK','CS'],{col:'#1f5fae',title:'microSD',el:'sd'},{name:'Micro SD card module',w:42,d:24,shape:'module',col:'#1f5fae',el:'sd'},'sd card micro storage spi');
md('hx711','Sensors','Load cell amplifier HX711',['GND','DT','SCK','VCC'],{col:'#b3261e',title:'HX711',sub:'load cell',el:'chip'},{name:'HX711 module',w:34,d:21,shape:'module',col:'#b3261e',el:'chip'},'hx711 load cell weight scale');
md('keypad','Sensors','Keypad 4 × 4',['R1','R2','R3','R4','C1','C2','C3','C4'],{col:'#1d1d1d',title:'KEYPAD',el:'keys'},{name:'Membrane keypad 4 × 4',w:69,d:77,shape:'plate',col:'#1d1d1d'},'keypad matrix 4x4');
md('buckconv','Power','Step-down converter LM2596',['IN+','IN−','OUT+','OUT−'],{col:'#1f5fae',title:'LM2596',sub:'buck',el:'coil'},{name:'LM2596 buck converter',w:43,d:21,shape:'module',col:'#1f5fae',el:'coil'},'buck step down lm2596 dc-dc regulator');
md('boostconv','Power','Step-up converter MT3608',['VIN+','VIN−','VOUT+','VOUT−'],{col:'#1f5fae',title:'MT3608',sub:'boost',el:'coil'},{name:'MT3608 boost converter',w:36,d:17,shape:'module',col:'#1f5fae',el:'coil'},'boost step up mt3608');
md('tp4056','Power','Li-ion charger TP4056 (USB-C)',['IN+','IN−','B+','B−','OUT+','OUT−'],{col:'#1f5fae',title:'TP4056',sub:'charger',el:'usb'},{name:'TP4056 charger',w:28,d:17,shape:'module',col:'#1f5fae',el:'usb'},'tp4056 charger lithium usb');
md('bms3s','Power','BMS board 3S (Li-ion protection)',['B+','B1','B2','B−','P+','P−'],{col:'#1d1f24',title:'BMS 3S',el:'chip'},{name:'3S BMS board',w:56,d:21,shape:'module',col:'#1d1f24',el:'chip'},'bms protection balance');
md('drv8833','Motors and outputs','Motor driver DRV8833 (two small motors)',['AIN1','AIN2','BIN1','BIN2','VM','GND','AOUT1','AOUT2','BOUT1','BOUT2'],{col:'#b3261e',title:'DRV8833',el:'chip'},{name:'DRV8833 motor driver',w:18,d:16,shape:'module',col:'#b3261e',el:'chip'},'drv8833 motor driver h bridge');
md('tb6612','Motors and outputs','Motor driver TB6612FNG',['PWMA','AIN2','AIN1','STBY','BIN1','BIN2','PWMB','GND','VM','VCC','AO1','AO2','BO1','BO2'],{col:'#b3261e',title:'TB6612FNG',el:'chip'},{name:'TB6612FNG motor driver',w:20,d:20,shape:'module',col:'#b3261e',el:'chip'},'tb6612 motor driver');
md('pca9685','Motors and outputs','Servo driver PCA9685 (16 channels, I2C)',['GND','OE','SCL','SDA','VCC','V+'],{col:'#1f5fae',title:'PCA9685',sub:'16 servos',el:'chip'},{name:'PCA9685 servo driver',w:62,d:25,shape:'module',col:'#1f5fae',el:'chip'},'pca9685 servo driver pwm i2c 16');
md('linact','Motors and outputs','Linear actuator 12 V (100 mm)',['+','−'],{col:'#c9ccd1',title:'ACTUATOR',el:'none'},{name:'Linear actuator 100 mm',w:200,d:30,shape:'actuator',col:'#c9ccd1'},'linear actuator 12v push pull');
md('pump12','Motors and outputs','Diaphragm pump 12 V',['+','−'],{col:'#1d1d1d',title:'PUMP 12V',el:'none'},{name:'Diaphragm pump 12 V',w:90,d:40,shape:'can',col:'#1d1d1d'},'pump diaphragm 12v water');
md('peltier','Motors and outputs','Peltier module TEC1-12706',['+','−'],{col:'#f2f2f2',title:'TEC1-12706',el:'none'},{name:'Peltier TEC1-12706',w:40,d:40,h:3.8,shape:'box',col:'#f2f2f2'},'peltier tec thermoelectric cooler');
md('laser','Motors and outputs','Laser module KY-008',['S','VCC','GND'],{col:'#1d1d1d',title:'LASER',el:'lens'},{name:'Laser module KY-008',w:18,d:15,shape:'module',col:'#1d1d1d',el:'lens'},'laser diode ky-008');
md('optflow','Drone','Optical flow and range sensor',['5V','GND','TX','RX'],{col:'#1d1f24',title:'FLOW',el:'lens'},{name:'Optical flow sensor',w:25,d:20,shape:'module',col:'#1d1f24',el:'lens'},'optical flow position hold drone');
md('telem','Drone','Telemetry radio 433 MHz',['5V','GND','TX','RX'],{col:'#1d1d1d',title:'TELEM',sub:'433 MHz',el:'sma'},{name:'Telemetry radio 433 MHz',w:55,d:28,shape:'module',col:'#1d1d1d',el:'sma'},'telemetry radio sik mavlink 433 915');
md('xt60','Drone','XT60 connector with pigtail',['+','−'],{col:'#e3c21b',title:'XT60',el:'none'},{name:'XT60 connector',w:16,d:8,shape:'box',col:'#e3c21b',h:16},'xt60 connector plug battery');
md('dronebuzz','Drone','Drone finder buzzer',['+','−'],{col:'#1d1d1d',title:'BUZZ',el:'can'},{name:'Drone buzzer',w:12,d:12,shape:'disc',col:'#1d1d1d'},'buzzer beeper finder lost model');

const BY={};A.forEach(e=>BY[e.key]=e);
const api={LIST:A,BY};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BBX=api;
})(typeof window!=='undefined'?window:globalThis);
