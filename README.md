# CEsim Studio

**Circuit simulator, diagrams and 3D in one desktop app.**
BY. YOUSEF

CEsim Studio is a launcher that opens several tools, each in its own window:

| Tool | What it does | Files |
|---|---|---|
| **Circuit** | Schematic capture with live simulation, a large parts library and instruments (multimeter, oscilloscope, function generator, probes, meters). Text notes, net labels, title block, export to PNG / JPG / WebP / SVG / PDF, BOM and node-voltage CSV. | `.cesim` · `.cir` |
| **Circuit from image** | Turns a photo or screenshot of a schematic into an editable circuit, using a vision model that runs on your own computer with [Ollama](https://ollama.com). Nothing is uploaded. | `.png` · `.jpg` · paste |
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
app/            Electron app (studio.html launcher, circuit / diagram / 3d tools, main.js, preload.js)
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

**CEsim Studio** برنامج سطح مكتب فيه محاكي دوائر، وأداة رسم مخططات، وتصميم ثلاثي الأبعاد بقياسات حقيقية، وأداة تحول صورة الدائرة إلى دائرة قابلة للمحاكاة عن طريق ذكاء اصطناعي يشتغل على جهازك (Ollama).
النسخ متوفرة للماك (Apple Silicon) والويندوز واللينكس من صفحة **Releases**.

BY. YOUSEF
