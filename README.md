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
| **System model** | Plan a whole project in one place: pick a board, then sensors, motors, batteries (LiPo included), drone parts and logic gates. Every pin is joined to a free board pin or to the part it belongs with, and one click opens the project, under its own name, in Breadboard (with a ready sketch), Circuit (a schematic), Diagram (a block diagram with arrows that show which way each signal goes), 3D (each part's model), Arduino and VLSI (the logic gates laid out as CMOS transistors). | `.cesys` |
| **Software design** | UML (all 14 diagrams), database diagrams in Chen, crow's foot, IDEF1X and relational tables, data flow (Yourdon and Gane and Sarson), C4 and BPMN. Writes SQL for MySQL, PostgreSQL, SQLite, SQL Server and Oracle and reads it back; turns a class diagram into Java, C#, C++, Python or TypeScript and reads classes from code. A check finds design mistakes. | `.cesoft` · `.sql` |
| **3D** | Millimetre-accurate modelling with holes, groups, arrays, shells, a board library and enclosure maker. Adjustable zoom / rotate / pan speed. | `.ce3d` · `.stl` · `.obj` · `.3mf` · `.glb` |

The Studio window has five themes and eight accent colours (plus a custom colour). The brand colour is orange, and the logo is in `assets/logo.svg` (`python3 build/make-icons.py` makes every icon size from it).

## Download

Get the latest build from the **Releases** page:

| System | File |
|---|---|
| macOS (Apple Silicon) | `CEsim-Studio-<version>-arm64.dmg` |
| macOS (Intel) | `CEsim-Studio-<version>-Intel-x64.dmg` |
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

## Learning aids

- **Explain mode (F10):** click any part while the circuit runs to see what it does, its pin voltages, the current through it and its power. Transistors also show Ib, Ic, Ie, V(BE), V(CE), β and the region (cut-off, active or saturation); diodes show if they conduct; op-amps show if they work linearly or saturate.
- **Current flow (F9):** dots move along the wires the way conventional current flows, faster where the current is larger.
- **Solve by hand (Tools):** for DC circuits of resistors and sources, the node-voltage method step by step: the reference, the voltage sources and supernodes, KCL at every node, the matrix G · x = z, the node voltages, every current by Ohm's law and a KVL check round each loop, then a comparison with the simulation. Node numbers appear on the drawing while it is open.
- **Version history (File):** the design is saved every minute while it changes, and the last 60 versions can be opened in a new tab or restored.

## Circuit library, assignments and efficiency

- **Circuit library (Tools, Ctrl+Shift+L):** 144 ready circuits in seven groups (basics, filters, power, transistors, op-amps, timers, digital), searchable by name, value or topic. Each one opens in a new tab with its meters and instruments.
- **Assignments (Tools):** a teacher writes a task and adds checks: a meter reading, a gain at a frequency, a part limit, a kind of part that must or must not be used. The task is saved in the design file; students build the circuit and press Check my work to have it marked.
- **Power and efficiency (Simulate → Analyses):** the average power of every part, the power given by the sources and taken by the load, the efficiency, and a sweep of efficiency against the load current. The library has buck and boost converters to try it on.

## Analyses

The Circuit tool has three analyses under **Simulate → Analyses**. Each one plots its results, reads values under a cursor (click the plot) and exports CSV.

- **Bode plotter (XBP):** place it from Instruments, wire IN + to the circuit input and OUT + to its output (both − to ground) and press **Run sweep**. It finds the DC operating point first, then sweeps the AC source or function generator from Start to Stop and measures the gain in dB and the phase in degrees at each frequency, with the peak and the −3 dB frequency. An RC low-pass of 1 kΩ and 100 nF gives −3 dB at 1.585 kHz (theory 1.592 kHz). In the SPICE export it becomes a `.ac` analysis.
- **IV analyzer:** current-voltage curves of a diode, Zener, LED, Schottky diode, BJT (Ic against Vce for steps of Ib), MOSFET or JFET (Id against Vds for steps of Vgs), taken from the design or from the library with any model. A current limit stops a curve as a real curve tracer does.
- **DC sweep and Grapher:** steps a DC source, a current source, a resistor, a pot or the light on an LDR from one value to another and records every voltmeter, ammeter, multimeter and probe. The results are drawn as a graph and listed in a table that can be copied into Excel or Word, which fills the tables of a lab sheet in one run.
- **Monte Carlo:** runs the circuit many times with every resistor, capacitor and inductor moved within its tolerance (uniform or Gaussian; a part's own `tol=` setting wins) and shows a histogram of a meter reading with the mean, standard deviation, lowest and highest values.

## Digital instruments

- **Word generator (XWG):** drives eight outputs D0 to D7 with a list of hex words at a set frequency, in Cycle or Burst mode. Ready patterns: up and down counter, shift left and right, 55/AA, Gray code and BCD.
- **Logic analyzer (XLA):** records eight logic inputs as a timing diagram, with a threshold, Hold, two cursors that read the time, the frequency and the word in hex and binary, and CSV export.

## Export to other schematic formats

**Transfer → Export .asc schematic** writes a schematic with every resistor, capacitor, inductor, source, diode, LED, BJT and MOSFET as a symbol joined by net labels; op-amps and other parts go in as netlist lines with their subcircuits and models, together with the analysis. **Transfer → Export .kicad_sch schematic** writes the drawing with the same part positions, pins, wires, junctions, ground symbols, net labels and notes.

## Opening files from other programs

Every file CEsim exports also opens back in CEsim, from File → Open, by dragging it onto the window, or by double-clicking it.

- **Circuit:** `.ms14` (also `.ms13` and `.ms12`), LTspice `.asc` and KiCad `.kicad_sch`. Parts keep their place, turn and values, and the original wires are kept; the function generator and oscilloscope settings come back too. Parts with no CEsim match are listed after opening.
- **VLSI:** GDSII `.gds` and `.cif` layouts, layer by layer with their labels. A DSCH `.sch` schematic or a SPICE `.sp` netlist is laid out as a row of CMOS gates between the VDD and GND rails, with each net on its own metal track. The result passes the design-rule check and gives the same truth table.
- **PCB:** the Gerber and drill `.zip`, or the separate files. Pads are matched to the PCB footprints, and tracks, vias, the board size and the nets come back.
- **Architecture:** a `.hex` file opens as MIPS or RISC-V assembly, with labels on branch and jump targets.
- **8086:** a `.COM` program opens as assembly. The code is followed from 100h, and the rest becomes `db` data with labels. Assembling it again gives the same bytes.

## Uno board on the breadboard

The Breadboard tool has an **Arduino Uno board**. Wire its header pins (D0–D13, A0–A5, 5V, 3.3V, GND) to the breadboard, select the board, write or pick a sketch and press **Upload**. While the simulation runs, outputs drive the circuit at 5 V through 25 Ω, analogWrite gives the PWM average, INPUT_PULLUP adds 20 kΩ to 5 V, digitalRead and analogRead read the real node voltage, and the Serial Monitor shows the sketch output. Examples: blink, traffic light, fade, button, pot on A0 and a night light, and two ready boards under Examples.

## More boards and modules on the breadboard

Next to the Uno, the Breadboard tool has an **ESP32 DevKit** and a **Raspberry Pi Pico**. They run 3.3 V logic and read analog inputs as 0 to 4095; the sketch uses the board's own pin numbers (A0, LED_BUILTIN and SDA/SCL are set for each board).

Modules: a **DC motor** that spins with speed and rpm, a **servo** driven by the Servo library, a **28BYJ-48 stepper** on a ULN2003 driver, a **relay module** that clicks, an **I2C LCD 16×2** (LiquidCrystal_I2C), a **128×64 I2C OLED** (Adafruit_SSD1306: text, pixels, lines, rectangles, circles, triangles), an **HC-SR04 distance sensor** read with pulseIn, an **LM35 / TMP36 temperature sensor** and a **buzzer** that really sounds (Sound button). Each board has examples for every module.

## Web version, share links and teamwork

- **Web version:** the tools also run in a web browser at https://iyousef-hub.github.io/CEsim-Studio/ with nothing to install, including on an iPad. On an iPad, Share → Add to Home Screen gives it its own icon.
- **Touch and pen:** one finger or the pen works like the mouse; two fingers pan and pinch to zoom; a long press or a double tap opens a part's properties.
- **Share link (File menu):** a link that carries the whole circuit or breadboard and opens it in a web browser.
- **Merge changes from a copy (Circuit, File menu):** when classmates work on copies of the same design, bring in the parts and wires one of them added, changed or removed, ticking what to keep.

## DOS machine

The **DOS machine** tab of the 8086 tool boots a full emulated PC with DOS. Drive C has the files of the DOS tab, and **Run editor program** assembles the program in the editor and copies it to drive C as a .COM file. Click the screen and type.

## Lab reports, faults and quizzes

- **Lab report (Reports → Lab report…):** fill in the student name, ID, course, lab number and the text sections (objective, theory, procedure, discussion, conclusion). The report adds the components list, the circuit diagram, a table of every meter reading, the oscilloscope screens, the last Bode plot and DC sweep, and an empty Implementation section for photos of the built circuit. It saves as Word (.docx) or PDF, and the student details are remembered for the next report.
- **Faults (Simulate → Faults…):** a teacher hides faults in parts: open, shorted, or a value 10 times too high or too low, or a random fault. Faults do not show on the drawing, are hidden in the saved file and can be locked with a password. Students measure the circuit and say which part is faulty and how; the app tells them if they are right and counts their tries.
- **Quiz (Tools → Quiz…):** practice problems with new values every time (Ohm's law, dividers, parallel resistors, RC time constant and cut-off, LED resistor, 555 frequency, op-amp gain, power and LC resonance), marked within 3 % with the formula shown, and a button that builds the circuit so the answer can be checked in the simulation. **Predict this circuit** asks for the reading of every meter in the open design and marks the answers against the simulation.

## Design calculators

**Tools → Design calculators** works out the values, rounds them to standard E12 or E24 parts, shows the result those parts give, and builds the circuit in a new tab:

- **555 timer:** astable from a frequency and duty cycle, or monostable from a pulse width.
- **Op-amp gain:** inverting or non-inverting, with a warning when the output would clip.
- **Active filter:** 2nd order Butterworth Sallen-Key or 1st order RC, low-pass or high-pass, built with a Bode plotter.
- **LED resistor:** for one or more LEDs in series, with the resistor power.
- **Resistor colors:** 4 or 5 bands to a value, or a value to its bands.

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
- Settings are kept: source amplitude, frequency and offset, transformer ratio, potentiometer position and key, and the function generator, oscilloscope and Bode plotter settings.
- Instruments are kept: the Bode plotter, logic analyzer and word generator are written as real instruments, wired to the same nets. The CD4060 counter and the quartz crystal export too.
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

## Arduino boards and Raspberry Pi on the breadboard

The Boards group has the **Uno R3, Uno R4, Leonardo, Nano, Nano Every, Nano 33 IoT, Nano 33 BLE, Micro, Pro Mini, MKR WiFi 1010, Mega 2560, Due, ESP32 and ESP32-S3 DevKitC-1**, each with its own pins, voltage, analog inputs and PWM pins, plus the **Pico W** and **Pico 2**. The Arduino tool can switch its board between the Uno, Uno R4, Leonardo, Nano, Nano Every, Pro Mini and Mega.

The Raspberry Pi group has the **Pi 1 B+, Pi 2 B, Pi 3 B, Pi 3 B+, Pi 4 B, Pi 400, Pi 5, Pi Zero and Pi Zero 2 W** with the 40-pin header. They run a **Python program**: RPi.GPIO (BCM or BOARD numbers, pull-up and pull-down, PWM, edge events) and gpiozero (LED, PWMLED, Button, Buzzer, MotionSensor, RGBLED, TrafficLights, Servo), with time, random and math. print goes to the Output panel.

New parts: RGB LED, PIR motion sensor, tilt switch and joystick. In the Arduino tool: joystick, soil moisture, gas, flex, water level, microphone, touch, sound, IR, reed and Hall sensors.

## System model

The System model tool ties the other tools together. Give the project a name, choose a board (Uno, Nano, Mega, Leonardo, Micro, Pro Mini, Nano Every, ESP32, ESP32-S3, Pico, Pico W, Pico 2) and add parts from the list:

- **Sensors:** soil moisture, rain, gas (MQ-2, MQ-3, MQ-4, MQ-7, MQ-135), flame, sound, light, Hall, line, water level, Sharp distance, current, NTC, UV, pulse, force, flex, pH, turbidity, IR obstacle, touch, reed, tilt, limit switch, radar, knock, door switch, ultrasonic, PIR, LM35, SHT31-D, MPU6050, LiDAR, thermal camera, microphone, joystick and more.
- **Motors and outputs:** TT, N20, coreless, 370, 775, 280 and JGA25 gear motors, servos (MG90S, SG92R, DS3218, MG995), steppers, linear actuator, pumps, Peltier, laser, relay, drivers (L298N, DRV8833, TB6612, PCA9685), LED, buzzer, LCD and OLED.
- **Communication:** GPS, Bluetooth, nRF24, RFID, SD card, RTC, keypad, ELRS and RC receivers, telemetry radio, FPV camera and video transmitter, WS2812 LEDs.
- **Drone:** LiPo packs from 1S to 6S, ESCs from 6 A to 60 A, brushless motors from 0802 to 4114, power distribution board, flight controller, XT60 and finder buzzer.
- **Power:** AA, AAA, C, D, 9 V, coin cells, 18650 and 21700 cells, packs and holders, NiMH, lead-acid, LiFePO4, power bank, solar panel, buck and boost converters, charger and BMS.
- **Logic gates (VLSI):** NOT, NAND, NOR, AND, OR and XOR.

Pins are joined for you: power and ground, I2C to the board's SDA and SCL, analog outputs to analog pins, servo and ESC signals to PWM pins, an ESC to its brushless motor, a driver or relay to its motor or pump, the flight controller to the ESCs and the receiver, the camera to the video transmitter, and the battery to what it feeds. Every link can be changed from a list, and the sketch is written from the parts (the first sensor drives the outputs, and the logic gates are tested through all their inputs).

**Open in** sends the project to each tool under its name:

| Tool | What you get |
|---|---|
| Breadboard | The board, each part and every wire, with the sketch on the board, ready to run. Small parts sit on the breadboard (an LED gets its 220 Ω resistor), modules sit beside it, and logic gates become 74LS chips. |
| Circuit | A schematic: a block for the board and each part, joined by net labels. |
| Diagram | A block diagram: inputs on the left, outputs on the right, parts that send and receive below, batteries above, and parts driven by another part next to it. Each arrow points the way the signal goes; a part that sends and receives gets an arrow head at both ends. Battery power is drawn in dashed red. |
| 3D | The 3D model of the board and every part, laid out side by side on the plate. |
| Arduino | The sketch. |
| VLSI | The logic gates as CMOS transistors, with the design-rule check and the truth table. |

## Software design

One `.cesoft` file holds as many diagrams as you need, each on its own tab:

- **UML structure:** class, object, component, deployment, package, composite structure and profile diagrams.
- **UML behaviour and interaction:** use case, activity (with swimlanes, forks and signals), state machine (with history, choice and composite states), sequence, communication, timing and interaction overview diagrams.
- **Sequence diagrams:** actor, boundary, control, entity and database lifelines, synchronous and asynchronous messages, replies, create and destroy, activation bars, and combined fragments (alt with an else branch, opt, loop, par, break and more). Messages can be numbered in the label or in black circles, the heads can be repeated at the bottom, and a lavender look is available.
- **Databases:** one model drawn in four notations: Chen (attributes as ovals, weak entities, identifying relationships), crow's foot, IDEF1X and relational tables with PK and FK. Each column has a type, primary key, not null, unique, auto number and a foreign key chosen from a list.
- **SQL:** writes the schema for MySQL, PostgreSQL, SQLite, SQL Server or Oracle, with keys, foreign keys, indexes and a joining table for every many-to-many line. Reads CREATE TABLE and ALTER TABLE scripts back into a diagram.
- **Code:** a class diagram becomes Java, C#, C++, Python or TypeScript with fields, methods, parents and the fields its associations need. Classes in any of these languages can be read back into a diagram.
- **Analysis:** data flow diagrams in Yourdon and DeMarco or Gane and Sarson notation, C4 context and container views, and BPMN processes with events, tasks, gateways, data and pools.
- **Check:** finds tables without a primary key, broken foreign keys, columns that break first normal form, inheritance loops, data flowing without a process, unreachable states, missing start and end events and more.
- **Working on the page:** double-click (or F2) any shape or line to type its text in place, right-click for actions (add attribute or column, change kind, bring to front, reverse a line), the + buttons of a selected shape add a joined shape, and class attributes and operations are edited as rows (visibility, name, type, parameters, static, abstract). The parts list has a search box, and the status bar shows the zoom, the selection, and grid and snap switches.
- **Styles:** Colour (each kind tinted, rounded corners, soft shadows), Classic, and Print (black and white).
- Arrange lays the diagram out again, lines can be straight or at right angles, and every diagram exports to PNG, SVG and PDF. An example of every diagram type is under Examples.

## Parts catalog

592 real parts with their packages, pins and sizes, in Breadboard, Circuit, PCB and 3D:

- **Passive components:** resistors of every kind and size, chip sizes from 0201, networks and arrays, thermistors, varistors, potentiometers, capacitors (ceramic, film, electrolytic, tantalum, supercapacitors), inductors, transformers, crystals, resonators and oscillators.
- **Discretes and protection:** rectifier, Schottky, zener, TVS and bridge diodes, BJTs, MOSFETs, IGBTs, SiC and GaN transistors, thyristors, relays, optocouplers and isolators, fuses and ESD protection.
- **Analog and mixed-signal ICs:** op-amps, instrumentation and audio amplifiers, comparators, references, ADCs and DACs, multiplexers, signal conditioning and industrial interfaces.
- **Logic, timing and memory:** 74xx and 4000 logic, flip-flops, counters, shift registers, decoders, I/O expanders, timers and supervisors, EEPROM, flash, SRAM, DRAM and storage.
- **Processors and boards:** 8-, 16- and 32-bit microcontrollers, development boards, single-board computers, system-on-modules, FPGAs and CPLDs, DSPs, AI accelerators, programmers and debuggers.
- **Packages:** DIP, SIP, PGA, SOIC, SSOP, TSSOP, QFP, QFN, DFN, BGA, LGA, WLCSP, SOT, TO-92, TO-220, TO-247, DPAK, chip sizes, sensor and board form factors.

Parts the simulator has a model for (resistors, capacitors, diodes, transistors, op-amps, gates, timers…) simulate in Circuit and on the breadboard; the others are drawn with their real pins for wiring. Every part has a PCB footprint and a 3D model from its package size.

## Sensors, drone parts and motors

**Sensors** on the breadboard, each with its own library in the sketch:

| Part | Wiring | Sketch |
|---|---|---|
| SHT31-D temperature and humidity | VIN, GND, SCL, SDA | `Adafruit_SHT31`: begin(0x44), readTemperature(), readHumidity() |
| MLX90640-ESF-BAB thermal camera (32 × 24, 110°; BAA 55° too) | VIN, GND, SCL, SDA | `Adafruit_MLX90640`: begin(), setMode(), setRefreshRate(), getFrame(frame) |
| SLAMTEC RPLIDAR S2 (360°, 0.05 to 30 m) | 5V, GND, TX to the board RX, RX to the board TX | `RPLidar`: begin(Serial1), startScan(), waitPoint(), getCurrentPoint().distance / .angle / .startBit. On the Pi: `rplidar` iter_scans() |
| INMP441 I2S MEMS microphone | VDD 3.3 V, GND, SD, WS, SCK, L/R to GND | `ESP_I2S` (ESP32): setPins(), begin(I2S_MODE_STD, 16000, …), read() gives 24-bit samples |
| IIS3DWB vibration sensor (3-axis, 26.7 kHz) | VDD 3.3 V, GND, CS, SCK, SDI, SDO | `IIS3DWBSensor`: begin(), Enable_X(), Set_X_FS(), Get_X_Axes(acc) in mg. On the Pi: `spidev` registers (WHO_AM_I 0x7B) |
| Raspberry Pi Camera Module 3 (IMX708, 12 MP, autofocus) | CSI ribbon to the Raspberry Pi | `picamera2`: start(), autofocus_cycle(), set_controls(), capture_metadata(), capture_array() |
| LiDAR VL53L0X | VCC, GND, SCL, SDA | `VL53L0X`: init(), startContinuous(), readRangeContinuousMillimeters() |
| RGB camera OV2640 | 3V3, GND, SIOC, SIOD | `OV2640`: begin(), capture(), red(x, y), green(x, y), blue(x, y), brightness() on an 80 × 60 picture |
| Gyro and accelerometer MPU6050 | VCC, GND, SCL, SDA | `MPU6050`: initialize(), testConnection(), getAccelerationX() … getRotationZ() |
| Microphone MAX4466 | OUT to an analog pin | analogRead(); quiet room, tone, voice, claps or music |
| Piezo disc | red to an analog pin, 1 MΩ across it | click it to knock |
| Vibration sensor SW-420 | DO to a pin | digitalRead(); click it to shake |

You set what each sensor senses in Details: temperature and humidity, the warm object for the thermal camera, the distance, the ball the camera sees, the tilt, the sound. Wrong I2C wires (SDA and SCL swapped) give a warning, and begin() returns false.

**Drone parts:** brushless motors (0802 Tiny Whoop, 1404, 2207, 2306, 2212, 2814, 4114) with their props, ESCs from 6 to 60 A, LiPo batteries from 1S to 6S, the MPU6050 and drone frames (Tiny Whoop, 3-inch, 5-inch, F450, S550 hexacopter, X8 octocopter). The ESC reads servo pulses: send 1000 µs for 2 seconds to arm it, then 1000 to 2000 µs for the throttle. Swapping two motor wires reverses the motor. Each motor shows its rpm, thrust and current; the frame adds up the weight of the parts and the thrust, and lifts off when the thrust is more than the weight. Warnings show a LiPo below 3.5 V per cell, more current than the C rating or the ESC allows, and a motor on too many cells.

**Motors:** the DC motor can be a 130 hobby motor, TT gear motor (1:48), N20 gear motor (1:100), coreless 8520, 370 or 775 motor, and the L298N driver runs two DC motors with direction and PWM speed.

**3D models:** every new board, sensor, drone part and motor is also in **Boards and modules** in the 3D tool, made to the real dimensions, with a search box. Use them to design a case or a drone mount around them.

## Pointers, structs and the ESP32 camera

Sketches can use **pointers and structs**: `int *p = &x;`, `*p`, `p[i]`, pointer arithmetic, `NULL` checks, `struct` and `typedef struct`, `p->field`, arrays of structs and passing pointers to functions. Reading through a NULL pointer or past the end of an array stops the sketch and says where. On 32-bit boards (ESP32, ESP32-S3, Pico, Due, MKR, Nano 33, Uno R4) `int` is 32-bit like on the real board.

The real **esp_camera** library works on the ESP32-S3: `camera_config_t`, `esp_camera_init(&config)`, `esp_camera_fb_get()`, `fb->buf`, `fb->width`, `fb->height`, `fb->len`, `esp_camera_fb_return(fb)` and `sensor_t *s = esp_camera_sensor_get()` with `s->set_framesize()`, `s->set_vflip()` and more. Frames come in RGB565, grayscale, RGB888 or JPEG from 96 × 96 to 1600 × 1200. The OV2640 module has its 18 pins, and `esp_camera_init` checks every pin in the config against the wiring and says which one is wrong.

## Flying the drone

Add a frame, a **flight controller (F405)**, four ESCs, four brushless motors and a LiPo. The flight controller has its own gyro: in Angle mode it keeps the drone level, in Acro mode the sticks set the rotation rate, and Altitude hold keeps a height from 0 to 10 m. Fly it from the sliders in Details or from the keyboard (I and K throttle, J and L yaw, arrow keys roll and pitch, Enter arms), or from a board that sends servo pulses to THR, ROLL, PITCH, YAW and AUX1. The drone has real physics: thrust and reaction torque of each motor at its arm, gravity, drag and the ground. It climbs, tilts, drifts and turns, shows its height and an attitude indicator, and crashes if it hits the ground too fast. Wrong prop directions make it spin, and a wrong motor order flips it. An MPU6050 or a VL53L0X mounted on the drone reads its motion and height.

## I2C sensors on the Raspberry Pi

Python programs on every Pi can use `board` and `busio` with `adafruit_sht31d`, `adafruit_mlx90640`, `adafruit_vl53l0x`, `adafruit_mpu6050`, the `mpu6050` package and `picamera2` (`capture_array()`). `i2c.scan()` lists the wired sensors, and a sensor that is not wired gives the same "No I2C device at address" error as on a real Pi.

## More motors and tools

- **Motors:** NEMA 17 stepper with A4988 driver (1 to 1/16 microsteps), MG996R and FS90R continuous servos, 40 mm fan, mini water pump, coin vibration motor and 12 V push solenoid.
- **Tools:** two-channel oscilloscope (time and volts per division, trigger, Vpp and frequency), function generator (sine, square, triangle and saw up to 2 kHz) and logic probe (HI, LO and PULSE).
- **3D models** for all of them, plus a multimeter and a bench power supply, in the Tools group of the 3D tool.

## Wires

- Moving or rotating a part takes the wires attached to its legs with it; their other end stays where it is.
- Two wires that only touch in the air no longer join. Wires join at holes and part terminals.
- Double-click a wire to add a bend, drag the square to shape it, and double-click the square to remove it.

## Breadboard parts panel

The parts list is on the right, with a search box (press / or Ctrl+F) and a Details tab for the selected part. Parts and boards are drawn like the real ones, and the zoom moves in small smooth steps.

## Drawing and selecting

- Drag from a pin to draw a wire. Right-click while drawing to drop a resistor, capacitor, LED or another quick part at the wire end.
- Press **W** to start a wire anywhere. Drag a free wire end to make it longer or shorter, and drag a wire segment to move it.
- Drag on empty space to select several parts and wires, then move or delete them together. Shift or Ctrl adds to the selection, and Ctrl+A selects everything. The breadboard and PCB tools select the same way.
- Pan with Space and drag, the middle button, or a right-drag.

## Oscillators

Parts: crystal, ceramic resonator, crystal oscillator module, VCO and CD4060 oscillator and counter. The function generator has sine, triangle, square, sawtooth, pulse, noise, sweep (linear or log) and arbitrary waves. **File > Open oscillator example** has Wien bridge, phase shift, Colpitts, Hartley, op-amp relaxation, ring, CD4060, VCO and sweep circuits.

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

The DOS machine uses the js-dos emulators package (DOSBox compiled to WebAssembly), GPL-2.0, in `app/lib/emu` with its license in `app/lib/emu/LICENSE`. Source: https://github.com/js-dos/emulators and https://www.dosbox.com.

---

### بالعربي

**CEsim Studio** برنامج سطح مكتب فيه محاكي دوائر، ولوحة تجارب Breadboard تشتغل مباشرة، وتصميم لوحات PCB مع تصدير ملفات التصنيع، وتصميم شرائح VLSI بترانزستورات CMOS، ومحاكي دوائر رقمية وأدوات الجبر البولياني، ومحاكي Verilog مع عارض الإشارات، ومحاكي معمارية MIPS وRISC-V مع مسار البيانات والـ Pipeline، ومحاكي 8086 بلغة التجميع، ومحاكي Arduino بقطع افتراضية، وأداة رسم مخططات، وأداة System model تجمع مشروعك كامل (اللوحة والحساسات والمحركات والبطاريات وقطع الدرون والبوابات المنطقية) وتفتحه باسمه في البريدبورد والدوائر والدايقرام والـ 3D والأردوينو والـ VLSI، وأداة Software design لرسم كل مخططات UML ومخططات قواعد البيانات (Chen وCrow's foot وIDEF1X) مع تحويلها إلى SQL وكود والعكس، ومكتبة 592 قطعة حقيقية بأشكالها وأبعادها، وتصميم ثلاثي الأبعاد بقياسات حقيقية، وأداة تحول صورة الدائرة إلى دائرة قابلة للمحاكاة عن طريق ذكاء اصطناعي يشتغل على جهازك (Ollama). ويقدر يسجّل فيديو للدائرة وهي تشتغل، وفيه Bode Plotter وIV Analyzer وDC Sweep مع رسم النتائج وجداولها، وMonte Carlo، ومولد كلمات ومحلل منطقي، وحاسبات تصميم تبني الدائرة لك، ومولد تقارير معامل Word وPDF، ووضع الأعطال للمعلم، واختبارات، ولوحة Arduino Uno على البريدبورد، وجهاز DOS كامل، وتصدير المخطط إلى .asc و.kicad_sch، وفتح ملفات .ms14 و.asc و.kicad_sch و.gds و.cif و.sch وGerber و.hex و.COM، ووضع "اشرح لي"، وحركة التيار على الأسلاك، والحل اليدوي بطريقة جهود العقد، وسجل النسخ، ومكتبة 144 دائرة، والواجبات اللي تنصحح تلقائيًا، والكفاءة، ولوحات ESP32 وPico مع محركات وشاشات وحساسات وصوت على البريدبورد، ونسخة ويب تشتغل على الآيباد، وروابط مشاركة، ودمج تعديلات الزملاء، وتقدر تبني قطعك الخاصة من دائرة صغيرة ويتأكد منها البرنامج ويكتب جنبها Verified.
النسخ متوفرة للماك (Apple Silicon) والويندوز واللينكس من صفحة **Releases**.

BY. YOUSEF A.ALGHAMDI
