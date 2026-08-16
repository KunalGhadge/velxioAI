/**
 * VelxioAI Studio — Semantic Project Validator
 *
 * Enforces project domain semantics before circuit or code generation:
 * - Ensures required domain sensors and actuators exist.
 * - Detects and rejects hallucinated or forbidden components.
 * - Enforces zero LLM drift across embedded project topologies.
 */

import { HardwareKnowledgeGraph } from '../knowledge/HardwareKnowledgeGraph';
import { RequirementExtractor } from '../requirements/RequirementExtractor';

export interface SemanticRule {
  domainKeywords: RegExp;
  projectName: string;
  requiredComponentTags: string[][]; // Each inner array is an OR group (e.g. [['wokwi-pir-motion-sensor'], ['wokwi-lcd1602', 'wokwi-ssd1306']])
  forbiddenComponentTags: string[];
}

export interface SemanticValidationResult {
  valid: boolean;
  projectName?: string;
  missingRequired: string[];
  forbiddenFound: string[];
  semanticErrors: string[];
}

export class SemanticProjectValidator {
  private static readonly DOMAIN_RULES: SemanticRule[] = [
    {
      domainKeywords: /\b(visitor\s*counter|people\s*counter|entry\s*counter|crowd\s*counter)\b/i,
      projectName: 'Visitor Counter',
      requiredComponentTags: [
        ['wokwi-pir-motion-sensor'],
        ['wokwi-lcd1602', 'wokwi-ssd1306', 'wokwi-7segment'],
      ],
      forbiddenComponentTags: ['wokwi-dht22', 'wokwi-servo', 'wokwi-mq2', 'wokwi-mpu6050'],
    },
    {
      domainKeywords: /\b(gas\s*(leak|detector|alarm)|smoke\s*detector|lpg\s*detector|methane\s*detector)\b/i,
      projectName: 'Gas Leak Detector',
      requiredComponentTags: [
        ['wokwi-mq2'],
        ['wokwi-buzzer', 'wokwi-led'],
      ],
      forbiddenComponentTags: ['wokwi-servo', 'wokwi-mpu6050', 'wokwi-ds18b20'],
    },
    {
      domainKeywords: /\b(digital\s*clock|rtc\s*clock|alarm\s*clock|clock\s*display)\b/i,
      projectName: 'Digital Clock',
      requiredComponentTags: [
        ['wokwi-ds1307'],
        ['wokwi-lcd1602', 'wokwi-ssd1306', 'wokwi-7segment'],
      ],
      forbiddenComponentTags: ['wokwi-servo', 'wokwi-pir-motion-sensor', 'wokwi-mq2'],
    },
    {
      domainKeywords: /\b(parking\s*sensor|reverse\s*parking|proximity\s*alarm|distance\s*alarm)\b/i,
      projectName: 'Parking Sensor',
      requiredComponentTags: [
        ['wokwi-hc-sr04'],
        ['wokwi-buzzer', 'wokwi-led', 'wokwi-lcd1602'],
      ],
      forbiddenComponentTags: ['wokwi-servo', 'wokwi-mq2', 'wokwi-dht22'],
    },
    {
      domainKeywords: /\b(smart\s*dustbin|touchless\s*bin|auto(matic)?\s*trash|smart\s*trash)\b/i,
      projectName: 'Smart Dustbin',
      requiredComponentTags: [
        ['wokwi-hc-sr04'],
        ['wokwi-servo'],
      ],
      forbiddenComponentTags: ['wokwi-mq2', 'wokwi-dht22', 'wokwi-ds1307'],
    },
    {
      domainKeywords: /\b(smart\s*greenhouse|greenhouse\s*monitor|plant\s*monitor|weather\s*station)\b/i,
      projectName: 'Smart Greenhouse',
      requiredComponentTags: [
        ['wokwi-dht22', 'wokwi-bmp280', 'wokwi-ds18b20'],
        ['wokwi-photoresistor-sensor', 'wokwi-relay-module', 'wokwi-lcd1602'],
      ],
      forbiddenComponentTags: ['wokwi-mpu6050', 'wokwi-membrane-keypad'],
    },
    {
      domainKeywords: /\b(door\s*lock|keypad\s*lock|electronic\s*lock|security\s*keypad|password\s*lock)\b/i,
      projectName: 'Keypad Door Lock',
      requiredComponentTags: [
        ['wokwi-membrane-keypad'],
        ['wokwi-servo', 'wokwi-relay-module', 'wokwi-buzzer', 'wokwi-lcd1602'],
      ],
      forbiddenComponentTags: ['wokwi-mq2', 'wokwi-dht22', 'wokwi-mpu6050'],
    },
    {
      domainKeywords: /\b(traffic\s*light|traffic\s*controller|traffic\s*signal)\b/i,
      projectName: 'Traffic Light Controller',
      requiredComponentTags: [
        ['wokwi-led'],
      ],
      forbiddenComponentTags: ['wokwi-servo', 'wokwi-mq2', 'wokwi-dht22', 'wokwi-mpu6050'],
    },
  ];

  /**
   * Validates a set of component tags against project semantic rules.
   */
  public static validate(
    prompt: string,
    components: Array<{ type: string }>
  ): SemanticValidationResult {
    const matchedRule = this.DOMAIN_RULES.find((rule) => rule.domainKeywords.test(prompt));

    const result: SemanticValidationResult = {
      valid: true,
      projectName: matchedRule?.projectName,
      missingRequired: [],
      forbiddenFound: [],
      semanticErrors: [],
    };

    if (!matchedRule) {
      // Fall back to general requirement extractor
      const req = RequirementExtractor.extract(prompt);
      const presentTags = new Set(components.map((c) => (c.type.startsWith('wokwi-') ? c.type : `wokwi-${c.type}`)));

      for (const required of req.requiredComponents) {
        if (!presentTags.has(required)) {
          result.missingRequired.push(required);
          result.semanticErrors.push(`Required component [${required}] is missing from circuit`);
          result.valid = false;
        }
      }
      return result;
    }

    const presentTags = new Set(components.map((c) => (c.type.startsWith('wokwi-') ? c.type : `wokwi-${c.type}`)));

    // Check required component groups
    for (const group of matchedRule.requiredComponentTags) {
      const satisfied = group.some((tag) => presentTags.has(tag));
      if (!satisfied) {
        result.missingRequired.push(group[0]);
        result.semanticErrors.push(`Project "${matchedRule.projectName}" requires one of [${group.join(', ')}]`);
        result.valid = false;
      }
    }

    // Check forbidden components
    for (const forbidden of matchedRule.forbiddenComponentTags) {
      if (presentTags.has(forbidden)) {
        result.forbiddenFound.push(forbidden);
        result.semanticErrors.push(`Forbidden component [${forbidden}] is not permitted in "${matchedRule.projectName}"`);
        result.valid = false;
      }
    }

    return result;
  }
}
