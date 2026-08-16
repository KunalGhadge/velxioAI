# VelxioAI Architecture & System Q&A

---

## Question 1: High-level Architecture

**Describe Velxio's complete architecture.**

**Include:**
- Frontend framework
- Backend framework
- Database
- Circuit engine
- Component library
- Compiler
- Simulation engine
- File system
- Serial monitor
- AI integration

*Draw the architecture as a tree.*

---

## Answer 1

### 1. Architectural Overview & Core Subsystems

VelxioAI is an **AI-Native Web-Based Embedded Studio & Hardware Simulation Platform** engineered to emulate microcontrollers, analog/digital peripheral circuits, and run firmware with cycle-accurate execution directly in the browser and backend.

```
                                  VELXIO AI ARCHITECTURE
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      │                                                                             │
┌─────▼──────────────────────────────┐                         ┌────────────────────▼────────────────────────┐
│      FRONTEND (Browser / SPA)      │◄─────── WebSocket ─────►│    BACKEND (FastAPI Microservices)          │
│                                    │        REST / HTTP      │                                             │
│  ┌──────────────────────────────┐  │                         │  ┌───────────────────────────────────────┐  │
│  │ UI & Workspace Layer (React) │  │                         │  │ REST APIs & WS Gateways (FastAPI)     │  │
│  │ Monaco, Tabs, Canvas, Docks  │  │                         │  │ /compile, /qemu/ws, /projects, /auth  │  │
│  └──────────────┬───────────────┘  │                         │  └───────────────────┬───────────────────┘  │
│                 │                  │                         │                      │                      │
│  ┌──────────────▼──────────────┐   │                         │  ┌───────────────────▼───────────────────┐  │
│  │ State Stores (Zustand)      │   │                         │  │ Database Layer (SQLAlchemy / SQLite)  │  │
│  │ Editor, Sim, AI, Electrical │   │                         │  │ Users, Projects, Metadata, Examples   │  │
│  └──────────────┬───────────────┘  │                         │  └───────────────────┬───────────────────┘  │
│                 │                  │                         │                      │                      │
│  ┌──────────────▼──────────────┐   │                         │  ┌───────────────────▼───────────────────┐  │
│  │ Simulation & Solver Engines │   │                         │  │ Hardware Compilers & Toolchains       │  │
│  │ avr8js, rp2040js, NGSPICE   │   │                         │  │ arduino-cli, espidf, gcc-arm-none-eabi│  │
│  └──────────────┬───────────────┘  │                         │  └───────────────────┬───────────────────┘  │
│                 │                  │                         │                      │                      │
│  ┌──────────────▼──────────────┐   │                         │  ┌───────────────────▼───────────────────┐  │
│  │ Autonomous AI Studio Engine │   │                         │  │ QEMU Microcontroller Emulators        │  │
│  │ Context, Tools, Layout, ReAct│  │                         │  │ libqemu-xtensa (ESP32), RISC-V, Pi 3  │  │
│  └─────────────────────────────┘   │                         │  └───────────────────────────────────────┘  │
└────────────────────────────────────┘                         └─────────────────────────────────────────────┘
```

---

### 2. Deep-Dive Component Breakdown

#### A. Frontend Framework
- **Core Framework**: React 18 with TypeScript, bundled via Vite 7.
- **Styling & Theme**: Vanilla CSS custom property design system (`index.css`, `EditorPage.css`, `SimulatorCanvas.css`, `AIAssistantDock.css`) adhering to strict dark-mode embedded IDE aesthetics (VS Code / Cursor aesthetic).
- **Code Editor**: `@monaco-editor/react` (Monaco Editor engine) supporting C/C++, MicroPython, Rust, JSON, Assembly syntax highlighting, auto-completion, linting markers, and inline diff views.
- **State Management (Zustand)**:
  - `useEditorStore`: Multi-file virtual workspace (`files[]`, `fileGroups`, `activeFileId`, `openFileIds`, dirty tracking).
  - `useSimulatorStore`: Board state, canvas components, wiring graphs, execution state, breakpoints, undo/redo history stack (`CanvasCommand`).
  - `useAIStore`: AI Assistant message stream, multi-model configuration, ReAct reasoning steps, 1-click snapshot rollback (`checkpointSnapshot`).
  - `useElectricalStore`: SPICE nodal voltages, current vectors, stress ratios, burnout diagnostics.
  - `useCompileLogsStore`: Compiler stdout/stderr diagnostic streams and error location line parsers.
  - `useAuthStore`: User authentication, token lifecycle, profile state.
  - `useOscilloscopeStore`: Multi-channel logic analyzer & oscilloscope sampling buffers.

#### B. Backend Framework
- **Framework**: Python 3.10+ with FastAPI and Uvicorn.
- **Communication Protocols**:
  - **REST API**: Stateless compilation endpoints (`/api/compile`), project CRUD (`/api/projects`), community gallery, component metadata synchronization.
  - **WebSockets (`/ws`)**: Full-duplex streaming for real-time ESP32 QEMU emulation bridge, bidirectional serial communications, and live build streaming.

#### C. Database
- **ORM & Driver**: SQLAlchemy with Alembic migrations.
- **Database Engines**: SQLite (default local development and zero-config deployment) / PostgreSQL (production scalable multi-tenant deployments).
- **Schemas**: User accounts, OAuth authentication credentials, projects, multi-file code snapshots, circuit netlists, public project shares, component rating reviews.

#### D. Circuit Engine (Hybrid Multi-Domain Solver)
Velxio uses a dual-engine architecture to solve both digital logic and real continuous analog electronics:
1. **Analog & Mixed-Signal Domain**: WASM-compiled **ngspice** (`NgSpiceWorkerAdapter`) running inside dedicated Web Workers.
   - Solves non-linear circuit equations, diode/LED $I$-$V$ curves, capacitor charge/discharge curves, transistor biasing, and voltage divider nodes.
   - Computes node voltages (`vectorsOfInterest`) and component stress ratios to trigger real-time **Burnout Warnings** (e.g., LED burnt by missing current-limiting resistor, overvoltage electrolytic capacitors).
2. **Digital Transition Domain**: `PinManager` with topological Union-Find (`NetlistBuilder`) net consolidation.
   - Translates pin transitions, high/low logic levels, MCU digital output states, and external pin interrupts.
3. **Collision-Free Auto-Layout Engine (`CircuitLayoutEngine.ts`)**:
   - Computes non-overlapping grid placement coordinates for peripheral sensors, displays, and actuators.
   - Auto-assigns industry standard electrical wire colors (🔴 Red for 5V/VCC, 🟠 Orange for 3.3V, ⚫ Black for GND, 🔵 Blue for I2C SDA, 🟡 Yellow for I2C SCL, 🟣 Purple for Analog, 🟢 Green for GPIO/PWM).

#### E. Component Library
- **Custom Web Components (`@wokwi/elements`)**: All boards and interactive parts are implemented as Web Components inheriting from `HTMLElement` / `LitElement`, exposing dynamic `.pinInfo` getters for millimeter-accurate wire terminal binding.
- **Catalog**:
  - **Boards**: Arduino Uno, Arduino Nano, Arduino Mega 2560, ESP32 DevKit v1, ESP32-C3, Raspberry Pi Pico / RP2040, Raspberry Pi 3.
  - **Sensors**: Ultrasonic (`wokwi-hc-sr04`), Temperature & Humidity (`wokwi-dht22`, `wokwi-dht11`, `wokwi-ds18b20`), PIR Motion (`wokwi-pir-motion-sensor`), Light (`wokwi-photoresistor-sensor`), Rotary Potentiometers, MPU6050 Accelerometer/Gyroscope, BMP280 Barometer.
  - **Displays**: 16x2 / 20x4 HD44780 LCD (`wokwi-lcd1602`, `wokwi-lcd2004`), SSD1306 128x64 I2C OLED (`wokwi-ssd1306`), ILI9341 TFT, 7-Segment Displays, MAX7219 Matrix.
  - **Actuators & Outputs**: LEDs, RGB LEDs, NeoPixel WS2812 rings/matrices, Servo Motors (`wokwi-servo`), Piezo Buzzers, Relays.
  - **Inputs & Passives**: Pushbuttons (6mm & 12mm), Slide switches, DIP switches, 4x4 Matrix Keypads, Resistors, Capacitors.
- **Registry System (`ComponentRegistry.ts`)**: Loads metadata from `components-metadata.json` generated by `scripts/generate-component-metadata.ts` with custom pin overrides in `scripts/component-overrides.json`.

#### F. Compiler Subsystem
- **Stateless Backend Compilers**:
  - `arduino-cli`: Compiles C/C++ `.ino` sketches for AVR (`arduino:avr:uno`, `arduino:avr:nano`, `arduino:avr:mega`), RP2040 (`rp2040:rp2040:rpipico`), and ESP32 (`esp32:esp32:esp32`).
  - `espidf`: Compiles native ESP-IDF C/C++ projects using CMake and Ninja.
  - Automatic dynamic library resolution using `libraries.txt` manifests.
- **Local WebAssembly Compilers**:
  - MicroPython bytecode compiler and UF2 packing for Raspberry Pi Pico and ESP32.

#### G. Simulation Engine
- **AVR (8-bit)**: `avr8js` running ATmega328P / ATmega2560 cycle-accurate CPU instruction emulation in browser Web Workers.
- **RP2040 (32-bit ARM)**: `rp2040js` emulating dual Cortex-M0+ cores, Programmable I/O (PIO), DMA controllers, timers, and hardware interpolators.
- **ESP32 / ESP32-C3 / ESP32-S3 (Xtensa / RISC-V)**: Backend QEMU bridge (`libqemu-xtensa` / `qemu-system-riscv32`) with WebSocket pin event streaming and memory-mapped virtual peripheral shims.
- **Raspberry Pi 3 (ARM64)**: Emulated peripheral bridges.

#### H. Virtual File System
- **In-Memory Store (`useEditorStore`)**:
  - Supports multi-file project workspaces (`sketch.ino`, `diagram.json`, `libraries.txt`, header files `.h`, source files `.cpp`, `.py`).
  - Dynamic file creation, renaming, deletion, content mutation, and active tab switching.
  - Project serialization to single-file JSON bundles, standard Wokwi `diagram.json` format, or downloadable `.zip` archives.

#### I. Serial Monitor Subsystem
- **Bidirectional Stream**: Real-time buffered character streaming with ANSI terminal escape sequence rendering, configurable baud rate selectors (300 to 115200 baud), auto-scroll, plot mode, and line ending selectors (`NL`, `CR`, `NL+CR`).
- **Physical Hardware Bridge**: Web Serial API (`navigator.serial`) integration allowing direct flashing and live Serial Monitor communication with physical microcontrollers plugged into USB.

#### J. AI Integration (Autonomous Studio Agent)
- **Multi-Model LLM Gateway (`LLMClient.ts`)**: Provider-agnostic streaming interface supporting Google Gemini (Gemini 2.5 Flash, Gemini Pro), Anthropic Claude (Claude 3.7 Sonnet), OpenAI (GPT-4o), DeepSeek, and Local Ollama instances.
- **Context Collector (`AIContextCollector.ts`)**: Real-time snapshot gathering active MCU board metadata, placed components, wiring netlists, open file contents, compiler diagnostics, SPICE net warnings, and live serial monitor buffers.
- **Discrete Agent Tool Engine (`AgentToolEngine.ts`)**:
  - File Tools: `writeFile`, `readFile`, `deleteFile`, `installLibraries`
  - Microcontroller Tools: `setBoard(boardKind)`
  - Circuit Tools: `applyCircuit`, `clearCircuit`, `beautifyCircuit`
  - Simulator Tools: `compileProject`, `startSimulation`, `stopSimulation`, `resetBoard`
  - Serial Tools: `readSerial`, `writeSerial`
- **Resilient Action Parser (`extractVelxioAction`)**: Sanitizes and extracts structured action payloads, repairs malformed multi-line strings, and guarantees automated execution across editor and simulator canvas.
- **1-Click Rollback (`checkpointSnapshot`)**: Automatically stashes pre-prompt workspace states, allowing instant 1-click reverting of any AI-generated modification.

---

### 3. Complete Architecture Tree

```
VelxioAI-Platform
├── frontend/ (Client-Side Single Page Application)
│   ├── public/
│   │   ├── boards/ (SVG graphical definitions for boards)
│   │   ├── component-svgs/ (Pre-rendered component vector assets)
│   │   └── components-metadata.json (Canonical metadata & pin definitions)
│   └── src/
│       ├── ai/ (Autonomous Embedded Studio Agent)
│       │   ├── AgentToolEngine.ts (Programmatic tool execution APIs)
│       │   ├── AIContextCollector.ts (Real-time workspace snapshot generator)
│       │   ├── CircuitLayoutEngine.ts (Collision-free grid auto-placement)
│       │   ├── CircuitSynthesizer.ts (Hardware netlist synthesis)
│       │   ├── LLMClient.ts (Streaming client for Gemini, Claude, GPT, Ollama)
│       │   ├── useAIStore.ts (AI message state, ReAct actions & rollback)
│       │   └── types.ts (Action schemas, Circuit & Code proposals)
│       ├── components/
│       │   ├── ai/ (AIAssistantDock, Chat, DiffCards, LearningCards)
│       │   ├── editor/ (MonacoEditor, CompilationConsole, FileTabs, Toolbar)
│       │   ├── simulator/ (SimulatorCanvas, PartInspector, ZoomControls)
│       │   └── ComponentRegistry.ts (Runtime component registry singleton)
│       ├── pages/
│       │   ├── EditorPage.tsx (Main Unified Embedded IDE workspace)
│       │   └── ExamplesPage.tsx (Embedded project gallery)
│       ├── services/
│       │   ├── CircuitSimulationService.ts (Coordinator for SPICE & Digital solvers)
│       │   └── PinManager.ts (Logic transitions & interrupt routing)
│       ├── simulation/
│       │   ├── mcu/ (avr8js, rp2040js, and Esp32Bridge adapters)
│       │   ├── parts/ (Peripheral component logic: DHT22, LCD, OLED, Servo)
│       │   └── spice/ (NgSpiceWorkerAdapter, NetlistBuilder, runtimeBurnout)
│       ├── store/ (Zustand Global State Management)
│       │   ├── useEditorStore.ts (Virtual multi-file system)
│       │   ├── useSimulatorStore.ts (Board, components, wires, simulation)
│       │   ├── useElectricalStore.ts (SPICE nodal voltages & burnout metrics)
│       │   ├── useCompileLogsStore.ts (Diagnostics & compiler outputs)
│       │   └── useAuthStore.ts (User sessions & tokens)
│       └── types/ (TypeScript domain definitions: board, components, wires)
│
└── backend/ (Stateless Fast Microservices & Simulation Bridges)
    ├── app/
    │   ├── api/ (REST Endpoints)
    │   │   ├── compile.py (Stateless compilation dispatcher)
    │   │   ├── projects.py (Project persistence and sharing)
    │   │   └── auth.py (User authentication and JWT handling)
    │   ├── core/ (Configuration, security, database sessions)
    │   ├── models/ (SQLAlchemy DB models for Users, Projects, Libraries)
    │   ├── services/
    │   │   ├── arduino_cli.py (arduino-cli execution & error parsing)
    │   │   ├── espidf_compiler.py (ESP-IDF CMake/Ninja build system)
    │   │   └── qemu_bridge.py (WebSocket bridge for libqemu-xtensa)
    │   └── main.py (FastAPI application entry point)
    └── requirements.txt (Python dependencies: FastAPI, Uvicorn, SQLAlchemy)
```
