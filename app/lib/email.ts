const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => {
	const trimmed = email.trim();
	if (!trimmed) return false;
	return EMAIL_PATTERN.test(trimmed);
};

export const getEmailFieldError = (email: string): string | null => {
	const trimmed = email.trim();
	if (!trimmed) return null;
	if (isValidEmail(trimmed)) return null;
	return 'Format email tidak valid.';
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
