import React from "react";
import { Link } from "react-router-dom";
import {
	UserGroupIcon,
	TrophyIcon,
	AcademicCapIcon,
	ChartBarIcon,
	ShieldCheckIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";

const LandingPage: React.FC = () => {
	const features = [
		{
			icon: UserGroupIcon,
			title: "Multi-Role Management",
			description:
				"Kelola berbagai peran: Superadmin, Panitia, Juri, Peserta, dan Pelatih dalam satu platform.",
		},
		{
			icon: TrophyIcon,
			title: "Kompetisi Terintegrasi",
			description:
				"Sistem kompetisi lengkap dengan penilaian, ranking, dan sertifikat digital.",
		},
		{
			icon: AcademicCapIcon,
			title: "Platform Pelatihan",
			description:
				"Modul pelatihan interaktif untuk meningkatkan kemampuan peserta.",
		},
		{
			icon: ChartBarIcon,
			title: "Analytics & Reporting",
			description:
				"Dashboard analitik real-time untuk monitoring progress dan performa.",
		},
		{
			icon: ShieldCheckIcon,
			title: "Keamanan Terjamin",
			description:
				"Sistem autentikasi dan otorisasi berlapis untuk melindungi data.",
		},
		{
			icon: ClockIcon,
			title: "Real-time Updates",
			description:
				"Notifikasi dan update real-time untuk semua aktivitas kompetisi.",
		},
	];

	const testimonials = [
		{
			name: "Dr. Ahmad Wijaya",
			role: "Direktur Pendidikan",
			content:
				"Platform yang sangat membantu dalam mengelola kompetisi nasional. Interface yang user-friendly dan fitur lengkap.",
			avatar: "🧑‍🎓",
		},
		{
			name: "Sarah Melinda",
			role: "Koordinator Kompetisi",
			content:
				"Simpaskor memudahkan kami dalam mengorganisir kompetisi dengan peserta dari seluruh Indonesia.",
			avatar: "👩‍💼",
		},
		{
			name: "Prof. Budi Santoso",
			role: "Ketua Juri",
			content:
				"Sistem penilaian yang objektif dan transparan. Sangat membantu proses evaluasi peserta.",
			avatar: "👨‍🏫",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			{/* Navigation */}
			<nav className="bg-white shadow-lg">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center">
							<div className="flex-shrink-0 flex items-center">
								<TrophyIcon className="h-8 w-8 text-indigo-600" />
								<span className="ml-2 text-xl font-bold text-gray-900">
									Simpaskor
								</span>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							<Link
								to="/login"
								className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
							>
								Masuk
							</Link>
							<Link
								to="/register"
								className="text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-md text-sm font-medium border border-indigo-600 hover:border-indigo-800 transition-colors duration-200"
							>
								Daftar
							</Link>
						</div>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative overflow-hidden">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
					<div className="text-center">
						<h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
							Platform Kompetisi
							<span className="text-indigo-600 block">Terdepan Indonesia</span>
						</h1>
						<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
							Simpaskor adalah platform digital terpadu untuk mengelola
							kompetisi, pelatihan, dan pengembangan kemampuan dengan sistem
							yang modern dan terintegrasi.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								to="/register"
								className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
							>
								Mulai Sekarang
							</Link>
							<Link
								to="/login"
								className="bg-white hover:bg-gray-50 text-indigo-600 px-8 py-3 rounded-lg text-lg font-semibold border border-indigo-600 transition-colors duration-200 shadow-lg hover:shadow-xl"
							>
								Masuk Portal
							</Link>
						</div>
					</div>
				</div>

				{/* Decorative elements */}
				<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
					<div className="absolute -top-10 -right-10 w-80 h-80 bg-indigo-200 rounded-full opacity-20"></div>
					<div className="absolute top-1/2 -left-20 w-60 h-60 bg-blue-200 rounded-full opacity-20"></div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Fitur Unggulan
						</h2>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							Platform komprehensif dengan fitur-fitur canggih untuk mendukung
							penyelenggaraan kompetisi yang efektif dan efisien.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature, index) => (
							<div
								key={index}
								className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200"
							>
								<feature.icon className="h-12 w-12 text-indigo-600 mb-4" />
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									{feature.title}
								</h3>
								<p className="text-gray-600">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-20 bg-indigo-600">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
						<div>
							<div className="text-4xl font-bold mb-2">10,000+</div>
							<div className="text-indigo-200">Peserta Aktif</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">500+</div>
							<div className="text-indigo-200">Kompetisi Selesai</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">50+</div>
							<div className="text-indigo-200">Instansi Partner</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">99.9%</div>
							<div className="text-indigo-200">Uptime System</div>
						</div>
					</div>
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Apa Kata Mereka
						</h2>
						<p className="text-xl text-gray-600">
							Testimoni dari para pengguna yang telah merasakan manfaat platform
							Simpaskor.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{testimonials.map((testimonial, index) => (
							<div key={index} className="bg-white p-8 rounded-xl shadow-lg">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">{testimonial.avatar}</span>
									<div>
										<h4 className="font-semibold text-gray-900">
											{testimonial.name}
										</h4>
										<p className="text-gray-600 text-sm">{testimonial.role}</p>
									</div>
								</div>
								<p className="text-gray-700 italic">"{testimonial.content}"</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-white">
				<div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
						Siap Memulai Kompetisi Anda?
					</h2>
					<p className="text-xl text-gray-600 mb-8">
						Bergabunglah dengan ribuan pengguna lainnya dan rasakan pengalaman
						mengelola kompetisi yang tak terlupakan.
					</p>
					<Link
						to="/register"
						className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl inline-block"
					>
						Daftar Gratis Sekarang
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<div className="flex items-center mb-4">
								<TrophyIcon className="h-8 w-8 text-indigo-400" />
								<span className="ml-2 text-xl font-bold">Simpaskor</span>
							</div>
							<p className="text-gray-400">
								Platform kompetisi terdepan untuk mengembangkan potensi dan
								prestasi.
							</p>
						</div>
						<div>
							<h3 className="text-lg font-semibold mb-4">Platform</h3>
							<ul className="space-y-2 text-gray-400">
								<li>
									<Link to="/login" className="hover:text-white">
										Masuk
									</Link>
								</li>
								<li>
									<Link to="/register" className="hover:text-white">
										Daftar
									</Link>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Tentang Kami
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-lg font-semibold mb-4">Support</h3>
							<ul className="space-y-2 text-gray-400">
								<li>
									<a href="#" className="hover:text-white">
										Help Center
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Dokumentasi
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Kontak
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-lg font-semibold mb-4">Legal</h3>
							<ul className="space-y-2 text-gray-400">
								<li>
									<a href="#" className="hover:text-white">
										Privacy Policy
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Terms of Service
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Cookie Policy
									</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
						<p>&copy; 2025 Simpaskor Platform. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default LandingPage;
