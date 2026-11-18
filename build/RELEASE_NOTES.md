CEsim Studio 1.20.0 records videos of running circuits, lets you build your own parts, and adds an LDR and a power LED to the breadboard.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.20.0-arm64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.20.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.20.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.20.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.20.0-Linux-amd64.deb` |

## New

- **Video of a running circuit:** the red record button next to Stop (or F8) records the drawing while the simulation runs, together with any open oscilloscope or instrument screen, and saves it as MP4. The Breadboard tool has a Record button (F8) as well.
- **My parts:** Place → Create a part… builds a new part from a small circuit written in circuit code, with your own name and pins. Check compares the part with its own circuit in a DC test and a 1 kHz sine test, and a part that passes is marked Verified in the component browser and on the drawing. Design files carry the parts they use.
- **LDR light sensor** in the Circuit and Breadboard tools, set from bright (about 1 kOhm) to dark (about 1 MOhm) with the slider, the mouse wheel or the L key.
- **1 W power LED** on the breadboard, and a new example: Night warning light (LDR + 555), blue in daylight and flashing red with the power LED in the dark.
- **DC voltage source as a circle:** the DC source can be drawn as a battery or as a circle with + and −, and the DC_VOLTAGE family uses the circle.

## Fixes

- **Blue, white, green, yellow and UV LEDs** now light in the simulation. Before, their high forward voltage was cut off by the diode model, so they stayed dark.
- **Breadboard LED glow** now has the colour of the LED instead of a dark halo, also in exported pictures.
- **Meters** (voltmeter, ammeter, multimeter, wattmeter) show the right value from the first moment instead of climbing to it.
- **Circuit code:**
  - Positions written on their own lines (`R1 @ 200 100`) are joined to their parts, as some AI chats write them.
  - W lines that do not join the pins the way the nodes say are drawn again from the nodes, with a note, instead of stopping the build.
  - Text notes no longer stop the error check.
  - A setting with spaces in quotes, such as `net="My net"`, is read correctly.
  - A source named MAINS is no longer read back as a voltmeter.
  - The prompt for AI asks for positions on the same line as the part.
- **Automatic wires** keep each ground symbol for its own part of the circuit, and parts wider than usual get room in the automatic layout.

All automated tests pass. Every part type was written as code and read back in four orientations with changed settings, every part type was simulated, and 37 lab and example circuits come back with the same parts, places and wires.

## First launch

- **macOS:** right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.20.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.20.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
