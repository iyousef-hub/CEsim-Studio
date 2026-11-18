CEsim Studio 1.23.0 adds a logic analyzer and a word generator, design calculators that build the circuit for you, and a Monte Carlo analysis.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.23.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.23.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.23.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.23.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.23.0-Linux-amd64.deb` |

## New

- **Word generator (XWG):** a new instrument that drives D0 to D7 with a list of hex words at a set frequency, in Cycle or Burst mode, with ready patterns: up and down counter, shift left and right, 55/AA, Gray code and BCD. The part shows the current word and its bits while the circuit runs.
- **Logic analyzer (XLA):** a new instrument that records eight logic inputs as a timing diagram. It has a time base, a threshold, Hold, two cursors that read the time between them, the frequency and the word in hex and binary, and CSV export.
- **Design calculators:** Tools → Design calculators works out the values, rounds them to standard E12 or E24 parts, shows what those parts really give, and builds the circuit in a new tab with the right instrument:
  - 555 timer, astable or monostable
  - Op-amp gain, inverting or non-inverting, with a warning when the output would clip
  - Active filter: 2nd order Butterworth Sallen-Key or 1st order RC, low-pass or high-pass, built with a Bode plotter
  - LED resistor for one or more LEDs, with the resistor power
  - Resistor color code, both ways
- **Monte Carlo analysis:** Simulate → Analyses → Monte Carlo runs the circuit many times with every resistor, capacitor and inductor moved within its tolerance (uniform or Gaussian) and shows a histogram of a meter reading with the mean, standard deviation, lowest and highest values. A part with its own tol= setting uses it.

## Improved

- 555 circuits now get a time step worked out from their timing resistor and capacitor, so their frequency is right. A 1 kHz astable was running at 833 Hz before and now runs at 1.013 kHz.

## Accuracy

- The 555 calculator designs a 1 kHz, 60 % astable with 30 kΩ, 56 kΩ and 10 nF. The simulation gives 1.013 kHz, and the formula gives 1.014 kHz.
- The 1 kHz Butterworth low-pass built with E12 capacitors is worked out to fall 3 dB at 936 Hz, and the Bode plotter measures 930 Hz.
- An inverting amplifier with a gain of −10 gives 4.998 V peak from 0.5 V peak.
- Monte Carlo of a 10 kΩ / 10 kΩ divider on 12 V with 5 % resistors stays between −4.5 % and +3.9 % of 6 V.

All automated tests pass, including code round trips for every part type, every part in a running simulation, the lab examples and the oscilloscope.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.23.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.23.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
