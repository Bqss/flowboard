export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
	id: string;
	message: string;
	description?: string;
	tone?: ToastTone;
	duration?: number;
	action?: {
		label: string;
		onclick: () => void;
	};
}

class ToastState {
	items = $state<ToastItem[]>([]);

	show(options: Omit<ToastItem, 'id'> & { id?: string }): string {
		const id = options.id || Math.random().toString(36).substring(2, 9);
		const duration = options.duration ?? 4000;
		const item: ToastItem = {
			...options,
			id,
			tone: options.tone ?? 'success',
			duration
		};

		this.items = [...this.items, item];

		if (duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, duration);
		}

		return id;
	}

	success(message: string, options?: Omit<ToastItem, 'id' | 'message' | 'tone'>): string {
		return this.show({ message, tone: 'success', ...options });
	}

	error(message: string, options?: Omit<ToastItem, 'id' | 'message' | 'tone'>): string {
		return this.show({ message, tone: 'error', ...options });
	}

	warning(message: string, options?: Omit<ToastItem, 'id' | 'message' | 'tone'>): string {
		return this.show({ message, tone: 'warning', ...options });
	}

	info(message: string, options?: Omit<ToastItem, 'id' | 'message' | 'tone'>): string {
		return this.show({ message, tone: 'info', ...options });
	}

	dismiss(id: string) {
		this.items = this.items.filter((item) => item.id !== id);
	}

	clear() {
		this.items = [];
	}
}

export const toast = new ToastState();
