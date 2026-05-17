import { useEffect, useState } from "react";

type Theme = "light" | "dark";

if (typeof window !== "undefined") {
	localStorage.removeItem("theme");
}

export const useTheme = () => {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
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
