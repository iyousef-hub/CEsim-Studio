CEsim Studio 1.32.0 adds Arduino and Raspberry Pi boards, more parts, oscillators and easier drawing.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.32.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.32.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.32.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.32.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.32.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.32.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Arduino boards:** Uno R4, Leonardo, Nano, Nano Every, Nano 33 IoT, Nano 33 BLE, Micro, Pro Mini, MKR WiFi 1010, Mega 2560 and Due on the breadboard, each with its own pins and examples. The Arduino tool can switch between the Uno, Uno R4, Leonardo, Nano, Nano Every, Pro Mini and Mega.
- **Raspberry Pi:** Pi 1 B+, Pi 2 B, Pi 3 B, Pi 3 B+, Pi 4 B, Pi 400, Pi 5, Pi Zero and Pi Zero 2 W with the 40-pin header, running Python with RPi.GPIO and gpiozero. Also the Pico W and Pico 2.
- **More parts:** RGB LED, PIR motion sensor, tilt switch and joystick on the breadboard, and joystick, soil, gas, flex, water, microphone, touch, sound, IR, reed and Hall sensors in the Arduino tool.
- **Drawing:** right-click while drawing a wire to drop a quick part at its end. Start a wire anywhere with W, stretch a wire by its end, and move a segment by dragging it.
- **Selecting:** drag a box to select several parts and wires, then move or delete them together. This works in the circuit, breadboard and PCB tools.
- **Oscillators:** crystal, ceramic resonator, crystal oscillator module, VCO and CD4060 parts. The function generator adds pulse, noise, sweep and arbitrary waves. Nine ready oscillator circuits are under File > Open oscillator example.

## Checked

- All 25 boards run their example program in the simulator.
- The Wien bridge, phase shift, Colpitts, Hartley, relaxation, ring, CD4060 and VCO circuits start and keep oscillating on the scope.
- Every tool opens with no errors.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.32.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.32.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
