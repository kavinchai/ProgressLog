import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import "./MoreMenu.css";

/**
 * A ••• button with a short menu of actions, like iOS context menus:
 * destructive actions go last, in red. Items with `hidden` are left out.
 * `open`/`onOpenChange` let a parent open it too (e.g. on a long press).
 */
export default function MoreMenu({
	label,
	items,
	open,
	onOpenChange,
	className = "",
}) {
	const [ownOpen, setOwnOpen] = useState(false);
	const isOpen = open ?? ownOpen;
	const setOpen = onOpenChange ?? setOwnOpen;
	const rootRef = useRef(null);
	const triggerRef = useRef(null);
	const listRef = useRef(null);
	const [position, setPosition] = useState(null);

	const shown = items.filter((item) => !item.hidden);
	const ordered = [
		...shown.filter((item) => !item.destructive),
		...shown.filter((item) => item.destructive),
	];

	useEffect(() => {
		if (!isOpen) return;
		// Cards clip their contents, so the menu is drawn at the top of the page
		// (a portal), at a fixed spot under the ••• button.
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) {
			setPosition({
				top: rect.bottom + 4,
				right: Math.max(window.innerWidth - rect.right, 8),
			});
		}
		function onPointerDown(e) {
			if (
				!rootRef.current?.contains(e.target) &&
				!listRef.current?.contains(e.target)
			) {
				setOpen(false);
			}
		}
		function onKeyDown(e) {
			if (e.key === "Escape") setOpen(false);
		}
		function onScroll() {
			setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [isOpen, setOpen]);

	return (
		<div
			ref={rootRef}
			className={"more-menu " + className}
			// Taps inside the menu never count as taps on the row or card.
			onClick={(e) => e.stopPropagation()}
			onTouchStart={(e) => e.stopPropagation()}
		>
			<button
				ref={triggerRef}
				type="button"
				className="more-menu-trigger"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={isOpen}
				onClick={() => setOpen(!isOpen)}
			>
				<MoreHorizontal size={18} aria-hidden="true" />
			</button>
			{isOpen &&
				createPortal(
					<div
						ref={listRef}
						className="more-menu-list"
						role="menu"
						aria-label={label}
						style={position ?? undefined}
					>
						{ordered.map((item) => (
							<button
								key={item.label}
								type="button"
								role="menuitem"
								className={
									"more-menu-item" +
									(item.destructive ? " more-menu-item--danger" : "")
								}
								onClick={() => {
									setOpen(false);
									item.onSelect();
								}}
							>
								{item.label}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
