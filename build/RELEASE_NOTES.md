CEsim Studio 1.21.0 makes circuit code from AI chats come out exactly like the circuit, adds a sweeping oscilloscope trace and a DOS prompt in the 8086 tool.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.21.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.21.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.21.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.21.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.21.0-Linux-amd64.deb` |

## Circuit code from any AI chat

- **Pin positions in the prompt:** the prompt for AI now lists where every pin of every part sits, how rotation and flip move it, and a worked example with positions and wires, so a chat can put each wire end exactly on its pin.
- **The whole answer can be pasted:** text around the code, ``` fences, list numbers, `//` and `#` comments, bold markers and typographic minus signs are cleaned away. Pasting into the code editor keeps only the code.
- **Wires that are almost right stay:** W lines that end on the wrong pins are left out one by one, and only the connections that are still missing are drawn from the node names. Before, one wrong wire made the whole drawing be redrawn.
- **More ways of writing parts are read:** `SINE(0, 1, 1kHz)`, a source with only `AC 1`, LTspice-style model names such as `D1N4148` and `QBC107BP`, and values with units such as `12V` and `1kΩ`.
- Tested with answers written the way different chats write them (fenced with text around, positions on separate lines, LTspice style, bullets with comments, numbered lines, units): all give the same circuit and the same meter readings.

## New

- **Oscilloscope sweep:** Display → Sweep in the oscilloscope window draws each screen from left to right with a bright beam, like a real oscilloscope, and leaves the last screen dim behind it. It follows the simulation when the screen is slower than the simulation, and replays the latest screen when it is faster. It also shows in recorded videos.
- **DOS prompt in the 8086 tool:** the DOS tab has a drive C: with DIR, CD, MD, RD, TYPE, COPY and COPY CON, DEL, REN, TREE, CLS, ECHO, DATE, TIME, VER, VOL, MEM and batch files. SAVE stores the program in the editor, ASM assembles it to .COM or .EXE, typing the name runs it on the same screen with keyboard input and a command tail, and EDIT opens a file in the editor. The examples are in C:\EXAMPLES.

All automated tests pass, including code round trips for every part type and 37 lab and example circuits, the lab examples, the breadboard and the 8086 tool.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.21.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.21.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
