type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export function addToast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = nextId++;
  toasts.push({ id, message, type });
  setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
}

export function getToasts() {
  return toasts;
}

export const toast = {
  success: (msg: string) => addToast(msg, 'success'),
  error: (msg: string) => addToast(msg, 'error', 6000),
  info: (msg: string) => addToast(msg, 'info'),
};
