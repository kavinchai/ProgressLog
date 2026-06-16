import {
	createContext,
	useContext,
	useState,
	useCallback,
	useRef,
} from "react";
import { AlertTriangle } from "lucide-react";
import "./Toast.css";

const ToastContext = createContext(null);
const MAX_VISIBLE = 3;
const ERROR_DURATION_MS = 4000;

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within a ToastProvider");
	return ctx;
}

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);
	const idRef = useRef(0);

	const dismiss = useCallback((id) => {
		setToasts((curr) => curr.filter((t) => t.id !== id));
	}, []);

	const show = useCallback(
		(toast) => {
			const id = ++idRef.current;
			setToasts((curr) => [...curr, { id, ...toast }].slice(-MAX_VISIBLE));
			setTimeout(() => dismiss(id), toast.durationMs ?? ERROR_DURATION_MS);
		},
		[dismiss],
	);

	const error = useCallback(
		(message) => show({ variant: "error", message }),
		[show],
	);

	return (
		<ToastContext.Provider value={{ error, show, dismiss }}>
			{children}
			<ToastViewport toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

function ToastViewport({ toasts, onDismiss }) {
	if (toasts.length === 0) return null;
	return (
		<div className="toast-viewport" aria-live="polite">
			{toasts.map((t) => (
				<button
					key={t.id}
					type="button"
					role="status"
					className={`toast toast--${t.variant}`}
					onClick={() => onDismiss(t.id)}
				>
					{t.variant === "error" && (
						<AlertTriangle size={16} className="toast-icon" />
					)}
					<span className="toast-message">{t.message}</span>
				</button>
			))}
		</div>
	);
}
