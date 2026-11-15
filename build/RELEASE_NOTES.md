CEsim Studio 1.2.0 adds two tools for digital design: Logic and Boolean tools. It also adds an About page to the Studio.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.2.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.2.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.2.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.2.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.2.0-Linux-amd64.deb` |

## New: Logic

- Build digital circuits with input and output pins, constants, clocks, buttons, LEDs and probes.
- Gates: AND, OR, NOT, NAND, NOR, XOR, XNOR, buffer and tri-state buffer, with 2 to 16 inputs.
- Multiplexers, demultiplexers, decoders and a priority encoder.
- Adder, subtractor, comparator, half adder and full adder.
- D, T, JK and SR flip-flops, an SR latch, registers and counters.
- Hex digit display and 7-segment display.
- Single wires and multi-bit buses, with tunnels and splitters.
- Live simulation. Wire colours show 1, 0, not connected and conflict, and bit-width mismatches are flagged.
- Run clock, Step and Reset, and a timing diagram that records inputs, clocks, outputs and probes.
- Truth table for any circuit, with copy as CSV and sending to Boolean tools.
- Opens `.circ` files from other logic simulators: pins, tunnels, constants, clocks, gates, multiplexers, decoders, adders, flip-flops, registers, counters, displays and text.
- Saves `.cedig`, exports PNG and SVG, with undo and redo, copy and paste, and rotation.
- Examples: half adder, SR latch, 4-bit counter with display, ripple counter and 2-to-1 multiplexer.

## New: Boolean tools

- Truth table with up to 6 inputs and 4 outputs, where clicking an output switches it between 0, 1 and don't care.
- Enter a function as an expression (`A'B + AC`, `~A & B`, `A^B`) or as minterms (`Σm(1,3,5) + d(0,2)`).
- K-maps for 1 to 6 variables, with the groups of the minimal result drawn on the map.
- Minimal SOP and POS (Quine-McCluskey), and the canonical forms Σm and ΠM.
- Copy the results as text or as code.
- Build circuit in Logic draws every output with AND, OR and NOT gates.
- State machine designer for Moore and Mealy machines, with binary, Gray or one-hot encoding and D, T or JK flip-flops. It shows the state diagram, the state assignment and the flip-flop and output equations, and builds the machine with D flip-flops and a clock.

## Also new

- An About page in the Studio, with the project's purpose and the author's contact details.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.2.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.2.0-Linux-amd64.deb`.

BY. YOUSEF
