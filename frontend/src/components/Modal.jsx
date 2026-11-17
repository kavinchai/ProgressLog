import { useEffect, useRef, useState } from "react";
import "./Modal.css";

const DRAG_CLOSE_PX = 80; // drag the sheet down this far to close it

/**
 * Pass `form` ({ id, saving }) for an iOS-style form sheet: Cancel, the title
 * and Save across the top, where Save submits the form with that id.
 */
export default function Modal({ title, onClose, children, form }) {
	const modalRef = useRef(null);
	const closeButtonRef = useRef(null);
	const previousActiveElement = useRef(null);
	const drag = useRef(null); // { startY, y } while a finger is down
	const [dragY, setDragY] = useState(0);

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

	// Drag the handle or header down to close, like an iOS sheet. A short
	// drag springs back.
	const dragHandlers = {
		onTouchStart: (e) => {
			drag.current = { startY: e.touches[0].clientY, y: 0 };
		},
		onTouchMove: (e) => {
			if (!drag.current) return;
			drag.current.y = Math.max(e.touches[0].clientY - drag.current.startY, 0);
			setDragY(drag.current.y);
		},
		onTouchEnd: () => {
			const dragged = drag.current?.y ?? 0;
			drag.current = null;
			if (dragged >= DRAG_CLOSE_PX) onClose();
			else setDragY(0);
		},
	};
	dragHandlers.onTouchCancel = dragHandlers.onTouchEnd;

	const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

	return (
		<div className="modal-overlay" onClick={onClose}>
			<dialog
				open
				className="modal-box"
				onClick={(e) => e.stopPropagation()}
				ref={modalRef}
				aria-modal="true"
				aria-labelledby={titleId}
				style={
					dragY > 0
						? { transform: `translateY(${dragY}px)`, transition: "none" }
						: undefined
				}
			>
				<div
					className="modal-drag-handle"
					aria-hidden="true"
					{...dragHandlers}
				/>
				<div
					className={"modal-header" + (form ? " modal-header--form" : "")}
					{...dragHandlers}
				>
					{form && (
						<button
							type="button"
							className="modal-header-btn"
							ref={closeButtonRef}
							onClick={onClose}
						>
							Cancel
						</button>
					)}
					<span className="modal-title" id={titleId}>
						{title}
					</span>
					{form ? (
						<button
							type="submit"
							form={form.id}
							className="modal-header-btn modal-header-save"
							disabled={form.saving}
						>
							{form.saving ? "Saving…" : "Save"}
						</button>
					) : (
						<button
							className="modal-close"
							ref={closeButtonRef}
							onClick={onClose}
							aria-label="Close"
						>
							&times;
						</button>
					)}
				</div>
				<div className="modal-body">{children}</div>
			</dialog>
		</div>
	);
}
