CEsim Studio 1.12.0 makes exported SPICE netlists (.cir) open correctly in other circuit simulators.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.12.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.12.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.12.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.12.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.12.0-Linux-amd64.deb` |

## SPICE export (.cir)

- Part names are kept as they are. A resistor named R1 is written as `R1`, not `RR1`, and a source named VCC as `VCC`, not `VVCC`.
- An op-amp is written as a subcircuit with all five pins (+, −, output, V+ and V−), with its model inside the file. Before, it was written as a plain voltage-controlled source, so the supplies were left unconnected and the op-amp showed up as a diamond-shaped source.
- Values use SPICE units: `u` for micro and `MEG` for mega. Before, the time step was written with the µ sign, and in SPICE a plain `M` means milli, not mega.
- A netlist with `.SUBCKT … .ENDS` blocks can be imported back.

A SPICE netlist describes only the parts and how they connect, not where they sit on the page. Another simulator places the parts itself when it opens a .cir file, so the drawing will look different from the one in CEsim.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.12.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.12.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
