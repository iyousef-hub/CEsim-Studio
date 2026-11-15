CEsim Studio 1.5.0 adds three tools: Breadboard, PCB and VLSI. Every tool in the Studio is now available.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.5.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.5.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.5.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.5.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.5.0-Linux-amd64.deb` |

## New: Breadboard

- A real-looking breadboard with power rails. Part legs go into the holes, and hovering a hole highlights every hole connected to it.
- Resistors with colour bands, LEDs in six colours, push buttons, slide switches, potentiometers, ceramic and electrolytic capacitors, diodes, an NPN transistor, six 74LS logic chips, a 555 timer, a 7-segment display, a 9 V battery, a power supply, a voltmeter and an ammeter.
- The circuit runs in real time: LEDs glow with their current, meters show their values, the 555 blinks at the frequency its parts set, and every hole shows its voltage.
- Warnings explain what went wrong: an LED that burns without a resistor, a resistor that gets too hot, a short circuit, a chip without power, an electrolytic capacitor connected backwards, or a leg that is not in a hole.
- Ten examples, from an LED and a resistor to a 555 blinker, an AND gate and a 7-segment display.
- Open in Circuit turns the board into a schematic, and Open in PCB turns it into a printed circuit board.

## New: PCB

- Two-layer board layout from a netlist, with through-hole and surface-mount footprints: resistors, capacitors, diodes, LEDs, TO-92 transistors, DIP chips, headers, terminals, push buttons and a 7-segment display.
- A ratsnest of the connections still to route, tracks at 90° and 45°, vias, and a guard that stops a track from ending on a pad of another net.
- An autorouter. On 40 random boards it routed 1,194 connections without breaking a single design rule.
- A design-rule check for clearance, shorts, track width, drill size, copper near the edge, overlapping parts and unrouted connections. Click a problem to jump to it.
- A finished-board view of the top and the bottom.
- Gerber RS-274X files for the copper, solder mask, silkscreen and outline, and an Excellon drill file, in one .zip. The files were checked with an independent Gerber reader.
- Boards can come from the Breadboard, from the Circuit tool (Transfer, Send to PCB) or from a netlist.

## New: VLSI

- CMOS layout on a λ grid with n-well, n and p diffusion, poly, metal 1, metal 2, contacts and vias.
- A design-rule check for width, spacing, gate overhang, source and drain extension, n-well surround, and contact and via size and surround.
- Transistor and wire extraction with W and L, and a truth table that names the gate: inverter, NAND, NOR, AND, OR, XOR and more.
- Simulate colours every wire by its logic value and shows conflicts.
- A cross-section of the chip along any row.
- Export to GDSII and CIF, checked with an independent GDSII reader, and a SPICE netlist of the extracted transistors.
- Examples: inverter, NAND, NOR, an AND gate made of a NAND and an inverter, and an inverter with design-rule errors to fix.

## Also new

- `.cebb`, `.cepcb` and `.cevlsi` files open with CEsim Studio from the file manager.
- The Circuit tool can open a board from the Breadboard and send a design to the PCB tool.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.5.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.5.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
