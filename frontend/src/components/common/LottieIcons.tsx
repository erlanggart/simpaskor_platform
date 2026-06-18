import React from "react";
import Lottie from "lottie-react";
import trophyAnimation from "../../assets/lottie/trophy.json";
import eyesAnimation from "../../assets/lottie/eyes.json";
import usersAnimation from "../../assets/lottie/users-micro.json";

interface LottieIconProps {
	/** Tailwind sizing/spacing classes (e.g. "w-5 h-5"). */
	className?: string;
	/** Loop the animation. Defaults to true. */
	loop?: boolean;
	/** Autoplay the animation. Defaults to true. */
	autoplay?: boolean;
}

/**
 * Drop-in replacement for react-icons trophy (LuTrophy).
 * Accepts a `className` for sizing so it can be used both as a
 * JSX element and as an `icon` component reference.
 */
export const TrophyIcon: React.FC<LottieIconProps> = ({
	className,
	loop = true,
	autoplay = true,
}) => (
	<Lottie
		animationData={trophyAnimation}
		loop={loop}
		autoplay={autoplay}
		className={className}
		rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
	/>
);

/**
 * Drop-in replacement for react-icons eye (LuEye), used for the
 * "visitors" stat in the hero section.
 */
export const EyesIcon: React.FC<LottieIconProps> = ({
	className,
	loop = true,
	autoplay = true,
}) => (
	<Lottie
		animationData={eyesAnimation}
		loop={loop}
		autoplay={autoplay}
		className={className}
		rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
	/>
);

/**
 * Drop-in replacement for react-icons users (LuUsers), used for the
 * "members" stat in the hero section.
 */
export const UsersIcon: React.FC<LottieIconProps> = ({
	className,
	loop = true,
	autoplay = true,
}) => (
	<Lottie
		animationData={usersAnimation}
		loop={loop}
		autoplay={autoplay}
		className={className}
		rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
	/>
);
