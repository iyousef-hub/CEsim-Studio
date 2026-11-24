CEsim Studio 1.39.0 adds four new sensors with real simulation, gives the MLX90640 its full part number, and makes the Software design tool easier to work in.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.39.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.39.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.39.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.39.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.39.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.39.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **SLAMTEC RPLIDAR S2:** a 360° laser scanner on a serial port at 1 000 000 baud. It scans a room you set (size, its own place, and a post at any distance and direction) and draws what it sees next to it. Arduino library `RPLidar` (startScan, waitPoint, getCurrentPoint) and, on the Raspberry Pi, the Python `rplidar` module (get_info, get_health, iter_scans).
- **INMP441 I2S microphone:** a digital MEMS microphone that sends 24-bit samples over I2S. On the ESP32 it is read with `ESP_I2S` (setPins, begin, read). The tool warns when the pins in the sketch do not match the wires.
- **IIS3DWB vibration sensor:** a 3-axis accelerometer for machines, on SPI. Mount it on a shaker, a motor, a motor out of balance or one with a worn bearing. Arduino library `IIS3DWBSensor` (begin, Enable_X, Set_X_FS, Get_X_Axes) and, on the Raspberry Pi, its registers through `spidev`.
- **Raspberry Pi Camera Module 3:** plugs into the camera connector of a Raspberry Pi with its ribbon, so it needs no breadboard wires. `picamera2` gains autofocus_cycle, set_controls (AfMode, LensPosition), capture_metadata and camera_properties; out of focus, the picture blurs.
- **MLX90640-ESF-BAB:** the thermal camera now carries its full part number, with a choice of the 110° (BAB) or 55° (BAA) lens.
- Each new part has a 3D model at its real size, example sketches for Arduino, ESP32 and Raspberry Pi, and a place in the System model.
- **Software design, on the page:** double-click (or F2) a shape or line to type its text where it is, right-click for actions, and use the + buttons of a selected shape to add a joined shape.
- **Software design, editing:** class attributes and operations are edited as rows with visibility, name, type, parameters, static and abstract.
- **Software design, look:** three styles (Colour, Classic and Print), a search box in the parts list, an icon toolbar, a status bar with zoom, grid and snap, and a list of keyboard shortcuts (press ?).

## Checked

- The RPLIDAR, IIS3DWB and INMP441 example sketches run on the ESP32 and print scans, vibration levels and sound levels. On an Uno, the RPLIDAR gives a warning that the board has no second serial port.
- The RPLIDAR, Camera Module 3 and IIS3DWB Python examples run on the Raspberry Pi.
- All breadboard examples, the 592 catalog parts in Breadboard, Circuit and PCB, and all 18 Software design diagram types still pass.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.39.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.39.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
