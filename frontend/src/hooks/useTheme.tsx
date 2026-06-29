import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const getInitialTheme = (): Theme => {
	if (typeof window === "undefined") return "light";
	const stored = localStorage.getItem("theme");
	if (stored === "dark" || stored === "light") return stored;
	return "light"; // ponytail: light is the default; OS preference ignored on purpose
};

export const useTheme = () => {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};
	return { theme, setTheme, toggleTheme };
};
