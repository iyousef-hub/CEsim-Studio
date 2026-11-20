CEsim Studio 1.34.0 adds more instruments and parts to the Multisim (.ms14) export.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.34.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.34.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.34.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.34.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.34.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.34.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Bode plotter in .ms14:** circuits with the Bode plotter now keep it when saved as .ms14, connected to IN and OUT with the same frequency range. Lab 13 opens with the Bode plotter ready to run.
- **More instruments in .ms14:** the logic analyzer and the word generator are now saved and opened in .ms14 files.
- **More parts in .ms14:** the CD4060 counter and the quartz crystal are now saved and opened in .ms14 files.
- **Clearer layout in .ms14:** circuits with instruments are placed lower on the sheet so the instruments sit inside the page.

## Checked

- Lab 13 saved as .ms14 opens in Multisim 14 with the Bode plotter connected, and the simulation draws the low-pass curve from 100 Hz to 1 MHz.
- The logic analyzer, word generator, CD4060 and crystal open in Multisim 14 from a .ms14 file.
- Every tool opens with no errors, and all 25 boards compile their blink program.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.34.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.34.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
