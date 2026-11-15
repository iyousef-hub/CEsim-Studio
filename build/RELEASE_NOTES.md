CEsim Studio 1.9.0 adds Lab 11 and Lab 10 circuits, frequency on the oscilloscope, and fixes for pulse sources and op-amps without supplies.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.9.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.9.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.9.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.9.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.9.0-Linux-amd64.deb` |

## Lab circuits

The circuit code editor's Examples list has four new circuits, drawn like the lab handout with their meters:

- **Lab 11, inverting adder:** E1 = 2 V, E2 = 3 V, E3 = 3 V. The meters read I1 = 200 µA, I2 = 300 µA, I3 = 300 µA, I = 800 µA and Vout = −8.000 V.
- **Lab 11, subtractor with Rf = R1:** V1 = 4 V, V2 = 1 V, output 3.000 V.
- **Lab 11, subtractor with Rf = 12 kΩ:** V1 = 6 V, V2 = 3 V, output 3.600 V.
- **Lab 10, inverting amplifier on the oscilloscope:** a 1 V, 1 kHz input and a 20 Vpp inverted output.

## Oscilloscope

- The measurements now include minimum, frequency and period for each channel, next to Vpp, Vrms and maximum.
- The recorded traces were compared point by point with an independent reference simulator on nine lab circuits (diodes, zener, half-wave and bridge rectifiers, common emitter, inverting amplifier, integrator and RC filter). Peak-to-peak values agree within 0.3%, and the readings of the inverting amplifier are exact: 2.000 Vpp in, 20.00 Vpp out, 1.000 kHz.

## Fixed

- A pulse source written as `PULSE(-1 1 …)` kept only the high level and went from 0 to 1 V. The pulse source now has a low level, so square waves can swing below zero.
- In circuit code, an op-amp supply pin can be left unconnected by writing `nc`. Without supplies the op-amp runs from ±15 V, like a 3-terminal virtual op-amp.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.9.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.9.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
