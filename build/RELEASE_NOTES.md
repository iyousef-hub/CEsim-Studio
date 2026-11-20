CEsim Studio 1.31.0 opens every file it exports: Multisim, LTspice and KiCad schematics, chip layouts, Gerber files and program images.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.31.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.31.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.31.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.31.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.31.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.31.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Circuit opens .ms14, .asc and .kicad_sch:** a Multisim design (.ms14, .ms13, .ms12) opens with every part in its place, turned the same way, with its values and the original wires. Function generator and oscilloscope settings come back too. LTspice and KiCad schematics open the same way. Parts with no CEsim match are listed.
- **VLSI opens .gds, .cif, .sch and .sp:** GDSII and CIF layouts open layer by layer with their labels. A DSCH schematic (gates or transistors) or a SPICE netlist is laid out as CMOS gates between the VDD and GND rails, ready to check and simulate.
- **PCB opens Gerber files:** the exported .zip, or the separate Gerber and drill files. Pads are matched to the footprints, and the tracks, vias, board size and nets come back.
- **Architecture opens .hex:** the words come back as MIPS or RISC-V assembly, with labels on branch and jump targets.
- **8086 opens .COM:** the program comes back as assembly, with the code followed from 100h and the data as db lines with labels.
- On macOS, these files can be opened from Finder with CEsim Studio.

## Checked

- All 25 CE252 lab .ms14 files open with the same nets, values and instrument settings, with no warnings.
- Circuits exported to .kicad_sch and opened again keep the same nets and values. LTspice schematics open with their wires, net labels and values.
- VLSI layouts exported to GDSII and CIF open cell for cell the same. The Lab 10 full adder opens from DSCH with no rule errors and the correct truth table.
- Every PCB example exported to Gerber opens with the same parts, positions, tracks, vias and connections.
- Every MIPS and RISC-V example exported to .hex, and every 8086 .COM example, assembles back to the same words and bytes.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.31.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.31.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
