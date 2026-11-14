CEsim Studio 1.0.0 is the first public release. It brings a circuit simulator, a diagram editor and a 3D modeller together in one desktop app for students and engineers in computer and electrical engineering.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.0.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.0.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.0.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.0.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.0.0-Linux-amd64.deb` |

## What is included

**Circuit**
- Schematic capture with live simulation and a large library of parts: passives, sources, diodes, transistors, op-amps, logic, 555 timer, displays and more.
- Instruments: multimeter, oscilloscope, function generator, voltmeter, ammeter and probes.
- Text notes, net labels, a title block and part labels you can drag.
- Export to PNG, JPG, WebP, SVG and PDF, plus a bill of materials and node voltages as CSV.
- Opens and saves SPICE netlists (`.cir`).

**Circuit from image**
- Turns a photo or screenshot of a schematic into an editable circuit.
- Uses a vision model that runs on your own computer through Ollama. Nothing is uploaded.

**Diagram**
- Flowcharts, state machines, datapaths and network diagrams with smart connectors and automatic layout.
- Text-to-diagram, minimap, find, a floating action bar and keyboard shortcuts.
- Opens and saves `.drawio` and Mermaid (`.mmd`) files.

**3D**
- Modelling in real millimetres, with holes, groups, arrays, shells and a board library for designing enclosures.
- Adjustable zoom, rotate and pan speed.
- Exports STL, OBJ, 3MF, GLB, images and a CSV size report.

**Studio**
- One launcher for every tool, with recent files and five themes with accent colours.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.0.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.0.0-Linux-amd64.deb`.

BY. YOUSEF
