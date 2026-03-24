import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { VotingEvent, VotingNominee } from "../types/voting";
import {
	CalendarDaysIcon,
	MapPinIcon,
	MagnifyingGlassIcon,
	UserIcon,
	EnvelopeIcon,
	PhoneIcon,
	HandThumbUpIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

const EVotingPage: React.FC = () => {
	const { user } = useAuth();
	const [events, setEvents] = useState<VotingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Voting detail view
	const [selectedEvent, setSelectedEvent] = useState<VotingEvent | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [voting, setVoting] = useState(false);
	const [votedNominees, setVotedNominees] = useState<Set<string>>(new Set());

	// Purchase modal (for paid voting)
	const [showPurchaseModal, setShowPurchaseModal] = useState(false);
	const [buyerName, setBuyerName] = useState(user?.name || "");
	const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
	const [buyerPhone, setBuyerPhone] = useState("");
	const [voteCount, setVoteCount] = useState(1);
	const [purchasing, setPurchasing] = useState(false);

	// Purchase code entry for paid voting
	const [showCodeEntry, setShowCodeEntry] = useState(false);
	const [purchaseCode, setPurchaseCode] = useState("");
	const [paidVoteTarget, setPaidVoteTarget] = useState<{ categoryId: string; nomineeId: string } | null>(null);

	const fetchEvents = useCallback(async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 12 };
			if (search) params.search = search;

			const res = await api.get("/voting/events", { params });
			setEvents(res.data.data);
			setTotalPages(res.data.totalPages);
		} catch {
			console.error("Error fetching events");
		} finally {
			setLoading(false);
		}
	}, [page, search]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	useEffect(() => {
		if (user) {
			setBuyerName(user.name);
			setBuyerEmail(user.email);
		}
	}, [user]);

	const fetchEventDetail = async (eventId: string) => {
		try {
			const res = await api.get(`/voting/events/${eventId}`);
			setSelectedEvent(res.data);
			// Set first category as selected
			if (res.data.votingConfig?.categories?.length > 0) {
				setSelectedCategoryId(res.data.votingConfig.categories[0].id);
			}
		} catch {
			Swal.fire("Error", "Gagal memuat detail voting", "error");
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const handleFreeVote = async (categoryId: string, nomineeId: string) => {
		const result = await Swal.fire({
			title: "Konfirmasi Vote",
			text: "Apakah Anda yakin ingin memberikan vote?",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Vote!",
			cancelButtonText: "Batal",
			confirmButtonColor: "#7c3aed",
		});

		if (!result.isConfirmed) return;

		try {
			setVoting(true);
			await api.post("/voting/vote", {
				categoryId,
				nomineeId,
				voterName: user?.name || undefined,
				voterEmail: user?.email || undefined,
			});

			setVotedNominees((prev) => new Set([...prev, nomineeId]));

			Swal.fire({
				title: "Vote Berhasil!",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});

			// Refresh detail
			if (selectedEvent) {
				fetchEventDetail(selectedEvent.id);
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal melakukan vote", "error");
		} finally {
			setVoting(false);
		}
	};

	const handlePaidVote = (categoryId: string, nomineeId: string) => {
		setPaidVoteTarget({ categoryId, nomineeId });
		setShowCodeEntry(true);
	};

	const submitPaidVote = async () => {
		if (!paidVoteTarget || !purchaseCode.trim()) return;

		try {
			setVoting(true);
			await api.post("/voting/vote-paid", {
				categoryId: paidVoteTarget.categoryId,
				nomineeId: paidVoteTarget.nomineeId,
				purchaseCode: purchaseCode.trim(),
				voterName: user?.name || undefined,
				voterEmail: user?.email || undefined,
			});

			setShowCodeEntry(false);
			setPurchaseCode("");
			setPaidVoteTarget(null);
			setVotedNominees((prev) => new Set([...prev, paidVoteTarget.nomineeId]));

			Swal.fire({
				title: "Vote Berhasil!",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});

			if (selectedEvent) {
				fetchEventDetail(selectedEvent.id);
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal melakukan vote", "error");
		} finally {
			setVoting(false);
		}
	};

	const handlePurchaseVotes = async () => {
		if (!selectedEvent || !buyerName.trim() || !buyerEmail.trim()) {
			Swal.fire("Error", "Nama dan email wajib diisi", "error");
			return;
		}

		try {
			setPurchasing(true);
			const res = await api.post("/voting/purchase", {
				eventId: selectedEvent.id,
				buyerName: buyerName.trim(),
				buyerEmail: buyerEmail.trim(),
				buyerPhone: buyerPhone.trim() || undefined,
				voteCount,
			});

			setShowPurchaseModal(false);

			Swal.fire({
				title: res.data.message,
				html: `<div class="text-left space-y-2">
					<p><strong>Kode:</strong> <span class="font-mono text-lg">${res.data.purchase.purchaseCode}</span></p>
					<p><strong>Jumlah Vote:</strong> ${voteCount}</p>
					<p><strong>Total:</strong> ${formatCurrency(res.data.purchase.totalAmount)}</p>
					<p class="text-sm text-gray-500 mt-3">Simpan kode ini untuk melakukan vote</p>
				</div>`,
				icon: "success",
				confirmButtonColor: "#7c3aed",
			});
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memesan vote", "error");
		} finally {
			setPurchasing(false);
		}
	};

	const getVotingStatus = (event: VotingEvent) => {
		if (!event.votingConfig) return { text: "Tidak tersedia", color: "gray" };
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) {
			return { text: "Segera dibuka", color: "amber" };
		}
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) {
			return { text: "Selesai", color: "red" };
		}
		return { text: "Buka", color: "green" };
	};

	const currentCategory = selectedEvent?.votingConfig?.categories.find((c) => c.id === selectedCategoryId);

	// Event detail / voting view
	if (selectedEvent) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
					{/* Back button */}
					<button
						onClick={() => { setSelectedEvent(null); setSelectedCategoryId(null); setVotedNominees(new Set()); }}
						className="mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					>
						&larr; Kembali ke daftar event
					</button>

					{/* Event header */}
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
						{selectedEvent.thumbnail && (
							<img
								src={`${config.api.backendUrl}${selectedEvent.thumbnail}`}
								alt={selectedEvent.title}
								className="w-full h-48 sm:h-64 object-cover"
							/>
						)}
						<div className="p-6">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedEvent.title}</h1>
							<div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
								<span className="flex items-center gap-1.5">
									<CalendarDaysIcon className="w-4 h-4" />
									{formatDate(selectedEvent.startDate)}
								</span>
								{(selectedEvent.venue || selectedEvent.city) && (
									<span className="flex items-center gap-1.5">
										<MapPinIcon className="w-4 h-4" />
										{selectedEvent.venue || selectedEvent.city}
									</span>
								)}
							</div>
							{selectedEvent.votingConfig?.isPaid && (
								<div className="mt-4 flex items-center gap-3">
									<span className="text-sm text-gray-500 dark:text-gray-400">
										Voting berbayar: {formatCurrency(selectedEvent.votingConfig.pricePerVote)}/vote
									</span>
									<button
										onClick={() => setShowPurchaseModal(true)}
										className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
									>
										Beli Vote
									</button>
								</div>
							)}
						</div>
					</div>

					{/* Category tabs */}
					{selectedEvent.votingConfig?.categories && selectedEvent.votingConfig.categories.length > 1 && (
						<div className="flex gap-2 overflow-x-auto pb-2 mb-4">
							{selectedEvent.votingConfig.categories.map((cat) => (
								<button
									key={cat.id}
									onClick={() => setSelectedCategoryId(cat.id)}
									className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
										selectedCategoryId === cat.id
											? "bg-purple-600 text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
									}`}
								>
									{cat.title}
								</button>
							))}
						</div>
					)}

					{/* Category title */}
					{currentCategory && (
						<div className="mb-4">
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">{currentCategory.title}</h2>
							{currentCategory.description && (
								<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentCategory.description}</p>
							)}
						</div>
					)}

					{/* Nominees grid */}
					{currentCategory?.nominees && currentCategory.nominees.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{currentCategory.nominees.map((nominee: VotingNominee, idx: number) => {
								const isVoted = votedNominees.has(nominee.id);
								const maxVotes = currentCategory.nominees?.[0]?.voteCount || 1;
								const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;

								return (
									<div
										key={nominee.id}
										className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all ${
											isVoted ? "border-purple-500 ring-1 ring-purple-500" : "border-gray-200 dark:border-gray-700"
										}`}
									>
										{/* Photo */}
										<div className="h-40 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
											{nominee.nomineePhoto ? (
												<img src={nominee.nomineePhoto} alt={nominee.nomineeName} className="w-full h-full object-cover" />
											) : (
												<UserIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
											)}
											{/* Rank badge */}
											{idx < 3 && (
												<div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
													idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-amber-700"
												}`}>
													{idx + 1}
												</div>
											)}
										</div>

										{/* Info */}
										<div className="p-4">
											<h3 className="font-semibold text-gray-900 dark:text-white truncate">{nominee.nomineeName}</h3>
											{nominee.nomineeSubtitle && (
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{nominee.nomineeSubtitle}</p>
											)}

											{/* Vote count bar */}
											<div className="mt-3 mb-3">
												<div className="flex items-center justify-between text-xs mb-1">
													<span className="text-gray-500 dark:text-gray-400">Vote</span>
													<span className="font-semibold text-purple-600 dark:text-purple-400">{nominee.voteCount}</span>
												</div>
												<div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
													<div
														className="h-1.5 rounded-full bg-purple-500 transition-all"
														style={{ width: `${pct}%` }}
													/>
												</div>
											</div>

											{/* Vote button */}
											<button
												onClick={() => {
													if (selectedEvent.votingConfig?.isPaid) {
														handlePaidVote(currentCategory.id, nominee.id);
													} else {
														handleFreeVote(currentCategory.id, nominee.id);
													}
												}}
												disabled={voting || isVoted}
												className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
													isVoted
														? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
														: "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
												}`}
											>
												{isVoted ? (
													<>
														<CheckCircleIcon className="w-4 h-4" />
														Sudah Vote
													</>
												) : (
													<>
														<HandThumbUpIcon className="w-4 h-4" />
														Vote
													</>
												)}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<HandThumbUpIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Belum ada nominee untuk kategori ini</p>
						</div>
					)}

					{/* Purchase code entry modal */}
					{showCodeEntry && (
						<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCodeEntry(false)}>
							<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Masukkan Kode Vote</h3>
								<input
									type="text"
									value={purchaseCode}
									onChange={(e) => setPurchaseCode(e.target.value.toUpperCase())}
									placeholder="VOT-XXXXXX-XXXXXXXX"
									className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center"
								/>
								<div className="flex gap-3">
									<button
										onClick={() => setShowCodeEntry(false)}
										className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
									>
										Batal
									</button>
									<button
										onClick={submitPaidVote}
										disabled={voting || !purchaseCode.trim()}
										className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
									>
										{voting ? "..." : "Vote"}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Purchase votes modal */}
					{showPurchaseModal && (
						<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPurchaseModal(false)}>
							<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Beli Paket Vote</h3>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<UserIcon className="w-4 h-4 inline mr-1" /> Nama *
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<EnvelopeIcon className="w-4 h-4 inline mr-1" /> Email *
									</label>
									<input
										type="email"
										value={buyerEmail}
										onChange={(e) => setBuyerEmail(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<PhoneIcon className="w-4 h-4 inline mr-1" /> Telepon
									</label>
									<input
										type="tel"
										value={buyerPhone}
										onChange={(e) => setBuyerPhone(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Vote</label>
									<input
										type="number"
										min={1}
										max={100}
										value={voteCount}
										onChange={(e) => setVoteCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
									/>
								</div>
								<div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">Harga/vote</span>
										<span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedEvent.votingConfig?.pricePerVote || 0)}</span>
									</div>
									<div className="flex justify-between font-semibold mt-1">
										<span className="text-gray-900 dark:text-white">Total</span>
										<span className="text-purple-700 dark:text-purple-400">
											{formatCurrency((selectedEvent.votingConfig?.pricePerVote || 0) * voteCount)}
										</span>
									</div>
								</div>
								<div className="flex gap-3">
									<button
										onClick={() => setShowPurchaseModal(false)}
										className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
									>
										Batal
									</button>
									<button
										onClick={handlePurchaseVotes}
										disabled={purchasing}
										className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
									>
										{purchasing ? "Memproses..." : "Beli Vote"}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	// Event list view
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">E-Voting</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">Vote untuk tim atau peserta favorit kamu</p>
				</div>

				{/* Search */}
				<div className="mb-6">
					<div className="relative max-w-md">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari event..."
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
					</div>
				</div>

				{/* Events Grid */}
				{loading ? (
					<div className="flex justify-center py-20">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
					</div>
				) : events.length === 0 ? (
					<div className="text-center py-20">
						<HandThumbUpIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
						<p className="text-gray-500 dark:text-gray-400 text-lg">Belum ada event dengan e-voting</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{events.map((event) => {
							const status = getVotingStatus(event);
							return (
								<div
									key={event.id}
									className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
									onClick={() => fetchEventDetail(event.id)}
								>
									<div className="relative h-48 bg-gray-200 dark:bg-gray-700">
										{event.thumbnail ? (
											<img
												src={`${config.api.backendUrl}${event.thumbnail}`}
												alt={event.title}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="flex items-center justify-center h-full">
												<HandThumbUpIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
											</div>
										)}
										{/* Status badge */}
										<div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
											status.color === "green"
												? "bg-green-600 text-white"
												: status.color === "amber"
												? "bg-amber-500 text-white"
												: "bg-red-600 text-white"
										}`}>
											{status.text}
										</div>
										{/* Paid badge */}
										{event.votingConfig?.isPaid && (
											<div className="absolute top-3 left-3 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
												{formatCurrency(event.votingConfig.pricePerVote)}/vote
											</div>
										)}
									</div>

									<div className="p-4">
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{event.title}</h3>
										<div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
											<div className="flex items-center gap-2">
												<CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
												<span>{formatDate(event.startDate)}</span>
											</div>
											{(event.venue || event.city || event.location) && (
												<div className="flex items-center gap-2">
													<MapPinIcon className="w-4 h-4 flex-shrink-0" />
													<span className="truncate">{event.venue || event.city || event.location}</span>
												</div>
											)}
										</div>

										{/* Categories preview */}
										{event.votingConfig?.categories && event.votingConfig.categories.length > 0 && (
											<div className="flex flex-wrap gap-1.5 mt-2">
												{event.votingConfig.categories.slice(0, 3).map((cat) => (
													<span key={cat.id} className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
														{cat.title}
													</span>
												))}
												{event.votingConfig.categories.length > 3 && (
													<span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
														+{event.votingConfig.categories.length - 3}
													</span>
												)}
											</div>
										)}

										<button className="w-full mt-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
											Mulai Vote
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex justify-center gap-2 mt-8">
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<button
								key={p}
								onClick={() => setPage(p)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									p === page
										? "bg-purple-600 text-white"
										: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								}`}
							>
								{p}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default EVotingPage;
