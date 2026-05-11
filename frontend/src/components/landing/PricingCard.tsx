import React from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuBadgeCheck, LuCheck, LuSparkles } from "react-icons/lu";
import { hasNoUpfrontPayment } from "../../utils/packagePricing";
import { glowColor, packageFeatures, priceColorClass, type PackageFeature, type PricingPackage } from "./pricingData";

interface PricingCardProps {
	pkg: PricingPackage;
	index: number;
	className?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ pkg, index, className = "" }) => {
	const Icon = pkg.icon;
	const tierKey = pkg.tier.toLowerCase() as keyof Pick<PackageFeature, "iklan" | "ticketing" | "voting" | "ticketing_voting" | "bronze" | "gold">;
	const includedFeatures = packageFeatures.filter((f) => f[tierKey]);
	const isPaid = !hasNoUpfrontPayment(pkg.tier);

	return (
		<div
			className={`pricing-card group ${pkg.featured ? "pricing-card-featured" : ""} ${isPaid ? "pricing-card-paid" : "pricing-card-compact"} ${className}`}
			style={{
				animationDelay: `${index * 80}ms`,
				"--glow": glowColor[pkg.tier],
				"--pricing-accent": pkg.accent,
				"--pricing-accent-soft": pkg.accentSoft,
			} as React.CSSProperties}
		>
			<div className="pricing-card-shimmer absolute inset-0 pointer-events-none z-10" />
			<div className="pricing-card-orbit" />

			<div className="pricing-card-body relative z-20 flex h-full flex-col">
				<div className="pricing-card-head flex items-start justify-between gap-2.5">
					<div className="flex min-w-0 items-center gap-2.5">
						<div className="pricing-card-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl">
							<Icon className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<p className="pricing-kicker text-gray-400 dark:text-gray-500">
								{pkg.kicker}
							</p>
							<h3 className="pricing-card-title text-gray-900 dark:text-white">
								{pkg.name}
							</h3>
						</div>
					</div>
					<span className="pricing-tier-badge">
						{pkg.tier.replace("_", " + ")}
					</span>
				</div>

				<div className="pricing-copy-block">
					<div className="flex flex-wrap items-end gap-x-2 gap-y-1">
						<p className={`pricing-price ${priceColorClass[pkg.tier]}`}>
							{pkg.price}
						</p>
					</div>
					<p className="pricing-summary text-gray-500 dark:text-gray-400">
						{pkg.summary}
					</p>
				</div>

				<div className="pricing-meta-grid grid grid-cols-2 gap-2">
					<div className="pricing-meta-pill">
						<LuBadgeCheck className="h-3.5 w-3.5" />
						<span>{includedFeatures.length || "Demo"} fitur</span>
					</div>
					<div className="pricing-meta-pill">
						<LuSparkles className="h-3.5 w-3.5" />
						<span>{isPaid ? "Pro setup" : pkg.tier === "IKLAN" ? "Tanpa DP" : "Via admin"}</span>
					</div>
				</div>

				<div className="pricing-feature-list">
					{includedFeatures.length === 0 ? (
						<div className="pricing-feature" style={{ animationDelay: `${index * 80}ms` }}>
							<LuCheck className="h-3.5 w-3.5 flex-shrink-0" />
							<span>Akses demo saja</span>
						</div>
					) : (
						includedFeatures.map((feature, fi) => (
							<div
								key={feature.name}
								className="pricing-feature"
								style={{ animationDelay: `${index * 80 + fi * 35}ms` }}
							>
								<LuCheck className="h-3.5 w-3.5 flex-shrink-0" />
								<span>{feature.name}</span>
							</div>
						))
					)}
				</div>

				{pkg.note && (
					<p className="pricing-note">
						{pkg.note}
					</p>
				)}

				<Link
					to="/register"
					className={`pricing-card-btn ${pkg.btnClass}`}
				>
					<span>Daftar Sekarang</span>
					<LuArrowRight className="h-4 w-4 pricing-btn-arrow" />
				</Link>
			</div>
		</div>
	);
};

export default PricingCard;
