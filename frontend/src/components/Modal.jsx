import { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({ title, onClose, children }) {
	const modalRef = useRef(null);
	const closeButtonRef = useRef(null);
	const previousActiveElement = useRef(null);

	// Save the element that triggered the modal (for focus restoration)
	useEffect(() => {
		previousActiveElement.current = document.activeElement;
	}, []);

	// Set initial focus to the close button
	useEffect(() => {
		if (closeButtonRef.current) {
			closeButtonRef.current.focus();
		}
	}, []);

	// Handle Escape key
	useEffect(() => {
		const handler = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onClose]);

	// Focus trap: keep Tab focus within the modal
	useEffect(() => {
		const handler = (e) => {
			if (e.key !== "Tab" || !modalRef.current) return;
			const focusableElements = modalRef.current.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			if (focusableElements.length === 0) return;
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];
			const activeElement = document.activeElement;

			if (e.shiftKey) {
				// Shift+Tab on first element → focus last element
				if (activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab on last element → focus first element
				if (activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	// Hide body scrollbar and restore focus on close
	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
			// Restore focus to the element that triggered the modal
			if (
				previousActiveElement.current &&
				typeof previousActiveElement.current.focus === "function"
			) {
				previousActiveElement.current.focus();
			}
		};
	}, []);

	const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div
				className="modal-box"
				onClick={(e) => e.stopPropagation()}
				ref={modalRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
			>
				<div className="modal-drag-handle" aria-hidden="true" />
				<div className="modal-header">
					<span className="modal-title" id={titleId}>
						{title}
					</span>
					<button
						className="modal-close"
						ref={closeButtonRef}
						onClick={onClose}
						aria-label="Close"
					>
						&times;
					</button>
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</div>
	);
}
