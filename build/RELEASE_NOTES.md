CEsim Studio 1.4.0 adds two tools: Verilog, and Architecture for MIPS and RISC-V.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.4.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.4.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.4.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.4.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.4.0-Linux-amd64.deb` |

## New: Verilog

- A 4-state (0, 1, x, z) event-driven simulator for Verilog modules and testbenches.
- Modules with parameters, hierarchy, ports by name or position, vectors, signed values, memories and gate primitives.
- `assign`, `always @(*)`, `always @(posedge clk or negedge rst_n)`, `initial`, blocking and non-blocking assignments, `#` delays, `@` events, `wait`, `if`, `case`, `casez`, `casex`, loops, functions and tasks.
- All operators with the width and sign rules of the standard. Tested against another simulator on 144,000 random expressions with identical results.
- `$display`, `$write`, `$monitor`, `$strobe`, `$finish`, `$time`, `$random` (the same sequence as other simulators), `$signed`, `$unsigned` and `$clog2`.
- A waveform viewer with zoom, scroll, a cursor that snaps to edges and jumps between them, values at the cursor, and hex, binary, decimal, signed or text format for each bus. Inner signals can be added from the hierarchy.
- Export the waveform as VCD or PNG, and open VCD files from other tools.
- A testbench writer: every input combination for small combinational modules, or a clock, a reset and random inputs for sequential ones.
- Errors point to the line and explain the fix, for example a reg driven by assign, a wire set inside always, a missing semicolon, or an always block that never waits.
- Twelve examples, from a half adder to an ALU, a register file and two state machines.

## New: Architecture (MIPS and RISC-V)

- Assemblers for MIPS32 and RV32IM that produce real machine code, with the usual pseudo-instructions and data directives. Checked against a reference assembler on 3,000 instructions.
- A simulator that matches a reference CPU emulator on 600 random programs, with system calls to print, read numbers and text, and exit.
- The single-cycle datapath lights up for every step: the parts and wires the instruction uses, the values on them, the instruction fields and the control signals.
- A 5-stage pipeline view with load-use stalls, forwarding paths and branch flushes, and the CPI, with forwarding on or off.
- Registers, data memory and stack, step back, breakpoints, run at several speeds, and the machine code of every instruction in hex and binary. Machine code can be saved as a .hex file for a Verilog memory.
- Clear errors, for example for values out of range, MIPS registers in a RISC-V program, overflow in `add`, or unaligned memory access.
- Seven examples for each instruction set.

## Also new

- The About page and the app information show the author's full name.
- `.v`, `.vcd` and `.s` files can be opened with CEsim Studio from the file manager. `.asm` files written for MIPS open in Architecture, other `.asm` files open in 8086.
- The open tools save their work when the window is closed.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.4.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.4.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
