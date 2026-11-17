CEsim Studio 1.19.0 fixes the simulator, the circuit code and the .ms14 export.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.19.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.19.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.19.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.19.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.19.0-Linux-amd64.deb` |

## Fixes

- **Op-amp with square waves:** a sharp edge into an op-amp could leave the simulation stuck at a wrong output level. For example, an inverting amplifier with a gain of 10 gave 11.1 V instead of 10 V. When a time step does not converge, the simulator now repeats it as ten shorter steps, down to a thousandth of the step. The integrator with its capacitor removed now gives exactly 10 V.
- **Text notes in circuit code:** writing a design as code now keeps its text notes (`TEXT "..." @ x y`), and reading the code back restores them. A design that has only net labels or notes no longer reports that it found no elements.
- **.ms14 export of wide designs:** the Multisim sheet now grows to hold the whole design, so no part is left outside the sheet. Checked in Multisim with a design about three sheets wide.

All automated tests pass, including the lab examples, code round trips for 121 part types, the .ms14 export of every part, the chips and the breadboard.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.19.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.19.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
