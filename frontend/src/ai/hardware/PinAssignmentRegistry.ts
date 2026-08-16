/**
 * VelxioAI Studio — Pin Assignment Registry
 *
 * Tracks every physical pin allocation made by PinAllocator and provides
 * seamless C/C++ firmware `#define` synchronization so that firmware code
 * is guaranteed to match the physical circuit wiring 100% of the time.
 */

export interface PinAssignment {
  componentId: string;
  componentPin: string;
  boardPin: string;
  signalType?: string;
  constantName: string;
}

export class PinAssignmentRegistry {
  private static instance: PinAssignmentRegistry;
  private assignments: Map<string, PinAssignment> = new Map();

  private constructor() {}

  public static getInstance(): PinAssignmentRegistry {
    if (!PinAssignmentRegistry.instance) {
      PinAssignmentRegistry.instance = new PinAssignmentRegistry();
    }
    return PinAssignmentRegistry.instance;
  }

  /**
   * Registers a hardware pin assignment.
   */
  public assign(
    componentId: string,
    componentPin: string,
    boardPin: string,
    signalType?: string,
    customConstant?: string
  ): void {
    const key = `${componentId}:${componentPin}`.toUpperCase();
    const cleanComp = componentId.toUpperCase().replace(/[-]/g, '_');
    const cleanPin = componentPin.toUpperCase().replace(/[-.]/g, '_');

    let constantName = customConstant;
    if (!constantName) {
      if (cleanPin === 'PWM' || cleanPin === 'A' || cleanPin === 'OUT' || cleanPin === 'SIG' || cleanPin === 'SDA') {
        constantName = `${cleanComp}_PIN`;
      } else {
        constantName = `${cleanComp}_${cleanPin}_PIN`;
      }
    }

    this.assignments.set(key, {
      componentId,
      componentPin,
      boardPin,
      signalType,
      constantName,
    });
  }

  public getBoardPin(componentId: string, componentPin: string): string | undefined {
    const key = `${componentId}:${componentPin}`.toUpperCase();
    return this.assignments.get(key)?.boardPin;
  }

  public getComponentAssignments(componentId: string): PinAssignment[] {
    const results: PinAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (a.componentId.toLowerCase() === componentId.toLowerCase()) {
        results.push(a);
      }
    }
    return results;
  }

  public getAllAssignments(): PinAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Exports an associative map of `#define` constants to board pin numbers.
   * e.g. { "LED1_PIN": "3", "SONAR1_TRIG_PIN": "9", "SONAR1_ECHO_PIN": "10" }
   */
  public exportFirmwareConstants(): Record<string, string> {
    const constants: Record<string, string> = {};
    for (const a of this.assignments.values()) {
      constants[a.constantName] = a.boardPin;
    }
    return constants;
  }

  /**
   * Generates a clean C/C++ `#define` header block.
   */
  public generateHeaderBlock(): string {
    const constants = this.exportFirmwareConstants();
    const entries = Object.entries(constants);
    if (entries.length === 0) return '';

    const lines = [
      '// --- Hardware Pin Definitions (Auto-Synchronized by VelxioAI) ---',
      ...entries.map(([name, pin]) => `#define ${name} ${pin}`),
      '// ----------------------------------------------------------------',
    ];
    return lines.join('\n');
  }

  /**
   * Synchronizes existing C/C++ firmware code by replacing existing #define
   * constants or prepending the authoritative hardware pin definitions header.
   */
  public synchronizeFirmwareCode(codeContent: string): string {
    if (!codeContent) return this.generateHeaderBlock();

    let updatedCode = codeContent;
    const constants = this.exportFirmwareConstants();

    // 1. Replace existing defined constants with authoritative pin assignments
    for (const [name, pin] of Object.entries(constants)) {
      const defineRegex = new RegExp(`(#define\\s+${name}\\s+)[^\\r\\n]+`, 'g');
      if (defineRegex.test(updatedCode)) {
        updatedCode = updatedCode.replace(defineRegex, `$1${pin}`);
      }
    }

    // 2. If the auto-sync header block is not yet present, inject it at top
    const hasHeaderBlock = updatedCode.includes('// --- Hardware Pin Definitions');
    if (!hasHeaderBlock) {
      const headerBlock = this.generateHeaderBlock();
      if (headerBlock) {
        updatedCode = `${headerBlock}\n\n${updatedCode.trimStart()}`;
      }
    }

    return updatedCode;
  }

  /**
   * Clears all registered pin assignments.
   */
  public clear(): void {
    this.assignments.clear();
  }
}
