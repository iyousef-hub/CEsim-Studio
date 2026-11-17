CEsim Studio 1.13.0 adds export to .ms14 design files.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.13.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.13.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.13.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.13.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.13.0-Linux-amd64.deb` |

## Export to .ms14

In Circuit, choose **Transfer → Export design (.ms14)…**.

- The drawing is kept: every part sits where it is in CEsim, turned and mirrored the same way, with the same wires, junctions and ground symbols. Labels and meter readings stay upright on turned parts.
- Names and values are kept (R1, Q1, 10 kΩ, BC107BP), and each diode, transistor and chip carries its real SPICE model.
- Settings are kept: source amplitude, frequency and offset, transformer ratio, potentiometer position and key, function generator waveform and levels, and oscilloscope time and volts per division.
- All 22 Workbook labs export this way. Their readings were checked against CEsim, for example Lab 8 (common base): Ie 8.84 mA, Vbe 0.701 V; Lab 11 (adder): 0.2, 0.3, 0.3 and 0.8 mA; Lab 12 (integrator): square wave in, triangle wave out.

Basic logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR) are not exported yet. If a circuit has a part that cannot be exported, the message after saving lists it.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.13.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.13.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
