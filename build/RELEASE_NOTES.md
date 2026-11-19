CEsim Studio 1.30.0 runs in a web browser and on an iPad with touch and pen, shares designs as links, and merges the changes of classmates.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.30.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.30.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.30.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.30.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.30.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.30.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Web version:** every tool also runs in a web browser at https://iyousef-hub.github.io/CEsim-Studio/ with nothing to install. It is published from the same files on every update. On an iPad, Share → Add to Home Screen gives it its own icon and a full screen.
- **Touch and pen:** in the Circuit and Breadboard tools, one finger or the pen works like the mouse, two fingers pan and pinch to zoom, and in the Circuit tool a long press or a double tap opens a part's properties.
- **Share link:** File → Share link copies a link that carries the whole circuit or breadboard. Whoever opens it gets a copy in a web browser; File → Open a share link opens one inside the app.
- **Merge changes from a copy:** when classmates each work on a copy of the same design, File → Merge changes from a copy lists the parts and wires one of them added, changed or removed. Tick what to bring in; Ctrl+Z undoes the merge, and the design is saved in the version history first.

## Checked

- A 555 design becomes a 758-character link and opens again with all its parts; a breadboard with an Uno becomes a 442-character link.
- A one-finger drag moves a part, and a two-finger spread doubles the zoom.
- All automated tests pass, including the circuit and breadboard tools, code round trips and the lab examples.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.30.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.30.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
