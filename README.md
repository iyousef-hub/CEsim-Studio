# CEsim Studio

**Circuits, digital logic, 8086 assembly, Arduino, diagrams and 3D in one desktop app.**
BY. YOUSEF A.ALGHAMDI

CEsim Studio is a launcher that opens several tools, each in its own window:

| Tool | What it does | Files |
|---|---|---|
| **Circuit** | Schematic capture with live simulation, a large parts library and instruments (multimeter, oscilloscope, function generator, probes, meters). Text notes, net labels, title block, export to PNG / JPG / WebP / SVG / PDF, BOM and node-voltage CSV. | `.cesim` · `.cir` |
| **Circuit code** | Write a circuit as text (SPICE style) with a live preview and error checks. Copy the built-in prompt into any AI chat with a photo of your circuit, paste the answer back, and build it in one click. | `.cir` · text |
| **Circuit from image** | Turns a photo or screenshot of a schematic into an editable circuit, using a vision model that runs on your own computer with [Ollama](https://ollama.com). Nothing is uploaded. | `.png` · `.jpg` · paste |
| **Logic** | Digital circuits with gates, multiplexers, decoders, adders, flip-flops, registers, counters and displays, on single wires or multi-bit buses. Live simulation, clock, timing diagram and truth table. Opens `.circ` files. | `.cedig` · `.circ` |
| **Boolean tools** | Truth tables, K-maps with groups, minimal SOP and POS, canonical forms, and a state machine (FSM) designer that writes the flip-flop equations. Builds any result as a circuit in Logic. | |
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
app/            Electron app (studio.html launcher, circuit, logic, bool, asm, ino, diagram and 3d tools, main.js, preload.js)
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

**CEsim Studio** برنامج سطح مكتب فيه محاكي دوائر، ومحاكي دوائر رقمية وأدوات الجبر البولياني، ومحاكي 8086 بلغة التجميع، ومحاكي Arduino بقطع افتراضية، وأداة رسم مخططات، وتصميم ثلاثي الأبعاد بقياسات حقيقية، وأداة تحول صورة الدائرة إلى دائرة قابلة للمحاكاة عن طريق ذكاء اصطناعي يشتغل على جهازك (Ollama).
النسخ متوفرة للماك (Apple Silicon) والويندوز واللينكس من صفحة **Releases**.

BY. YOUSEF A.ALGHAMDI
