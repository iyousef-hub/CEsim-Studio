# CEsim Studio

**Circuits, breadboards, PCB and VLSI layout, digital logic, Verilog, MIPS and RISC-V, 8086 assembly, Arduino, diagrams and 3D in one desktop app.**
BY. YOUSEF A.ALGHAMDI

CEsim Studio is a launcher that opens several tools, each in its own window:

| Tool | What it does | Files |
|---|---|---|
| **Circuit** | Schematic capture with live simulation, a large parts library and instruments (multimeter, oscilloscope, function generator, probes, meters). Text notes, net labels, title block, export to PNG / JPG / WebP / SVG / PDF, BOM and node-voltage CSV. | `.cesim` · `.cir` |
| **Circuit code** | Write a circuit as text (SPICE style) with a live preview and error checks. Copy the built-in prompt into any AI chat with a photo of your circuit, paste the answer back, and build it in one click. | `.cir` · text |
| **Circuit from image** | Turns a photo or screenshot of a schematic into an editable circuit, using a vision model that runs on your own computer with [Ollama](https://ollama.com). Nothing is uploaded. | `.png` · `.jpg` · paste |
| **Breadboard** | A real-looking breadboard with resistors, LEDs, buttons, switches, potentiometers, capacitors, diodes, transistors, 74LS logic chips, a 555 timer, a 7-segment display, batteries and meters. The circuit runs live: LEDs glow with their current, too much current burns them, and every hole shows its voltage. Opens the circuit as a schematic or as a PCB. | `.cebb` |
| **PCB** | Two-layer board layout from a netlist: footprints, ratsnest, tracks at 90° and 45°, vias, an autorouter, a design-rule check, and a finished-board view. Exports Gerber RS-274X and Excellon drill files in one .zip for board makers. | `.cepcb` · Gerber · Excellon |
| **VLSI** | CMOS layout on a λ grid: n-well, diffusion, poly, two metals, contacts and vias. Design-rule check, transistor and wire extraction, a truth table that names the gate, logic values on the wires, and a cross-section. Exports GDSII, CIF and a SPICE netlist. | `.cevlsi` · GDSII · CIF |
| **Logic** | Digital circuits with gates, multiplexers, decoders, adders, flip-flops, registers, counters and displays, on single wires or multi-bit buses. Live simulation, clock, timing diagram and truth table. Opens `.circ` files. | `.cedig` · `.circ` |
| **Boolean tools** | Truth tables, K-maps with groups, minimal SOP and POS, canonical forms, and a state machine (FSM) designer that writes the flip-flop equations. Builds any result as a circuit in Logic. | |
| **Architecture** | MIPS and RISC-V (RV32IM) assembler and simulator. Every step lights up the single-cycle datapath with its values and control signals, and the Pipeline tab places the program in a 5-stage pipeline with stalls, forwarding and flushes. | `.s` · `.asm` |
| **Verilog** | Verilog modules and testbenches on a 4-state event-driven simulator, with a waveform viewer, VCD import and export, and a testbench writer. | `.v` · `.vcd` |
| **8086** | Assembler and emulator for the 8086. Step forward and back, breakpoints, registers and flags, memory, stack, variables, machine-code listing, a DOS console (INT 21h, 10h, 16h) and virtual ports with LEDs, a 7-segment display and switches. Saves `.COM` programs. | `.asm` · `.com` |
| **Arduino** | Runs Arduino sketches on a virtual Uno in real time: LEDs, RGB LED, buttons, switches, potentiometer, light, temperature, ultrasonic and motion sensors, servo, buzzer and a 16×2 LCD. Serial Monitor, Serial Plotter and live variables. | `.ino` |
| **Diagram** | Flowcharts, state machines, datapaths and networks with smart connectors, auto layout, text-to-diagram, minimap and find. | `.cediag` · `.drawio` · `.mmd` |
| **3D** | Millimetre-accurate modelling with holes, groups, arrays, shells, a board library and enclosure maker. Adjustable zoom / rotate / pan speed. | `.ce3d` · `.stl` · `.obj` · `.3mf` · `.glb` |

The Studio window has five themes and eight accent colours (plus a custom colour).

## Download

Get the latest build from the **Releases** page:

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-<version>-arm64.dmg` |
| Windows 10/11 (64-bit) | `CEsim-Studio-<version>-Windows-x64-Setup.exe` (installer) or `…-Portable.zip` |
| Linux (64-bit) | `CEsim-Studio-<version>-Linux-x86_64.AppImage` or `…-Linux-amd64.deb` |

**First launch**

- **macOS:** the app is not notarized. Right-click the app, choose **Open**, then **Open**. If macOS says it is damaged, run `xattr -cr "/Applications/CEsim Studio.app"` once.
- **Windows:** SmartScreen may show "Windows protected your PC". Choose **More info**, then **Run anyway**. The installer needs no administrator rights.
- **Linux (AppImage):** `chmod +x CEsim-Studio-*.AppImage` then run it. **(.deb):** `sudo apt install ./CEsim-Studio-*.deb`.

## Circuit code

Open it from the Studio, or in the Circuit tool with **Tools → Circuit code** (Ctrl+K).

1. Press **Copy prompt for AI** and paste it into any AI chat together with a photo of your circuit.
2. Paste the chat's answer into the editor. The preview and the error list update as you type.
3. Press **Build circuit**, then **Run**.

The editor opens with a worked example, and **From current design** writes any open circuit back as code.

```
* Non-inverting amplifier, gain = 2
V1   vin  0    SIN(0 1 1k)
R1   inv  0    1k
R2   inv  out  1k
XU1  vin  inv  out vcc vee uA741
VCC  vcc  0    DC 15
VEE  0    vee  DC 15
.end
```

## Logic and Boolean tools

- In **Logic**, click a part on the left and click on the sheet to place it, drag from a pin to draw a wire, and click an input pin to switch it. Run clock drives every clock, and the timing diagram records the signals.
- **Truth table** lists every input combination and can send it to Boolean tools.
- In **Boolean tools**, type an expression (`A'B + AC`), minterms (`Σm(1,3,5) + d(0,2)`), or click the truth table. The K-map shows the groups of the minimal result. **Build circuit in Logic** draws it with AND, OR and NOT gates.
- The **State machine** tab turns a state table into a state diagram, a state assignment and the flip-flop equations, and can build the whole machine with D flip-flops.

## Verilog

- Write the design and its testbench in one file and press **F5**. The waveform shows the testbench signals; tick inner signals on the right. `$display` and `$monitor` print in the Console.
- **Testbench…** writes a testbench for any module: every input combination for small combinational modules, or a clock, a reset and random inputs for sequential ones.
- The simulator follows the Verilog standard for widths, signs, x and z, blocking and non-blocking assignments and `$random`, and gives the same output as other simulators on the examples.
- File → Export waveform as VCD or PNG. `.vcd` files from other tools open in the viewer.

## Breadboard

- Drag parts from the left onto the board. The five holes of each column are connected, and so is each power rail; hover a hole to see which holes it joins.
- Press **W** to draw wires, **R** to rotate, and **F5** to run. While it runs you can press buttons, slide switches and turn knobs with the mouse wheel.
- Problems explain what went wrong: an LED without a resistor, a short circuit, a chip without power, or a leg that is not in a hole.
- **Open in Circuit** turns the board into a schematic, and **Open in PCB** turns it into a printed circuit board.

## PCB

- Start from an example, from the Breadboard or the Circuit tool (*Transfer → Send to PCB*), or write a netlist in **Netlist**.
- Move parts, then press **X** to draw tracks from pad to pad. **V** adds a via and continues on the other layer, **L** switches layers. A track cannot end on a pad of another net.
- **Autoroute** routes what is left, **Check (DRC)** lists every broken rule, and **Real view** shows the finished board from the top and the bottom.
- **Export Gerber** saves the copper, solder mask, silkscreen, outline and drill files in one .zip, ready for a board maker.

## VLSI

- Choose a layer (keys 1 to 6) and drag to paint. **C** places a contact, **U** a via, **T** names a wire. Poly crossing diffusion makes a transistor.
- Name the power wires VDD and GND and the inputs and outputs: the truth table appears and names the gate, and **Simulate** colours each wire by its value.
- The Check list shows the design rules that are broken, and **Cross-section** (**K**) shows the chip cut along a row.
- Exports GDSII and CIF layouts and a SPICE netlist of the extracted transistors.

## Architecture

- Choose **MIPS** or **RISC-V**, open an example, and press **F8** to step. The datapath shows the instruction that just ran: blue parts and wires carry data, orange lines are control signals, and the boxes show the values.
- The **Pipeline** tab shows each instruction in the IF, ID, EX, MEM and WB stages, with load-use stalls, forwarding and branch flushes, and the CPI. Untick Forwarding to compare.
- Supports the usual pseudo-instructions and system calls (print, read, exit), and shows the machine code of every instruction in hex and binary.

## 8086

- Write a program with `org 100h` (one segment) or with `.model small`, `.data` and `.code`. The **Examples** menu has nine programs to start from.
- **F9** assembles, **F5** runs or pauses, **F8** runs one instruction, **F10** runs a whole `CALL`, **F7** steps back. Click a line number to set a breakpoint.
- Registers, flags and memory bytes can be changed by clicking them. Values that changed in the last step are highlighted.
- Error messages point to the line and explain the fix, for example when operand sizes do not match or a conditional jump is out of range.
- **Reference** lists the supported instructions, directives, interrupts and ports.

## Arduino

- Open an example, press **F5**, and use the parts on the right: press buttons, turn the potentiometer, change the light, temperature or distance.
- A new sketch gets parts automatically for the pins it uses. Add or remove parts with **+ Add part** and choose their pins.
- Time is simulated, so `delay()` and `millis()` behave like on a real board, and `int` is 16-bit like on the Uno.
- When a sketch is saved, the parts list is kept as a comment on its last line, so the file still opens in the Arduino IDE.

## Circuit from image

1. Install Ollama from [ollama.com](https://ollama.com) and open it.
2. In CEsim Studio choose **Circuit from image** (or *Circuit → Tools → Circuit from image*).
3. The first time, choose **Download qwen2.5vl:7b** (about 6 GB, once).
4. Drop, choose or paste an image, press **Read circuit**, check the netlist, then **Import as new design**.

Small local models can confuse crossing wires with connected wires, so always check the result before simulating. Clear screenshots work best.

## Build from source

Requirements: Node.js 20+.

```sh
npm install
npm start                 # run the app
npm run build:3d          # rebuild app/lib/3d.bundle.js from src3d/
npm run pack:mac          # out/CEsim Studio-darwin-arm64
npm run pack:win          # out/CEsim Studio-win32-x64
npm run pack:linux        # out/CEsim Studio-linux-x64
```

Installers:

- **Windows:** `makensis build/windows/installer.nsi` → `dist/…-Setup.exe` (NSIS 3).
- **Linux:** `sh build/linux/package.sh` → `dist/*.deb` and `dist/*.AppImage` (needs `dpkg-deb` and `appimagetool`).
- **macOS:** see `build/macos/README.md`.

## Project layout

```
app/            Electron app (studio.html launcher, circuit, bb, pcb, vlsi, logic, bool, hdl, arch, asm, ino, diagram and 3d tools, main.js, preload.js)
app/lib/        Bundled libraries (3D bundle, canvas2svg)
app/fonts/      IBM Plex fonts (SIL Open Font License)
src3d/          Source of the 3D tool bundle (three.js, three-bvh-csg)
build/          Packaging scripts for macOS, Windows and Linux
assets/         App icons
```

## Third-party software

Electron, three.js, three-bvh-csg and three-mesh-bvh (MIT), canvas2svg (MIT, see `app/lib/canvas2svg-LICENSE.txt`), IBM Plex fonts (SIL OFL 1.1).

---

### بالعربي

**CEsim Studio** برنامج سطح مكتب فيه محاكي دوائر، ولوحة تجارب Breadboard تشتغل مباشرة، وتصميم لوحات PCB مع تصدير ملفات التصنيع، وتصميم شرائح VLSI بترانزستورات CMOS، ومحاكي دوائر رقمية وأدوات الجبر البولياني، ومحاكي Verilog مع عارض الإشارات، ومحاكي معمارية MIPS وRISC-V مع مسار البيانات والـ Pipeline، ومحاكي 8086 بلغة التجميع، ومحاكي Arduino بقطع افتراضية، وأداة رسم مخططات، وتصميم ثلاثي الأبعاد بقياسات حقيقية، وأداة تحول صورة الدائرة إلى دائرة قابلة للمحاكاة عن طريق ذكاء اصطناعي يشتغل على جهازك (Ollama).
النسخ متوفرة للماك (Apple Silicon) والويندوز واللينكس من صفحة **Releases**.

BY. YOUSEF A.ALGHAMDI
