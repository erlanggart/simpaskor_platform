import React from "react";
import { Link } from "react-router-dom";

interface LogoProps {
	/** Size variant for the logo */
	size?: "sm" | "md" | "lg" | "xl";
	/** Whether to show text alongside logo */
	showText?: boolean;
	/** Custom className for additional styling */
	className?: string;
	/** Whether logo is clickable and links to home */
	clickable?: boolean;
	/** Theme variant */
	variant?: "default" | "white" | "dark" | "auto";
}

const sizeClasses = {
	sm: "h-8",
	md: "h-12",
	lg: "h-16",
	xl: "h-24",
};

const textSizeClasses = {
	sm: "text-lg",
	md: "text-xl",
	lg: "text-2xl",
	xl: "text-4xl",
};

/**
 * Logo Component
 *
 * Displays the Simpaskor logo with optional text and configurable size.
 * Can be used in headers, footers, and authentication pages.
 *
 * @example
 * ```tsx
 * // Simple logo
 * <Logo />
 *
 * // Large logo with text
 * <Logo size="lg" showText />
 *
 * // Non-clickable logo for footer
 * <Logo showText clickable={false} />
 * ```
 */
export const Logo: React.FC<LogoProps> = ({
	size = "md",
	showText = false,
	className = "",
	clickable = true,
	variant = "default",
}) => {
	const logoContent = (
		<div className={`flex items-center gap-3 ${className}`}>
			{/* Logo Image */}
			<div
				className={`p-1 rounded-lg ${
					variant === "auto"
						? "bg-black dark:bg-white/10 dark:backdrop-blur-sm"
						: variant === "white" || variant === "dark"
						? "bg-white/10 backdrop-blur-sm"
						: "bg-black"
				}`}
			>
				<img
					src="/simpaskor.webp"
					alt="Simpaskor Logo"
					className={`${sizeClasses[size]} object-contain`}
				/>
			</div>

			{/* Logo Text */}
			{showText && (
				<div className="flex flex-col">
					<span
						className={`font-bold ${textSizeClasses[size]} ${
							variant === "auto"
								? "text-gray-900 dark:text-white"
								: variant === "white" || variant === "dark"
								? "text-white"
								: "text-gray-900"
						}`}
					>
						Simpaskor
					</span>
					<span
						className={`text-xs ${
							variant === "auto"
								? "text-gray-500 dark:text-gray-300"
								: variant === "white" || variant === "dark"
								? "text-gray-300"
								: "text-gray-500"
						}`}
					>
						Sistem Paskibra Skor
					</span>
				</div>
			)}
		</div>
	);

	if (clickable) {
		return (
			<Link
				to="/"
				className="inline-flex items-center hover:opacity-80 transition-opacity"
			>
				{logoContent}
			</Link>
		);
	}

	return logoContent;
};

/**
 * Logo with White Variant
 * Useful for dark backgrounds
 */
export const LogoWhite: React.FC<Omit<LogoProps, "variant">> = (props) => {
	return <Logo {...props} variant="white" />;
};

export default Logo;
