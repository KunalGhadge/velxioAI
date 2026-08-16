/**
 * VelxioAI Studio — Centralized Real-Time Event Bus
 *
 * Lightweight, strictly-typed publish-subscribe bus for coordinating
 * generation pipelines, live UI progress animations, telemetry, and history snapshots.
 * Zero polling, zero setInterval loops.
 */

export type AIEventType =
  | 'AI_BUILD_STARTED'
  | 'AI_BUILD_COMPLETED'
  | 'AI_BUILD_FAILED'
  | 'CODE_GENERATION_STARTED'
  | 'CODE_GENERATION_COMPLETED'
  | 'CIRCUIT_GENERATION_STARTED'
  | 'CIRCUIT_GENERATION_COMPLETED'
  | 'COMPONENT_ADDED'
  | 'WIRE_ADDED'
  | 'LIBRARY_INSTALLED'
  | 'COMPILATION_STARTED'
  | 'COMPILATION_COMPLETED'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_COMPLETED'
  | 'RUNTIME_VERIFIED'
  | 'HISTORY_SNAPSHOT_CREATED'
  | 'UNDO_EXECUTED'
  | 'REDO_EXECUTED';

export interface AIEvent<T = any> {
  type: AIEventType;
  payload?: T;
  timestamp: number;
}

export type AIEventListener<T = any> = (event: AIEvent<T>) => void;

export class AIEventBus {
  private static instance: AIEventBus;
  private listeners: Map<AIEventType, Set<AIEventListener>> = new Map();
  private globalListeners: Set<AIEventListener> = new Set();

  private constructor() {}

  public static getInstance(): AIEventBus {
    if (!AIEventBus.instance) {
      AIEventBus.instance = new AIEventBus();
    }
    return AIEventBus.instance;
  }

  /**
   * Subscribes to a specific AI event type. Returns an unsubscribe function.
   */
  public subscribe<T = any>(type: AIEventType, listener: AIEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(listener as AIEventListener);

    return () => {
      set.delete(listener as AIEventListener);
    };
  }

  /**
   * Subscribes to all AI event types. Returns an unsubscribe function.
   */
  public subscribeAll(listener: AIEventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Publishes an event to all registered listeners synchronously.
   */
  public publish<T = any>(type: AIEventType, payload?: T): void {
    const event: AIEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Specific listeners
    const specific = this.listeners.get(type);
    if (specific) {
      specific.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`[AIEventBus] Error in listener for "${type}":`, err);
        }
      });
    }

    // Global listeners
    this.globalListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error(`[AIEventBus] Error in global listener:`, err);
      }
    });
  }

  /**
   * Clears all active event subscriptions (useful in testing/cleanup).
   */
  public clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}
