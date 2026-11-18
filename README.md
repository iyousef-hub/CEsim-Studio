# CEsim Studio

**Circuits, breadboards, PCB and VLSI layout, digital logic, Verilog, MIPS and RISC-V, 8086 assembly, Arduino, diagrams and 3D in one desktop app.**
BY. YOUSEF A.ALGHAMDI

CEsim Studio is a launcher that opens several tools, each in its own window:

| Tool | What it does | Files |
|---|---|---|
| **Circuit** | Schematic capture with live simulation, a large parts library (diodes, zeners, LEDs, BJTs, MOSFETs, JFETs, SCR, TRIAC, DIAC, optocouplers, op-amps, regulators, 56 74xx and 4000 logic chips, and more) and instruments (multimeter, oscilloscope, function generator, probes, meters). Text notes, net labels, title block, export to PNG / JPG / WebP / SVG / PDF, BOM and node-voltage CSV. Export to `.ms14` design files. Records a video of the running circuit, and builds your own parts from a small circuit (My parts, each checked and marked Verified). | `.cesim` · `.cir` · `.ms14` · `.mp4` |
| **Circuit code** | Write a circuit as text (SPICE style) with a live preview and error checks. Copy the built-in prompt into any AI chat with a photo of your circuit, paste the answer back, and build it in one click. | `.cir` · text |
| **Circuit from image** | Turns a photo or screenshot of a schematic into an editable circuit, using a vision model that runs on your own computer with [Ollama](https://ollama.com). Nothing is uploaded. | `.png` · `.jpg` · paste |
| **Breadboard** | A real-looking breadboard with resistors, LEDs, a 1 W power LED, an LDR light sensor, buttons, switches, potentiometers, capacitors, diodes, transistors, 74LS logic chips, a 555 timer, a 7-segment display, batteries and meters. The circuit runs live: LEDs glow with their current, too much current burns them, and every hole shows its voltage. Records a video of the running board. Opens the circuit as a schematic or as a PCB. | `.cebb` · `.mp4` |
| **PCB** | Two-layer board layout from a netlist: footprints, ratsnest, tracks at 90° and 45°, vias, an autorouter, a design-rule check, and a finished-board view. Exports Gerber RS-274X and Excellon drill files in one .zip for board makers. | `.cepcb` · Gerber · Excellon |
| **VLSI** | CMOS layout on a λ grid: n-well, diffusion, poly, three metals, contacts and vias. Design-rule check, transistor and wire extraction, a truth table that names the gate, logic values on the wires, and a cross-section. Exports GDSII, CIF, a SPICE netlist, a `.MSK` layout and a `.sch` transistor schematic; opens `.MSK`. | `.cevlsi` · `.MSK` · `.sch` · GDSII · CIF |
| **Logic** | Digital circuits with gates, multiplexers, decoders, adders, flip-flops, registers, counters and displays, on single wires or multi-bit buses. Live simulation, clock, timing diagram and truth table. Opens `.circ` files. | `.cedig` · `.circ` |
| **Boolean tools** | Truth tables, K-maps with groups, minimal SOP and POS, canonical forms, and a state machine (FSM) designer that writes the flip-flop equations. Builds any result as a circuit in Logic. | |
| **Architecture** | MIPS and RISC-V (RV32IM) assembler and simulator. Every step lights up the single-cycle datapath with its values and control signals, and the Pipeline tab places the program in a 5-stage pipeline with stalls, forwarding and flushes. | `.s` · `.asm` |
| **Verilog** | Verilog modules and testbenches on a 4-state event-driven simulator, with a waveform viewer, VCD import and export, and a testbench writer. | `.v` · `.vcd` |
| **8086** | Assembler and emulator for the 8086. Step forward and back, breakpoints, registers and flags, memory, stack, variables, machine-code listing, a DOS console (INT 21h, 10h, 16h) and virtual ports with LEDs, a 7-segment display and switches. Saves `.COM` programs. | `.asm` · `.com` |
| **Arduino** | Runs Arduino sketches on a virtual Uno in real time: LEDs, RGB LED, buttons, switches, potentiometer, light, temperature, ultrasonic and motion sensors, servo, buzzer and a 16×2 LCD. Serial Monitor, Serial Plotter and live variables. | `.ino` |
| **Diagram** | Flowcharts, networks, UML, BPMN, data structures, charts, 3D shapes and neural networks: 367 shapes in 21 groups. Hover arrows add connected shapes, a sketch page turns hand-drawn lines into straight lines and shapes, a shape maker saves your own shapes, and a neural-network framework draws or trains networks. | `.cediag` · `.drawio` · `.mmd` |
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

1. Press **Copy prompt for AI** and paste it into any AI chat (ChatGPT, Gemini, Claude, Copilot and others) together with a photo of your circuit. The prompt lists every part with its pin order and the position of every pin, so the chat can place parts and wires exactly as in the photo.
2. Paste the chat's whole answer into the editor. Text around the code, ``` fences, list numbers, `//` comments and LTspice-style model names are cleaned away, and positions written on their own lines are joined to their parts. W lines that end on the wrong pins are left out and only the missing connections are drawn, so a drawing that is almost right stays as it was. The preview and the error list update as you type.
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

Meters and potentiometers are written as `AM1 plus minus DC`, `VM1 plus minus DC` and `POT1 end1 end2 wiper 1k 50% key=A`. Every other part in the library (gates, flip-flops, 555, regulators, switches, relay, transformer, lamps, displays, function generator, oscilloscope, multimeter and wattmeter) is written as `PART type name nodes… setting=value`, with `nc` for a pin left open. Any setting of any part can be added as `setting=value`, for example `R1 a b 1k tol=1%` or `D2 a k LED color=green`, so a circuit written as code comes back with all its settings. The prompt for AI lists every part with its pin order and every model name.

**Workbook labs.** The Examples list has the circuits of the Electronics workbook (503413-4), Labs 3 to 15: diode and zener characteristics, the three rectifiers, common base and common emitter, inverting and non-inverting amplifiers, adder and subtractors, integrator and differentiator, and the low-pass, high-pass, band-pass and notch filters. Each one is drawn like the workbook figure, with its meters or oscilloscope.

**Exact drawings.** Add `@ x y` (and `rot=90`, `flip`, `label=Name`) after a part to place it, `GND @ x y` for ground symbols, `NET name @ x y` for net labels, and `W x1,y1 x2,y2 …` for each wire through its corners. With positions, the circuit is drawn exactly as written, and the editor checks that the wires join the same nodes as the names. **From current design** with **With layout** writes any circuit this way, so it comes back identical. The **BJT common base, exact layout** example shows the format.

```
AM1 e w1 DC @ 470 190 rot=180 label=Ie
Q1  c 0 e BC107BP @ 600 200 rot=270 flip
GND @ 600 500
W 500,190 570,190
```

## Analyses

The Circuit tool has three analyses under **Simulate → Analyses**. Each one plots its results, reads values under a cursor (click the plot) and exports CSV.

- **Bode plotter (XBP):** place it from Instruments, wire IN + to the circuit input and OUT + to its output (both − to ground) and press **Run sweep**. It finds the DC operating point first, then sweeps the AC source or function generator from Start to Stop and measures the gain in dB and the phase in degrees at each frequency, with the peak and the −3 dB frequency. An RC low-pass of 1 kΩ and 100 nF gives −3 dB at 1.585 kHz (theory 1.592 kHz). In the SPICE export it becomes a `.ac` analysis.
- **IV analyzer:** current-voltage curves of a diode, Zener, LED, Schottky diode, BJT (Ic against Vce for steps of Ib), MOSFET or JFET (Id against Vds for steps of Vgs), taken from the design or from the library with any model. A current limit stops a curve as a real curve tracer does.
- **DC sweep and Grapher:** steps a DC source, a current source, a resistor, a pot or the light on an LDR from one value to another and records every voltmeter, ammeter, multimeter and probe. The results are drawn as a graph and listed in a table that can be copied into Excel or Word, which fills the tables of a lab sheet in one run.

## Video of a running circuit

In the Circuit tool press the red record button next to Stop (or **F8**). In the oscilloscope window, **Display → Sweep** draws each screen from left to right like a real oscilloscope, which also shows well in a video. The simulation starts if it is not running, a REC timer appears, and pressing the button again saves the video. Open instrument screens, such as the oscilloscope, are recorded where they sit over the drawing. In the Breadboard tool the **Record** button (F8) records the board the same way. Videos are saved as MP4 (H.264), or as WebM where MP4 is not available, and stop by themselves after 10 minutes.

## My parts

**Place → Create a part…** (or **New part…** in the component browser) builds a new part from a small circuit:

1. Give it a name, a label letter and its pins, for example `IN, OUT`.
2. Write the circuit inside in circuit code, using the pin names as node names. Node `0` is the circuit ground.
3. Press **Check**. The part is marked **Verified** when its definition is complete and it gives exactly the same pin voltages as its own circuit drawn out flat, in a DC test and a 1 kHz sine test.

```
R1 IN OUT 1k
C1 OUT 0 100n
```

Saved parts are in the **My parts** group of the component browser, show Verified or Not verified next to their name on the drawing, and work in circuit code as `PART my_name U1 nodes…`. A design file carries the parts it uses, so it opens on another computer, where the parts are checked again.

## Device models

Transistor models can carry the Gummel-Poon parameters (Early voltages, knee currents, leakage diodes, RB, RE, RC) and diode models a series resistance and breakdown voltage. The BC107BP, 1N4007 and 1N4735A use the same parameters as in Multisim, so the lab circuits give the same meter readings (for example Ie = 8.84 mA, Vbe = 0.701 V in the common base circuit). For the same readings as Multisim, set voltmeters to 10 MOhm (`rin=10M` in circuit code).

## Export to .ms14

**Transfer → Export design (.ms14)…** saves the open circuit as a `.ms14` design file.

- The drawing is kept: every part sits where it is in CEsim, turned and mirrored the same way, with the same wires, junctions and ground symbols. Labels stay upright on turned parts.
- Every part keeps its own name and model: 2N3904, IRF540N, 1N4742A, TL072, LM7812 and every other part number in the library is written with the model CEsim simulates it with, so both give the same readings.
- Settings are kept: source amplitude, frequency and offset, transformer ratio, potentiometer position and key, and the function generator and oscilloscope settings.
- All Workbook labs export this way, and their readings match the ones in CEsim.

Every part in the library exports. Logic gates (AND, OR, NAND, NOR, XOR, XNOR, NOT, buffer) become 74xx gates, or 4000-series gates when the gate is set to the CD4000 family. All 56 chips export with their supply pins on the VCC and GND nets (74xx) or the VDD and VSS nets (4000 series), and each pin is joined to the matching pin of the Multisim part. From chips with several sections, section 1 is exported. JFETs, SCR, TRIAC, DIAC and optocouplers keep their own names and models. The message after saving lists any connected pins that were left out.

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
- The **LDR** light sensor changes from about 1 kOhm in bright light to 1 MOhm in the dark: set the light with the mouse wheel over it, the slider, or **L** and **Shift+L** while it runs. The **Night warning light (LDR + 555)** example uses it with a 1 W power LED.
- **Record** (F8) saves a video of the running board.

## PCB

- Start from an example, from the Breadboard or the Circuit tool (*Transfer → Send to PCB*), or write a netlist in **Netlist**.
- Move parts, then press **X** to draw tracks from pad to pad. **V** adds a via and continues on the other layer, **L** switches layers. A track cannot end on a pad of another net.
- **Autoroute** routes what is left, **Check (DRC)** lists every broken rule, and **Real view** shows the finished board from the top and the bottom.
- **Export Gerber** saves the copper, solder mask, silkscreen, outline and drill files in one .zip, ready for a board maker.

## VLSI

- Choose a layer (keys 1 to 7) and drag to paint: n-well, n and p diffusion, poly, and three metal layers. **C** places a contact, **U** a via (metal 1 to 2), **V** a via 2 (metal 2 to 3), **T** names a wire. Poly crossing diffusion makes a transistor.
- Name the power wires VDD and GND and the inputs and outputs: the truth table appears and names the gate, and **Simulate** colours each wire by its value.
- The Check list shows the design rules that are broken, and **Cross-section** (**K**) shows the chip cut along a row.
- Exports GDSII and CIF layouts and a SPICE netlist of the extracted transistors.
- **Export layout (.MSK)** writes the layout with its inputs set as clocks (each one twice as slow as the one before, so the run goes through the whole truth table), its outputs ready to watch, and VDD and VSS set.
- **Export transistor schematic (.sch)** writes every nMOS and pMOS with its W and L, a VDD and a VSS symbol, a button on each input and a lamp on each output, each net on its own wire. Every transistor is turned so the signal flows from source to drain (from the rails and inputs toward the outputs), which the switch-level simulation of the schematic needs.
- **Open** reads `.MSK` layouts, with their inputs and outputs.

## Diagram

- Hover a shape and blue arrows appear. Click one to add a connected copy, hover it to choose another shape, Shift+click to connect to the next shape, or drag it to connect anywhere. The connector takes the line colour and width of the first shape.
- The right panel has Style (preset styles, gradient, line pattern, rounded, sketch, glass, shadow, default style), Text (fonts, writing direction, background and border, spacing, automatic size) and Arrange (size, flip, keep proportions, order, save as my shape).
- **Sketch page** is a page for free drawing: a wobbly line becomes straight, a loop becomes a circle, rectangle or triangle, and holding still at the end of a stroke snaps it. Pen, marker and eraser, with colours and widths.
- **Shape maker** draws a new outline point by point or freehand, smooths it, and can turn it into a 3D solid. Saved shapes appear under My shapes and travel with the file.
- **Neural network** draws a network as neurons or as layer blocks (CNN, RNN, transformer), or trains a small network on a 2D problem and shows what each neuron learned. Select it to change it and redraw.
- Exports PNG, JPG, WebP, SVG, PDF, HTML, JSON, .drawio, Mermaid, animated SVG with flowing connectors, and print. **Present** shows the pages full screen.

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
- The **DOS** tab is a DOS prompt with its own drive C:. It has `DIR`, `CD`, `MD`, `RD`, `TYPE`, `COPY` (also `COPY CON`), `DEL`, `REN`, `TREE`, `CLS`, `ECHO`, `DATE`, `TIME`, `VER`, `VOL`, `MEM` and batch files. `SAVE NAME.ASM` saves the program in the editor there, `ASM NAME.ASM` assembles it to `NAME.COM` or `NAME.EXE`, typing `NAME` runs it on the same screen (with keyboard input and a command tail), and `EDIT NAME.ASM` opens a file in the editor. The examples are in `C:\EXAMPLES`, and `FORMAT C:` puts them back.

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

**CEsim Studio** برنامج سطح مكتب فيه محاكي دوائر، ولوحة تجارب Breadboard تشتغل مباشرة، وتصميم لوحات PCB مع تصدير ملفات التصنيع، وتصميم شرائح VLSI بترانزستورات CMOS، ومحاكي دوائر رقمية وأدوات الجبر البولياني، ومحاكي Verilog مع عارض الإشارات، ومحاكي معمارية MIPS وRISC-V مع مسار البيانات والـ Pipeline، ومحاكي 8086 بلغة التجميع، ومحاكي Arduino بقطع افتراضية، وأداة رسم مخططات، وتصميم ثلاثي الأبعاد بقياسات حقيقية، وأداة تحول صورة الدائرة إلى دائرة قابلة للمحاكاة عن طريق ذكاء اصطناعي يشتغل على جهازك (Ollama). ويقدر يسجّل فيديو للدائرة وهي تشتغل، وفيه Bode Plotter وIV Analyzer وDC Sweep مع رسم النتائج وجداولها، وتقدر تبني قطعك الخاصة من دائرة صغيرة ويتأكد منها البرنامج ويكتب جنبها Verified.
النسخ متوفرة للماك (Apple Silicon) والويندوز واللينكس من صفحة **Releases**.

BY. YOUSEF A.ALGHAMDI
