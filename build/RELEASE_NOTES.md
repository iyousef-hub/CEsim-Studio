CEsim Studio 1.36.0 adds pointers and the real ESP32 camera library, a drone that really flies with a flight controller, I2C sensors on the Raspberry Pi, more motors and tools, and easier wiring.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.36.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.36.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.36.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.36.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.36.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.36.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Pointers and structs:** sketches can use pointers (`&`, `*`, `->`, pointer arithmetic, NULL) and `struct`. On 32-bit boards `int` is now 32-bit, as on the real board.
- **ESP32 camera:** the real `esp_camera` library runs on the ESP32-S3 with the 18-pin OV2640 module. `esp_camera_init` checks every pin against the wiring.
- **Flying drone:** the frame now flies with real physics: thrust and torque of each motor, gravity, drag and the ground. It climbs, tilts, drifts, turns and can crash.
- **Flight controller F405:** built-in gyro, Angle and Acro modes, altitude hold, sliders and keyboard sticks, and inputs a board can drive with servo pulses.
- **Raspberry Pi I2C:** Python libraries for the SHT31-D, MLX90640, VL53L0X, MPU6050 and camera (`board`, `busio`, the Adafruit libraries, `mpu6050` and `picamera2`).
- **Motors:** NEMA 17 with A4988 driver, MG996R and FS90R servos, fan, water pump, coin vibration motor and push solenoid.
- **Tools:** oscilloscope, function generator and logic probe. Each new part has a 3D model.
- **Wires:** they move with the part they are attached to, no longer join when they only touch in the air, and a double-click adds a bend.

## Checked

- 504 example programs compile on all 26 boards, and all breadboard and Arduino examples run.
- The esp_camera sketch finds a red ball in a 320 × 240 RGB565 frame; a wrong pin gives a clear message.
- The drone takes off, holds 2.5 m, rolls and turns from the sticks, and an ESP32-S3 flies it through the flight controller.
- The oscilloscope reads 250 Hz and 4 Vpp from the function generator; the NEMA 17 steps; the Pi reads the SHT31-D.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.36.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.36.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
