import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import MoreMenu from "./MoreMenu";
import { tapLight } from "../native/haptics";
import "./SwipeRow.css";

const REVEAL = 80; // px the row slides to show Delete
const DRAG_START = 8; // px before a touch counts as a swipe
const LONG_PRESS_MS = 500;

/**
 * A log entry, iOS style: tap it to edit, swipe left to reveal Delete, or
 * long-press for a menu with Edit and Delete. On the website (no touch) the
 * same menu sits behind a ••• button. Without `onDelete` it's tap-to-edit only.
 */
export default function SwipeRow({
	label,
	openLabel,
	onOpen,
	onDelete,
	className = "",
	children,
}) {
	const [offset, setOffset] = useState(0);
	const [dragging, setDragging] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const touch = useRef(null); // { x, y, base, swiping }
	const longPress = useRef(null);
	// Set after a long press opens the menu, so lifting the finger doesn't
	// also open the editor. Cleared on the next touch.
	const suppressClick = useRef(false);
	const revealed = offset !== 0;

	function cancelLongPress() {
		clearTimeout(longPress.current);
		longPress.current = null;
	}

	function onTouchStart(e) {
		const t = e.touches[0];
		suppressClick.current = false;
		touch.current = {
			x: t.clientX,
			y: t.clientY,
			base: offset,
			swiping: false,
		};
		cancelLongPress();
		longPress.current = setTimeout(() => {
			longPress.current = null;
			touch.current = null;
			suppressClick.current = true;
			setOffset(0);
			setMenuOpen(true);
			tapLight();
		}, LONG_PRESS_MS);
	}

	function onTouchMove(e) {
		const start = touch.current;
		if (!start) return;
		const t = e.touches[0];
		const dx = t.clientX - start.x;
		const dy = t.clientY - start.y;
		if (Math.abs(dx) > DRAG_START || Math.abs(dy) > DRAG_START)
			cancelLongPress();
		if (!onDelete) return;
		if (!start.swiping) {
			// Mostly-vertical drags are scrolling, not swiping.
			if (Math.abs(dx) <= DRAG_START || Math.abs(dx) <= Math.abs(dy)) return;
			start.swiping = true;
			setDragging(true);
		}
		setOffset(Math.min(0, Math.max(-REVEAL, start.base + dx)));
	}

	function onTouchEnd(e) {
		cancelLongPress();
		const start = touch.current;
		touch.current = null;
		if (!start?.swiping) return;
		// Stop the browser turning the end of a swipe into a tap.
		if (e.cancelable) e.preventDefault();
		setDragging(false);
		setOffset((current) => (current < -REVEAL / 2 ? -REVEAL : 0));
	}

	function handleClick() {
		if (suppressClick.current) {
			suppressClick.current = false;
			return;
		}
		if (revealed) {
			setOffset(0);
			return;
		}
		onOpen?.();
	}

	const menuItems = [
		{ label: "Edit", onSelect: () => onOpen?.(), hidden: !onOpen },
		{
			label: "Delete",
			onSelect: () => onDelete?.(),
			destructive: true,
			hidden: !onDelete,
		},
	];

	return (
		<div className={"swipe-row " + className}>
			{onDelete && (
				<button
					type="button"
					className="swipe-row-delete"
					aria-label={`Delete ${label}`}
					aria-hidden={!revealed}
					tabIndex={revealed ? 0 : -1}
					onClick={() => {
						setOffset(0);
						onDelete();
					}}
				>
					Delete
				</button>
			)}
			<div
				className={
					"swipe-row-front" + (dragging ? " swipe-row-front--dragging" : "")
				}
				style={revealed ? { transform: `translateX(${offset}px)` } : undefined}
			>
				<div
					className="swipe-row-main"
					role="button"
					tabIndex={0}
					aria-label={openLabel}
					onClick={handleClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onOpen?.();
						}
					}}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					onTouchCancel={onTouchEnd}
					onContextMenu={(e) => e.preventDefault()}
				>
					<div className="swipe-row-content">{children}</div>
					<ChevronRight
						size={16}
						className="swipe-row-chevron"
						aria-hidden="true"
					/>
				</div>
				{onDelete && (
					<MoreMenu
						label={`More actions for ${label}`}
						items={menuItems}
						open={menuOpen}
						onOpenChange={setMenuOpen}
						className="swipe-row-more"
					/>
				)}
			</div>
		</div>
	);
}
