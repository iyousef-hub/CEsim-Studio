CEsim Studio 1.1.0 adds a circuit code editor, so you can write a circuit as text, or let any AI chat write it for you from a photo.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.1.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.1.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.1.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.1.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.1.0-Linux-amd64.deb` |

## New: Circuit code

- Open it from the Studio, or in the Circuit tool with Tools, Circuit code (Ctrl+K), or the code button in the toolbar.
- The editor opens with a worked example: a non-inverting amplifier with a gain of 2.
- **Copy prompt for AI** copies ready instructions with the example. Paste them into any AI chat together with a photo of your circuit, then paste the answer back into the editor.
- A live preview draws the circuit as you type.
- Errors and warnings point to the exact line: unknown parts, missing values, duplicate names, nodes connected to only one pin, and a missing ground.
- **Build circuit** creates a new design that is ready to simulate.
- **From current design** writes any open circuit back as code, so you can share it or ask about it.
- Five ready examples: amplifier, voltage divider, RC filter, transistor LED switch and bridge rectifier.

## Improvements

- Circuits imported from code, images or `.cir` files are laid out along the signal path, with fewer and shorter wires.
- Comments after `;` on a netlist line are now understood.
- Op-amp lines (`X`) are read from netlists.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.1.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.1.0-Linux-amd64.deb`.

BY. YOUSEF
