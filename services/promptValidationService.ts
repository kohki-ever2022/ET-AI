/**
 * A list of regex patterns to detect potential prompt injection attempts.
 * Based on ET-AI Implementation Specification, Section 4.1 / Week 4.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
    /ignore\s+previous\s+instructions/i,
    /あなたは\s*claude/i,
    /system\s+prompt/i,
    /前の指示を忘れて/i,
    /ロールを変更/i,
    /you\s+are\s+claude/i,
    /\bapi\b/i,
    /\banthropic\b/i,
    /新しい役割/i,
    /technical details/i,
];

/**
 * Validates user input against a set of patterns to prevent prompt injection.
 * 
 * @param userInput The text message from the user.
 * @returns An error message string if a dangerous pattern is detected, otherwise null.
 */
export const validatePrompt = (userInput: string): string | null => {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(userInput)) {
            console.warn(`Suspicious input detected: matched ${pattern.toString()}`);
            // This message comes from the spec (Week 4, page 13)
            return "不適切な入力が検出されました。質問を言い換えてください。";
        }
    }
    return null;
};
