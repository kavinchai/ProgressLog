import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Modal.css";

const DRAG_CLOSE_PX = 80; // drag the sheet down this far to close it
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

// The page's styles as constructable sheets, for the closing copy below.
function pageStyles() {
	const sheets = [];
	for (const sheet of document.styleSheets) {
		try {
			const copy = new CSSStyleSheet();
			copy.replaceSync([...sheet.cssRules].map((r) => r.cssText).join("\n"));
			sheets.push(copy);
		} catch {
			// A sheet whose rules can't be read is skipped.
		}
	}
	return sheets;
}

/**
 * Plays the close animation on an inert copy of the sheet, so it slides away
 * however it was closed (Cancel, Save, Esc, a tap outside or a drag). The copy
 * sits in a closed shadow root, so nothing on the page can find or reach it.
 */
function animateClose(overlay) {
	const reduce = window.matchMedia?.(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (
		!overlay ||
		reduce ||
		typeof overlay.animate !== "function" ||
		!("adoptedStyleSheets" in Document.prototype)
	)
		return;
	const ghost = overlay.cloneNode(true);
	// Keep what was typed, which cloneNode leaves out.
	const fields = overlay.querySelectorAll("input, textarea, select");
	ghost.querySelectorAll("input, textarea, select").forEach((el, i) => {
		el.value = fields[i].value;
	});
	ghost.style.pointerEvents = "none";
	ghost.style.animation = "none";
	const host = document.createElement("div");
	host.setAttribute("aria-hidden", "true");
	host.inert = true;
	const shadow = host.attachShadow({ mode: "closed" });
	shadow.adoptedStyleSheets = pageStyles();
	shadow.appendChild(ghost);
	document.body.appendChild(host);
	const box = ghost.querySelector(".modal-box");
	box.style.animation = "none";
	const from = box.style.transform || "translateY(0)";
	const sheet = window.matchMedia?.("(max-width: 640px)").matches;
	ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
		duration: 300,
		easing: SPRING,
		fill: "forwards",
	});
	box
		.animate(
			sheet
				? [{ transform: from }, { transform: "translateY(100%)" }]
				: [
						{ opacity: 1, transform: "scale(1)" },
						{ opacity: 0, transform: "scale(0.97)" },
					],
			{ duration: sheet ? 340 : 180, easing: SPRING, fill: "forwards" },
		)
		.finished.finally(() => host.remove());
}

/**
 * Pass `grouped` for a sheet of iOS grouped lists (gray behind the rows).
 * Pass `form` ({ id, saving, disabled? }) for an iOS-style form sheet: Cancel, the title
 * and Save across the top, where Save submits the form with that id.
 */
export default function Modal({ title, onClose, children, form, grouped }) {
	const modalRef = useRef(null);
	const closeButtonRef = useRef(null);
	const previousActiveElement = useRef(null);
	const drag = useRef(null); // { startY, y } while a finger is down
	const [dragY, setDragY] = useState(0);
	const overlayRef = useRef(null);

	useLayoutEffect(() => {
		const overlay = overlayRef.current;
		// Only once the sheet has really left the page: React's development
		// mode also runs this clean-up while the sheet stays open.
		return () =>
			queueMicrotask(() => {
				if (!overlay.isConnected) animateClose(overlay);
			});
	}, []);

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
		<div className="modal-overlay" ref={overlayRef} onClick={onClose}>
			<dialog
				open
				className={"modal-box" + (form || grouped ? " modal-box--sheet" : "")}
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
							disabled={form.saving || form.disabled}
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
