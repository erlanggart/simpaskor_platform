import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";
import PricingCard from "./PricingCard";
import { packages } from "./pricingData";

const PricingSection: React.FC = () => {
	const carouselRef = useRef<HTMLDivElement>(null);

	const scrollPackages = (direction: "left" | "right") => {
		const carousel = carouselRef.current;
		if (!carousel) return;

		carousel.scrollBy({
			left: direction === "left" ? -carousel.clientWidth : carousel.clientWidth,
			behavior: "smooth",
		});
	};

	return (
		<div className="pricing-section pricing-section-carousel relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-16 py-3">
			<div className="pricing-shell">
				<div className="pricing-header pricing-header-carousel">
					<div>
						<p className="text-[9px] md:text-[10px] tracking-[0.32em] text-orange-500/80 dark:text-orange-300/70 font-black mb-2">
							DAFTARKAN EVENT ANDA
						</p>
						<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-none landing-title-gradient-pricing">
							Pilih Paket Anda
						</h1>
					</div>
					<div className="pricing-header-actions">
						<div className="pricing-header-copy">
							<div className="pricing-header-line" />
							<p>
								Geser untuk melihat pilihan paket. Tampilan awal dibuat ringkas agar landing tetap bersih.
							</p>
						</div>
						<div className="pricing-carousel-actions">
							<button
								type="button"
								onClick={() => scrollPackages("left")}
								className="pricing-carousel-btn"
								aria-label="Geser paket ke kiri"
							>
								<LuArrowLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={() => scrollPackages("right")}
								className="pricing-carousel-btn"
								aria-label="Geser paket ke kanan"
							>
								<LuArrowRight className="h-4 w-4" />
							</button>
							<Link to="/packages" className="pricing-all-link">
								Semua Paket
								<LuArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</div>
				</div>

				<div ref={carouselRef} className="pricing-carousel" aria-label="Daftar paket Simpaskor">
					{packages.map((pkg, index) => (
						<PricingCard
							key={pkg.tier}
							pkg={pkg}
							index={index}
							className="pricing-carousel-card"
						/>
					))}
				</div>

				<div className="pricing-carousel-footer">
					<span>Geser card untuk paket lain</span>
					<span>Butuh detail lengkap? Buka halaman semua paket.</span>
				</div>
			</div>
		</div>
	);
};

export default PricingSection;
