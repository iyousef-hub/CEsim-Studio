/* Arduino example sketches and their parts */
window.INO_EXAMPLES={
 "Blink": {
  "parts": [
   {
    "type": "led",
    "pin": 13,
    "color": "red"
   }
  ],
  "code": "// Blink: the LED on pin 13 turns on and off every second\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);      // pin 13 is an output\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);   // LED on\n  delay(1000);                       // wait one second\n  digitalWrite(LED_BUILTIN, LOW);    // LED off\n  delay(1000);\n}\n"
 },
 "Traffic light": {
  "parts": [
   {
    "type": "led",
    "pin": 10,
    "color": "red"
   },
   {
    "type": "led",
    "pin": 9,
    "color": "yellow"
   },
   {
    "type": "led",
    "pin": 8,
    "color": "green"
   }
  ],
  "code": "// Traffic light with three LEDs\nconst int RED = 10;\nconst int YELLOW = 9;\nconst int GREEN = 8;\n\nvoid setup() {\n  pinMode(RED, OUTPUT);\n  pinMode(YELLOW, OUTPUT);\n  pinMode(GREEN, OUTPUT);\n}\n\nvoid show(int r, int y, int g, int ms) {\n  digitalWrite(RED, r);\n  digitalWrite(YELLOW, y);\n  digitalWrite(GREEN, g);\n  delay(ms);\n}\n\nvoid loop() {\n  show(HIGH, LOW, LOW, 3000);   // stop\n  show(LOW, LOW, HIGH, 3000);   // go\n  show(LOW, HIGH, LOW, 1000);   // get ready to stop\n}\n"
 },
 "Button and LED": {
  "parts": [
   {
    "type": "button",
    "pin": 2,
    "wiring": "gnd"
   },
   {
    "type": "led",
    "pin": 13,
    "color": "green"
   }
  ],
  "code": "// Hold the button to light the LED\n// The button connects pin 2 to GND, so INPUT_PULLUP is used:\n// not pressed = HIGH, pressed = LOW\nconst int BUTTON = 2;\nconst int LED = 13;\n\nvoid setup() {\n  pinMode(BUTTON, INPUT_PULLUP);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(BUTTON) == LOW) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n"
 },
 "Fade with PWM": {
  "parts": [
   {
    "type": "led",
    "pin": 9,
    "color": "blue"
   }
  ],
  "code": "// Fade an LED in and out with analogWrite (PWM)\nconst int LED = 9;        // PWM pins: 3, 5, 6, 9, 10, 11\nint brightness = 0;\nint step = 5;\n\nvoid setup() {\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(LED, brightness);   // 0 = off, 255 = full\n  brightness = brightness + step;\n  if (brightness <= 0 || brightness >= 255) {\n    step = -step;                 // change direction\n  }\n  delay(30);\n}\n"
 },
 "Potentiometer": {
  "parts": [
   {
    "type": "pot",
    "pin": 14,
    "value": 512
   },
   {
    "type": "led",
    "pin": 9,
    "color": "yellow"
   }
  ],
  "code": "// Read a potentiometer and set the LED brightness\nconst int POT = A0;\nconst int LED = 9;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  int value = analogRead(POT);              // 0 to 1023\n  int level = map(value, 0, 1023, 0, 255);  // 0 to 255\n  analogWrite(LED, level);\n  float volts = value * 5.0 / 1023.0;\n\n  Serial.print(\"Reading: \");\n  Serial.print(value);\n  Serial.print(\"   Voltage: \");\n  Serial.print(volts);\n  Serial.println(\" V\");\n  delay(500);\n}\n"
 },
 "Temperature sensor": {
  "parts": [
   {
    "type": "lm35",
    "pin": 15,
    "value": 24
   },
   {
    "type": "led",
    "pin": 12,
    "color": "red"
   }
  ],
  "code": "// LM35 temperature sensor: 10 mV per degree Celsius\nconst int SENSOR = A1;\nconst int ALARM = 12;\nconst float LIMIT = 30.0;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(ALARM, OUTPUT);\n}\n\nvoid loop() {\n  int raw = analogRead(SENSOR);\n  float millivolts = raw * (5000.0 / 1023.0);\n  float celsius = millivolts / 10.0;\n\n  Serial.print(\"Temperature: \");\n  Serial.print(celsius, 1);\n  Serial.println(\" C\");\n\n  digitalWrite(ALARM, celsius > LIMIT ? HIGH : LOW);\n  delay(1000);\n}\n"
 },
 "Night lamp (light sensor)": {
  "parts": [
   {
    "type": "ldr",
    "pin": 16,
    "value": 70
   },
   {
    "type": "led",
    "pin": 6,
    "color": "white"
   }
  ],
  "code": "// Turn on a lamp when it gets dark\nconst int LIGHT = A2;\nconst int LAMP = 6;\nconst int DARK = 300;    // below this reading it is dark\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(LAMP, OUTPUT);\n}\n\nvoid loop() {\n  int light = analogRead(LIGHT);\n  Serial.println(light);\n  if (light < DARK) {\n    digitalWrite(LAMP, HIGH);\n  } else {\n    digitalWrite(LAMP, LOW);\n  }\n  delay(200);\n}\n"
 },
 "Servo with a knob": {
  "parts": [
   {
    "type": "pot",
    "pin": 14,
    "value": 300
   },
   {
    "type": "servo",
    "pin": 9
   }
  ],
  "code": "// Turn a servo motor with a potentiometer\n#include <Servo.h>\n\nServo motor;\nconst int KNOB = A0;\n\nvoid setup() {\n  motor.attach(9);\n}\n\nvoid loop() {\n  int value = analogRead(KNOB);\n  int angle = map(value, 0, 1023, 0, 180);\n  motor.write(angle);\n  delay(15);\n}\n"
 },
 "Ultrasonic distance": {
  "parts": [
   {
    "type": "ultrasonic",
    "trig": 7,
    "echo": 6,
    "value": 80
   },
   {
    "type": "buzzer",
    "pin": 8
   },
   {
    "type": "led",
    "pin": 13,
    "color": "red"
   }
  ],
  "code": "// HC-SR04 distance sensor with a parking beeper\nconst int TRIG = 7;\nconst int ECHO = 6;\nconst int BUZZER = 8;\nconst int LED = 13;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nlong readDistance() {\n  digitalWrite(TRIG, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH);       // 10 microsecond pulse\n  delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  long duration = pulseIn(ECHO, HIGH);\n  return duration / 58;           // microseconds to centimetres\n}\n\nvoid loop() {\n  long cm = readDistance();\n  Serial.print(\"Distance: \");\n  Serial.print(cm);\n  Serial.println(\" cm\");\n\n  if (cm > 0 && cm < 30) {        // close: beep\n    tone(BUZZER, 1000, 100);\n    digitalWrite(LED, HIGH);\n    delay(cm * 10);\n  } else {\n    noTone(BUZZER);\n    digitalWrite(LED, LOW);\n    delay(300);\n  }\n}\n"
 },
 "LCD display": {
  "parts": [
   {
    "type": "lcd"
   }
  ],
  "code": "// 16x2 LCD: a message and a seconds counter\n#include <LiquidCrystal.h>\n\n// RS, E, D4, D5, D6, D7\nLiquidCrystal lcd(12, 11, 5, 4, 3, 2);\n\nvoid setup() {\n  lcd.begin(16, 2);\n  lcd.print(\"Hello, CEsim!\");\n}\n\nvoid loop() {\n  lcd.setCursor(0, 1);            // column 0, row 1\n  lcd.print(\"Time: \");\n  lcd.print(millis() / 1000);\n  lcd.print(\" s\");\n  delay(250);\n}\n"
 },
 "Serial commands": {
  "parts": [
   {
    "type": "led",
    "pin": 13,
    "color": "green"
   }
  ],
  "code": "// Type ON or OFF in the Serial Monitor and press Send\nconst int LED = 13;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(LED, OUTPUT);\n  Serial.println(\"Type ON or OFF\");\n}\n\nvoid loop() {\n  if (Serial.available() > 0) {\n    String command = Serial.readStringUntil('\\n');\n    command.trim();\n    command.toUpperCase();\n\n    if (command == \"ON\") {\n      digitalWrite(LED, HIGH);\n      Serial.println(\"LED is on\");\n    } else if (command == \"OFF\") {\n      digitalWrite(LED, LOW);\n      Serial.println(\"LED is off\");\n    } else {\n      Serial.println(\"Unknown command: \" + command);\n    }\n  }\n}\n"
 },
 "Interrupt counter": {
  "parts": [
   {
    "type": "button",
    "pin": 2,
    "wiring": "gnd"
   }
  ],
  "code": "// Count button presses with an interrupt\nconst int BUTTON = 2;\nvolatile int presses = 0;\nint shown = 0;\n\nvoid onPress() {\n  presses++;\n}\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(BUTTON, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(BUTTON), onPress, FALLING);\n  Serial.println(\"Press the button\");\n}\n\nvoid loop() {\n  if (presses != shown) {\n    shown = presses;\n    Serial.print(\"Presses: \");\n    Serial.println(shown);\n  }\n}\n"
 },
 "RGB LED colours": {
  "parts": [
   {
    "type": "rgb",
    "r": 9,
    "g": 10,
    "b": 11,
    "common": "cathode"
   }
  ],
  "code": "// Mix colours with an RGB LED on three PWM pins\nconst int R = 9;\nconst int G = 10;\nconst int B = 11;\n\nvoid color(int r, int g, int b) {\n  analogWrite(R, r);\n  analogWrite(G, g);\n  analogWrite(B, b);\n}\n\nvoid setup() {\n  pinMode(R, OUTPUT);\n  pinMode(G, OUTPUT);\n  pinMode(B, OUTPUT);\n}\n\nvoid loop() {\n  color(255, 0, 0);     delay(800);   // red\n  color(0, 255, 0);     delay(800);   // green\n  color(0, 0, 255);     delay(800);   // blue\n  color(255, 160, 0);   delay(800);   // orange\n  color(160, 0, 255);   delay(800);   // purple\n  color(255, 255, 255); delay(800);   // white\n}\n"
 }
};
