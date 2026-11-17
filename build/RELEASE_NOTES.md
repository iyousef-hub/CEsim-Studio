CEsim Studio 1.14.0 adds .MSK and .sch export for VLSI, more parts in Circuit, and an own model for every part in .ms14 export.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.14.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.14.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.14.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.14.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.14.0-Linux-amd64.deb` |

## VLSI

- **Export layout (.MSK):** the layout with its inputs set as clocks, each one twice as slow as the one before so a run goes through the whole truth table, its outputs ready to watch, and VDD and VSS set.
- **Export transistor schematic (.sch):** every nMOS and pMOS with its W and L, a VDD and a VSS symbol, a button on each input and a lamp on each output. Each net runs on its own wire, so the drawing reads like the transistor circuit.
- **Open .MSK:** layouts open with their layers, inputs and outputs. The inverter, AND2, NAND3, XOR, half adder and full adder labs open and their truth tables name the right gates.
- Metal 3 and via 2 are new layers (key 7 and V).

## Circuit: new parts

- JFET N-channel (2N5457, 2N3819, J201, J310, BF245A, MPF102) and P-channel (2N5460, J175, 2N3820).
- SCR (2N5060, C106B, TIC106D, BT151-500R, 2N6504), TRIAC (BT136-600, BT137-600, BTA16-600B, MAC97A6, Q4008L4) and DIAC (DB3, DB4, BR100). They latch on above the gate trigger current or at breakover and stay on until the current falls below the holding current.
- Optocouplers (4N25, 4N26, 4N35, PC817, TLP521-1, CNY17-2): the collector current is the LED current times the current transfer ratio.
- All of them export to SPICE (.cir) and go into circuit code.

## Export to .ms14

- Every part keeps its own name and model: 2N3904, IRF540N, 1N4742A, TL072, LM7812 and every other part number in the library is written with the model CEsim simulates it with, so both give the same readings. Before, most part numbers were written as one part of their family.
- Not exported yet: the basic logic gates, JFETs, SCR, TRIAC, DIAC and optocouplers. The message after saving lists any part that was left out.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.14.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.14.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
