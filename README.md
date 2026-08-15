# 🧠 VelxioAI: The AI-Native Embedded Hardware Studio

**Repository: [github.com/KunalGhadge/velxioAI](https://github.com/KunalGhadge/velxioAI)**  
**Author & Lead Architect: [Kunal Ghadge](https://github.com/KunalGhadge)**

VelxioAI is the world's first **AI-Native Embedded Studio & Hardware Emulator** (analogous to what Cursor and Antigravity are to VS Code). It empowers complete beginners with **zero prior coding or electronics knowledge** as well as seasoned embedded engineers to design, build, auto-wire, compile, self-heal, and simulate complete microcontroller projects effortlessly in the browser.

---

### 🚀 Key AI Features:
- 🧠 **Multi-Model BYOK (Bring Your Own Key)**: Seamlessly switch between **Google Gemini** (Gemini 2.0 Flash / 1.5 Pro), **Groq** (Llama 3.3 70B & DeepSeek R1 at 500+ tok/s), **Anthropic Claude**, **OpenAI**, and **Local Ollama**.
- 🔄 **Multi-Key Pool & Auto-Rotation**: Paste multiple API keys per provider. When a key hits rate limits (429 / quota limits), VelxioAI seamlessly auto-rotates to the next key without interrupting you.
- 🔌 **Natural Language Hardware Composer**: Type *"Build a plant watering monitor with an ultrasonic sensor and buzzer"* and watch VelxioAI place parts on the canvas, route all power and GPIO wires, and write the complete firmware sketch in one click.
- 🩺 **Self-Healing Real-Time Diagnostics**: Automatically diagnoses compilation errors, floating inputs, timer clashes, and SPICE short-circuits, providing instant 1-click code patches and circuit fixes.
- 🎓 **Interactive 2-Minute Hardware Tutor Cards**: Visual, illustrated explanations for beginners breaking down electronic concepts (pull-up resistors, PWM duty cycles, I2C address scanning, voltage dividers).
- 📦 **1-Click Bill of Materials (BOM) & Breadboard Guide**: Converts simulated projects into real-world shopping lists and step-by-step breadboarding guides.
- ⚡ **Non-Overlapping Resizable Studio Dock**: Right-side dock with proportional workspace scaling and global `Ctrl+L` / `Cmd+L` quick toggle.

---

**19 boards &middot; 5 CPU architectures**: AVR8 (ATmega / ATtiny), ARM Cortex-M0+ (RP2040), RISC-V RV32IMC/EC (ESP32-C3 / CH32V003), Xtensa LX6/LX7 (ESP32 / ESP32-S3 via QEMU), and ARM Cortex-A53 (Raspberry Pi 3 Linux via QEMU).

[![GitHub Repo](https://img.shields.io/badge/GitHub-KunalGhadge%2FvelxioAI-007acc?style=for-the-badge&logo=github)](https://github.com/KunalGhadge/velxioAI)
[![License: AGPLv3](https://img.shields.io/badge/License-AGPL%20v3-blue?style=for-the-badge)](LICENSE)

---

## Hardware Partners

These companies have supported Velxio and provided their hardware so their components can be emulated accurately:

<p align="center">
  <a href="https://www.dfrobot.com/"><img src="docs/partners/dfrobot.png" alt="DFRobot" width="150"></a>&nbsp;
  <a href="https://www.espressif.com/"><img src="docs/partners/espressif.png" alt="Espressif" width="150"></a>&nbsp;
  <a href="https://m5stack.com/"><img src="docs/partners/m5stack.png" alt="M5Stack" width="150"></a>&nbsp;
  <a href="https://www.seeedstudio.com/"><img src="docs/partners/seeed-studio.png" alt="Seeed Studio" width="150"></a>&nbsp;
  <a href="https://pimoroni.com/"><img src="docs/partners/pimoroni.png" alt="Pimoroni" width="150"></a>
</p>

---

## Screenshots

![Raspberry Pi Pico ADC simulation with Serial Monitor](docs/img1.png)

Raspberry Pi Pico simulation — ADC read test with two potentiometers, Serial Monitor showing live output, and compilation console at the bottom.

![ILI9341 TFT display simulation on Arduino Uno](docs/img2.png)

Arduino Uno driving an ILI9341 240×320 TFT display via SPI — rendering a real-time graphics demo using Adafruit_GFX + Adafruit_ILI9341.

![Library Manager with full library list](docs/img3.png)

Library Manager loads the full Arduino library index on open — browse and install libraries without typing first.

![Component Picker with 48 components](docs/img4.png)

Component Picker showing 48 available components with visual previews, search, and category filters.

![Raspberry Pi 3 connected to Arduino on the same canvas](docs/img5.png)

Multi-board simulation — Raspberry Pi 3 and Arduino running simultaneously on the same canvas, connected via serial. Mix different architectures in a single circuit.

![ESP32 with HC-SR04 ultrasonic sensor](docs/img6.png)

ESP32 simulation with an HC-SR04 ultrasonic distance sensor — real Xtensa emulation via QEMU with trigger/echo GPIO timing.

---

## Supported Boards

<table>
<tr>
  <td align="center"><img src="docs/img/boards/pi-pico.png" width="140" alt="Raspberry Pi Pico"/><br/><b>Raspberry Pi Pico</b></td>
  <td align="center"><img src="docs/img/boards/pi-pico-w.png" width="140" alt="Raspberry Pi Pico W"/><br/><b>Raspberry Pi Pico W</b></td>
  <td align="center"><img src="docs/img/boards/esp32-devkit-c-v4.png" width="140" alt="ESP32 DevKit C"/><br/><b>ESP32 DevKit C</b></td>
  <td align="center"><img src="docs/img/boards/esp32-s3.png" width="140" alt="ESP32-S3"/><br/><b>ESP32-S3</b></td>
</tr>
<tr>
  <td align="center"><img src="docs/img/boards/esp32-c3.png" width="140" alt="ESP32-C3"/><br/><b>ESP32-C3</b></td>
  <td align="center"><img src="docs/img/boards/xiao-esp32-c3.png" width="140" alt="Seeed XIAO ESP32-C3"/><br/><b>Seeed XIAO ESP32-C3</b></td>
  <td align="center"><img src="docs/img/boards/esp32c3-supermini.png" width="140" alt="ESP32-C3 SuperMini"/><br/><b>ESP32-C3 SuperMini</b></td>
  <td align="center"><img src="docs/img/boards/esp32-cam.png" width="140" alt="ESP32-CAM"/><br/><b>ESP32-CAM</b></td>
</tr>
<tr>
  <td align="center"><img src="docs/img/boards/xiao-esp32-s3.png" width="140" alt="Seeed XIAO ESP32-S3"/><br/><b>Seeed XIAO ESP32-S3</b></td>
  <td align="center"><img src="docs/img/boards/arduino-nano-esp32.png" width="140" alt="Arduino Nano ESP32"/><br/><b>Arduino Nano ESP32</b></td>
  <td align="center"><img src="docs/img/boards/Raspberry_Pi_3.png" width="140" alt="Raspberry Pi 3B"/><br/><b>Raspberry Pi 3B</b></td>
  <td align="center">Arduino Uno &middot; Nano &middot; Mega 2560<br/>ATtiny85 &middot; Leonardo &middot; Pro Mini<br/>(AVR8 / ATmega)</td>
</tr>
</table>

| Board | CPU | Engine | Language |
| ----- | --- | ------ | -------- |
| **Arduino Uno** | ATmega328p @ 16 MHz | avr8js (browser) | C++ (Arduino) |
| **Arduino Nano** | ATmega328p @ 16 MHz | avr8js (browser) | C++ (Arduino) |
| **Arduino Mega 2560** | ATmega2560 @ 16 MHz | avr8js (browser) | C++ (Arduino) |
| **ATtiny85** | ATtiny85 @ 8 MHz (int) / 16 MHz (ext) | avr8js (browser) | C++ (Arduino) |
| **Arduino Leonardo** | ATmega32u4 @ 16 MHz | avr8js (browser) | C++ (Arduino) |
| **Arduino Pro Mini** | ATmega328p @ 8/16 MHz | avr8js (browser) | C++ (Arduino) |
| **Raspberry Pi Pico** | RP2040 @ 133 MHz | rp2040js (browser) | C++ (Arduino) |
| **Raspberry Pi Pico W** | RP2040 @ 133 MHz | rp2040js (browser) | C++ (Arduino) |
| **ESP32 DevKit V1** | Xtensa LX6 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **ESP32 DevKit C V4** | Xtensa LX6 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **ESP32-S3** | Xtensa LX7 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **ESP32-CAM** | Xtensa LX6 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **Seeed XIAO ESP32-S3** | Xtensa LX7 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **Arduino Nano ESP32** | Xtensa LX6 @ 240 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **ESP32-C3 DevKit** | RISC-V RV32IMC @ 160 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **Seeed XIAO ESP32-C3** | RISC-V RV32IMC @ 160 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **ESP32-C3 SuperMini** | RISC-V RV32IMC @ 160 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **CH32V003** | RISC-V RV32EC @ 48 MHz | QEMU lcgamboa (backend) | C++ (Arduino) |
| **Raspberry Pi 3B** | ARM Cortex-A53 @ 1.2 GHz | QEMU raspi3b (backend) | Python |

---

## Features

### Code Editing & Hardware AI
- **VelxioAI Studio Dock (`Ctrl+L`)** — Multi-model BYOK chat and autonomous hardware composer
- **Monaco Editor** — Full C++ / Python editor with syntax highlighting, autocomplete, minimap, and dark theme
- **Multi-file workspace** — create, rename, delete, and switch between multiple `.ino` / `.h` / `.cpp` / `.py` files
- **Arduino compilation** via `arduino-cli` backend — compile sketches to `.hex` / `.bin` files

### Emulation Engines

#### AVR (avr8js)
- Cycle-accurate ATmega328p, ATmega2560, and ATtiny85 CPU emulation
- Timers, PWM, ADC, GPIO, USART, SPI, I2C, EEPROM

#### RP2040 (rp2040js)
- Dual ARM Cortex-M0+ cores @ 133 MHz
- SIO GPIO, PWM slices, ADC, UART, SPI, I2C, PIO state machines

#### ESP32 / ESP32-S3 (QEMU Xtensa)
- Real Xtensa LX6 / LX7 dual-core execution with full FreeRTOS and ESP-IDF support
- Hardware peripherals, GPIO matrix, SAR ADC, hardware timers, WiFi stack emulation

#### ESP32-C3 & CH32V003 (QEMU RISC-V)
- RV32IMC emulation through QEMU with `esp32c3-picsimlab` machine
- GPIO matrix, UART, SAR ADC

#### Raspberry Pi 3B (QEMU ARM64 Linux)
- Full BCM2837 emulation via `qemu-system-aarch64 -M raspi3b`
- Boots real Raspberry Pi OS (Trixie) and executes Python scripts
- Multi-board serial bridge communicating with microcontrollers on the same canvas

### Component System (48+ Components)
- 48 electronic components from wokwi-elements
- Component picker with search, category filters, and live previews
- Drag-and-drop repositioning and 90° rotation on canvas
- Direct SPICE circuit verification (short circuits, LED overcurrent, logic levels)

---

## ⌨️ Keyboard Shortcuts & AI Commands

### Global & Editor Shortcuts
| Shortcut | Action | Scope |
| --- | --- | --- |
| `Ctrl+L` / `Cmd+L` | Toggle VelxioAI Studio dock | Global |
| `Ctrl+Enter` / `Cmd+Enter` | Compile firmware sketch | Editor |
| `Ctrl+S` / `Cmd+S` | Save project sketch (.vlx snapshot) | Global |
| `Ctrl+R` / `Cmd+R` | Start / Stop simulation | Global |
| `Delete` / `Backspace` | Delete selected component or wire | Canvas |
| `R` | Rotate selected component 90° | Canvas |
| `Esc` | Close modal dialogs / cancel wire routing | Global |

### ⚡ AI Studio Slash Commands (`/`)
| Command | Action |
| --- | --- |
| `/fix` | Auto-diagnose and patch compiler errors or circuit wiring faults |
| `/build` | Generate a complete circuit schematic + firmware from description |
| `/wire` | Auto-route all power, ground, and GPIO wires on the canvas |
| `/explain` | Open 2-minute visual hardware insight cards |
| `/bom` | Generate Bill of Materials & real-world breadboarding steps |
| `/refactor` | Convert blocking `delay()` loops into non-blocking `millis()` |
| `/audit` | Run pin conflict watchdog and electrical logic safety analysis |
| `/clear` | Clear AI Studio conversation history |

### 📎 AI Context Tags (`@`)
| Tag | Context Attached |
| --- | --- |
| `@board` | Current active board specifications, pinout ratings, and architecture |
| `@circuit` | Complete simulation canvas netlist and wire connections |
| `@serial` | Live Serial Monitor logs and recent UART outputs |
| `@errors` | Compiler error diagnostics and SPICE electrical warnings |
| `@file:<name>` | Specific firmware sketch file content |
| `@component:<id>` | Specific placed component attributes and pin states |

---

## Development Setup

**Prerequisites:** Node.js 18+, Python 3.12+, arduino-cli

```bash
git clone https://github.com/KunalGhadge/velxioAI.git
cd velxioAI
```

```bash
# Terminal 1 — Backend (FastAPI)
cd backend
python -m venv venv
venv\Scripts\activate          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

```bash
# Terminal 2 — Frontend (React + Vite + TypeScript)
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> to launch **VelxioAI Studio**.

---

## Project Structure

```text
velxioAI/
├── frontend/                    # React 19 + Vite 7 + TypeScript 5.9
│   └── src/
│       ├── ai/                  # VelxioAI Engine (BYOK, Context Collector, Guardrails)
│       ├── pages/               # LandingPage, EditorPage, ...
│       ├── components/          # AI Dock, Diff Cards, Canvas, Monaco Editor
│       ├── simulation/          # AVRSimulator, RP2040Simulator, Esp32Bridge
│       ├── store/               # Zustand stores (AI, editor, simulator, electrical)
│       └── services/            # Backend API clients
├── backend/                     # FastAPI + Python
│   └── app/
│       ├── api/routes/          # compile, libraries, simulation (ws)
│       └── services/            # arduino_cli, qemu_manager, esp32_worker
└── docs/                        # Technical documentation & images
```

---

## Contributing & Issues

Suggestions and pull requests are welcome at:  
**[github.com/KunalGhadge/velxioAI](https://github.com/KunalGhadge/velxioAI)**

## License

VelxioAI is licensed under the **AGPLv3 License** — see [LICENSE](LICENSE) for full details.
