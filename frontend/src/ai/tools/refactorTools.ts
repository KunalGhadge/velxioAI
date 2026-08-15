/**
 * VelxioAI Studio — Code Refactoring & Optimization Actuators
 *
 * Provides specialized refactoring tools:
 * 1. Blocking delay() -> Non-blocking millis() state-machine transformation
 * 2. PROGMEM / F() macro string literal RAM optimizer for AVR (Uno/Nano)
 */

export class RefactorTools {
  /**
   * Transforms raw String literals inside Serial.print() / Serial.println()
   * to use the Flash-memory saving F() macro on AVR boards.
   */
  public static optimizeSerialStrings(code: string): string {
    // Matches Serial.print("hello") or Serial.println("world") not already wrapped in F()
    return code.replace(
      /Serial\.(print|println)\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\)/g,
      (match, method, str) => {
        return `Serial.${method}(F("${str}"))`;
      }
    );
  }

  /**
   * Generates a template for converting blocking delay loop to non-blocking millis()
   */
  public static generateMillisTemplate(intervalMs = 1000): string {
    return `// Non-blocking timer variables
unsigned long previousMillis = 0;
const long interval = ${intervalMs}; // interval in milliseconds

void setup() {
  // Initialize peripherals
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Put your periodic task here without freezing sensors or displays!
  }

  // Other sensors and buttons continue running smoothly here
}
`;
  }
}
