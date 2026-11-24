CEsim Studio 1.38.0 adds the Software design tool for UML and database diagrams, and a catalog of 592 real parts with their packages, pins and sizes in Breadboard, Circuit, PCB and 3D.

## Downloads

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-1.38.0-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-1.38.0-Intel-x64.dmg` |
| Windows 10 and 11 (64-bit) | `CEsim-Studio-1.38.0-Windows-x64-Setup.exe` (installer) or `CEsim-Studio-1.38.0-Windows-x64-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-1.38.0-Linux-x86_64.AppImage` or `CEsim-Studio-1.38.0-Linux-amd64.deb` |
| Web browser, iPad | https://iyousef-hub.github.io/CEsim-Studio/ |

## New

- **Software design tool:** 18 kinds of diagram in one `.cesoft` file, each on its own tab: all 14 UML diagrams (class, object, component, deployment, package, composite structure, profile, use case, activity, state machine, sequence, communication, timing and interaction overview), entity relationship, data flow, C4 and BPMN.
- **Database diagrams:** one model drawn in Chen, crow's foot, IDEF1X or as relational tables. Columns have types, primary and foreign keys, not null, unique and auto number.
- **SQL both ways:** writes the schema for MySQL, PostgreSQL, SQLite, SQL Server and Oracle, with a joining table for every many-to-many relationship, and reads CREATE TABLE and ALTER TABLE scripts back into a diagram.
- **Code both ways:** a class diagram becomes Java, C#, C++, Python or TypeScript, and classes written in these languages become a class diagram.
- **Sequence diagrams:** activation bars, alt, opt, loop, par and other fragments, numbered messages (in the label or in black circles), lifeline heads at the top and bottom, and a lavender look. A booking platform example is included.
- **Check:** finds tables without a primary key, broken foreign keys, columns that break first normal form, inheritance loops, data flows without a process, unreachable states and missing start or end events.
- **Parts catalog:** 592 parts in six groups: passive components, discretes and protection, analog and mixed-signal ICs, logic, timing and memory, processors and boards, and packages from DIP to BGA.
- **Breadboard:** every catalog part can be placed. Parts with a standard pin layout sit on the breadboard; larger ones sit beside it on their own board with labelled pins.
- **Circuit:** every catalog part is in the component browser with its package and size. Parts with a model (resistors, capacitors, diodes, transistors, op-amps, gates, timers) simulate; the others are drawn with all their pins for wiring.
- **PCB:** a footprint for every catalog part, built from its real package, with a search box and groups in the parts list.
- **3D:** a model for every catalog part, built from its package size: DIP, SOIC, QFP, QFN, BGA, PGA, TO-92, TO-220, TO-247, SOT, chip parts, axial and radial parts, crystals, relays, transformers and modules.

## Checked

- All 18 diagram types build their example, draw in every notation and pass the check.
- The example database writes SQL in all five dialects and every script reads back into the same tables and relationships.
- The example class diagram writes code in all five languages and every file reads back into the same classes.
- All 592 catalog parts are placed on the breadboard, drawn in Circuit and written to a SPICE netlist, given a PCB footprint and a Gerber export, and built in 3D without an error.

## First launch

- **macOS:** choose the arm64 file for Apple Silicon (M1 and later) and the Intel-x64 file for Intel Macs. Right-click the app, choose Open, then Open again. If macOS says the app is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once in Terminal.
- **Windows:** if SmartScreen appears, choose More info, then Run anyway. The installer does not need administrator rights.
- **Linux:** make the AppImage executable with `chmod +x CEsim-Studio-1.38.0-Linux-x86_64.AppImage` and run it, or install the package with `sudo apt install ./CEsim-Studio-1.38.0-Linux-amd64.deb`.

BY. YOUSEF A.ALGHAMDI
