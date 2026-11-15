CEsim Studio 1.7.0 lets circuit code draw a circuit exactly, with meters and every kind of part.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.7.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.7.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.7.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.7.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.7.0-Linux-amd64.deb` |

## Circuit code: meters, potentiometers and every part

- Ammeters and voltmeters: `AM1 plus minus DC` and `VM1 plus minus DC` (or AC). Their readings show on the drawing while the circuit runs.
- Potentiometers with their position and keyboard key: `POT1 end1 end2 wiper 1k 6% key=A`.
- Any other part from the library: `PART type name nodes… property=value`, so switches, lamps, the 555, logic chips and displays can be written as code too.

## Circuit code: exact drawings

- Place each part with `@ x y`, and turn it with `rot=90`, `rot=180`, `rot=270` and `flip`. Show a different label with `label=Ie`.
- Draw each wire through its corners with `W x1,y1 x2,y2 …`, and add `GND @ x y` and `NET name @ x y`.
- With positions, the circuit is drawn exactly as written. Without wires, the editor draws them for you between the pins of each node.
- The editor checks that the wires join the same pins as the node names, and says which pin is not connected or which nodes touch.
- **From current design** with **With layout** writes any circuit with its positions and wires, so it comes back identical. All ten example circuits were checked this way.
- A new example, **BJT common base, exact layout**, draws the input and output characteristics circuit with Ie, Ic, Vbe and Vcb meters and two potentiometers on keys A and B.
- The prompt for AI chats explains the new parts and the drawing lines, so an answer can follow the layout of the photo.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.7.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.7.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
