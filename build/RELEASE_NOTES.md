CEsim Studio 1.18.0 gives the same meter readings as Multisim for the transistor, diode and zener lab circuits.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.18.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.18.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.18.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.18.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.18.0-Linux-amd64.deb` |

## More accurate device models

- **Transistors:** a BJT model can now carry the full set of Gummel-Poon parameters: Early voltages, knee currents, leakage diodes and the base, emitter and collector resistances. The BC107BP uses the same parameters as in Multisim, so its output characteristics now rise slightly with VCE and its base current at high V<sub>BE</sub> is limited correctly.
- **Diodes:** a diode model can carry a series resistance and a breakdown voltage. The 1N4007 uses the same parameters as in Multisim.
- **Zener 1N4735A:** it now has a full diode model that gives the readings of the lab workbook's Multisim figures (6.139 V with no load, 6.135 V with a 10 kOhm load).
- The SPICE netlist export writes these parameters.

Checked against the workbook's Multisim readings, with 10 MOhm voltmeters as in Multisim:

| Circuit | Workbook | CEsim |
|---|---|---|
| Common base, Fig. 8.4 | Ie 8.839 mA, Vbe 0.701 V, Ic 8.809 mA, Vcb 1.119 uV | 8.844 mA, 0.701 V, 8.814 mA, 1.119 uV |
| Diode forward, Fig. 3.4 | Vd 0.600 V, Id 3.475 mA | 0.600 V, 3.475 mA |
| Diode reverse, Fig. 3.5 | Vd 9.999 V, Id 1.032 uA | 9.998 V, 1.032 uA |
| Zener regulation, Figs. 4.5 and 4.6 | 6.139 V, 6.135 V | 6.139 V, 6.135 V |

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.18.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.18.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
