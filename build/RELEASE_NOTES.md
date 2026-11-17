CEsim Studio 1.15.0 adds 56 logic chips to Circuit and fixes the transistor schematic (.sch) export.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.15.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.15.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.15.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.15.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.15.0-Linux-amd64.deb` |

## Circuit: 74xx and 4000 chips

Place Parts → TTL / CMOS has three new families: 74STD, 74HC and CMOS_4000. Every chip simulates, with its pins named as on the data sheet.

- Gates: 7400, 7402, 7404, 7408, 7410, 7411, 7414, 7420, 7427, 7432, 7486, 74266, 4001, 4011, 4049, 4050, 4069, 4070, 4071, 4077, 4081, 4093.
- Decoders, multiplexers and encoders: 7442, 74138, 74139, 74148, 74151, 74153, 74157, 4028.
- 7-segment drivers: 7447 (active low), 7448 and 4511 (active high), with lamp test and blanking.
- Arithmetic: 7483 and 74283 (4-bit adders), 7485 (magnitude comparator).
- Counters: 7490, 74161, 74163, 74193, 4017, 4029, 4040, 4518.
- Registers and latches: 7475, 74164, 74165, 74175, 74194, 74273, 74373, 74374, 4013, 4027.
- Tri-state buffers: 74125 and 74244. A disabled output floats.

Circuit code places chips with their wires apart: the pins down each side fan out at different distances, and the wires run above the tallest part.

## VLSI: transistor schematic (.sch)

- Every transistor is now turned so the signal flows from source to drain: from the rails and the inputs toward the outputs. The schematic's switch-level simulation passes a value only that way, so before this a NAND with both inputs high left its output floating.
- Checked with the inverter, NAND, NOR, AND, NAND3, XOR, half adder and full adder: every row of every truth table matches the layout.

## Export to .ms14

The new chips, the basic gates, JFETs, SCR, TRIAC, DIAC and optocouplers are not exported yet. The message after saving lists any part that was left out.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.15.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.15.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
