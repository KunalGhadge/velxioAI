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

---

## Question 2: Component System

**How are components stored?**

**Are they stored as:**
- JSON
- Classes
- TypeScript interfaces
- Database records

*Show an example component object.*

*Show how wires and pin connections are represented.*

---

## Answer 2

### 1. Multi-Layered Component Storage Model

In Velxio, components exist across **all 4 tiers**, each fulfilling a specific role in the system lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 4-TIER COMPONENT REPRESENTATION                                 │
├────────────────────────────────┬────────────────────────────────┬───────────────────────────────┤
│ Tier                           │ Implementation Format          │ Primary Responsibility        │
├────────────────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ 1. In-Memory Workspace State   │ TypeScript Interfaces          │ High-speed reactivity, undo/  │
│                                │ (Zustand: `useSimulatorStore`) │ redo stack & canvas rendering │
├────────────────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ 2. Visual & Physical Layer     │ Custom Web Component Classes   │ DOM rendering, SVG graphics,  │
│                                │ (LitElement / `HTMLElement`)   │ dynamic pin coordinates       │
├────────────────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ 3. File & Transfer Format      │ JSON Documents                 │ Serialization, Wokwi diagram  │
│                                │ (`diagram.json` / metadata)    │ format & AI code generation   │
├────────────────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ 4. Backend Persistence Layer   │ Database Records               │ Multi-tenant user storage,    │
│                                │ (SQLAlchemy / PostgreSQL/SQLite│ project saves & revisions     │
└────────────────────────────────┴────────────────────────────────┴───────────────────────────────┘
```

---

### 2. Detailed Storage Tier Breakdown

#### A. In-Memory: TypeScript Interfaces
In the active React/Zustand store (`useSimulatorStore.ts`), placed parts and wires are strictly typed objects:

```typescript
// Component in active simulation canvas (useSimulatorStore.ts)
export interface Component {
  id: string;                      // Unique canvas instance ID (e.g. "led_1718029381_0")
  metadataId: string;              // Canonical registry type (e.g. "led", "dht22", "lcd1602")
  x: number;                       // Canvas X coordinate in pixels
  y: number;                       // Canvas Y coordinate in pixels
  properties: Record<string, any>; // Editable part properties (e.g. { color: "red", value: "220" })
}

// Canonical Catalog Definition (ComponentRegistry.ts)
export interface ComponentMetadata {
  id: string;                      // e.g. "wokwi-led"
  name: string;                    // "LED"
  category: 'sensors' | 'displays' | 'outputs' | 'inputs' | 'passives' | 'ics';
  description: string;
  pins: PinDefinition[];           // Array of pin names, labels, and default positions
  defaultProperties: Record<string, any>;
  componentClass?: string;         // Web Component custom element tag name
}
```

#### B. Visual & Terminal Layer: Web Component Classes
All interactive hardware parts inherit from custom Web Component classes (`HTMLElement` / `LitElement`). They expose a critical **`pinInfo` getter** that calculates exact millimeter-accurate pin coordinates in DOM space for wiring:

```typescript
// Web Component implementation (@wokwi/elements / custom elements)
export class WokwiLED extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'value', 'label', 'flip'];
  }

  // Dynamic pin coordinate getter called by wire layout calculators
  get pinInfo(): PinInfo[] {
    return [
      { name: 'A', label: 'Anode', x: 7.6, y: 34.0, signals: ['ANODE'] },
      { name: 'C', label: 'Cathode', x: 2.5, y: 34.0, signals: ['GND'] }
    ];
  }
}
customElements.define('wokwi-led', WokwiLED);
```

#### C. File & Network Layer: JSON Format
When exported, shared, or passed to/from the AI agent, circuits use standard Wokwi-compatible JSON (`diagram.json`):

```json
{
  "version": 1,
  "author": "Velxio User",
  "editor": "velxio",
  "parts": [
    {
      "type": "board-arduino-uno",
      "id": "uno",
      "top": 100,
      "left": 60,
      "attrs": {}
    },
    {
      "type": "wokwi-led",
      "id": "led1",
      "top": 120,
      "left": 380,
      "attrs": { "color": "green" }
    },
    {
      "type": "wokwi-resistor",
      "id": "r1",
      "top": 200,
      "left": 380,
      "attrs": { "value": "220" }
    }
  ],
  "connections": [
    [ "uno:13", "r1:1", "green", [ "v0" ] ],
    [ "r1:2", "led1:A", "green", [ "v0" ] ],
    [ "led1:C", "uno:GND.1", "black", [ "v0" ] ]
  ]
}
```

#### D. Database Layer: Relational Records
In the backend database (SQLAlchemy models in `backend/app/models/project.py`), projects store the complete JSON document alongside relational metadata:

```python
class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    board_type = Column(String(50), default="arduino-uno")
    
    # Serialized Circuit Netlist (JSON diagram format)
    diagram = Column(Text, nullable=False, default="{}")
    
    # Source Code Files
    source_code = Column(Text, nullable=False, default="")
    files_manifest = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

### 3. Example Component Objects in Memory

#### Example 1: Placed LED Component Object
```json
{
  "id": "led_1771129381_0",
  "metadataId": "led",
  "x": 380,
  "y": 120,
  "properties": {
    "color": "green",
    "brightness": "1.0",
    "label": "Status LED"
  }
}
```

#### Example 2: Placed DHT22 Temperature & Humidity Sensor Object
```json
{
  "id": "dht22_1771129381_1",
  "metadataId": "dht22",
  "x": 570,
  "y": 120,
  "properties": {
    "temperature": 24.5,
    "humidity": 60.0
  }
}
```

---

### 4. Representation of Wires & Pin Connections

Wires are modeled as **directed graph edges between pin endpoints** with electrical metadata:

#### A. TypeScript Wire Interface (`useSimulatorStore.ts`)
```typescript
export interface WireEndpoint {
  componentId: string; // Target board ID ("uno") or component ID ("led1")
  pinName: string;     // Exact pin label ("13", "A0", "5V", "GND.1", "VCC", "SDA")
  x: number;           // Calculated canvas X coordinate of the terminal
  y: number;           // Calculated canvas Y coordinate of the terminal
}

export interface Wire {
  id: string;                  // Unique wire ID (e.g. "wire_1771129381_abc")
  start: WireEndpoint;         // Source pin endpoint
  end: WireEndpoint;           // Destination pin endpoint
  waypoints: { x: number; y: number }[]; // Orthogonal routing elbow points
  color: string;               // Electrical standard color (e.g. "#ef4444", "#1f2937")
}
```

#### B. Example Wire Objects
```json
[
  {
    "id": "wire_vcc_dht22",
    "start": {
      "componentId": "uno",
      "pinName": "5V",
      "x": 124,
      "y": 322
    },
    "end": {
      "componentId": "dht22_1771129381_1",
      "pinName": "VCC",
      "x": 578,
      "y": 145
    },
    "waypoints": [
      { "x": 124, "y": 360 },
      { "x": 578, "y": 360 }
    ],
    "color": "#ef4444"
  },
  {
    "id": "wire_data_dht22",
    "start": {
      "componentId": "uno",
      "pinName": "2",
      "x": 218,
      "y": 112
    },
    "end": {
      "componentId": "dht22_1771129381_1",
      "pinName": "SDA",
      "x": 590,
      "y": 145
    },
    "waypoints": [],
    "color": "#10b981"
  }
]
```

#### C. SPICE Netlist Wire Resolution (`NetlistBuilder.ts`)
During simulation, wire graphs are compiled into continuous electrical nodes using a **Union-Find Disjoint Set**:
1. All connected endpoints with pins named `GND`, `VSS`, or `0` are unioned into canonical SPICE Node **`0`** (Ground).
2. All connected endpoints with pins named `5V`, `3V3`, `VCC`, or `VDD` are unioned into canonical SPICE Node **`vcc_rail`**.
3. All other interconnected pins form isolated nodal voltage nets (`n1`, `n2`, `n3`, ...), which are fed to the **WASM ngspice solver** to evaluate voltages and currents in real time.

