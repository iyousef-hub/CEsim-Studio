CEsim Studio 1.3.0 adds two tools for programming: an 8086 assembler and emulator, and an Arduino simulator.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.3.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.3.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.3.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.3.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.3.0-Linux-amd64.deb` |

## New: 8086

- A two-pass assembler that produces real 8086 machine code, shown line by line in the Listing tab.
- Programs with `org 100h` (one segment) or with `.model small`, `.stack`, `.data` and `.code`. `SEGMENT` / `ENDS`, `PROC` / `ENDP`, `.startup` and `.exit` also work.
- Data with `DB`, `DW` and `DD`, strings, `DUP`, `EQU`, `$`, `OFFSET`, `TYPE`, `LENGTH`, `SIZE`, `BYTE PTR` and `WORD PTR`, and every 8086 addressing mode.
- All common instructions: data transfer, arithmetic, logic, shifts and rotates, jumps, loops, calls, string instructions with `REP`, BCD adjustment, `IN` and `OUT`.
- Run, pause, step, step over a `CALL`, and step back through the whole run. Breakpoints by clicking a line number.
- Registers with their high and low bytes, flags, the stack, a memory view, and the program's variables, with values that changed highlighted. Registers, flags and memory can be edited.
- A console for DOS and BIOS services: INT 21h (read a key, print a character or a string, read a line, date and time, end the program), INT 10h, INT 16h, INT 20h and INT 3, and your own interrupt handlers.
- Virtual devices on the ports: 8 LEDs, a 7-segment digit, a two-digit hex display, 8 switches and a push button.
- Clear error messages that point to the line, for example for mismatched operand sizes, memory-to-memory moves, or conditional jumps that are out of range. Runtime errors explain divide by zero, a missing end of program, or running into data.
- Saves `.asm` files and single-segment programs as `.COM` files.
- Nine examples, from Hello world to bubble sort, recursion, keyboard input and ports.

## New: Arduino

- Runs Arduino sketches on a virtual Uno in real time, with speeds from 0.1x to 5x. `delay()` and `millis()` follow the simulated clock, and numbers behave like on the real board (`int` is 16-bit).
- Parts: LED, RGB LED, push button, slide switch, potentiometer, light sensor, LM35 temperature sensor, HC-SR04 ultrasonic sensor, PIR motion sensor, servo motor, buzzer with sound, and a 16x2 LCD (LiquidCrystal and LiquidCrystal_I2C).
- A new sketch gets parts automatically for the pins it uses. Pins can be changed for every part.
- Serial Monitor with sending text and line endings, Serial Plotter, and live global variables.
- The board shows the state of every pin, the L, TX and RX lights, and has a working reset button.
- Supports `pinMode`, `digitalWrite`, `digitalRead`, `analogRead`, `analogWrite` (PWM), `tone`, `pulseIn`, `attachInterrupt`, `map`, `constrain`, `random`, the `String` class, arrays, functions, `#define`, `enum`, `static` and more.
- Errors point to the line and explain the fix, with notes for common mistakes such as a missing `Serial.begin()`, a button pin without `INPUT_PULLUP`, `analogWrite()` on a pin without PWM, or an array index out of range.
- Saves `.ino` files that still open in the Arduino IDE. The parts list is kept as a comment on the last line.
- Thirteen examples, including traffic light, button, fade, potentiometer, temperature, night lamp, servo, ultrasonic distance, LCD, Serial commands, interrupts and RGB colours.

## Also new

- `.asm` and `.ino` files can be opened with CEsim Studio from the file manager on every system.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.3.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.3.0-Linux-amd64.deb`.

BY. YOUSEF
