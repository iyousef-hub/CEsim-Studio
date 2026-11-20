CEsim Studio 1.33.0 gives the Breadboard tool a clearer layout, a part search and parts that look like the real ones.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.33.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.33.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.33.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.33.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.33.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.33.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Parts on the right:** the parts list moved to the right side, next to a Details tab for the selected part and the problems. Clicking a part on the board opens its details.
- **Search:** type in the search box to find any part, board or sensor. Press / or Ctrl+F to jump to it, and Enter to place the first match.
- **Real-looking parts:** the breadboard, resistors, LEDs, capacitors, diodes, transistors, chips, buttons, switches, the potentiometer and the 9 V battery are drawn like the real parts.
- **Real-looking boards:** every Raspberry Pi model has its own ports, chips and 40-pin header. The Arduino boards, ESP32 and Pico boards show their USB connector, chip, crystal, buttons, LEDs and headers.
- **Smoother zoom:** the mouse wheel and trackpad zoom in small steps, and the zoom buttons animate.

## Checked

- Every breadboard example loads and runs, and every part draws with no errors.
- Lab 13 first-order low-pass filter: cutoff 15.9 kHz, output 0.84 V peak at 10 kHz.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.33.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.33.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
