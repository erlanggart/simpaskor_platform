import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export const useTheme = () => {
	const [theme, setTheme] = useState<Theme>(() => {
		// Check localStorage first, default to light
		const savedTheme = localStorage.getItem("theme") as Theme;
		if (savedTheme) {
			return savedTheme;
		}

		return "light";
	});

	useEffect(() => {
		// Update localStorage
		localStorage.setItem("theme", theme);

		// Update document class
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};
	return { theme, setTheme, toggleTheme };
};
