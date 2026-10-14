interface ToastProps {
  message: string;
  type: 'info' | 'error' | 'success';
}

export function Toast({ message, type }: ToastProps) {
  return <div className={`toast ${type}`}>{message}</div>;
}
