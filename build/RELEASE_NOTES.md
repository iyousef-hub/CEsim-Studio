CEsim Studio 1.17.0 exports every part used in the labs to .ms14.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.17.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.17.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.17.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.17.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.17.0-Linux-amd64.deb` |

## Export to .ms14: all parts

Every part in the library now has a matching part in the exported design. Nothing is left out.

- **4000 series:** 4001, 4011, 4013, 4017, 4027, 4028, 4029, 4040, 4049, 4050, 4069, 4070, 4071, 4077, 4081, 4093, 4511 and 4518. Each pin is joined to the matching pin of the Multisim part, even where the data sheet names it differently (for example Q1 to Q12 of the 4040 become O0 to O11). The supply pins are joined to the VDD and VSS nets.
- **More 74xx chips:** 7410, 7411, 7414, 7420, 7427, 74125, 74138, 74139, 74244, 74266, 74373 and 74374.
- **Gates:** XNOR and buffer gates now export. A gate set to the CD4000 family becomes a 4000-series gate (4081, 4071, 4011, 4001, 4070, 4077, 4069, 4050).
- **JFET, SCR, TRIAC, DIAC and optocoupler:** each part keeps its own name and model (for example 2N5457, 2N5060, BT136-600, DB3, 4N35).
- The CMOS and 74LS input and output models these chips need are written into the file.

Checked in the simulator: a 74161 counter with a 4511 decoder, a 4017, a 74LS138 and a NAND gate simulate without netlist errors. The JFET stage reads 9.87 V at the drain, a fired SCR 0.75 V, a fired TRIAC 0.75 V, a DIAC below its breakover 12 V, and the optocoupler output is pulled low. These readings match CEsim.

From chips with several sections (for example the 4013, 4518 and 74244), section 1 is exported. The message after saving lists any pins from the other sections that were connected.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.17.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.17.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
