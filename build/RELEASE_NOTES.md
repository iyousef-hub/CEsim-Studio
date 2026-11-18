CEsim Studio 1.25.0 puts an Uno board on the breadboard, adds a full DOS machine to the 8086 tool, and exports schematics as .asc and .kicad_sch files.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.25.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.25.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.25.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.25.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.25.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.25.0-Linux-amd64.deb` |

## New

- **Uno board on the breadboard:** the Breadboard tool has an Arduino Uno board. Wire its header pins to the board, select it, write or pick a sketch and press Upload.
  - Outputs drive the circuit at 5 V through 25 Ω, and analogWrite gives the PWM average.
  - INPUT_PULLUP adds 20 kΩ to 5 V. digitalRead and analogRead read the real voltage of the node.
  - The 5V and 3.3V pins power the breadboard, and the board L LED follows pin 13.
  - The Serial Monitor in the side panel shows the sketch output and sends text to it.
  - Sketch examples: blink, traffic light, fade, button, pot on A0 and a night light. Two ready boards are under Examples: blink an LED, and button and pot.
- **DOS machine:** a new tab in the 8086 tool boots a full emulated PC with DOS. Drive C has the files of the DOS tab. Run editor program assembles the program in the editor and copies it to drive C as a .COM file, ready to run by name. Click the screen and type.
- **Export .asc schematic:** Transfer → Export .asc schematic writes resistors, capacitors, inductors, sources, diodes, LEDs, BJTs and MOSFETs as symbols joined by net labels. Op-amps and other parts go in as netlist lines with their subcircuits and models, together with the analysis.
- **Export .kicad_sch schematic:** Transfer → Export .kicad_sch schematic writes the drawing with the same part positions, pins, wires, junctions, ground symbols, net labels and notes.

## Licenses

The DOS machine uses the js-dos emulators package (DOSBox compiled to WebAssembly) under GPL-2.0. Its license is in `app/lib/emu/LICENSE`, and the README lists the sources.

All automated tests pass: the breadboard, the Arduino and 8086 tools, code round trips for every part type, every part in a running simulation, 37 lab and example files and the lab examples. Every pin in the exported .kicad_sch files lands on a wire end or on another pin.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.25.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.25.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
