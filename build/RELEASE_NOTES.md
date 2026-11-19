CEsim Studio 1.28.0 adds a library of 144 ready circuits, assignments that mark themselves, and a power and efficiency analysis with buck and boost converters.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.28.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.28.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.28.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.28.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.28.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.28.0-Linux-amd64.deb` |

## New

- **Circuit library (Tools menu, Ctrl+Shift+L):** 144 ready circuits, searchable by name, value or topic, in seven groups. Each one has a line on what it shows and opens in a new tab with its meters and instruments.
  - Basics: Ohm's law, dividers, series and parallel resistors, Wheatstone bridges, RC charging, LEDs.
  - Filters: RC and RL filters, series RLC resonance, Sallen-Key Butterworth low-pass and high-pass, each with a Bode plotter.
  - Power: half-wave and bridge rectifiers with filter capacitors, Zener regulators, 7805 and LM317 regulators, buck and boost converters.
  - Transistors: switches, common-emitter amplifiers, emitter followers, a current mirror, an astable multivibrator, MOSFET switches.
  - Op-amps: inverting and non-inverting amplifiers, follower, summing and difference amplifiers, integrator, differentiator, comparator, Schmitt trigger, Wien bridge oscillator.
  - Timers: 555 astable from 1 Hz to 10 kHz and monostable.
  - Digital: every two-input gate with a logic analyzer, a counter on a hex display, the word generator.
- **Assignments (Tools menu):** a teacher writes the task and adds checks:
  - a meter reads a value within a tolerance
  - the gain at a frequency, measured with the Bode plotter
  - at most a number of parts (the parts already given can be left out of the count)
  - a kind of part must be used, or must not be used
  The task is saved in the design file. A student opens it, builds the circuit and presses Check my work: each check is marked with the value the circuit really gives, and the tries are counted.
- **Power and efficiency (Simulate → Analyses):** runs the circuit and averages the power of every part over the second half of the run. It shows the power given by the sources, the power in the chosen load, the losses and the efficiency, and can sweep the load to plot efficiency against load current.

## Fixed

- MOSFET lines in circuit code that name a model, such as `M1 d g s s IRF9540N` or `PMOS`, now place the right channel type and model. They were all placed as N-channel 2N7000 before.
- Circuit code no longer adds a second VM or AM to the name of a voltmeter or ammeter, so its name stays the same after each export and import.

## Checked

- All 144 library circuits build without warnings and simulate.
- The buck converter (12 V, 50 % duty, 10 Ω) gives 5.55 V at 92 % efficiency, and the boost converter (5 V, 50 % duty, 47 Ω) gives 9.15 V at 91 %.
- An inverting amplifier with 10 kΩ and 100 kΩ passes an assignment for a gain of 10 at 1 kHz with 9.999 V/V.
- All automated tests pass, including code round trips for every part type, every part in a running simulation, 37 lab and example files, the AI answer tests and the lab examples.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.28.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.28.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
