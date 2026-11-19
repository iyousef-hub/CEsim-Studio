CEsim Studio 1.29.0 brings the ESP32 and the Raspberry Pi Pico to the breadboard, with motors, displays, sensors and sound.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.29.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.29.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.29.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.29.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.29.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.29.0-Linux-amd64.deb` |

## New boards

- **ESP32 DevKit** and **Raspberry Pi Pico** next to the Uno. They work at 3.3 V, read analog inputs as 0 to 4095, and give PWM with analogWrite on any output pin. The sketch uses the board's own pin numbers; A0, LED_BUILTIN, SDA and SCL are set for each board, and the on-board LED follows LED_BUILTIN.

## New modules

- **DC motor:** spins on the screen with its speed in rpm; its back EMF lowers the current as it speeds up.
- **Servo (SG90):** follows the Servo library (attach, write) and turns smoothly to the angle.
- **Stepper 28BYJ-48 with ULN2003 driver:** the four driver LEDs show the coils, and the shaft turns one half step per change of pattern (4096 per turn).
- **Relay module:** IN high joins COM to NO, low joins COM to NC; it clicks when it switches.
- **LCD 16×2 with I2C backpack:** shows what LiquidCrystal_I2C prints, with the backlight.
- **OLED 128×64 (I2C):** the Adafruit_SSD1306 library with text in sizes 1 and up, pixels, lines, rectangles, circles and triangles; the screen changes when the sketch calls display().
- **HC-SR04 distance sensor:** set the distance with a slider; the sketch reads it with pulseIn.
- **Temperature sensor:** LM35 (10 mV per °C) or TMP36 (for 3.3 V boards), set with a slider.
- **Buzzer:** active or passive. With the new Sound button it plays its tone, including tone() melodies.

Every board has sketch examples for each module, written for its own pins. The displays check that SDA and SCL go to the board's I2C pins and say which pins to use if they do not.

## Checked

- An Uno sweeps a servo, writes to an I2C LCD, reads 123 cm from the distance sensor and 37 °C from an LM35, steps the stepper and switches the relay while a buzzer plays 440 Hz.
- An ESP32 draws text and shapes on the OLED; a Pico reads 20 °C from a TMP36; a DC motor on 3.3 V turns at about 6100 rpm.
- All automated tests pass, including the breadboard, the Arduino tool, the circuit tool and code round trips.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.29.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.29.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
