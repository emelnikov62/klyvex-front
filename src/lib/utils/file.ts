/**
 * Convert a File object to base64 string
 * @param file - The file to convert
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Convert a File object to full data URL
 * @param file - The file to convert
 * @returns Promise resolving to full data URL string
 */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Truncate text to a maximum length, breaking at word boundaries
 * @param text - Text to truncate
 * @param maxLen - Maximum length
 * @returns Truncated text with "..." appended
 */
export function truncateToWords(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    const truncated = text.slice(0, maxLen);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 10 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

/**
 * Generate a random name for a file
 * @param originalName - Original file name (to extract extension)
 * @returns Random name with same extension
 */
export function generateRandomName(originalName?: string): string {
    const ext = originalName?.split('.').pop() || '';
    const randomId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    return ext ? `${randomId}.${ext}` : randomId;
}

/**
 * Generate a temporary project ID (negative to distinguish from real IDs)
 * @returns Negative timestamp-based ID
 */
export function generateTempProjectId(): number {
    return -Date.now();
}