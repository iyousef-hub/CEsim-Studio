CEsim Studio 1.37.0 adds the System model tool, which plans a whole project and opens it in every other tool, and 120 new breadboard parts: sensors, motors, batteries of every kind and drone parts, each with its own 3D model.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.37.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.37.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.37.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.37.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.37.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.37.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **System model:** name a project, choose a board and add parts. Every pin is joined to a free board pin or to the part it belongs with (an ESC to its motor, a driver or relay to its motor or pump, the flight controller to the ESCs and the receiver, a battery to what it feeds), and each link can be changed from a list. A sketch is written from the parts. Saves `.cesys` files.
- **Open in every tool:** one click opens the project under its name in Breadboard (board, parts, wires and the sketch, ready to run), Circuit (a schematic with a block for each part), Diagram (a block diagram), 3D (the model of every part, laid out side by side), Arduino and VLSI.
- **Arrows that show the signal:** in the block diagram each arrow points the way the signal goes. A part that sends and receives, such as GPS, I2C or a data pin, has an arrow head at both ends, and battery power is drawn in dashed red.
- **Logic gates in VLSI:** NOT, NAND, NOR, AND, OR and XOR gates in a project are laid out as CMOS transistors, and on the breadboard they become 74LS chips that the sketch tests.
- **Sensors:** soil moisture, rain, five MQ gas sensors, flame, sound, light, Hall, line, water level, Sharp distance, current, NTC, UV, pulse, force, flex, slide pot, pH, turbidity, IR obstacle, touch, reed, tilt, limit switch, radar, knock and door switch. Analog sensors have a slider and a threshold for the digital output.
- **Batteries:** AA, AAA, C, D, coin cells, 18650 and 21700 cells, packs and holders, NiMH, lead-acid, LiFePO4, power bank, solar panel, and LiPo packs from 1S 300 mAh to 6S 5000 mAh, each with its real voltage and internal resistance.
- **Drone parts and motors:** brushless motors from 0802 to 4114, ESCs from 6 A to 60 A, power distribution board, GPS, receivers, FPV camera and video transmitter, barometer, compass, optical flow, telemetry, XT60 and finder buzzer; TT, N20, coreless, 280, 370, 775 and JGA25 motors, four more servos, linear actuator, pump, Peltier, drivers and converters.
- **Circuit:** the example designs no longer open as tabs; a new window starts with one empty design. Net labels on the left of a part read the right way up.

## Checked

- Every part on the list was added to a project on all 12 boards: every wire lands on a hole or a pin, and the breadboard, schematic, block diagram, 3D layout and sketch are built without an error.
- Projects on the Uno, Mega, Nano, ESP32 and Pico run on the breadboard: the sensors print their readings and the 74LS gates give the right truth tables.
- All six logic gates laid out in VLSI pass the design-rule check and give the right truth table.
- All 160 3D models build.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.37.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.37.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
