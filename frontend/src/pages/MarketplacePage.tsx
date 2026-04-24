import React from "react";
import { Link } from "react-router-dom";
import { LuStore, LuTrendingUp, LuShield, LuUsers, LuArrowRight } from "react-icons/lu";
import MarketplaceTab from "../components/marketplace/MarketplaceTab";

const MarketplacePage: React.FC = () => {
	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						TEMUKAN PRODUK
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						Marketplace
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Temukan dan pesan produk yang tersedia
					</p>
				</div>
				<MarketplaceTab />

				{/* Seller CTA Section */}
				<div className="mt-16 mb-8">
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 dark:from-red-700 dark:via-red-600 dark:to-orange-600 p-8 md:p-12">
						{/* Background decorations */}
						<div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.06] rounded-full -translate-y-1/2 translate-x-1/3" />
						<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.04] rounded-full translate-y-1/3 -translate-x-1/4" />
						<div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/[0.05] rounded-full" />

						<div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
							{/* Left: Text content */}
							<div className="flex-1 text-center md:text-left">
								<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium mb-4">
									<LuStore className="w-3.5 h-3.5" />
									<span>Buka Toko Gratis</span>
								</div>
								<h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 leading-tight">
									Jual Produkmu di<br />Simpaskor Marketplace
								</h2>
								<p className="text-white/80 text-sm md:text-base max-w-lg mb-6 leading-relaxed">
									Jangkau ribuan komunitas Paskibra & marching band se-Indonesia. 
									Mulai dari seragam, alat musik, aksesoris, hingga merchandise — semua bisa dijual di sini.
								</p>
								<div className="flex flex-col sm:flex-row items-center gap-3">
									<Link
										to="/register"
										className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-red-600 font-semibold text-sm hover:bg-gray-50 transition-all shadow-lg shadow-black/10 group"
									>
										<span>Mulai Jualan Sekarang</span>
										<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</Link>
									<span className="text-white/60 text-xs">Tanpa biaya pendaftaran</span>
								</div>
							</div>

							{/* Right: Feature highlights */}
							<div className="flex-shrink-0 grid grid-cols-1 gap-3 w-full md:w-auto md:min-w-[260px]">
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
									<div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
										<LuUsers className="w-4.5 h-4.5 text-white" />
									</div>
									<div>
										<p className="text-white text-sm font-semibold">Pasar Luas</p>
										<p className="text-white/60 text-xs">Ribuan anggota komunitas aktif</p>
									</div>
								</div>
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
									<div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
										<LuShield className="w-4.5 h-4.5 text-white" />
									</div>
									<div>
										<p className="text-white text-sm font-semibold">Transaksi Aman</p>
										<p className="text-white/60 text-xs">Pembayaran via Midtrans</p>
									</div>
								</div>
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
									<div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
										<LuTrendingUp className="w-4.5 h-4.5 text-white" />
									</div>
									<div>
										<p className="text-white text-sm font-semibold">Gratis & Mudah</p>
										<p className="text-white/60 text-xs">Tanpa biaya, langsung mulai</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MarketplacePage;
