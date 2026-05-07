import React from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuArrowRight, LuBadgeCheck, LuPackageCheck } from "react-icons/lu";
import PricingCard from "../components/landing/PricingCard";
import { packages } from "../components/landing/pricingData";

const PackagesPage: React.FC = () => {
	return (
		<div className="packages-page relative z-10 min-h-full px-4 sm:px-6 md:px-12 lg:px-16 py-8 md:py-10">
			<div className="max-w-7xl mx-auto">
				<div className="packages-page-header">
					<Link to="/" className="packages-back-link">
						<LuArrowLeft className="h-4 w-4" />
						Kembali
					</Link>
					<div className="packages-title-block">
						<p className="text-[10px] md:text-xs tracking-[0.32em] text-orange-500/80 dark:text-orange-300/70 font-black mb-3">
							PAKET SIMPASKOR
						</p>
						<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none landing-title-gradient-pricing">
							Semua Paket
						</h1>
						<p>
							Bandingkan seluruh pilihan paket untuk event Anda, mulai dari demo, ticketing, voting, sampai operasional lengkap dengan pendampingan.
						</p>
					</div>
					<div className="packages-header-stats">
						<div>
							<LuPackageCheck className="h-5 w-5" />
							<span>{packages.length} paket</span>
						</div>
						<div>
							<LuBadgeCheck className="h-5 w-5" />
							<span>Custom tersedia</span>
						</div>
					</div>
				</div>

				<div className="packages-grid">
					{packages.map((pkg, index) => (
						<PricingCard key={pkg.tier} pkg={pkg} index={index} className="packages-grid-card" />
					))}
				</div>

				<div className="packages-page-footer">
					<p>Masih ragu paket mana yang paling cocok?</p>
					<Link to="/register">
						Konsultasi Sekarang
						<LuArrowRight className="h-4 w-4" />
					</Link>
				</div>
			</div>
		</div>
	);
};

export default PackagesPage;
