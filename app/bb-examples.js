/* Breadboard examples, built from real holes and wires */
(function(root){
'use strict';
const B=root.BB||(typeof require!=='undefined'?require('./bb-core.js'):null);
const H=B.holeXY;
const W=(a,b,color)=>({a:typeof a==='string'?H(a):a.slice(),b:typeof b==='string'?H(b):b.slice(),color:color||'red'});
let uid=0;
const part=(type,at,props,rot)=>{const p=B.newPart(type,[0,0]);p.id='e'+(++uid);if(B.LIB[type].flex){p.legs=at.map(h=>typeof h==='string'?H(h):h.slice());if(B.LIB[type].probes){const a=p.legs[0],b=p.legs[1];p.pos=[(a[0]+b[0])/2,Math.min(a[1],b[1])-70]}}else{p.pos=typeof at==='string'?H(at):at.slice();p.rot=rot||0}Object.assign(p.props,props||{});return p};
const BAT=[-90,10];                                   // battery terminals at (-90,10) and (-70,10)
const bat=v=>part('battery',BAT,{volts:v||9});
const sup=v=>part('supply',BAT,{volts:v||5});
const power=()=>[W([-90,10],'tp1','red'),W([-70,10],'tn1','black'),W('tp50','bp50','red'),W('tn50','bn50','black')];
const EX={
 'Arduino: blink an LED':()=>{const u=part('uno',[40,250]);return{parts:[u,part('resistor',['j20','j24'],{ohms:220}),part('led',['h24','h25'],{color:'red'})],wires:[W([50,250],'i20','yellow'),W('g25','bn22','black'),W([40,250],'bn5','black')],note:'The Uno runs the sketch in its side panel: pin 13 goes HIGH and LOW every 500 ms, so the LED and the board L LED blink. Select the board to edit the sketch, then press Upload.'}},
 'Arduino: button and pot':()=>{const code="// Button from pin 2 to GND lights the LED on pin 9.\n// The pot on A0 sets the blink speed, shown in the Serial Monitor.\nvoid setup() {\n  pinMode(2, INPUT_PULLUP);\n  pinMode(9, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int v = analogRead(A0);\n  Serial.println(v);\n  if (digitalRead(2) == LOW) {\n    digitalWrite(9, HIGH);\n    delay(100 + v / 2);\n    digitalWrite(9, LOW);\n    delay(100 + v / 2);\n  } else {\n    digitalWrite(9, LOW);\n    delay(50);\n  }\n}\n";const u=part('uno',[40,250],{code});
  return{parts:[u,part('resistor',['j30','j34'],{ohms:220}),part('led',['h34','h35'],{color:'green'}),part('button','e44'),part('pot','e52',{ohms:10000,pos:0.5})],
   wires:[W([90,250],'i30','yellow'),W('g35','bn28','black'),W([40,250],'bn5','black'),W([170,250],'a44','blue'),W('a46','tn36','black'),W('tn40','bn40','black'),W([70,440],'bp45','red'),W('bp45','tp45','red'),W('a52','tp41','red'),W('a54','tn43','black'),W([130,440],'a53','orange')],
   note:'Hold the button (pin 2 to GND, read with INPUT_PULLUP) to blink the LED on pin 9. Turn the pot to change the speed: its wiper goes to A0 and the reading shows in the Serial Monitor of the board.'}},
 'LED and resistor':()=>({parts:[bat(9),part('resistor',['a10','a17'],{ohms:470}),part('led',['c17','c18'],{color:'red'})],wires:[...power(),W('tp7','b10','red'),W('b18','tn14','black')],note:'Current flows from + through the 470 Ω resistor and the LED to −. The resistor limits the current to about 15 mA. Try 100 Ω, or remove the resistor and replace it with a wire.'}),
 'LEDs in series and in parallel':()=>({parts:[bat(9),part('resistor',['a8','a13'],{ohms:220}),part('led',['c13','c14'],{color:'red'}),part('led',['c14','c15'],{color:'yellow'}),part('resistor',['f8','f13'],{ohms:470}),part('led',['h13','h14'],{color:'green'}),part('resistor',['f20','f25'],{ohms:470}),part('led',['h25','h26'],{color:'blue'})],
  wires:[...power(),W('tp5','b8','red'),W('b15','tn12','black'),W('bp6','j8','red'),W('j14','bn12','black'),W('bp15','j20','red'),W('j26','bn22','black')],note:'Top: two LEDs in series share one current. Bottom: two LED branches in parallel, each with its own resistor.'}),
 'Push button':()=>({parts:[bat(9),part('button','e20'),part('resistor',['a22','a27'],{ohms:470}),part('led',['c27','c28'],{color:'green'})],wires:[...power(),W('tp15','a20','red'),W('b28','tn22','black')],note:'Press and hold the button while the simulation runs. It closes the path between columns 20 and 22.'}),
 'Voltage divider':()=>({parts:[bat(9),part('resistor',['a10','a16'],{ohms:1000}),part('resistor',['b16','b22'],{ohms:2000}),part('voltmeter',['d16','d22'])],wires:[...power(),W('tp7','c10','red'),W('c22','tn17','black')],note:'Vout = 9 V × 2 kΩ / (1 kΩ + 2 kΩ) = 6 V. The voltmeter shows the voltage across the 2 kΩ resistor. Hover over a hole to see its voltage.'}),
 'Potentiometer dimmer':()=>({parts:[bat(9),part('pot','e15',{ohms:10000,pos:0.5}),part('resistor',['a16','a21'],{ohms:330}),part('led',['c21','c22'],{color:'yellow'}),part('ammeter',['f22','f26'])],wires:[...power(),W('tp10','b17','red'),W('j26','bn20','black'),W('d22','g22','green'),W('d15','tn12','black')],note:'Turn the potentiometer with the slider on the right or the mouse wheel. The ammeter shows the LED current.'}),
 'Transistor switch':()=>({parts:[bat(9),part('npn','f30'),part('resistor',['g31','g37'],{ohms:10000}),part('button','j37'),part('resistor',['a32','a38'],{ohms:330}),part('led',['c40','c38'],{color:'red'})],wires:[...power(),W('j39','bp30','red'),W('h32','b32','yellow'),W('tp30','a40','red'),W('h30','bn27','black')],note:'A small base current through the 10 kΩ resistor switches a larger collector current through the LED. Press the button to turn the transistor on.'}),
 'AND gate (74LS08)':()=>({parts:[sup(5),part('ic7408','e30'),part('switch','b20'),part('switch','h20'),part('resistor',['j32','j40'],{ohms:330}),part('led',['h40','h41'],{color:'red'})],
  wires:[W([-90,10],'tp1','red'),W([-70,10],'tn1','black'),W('tp50','bp50','red'),W('tn50','bn50','black'),W('tp25','a30','red'),W('j36','bn30','black'),W('tp17','a22','red'),W('tn16','a20','black'),W('c21','g30','yellow'),W('bp17','j22','red'),W('bn16','j20','black'),W('i21','g31','green'),W('j41','bn38','black')],
  note:'Slide both switches to the right to make both inputs HIGH: the LED shows A AND B. Pin 14 is +5 V and pin 7 is −. A TTL input left unconnected reads HIGH.'}),
 '555 blinking LED':()=>({parts:[bat(9),part('ne555','e40'),part('resistor',['b40','b45'],{ohms:1000}),part('resistor',['d45','d50'],{ohms:47000}),part('ecap',['a42','tn13'],{farads:10e-6}),part('resistor',['h42','h48'],{ohms:470}),part('led',['i48','i49'],{color:'red'})],
  wires:[...power(),W('tp11','a40','red'),W('c45','c41','orange'),W('c50','b42','orange'),W('j43','bp15','red'),W('j40','bn12','black'),W('g41','d42','yellow'),W('j49','bn20','black')],
  note:'An astable 555: the capacitor charges through 1 kΩ + 47 kΩ and discharges through 47 kΩ. f = 1.44 / ((R1 + 2·R2)·C) ≈ 1.5 Hz. Change the capacitor to blink faster or slower.'}),
 'RC charging':()=>({parts:[bat(9),part('switch','c8'),part('resistor',['a10','a20'],{ohms:10000}),part('ecap',['b20','tn20'],{farads:100e-6}),part('voltmeter',['d20','bn20'])],wires:[...power(),W('tp5','a9','red')],note:'Slide the switch to the right: the capacitor charges through 10 kΩ. After one time constant τ = R·C = 1 s it reaches 63% of 9 V. Slide it back to stop charging.'}),
 '7-segment display':()=>({parts:[sup(5),part('seg7','d20'),part('resistor',['a24','a30'],{ohms:330}),part('resistor',['j23','j30'],{ohms:330})],wires:[W([-90,10],'tp1','red'),W([-70,10],'tn1','black'),W('tp50','bp50','red'),W('tn50','bn50','black'),W('a22','tn18','black'),W('tp27','b30','red'),W('bp27','i30','red')],note:'A common-cathode display: the com pins go to −, and each segment lights through its own resistor. Here segments b and c show the digit 1. Add resistors to light more segments.'}),
 'Night warning light (LDR + 555)':()=>({parts:[bat(9),
  part('ldr',['tp5','a6'],{light:0.8}),part('resistor',['j6','bn5'],{ohms:10000}),part('resistor',['h6','h11'],{ohms:10000}),part('npn','f10'),
  part('resistor',['bp10','j12'],{ohms:10000}),part('resistor',['bp11','j14'],{ohms:470}),part('led',['h14','h12'],{color:'blue'}),
  part('ne555','e20'),part('resistor',['tp17','a21'],{ohms:1000}),part('resistor',['b21','b22'],{ohms:10000}),part('ecap',['c22','tn21'],{farads:47e-6}),
  part('resistor',['g22','g27'],{ohms:220}),part('led',['h27','h28'],{color:'red'}),
  part('resistor',['i22','i33'],{ohms:1000}),part('npn','f32'),part('resistor',['bp31','j38'],{ohms:150}),part('pled',['i38','i36'],{color:'white'})],
  wires:[...power(),W('e6','f6','green'),W('j10','bn8','black'),W('i12','j23','orange'),W('a20','tp16','red'),W('j20','bn16','black'),W('d22','g21','yellow'),W('j28','bn23','black'),W('j32','bn26','black'),W('j34','j36','blue')],
  note:'Light: the LDR is low (about 4 kΩ), Q1 conducts and holds RESET (pin 4) low, so the 555 stops and the BLUE LED is on: all is well. Dark: the LDR rises to hundreds of kΩ, Q1 turns off, RESET goes high and the 555 blinks (about 1.5 Hz with 1 kΩ, 10 kΩ and 47 µF). The RED LED and the 1 W power LED (driven by Q2) flash together. Turn the mouse wheel over the LDR, or press L / Shift+L while it runs, to change the light.'}),
};
const api={EX,part,W};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BB_EXAMPLES=api;
})(typeof window!=='undefined'?window:globalThis);
