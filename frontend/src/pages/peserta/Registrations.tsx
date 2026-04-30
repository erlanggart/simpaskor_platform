import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
	LuArrowRight,
	LuBadgeCheck,
	LuBuilding2,
	LuCalendarDays,
	LuChevronDown,
	LuChevronUp,
	LuCircleAlert,
	LuCircleCheck,
	LuCircleX,
	LuClock,
	LuCreditCard,
	LuMapPin,
	LuRefreshCw,
	LuSearch,
	LuShieldCheck,
	LuUsers,
	LuWallet,
	LuX,
} from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import { usePayment } from "../../hooks/usePayment";
import {
	EventRegistration,
	PersonMember,
} from "../../types/landing";

type BadgeMeta = {
	label: string;
	className: string;
	icon: React.ReactNode;
};

type RegistrationFilter = "all" | "PENDING_PAYMENT" | "REGISTERED" | "CONFIRMED" | "CANCELLED";

const getImageUrl = (url?: string | null): string | null => {
	if (!url) return null;
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	return `${config.api.backendUrl}${url}`;
};

const parseMemberData = (memberDataStr: string | null): PersonMember[] => {
	if (!memberDataStr) return [];
	try {
		const parsed = JSON.parse(memberDataStr);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const formatDate = (dateString?: string | null) => {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const formatCurrency = (amount?: number | null) => {
	if (!amount) return "Gratis";
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(amount);
};

const getEventPath = (registration: EventRegistration) =>
	registration.event ? `/events/${registration.event.slug || registration.event.id}` : "#";

const getRegistrationStatusMeta = (status?: string): BadgeMeta => {
	switch (status) {
		case "PENDING_PAYMENT":
			return {
				label: "Menunggu Pembayaran",
				className:
					"border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
				icon: <LuWallet className="h-3.5 w-3.5" />,
			};
		case "REGISTERED":
		case "PENDING":
			return {
				label: "Menunggu Persetujuan",
				className:
					"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		case "CONFIRMED":
		case "APPROVED":
			return {
				label: "Terdaftar",
				className:
					"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
				icon: <LuCircleCheck className="h-3.5 w-3.5" />,
			};
		case "CANCELLED":
			return {
				label: "Dibatalkan",
				className:
					"border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
				icon: <LuCircleX className="h-3.5 w-3.5" />,
			};
		case "REJECTED":
			return {
				label: "Ditolak",
				className:
					"border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
				icon: <LuCircleAlert className="h-3.5 w-3.5" />,
			};
		default:
			return {
				label: "Terdaftar",
				className:
					"border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300",
				icon: <LuBadgeCheck className="h-3.5 w-3.5" />,
			};
	}
};

const getPaymentStatusMeta = (status?: string | null): BadgeMeta => {
	switch (status) {
		case "PAID":
			return {
				label: "Lunas",
				className:
					"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
				icon: <LuCircleCheck className="h-3.5 w-3.5" />,
			};
		case "PENDING":
			return {
				label: "Belum Dibayar",
				className:
					"border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		case "FAILED":
		case "EXPIRED":
		case "CANCELLED":
			return {
				label: "Pembayaran Gagal",
				className:
					"border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
				icon: <LuCircleX className="h-3.5 w-3.5" />,
			};
		default:
			return {
				label: "Tanpa Pembayaran",
				className:
					"border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300",
				icon: <LuShieldCheck className="h-3.5 w-3.5" />,
			};
	}
};

const StatusBadge: React.FC<{ meta: BadgeMeta; className?: string }> = ({
	meta,
	className = "",
}) => (
	<span
		className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.className} ${className}`}
	>
		{meta.icon}
		{meta.label}
	</span>
);

const MetricCard: React.FC<{
	label: string;
	value: number;
	icon: React.ReactNode;
	tone: string;
}> = ({ label, value, icon, tone }) => (
	<div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-3">
		<div className="">
			<span className="truncate text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:text-[11px] justify-end flex">
					{label}
				</span>
			<div className="flex items-center justify-between mt-1">
				<div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tone}`}>
				{icon}
			</div>
				
				<p className="mt-0.5 text-lg font-bold text-gray-950 dark:text-white sm:mt-1 sm:text-xl">
					{value}
				</p>
			</div>
			
		</div>
	</div>
);

const InfoPill: React.FC<{
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}> = ({ icon, label, value }) => (
	<div className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
		<div className="flex items-start gap-2">
			<div className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-300">{icon}</div>
			<div className="min-w-0">
				<p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
					{label}
				</p>
				<p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
					{value}
				</p>
			</div>
		</div>
	</div>
);

const getRoleTone = (role: PersonMember["role"]) => {
	switch (role) {
		case "DANTON":
			return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300";
		case "PASUKAN":
			return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
		case "CADANGAN":
			return "border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300";
		case "OFFICIAL":
			return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
		case "PELATIH":
			return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
		default:
			return "border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300";
	}
};

const MemberAvatar: React.FC<{ member: PersonMember }> = ({ member }) => {
	const imageUrl = getImageUrl(member.photo);

	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={member.name}
				className="h-10 w-10 rounded-full border border-white object-cover shadow-sm dark:border-gray-800"
				onError={(event) => {
					event.currentTarget.style.display = "none";
				}}
			/>
		);
	}

	return (
		<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-300">
			<LuUsers className="h-4 w-4" />
		</div>
	);
};

const PesertaRegistrations: React.FC = () => {
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
	const [payingId, setPayingId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<RegistrationFilter>("all");
	const { pay, isSnapReady } = usePayment();

	useEffect(() => {
		fetchRegistrations();
	}, []);

	const fetchRegistrations = async () => {
		try {
			setLoading(true);
			const response = await api.get("/registrations/my");
			setRegistrations(response.data || []);
		} catch (error) {
			console.error("Error fetching registrations:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleCancelRegistration = async (
		registrationId: string,
		eventTitle: string
	) => {
		const result = await Swal.fire({
			title: "Batalkan Pendaftaran?",
			html: `Yakin ingin membatalkan pendaftaran Anda untuk event <strong>${eventTitle}</strong>?<br><br><small class="text-gray-500">Anda dapat mendaftar ulang setelah membatalkan.</small>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Batalkan",
			cancelButtonText: "Tidak",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/registrations/${registrationId}`);

			await Swal.fire({
				icon: "success",
				title: "Pendaftaran Dibatalkan",
				text: "Pendaftaran Anda telah dibatalkan. Anda dapat mendaftar ulang kapan saja.",
			});

			fetchRegistrations();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal Membatalkan",
				text:
					error.response?.data?.error ||
					"Terjadi kesalahan saat membatalkan pendaftaran",
			});
		}
	};

	const handleRestoreGroup = async (
		registrationId: string,
		groupId: string,
		groupName: string
	) => {
		const result = await Swal.fire({
			title: "Pulihkan Tim?",
			html: `Yakin ingin memulihkan pendaftaran tim <strong>${groupName}</strong>?`,
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#10B981",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Pulihkan",
			cancelButtonText: "Tidak",
		});

		if (!result.isConfirmed) return;

		try {
			await api.patch(`/registrations/${registrationId}/groups/${groupId}/restore`);

			await Swal.fire({
				icon: "success",
				title: "Tim Dipulihkan",
				text: `Pendaftaran ${groupName} telah dipulihkan`,
			});

			fetchRegistrations();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal Memulihkan",
				text:
					error.response?.data?.error ||
					"Terjadi kesalahan saat memulihkan tim",
			});
		}
	};

	const handlePayRegistration = async (registrationId: string) => {
		try {
			setPayingId(registrationId);
			const paymentRes = await api.post(`/registrations/${registrationId}/pay`);
			const { snapToken, status } = paymentRes.data.payment;

			if (status === "PAID" && !snapToken) {
				Swal.fire({
					icon: "success",
					title: "Pembayaran Berhasil!",
					text: "Pembayaran Anda sudah dikonfirmasi sebelumnya.",
				});
				fetchRegistrations();
				return;
			}

			if (snapToken && isSnapReady) {
				pay(snapToken, {
					onSuccess: async () => {
						try {
							await api.post(`/registrations/${registrationId}/verify-payment`);
						} catch {}
						Swal.fire({
							icon: "success",
							title: "Pembayaran Berhasil!",
							text: "Pendaftaran Anda akan segera diproses.",
						});
						fetchRegistrations();
					},
					onPending: () => {
						Swal.fire({
							icon: "info",
							title: "Pembayaran Pending",
							text: "Silakan selesaikan pembayaran Anda.",
						});
						fetchRegistrations();
					},
					onError: () => {
						Swal.fire({
							icon: "error",
							title: "Pembayaran Gagal",
							text: "Silakan coba lagi.",
						});
					},
					onClose: () => {
						Swal.fire({
							icon: "warning",
							title: "Pembayaran Belum Selesai",
							text: "Pembayaran belum dilakukan. Silakan lakukan pembayaran terlebih dahulu.",
						});
						fetchRegistrations();
					},
				});
			} else {
				Swal.fire({
					icon: "warning",
					title: "Pembayaran tidak tersedia",
					text: "Sistem pembayaran sedang tidak tersedia. Coba lagi nanti.",
				});
			}
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal Memproses Pembayaran",
				text:
					error.response?.data?.message ||
					error.response?.data?.error ||
					"Terjadi kesalahan.",
			});
		} finally {
			setPayingId(null);
		}
	};

	const summary = useMemo(
		() => ({
			total: registrations.length,
			waiting: registrations.filter((registration) =>
				["REGISTERED", "PENDING", "PENDING_PAYMENT"].includes(registration.status)
			).length,
			confirmed: registrations.filter((registration) =>
				["CONFIRMED", "APPROVED"].includes(registration.status)
			).length,
			cancelled: registrations.filter((registration) =>
				["CANCELLED", "REJECTED"].includes(registration.status)
			).length,
		}),
		[registrations]
	);

	const filterOptions = useMemo(
		() => [
			{ id: "all" as const, label: "Semua", count: summary.total },
			{
				id: "PENDING_PAYMENT" as const,
				label: "Pembayaran",
				count: registrations.filter((registration) => registration.status === "PENDING_PAYMENT").length,
			},
			{
				id: "REGISTERED" as const,
				label: "Review",
				count: registrations.filter((registration) =>
					["REGISTERED", "PENDING"].includes(registration.status)
				).length,
			},
			{ id: "CONFIRMED" as const, label: "Terdaftar", count: summary.confirmed },
			{ id: "CANCELLED" as const, label: "Batal", count: summary.cancelled },
		],
		[registrations, summary]
	);

	const filteredRegistrations = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();

		return registrations
			.filter((registration) => {
				if (statusFilter === "PENDING_PAYMENT") {
					return registration.status === "PENDING_PAYMENT";
				}
				if (statusFilter === "REGISTERED") {
					return ["REGISTERED", "PENDING"].includes(registration.status);
				}
				if (statusFilter === "CONFIRMED") {
					return ["CONFIRMED", "APPROVED"].includes(registration.status);
				}
				if (statusFilter === "CANCELLED") {
					return ["CANCELLED", "REJECTED"].includes(registration.status);
				}
				return true;
			})
			.filter((registration) => {
				if (!normalizedSearch) return true;
				const groupNames = registration.groups
					?.map((group) => group.groupName)
					.join(" ");
				return [
					registration.event?.title,
					registration.event?.location,
					registration.event?.city,
					registration.schoolName,
					registration.teamName,
					groupNames,
				]
					.filter(Boolean)
					.some((value) => value!.toLowerCase().includes(normalizedSearch));
			})
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
	}, [registrations, searchQuery, statusFilter]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50/70 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-6xl">
					<div className="mb-6 space-y-3">
						<div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-white/[0.06]" />
						<div className="h-9 w-72 animate-pulse rounded bg-gray-200 dark:bg-white/[0.06]" />
						<div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-200 dark:bg-white/[0.06]" />
					</div>
					<div className="grid grid-cols-4 gap-2 sm:gap-3">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={index}
								className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
							/>
						))}
					</div>
					<div className="mt-6 space-y-3">
						{Array.from({ length: 3 }).map((_, index) => (
							<div
								key={index}
								className="h-44 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 py-6 lg:px-8 lg:py-8">
			
				<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<p className="text-[10px] font-medium tracking-[0.28em] text-gray-400 dark:text-gray-500">
							AREA PESERTA
						</p>
						<h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-white md:text-4xl">
							Pendaftaran Saya
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
							Kelola status pendaftaran, pembayaran, dan detail tim dari satu tempat.
						</p>
					</div>

					<Link
						to="/peserta/events"
						className="inline-flex h-10 min-h-10 w-auto items-center justify-center self-start whitespace-nowrap rounded-lg bg-red-600 px-4 py-0 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 lg:self-center"
					>
						Cari Event
						<LuArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</div>

				<div className="grid grid-cols-4 gap-2 sm:gap-3">
					<MetricCard
						label="Total"
						value={summary.total}
						icon={<LuUsers className="h-5 w-5" />}
						tone="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
					/>
					<MetricCard
						label="Menunggu"
						value={summary.waiting}
						icon={<LuClock className="h-5 w-5" />}
						tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
					/>
					<MetricCard
						label="Terdaftar"
						value={summary.confirmed}
						icon={<LuCircleCheck className="h-5 w-5" />}
						tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
					/>
					<MetricCard
						label="Tidak Aktif"
						value={summary.cancelled}
						icon={<LuCircleX className="h-5 w-5" />}
						tone="bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
					/>
				</div>

				<div className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
					<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
						<div className="relative">
							<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								placeholder="Cari event, sekolah, lokasi, atau nama tim"
								className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-400 dark:focus:border-red-500/50 dark:focus:bg-white/[0.06] dark:focus:ring-red-500/10"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
									aria-label="Bersihkan pencarian"
								>
									<LuX className="h-4 w-4" />
								</button>
							)}
						</div>

						<div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
							{filterOptions.map((option) => {
								const isActive = statusFilter === option.id;
								return (
									<button
										key={option.id}
										type="button"
										onClick={() => setStatusFilter(option.id)}
										className={`inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
											isActive
												? "border-red-200 bg-red-600 text-white shadow-sm shadow-red-100 dark:border-red-500 dark:shadow-none"
												: "border-gray-200 bg-gray-50 text-gray-600 hover:border-red-200 hover:bg-white hover:text-red-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-red-500/30 dark:hover:bg-white/[0.06] dark:hover:text-red-300"
										}`}
									>
										{option.label}
										<span
											className={`rounded-md px-1.5 py-0.5 text-[11px] ${
												isActive
													? "bg-white/20 text-white"
													: "bg-gray-100 text-gray-500 dark:bg-white/[0.08] dark:text-gray-300"
											}`}
										>
											{option.count}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{registrations.length === 0 ? (
					<div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-14 text-center dark:border-white/10 dark:bg-white/[0.03]">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
							<LuUsers className="h-6 w-6" />
						</div>
						<h2 className="mt-4 text-lg font-bold text-gray-950 dark:text-white">
							Belum Ada Pendaftaran
						</h2>
						<p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
							Event yang Anda ikuti akan tampil di sini setelah proses pendaftaran dibuat.
						</p>
						<Link
							to="/peserta/events"
							className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
						>
							Lihat Event
							<LuArrowRight className="h-4 w-4" />
						</Link>
					</div>
				) : filteredRegistrations.length === 0 ? (
					<div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
						<p className="text-sm font-semibold text-gray-900 dark:text-white">
							Pendaftaran tidak ditemukan
						</p>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Coba ubah kata kunci atau filter status.
						</p>
					</div>
				) : (
					<div className="mt-6 space-y-4">
						{filteredRegistrations.map((registration) => {
							const isExpanded = expandedId === registration.id;
							const allGroups = registration.groups || [];
							const activeGroups = allGroups.filter((group) => group.status === "ACTIVE");
							const cancelledGroups = allGroups.filter(
								(group) => group.status === "CANCELLED"
							);
							const activeGroupNames = activeGroups
								.map((group) => group.groupName)
								.join(", ");
							const activeMemberCount = activeGroups.reduce((total, group) => {
								const members = parseMemberData(group.memberData);
								return total + (members.length > 0 ? members.length : group.teamMembers);
							}, 0);
							const displayGroupCount =
								activeGroups.length > 0 ? activeGroups.length : cancelledGroups.length;
							const statusMeta = getRegistrationStatusMeta(registration.status);
							const payment = registration.registrationPayment;
							const paymentMeta = getPaymentStatusMeta(payment?.status);
							const canCancelRegistration =
								(registration.status === "REGISTERED" ||
									registration.status === "PENDING_PAYMENT") &&
								activeGroups.length > 0;
							const waNumber = registration.event?.contactPhone?.replace(/[^0-9]/g, "");
							const waHref = waNumber
								? `https://wa.me/${waNumber}?text=${encodeURIComponent(
										`Halo, saya ingin bertanya mengenai pendaftaran:\n` +
											`Event: ${registration.event?.title || ""}\n` +
											`Sekolah: ${registration.schoolName || "-"}\n` +
											`Tim: ${activeGroupNames || "-"}\n` +
											`Biaya: ${formatCurrency(payment?.amount || registration.event?.registrationFee)}`
									)}`
								: null;
							const posterUrl = getImageUrl(registration.event?.thumbnail);

							return (
								<article
									key={registration.id}
									className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-red-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30"
								>
									<div className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-start">
										<Link
											to={getEventPath(registration)}
											className="group relative mx-auto aspect-[2/3] w-36 flex-none overflow-hidden rounded-lg bg-gray-100 sm:w-40 md:mx-0 md:w-[18%] md:min-w-32 md:max-w-48 xl:w-[16%]"
										>
											{posterUrl ? (
												<img
													src={posterUrl}
													alt={registration.event?.title || "Event"}
													className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
													onError={(event) => {
														event.currentTarget.style.display = "none";
													}}
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-white/[0.06]">
													<LuCalendarDays className="h-8 w-8" />
												</div>
											)}
										</Link>

										<div className="min-w-0 flex-1">
											<div className="mb-3 flex flex-wrap gap-2">
												<StatusBadge meta={statusMeta} />
												{payment && <StatusBadge meta={paymentMeta} />}
											</div>
											<Link
												to={getEventPath(registration)}
												className="line-clamp-2 text-xl font-black leading-tight text-gray-950 hover:text-red-600 dark:text-white dark:hover:text-red-300 lg:text-2xl"
											>
												{registration.event?.title || "Event"}
											</Link>

											<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
												<InfoPill
													icon={<LuCalendarDays className="h-4 w-4" />}
													label="Tanggal"
													value={formatDate(registration.event?.startDate)}
												/>
												<InfoPill
													icon={<LuMapPin className="h-4 w-4" />}
													label="Lokasi"
													value={
														registration.event?.venue ||
														registration.event?.city ||
														registration.event?.location ||
														"-"
													}
												/>
												<InfoPill
													icon={<LuBuilding2 className="h-4 w-4" />}
													label="Instansi"
													value={registration.schoolName || "Instansi"}
												/>
												<InfoPill
													icon={<LuUsers className="h-4 w-4" />}
													label="Tim"
													value={`${displayGroupCount} tim`}
												/>
											</div>

											<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
												<span>Didaftarkan {formatDate(registration.createdAt)}</span>
												{payment && (
													<span>
														Biaya {formatCurrency(payment.amount)}
														{payment.paymentMethod ? ` via ${payment.paymentMethod}` : ""}
													</span>
												)}
												{activeGroupNames && (
													<span className="line-clamp-1 min-w-0">
														{activeGroupNames}
													</span>
												)}
											</div>

											<div className="mt-4 border-t border-gray-200 pt-4 dark:border-white/10">
												<div className="flex items-center justify-content gap-2 ">
													<div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-3 py-1 dark:border-white/10 dark:bg-white/[0.03]">
														<p className="text-[11px] text-gray-500 dark:text-gray-400">
															Tim aktif
														</p>
														<p className="text-xl font-bold text-gray-950 dark:text-white">
															{activeGroups.length}
														</p>
													</div>
													<div className="flex items-center gap-4 rounded-lg  border border-gray-200 bg-white px-3 py-1 dark:border-white/10 dark:bg-white/[0.03]">
														<p className="text-[11px] text-gray-500 dark:text-gray-400">
															Personil
														</p>
														<p className="text-xl font-bold text-gray-950 dark:text-white">
															{activeMemberCount}
														</p>
													</div>

													<div className="flex flex-col items-stretch gap-2 lg:flex-row">
														<button
															type="button"
															onClick={() => setExpandedId(isExpanded ? null : registration.id)}
															className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-red-500/30 dark:hover:text-red-300"
															aria-expanded={isExpanded}
														>
															{isExpanded ? (
																<LuChevronUp className="h-4 w-4" />
															) : (
																<LuChevronDown className="h-4 w-4" />
															)}
															{isExpanded ? "Tutup Detail" : "Detail Tim"}
														</button>

														{registration.status === "PENDING_PAYMENT" && activeGroups.length > 0 && (
															<button
																type="button"
																onClick={() => handlePayRegistration(registration.id)}
																disabled={payingId === registration.id}
																className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
															>
																<LuCreditCard className="h-4 w-4" />
																{payingId === registration.id ? "Memproses..." : "Bayar"}
															</button>
														)}

														{waHref && activeGroups.length > 0 && (
															<a
																href={waHref}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-green-500 px-3 text-sm font-semibold text-white transition hover:bg-green-600"
															>
																WA Panitia
															</a>
														)}

														{canCancelRegistration && (
															<button
																type="button"
																onClick={() =>
																	handleCancelRegistration(
																		registration.id,
																		registration.event?.title || "Event"
																	)
																}
																className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
															>
																Batalkan
															</button>
														)}

														{registration.status === "CANCELLED" && registration.event && (
															<Link
																to={`/peserta/events/${registration.event.slug || registration.event.id}/register?mode=reregister&registrationId=${registration.id}`}
																className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700"
															>
																Daftar Ulang
															</Link>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>

									{isExpanded && (
										<div className="border-t border-gray-200 p-4 dark:border-white/10 sm:p-5">
											<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
												<div className="space-y-3">
													<div className="flex items-center justify-between gap-3">
														<h2 className="text-sm font-bold text-gray-950 dark:text-white">
															Tim Terdaftar
														</h2>
														<span className="text-xs text-gray-500 dark:text-gray-400">
															{activeGroups.length} aktif
														</span>
													</div>

													{activeGroups.length === 0 ? (
														<div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
															Tidak ada tim aktif pada pendaftaran ini.
														</div>
													) : (
														activeGroups.map((group) => {
															const members = parseMemberData(group.memberData);
															const isTeamExpanded = expandedTeamId === group.id;
															const memberCount =
																members.length > 0 ? members.length : group.teamMembers;
															const roleSummary = members.reduce<Record<string, number>>(
																(acc, member) => {
																	acc[member.role] = (acc[member.role] || 0) + 1;
																	return acc;
																},
																{}
															);

															return (
																<div
																	key={group.id}
																	className="rounded-lg border border-gray-200 dark:border-white/10"
																>
																	<div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
																		<div className="min-w-0">
																			<div className="flex flex-wrap items-center gap-2">
																				<p className="font-bold text-gray-950 dark:text-white">
																					{group.groupName}
																				</p>
																				{group.schoolCategory && (
																					<span className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
																						{group.schoolCategory.name}
																					</span>
																				)}
																			</div>
																			<div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
																				<span>{memberCount} personil</span>
																				{group.notes && <span>{group.notes}</span>}
																			</div>
																			{Object.keys(roleSummary).length > 0 && (
																				<div className="mt-3 flex flex-wrap gap-1.5">
																					{Object.entries(roleSummary).map(([role, total]) => (
																						<span
																							key={role}
																							className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${getRoleTone(role as PersonMember["role"])}`}
																						>
																							{role} {total}
																						</span>
																					))}
																				</div>
																			)}
																		</div>

																		{members.length > 0 && (
																			<button
																				type="button"
																				onClick={() =>
																					setExpandedTeamId(isTeamExpanded ? null : group.id)
																				}
																				className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-red-500/30 dark:hover:text-red-300 sm:w-auto"
																			>
																				{isTeamExpanded ? (
																					<LuChevronUp className="h-4 w-4" />
																				) : (
																					<LuChevronDown className="h-4 w-4" />
																				)}
																				Personil
																			</button>
																		)}
																	</div>

																	{isTeamExpanded && members.length > 0 && (
																		<div className="border-t border-gray-200 p-3 dark:border-white/10">
																			<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
																				{members.map((member, index) => (
																					<div
																						key={member.id || `${member.name}-${index}`}
																						className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 p-2.5 dark:border-white/10"
																					>
																						<MemberAvatar member={member} />
																						<div className="min-w-0">
																							<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
																								{member.name}
																							</p>
																							<span
																								className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${getRoleTone(member.role)}`}
																							>
																								{member.role}
																							</span>
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	)}
																</div>
															);
														})
													)}
												</div>

												<div className="space-y-3">
													<div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
														<h2 className="text-sm font-bold text-gray-950 dark:text-white">
															Ringkasan
														</h2>
														<div className="mt-3 space-y-2 text-sm">
															<div className="flex items-center justify-between gap-3">
																<span className="text-gray-500 dark:text-gray-400">
																	Status
																</span>
																<StatusBadge meta={statusMeta} />
															</div>
															<div className="flex items-center justify-between gap-3">
																<span className="text-gray-500 dark:text-gray-400">
																	Tim dibatalkan
																</span>
																<span className="font-semibold text-gray-900 dark:text-white">
																	{cancelledGroups.length}
																</span>
															</div>
															<div className="flex items-center justify-between gap-3">
																<span className="text-gray-500 dark:text-gray-400">
																	Biaya
																</span>
																<span className="font-semibold text-gray-900 dark:text-white">
																	{formatCurrency(
																		payment?.amount || registration.event?.registrationFee
																	)}
																</span>
															</div>
															{payment?.paidAt && (
																<div className="flex items-center justify-between gap-3">
																	<span className="text-gray-500 dark:text-gray-400">
																		Dibayar
																	</span>
																	<span className="font-semibold text-gray-900 dark:text-white">
																		{formatDate(payment.paidAt)}
																	</span>
																</div>
															)}
														</div>
													</div>

													{cancelledGroups.length > 0 && (
														<div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
															<h2 className="text-sm font-bold text-gray-950 dark:text-white">
																Tim Dibatalkan
															</h2>
															<div className="mt-3 space-y-2">
																{cancelledGroups.map((group) => {
																	const members = parseMemberData(group.memberData);
																	return (
																		<div
																			key={group.id}
																			className="rounded-lg border border-gray-200 p-3 dark:border-white/10"
																		>
																			<div className="flex items-start justify-between gap-3">
																				<div className="min-w-0">
																					<p className="truncate font-semibold text-gray-500 line-through dark:text-gray-400">
																						{group.groupName}
																					</p>
																					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
																						{members.length > 0
																							? `${members.length} personil`
																							: `${group.teamMembers} anggota`}
																					</p>
																				</div>
																				{registration.status !== "CANCELLED" && (
																					<button
																						type="button"
																						onClick={() =>
																							handleRestoreGroup(
																								registration.id,
																								group.id,
																								group.groupName
																							)
																						}
																						className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
																					>
																						<LuRefreshCw className="h-3.5 w-3.5" />
																						Pulihkan
																					</button>
																				)}
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
									)}
								</article>
							);
						})}
					</div>
				)}
			
		</div>
	);
};

export default PesertaRegistrations;
