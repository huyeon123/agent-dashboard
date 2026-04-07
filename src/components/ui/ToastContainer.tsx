import type { Toast } from '../../hooks/use-toast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onRemove(toast.id)}
          className={`px-4 py-3 rounded-lg shadow-lg cursor-pointer text-sm font-medium transition-all animate-slide-in ${
            toast.type === 'success'
              ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
              : toast.type === 'error'
              ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
              : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
