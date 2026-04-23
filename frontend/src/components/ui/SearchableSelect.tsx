import React, { useState, useRef, useEffect, useMemo } from "react";
import { LuSearch, LuChevronDown, LuX } from "react-icons/lu";

interface Option {
	value: string;
	label: string;
}

interface SearchableSelectProps {
	options: Option[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
	className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
	options,
	value,
	onChange,
	placeholder = "Pilih...",
	disabled = false,
	error = false,
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = useMemo(() => {
		if (!search.trim()) return options;
		const q = search.toLowerCase();
		return options.filter((o) => o.label.toLowerCase().includes(q));
	}, [options, search]);

	const selectedLabel = options.find((o) => o.value === value)?.label || "";

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	const handleSelect = (val: string) => {
		onChange(val);
		setIsOpen(false);
		setSearch("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		setSearch("");
	};

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				disabled={disabled}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-left transition-colors ${
					disabled
						? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600"
						: error
						? "border-red-500 dark:border-red-400 focus:ring-2 focus:ring-red-500"
						: isOpen
						? "border-red-500 dark:border-red-400 ring-2 ring-red-500/20"
						: "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
				}`}
			>
				<span className={value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}>
					{selectedLabel || placeholder}
				</span>
				<div className="flex items-center gap-1 ml-2 shrink-0">
					{value && !disabled && (
						<span
							role="button"
							tabIndex={-1}
							onClick={handleClear}
							className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<LuX className="w-3.5 h-3.5" />
						</span>
					)}
					<LuChevronDown
						className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
					/>
				</div>
			</button>

			{isOpen && (
				<div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
					{/* Search input */}
					<div className="p-2 border-b border-gray-200 dark:border-gray-700">
						<div className="relative">
							<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								ref={inputRef}
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Cari..."
								className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
							/>
						</div>
					</div>

					{/* Options list */}
					<ul className="max-h-60 overflow-y-auto py-1">
						{filtered.length === 0 ? (
							<li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
								Tidak ditemukan
							</li>
						) : (
							filtered.map((option) => (
								<li
									key={option.value}
									onClick={() => handleSelect(option.value)}
									className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
										option.value === value
											? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium"
											: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
									}`}
								>
									{option.label}
								</li>
							))
						)}
					</ul>
				</div>
			)}
		</div>
	);
};

export default SearchableSelect;
