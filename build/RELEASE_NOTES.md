CEsim Studio 1.8.0 fixes the layout of the circuit code editor.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.8.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.8.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.8.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.8.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.8.0-Linux-amd64.deb` |

## Fixed

- In the circuit code editor, the buttons above the code (Examples, From current design, With layout and Copy code) no longer break onto two lines. In a narrow window, whole buttons move to a second row instead.
- The code side of the editor is a little wider than the preview, so longer lines with positions and wires fit.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.8.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.8.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
