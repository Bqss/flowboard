export type PasswordCheckId = 'length' | 'lower' | 'upper' | 'number';

export type PasswordCheck = {
	id: PasswordCheckId;
	label: string;
	met: boolean;
};

export type PasswordStrengthTone = 'negative' | 'warning' | 'queued' | 'positive';

export type PasswordStrength = {
	checks: PasswordCheck[];
	score: number;
	maxScore: number;
	label: string;
	tone: PasswordStrengthTone;
	valid: boolean;
};

const RULES: { id: PasswordCheckId; label: string; test: (password: string) => boolean }[] = [
	{ id: 'length', label: 'Minimal 8 karakter', test: (password) => password.length >= 8 },
	{ id: 'lower', label: 'Huruf kecil (a-z)', test: (password) => /[a-z]/.test(password) },
	{ id: 'upper', label: 'Huruf besar (A-Z)', test: (password) => /[A-Z]/.test(password) },
	{ id: 'number', label: 'Angka (0-9)', test: (password) => /\d/.test(password) }
];

export const assessPassword = (password: string): PasswordStrength => {
	const checks = RULES.map(({ id, label, test }) => ({
		id,
		label,
		met: test(password)
	}));
	const score = checks.filter((check) => check.met).length;
	const maxScore = checks.length;

	let label = '';
	let tone: PasswordStrengthTone = 'negative';

	if (password.length > 0) {
		if (score <= 1) {
			label = 'Lemah';
			tone = 'negative';
		} else if (score === 2) {
			label = 'Cukup';
			tone = 'warning';
		} else if (score === 3) {
			label = 'Baik';
			tone = 'queued';
		} else {
			label = 'Kuat';
			tone = 'positive';
		}
	}

	return {
		checks,
		score,
		maxScore,
		label,
		tone,
		valid: score === maxScore
	};
};

export const getPasswordFieldError = (password: string): string | null => {
	if (!password) return null;

	const { valid, checks } = assessPassword(password);
	if (valid) return null;

	const firstFail = checks.find((check) => !check.met);
	return firstFail ? `Perlu: ${firstFail.label.toLowerCase()}.` : null;
};

export const getConfirmPasswordError = (password: string, confirmPassword: string): string | null => {
	if (!confirmPassword) return null;
	if (password !== confirmPassword) return 'Kata sandi tidak cocok.';
	return null;
};
