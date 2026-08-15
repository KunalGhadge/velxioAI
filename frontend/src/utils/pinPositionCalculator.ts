/**
 * Pin Position Calculator
 *
 * Converts pin coordinates from element space to canvas space (pixels).
 * This is the CRITICAL piece for wire system - without accurate pin positions,
 * wires cannot connect properly to components.
 *
 * Coordinate Systems:
 * 1. Element Space: Pin positions in pinInfo are in CSS pixels relative to element origin
 * 2. Canvas Space: Absolute positioning in pixels on the canvas
 *
 * Note: wokwi-elements pinInfo x/y are already in CSS pixels.
 */

/**
 * Calculates the absolute canvas position of a specific pin.
 *
 * @param componentId - The DOM ID of the component element
 * @param pinName - The name of the pin (e.g., 'A', 'C', 'GND.1', '13')
 * @param componentX - Component's X position on canvas (pixels). For a
 *   rotated component this is still the UNROTATED inner-element top-left
 *   (callers already add the wrapper offset of 4 horizontal / 6 vertical).
 * @param componentY - Component's Y position on canvas (pixels)
 * @param rotation - Optional CSS rotation in degrees applied to the
 *   component's wrapper (0 / 90 / 180 / 270). When non-zero the pin
 *   position is rotated around the wrapper's center so wire endpoints
 *   land on the visually-rotated pin instead of the old layout-space pin.
 * @returns Absolute canvas coordinates { x, y } or null if pin not found
 */
export function calculatePinPosition(
  componentId: string,
  pinName: string,
  componentX: number,
  componentY: number,
  rotation: number = 0,
): { x: number; y: number } | null {
  // Get the DOM element with fallback for MCU boards
  let element = document.getElementById(componentId);
  if (!element) {
    const lowerId = (componentId || '').toLowerCase().replace(/[-_]/g, '');
    if (lowerId === 'uno' || lowerId === 'arduinouno' || lowerId === 'arduino' || lowerId === 'board' || lowerId === 'mcu') {
      element = document.getElementById('arduino-uno') || document.querySelector('wokwi-arduino-uno');
    } else if (lowerId.includes('esp32')) {
      element = document.querySelector('wokwi-esp32-devkit-v1') || document.querySelector('velxio-esp32');
    } else if (lowerId.includes('pico')) {
      element = document.querySelector('velxio-pi-pico-w') || document.querySelector('wokwi-pi-pico');
    }
  }

  if (!element) {
    return null;
  }

  // Access the pinInfo property (all wokwi-elements expose this)
  const pinInfo = (element as any).pinInfo;
  if (!pinInfo || !Array.isArray(pinInfo)) {
    return null;
  }

  const normPin = pinName.trim().toUpperCase();

  // 1. Direct exact or case-insensitive match
  let pin = pinInfo.find((p: any) => p.name === pinName || (p.name && p.name.toUpperCase() === normPin));

  // 2. Numbered variant fallback (e.g. GND → GND.1, 5V → 5V.1)
  if (!pin && !pinName.includes('.')) {
    pin = pinInfo.find((p: any) => p.name === `${pinName}.1` || (p.name && p.name.toUpperCase() === `${normPin}.1`));
  }

  // 3. Power pin aliases (VCC <-> VDD <-> 5V <-> V+)
  if (!pin && (normPin === 'VCC' || normPin === 'VDD' || normPin === '5V' || normPin === '3V3' || normPin === 'V+' || normPin === 'PWR')) {
    const powerCandidates = ['VDD', 'VCC', 'V+', '5V', '5V.1', '3V3', 'VIN', 'V', 'VBUS'];
    for (const cand of powerCandidates) {
      pin = pinInfo.find((p: any) => p.name && p.name.toUpperCase() === cand);
      if (pin) break;
    }
  }

  // 4. Ground pin aliases (GND <-> VSS <-> 0V <-> GROUND)
  if (!pin && (normPin === 'GND' || normPin === 'VSS' || normPin === '0V' || normPin === 'GROUND' || normPin === 'COM')) {
    const gndCandidates = ['VSS', 'GND', 'GND.1', 'GND.2', 'GND.3', '0V', 'K'];
    for (const cand of gndCandidates) {
      pin = pinInfo.find((p: any) => p.name && p.name.toUpperCase() === cand);
      if (pin) break;
    }
  }

  // 5. LED Anode/Cathode aliases
  if (!pin && (normPin === 'ANODE' || normPin === '+')) {
    pin = pinInfo.find((p: any) => p.name && (p.name.toUpperCase() === 'A' || p.name.toUpperCase() === 'ANODE'));
  }
  if (!pin && (normPin === 'CATHODE' || normPin === '-')) {
    pin = pinInfo.find((p: any) => p.name && (p.name.toUpperCase() === 'C' || p.name.toUpperCase() === 'CATHODE'));
  }

  // 6. Digital pin prefix fallback (e.g. 'D13' <-> '13')
  if (!pin && normPin.startsWith('D')) {
    const stripped = normPin.substring(1);
    pin = pinInfo.find((p: any) => p.name && (p.name.toUpperCase() === stripped || p.name.toUpperCase() === normPin));
  } else if (!pin && /^\d+$/.test(normPin)) {
    pin = pinInfo.find((p: any) => p.name && (p.name.toUpperCase() === `D${normPin}` || p.name.toUpperCase() === normPin));
  }

  // 7. GP-prefix → match description field (e.g. 'GP15' → description 'GPIO15')
  if (!pin && normPin.startsWith('GP')) {
    const gpioNum = parseInt(normPin.substring(2), 10);
    if (!isNaN(gpioNum)) {
      pin = pinInfo.find((p: any) => p.description && p.description.toUpperCase() === `GPIO${gpioNum}`);
    }
  }

  if (!pin) {
    if (import.meta.env.MODE !== 'test') {
      console.warn(`[pinPositionCalculator] Pin ${pinName} not found on component ${componentId}`);
      console.warn(
        `Available pins:`,
        pinInfo.map((p: any) => p.name),
      );
    }
    return null;
  }

  // Unrotated pin position in canvas space.
  let pinX = componentX + pin.x;
  let pinY = componentY + pin.y;

  // Rotation: the DynamicComponent wrapper applies
  //   transform: rotate(<deg>deg);  transform-origin: center center;
  // around its OWN center (the wrapper, not the inner web component). So
  // when the user rotates 90° the pin moves on an arc centered on the
  // wrapper center, not on the component origin or the pin's own axis.
  //
  // We compute the wrapper center in canvas space from `offsetWidth /
  // offsetHeight` of the wrapper — those reflect the layout box and are
  // UNAFFECTED by CSS transforms, so reading them right after a state
  // change but before React commits the new transform is safe.
  //
  // Wrapper top-left ≈ inner-element top-left minus the wrapper padding
  // + border. The DynamicComponent wrapper has padding:4px + border:2px
  // on EVERY side → the inner element sits 6 px in from the wrapper on
  // both axes. updateWirePositions / recalculateAllWirePositions add
  // (+6, +6) to component.x / component.y to land on the inner-element
  // top-left, so the wrapper top-left is (componentX - 6, componentY - 6).
  // The earlier code used (+4, +6) — a 2 px X bias that was invisible
  // unrotated (a wire endpoint two pixels off looks fine) but rotated
  // with the component, surfacing as an obvious "wires disconnected
  // from the pin" once the user pressed R.
  const angle = ((rotation % 360) + 360) % 360;
  if (angle !== 0) {
    const wrapper = element.closest('.dynamic-component-wrapper') as HTMLElement | null;
    if (wrapper) {
      const wrapperW = wrapper.offsetWidth;
      const wrapperH = wrapper.offsetHeight;
      const wrapperLeft = componentX - 6;
      const wrapperTop = componentY - 6;
      const pivotX = wrapperLeft + wrapperW / 2;
      const pivotY = wrapperTop + wrapperH / 2;
      const theta = (angle * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const dx = pinX - pivotX;
      const dy = pinY - pivotY;
      pinX = pivotX + (dx * cos - dy * sin);
      pinY = pivotY + (dx * sin + dy * cos);
    }
  }

  return { x: pinX, y: pinY };
}

/**
 * Rotate a pin's element-space (x, y) around the DynamicComponent wrapper
 * centre, returning coordinates LOCAL to the pin-overlay container (whose
 * origin is the inner element top-left, i.e. component pos + wrapper inset).
 *
 * Shared by every always-/hover-rendered pin layer (wire-target boxes,
 * seated-pin markers) so they can never drift apart: the wrapper is rotated
 * by CSS `transform: rotate()` about `center center`, but the overlay layers
 * live OUTSIDE that wrapper and must reproduce the rotation manually.
 * `wrapperBox` is the wrapper's UNROTATED layout box (offsetWidth/Height),
 * which is what CSS rotates around; pass null (or angle 0) to skip rotation.
 */
export function rotatePinLocal(
  x: number,
  y: number,
  rotation: number,
  wrapperBox: { w: number; h: number } | null,
  wrapperOffsetX: number,
  wrapperOffsetY: number,
): { x: number; y: number } {
  const angle = ((rotation % 360) + 360) % 360;
  if (angle === 0 || !wrapperBox) return { x, y };
  const pivotX = -wrapperOffsetX + wrapperBox.w / 2;
  const pivotY = -wrapperOffsetY + wrapperBox.h / 2;
  const theta = (angle * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dx = x - pivotX;
  const dy = y - pivotY;
  return { x: pivotX + dx * cos - dy * sin, y: pivotY + dx * sin + dy * cos };
}

/**
 * Gets all pins for a component with their absolute canvas positions.
 * Useful for rendering pin overlays and finding nearby pins.
 *
 * @param componentId - The DOM ID of the component element
 * @param componentX - Component's X position on canvas
 * @param componentY - Component's Y position on canvas
 * @returns Array of pins with absolute positions and signal info
 */
export function getAllPinPositions(
  componentId: string,
  componentX: number,
  componentY: number,
): Array<{ name: string; x: number; y: number; signals: any[] }> {
  const element = document.getElementById(componentId);
  if (!element) return [];

  const pinInfo = (element as any).pinInfo;
  if (!pinInfo || !Array.isArray(pinInfo)) return [];

  return pinInfo.map((pin: any) => ({
    name: pin.name,
    x: componentX + pin.x,
    y: componentY + pin.y,
    signals: pin.signals || [],
  }));
}

/**
 * Finds the closest pin to a given canvas position.
 * Useful for snapping wire endpoints to nearby pins.
 *
 * @param componentId - The component to search
 * @param componentX - Component's X position
 * @param componentY - Component's Y position
 * @param targetX - Target X coordinate to find nearest pin
 * @param targetY - Target Y coordinate to find nearest pin
 * @param maxDistance - Maximum distance in pixels to consider (default 20)
 * @returns Closest pin info or null if none within maxDistance
 */
export function findClosestPin(
  componentId: string,
  componentX: number,
  componentY: number,
  targetX: number,
  targetY: number,
  maxDistance: number = 20,
): { name: string; x: number; y: number; signals: any[] } | null {
  const pins = getAllPinPositions(componentId, componentX, componentY);

  let closestPin: { name: string; x: number; y: number; signals: any[] } | null = null;
  let minDistance = maxDistance;

  for (const pin of pins) {
    const distance = Math.sqrt(Math.pow(pin.x - targetX, 2) + Math.pow(pin.y - targetY, 2));

    if (distance < minDistance) {
      minDistance = distance;
      closestPin = pin;
    }
  }

  return closestPin;
}
