CEsim Studio 1.26.0 lets the potentiometer and the LDR take decimal values.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.26.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.26.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.26.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.26.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.26.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.26.0-Linux-amd64.deb` |

## Fixed

- The wiper position of a potentiometer and the light level of an LDR take decimal values such as 1.2 %. The slider in the properties window moves in 0.1 % steps and follows the number you type, and the part label shows the decimal instead of rounding it to a whole number.
- Circuit code no longer adds a second POT to the name of a potentiometer whose name already starts with POT, so the name stays the same after each export and import.

## Checked

A 1 kΩ potentiometer at 1.2 % on 10 V gives 9.88 V on its wiper, as expected. All automated tests pass, including code round trips for every part type and the lab examples.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.26.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.26.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
