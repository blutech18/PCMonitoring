/**
 * Firebase Helper Utilities
 * Handles type conversions and data normalization for Firebase Realtime Database
 */

/**
 * Convert any value to a proper boolean
 * Handles string representations of booleans that may come from Firebase
 */
export const toBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return Boolean(value);
};

/**
 * Normalize Firebase data to ensure proper types
 * Converts string booleans to actual booleans
 */
export const normalizeBooleanFields = <T extends Record<string, any>>(
    data: T,
    booleanFields: (keyof T)[]
): T => {
    const normalized = { ...data };
    
    for (const field of booleanFields) {
        if (normalized[field] !== undefined) {
            normalized[field] = toBoolean(normalized[field]) as any;
        }
    }
    
    return normalized;
};

/**
 * Ensure boolean value is written as actual boolean (not string)
 * Firebase sometimes serializes booleans as strings, this ensures proper type
 */
export const ensureBoolean = (value: any): boolean => {
    // Convert to boolean and ensure it's a primitive type
    return Boolean(toBoolean(value));
};

/**
 * Sanitize an object to ensure all boolean fields are proper booleans
 */
export const sanitizeBooleans = (obj: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeBooleans(value);
        } else if (typeof value === 'string' && (value === 'true' || value === 'false')) {
            // Convert string booleans to actual booleans
            sanitized[key] = value === 'true';
        } else if (typeof value === 'boolean') {
            // Ensure boolean is properly typed
            sanitized[key] = !!value;
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};
