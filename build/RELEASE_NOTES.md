CEsim Studio 1.24.0 makes lab reports in Word and PDF, adds a fault mode for teachers and a quiz mode for practice.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.24.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.24.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.24.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.24.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.24.0-Linux-amd64.deb` |

## New

- **Lab report:** Reports → Lab report makes a full report from the open circuit:
  - a title with the lab number, and a table with the student name, ID, course, instructor and date
  - the text sections you write: objective, theory, procedure, discussion and conclusion
  - the components list and the circuit diagram
  - a table of every meter reading after a set simulation time, and the oscilloscope screens
  - the last Bode plot and DC sweep (graph and table)
  - an empty Implementation section for photos of the built circuit
  It saves as Word (.docx) or PDF. The student details are remembered for the next report, and every section can be left out.
- **Fault mode:** Simulate → Faults lets a teacher hide faults in parts: open, shorted, or a value 10 times too high or too low, chosen by hand or at random. Faults do not show on the drawing, are kept hidden in the saved file and can be locked with a password. A student measures the circuit, names the faulty part and the kind of fault, and is told if the answer is right, with a count of faults found and tries.
- **Quiz mode:** Tools → Quiz has two parts:
  - **Practice problems:** new values every time for Ohm's law, voltage dividers, parallel resistors, RC time constant and cut-off frequency, LED resistor, 555 frequency, op-amp gain, power and LC resonance. Answers are marked within 3 % and the formula is shown. Build it and see opens the circuit so the answer can be checked in the simulation.
  - **Predict this circuit:** asks for the reading of every voltmeter and ammeter in the open design and marks each answer against the simulation within 5 %.

All automated tests pass, including code round trips for every part type, every part in a running simulation, 37 lab and example files, the lab examples and the oscilloscope. The Word report passes the Office file checks.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.24.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.24.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
