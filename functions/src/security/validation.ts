/**
 * Security Validation Module
 *
 * Input and output validation to prevent prompt injection and ensure content safety.
 * Implements 4-layer defense strategy.
 */

import * as functions from 'firebase-functions';

/**
 * Dangerous patterns that indicate prompt injection attempts
 */
const DANGEROUS_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /あなたは\s*claude/i,
  /system\s+prompt/i,
  /前の指示を忘れて/i,
  /ロールを変更/i,
  /you\s+are\s+claude/i,
  /\bapi\s+key\b/i,
  /\banthropic\b/i,
  /システムプロンプト/i,
  /内部動作/i,
  /プロンプト.*表示/i,
  /instruction.*override/i,
];

/**
 * Forbidden phrases in output to prevent disclosure
 */
const FORBIDDEN_OUTPUT_PHRASES = [
  'claude',
  'anthropic',
  'api key',
  'システムプロンプト',
  '私はaiモデル',
  'i am an ai model',
  'i am claude',
  'プロンプト',
  '内部指示',
];

/**
 * Validate user input for security threats
 * @throws HttpsError if dangerous pattern detected
 */
export function validateInput(input: string): void {
  if (!input || typeof input !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '入力が無効です。'
    );
  }

  // Check length
  if (input.length > 10000) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '入力が長すぎます。10,000文字以下にしてください。'
    );
  }

  if (input.length < 5) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '入力が短すぎます。もう少し詳しく入力してください。'
    );
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      console.warn('Dangerous pattern detected in input:', {
        pattern: pattern.source,
        input: input.substring(0, 100),
      });

      throw new functions.https.HttpsError(
        'invalid-argument',
        '不適切な入力が検出されました。質問を言い換えてください。'
      );
    }
  }

  // Check for excessive special characters (potential obfuscation)
  const specialCharRatio = (input.match(/[^a-zA-Z0-9あ-ん ア-ン一-龯々\s]/g) || []).length / input.length;
  if (specialCharRatio > 0.3) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '特殊文字が多すぎます。通常の文章で入力してください。'
    );
  }
}

/**
 * Validate AI output for security compliance
 * @throws Error if forbidden content detected
 */
export function validateOutput(output: string): void {
  if (!output || typeof output !== 'string') {
    throw new Error('Invalid output format');
  }

  const lowerOutput = output.toLowerCase();

  // Check for forbidden phrases
  for (const phrase of FORBIDDEN_OUTPUT_PHRASES) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      console.error('Forbidden phrase detected in output:', {
        phrase,
        output: output.substring(0, 200),
      });

      throw new Error(
        `Output contains forbidden phrase: ${phrase}. This indicates a potential security breach.`
      );
    }
  }

  // Check if output is suspiciously short
  if (output.length < 10) {
    throw new Error('Output too short - possible error in generation');
  }

  // Check if output is suspiciously long
  if (output.length > 50000) {
    throw new Error('Output too long - possible infinite loop');
  }

  // Check for excessive repetition (sign of model breakdown)
  if (hasExcessiveRepetition(output)) {
    throw new Error('Output contains excessive repetition - generation error');
  }
}

/**
 * Detect excessive repetition in text
 */
function hasExcessiveRepetition(text: string): boolean {
  // Check for repeated phrases (20+ chars repeated 3+ times)
  const words = text.split(/\s+/);
  if (words.length < 20) return false;

  for (let phraseLen = 5; phraseLen <= 10; phraseLen++) {
    const phrases = new Map<string, number>();

    for (let i = 0; i <= words.length - phraseLen; i++) {
      const phrase = words.slice(i, i + phraseLen).join(' ');
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);

      if ((phrases.get(phrase) || 0) >= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sanitize text for safe storage/display
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim();
}
