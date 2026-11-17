CEsim Studio 1.16.0 exports logic gates and 74xx chips to .ms14.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.16.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.16.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.16.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.16.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.16.0-Linux-amd64.deb` |

## Export to .ms14: gates and 74xx chips

- AND, OR, NAND, NOR, XOR and NOT gates export as gates of 7408, 7432, 7400, 7402, 7486 and 7404.
- These chips export with every pin named as on the data sheet: 7442, 7447, 7448, 7475, 7483, 7485, 7490, 74148, 74151, 74153, 74157, 74161, 74163, 74164, 74165, 74175, 74193, 74194, 74273 and 74283. From the gate packages (7400, 7402, 7404, 7408, 7432, 7486), gate 1 is exported, and the message after saving says when other gates of the package were used.
- Each chip's supply pins are joined to the VCC and GND nets, and the TTL input and output models the chips need are written into the file, so the design simulates as soon as it opens.
- Checked with a counter (74161), a 7-segment decoder (7448) and four gates: the file opens, simulates without netlist errors, and the gates give the right outputs.

Not exported yet: buffers, XNOR, the other 74xx chips, the 4000 series, JFETs, SCR, TRIAC, DIAC and optocouplers.

## VLSI

The .MSK export was checked in the layout program itself: the NAND layout opens with its layers, labels and rails, and its simulation shows Y low only when A and B are both high.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.16.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.16.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
