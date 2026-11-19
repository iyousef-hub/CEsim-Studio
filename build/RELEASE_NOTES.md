CEsim Studio 1.27.0 helps students see and understand what a circuit does: an explain mode, moving current, hand solutions and version history.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.27.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.27.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.27.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.27.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.27.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.27.0-Linux-amd64.deb` |

## New

- **Explain mode (F10, View menu):** click any part while the circuit runs. A window explains in one line what the part does and shows its live pin voltages, the current through it and its power.
  - Transistors show Ib, Ic, Ie, V(BE), V(CE), β and the region: cut-off, active or saturation.
  - Diodes and LEDs show whether they conduct.
  - Op-amps show the output, V(+) − V(−), and whether they work linearly or are saturated at the supply.
  - Resistors show the Ohm's law check.
- **Current flow (F9, View menu):** dots move along every wire the way conventional current flows, faster where the current is larger.
- **Solve by hand (Tools menu):** for DC circuits of resistors, potentiometers, sources and meters, the node-voltage method step by step:
  1. the reference node
  2. the voltage sources and supernodes
  3. KCL at every other node
  4. the matrix G · x = z
  5. the node voltages and source currents
  6. every resistor current and power by Ohm's law
  7. a KVL check round each independent loop
  8. a table against the simulation
  Node numbers are shown on the drawing while the window is open.
- **Version history (File menu):** while a design changes, a copy is kept every minute (the last 60). Open any version in a new tab to compare, or restore it; Ctrl+Z undoes a restore. The open designs are also saved every minute.

## Improved

- Zoom in, zoom out and Zoom to fit glide to the new view instead of jumping.
- The engine now works out the current into every pin of every part. This does not change any simulation result: four examples give exactly the same values with and without it.

All automated tests pass, including code round trips for every part type, every part in a running simulation, 37 lab and example files and the lab examples.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.27.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.27.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
