CEsim Studio 1.11.0 puts every circuit part into circuit code and adds the workbook labs as ready examples.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.11.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.11.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.11.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.11.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.11.0-Linux-amd64.deb` |

## Every part in code

- All parts of the Circuit library can be written as code, with or without positions: gates, flip-flops, counter, 555, regulators, switches, relay, motor, transformer, fuse, lamps, buzzer, displays, probes, function generator, oscilloscope, multimeter and wattmeter, next to the resistors, sources, diodes, transistors and op-amps.
- Any setting can be written at the end of a line as `setting=value`, for example `R1 a b 1k tol=1%` or `D2 a k LED color=green`. A circuit turned into code and back keeps every setting. Before, a resistor's tolerance and power, a capacitor's starting voltage, an LED's colour, a transistor's hFE and a sine source's phase were lost.
- **From current design** without **With layout** used to leave out every part that was not a plain SPICE element. It now writes them all.
- The prompt for AI lists every part with its pin order and settings, and every model name, so an AI chat can write any circuit.

## Workbook labs

The Examples list has a new group with the circuits of the Electronics workbook (503413-4), each drawn like the workbook figure with its meters or oscilloscope:

| Lab | Circuit | Reading in CEsim |
|---|---|---|
| 3 | Diode, forward and reverse bias | VD = 0.621 V, ID = 4.38 mA at 5 V |
| 4 | Zener, static and regulation | VZ = 6.23 V |
| 5 | Half-wave rectifier | 16.97 Vp secondary (12 Vrms) |
| 6 | Full-wave centre-tapped rectifier | |
| 7 | Full-wave bridge rectifier | |
| 8 | BJT common base | Ie = 8.848 mA, Vbe = 0.701 V |
| 9 | BJT common emitter | |
| 10 | Inverting and non-inverting amplifiers | 2.2 Vp and 3.2 Vp |
| 11 | Adder and two subtractors | −8 V, 3 V, 3.6 V |
| 12 | Integrator and differentiator | 4.89 Vpp triangle, 1.6 Vpp square |
| 13 | First- and second-order low-pass filters | 0.844 Vp at 10 kHz, 1.283 Vp at 450 Hz |
| 14 | High-pass active and second-order high-pass filters | |
| 15 | Active band-pass and notch filters | |

## Oscilloscope

- Vrms is now measured over whole periods, so a 10 Vp sine reads 7.071 V every time instead of moving between 7.06 and 7.08 V.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.11.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.11.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
