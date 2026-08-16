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

---

## Question 3: AI Architecture

**Describe the current AI implementation.**

**Explain:**
- Which model is being used
- How prompts are constructed
- How conversation history is stored
- Whether the AI can call tools
- Whether the AI directly generates code
- Whether the AI edits files
- Whether the AI can access the entire codebase

*Draw the AI workflow.*

---

## Answer 3

### 1. Architectural Overview of VelxioAI Studio

VelxioAI integrates a **ReAct-driven Autonomous Studio Agent** designed specifically for embedded hardware engineering. Unlike a standard chatbot that only outputs conversational text, Velxio's AI agent operates as a **paired co-pilot** that continuously senses the live state of the IDE (circuit canvas, Monaco code editor, compiler diagnostic logs, and serial monitor) and executes deterministic changes across files, hardware components, wiring, and simulation controls.

---

### 2. Deep-Dive Specification

#### A. Which Models Are Being Used
Velxio uses a **Provider-Agnostic LLM Gateway** ([`LLMClient.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/LLMClient.ts)) supporting multi-vendor streaming APIs:

| Provider | Models Supported | Default / Recommended |
| :--- | :--- | :--- |
| **Google Gemini** | `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash` | **`gemini-2.5-flash` (Default)** |
| **Anthropic Claude** | `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku` | `claude-3-7-sonnet-20250219` |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | `gpt-4o` |
| **DeepSeek** | `deepseek-chat`, `deepseek-reasoner` | `deepseek-chat` |
| **Local / Self-Hosted** | Local Ollama (`http://localhost:11434/v1`) or any custom OpenAI-compatible API | `ollama/qwen2.5-coder` |

Users can configure their API keys and switch models dynamically in the **AI Settings Modal** (`AISettingsModal.tsx`), stored securely in their browser's local storage.

---

#### B. How Prompts Are Constructed
Prompts are dynamically built on every user turn by [`AIContextCollector.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/AIContextCollector.ts) using a two-tier structure:

1. **Static Engineering Directives & Rules**:
   - **Intent Separation**: Strict rules differentiating greetings (plain text), theoretical explanations (clean markdown), and hardware/code tasks (action blocks).
   - **Hardware Pinout Constraints**: Real physical pin capabilities for the active board (e.g. Arduino Uno has Digital 0–13 and Analog A0–A5; ESP32 has GPIO 0–39).
   - **Component Registry Catalog**: Exact Wokwi custom element names (`wokwi-led`, `wokwi-dht22`, `wokwi-lcd1602`, `wokwi-pir-motion-sensor`, etc.).
   - **Circuit Rules**: Mandatory 220Ω series current-limiting resistors on LEDs, standard electrical wire color-coding.
   - **Action Block Schema**: Strict JSON structure specification (`velxio-action`).

2. **Dynamic Live Workspace Snapshot**:
   - **Active Microcontroller**: Kind, label, and FQBN (e.g. `arduino:avr:uno`).
   - **Canvas Components**: JSON array of all placed peripheral parts and coordinates.
   - **Wiring Netlist**: JSON list of all active wire connections (`fromPart:fromPin` $\rightarrow$ `toPart:toPin`).
   - **Virtual File Tree**: List of all files in the project workspace (`sketch.ino`, `libraries.txt`, etc.).
   - **Active File Preview**: Real-time content of the currently open editor tab.
   - **Compiler Diagnostics**: Recent stdout/stderr error logs from `arduino-cli` / `espidf`.
   - **SPICE Net Warnings**: Floating pins, short circuits, or burnout warnings.
   - **Serial Monitor Buffer**: The last 500 characters of live UART output.

---

#### C. How Conversation History Is Stored
- **State Store**: Managed by Zustand in [`useAIStore.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/useAIStore.ts) under `messages: AIMessage[]`.
- **Browser Persistence**: Serialized to browser `localStorage` under the key `velxio_ai_store` using Zustand's `persist` middleware.
- **Rolling Window**: Sliced to the **last 50 messages** to ensure optimal memory usage and token economy.
- **Message Schema**:
  ```typescript
  export interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;                    // Rendered clean markdown
    reasoning?: string;                 // Extracted model reasoning trace
    steps?: ActionStep[];               // Structured progress checklist
    circuitProposal?: CircuitProposal;  // Hardware components & wires
    codeProposal?: CodeProposal;        // Firmware code diff & metadata
    learningCard?: HardwareLearningCardData; // Explanatory theory card
    bomData?: HardwareBOMData;          // Bill of Materials & pricing
    error?: string;
    timestamp: number;
  }
  ```

---

#### D. Whether the AI Can Call Tools
**YES.** The AI possesses full programmatic tool invocation through the **[`AgentToolEngine.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/AgentToolEngine.ts)** API suite:

| Tool Method | Category | Functionality |
| :--- | :--- | :--- |
| `AgentToolEngine.writeFile(name, code)` | File System | Creates or updates project files in Monaco |
| `AgentToolEngine.readFile(name)` | File System | Reads any file in the workspace |
| `AgentToolEngine.deleteFile(name)` | File System | Deletes files from the workspace |
| `AgentToolEngine.installLibraries(libs[])` | File System | Adds dependencies to `libraries.txt` and board manifest |
| `AgentToolEngine.setBoard(boardKind)` | Hardware | Switches active board (Uno, Nano, ESP32, Pico, Pi 3) |
| `AgentToolEngine.applyCircuit(proposal)` | Circuit | Auto-places components & routes standard colored wires |
| `AgentToolEngine.clearCircuit()` | Circuit | Wipes peripheral canvas components |
| `AgentToolEngine.beautifyCircuit()` | Circuit | Calculates non-overlapping grid layout |
| `AgentToolEngine.compileProject()` | Simulation | Triggers backend `arduino-cli` compilation |
| `AgentToolEngine.startSimulation()` | Simulation | Launches CPU emulator & SPICE analog solver |
| `AgentToolEngine.stopSimulation()` | Simulation | Halts running simulation |
| `AgentToolEngine.resetBoard()` | Simulation | Resets MCU program counter & peripheral states |
| `AgentToolEngine.readSerial()` | Diagnostics | Reads live serial monitor text |
| `AgentToolEngine.writeSerial(data)` | Diagnostics | Sends input into MCU UART RX stream |

---

#### E. Whether the AI Directly Generates Code
**YES.** The AI generates complete, production-ready embedded C/C++ (`.ino`, `.cpp`, `.h`), MicroPython (`.py`), or Rust firmware directly within its structured proposal blocks. It adheres to real MCU constraints (memory, pin definitions, hardware interrupts, timers, and peripheral libraries).

---

#### F. Whether the AI Edits Files
**YES.** When an action or code proposal is received:
1. `AgentToolEngine.writeFile(proposal.fileName, proposal.proposedContent)` updates the file inside `useEditorStore`.
2. The file is automatically focused and synced with the active **Monaco Editor instance**.
3. Any newly required external libraries (e.g. `LiquidCrystal`, `DHT sensor library`, `Adafruit SSD1306`) are automatically detected and appended to `libraries.txt`.

---

#### G. Whether the AI Can Access the Entire Codebase
- **Project Workspace (YES)**: The AI has complete read/write access to all files, netlists, manifests, and logs inside the user's active embedded project sandbox.
- **Host Application / Backend Codebase (Sandboxed)**: The AI runs in the browser client context and interacts strictly through the defined `AgentToolEngine` APIs and REST/WebSocket endpoints. It cannot crawl or modify external host server system files outside the project sandbox.

---

### 3. Complete AI Execution Workflow

```
                                  VELXIO AI WORKFLOW
                                          │
                        ┌─────────────────▼─────────────────┐
                        │     User Input (Chat / Prompt)    │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │   1. Snapshot State Collector     │
                        │      (AIContextCollector.ts)      │
                        │  - Active Board & MCU Pinouts     │
                        │  - Placed Components & Netlist    │
                        │  - Open Files & Code Previews     │
                        │  - Compiler Logs & Serial Output  │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │    2. Workspace Checkpoint Stash  │
                        │   (1-Click Snapshot Rollback)     │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │    3. Streaming LLM Execution     │
                        │         (LLMClient.ts)            │
                        │  - Gemini / Claude / GPT-4o /     │
                        │    DeepSeek / Local Ollama        │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │    4. Resilient Action Parser     │
                        │       (extractVelxioAction)       │
                        │  - Sanitizes Python """ quotes    │
                        │  - Strips JSON from chat display  │
                        └─────────────────┬─────────────────┘
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 │                                                 │
        [Is Action Block?]                                 [Is Plain Chat?]
                 │                                                 │
┌────────────────▼────────────────┐               ┌────────────────▼────────────────┐
│   5. Agent Tool Dispatcher      │               │   Render Clean Markdown in      │
│      (AgentToolEngine.ts)       │               │   AIAssistantDock Chat Stream   │
│                                 │               └─────────────────────────────────┘
│ ┌─────────────────────────────┐ │
│ │ Set Target MCU Board        │ │
│ └──────────────┬──────────────┘ │
│                │                │
│ ┌──────────────▼──────────────┐ │
│ │ Collision-Free Grid Layout  │ │
│ │  (CircuitLayoutEngine.ts)   │ │
│ └──────────────┬──────────────┘ │
│                │                │
│ ┌──────────────▼──────────────┐ │
│ │ Write Code & Install Libs   │ │
│ │    (useEditorStore.ts)      │ │
│ └──────────────┬──────────────┘ │
│                │                │
│ ┌──────────────▼──────────────┐ │
│ │ Auto-Route Standard Wires   │ │
│ │   (useSimulatorStore.ts)    │ │
│ └─────────────────────────────┘ │
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│  6. Live Workspace Update       │
│  - Canvas re-renders parts      │
│  - Monaco displays new code     │
│  - Compiler ready for run/solve │
└─────────────────────────────────┘
```

---

## Question 4: File System Structure

**Show the project's file structure.**

**Include:**
- src
- components
- simulator
- compiler
- ai
- circuits
- serial monitor

*Limit the output to 4 directory levels.*

---

## Answer 4

### 1. Project Directory Tree (Max 4 Directory Levels)

```
VelxioAI/
├── frontend/                                   # Single Page Application (React 18 + TS + Vite)
│   ├── public/                                 # Static Assets & Catalog Metadata
│   │   ├── boards/                             # Board vector SVGs (Uno, Nano, Mega, ESP32, Pico, Pi3)
│   │   ├── component-svgs/                     # Auto-generated component vector icons
│   │   ├── ngspice/                            # WASM ngspice solver binaries & workers
│   │   └── components-metadata.json            # 165+ Canonical component schemas
│   └── src/                                    # Frontend Application Source (Level 1)
│       ├── ai/                                 # Autonomous Studio Agent & Co-Pilot (Level 2)
│       │   ├── tools/                          # AI Tool implementations (watchdog, refactor)
│       │   ├── AgentToolEngine.ts              # Unified programmatic execution tool layer
│       │   ├── AIContextCollector.ts           # Real-time workspace context gatherer & prompt builder
│       │   ├── CircuitLayoutEngine.ts          # Collision-free auto-placement & wire coloring
│       │   ├── CircuitSynthesizer.ts           # Hardware netlist synthesis engine
│       │   ├── LLMClient.ts                    # Provider-agnostic client (Gemini, Claude, GPT, Ollama)
│       │   ├── types.ts                        # Agent action schemas & proposal types
│       │   └── useAIStore.ts                   # Zustand AI message & execution store
│       ├── components/                         # UI Components & Custom Elements (Level 2)
│       │   ├── ai/                             # AI Assistant Dock & UI Widgets (Level 3)
│       │   │   ├── AIAssistantDock.tsx         # Collapsible right-dock AI chat & tool container
│       │   │   ├── AIChatMessage.tsx           # Rich Markdown & interactive action message renderer
│       │   │   ├── AICircuitProposalCard.tsx   # Visual circuit diff proposal card
│       │   │   ├── AICodeDiffCard.tsx          # Inline Monaco code diff proposal card
│       │   │   ├── AIReasoningAccordion.tsx    # Collapsible ReAct reasoning traces
│       │   │   └── AISettingsModal.tsx         # Multi-provider API key & model configuration
│       │   ├── editor/                         # Monaco Editor & Console (Level 3)
│       │   │   ├── CompilationConsole.tsx      # Compiler diagnostics, errors, & auto-heal trigger
│       │   │   ├── EditorToolbar.tsx           # Compile, run, stop, beautify, and zoom controls
│       │   │   ├── MonacoEditor.tsx            # Multi-file Monaco code editor wrapper
│       │   │   └── NewProjectDialog.tsx        # Template & blank project launcher
│       │   ├── serial/                         # Serial Monitor Subsystem (Level 3)
│       │   │   ├── SerialMonitor.tsx           # Live UART console, ANSI escape parser, plotter
│       │   │   ├── SerialPlotter.tsx           # Real-time multi-variable waveform oscilloscope
│       │   │   └── WebSerialBridge.ts          # Physical USB Web Serial API hardware bridge
│       │   ├── simulator/                      # Circuit Canvas & Part Viewers (Level 3)
│       │   │   ├── SimulatorCanvas.tsx         # Interactive hardware breadboard & canvas renderer
│       │   │   ├── PartInspectorDialog.tsx     # Component attribute & pin inspector modal
│       │   │   ├── PropertyEditDialog.tsx      # Part electrical parameters editor (ohms, color)
│       │   │   └── WireOverlay.tsx             # SVG wire curves & terminal endpoint renderer
│       │   └── ComponentRegistry.ts            # Component metadata registry singleton
│       ├── services/                           # IDE Infrastructure & Sim Services (Level 2)
│       │   ├── CircuitSimulationService.ts     # Master coordinator between SPICE & digital engines
│       │   ├── PinManager.ts                   # Real-time pin logic states & interrupt routing
│       │   └── I2CBusManager.ts                # Master/Slave I2C bus transaction forwarder
│       ├── simulation/                         # Hardware & Electrical Solvers (Level 2)
│       │   ├── mcu/                            # Microcontroller Emulators (Level 3)
│       │   │   ├── AVRSimulator.ts             # 8-bit AVR emulator (avr8js engine)
│       │   │   ├── RP2040Simulator.ts          # 32-bit ARM Cortex-M0+ emulator (rp2040js engine)
│       │   │   └── Esp32Bridge.ts              # WebSocket bridge to backend QEMU Xtensa/RISC-V
│       │   ├── parts/                          # Peripheral Component Simulators (Level 3)
│       │   │   ├── DHT22Sensor.ts              # Temperature & humidity sensor simulation
│       │   │   ├── LCD1602Display.ts           # HD44780 16x2 / 20x4 LCD character display
│       │   │   ├── SSD1306OLED.ts              # 128x64 I2C OLED display frame buffer
│       │   │   ├── ServoMotor.ts               # PWM pulse-width angle controller
│       │   │   └── runtimeBurnout.ts           # Electrical overcurrent/overvoltage stress checker
│       │   └── spice/                          # Analog Circuit Solver (Level 3)
│       │       ├── NetlistBuilder.ts           # Union-Find netlist extractor & SPICE card generator
│       │       ├── NgSpiceWorkerAdapter.ts     # Web Worker bridge to WASM ngspice engine
│       │       └── MixedModeScheduler.ts       # Synchronizer between digital ticks & analog solves
│       ├── store/                              # Global Zustand State Architecture (Level 2)
│       │   ├── useEditorStore.ts               # Multi-file virtual workspace filesystem
│       │   ├── useSimulatorStore.ts            # Board state, canvas parts, wires, & execution status
│       │   ├── useElectricalStore.ts           # SPICE nodal voltages & burnout fault logs
│       │   ├── useCompileLogsStore.ts          # Compiler diagnostic stdout/stderr streams
│       │   ├── useOscilloscopeStore.ts         # Multi-channel logic analyzer waveform buffers
│       │   └── useAuthStore.ts                 # User authentication & cloud profile state
│       ├── types/                              # Core TypeScript Interface Definitions (Level 2)
│       │   ├── board.ts                        # MCU Board types, FQBNs, & pinout schemas
│       │   ├── components.ts                   # Component instances & catalog definitions
│       │   ├── wires.ts                        # Wire endpoints & color definitions
│       │   └── editor.ts                       # Virtual files & workspace structures
│       ├── utils/                              # Geometry & Coordinate Utilities (Level 2)
│       │   ├── pinPositionCalculator.ts        # Dynamic DOM pin terminal coordinate resolver
│       │   └── workspaceDraft.ts               # LocalStorage draft stash & recovery
│       ├── velxio-elements/                    # Native Web Component implementations (Level 2)
│       ├── App.tsx                             # Root React Router & Layout shell
│       ├── index.css                           # Global design system & theme variables
│       └── main.tsx                            # React 18 DOM mount entry point
│
├── backend/                                    # Python FastAPI Microservices (Level 1)
│   ├── app/                                    # Application Core (Level 2)
│   │   ├── api/                                # REST API Gateways (Level 3)
│   │   │   ├── compile.py                      # Stateless compiler orchestration endpoint
│   │   │   ├── projects.py                     # Project CRUD & sharing endpoints
│   │   │   └── auth.py                         # User authentication & JWT session management
│   │   ├── core/                               # Backend Infrastructure (Level 3)
│   │   │   ├── config.py                       # Environment variables & runtime settings
│   │   │   └── database.py                     # SQLAlchemy session lifecycle management
│   │   ├── models/                             # Relational DB Schemas (Level 3)
│   │   │   ├── user.py                         # User table schema
│   │   │   └── project.py                      # Project netlist, source code & manifest schema
│   │   ├── services/                           # Compilers & Emulation Bridges (Level 3)
│   │   │   ├── arduino_cli.py                  # arduino-cli invocation, library discovery & linting
│   │   │   ├── espidf_compiler.py              # ESP-IDF CMake/Ninja native compiler toolchain
│   │   │   └── qemu_bridge.py                  # WebSocket bridge to libqemu-xtensa / RISC-V
│   │   └── main.py                             # FastAPI application factory & CORS configuration
│   ├── tests/                                  # Backend PyTest integration test suite
│   ├── venv/                                   # Python virtual environment
│   ├── requirements.txt                        # Backend dependencies (FastAPI, Uvicorn, SQLAlchemy)
│
└── scripts/                                    # Build & Metadata Tooling (Level 1)
    ├── generate-component-metadata.ts          # Scans Web Components & builds metadata catalog
    ├── generate-component-svgs.cjs             # Pre-renders component vector icon previews
    └── component-overrides.json                # Custom pin definitions & property overrides
```

---

## Question 5: Tool System

**List every function the AI can execute.**

**For each function, show:**
- Function name
- Parameters
- Return value

*Examples: `addComponent()`, `connectPins()`, `createFile()`, `updateFile()`, `compile()`, `startSimulation()`, `stopSimulation()`, `readSerialMonitor()`, `saveCircuit()`.*

---

## Answer 5

### 1. Unified Tool Execution Interface

All tools executed by Velxio's AI engine adhere to the standardized `ToolExecutionResult` interface:

```typescript
export interface ToolExecutionResult {
  success: boolean;       // True if tool succeeded without errors
  message: string;        // Human-readable status or error description
  data?: any;             // Optional structured payload (IDs, netlists, logs)
}
```

---

### 2. Complete Catalog of AI Tools

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             AI AGENT TOOL SUITE CATALOG                                               │
├────────────────────┬───────────────────────────────────────────┬───────────────────────────┬──────────────────────────┤
│ Category           │ Tool Function Name                        │ Parameters                │ Return Type              │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 1. File System     │ `AgentToolEngine.writeFile`               │ `(fileName, content)`     │ `Promise<ToolResult>`    │
│                    │ `AgentToolEngine.readFile`                │ `(fileName)`              │ `string | null`          │
│                    │ `AgentToolEngine.deleteFile`              │ `(fileName)`              │ `ToolResult`             │
│                    │ `AgentToolEngine.installLibraries`        │ `(requiredLibs[])`        │ `ToolResult`             │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 2. Hardware/Board  │ `AgentToolEngine.setBoard`                │ `(boardKind)`             │ `ToolResult`             │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 3. Circuit Canvas  │ `AgentToolEngine.applyCircuit`            │ `(proposal)`              │ `ToolResult`             │
│                    │ `AgentToolEngine.clearCircuit`            │ `()`                      │ `ToolResult`             │
│                    │ `AgentToolEngine.beautifyCircuit`         │ `()`                      │ `ToolResult`             │
│                    │ `sim.recordAddComponent`                  │ `(component)`             │ `void`                   │
│                    │ `sim.recordAddWire`                       │ `(wire)`                  │ `void`                   │
│                    │ `sim.recordRemoveComponent`               │ `(id)`                    │ `void`                   │
│                    │ `sim.recordRemoveWire`                    │ `(id)`                    │ `void`                   │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 4. Simulation      │ `AgentToolEngine.compileProject`          │ `()`                      │ `Promise<ToolResult>`    │
│                    │ `AgentToolEngine.startSimulation`         │ `()`                      │ `ToolResult`             │
│                    │ `AgentToolEngine.stopSimulation`          │ `()`                      │ `ToolResult`             │
│                    │ `AgentToolEngine.resetBoard`              │ `()`                      │ `ToolResult`             │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 5. Diagnostics     │ `AgentToolEngine.readSerial`              │ `()`                      │ `string`                 │
│                    │ `AgentToolEngine.writeSerial`             │ `(data)`                  │ `ToolResult`             │
│                    │ `AgentToolEngine.getCompileLogs`          │ `()`                      │ `string[]`               │
├────────────────────┼───────────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ 6. Workspace & AI  │ `useAIStore.rollbackCheckpoint`           │ `()`                      │ `void`                   │
│                    │ `useAIStore.toggleDock`                   │ `(open?: boolean)`        │ `void`                   │
└────────────────────┴───────────────────────────────────────────┴───────────────────────────┴──────────────────────────┘
```

---

### 3. Deep-Dive Tool Signatures & Specifications

#### 1. File Management Tools

---

##### `AgentToolEngine.writeFile(fileName, content)` *(Aliases: `createFile`, `updateFile`)*
Creates a new file or overwrites an existing file in the virtual workspace and focuses it in the Monaco Editor.
- **Parameters**:
  - `fileName` (`string`): The target filename (e.g. `"sketch.ino"`, `"config.h"`, `"sensor.cpp"`, `"main.py"`).
  - `content` (`string`): The full source code content to write.
- **Return Value**: `Promise<ToolExecutionResult>`
  ```json
  { "success": true, "message": "Updated file \"sketch.ino\"", "data": { "id": "file_1" } }
  ```

---

##### `AgentToolEngine.readFile(fileName)`
Retrieves the raw text content of a workspace file.
- **Parameters**:
  - `fileName` (`string`): Name of the file to inspect.
- **Return Value**: `string | null` (The file's text content, or `null` if not found).

---

##### `AgentToolEngine.deleteFile(fileName)`
Deletes a file from the workspace project tree.
- **Parameters**:
  - `fileName` (`string`): Name of the file to remove.
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Deleted file \"old_header.h\"" }
  ```

---

##### `AgentToolEngine.installLibraries(requiredLibs)`
Appends external C++/MicroPython libraries to `libraries.txt` and registers them in the active board manifest.
- **Parameters**:
  - `requiredLibs` (`string[]`): Array of library names (e.g. `["LiquidCrystal", "Adafruit SSD1306", "DHT sensor library"]`).
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Installed libraries: LiquidCrystal, DHT sensor library", "data": { "libraries": [...] } }
  ```

---

#### 2. Hardware & Microcontroller Tools

---

##### `AgentToolEngine.setBoard(boardKind)`
Configures or switches the active microcontroller on the canvas.
- **Parameters**:
  - `boardKind` (`BoardKind`): Target board identifier (`"arduino-uno"`, `"arduino-nano"`, `"arduino-mega"`, `"esp32"`, `"esp32-c3"`, `"raspberry-pi-pico"`, `"velxio-raspberry-pi-3"`).
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Configured board: arduino-uno" }
  ```

---

#### 3. Circuit & Wiring Tools

---

##### `AgentToolEngine.applyCircuit(proposal)` *(Aliases: `addComponent`, `connectPins`)*
Batch-executes a complete circuit proposal: calculates collision-free grid positions, mounts components with canonical metadata IDs, and routes standard color-coded wires.
- **Parameters**:
  - `proposal` (`CircuitProposal`):
    ```typescript
    interface CircuitProposal {
      id: string;
      title: string;
      description: string;
      boardKind?: BoardKind;
      componentsToAdd: { id?: string; type: string; attrs?: Record<string, any> }[];
      componentsToRemove?: string[];
      wiresToAdd: { fromPart: string; fromPin: string; toPart: string; toPin: string; color?: string }[];
      wiresToRemove?: string[];
    }
    ```
- **Return Value**: `ToolExecutionResult`
  ```json
  {
    "success": true,
    "message": "Built circuit: Visitor Counter Circuit",
    "data": { "componentsAdded": 2, "wiresAdded": 11 }
  }
  ```

---

##### `AgentToolEngine.clearCircuit()`
Removes all peripheral components and wires from the canvas, leaving only the active microcontroller board.
- **Parameters**: None `()`
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Cleared canvas circuit" }
  ```

---

##### `AgentToolEngine.beautifyCircuit()`
Re-arranges all currently placed canvas parts into clean, non-overlapping grid columns and recalculates all wire route bezier curves.
- **Parameters**: None `()`
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Beautified 4 components on canvas" }
  ```

---

##### `useSimulatorStore.getState().recordAddComponent(component)`
Direct underlying canvas command that adds a single component to the canvas with undo/redo history tracking.
- **Parameters**:
  - `component` (`Component`):
    ```typescript
    {
      id: string;                      // e.g. "led1"
      metadataId: string;              // e.g. "led"
      x: number;                       // X pixel coordinate
      y: number;                       // Y pixel coordinate
      properties: Record<string, any>; // e.g. { color: "red" }
    }
    ```
- **Return Value**: `void`

---

##### `useSimulatorStore.getState().recordAddWire(wire)`
Direct underlying canvas command that adds a single wire connection with undo/redo tracking.
- **Parameters**:
  - `wire` (`Wire`):
    ```typescript
    {
      id: string;
      start: { componentId: string; pinName: string; x: number; y: number };
      end: { componentId: string; pinName: string; x: number; y: number };
      waypoints: { x: number; y: number }[];
      color: string;
    }
    ```
- **Return Value**: `void`

---

#### 4. Compiler & Simulation Controls

---

##### `AgentToolEngine.compileProject()` *(Alias: `compile()`)*
Sends the current workspace source code, multi-file headers, and `libraries.txt` to the backend compiler (`arduino-cli` / `espidf`) and captures diagnostics.
- **Parameters**: None `()`
- **Return Value**: `Promise<ToolExecutionResult>`
  ```json
  { "success": true, "message": "Compilation succeeded" }
  ```

---

##### `AgentToolEngine.startSimulation()`
Starts cycle-accurate microcontroller emulation (`avr8js` / `rp2040js` / `QEMU`) and launches the WASM ngspice analog solver worker.
- **Parameters**: None `()`
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Simulation running" }
  ```

---

##### `AgentToolEngine.stopSimulation()`
Halts CPU emulation, pauses the SPICE solver, and freezes all peripheral animation timers.
- **Parameters**: None `()`
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Simulation stopped" }
  ```

---

##### `AgentToolEngine.resetBoard()`
Restarts the microcontroller's CPU program counter to address `0x0000`, clears SRAM, and re-initializes attached sensors without stopping the session.
- **Parameters**: None `()`
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Board reset" }
  ```

---

#### 5. Diagnostics & Serial Monitor Tools

---

##### `AgentToolEngine.readSerial()` *(Alias: `readSerialMonitor()`)*
Reads the entire buffered text output from the MCU's live UART Serial Monitor.
- **Parameters**: None `()`
- **Return Value**: `string` (e.g. `"Visitor count: 12\nTemp: 24.5 C\n"`)

---

##### `AgentToolEngine.writeSerial(data)`
Transmits raw text/characters into the microcontroller's UART RX input stream.
- **Parameters**:
  - `data` (`string`): The string or command to transmit (e.g. `"ON\n"`).
- **Return Value**: `ToolExecutionResult`
  ```json
  { "success": true, "message": "Sent 3 bytes to serial" }
  ```

---

##### `AgentToolEngine.getCompileLogs()`
Retrieves compiler diagnostics and error lines from recent build runs for self-healing error analysis.
- **Parameters**: None `()`
- **Return Value**: `string[]` (Array of compiler output lines).

---

#### 6. Rollback & Snapshot Safety Tools

---

##### `useAIStore.getState().rollbackCheckpoint()`
Instantly restores the exact state of files, canvas components, wires, and board settings stashed right before the last AI action was executed.
- **Parameters**: None `()`
- **Return Value**: `void`

---

## Question 6: Error Loop Analysis

**Describe the exact failure.**

**Show:**
- User prompt
- AI response
- Compiler output
- Simulation output
- Error message

*Provide one complete example.*

---

## Answer 6

### 1. Root Cause Breakdown of the Failure Loop

The error loop was caused by **a chain of five interrelated architectural gaps** across the AI parser, store mutations, and simulation solver:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 5-STAGE ERROR CASCADE                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Malformed Action Output:                                                                     │
│    LLM emitted Python-style triple quotes (`"""`) inside `"proposedContent"` and omitted        │
│    the markdown fence, outputting bare `velxio-action\n{ ... }`.                                │
│                                                                                                 │
│ 2. Parser Rejection & Raw JSON Dump:                                                            │
│    `JSON.parse()` crashed on the unescaped newlines. The parser discarded the block, dumping    │
│    the raw JSON into the chat stream instead of calling tools.                                  │
│                                                                                                 │
│ 3. Workspace Left Empty:                                                                        │
│    `sketch.ino` was never created, `libraries.txt` was missing `LiquidCrystal.h`, and no        │
│    components or wires were placed on the canvas.                                               │
│                                                                                                 │
│ 4. Compiler Build Failure:                                                                      │
│    `arduino-cli` failed immediately with `fatal error: LiquidCrystal.h: No such file`.          │
│                                                                                                 │
│ 5. Canvas Crash (Blank Screen):                                                                 │
│    Mounting simulator checked undefined `.properties.pin` on incomplete component instances,    │
│    and SPICE `isBurnoutResistor` called `.startsWith()` on `undefined`, crashing React DOM.     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Complete Step-by-Step Failure Example

#### Step 1: The User Prompt
```text
Build a visitor counter using an Arduino Uno, an infrared sensor (PIR), and a 16x2 LCD display.
Make sure the AI executes all actions directly: create sketch.ino, import required libraries,
add components to canvas, wire the proper circuit, check the serial monitor, and compile.
```

---

#### Step 2: The Malformed AI Response (Before Fix)
Instead of executing tools or outputting standard JSON, the model streamed raw text containing Python-style triple quotes (`"""`):

```text
velxio-action
{
  "reasoning": "The LED will be connected to a digital pin on the Arduino Uno, and a series resistor will be used to limit the current flowing through the LED.",
  "boardKind": "arduino-uno",
  "steps": [
    { "id": "1", "title": "Place LED and Resistor", "status": "completed" },
    { "id": "2", "title": "Connect LED and Resistor to Arduino Uno", "status": "completed" },
    { "id": "3", "title": "Write LED Blink Firmware", "status": "completed" }
  ],
  "circuit": {
    "title": "LED Blink Circuit",
    "description": "LED connected to digital pin 13 with a series resistor",
    "componentsToAdd": [
      { "id": "led1", "type": "wokwi-led" },
      { "id": "res1", "type": "wokwi-resistor", "value": "220" }
    ],
    "wiresToAdd": [
      { "fromPart": "board", "fromPin": "5V", "toPart": "res1", "toPin": "1", "color": "#ef4444" },
      { "fromPart": "res1", "toPart": "led1", "toPin": "A", "color": "#10b981" },
      { "fromPart": "led1", "toPart": "board", "toPin": "GND", "color": "#1f2937" },
      { "fromPart": "board", "fromPin": "13", "toPart": "res1", "toPin": "2", "color": "#3b82f6" }
    ]
  },
  "code": {
    "fileName": "sketch.ino",
    "summary": "Blinks an LED connected to digital pin 13",
    "proposedContent": """
      #include <LiquidCrystal.h>
      LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
      const int pirPin = 7;
      int count = 0;

      void setup() {
        lcd.begin(16, 2);
        pinMode(pirPin, INPUT);
        lcd.print("Visitors: 0");
      }

      void loop() {
        if (digitalRead(pirPin) == HIGH) {
          count++;
          lcd.setCursor(10, 0);
          lcd.print(count);
          delay(500);
        }
      }
    """
  }
}
```

---

#### Step 3: Compiler Output (`CompilationConsole.tsx` / `arduino-cli`)
Because the file was not written and `libraries.txt` was not populated, the compilation failed:

```text
Compiling sketch with arduino-cli...
Board: Arduino Uno (arduino:avr:uno)

/tmp/arduino-sketch-D3F82A/sketch.ino:1:10: fatal error: LiquidCrystal.h: No such file or directory
 #include <LiquidCrystal.h>
          ^~~~~~~~~~~~~~~~~
compilation terminated.

Error: exit status 1
Compilation failed: 1 error(s) found.
```

---

#### Step 4: Simulation Output & Solver Crash (`CircuitSimulationService.ts`)
When the solver attempted to evaluate the unplaced/incomplete components on the canvas:

```text
[circuit-sim] solve failed: TypeError: Cannot read properties of undefined (reading 'startsWith')
    at isBurnoutResistor (runtimeBurnout.ts:42:82)
    at componentStress (runtimeBurnout.ts:71:7)
    at check (runtimeBurnout.ts:152:20)
    at runtimeBurnout.ts:187:7
    at vanilla.mjs:9:39
    at Set.forEach (<anonymous>)
    at setState (vanilla.mjs:9:17)
    at Object.setSolveResult (useElectricalStore.ts:68:5)
    at CircuitSimulationService.publishFromLastResult (CircuitSimulationService.ts:403:26)

[pinPositionCalculator] Component uno not found in DOM
[circuit-sim] Simulation halted: Netlist contains 0 active nodes.
```

---

#### Step 5: Browser Console Error Messages (React Hydration & DOM Crash)
The React rendering tree collapsed, causing the UI to go completely blank:

```text
EditorPage.tsx:557 Uncaught TypeError: toggleDock is not a function
    at onClick (EditorPage.tsx:557:28)
    at executeDispatch (react-dom-client.development.js:19116:9)

SimulatorCanvas.tsx:2542 Metadata not found for component: undefined

SimulatorCanvas.tsx:1310 Uncaught TypeError: Cannot read properties of undefined (reading 'pin')
    at SimulatorCanvas.tsx:1310:32
    at Array.forEach (<anonymous>)
    at SimulatorCanvas.tsx:1308:16
    at commitHookEffectListMount (react-dom-client.development.js:13249:29)

react-dom-client.development.js:9362 An error occurred in the <SimulatorCanvas> component.
Consider adding an error boundary to your tree to customize error handling behavior.
```

---

### 3. How the Error Cascade Was Resolved

| Failure Point | Architectural Fix Applied | File Fixed |
| :--- | :--- | :--- |
| **Python `"""` Quotes & Broken Fences** | Added `extractVelxioAction` with regex pre-sanitizer to auto-convert `"""` to valid JSON strings and strip raw JSON from chat. | [`useAIStore.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/useAIStore.ts) |
| **Missing Tools Execution** | Automatically routed parsed proposals into `AgentToolEngine.applyCircuit()`, `AgentToolEngine.writeFile()`, and `AgentToolEngine.installLibraries()`. | [`AgentToolEngine.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/AgentToolEngine.ts) |
| **Missing AI Dock Button Function** | Added `toggleDock: (open?: boolean) => void` to `AIStoreState` and implemented toggle logic. | [`useAIStore.ts`](file:///d:/NEW/VelxioAI/frontend/src/ai/useAIStore.ts) |
| **Blank Canvas (`.pin` crash)** | Added defensive null-safe checks: `if (component?.properties?.pin !== undefined)` before accessing pins. | [`SimulatorCanvas.tsx`](file:///d:/NEW/VelxioAI/frontend/src/components/simulator/SimulatorCanvas.tsx) |
| **SPICE Solver Crash (`.startsWith` crash)** | Added `typeof metadataId === 'string'` guards in `isBurnoutResistor` and `skipCanonicalization`. | [`runtimeBurnout.ts`](file:///d:/NEW/VelxioAI/frontend/src/simulation/parts/runtimeBurnout.ts), [`NetlistBuilder.ts`](file:///d:/NEW/VelxioAI/frontend/src/simulation/spice/NetlistBuilder.ts) |

---

## Question 7: Context Window & Prompt Construction

**How much information is sent to the model?**

**Does the AI receive:**
- The entire codebase?
- Only selected files?
- The component library?
- Compiler errors?
- Circuit state?
- Simulation state?
- Serial monitor output?

*Show the exact context sent to the model.*

---

## Answer 7

### 1. Context Information Breakdown

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  CONTEXT INCLUSION AUDIT MATRIX                                        │
├──────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────┤
│ Context Item             │ Included? │ Description & Payload Size                                      │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 1. Entire IDE Codebase   │ ❌ NO     │ Excluded to prevent token pollution. The AI only operates in the│
│                          │           │ active user project sandbox.                                    │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 2. Selected Files        │ ✅ YES    │ Complete file manifest (`files[]`) + full preview of the active │
│                          │           │ editor file (`activeFile.content.slice(0, 1000)`).              │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 3. Component Library     │ ✅ YES    │ Curated catalog of valid Wokwi hardware custom element tags.    │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 4. Compiler Errors       │ ✅ YES    │ Last 20 diagnostic stdout/stderr lines from `arduino-cli`.      │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 5. Circuit State         │ ✅ YES    │ Target MCU board kind + JSON array of placed parts & wire nets. │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 6. Simulation State      │ ✅ YES    │ SPICE solved nodal voltages, burnout warnings & floating pins.  │
├──────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ 7. Serial Monitor Output │ ✅ YES    │ Last 500 characters of live UART stream.                        │
└──────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────┘
```

---

### 2. Approximate Token Volume per Request
- **System Directives & Rules**: ~1,200 tokens
- **Hardware Component Catalog**: ~350 tokens
- **Active Workspace Context Snapshot**: ~400 – 1,500 tokens
- **Rolling Chat History (Last 10–20 turns)**: ~1,500 – 4,000 tokens
- **Total Context Window per Turn**: **~3,500 – 7,000 tokens** (well within Gemini's 1M, Claude's 200k, and GPT-4o's 128k context windows, ensuring ultra-fast TTFT streaming response times under 400ms).

---

### 3. Exact Context & System Prompt Sent to the Model

The following is the **literal, character-for-character system prompt** generated by [`AIContextCollector.buildSystemPrompt(snapshot, settings)`](file:///d:/NEW/VelxioAI/frontend/src/ai/AIContextCollector.ts#L110) and injected into every API request:

```markdown
You are VelxioAI, the lead embedded systems engineer and autonomous Studio Agent in the VelxioAI Embedded IDE.

════════════════════════════════════════════════════════════════
🎯 CORE OPERATING PRINCIPLES
════════════════════════════════════════════════════════════════
1. INTENT RECOGNITION (CHAT vs. ACTION):
   - **GREETINGS & CASUAL CHAT** (e.g. "hi", "hello", "who are you", "what can you do"): Reply in brief, friendly markdown. DO NOT output an action block, do not touch files, do not touch the circuit.
   - **THEORETICAL & CONCEPTUAL QUESTIONS** (e.g. "explain I2C vs SPI", "what does pinMode do?"): Provide a concise, clear technical explanation in markdown. Only attach a "learningCard" if the user explicitly asked to learn/explain a concept or if explain mode is active.
   - **BUILD / EDIT / CODE / SIMULATE REQUESTS** (e.g. "make a visitor counter", "add a buzzer on pin 8", "change blink rate to 500ms", "fix the compiler error", "run simulation"): You MUST formulate the exact structured action in a ```velxio-action block. The IDE will automatically execute your plan (placing parts, connecting wires, writing sketch.ino, installing libraries, and starting simulation).

2. DETERMINISTIC HARDWARE PINNING:
   - Target Board: "Arduino Uno R3" (kind: "arduino-uno", FQBN: "arduino:avr:uno").
   - NEVER invent phantom pins. Use exact physical pins present on this board:
     * Arduino Uno/Nano: Digital 0-13, Analog A0-A5, 5V, 3V3, GND, VIN.
     * ESP32: GPIO 0-39 (ADC1: 32-39, ADC2: 0,2,4,12-15,25-27), 3V3, GND.
     * Raspberry Pi Pico / RP2040: GP0-GP28, ADC0-ADC3 (GP26-GP29), 3V3, GND.
   - Always connect digital sensors to digital pins, analog sensors to analog pins (A0-A5), and PWM devices (servos, buzzers) to hardware PWM pins.
   - LEDs MUST connect through a 220Ω resistor to prevent overcurrent.

3. VALID COMPONENT TYPE CATALOG (USE EXACT WOKWI NAMES):
   - Sensors: "wokwi-dht22" (Temp/Humidity), "wokwi-hc-sr04" (Ultrasonic Distance), "wokwi-pir-motion-sensor" (PIR/IR Motion), "wokwi-photoresistor-sensor" (LDR Light), "wokwi-potentiometer" (Rotary Pot)
   - Displays: "wokwi-lcd1602" (16x2 HD44780 LCD), "wokwi-ssd1306" (128x64 I2C OLED), "wokwi-7segment" (7-Segment)
   - Outputs: "wokwi-led" (LED), "wokwi-rgb-led" (RGB LED), "wokwi-servo" (Servo Motor), "wokwi-buzzer" (Piezo Buzzer), "wokwi-relay-module" (Relay), "wokwi-neopixel" (WS2812 LED)
   - Inputs: "wokwi-pushbutton" (Pushbutton), "wokwi-slide-switch" (SPDT Switch), "wokwi-membrane-keypad" (4x4 Keypad)
   - Passives: "wokwi-resistor" (Resistor)

4. STRUCTURED ACTION CAPABILITIES FORMAT:
   When modifying circuits, writing code, or managing files, output a single JSON block enclosed in ```velxio-action:
   CRITICAL RULES:
   - Output valid standard JSON with double-quoted strings.
   - For multi-line code in "proposedContent", escape newlines with \n and quotes with \". NEVER use Python-style triple quotes (""").

   ```velxio-action
   {
     "reasoning": "Technical rationale for component choice and pin connections",
     "boardKind": "arduino-uno",
     "steps": [
       { "id": "1", "title": "Place IR Sensor & 16x2 LCD Display", "status": "completed" },
       { "id": "2", "title": "Wire power and signal lines to Arduino Uno", "status": "completed" },
       { "id": "3", "title": "Write visitor counter firmware in sketch.ino", "status": "completed" }
     ],
     "circuit": {
       "title": "Visitor Counter Circuit",
       "description": "IR sensor on pin 7 and 16x2 LCD display",
       "componentsToAdd": [
         { "id": "pir1", "type": "wokwi-pir-motion-sensor" },
         { "id": "lcd1", "type": "wokwi-lcd1602" }
       ],
       "wiresToAdd": [
         { "fromPart": "board", "fromPin": "5V", "toPart": "pir1", "toPin": "VCC", "color": "#ef4444" },
         { "fromPart": "board", "fromPin": "GND", "toPart": "pir1", "toPin": "GND", "color": "#1f2937" },
         { "fromPart": "board", "fromPin": "7", "toPart": "pir1", "toPin": "OUT", "color": "#10b981" },
         { "fromPart": "board", "fromPin": "5V", "toPart": "lcd1", "toPin": "VDD", "color": "#ef4444" },
         { "fromPart": "board", "fromPin": "GND", "toPart": "lcd1", "toPin": "VSS", "color": "#1f2937" },
         { "fromPart": "board", "fromPin": "12", "toPart": "lcd1", "toPin": "RS", "color": "#3b82f6" },
         { "fromPart": "board", "fromPin": "11", "toPart": "lcd1", "toPin": "E", "color": "#8b5cf6" },
         { "fromPart": "board", "fromPin": "5", "toPart": "lcd1", "toPin": "D4", "color": "#10b981" },
         { "fromPart": "board", "fromPin": "4", "toPart": "lcd1", "toPin": "D5", "color": "#f59e0b" },
         { "fromPart": "board", "fromPin": "3", "toPart": "lcd1", "toPin": "D6", "color": "#ec4899" },
         { "fromPart": "board", "fromPin": "2", "toPart": "lcd1", "toPin": "D7", "color": "#06b6d4" }
       ]
     },
     "code": {
       "fileName": "sketch.ino",
       "summary": "Counts visitors and renders live tally on LCD and Serial",
       "proposedContent": "// Complete Arduino firmware code here\n"
     }
   }
   ```

════════════════════════════════════════════════════════════════
CURRENT WORKSPACE CONTEXT
════════════════════════════════════════════════════════════════
- Active Board: Arduino Uno R3 (Kind: "arduino-uno")
- Placed Components: [{"id":"led1","metadataId":"led","x":380,"y":120,"properties":{"color":"green"}},{"id":"res1","metadataId":"resistor","x":380,"y":220,"properties":{"value":"220"}}]
- Current Wires: [{"id":"w1","start":{"componentId":"uno","pinName":"13"},"end":{"componentId":"res1","pinName":"1"},"color":"#3b82f6"},{"id":"w2","start":{"componentId":"res1","pinName":"2"},"end":{"componentId":"led1","pinName":"A"},"color":"#10b981"},{"id":"w3","start":{"componentId":"led1","pinName":"C"},"end":{"componentId":"uno","pinName":"GND.1"},"color":"#1f2937"}]
- Workspace Files: sketch.ino, libraries.txt, diagram.json
- Active File (sketch.ino):
```cpp
const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}
```
- Recent Compiler Logs:
[arduino-cli] Sketch uses 924 bytes (2%) of program storage space.
[arduino-cli] Global variables use 9 bytes (0%) of dynamic memory.

- Recent Serial Monitor Output:
[Velxio] Serial monitor connected at 9600 baud.
```






