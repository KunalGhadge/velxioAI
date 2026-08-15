/**
 * VelxioAI Studio — Multi-Model BYOK Streaming Client
 *
 * Robust, fault-tolerant streaming client with:
 * - Multiple API keys per provider & automatic rotation on 429 / quota exhaustion
 * - Automatic model fallback (e.g. gemini-2.0-flash -> gemini-1.5-flash)
 * - Sanitized API key handling and clear diagnostic error reporting
 *
 * Supported Providers:
 * - Google Gemini (gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro)
 * - Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, deepseek-r1-distill)
 * - OpenAI & OpenRouter (gpt-4o, gpt-4o-mini)
 * - Anthropic Claude (claude-3-5-sonnet, claude-3-5-haiku)
 * - Local Ollama (http://localhost:11434/v1)
 */

import type { AIProviderId, AISettings, ModelOption } from './types';

export const SUPPORTED_MODELS: ModelOption[] = [
  // Google Gemini (Free Tier & High Limits)
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Latest high-speed multimodal reasoning (Recommended)',
    contextWindow: '1M tokens',
    isRecommended: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Ultra-stable, high-volume production flash model',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Frontier reasoning for complex multi-board & SPICE circuits',
    contextWindow: '2M tokens',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Preview)',
    provider: 'gemini',
    description: 'Next-gen experimental flash reasoning',
    contextWindow: '1M tokens',
  },

  // Groq (Ultra-Fast 500+ tok/s)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Groq: Llama 3.3 70B',
    provider: 'groq',
    description: 'Instantaneous 500+ tokens/sec response time (Recommended)',
    contextWindow: '128k tokens',
    isRecommended: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Groq: Llama 3.1 8B',
    provider: 'groq',
    description: 'Lightweight, ultra-responsive model for instant edits',
    contextWindow: '128k tokens',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'Groq: DeepSeek R1 Distill',
    provider: 'groq',
    description: 'Deep mathematical & circuit logic reasoning',
    contextWindow: '128k tokens',
  },
  {
    id: 'qwen-2.5-32b',
    name: 'Groq: Qwen 2.5 32B',
    provider: 'groq',
    description: 'Strong coding and hardware register accuracy',
    contextWindow: '128k tokens',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Groq: Mixtral 8x7B',
    provider: 'groq',
    description: 'Fast mixture-of-experts model',
    contextWindow: '32k tokens',
  },

  // OpenAI
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Flagship multi-modal reasoning',
    contextWindow: '128k tokens',
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, lightweight model for quick edits',
    contextWindow: '128k tokens',
  },

  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'State-of-the-art architecture and C/C++ generation',
    contextWindow: '200k tokens',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    description: 'High-speed Claude reasoning',
    contextWindow: '200k tokens',
  },

  // Local Ollama
  {
    id: 'ollama-local',
    name: 'Local Ollama (Custom)',
    provider: 'ollama',
    description: '100% private offline model running on your local machine',
    contextWindow: 'Variable',
  },
];

export interface StreamCallbacks {
  onToken: (chunk: string) => void;
  onReasoning?: (reasoningChunk: string) => void;
  onComplete: (fullText: string, fullReasoning: string) => void;
  onError: (error: Error) => void;
}

export class LLMClient {
  /**
   * Parses raw user input containing one or multiple API keys
   * (separated by commas, semicolons, newlines, or spaces).
   */
  public static parseKeyPool(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
      .split(/[\n,;\s]+/)
      .map((k) => k.replace(/["']/g, '').trim())
      .filter((k) => k.length > 5);
  }

  /**
   * Dispatches a streaming prompt with automatic model fallback and key pool rotation.
   */
  public static async streamMessage(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const provider = settings.provider;
    const keyPool = this.parseKeyPool(settings.apiKeys[provider]);

    if (provider !== 'ollama' && keyPool.length === 0) {
      callbacks.onError(
        new Error(
          `Missing API Key for ${provider.toUpperCase()}.\n\nPlease click ⚙️ Settings in the top-right of the AI panel and enter your ${provider.toUpperCase()} API key. You can enter multiple keys separated by commas for automatic quota rotation!`
        )
      );
      return;
    }

    let lastError: Error | null = null;
    const totalKeys = provider === 'ollama' ? 1 : keyPool.length;

    // Loop through key pool with auto-rotation on quota / 429 errors
    for (let i = 0; i < totalKeys; i++) {
      const activeKey = provider === 'ollama' ? 'ollama' : keyPool[i];

      try {
        switch (provider) {
          case 'gemini':
            await this.streamGeminiWithFallback(systemPrompt, messages, settings, activeKey, callbacks, abortSignal);
            return; // Success!
          case 'groq':
            await this.streamGroqWithFallback(systemPrompt, messages, settings, activeKey, callbacks, abortSignal);
            return; // Success!
          case 'openai':
            await this.streamOpenAICompatible(
              'https://api.openai.com/v1/chat/completions',
              systemPrompt,
              messages,
              settings,
              activeKey,
              callbacks,
              abortSignal
            );
            return;
          case 'claude':
            await this.streamClaude(systemPrompt, messages, settings, activeKey, callbacks, abortSignal);
            return;
          case 'ollama':
            await this.streamOpenAICompatible(
              settings.customEndpoint || 'http://localhost:11434/v1/chat/completions',
              systemPrompt,
              messages,
              settings,
              'ollama',
              callbacks,
              abortSignal
            );
            return;
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        lastError = err;

        const isQuotaOrRateLimit =
          err.message?.includes('429') ||
          err.message?.includes('RESOURCE_EXHAUSTED') ||
          err.message?.includes('Quota exceeded') ||
          err.message?.includes('Rate limit') ||
          err.message?.includes('quota');

        if (isQuotaOrRateLimit && i < keyPool.length - 1) {
          console.warn(`Key #${i + 1} reached quota limit for ${provider}. Automatically rotating to key #${i + 2}...`);
          continue; // Try next key
        }

        // If not a quota error or no more keys in pool, rethrow or break
        break;
      }
    }

    if (lastError) {
      callbacks.onError(lastError);
    }
  }

  /**
   * Google Gemini SSE Streaming with Automatic Model Fallback
   */
  private static async streamGeminiWithFallback(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    apiKey: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const requestedModel = settings.selectedModel || 'gemini-2.0-flash';
    const fallbackList = Array.from(new Set([requestedModel, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']));

    let lastError: Error | null = null;

    for (const modelToTry of fallbackList) {
      try {
        await this.streamGeminiDirect(modelToTry, systemPrompt, messages, settings, apiKey, callbacks, abortSignal);
        return; // Success
      } catch (err: any) {
        lastError = err;
        const isModelNotFound =
          err.message?.includes('404') ||
          err.message?.includes('not found') ||
          err.message?.includes('unsupported');

        if (isModelNotFound && modelToTry !== fallbackList[fallbackList.length - 1]) {
          console.warn(`Gemini model ${modelToTry} not found. Attempting fallback...`);
          continue;
        }
        throw err;
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * Internal direct Gemini call
   */
  private static async streamGeminiDirect(
    model: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    apiKey: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Sanitize and alternate messages strictly for Gemini multiturn requirements
    const rawHistory = messages.filter((m) => m.content && m.content.trim().length > 0 && m.role !== 'system');
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of rawHistory) {
      const geminiRole = msg.role === 'user' ? 'user' : 'model';
      const last = contents[contents.length - 1];

      if (last && last.role === geminiRole) {
        last.parts[0].text += `\n\n${msg.content.trim()}`;
      } else {
        contents.push({
          role: geminiRole,
          parts: [{ text: msg.content.trim() }],
        });
      }
    }

    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Hello, I am asking for help with my hardware circuit.' }],
      });
    }

    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: settings.temperature ?? 0.2,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await res.text();
      }

      if (res.status === 400 && errDetail.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Google Gemini API Key. Please verify your key at https://aistudio.google.com/app/apikey');
      }
      if (res.status === 404) {
        throw new Error(`Gemini Model "${model}" not found (404): ${errDetail}`);
      }
      if (res.status === 429 || errDetail.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(`Gemini Quota Exceeded (429): ${errDetail}`);
      }
      throw new Error(`Gemini Error (${res.status}): ${errDetail}`);
    }

    let fullText = '';
    let fullReasoning = '';
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Failed to get streaming response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const candidate = data.candidates?.[0];
            const part = candidate?.content?.parts?.[0];
            if (part?.text) {
              fullText += part.text;
              callbacks.onToken(part.text);
            }
          } catch {}
        }
      }
    }

    callbacks.onComplete(fullText, fullReasoning);
  }

  /**
   * Groq Streaming with Automatic Fallback
   */
  private static async streamGroqWithFallback(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    apiKey: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const requestedModel = settings.selectedModel || 'llama-3.3-70b-versatile';
    const fallbackList = Array.from(new Set([requestedModel, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']));

    let lastError: Error | null = null;

    for (const modelToTry of fallbackList) {
      try {
        const modifiedSettings = { ...settings, selectedModel: modelToTry };
        await this.streamOpenAICompatible(
          'https://api.groq.com/openai/v1/chat/completions',
          systemPrompt,
          messages,
          modifiedSettings,
          apiKey,
          callbacks,
          abortSignal
        );
        return;
      } catch (err: any) {
        lastError = err;
        const isModelError =
          err.message?.includes('model_not_found') ||
          err.message?.includes('does not exist') ||
          err.message?.includes('decommissioned') ||
          err.message?.includes('404');

        if (isModelError && modelToTry !== fallbackList[fallbackList.length - 1]) {
          console.warn(`Groq model ${modelToTry} not found. Falling back...`);
          continue;
        }
        throw err;
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * OpenAI / Groq / Ollama Compatible SSE Streaming Endpoint
   */
  private static async streamOpenAICompatible(
    endpoint: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    apiKey: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const filteredMessages = messages.filter((m) => m.content && m.content.trim().length > 0 && m.role !== 'system');
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...filteredMessages.map((m) => ({
        role: m.role,
        content: m.content.trim(),
      })),
    ];

    const model = settings.selectedModel || (settings.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey !== 'ollama') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: settings.temperature ?? 0.2,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await res.text();
      }

      if (res.status === 401) {
        throw new Error(`Authentication failed (${settings.provider.toUpperCase()} 401). Please verify your API key.`);
      }
      if (res.status === 429) {
        throw new Error(`${settings.provider.toUpperCase()} Quota/Rate Limit (429): ${errDetail}`);
      }
      throw new Error(`${settings.provider.toUpperCase()} API Error (${res.status}): ${errDetail}`);
    }

    let fullText = '';
    let fullReasoning = '';
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Failed to get streaming response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta;

            // Handle DeepSeek reasoning tokens
            if (delta?.reasoning_content) {
              fullReasoning += delta.reasoning_content;
              callbacks.onReasoning?.(delta.reasoning_content);
            }

            if (delta?.content) {
              fullText += delta.content;
              callbacks.onToken(delta.content);
            }
          } catch {}
        }
      }
    }

    callbacks.onComplete(fullText, fullReasoning);
  }

  /**
   * Anthropic Claude Streaming
   */
  private static async streamClaude(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings: AISettings,
    apiKey: string,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const formattedMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const model = settings.selectedModel || 'claude-3-5-sonnet-20241022';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: settings.temperature ?? 0.2,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errDetail = await res.text();
      }
      throw new Error(`Claude API Error (${res.status}): ${errDetail}`);
    }

    let fullText = '';
    let fullReasoning = '';
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Failed to get streaming response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text;
              callbacks.onToken(data.delta.text);
            }
          } catch {}
        }
      }
    }

    callbacks.onComplete(fullText, fullReasoning);
  }

  /**
   * Helper to test whether an API key is valid
   */
  public static async testApiKey(
    provider: AIProviderId,
    apiKeyInput: string,
    model?: string
  ): Promise<{ success: boolean; message: string }> {
    const keys = this.parseKeyPool(apiKeyInput);
    if (keys.length === 0 && provider !== 'ollama') {
      return { success: false, message: 'Please enter at least one API key' };
    }

    const keyToTest = keys[0];

    try {
      if (provider === 'gemini') {
        const testModel = model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}?key=${keyToTest}`;
        const res = await fetch(url);
        if (res.ok) {
          return {
            success: true,
            message: `Connected to Google Gemini (${testModel}) successfully! ${keys.length > 1 ? `(${keys.length} keys in rotation pool)` : ''}`,
          };
        } else {
          // Try 1.5 flash fallback test
          const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${keyToTest}`);
          if (fallbackRes.ok) {
            return {
              success: true,
              message: `Connected to Google Gemini (gemini-1.5-flash) successfully! ${keys.length > 1 ? `(${keys.length} keys in rotation pool)` : ''}`,
            };
          }
          const err = await res.text();
          return { success: false, message: `Gemini Key Error (${res.status}): ${err}` };
        }
      } else if (provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${keyToTest}` },
        });
        if (res.ok) {
          return {
            success: true,
            message: `Connected to Groq (500+ tok/s) successfully! ${keys.length > 1 ? `(${keys.length} keys in rotation pool)` : ''}`,
          };
        } else {
          const err = await res.text();
          return { success: false, message: `Groq Key Error (${res.status}): ${err}` };
        }
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${keyToTest}` },
        });
        if (res.ok) {
          return {
            success: true,
            message: `Connected to OpenAI successfully! ${keys.length > 1 ? `(${keys.length} keys in rotation pool)` : ''}`,
          };
        } else {
          const err = await res.text();
          return { success: false, message: `OpenAI Key Error (${res.status}): ${err}` };
        }
      } else if (provider === 'claude') {
        return { success: true, message: `Anthropic API key format saved (${keys.length} key(s))` };
      } else {
        return { success: true, message: 'Local Ollama endpoint configured' };
      }
    } catch (e: any) {
      return { success: false, message: `Connection test error: ${e.message}` };
    }
  }
}
