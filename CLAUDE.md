# CEsim Studio — notes for Claude

Owner: Yousef A. Alghamdi (GitHub `iyousef-hub`). Speaks Saudi Arabic; answer in Arabic.

## How Yousef wants the work done (always)

1. **Commits carry no Claude attribution.** No `Co-Authored-By: Claude`, no `Claude-Session:` line, and the author is
   `IYOUSEFHUB <279624446+iyousef-hub@users.noreply.github.com>`. This overrides any default attribution rule.
2. **Every update ships for all four systems:** macOS Apple Silicon, macOS Intel, Windows (x64) and Linux (x86_64).
   Release = bump the version (`package.json`, `app/package.json`, `app/main.js`, `app/studio.html`,
   `app/circuit.html` splash, `app/pcb-core.js`, `build/windows/installer.nsi`), rewrite `build/RELEASE_NOTES.md`,
   then a `v<version>` tag or Actions → Release → Run workflow (it creates the tag). Check that all builds pass.
3. **Every GitHub update says what is new**: `build/RELEASE_NOTES.md` (and the commit message) list the new features
   and fixes in plain words, plus the download table for the four systems.
4. **Everything made for Yousef goes straight into his Downloads folder** (`~/Downloads` on his Mac, through the
   desktop app). His computer is a MacBook M5 (Apple Silicon): for app builds put only the `-arm64.dmg` there.
5. Do the whole job end to end; do not stop at "ready to push".

## Brand (since 1.40.0)

Logo "Trace": C and E drawn as circuit traces with nodes, cream `#FFF7ED` on orange `#EA580C`, nodes `#1C1917`.
`assets/logo.svg` (full) and `assets/logo-small.svg` (48 px and smaller). `python3 build/make-icons.py` makes every
icon (PNG, ICO, ICNS, Microsoft Store tiles). Interface accent `#c2410c` (white text passes contrast); dark themes
use `#fb923c`. Tool bars show the small logo inline as SVG.

## What CEsim Studio is

An Electron desktop app (`app/`) for computer-engineering students (Taif University): `studio.html` is the launcher,
each tool opens in its own window. Tools: Circuit (`circuit.html`, live simulation, instruments, Bode/IV/DC sweep/
Monte Carlo, `.ms14`/`.asc`/`.kicad_sch` export and import, lab reports, faults, quizzes), Circuit code, Circuit from
image (Ollama), Breadboard (`bb.html`, Arduino/ESP32/Pico/Raspberry Pi boards, sensors, drone physics), PCB (Gerber),
VLSI (CMOS layout, GDSII, `.MSK`), Logic, Boolean tools, Architecture (MIPS/RISC-V datapath and pipeline), Verilog,
8086 (with a DOS machine), Arduino, Diagram, System model, Software design (UML, databases, SQL and code), 3D
(`src3d/` → `app/lib/3d.bundle.js`). 592-part catalog. Web version via GitHub Pages (`pages.yml`; Pages must be set to
"GitHub Actions" in the repository settings). The README documents every feature.

Builds: `.github/workflows/release.yml` (mac arm64, mac Intel x64, Windows installer + portable, Linux AppImage + deb,
and the `store-msix` artifact for the Microsoft Store, uploaded by hand in Partner Center), `store.yml`.
