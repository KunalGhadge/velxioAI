/**
 * VelxioAI Studio — Multi-Mode Intent Classifier
 *
 * Deterministically classifies natural language prompts into one of four
 * strict operating modes: BUILD, DEBUG, EXPLAIN, or CHAT using weighted scoring,
 * semantic phrase recognition, and regex patterns.
 */

export type AIIntent = 'BUILD' | 'DEBUG' | 'EXPLAIN' | 'CHAT';

export interface IntentResult {
  intent: AIIntent;
  confidence: number;
  reasons: string[];
}

export class IntentClassifier {
  private static readonly DEBUG_PATTERNS = [
    { regex: /\b(why\s+(wasn'?t|isn'?t|didn'?t|won'?t|doesn'?t|not))\b/i, weight: 4.0, name: "Questioning failure ('why isn't / wasn't')" },
    { regex: /\bwhy\s+(is|are)\s+(the|my|this)?\s*[\w\s]+\s*(reading|showing|outputting|stuck|failing|giving)\b/i, weight: 4.0, name: 'Questioning sensor / circuit readings' },
    { regex: /\b(not\s+(working|blinking|running|reading|responding|turning\s+on|lighting\s+up|triggering|moving))\b/i, weight: 3.5, name: 'Negative operational state' },
    { regex: /\b(reading\s+(0|zero|nothing|low|high|null|nan)|outputting\s+(0|zero|nothing)|stuck\s+at)\b/i, weight: 3.5, name: 'Sensor erroneous output' },
    { regex: /\b(what('?s|\s+is)\s+wrong|what\s+happened|why\s+is\s+it\s+failing)\b/i, weight: 3.5, name: 'Diagnostic query' },
    { regex: /\b(debug|diagnose|troubleshoot|inspect|fix\s+(this|the|error|bug|issue)|solve\s+error)\b/i, weight: 3.0, name: 'Explicit debug verb' },
    { regex: /\b(error|compil(e|ation)\s+error|failed\s+to|exception|warning|crash|stack\s+trace)\b/i, weight: 2.5, name: 'Error / failure terminology' },
  ];

  private static readonly EXPLAIN_PATTERNS = [
    { regex: /\b(explain|how\s+does\s+(\w+)\s+work|what\s+is\s+(\w+)|tell\s+me\s+about|teach\s+me)\b/i, weight: 4.0, name: 'Explicit explanation request' },
    { regex: /\b(difference\s+between|compare|pros\s+and\s+cons|why\s+do\s+we\s+use|when\s+to\s+use)\b/i, weight: 3.5, name: 'Comparative / theoretical analysis' },
    { regex: /\b(tutorial|lesson|guide\s+on|theory\s+of|concept\s+of)\b/i, weight: 3.0, name: 'Pedagogical terminology' },
  ];

  private static readonly BUILD_PATTERNS = [
    { regex: /\b(build|create|make|generate|construct|design|synthesize|assemble)\b/i, weight: 3.5, name: 'Active creation verb' },
    { regex: /\b(wire\s+up|connect\s+(a|an|the)|add\s+(a|an|the)|place\s+(a|an|the)|hook\s+up)\b/i, weight: 3.5, name: 'Physical hardware manipulation' },
    { regex: /\b(write\s+(code|sketch|firmware|program)|implement|code\s+for)\b/i, weight: 3.0, name: 'Firmware generation request' },
    { regex: /\b(traffic\s+light|weather\s+station|visitor\s+counter|alarm\s+system|smart\s+greenhouse|robot(ic)?\s+arm)\b/i, weight: 2.5, name: 'Specific project target' },
  ];

  private static readonly CHAT_PATTERNS = [
    { regex: /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy)\b/i, weight: 4.0, name: 'Greeting' },
    { regex: /\b(who\s+are\s+you|what\s+can\s+you\s+do|what\s+is\s+velxio|help\s+me)\b/i, weight: 3.5, name: 'System capability inquiry' },
    { regex: /\b(thank\s+you|thanks|great\s+job|awesome|ok|okay|cool|got\s+it)\b/i, weight: 3.0, name: 'Conversational acknowledgement' },
  ];

  /**
   * Classifies a prompt using multi-criteria weighted pattern matching.
   */
  public static classify(prompt: string): IntentResult {
    const text = prompt.trim();
    if (!text) {
      return { intent: 'CHAT', confidence: 1.0, reasons: ['Empty input defaulted to CHAT'] };
    }

    const scores: Record<AIIntent, number> = {
      DEBUG: 0,
      EXPLAIN: 0,
      BUILD: 0,
      CHAT: 0,
    };

    const reasons: Record<AIIntent, string[]> = {
      DEBUG: [],
      EXPLAIN: [],
      BUILD: [],
      CHAT: [],
    };

    // 1. Evaluate Debug Patterns
    for (const pat of this.DEBUG_PATTERNS) {
      if (pat.regex.test(text)) {
        scores.DEBUG += pat.weight;
        reasons.DEBUG.push(`Matched: ${pat.name}`);
      }
    }

    // 2. Evaluate Explain Patterns
    for (const pat of this.EXPLAIN_PATTERNS) {
      if (pat.regex.test(text)) {
        scores.EXPLAIN += pat.weight;
        reasons.EXPLAIN.push(`Matched: ${pat.name}`);
      }
    }

    // 3. Evaluate Build Patterns
    for (const pat of this.BUILD_PATTERNS) {
      if (pat.regex.test(text)) {
        scores.BUILD += pat.weight;
        reasons.BUILD.push(`Matched: ${pat.name}`);
      }
    }

    // 4. Evaluate Chat Patterns
    for (const pat of this.CHAT_PATTERNS) {
      if (pat.regex.test(text)) {
        scores.CHAT += pat.weight;
        reasons.CHAT.push(`Matched: ${pat.name}`);
      }
    }

    // Priority Resolution:
    // If a prompt has strong debug markers (e.g. "Why wasn't the LED blinking?"),
    // debug intent takes precedence over casual build/part words ("led", "blinking").
    if (scores.DEBUG >= 3.0) {
      const total = scores.DEBUG + scores.BUILD + scores.EXPLAIN + scores.CHAT;
      return {
        intent: 'DEBUG',
        confidence: Math.min(1.0, Math.max(0.75, scores.DEBUG / (total || 1))),
        reasons: reasons.DEBUG,
      };
    }

    if (scores.EXPLAIN >= 3.0 && scores.BUILD < 4.0) {
      const total = scores.DEBUG + scores.BUILD + scores.EXPLAIN + scores.CHAT;
      return {
        intent: 'EXPLAIN',
        confidence: Math.min(1.0, Math.max(0.75, scores.EXPLAIN / (total || 1))),
        reasons: reasons.EXPLAIN,
      };
    }

    if (scores.CHAT >= 3.0 && scores.BUILD < 2.0 && scores.DEBUG < 2.0) {
      return {
        intent: 'CHAT',
        confidence: 0.95,
        reasons: reasons.CHAT,
      };
    }

    if (scores.BUILD > 0) {
      const total = scores.DEBUG + scores.BUILD + scores.EXPLAIN + scores.CHAT;
      return {
        intent: 'BUILD',
        confidence: Math.min(1.0, Math.max(0.7, scores.BUILD / (total || 1))),
        reasons: reasons.BUILD,
      };
    }

    // Default Fallback
    return {
      intent: 'CHAT',
      confidence: 0.6,
      reasons: ['No strong action or diagnostic verbs detected; default to safe conversational CHAT'],
    };
  }
}
