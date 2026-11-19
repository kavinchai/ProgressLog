import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import "./ios.css";

/**
 * Large-title page header at the very top of the page. `trailing` sits on the
 * title's row at the right, `back` ({ label, onClick }) is a chevron before the
 * title, and `below` is a row of buttons under the title.
 */
export function PageHeader({
	title,
	subtitle,
	trailing,
	back,
	below,
	titleClassName = "",
}) {
	return (
		<header className="ios-header">
			<div className="ios-title-row">
				{back && (
					<button
						type="button"
						className="ios-back"
						aria-label={back.label}
						onClick={back.onClick}
					>
						<ChevronLeft size={30} aria-hidden="true" />
					</button>
				)}
				<h1 className={"ios-large-title " + titleClassName}>{title}</h1>
				{trailing && <span className="ios-title-trailing">{trailing}</span>}
			</div>
			{below && <div className="ios-header-below">{below}</div>}
			{subtitle && <p className="ios-subtitle">{subtitle}</p>}
		</header>
	);
}

/** iOS segmented control: a gray track with a white selected segment. */
export function SegmentedControl({ label, options, value, onChange, className = "" }) {
	const selected = options.findIndex((o) => o.value === value);
	return (
		<div
			className={"ios-seg " + className}
			role="group"
			aria-label={label}
			style={{ "--seg-n": options.length, "--seg-i": selected }}
		>
			{selected >= 0 && <span className="ios-seg-thumb" aria-hidden="true" />}
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={value === o.value}
					className={value === o.value ? "on" : ""}
					onClick={() => onChange(o.value)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

/** Inset grouped list section with an optional header and footer. */
export function ListGroup({ header, footer, children, className = "", label }) {
	return (
		<section className={"ios-section " + className} aria-label={label}>
			{header && <div className="ios-section-header">{header}</div>}
			<div className="ios-group">{children}</div>
			{footer && <p className="ios-section-footer">{footer}</p>}
		</section>
	);
}

/**
 * One row in a ListGroup. With `onClick` it's a button (and gets a chevron
 * when `chevron` is set); otherwise a plain row.
 */
export function ListRow({
	icon,
	iconColor,
	label,
	detail,
	value,
	chevron,
	onClick,
	destructive,
	accent,
	children,
	ariaLabel,
}) {
	const body = (
		<>
			{icon && (
				<span className="ios-row-icon" style={{ background: iconColor }} aria-hidden="true">
					{icon}
				</span>
			)}
			{label != null && (
				<span className="ios-row-text">
					<span className="ios-row-label">{label}</span>
					{detail && <span className="ios-row-detail">{detail}</span>}
				</span>
			)}
			{children}
			{value != null && <span className="ios-row-value">{value}</span>}
			{chevron && <ChevronRight size={16} className="ios-row-chevron" aria-hidden="true" />}
		</>
	);
	const cls =
		"ios-row" +
		(destructive ? " ios-row--destructive" : "") +
		(accent ? " ios-row--accent" : "");
	return onClick ? (
		<button type="button" className={cls + " ios-row--button"} onClick={onClick} aria-label={ariaLabel}>
			{body}
		</button>
	) : (
		<div className={cls}>{body}</div>
	);
}

/** iOS switch. */
export function Switch({ checked, onChange, label, disabled }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			className={"ios-switch" + (checked ? " on" : "")}
			onClick={() => onChange(!checked)}
		/>
	);
}

/**
 * A pull-down menu like iOS: a button that opens a list of choices.
 * `sections` is [{ title?, options: [{ value, label }], value, onChange }].
 * Shows a check next to each section's chosen option.
 */
export function PullDownMenu({ label, buttonLabel, icon, sections, className = "" }) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const triggerRef = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) {
			setPosition({
				top: rect.bottom + 6,
				right: Math.max(window.innerWidth - rect.right, 8),
			});
		}
		function onPointerDown(e) {
			if (
				!triggerRef.current?.contains(e.target) &&
				!listRef.current?.contains(e.target)
			) {
				setOpen(false);
			}
		}
		function onKeyDown(e) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				className={"ios-pulldown " + className}
				aria-label={buttonLabel ? `${label}: ${buttonLabel}` : label}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			>
				{buttonLabel}
				{icon ?? <ChevronDown size={15} aria-hidden="true" />}
			</button>
			{open &&
				createPortal(
					<div
						ref={listRef}
						className="ios-menu"
						role="menu"
						aria-label={label}
						style={position ?? undefined}
					>
						{sections.map((s, i) => (
							<div key={s.title ?? i} className="ios-menu-section">
								{s.title && <div className="ios-menu-title">{s.title}</div>}
								{s.options.map((o) => (
									<button
										key={o.value}
										type="button"
										role="menuitemradio"
										aria-checked={s.value === o.value}
										className="ios-menu-item"
										onClick={() => {
											setOpen(false);
											s.onChange(o.value);
										}}
									>
										<span className="ios-menu-check">
											{s.value === o.value && <Check size={16} aria-hidden="true" />}
										</span>
										{o.label}
									</button>
								))}
							</div>
						))}
					</div>,
					document.body,
				)}
		</>
	);
}

/** A stat tile that also picks what the chart below shows. */
export function StatTile({ label, value, unit, sub, selected, onSelect }) {
	return (
		<button
			type="button"
			className="ios-tile"
			aria-pressed={selected}
			aria-label={label}
			onClick={onSelect}
		>
			<span className="ios-tile-label">{label}</span>
			<span className="ios-tile-value">
				{value}
				{unit && <small> {unit}</small>}
			</span>
			{sub && <span className="ios-tile-sub">{sub}</span>}
		</button>
	);
}

/** Period title with previous/next chevrons (History). */
export function PeriodNav({
	title,
	sub,
	prevLabel,
	nextLabel,
	onPrev,
	onNext,
	prevDisabled,
	nextDisabled,
	action,
}) {
	return (
		<div className="ios-period">
			<div>
				<h2 className="ios-period-title">{title}</h2>
				{sub && <div className="ios-period-sub">{sub}</div>}
			</div>
			<div className="ios-period-nav">
				{action}
				<button
					type="button"
					className="ios-icon-btn"
					aria-label={prevLabel}
					onClick={onPrev}
					disabled={prevDisabled}
				>
					<ChevronLeft size={24} aria-hidden="true" />
				</button>
				<button
					type="button"
					className="ios-icon-btn"
					aria-label={nextLabel}
					onClick={onNext}
					disabled={nextDisabled}
				>
					<ChevronRight size={24} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
