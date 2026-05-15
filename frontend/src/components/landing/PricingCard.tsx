import React from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { hasNoUpfrontPayment } from "../../utils/packagePricing";
import { glowColor, packageFeatures, type PackageFeature, type PricingPackage } from "./pricingData";

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
			{pkg.featured && (
				<div className="pricing-card-popular">
					<span>★ POPULAR</span>
				</div>
			)}

			<div className="pricing-card-shimmer absolute inset-0 pointer-events-none z-10" />
			<div className="pricing-card-glow" />

			<div className="pricing-card-body relative z-20 flex h-full flex-col">
				<div className="pricing-card-head">
					<div className="pricing-card-icon">
						<Icon className="h-5 w-5" />
					</div>
					<span className="pricing-tier-badge">
						{pkg.tier.replace("_", " + ")}
					</span>
				</div>

				<div className="pricing-card-meta">
					<p className="pricing-kicker">{pkg.kicker}</p>
					<h3 className="pricing-card-title">{pkg.name}</h3>
				</div>

				<div className="pricing-price-block">
					<p className="pricing-price">{pkg.price}</p>
					<p className="pricing-summary">{pkg.summary}</p>
				</div>

				<div className="pricing-divider" />

				<ul className="pricing-feature-list">
					{includedFeatures.length === 0 ? (
						<li className="pricing-feature" style={{ animationDelay: `${index * 80}ms` }}>
							<span className="pricing-feature-check">
								<LuCheck className="h-3 w-3" strokeWidth={3} />
							</span>
							<span>Akses demo saja</span>
						</li>
					) : (
						includedFeatures.map((feature, fi) => (
							<li
								key={feature.name}
								className="pricing-feature"
								style={{ animationDelay: `${index * 80 + fi * 35}ms` }}
							>
								<span className="pricing-feature-check">
									<LuCheck className="h-3 w-3" strokeWidth={3} />
								</span>
								<span>{feature.name}</span>
							</li>
						))
					)}
				</ul>

				{pkg.note && (
					<p className="pricing-note">{pkg.note}</p>
				)}

				<Link
					to="/register"
					className={`pricing-card-btn ${pkg.btnClass}`}
				>
					<span>{isPaid ? "Daftar Sekarang" : "Mulai Sekarang"}</span>
					<LuArrowRight className="h-4 w-4 pricing-btn-arrow" />
				</Link>
			</div>
		</div>
	);
};

export default PricingCard;
