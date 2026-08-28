import type { PasswordCheckId, PasswordStrengthTone } from '$lib/password.js';
import type { Locale } from './index.js';

export type AuthErrorCopy = {
	generic: string;
	invalidCredentials: string;
	emailRegistered: string;
	invalidInput: string;
	tooManyAttempts: (minutes: number) => string;
	oauthFailed: string;
	oauthCancelled: string;
	oauthEmailNotVerified: string;
	oauthStateMismatch: string;
};

type FieldCopy = {
	label: string;
	placeholder: string;
};

type PasswordFieldCopy = FieldCopy & {
	showPassword: string;
	hidePassword: string;
};

export type AuthLoginCopy = {
	eyebrow: string;
	signal: string;
	title: string;
	subtitle: string;
	submitLabel: string;
	fields: {
		email: FieldCopy;
		password: PasswordFieldCopy;
	};
	remember: string;
	footer: {
		prompt: string;
		action: string;
	};
	validation: {
		invalidEmail: string;
	};
	google: {
		button: string;
		divider: string;
	};
	errors: AuthErrorCopy;
};

export type AuthRegisterCopy = {
	eyebrow: string;
	signal: string;
	title: string;
	subtitle: string;
	submitLabel: string;
	fields: {
		name: FieldCopy;
		phone: FieldCopy;
		email: FieldCopy;
		password: PasswordFieldCopy;
		confirmPassword: PasswordFieldCopy;
	};
	passwordStrength: {
		label: string;
		checks: Record<PasswordCheckId, string>;
		levels: Record<PasswordStrengthTone, string>;
		requirement: (rule: string) => string;
	};
	validation: {
		invalidEmail: string;
		passwordMismatch: string;
	};
	footer: {
		prompt: string;
		action: string;
	};
	google: {
		button: string;
		divider: string;
	};
	errors: AuthErrorCopy;
};


type AuthShellCopy = {
	header: {
		signIn: string;
		startFree: string;
	};
	language: {
		label: string;
		options: Record<Locale, string>;
	};
	theme: {
		light: string;
		dark: string;
		system: string;
		group: string;
	};
	footer: string;
};

export type AuthCopy = {
	meta: {
		loginTitle: string;
		loginDescription: string;
		registerTitle: string;
		registerDescription: string;
	};
	shell: AuthShellCopy;
	login: AuthLoginCopy;
	register: AuthRegisterCopy;
};

const errorCopy = (copy: Omit<AuthErrorCopy, 'tooManyAttempts'> & { tooManyAttempts: AuthErrorCopy['tooManyAttempts'] }): AuthErrorCopy => copy;

export const authCopy: Record<Locale, AuthCopy> = {
	en: {
		meta: {
			loginTitle: 'Sign in — Flowboard',
			loginDescription: 'Sign in to keep every customer journey moving in Flowboard.',
			registerTitle: 'Create your workspace — Flowboard',
			registerDescription: 'Create a Flowboard workspace for clear customer onboarding handovers.'
		},
		shell: {
			header: {
				signIn: 'Sign in',
				startFree: 'Start free'
			},
			language: {
				label: 'Language',
				options: { en: 'English', ms: 'Malay (Malaysia)' }
			},
			theme: {
				light: 'Light mode',
				dark: 'Dark mode',
				system: 'Use system theme',
				group: 'Display theme'
			},
			footer: 'Customer onboarding that keeps staff moving — not chasing.'
		},
		login: {
			eyebrow: 'Workspace access',
			signal: 'Continue the rhythm',
			title: 'Welcome back to Flowboard',
			subtitle: 'Keep every customer journey moving with the next action in view.',
			submitLabel: 'Sign in',
			fields: {
				email: { label: 'Email', placeholder: 'you@company.com' },
				password: {
					label: 'Password',
					placeholder: '••••••••',
					showPassword: 'Show password',
					hidePassword: 'Hide password'
				}
			},
			remember: 'Keep me signed in on this device',
			footer: { prompt: 'New to Flowboard?', action: 'Start free' },
			validation: { invalidEmail: 'Enter a valid email address.' },
			google: {
				button: 'Continue with Google',
				divider: 'or sign in with email'
			},
			errors: errorCopy({
				generic: 'Something went wrong. Try again.',
				invalidCredentials: 'Your email or password is incorrect.',
				emailRegistered: 'This email is already registered.',
				invalidInput: 'Check the highlighted fields and try again.',
				tooManyAttempts: (minutes) => `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
				oauthFailed: 'Google sign-in failed. Try again.',
				oauthCancelled: 'Google sign-in was cancelled.',
				oauthEmailNotVerified: 'Your Google email is not verified.',
				oauthStateMismatch: 'Security check failed. Try again.'
			})
		},
		register: {
			eyebrow: 'Create workspace',
			signal: 'Ready in minutes',
			title: 'Start your Flowboard workspace',
			subtitle: 'Create the workspace where your team keeps onboarding visible.',
			submitLabel: 'Create workspace',
			fields: {
				name: { label: 'Full name', placeholder: 'Your name' },
				email: { label: 'Email', placeholder: 'you@company.com' },
				phone: { label: 'Phone number', placeholder: '60123456789' },
				password: {
					label: 'Password',
					placeholder: '••••••••',
					showPassword: 'Show password',
					hidePassword: 'Hide password'
				},
				confirmPassword: {
					label: 'Confirm password',
					placeholder: '••••••••',
					showPassword: 'Show password',
					hidePassword: 'Hide password'
				}
			},
			passwordStrength: {
				label: 'Password strength',
				checks: {
					length: 'At least 8 characters',
					lower: 'Lowercase letter (a–z)',
					upper: 'Uppercase letter (A–Z)',
					number: 'Number (0–9)'
				},
				levels: { negative: 'Weak', warning: 'Fair', queued: 'Good', positive: 'Strong' },
				requirement: (rule) => `Needs ${rule.toLowerCase()}.`
			},
			validation: {
				invalidEmail: 'Enter a valid email address.',
				passwordMismatch: 'Passwords do not match.'
			},
			footer: { prompt: 'Already have an account?', action: 'Sign in' },
			google: {
				button: 'Continue with Google',
				divider: 'or create workspace with email'
			},
			errors: errorCopy({
				generic: 'Something went wrong. Try again.',
				invalidCredentials: 'Your email or password is incorrect.',
				emailRegistered: 'This email is already registered.',
				invalidInput: 'Check the highlighted fields and try again.',
				tooManyAttempts: (minutes) => `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
				oauthFailed: 'Google sign-in failed. Try again.',
				oauthCancelled: 'Google sign-in was cancelled.',
				oauthEmailNotVerified: 'Your Google email is not verified.',
				oauthStateMismatch: 'Security check failed. Try again.'
			})
		}
	},
	ms: {
		meta: {
			loginTitle: 'Log masuk — Flowboard',
			loginDescription: 'Log masuk untuk memastikan setiap perjalanan pelanggan terus bergerak dalam Flowboard.',
			registerTitle: 'Cipta ruang kerja — Flowboard',
			registerDescription: 'Cipta ruang kerja Flowboard untuk serahan onboarding pelanggan yang jelas.'
		},
		shell: {
			header: {
				signIn: 'Log masuk',
				startFree: 'Mula percuma'
			},
			language: {
				label: 'Bahasa',
				options: { en: 'English', ms: 'Bahasa Melayu' }
			},
			theme: {
				light: 'Mod terang',
				dark: 'Mod gelap',
				system: 'Guna tema sistem',
				group: 'Tema paparan'
			},
			footer: 'Operasi pelanggan yang membantu staf terus bergerak — bukan mengejar.'
		},
		login: {
			eyebrow: 'Akses ruang kerja',
			signal: 'Sambung rentak kerja',
			title: 'Selamat kembali ke Flowboard',
			subtitle: 'Pastikan setiap perjalanan pelanggan bergerak dengan tindakan seterusnya yang jelas.',
			submitLabel: 'Log masuk',
			fields: {
				email: { label: 'E-mel', placeholder: 'nama@syarikat.com' },
				password: {
					label: 'Kata laluan',
					placeholder: '••••••••',
					showPassword: 'Tunjukkan kata laluan',
					hidePassword: 'Sembunyikan kata laluan'
				}
			},
			remember: 'Kekalkan saya log masuk pada peranti ini',
			footer: { prompt: 'Belum menggunakan Flowboard?', action: 'Mula percuma' },
			validation: { invalidEmail: 'Masukkan alamat e-mel yang sah.' },
			google: {
				button: 'Teruskan dengan Google',
				divider: 'atau log masuk dengan e-mel'
			},
			errors: errorCopy({
				generic: 'Berlaku masalah. Cuba lagi.',
				invalidCredentials: 'E-mel atau kata laluan tidak betul.',
				emailRegistered: 'E-mel ini telah didaftarkan.',
				invalidInput: 'Semak medan yang ditandakan dan cuba lagi.',
				tooManyAttempts: (minutes) => `Terlalu banyak cubaan. Cuba lagi dalam ${minutes} minit.`,
				oauthFailed: 'Log masuk Google gagal. Cuba lagi.',
				oauthCancelled: 'Log masuk Google dibatalkan.',
				oauthEmailNotVerified: 'E-mel Google anda belum disahkan.',
				oauthStateMismatch: 'Semakan keselamatan gagal. Cuba lagi.'
			})
		},
		register: {
			eyebrow: 'Cipta ruang kerja',
			signal: 'Sedia dalam beberapa minit',
			title: 'Mulakan ruang kerja Flowboard',
			subtitle: 'Cipta ruang kerja supaya pasukan anda boleh memastikan onboarding sentiasa jelas.',
			submitLabel: 'Cipta ruang kerja',
			fields: {
				name: { label: 'Nama penuh', placeholder: 'Nama anda' },
				email: { label: 'E-mel', placeholder: 'nama@syarikat.com' },
				phone: { label: 'Nombor telefon', placeholder: '60123456789' },
				password: {
					label: 'Kata laluan',
					placeholder: '••••••••',
					showPassword: 'Tunjukkan kata laluan',
					hidePassword: 'Sembunyikan kata laluan'
				},
				confirmPassword: {
					label: 'Sahkan kata laluan',
					placeholder: '••••••••',
					showPassword: 'Tunjukkan kata laluan',
					hidePassword: 'Sembunyikan kata laluan'
				}
			},
			passwordStrength: {
				label: 'Kekuatan kata laluan',
				checks: {
					length: 'Sekurang-kurangnya 8 aksara',
					lower: 'Huruf kecil (a–z)',
					upper: 'Huruf besar (A–Z)',
					number: 'Nombor (0–9)'
				},
				levels: { negative: 'Lemah', warning: 'Sederhana', queued: 'Baik', positive: 'Kuat' },
				requirement: (rule) => `Perlu ${rule.toLowerCase()}.`
			},
			validation: {
				invalidEmail: 'Masukkan alamat e-mel yang sah.',
				passwordMismatch: 'Kata laluan tidak sepadan.'
			},
			footer: { prompt: 'Sudah mempunyai akaun?', action: 'Log masuk' },
			google: {
				button: 'Teruskan dengan Google',
				divider: 'atau cipta ruang kerja dengan e-mel'
			},
			errors: errorCopy({
				generic: 'Berlaku masalah. Cuba lagi.',
				invalidCredentials: 'E-mel atau kata laluan tidak betul.',
				emailRegistered: 'E-mel ini telah didaftarkan.',
				invalidInput: 'Semak medan yang ditandakan dan cuba lagi.',
				tooManyAttempts: (minutes) => `Terlalu banyak cubaan. Cuba lagi dalam ${minutes} minit.`,
				oauthFailed: 'Log masuk Google gagal. Cuba lagi.',
				oauthCancelled: 'Log masuk Google dibatalkan.',
				oauthEmailNotVerified: 'E-mel Google anda belum disahkan.',
				oauthStateMismatch: 'Semakan keselamatan gagal. Cuba lagi.'
			})
		}
	}
};

export function localizeAuthError(error: { status?: number; message?: string }, copy: AuthErrorCopy): string {
	if (error.status === 401) return copy.invalidCredentials;
	if (error.status === 409) return copy.emailRegistered;
	if (error.status === 400 || error.status === 422) return copy.invalidInput;
	if (error.status === 429) {
		const minutes = Number(error.message?.match(/(\d+)\s+minute/)?.[1] ?? 1);
		return copy.tooManyAttempts(minutes);
	}

	return error.message || copy.generic;
}
