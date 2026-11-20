CEsim Studio 1.35.0 adds the ESP32-S3 board, new sensors, drone parts and more motors to the Breadboard, each with a 3D model.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.35.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.35.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.35.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.35.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.35.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.35.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **ESP32-S3 DevKitC-1:** a new board with both 22-pin headers, the RGB LED on GPIO 48, I2C on GPIO 8 and 9 and 20 analog inputs.
- **Sensors:** SHT31-D temperature and humidity, MLX90640 thermal camera (32 × 24), VL53L0X LiDAR, OV2640 RGB camera, MPU6050 gyro and accelerometer, MAX4466 microphone, piezo disc and SW-420 vibration sensor. Each has its library in the sketch and an example on every board.
- **Drone parts:** brushless motors from 0802 to 4114 with their props, ESCs from 6 to 60 A, LiPo batteries from 1S to 6S and six frames from Tiny Whoop to X8 octocopter. The ESC arms on 1000 µs and runs from the Servo library; the motors show rpm, thrust and current, and the frame lifts off when the thrust beats the weight.
- **Motors:** the DC motor can be a 130, TT gear motor, N20 gear motor, coreless 8520, 370 or 775 motor, and the new L298N driver runs two motors with direction and speed.
- **3D models:** every new part is in the 3D tool at its real size, and the Boards and modules list has a search box and groups.
- **Warnings:** swapped SDA and SCL, an ESC that is not armed, a LiPo that is nearly empty or overloaded, and a motor on too many cells.

## Checked

- Every new sensor reads its value on the ESP32-S3, and every example on every board compiles (360 sketches).
- The ESC arms and spins a 2306 motor from a 4S LiPo, and swapping two motor wires reverses it.
- The L298N drives a TT motor both ways, and the piezo and vibration examples detect a knock and shaking.
- Every tool opens with no errors, and all 26 boards compile their blink program.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.35.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.35.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
