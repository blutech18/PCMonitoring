// Input validation utilities

export interface ValidationRule {
    validate: (value: string) => boolean;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Validate IP address format
 */
export const validateIPAddress = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip.trim());
};

/**
 * Validate required field
 */
export const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value: string, minLength: number): boolean => {
    return value.trim().length >= minLength;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value: string, maxLength: number): boolean => {
    return value.trim().length <= maxLength;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
    if (!validateRequired(password)) {
        return { isValid: false, error: 'Password is required' };
    }
    if (!validateMinLength(password, 6)) {
        return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    if (!validateMaxLength(password, 128)) {
        return { isValid: false, error: 'Password must be less than 128 characters' };
    }
    return { isValid: true };
};

/**
 * Validate username
 */
export const validateUsername = (username: string): ValidationResult => {
    if (!validateRequired(username)) {
        return { isValid: false, error: 'Username is required' };
    }
    if (!validateMinLength(username, 3)) {
        return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    if (!validateMaxLength(username, 50)) {
        return { isValid: false, error: 'Username must be less than 50 characters' };
    }
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(username)) {
        return { isValid: false, error: 'Username can only contain letters, numbers, and ._-' };
    }
    return { isValid: true };
};

/**
 * Validate computer name
 */
export const validateComputerName = (name: string): ValidationResult => {
    if (!validateRequired(name)) {
        return { isValid: false, error: 'Computer name is required' };
    }
    if (!validateMinLength(name, 1)) {
        return { isValid: false, error: 'Computer name is required' };
    }
    if (!validateMaxLength(name, 100)) {
        return { isValid: false, error: 'Computer name must be less than 100 characters' };
    }
    return { isValid: true };
};

/**
 * Validate IP address
 */
export const validateIP = (ip: string): ValidationResult => {
    if (!validateRequired(ip)) {
        return { isValid: false, error: 'IP address is required' };
    }
    if (!validateIPAddress(ip)) {
        return { isValid: false, error: 'Invalid IP address format' };
    }
    return { isValid: true };
};

/**
 * Run multiple validation rules
 */
export const validateField = (value: string, rules: ValidationRule[]): ValidationResult => {
    for (const rule of rules) {
        if (!rule.validate(value)) {
            return { isValid: false, error: rule.message };
        }
    }
    return { isValid: true };
};
