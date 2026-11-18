CEsim Studio 1.22.0 adds three analyses to the Circuit tool: a Bode plotter, an IV analyzer and a DC sweep with a grapher.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.22.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.22.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.22.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.22.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.22.0-Linux-amd64.deb` |

## New

- **Bode plotter (XBP):** a new instrument under Simulate → Instruments. Wire IN + to the circuit input and OUT + to its output, then press Run sweep. It finds the DC operating point first, sweeps the AC source or function generator over the frequency range, and plots the gain in dB, the phase, or both, with the peak and the −3 dB frequency. Click the plot to read any frequency. Export CSV saves the data, and the SPICE export writes the sweep as a `.ac` analysis.
- **IV analyzer:** Simulate → Analyses → IV analyzer draws current-voltage curves of diodes, Zener diodes, LEDs, Schottky diodes, BJTs (Ic against Vce for steps of Ib), MOSFETs and JFETs (Id against Vds for steps of Vgs). Pick a part from the design or any library model. A current limit stops a curve where a real curve tracer would.
- **DC sweep and Grapher:** Simulate → Analyses → DC sweep steps a DC source, a current source, a resistor, a pot or the light on an LDR, and records every voltmeter, ammeter, multimeter and probe at each step. The results appear as a graph and a table. Copy table pastes straight into Excel or Word, and Export CSV saves the data.

## Improved

- Sine sources and the function generator now keep their wave continuous when the frequency changes while the circuit runs.

## Accuracy

- An RC low-pass of 1 kΩ and 100 nF gives −3 dB at 1.585 kHz (theory 1.592 kHz), and the phase is within 0.1° of theory from 10 Hz to 100 kHz.
- A common-emitter amplifier with a 2N2222A gives a mid-band gain of 44.2 dB with −179° phase, and the low-frequency roll-off of its coupling capacitors.
- A DC sweep of a 1N4148 with 1 kΩ gives the same readings as running the circuit at each voltage.

All automated tests pass, including code round trips for every part type, every part in a running simulation, the lab examples and the oscilloscope.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.22.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.22.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
