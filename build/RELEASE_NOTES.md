CEsim Studio 1.10.0 adds the BC107 transistor family and makes the common base lab circuit match the lab handout.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.10.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.10.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.10.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.10.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.10.0-Linux-amd64.deb` |

## Transistors

- New models: BC107BP, BC107B, BC107A and BC107.
- The example "BJT common base, exact layout (Lab 8)" now uses the BC107BP. With POT1 at 6% and POT2 at 0% it reads Ie = 8.848 mA, Ic = 8.818 mA, Vbe = 0.701 V and Vcb = 1.1 µV, against 8.839 mA, 8.809 mA, 0.701 V and 1.119 µV in the lab handout.

## Circuit code

- A transistor model that is not in the library now gives a warning in the code editor. Before, it was replaced by the 2N2222A without a message.
- The prompt for AI asks for the drawing lines (positions and wires) whenever a picture is sent, so the circuit is drawn like the picture.

## Fixed

- A potentiometer turned fully to one end now has almost no resistance at that end (0.1 mΩ instead of 0.5 Ω), so meters across it read close to zero.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.10.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.10.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
