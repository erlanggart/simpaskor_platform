import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	UsersIcon,
	MagnifyingGlassIcon,
	CalendarIcon,
	BuildingOffice2Icon,
	UserGroupIcon,
	AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface SchoolCategory {
	id: string;
	name: string;
}

interface ParticipationGroup {
	id: string;
	groupName: string;
	teamMembers: number;
	memberNames: string | null;
	memberData: string | null;
	status: string;
	schoolCategory: SchoolCategory;
}

interface UserProfile {
	avatar: string | null;
	institution: string | null;
}

interface ParticipantUser {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile: UserProfile | null;
}

interface Participant {
	id: string;
	teamName: string | null;
	schoolName: string | null;
	status: string;
	createdAt: string;
	user: ParticipantUser;
	schoolCategory: SchoolCategory | null;
	groups: ParticipationGroup[];
}

interface EventInfo {
	id: string;
	title: string;
	slug: string | null;
	startDate: string;
	endDate: string;
}

interface JuryAssignment {
	id: string;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: {
			id: string;
			name: string;
		};
	}[];
}

const JuriEventPeserta: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		if (eventSlug) {
			fetchData();
		}
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [assignmentRes, participantsRes] = await Promise.all([
				api.get(`/juries/events/${eventSlug}`),
				api.get(`/juries/events/${eventSlug}/peserta`),
			]);
			setAssignment(assignmentRes.data);
			setParticipants(participantsRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "CONFIRMED":
			case "ATTENDED":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
			case "REGISTERED":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
			case "CANCELLED":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "CONFIRMED":
				return "Terkonfirmasi";
			case "ATTENDED":
				return "Hadir";
			case "REGISTERED":
				return "Terdaftar";
			case "CANCELLED":
				return "Dibatalkan";
			default:
				return status;
		}
	};

	const parseMemberNames = (memberNames: string | null): string[] => {
		if (!memberNames) return [];
		try {
			return JSON.parse(memberNames);
		} catch {
			return [];
		}
	};

	const filteredParticipants = participants.filter((p) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			p.teamName?.toLowerCase().includes(searchLower) ||
			p.schoolName?.toLowerCase().includes(searchLower) ||
			p.user.name.toLowerCase().includes(searchLower) ||
			p.user.email.toLowerCase().includes(searchLower) ||
			p.groups.some((g) => 
				g.groupName.toLowerCase().includes(searchLower) ||
				parseMemberNames(g.memberNames).some(name => 
					name.toLowerCase().includes(searchLower)
				)
			)
		);
	});

	// Count unique school categories
	const uniqueSchoolCategories = new Set<string>();
	participants.forEach((p) => {
		if (p.schoolCategory) {
			uniqueSchoolCategories.add(p.schoolCategory.id);
		}
		p.groups.forEach((g) => {
			uniqueSchoolCategories.add(g.schoolCategory.id);
		});
	});

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!assignment) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Event tidak ditemukan
					</h2>
					<Link
						to="/juri/events"
						className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
					>
						Kembali ke Event Saya
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Daftar Peserta
					</h1>
					<div className="mt-2 flex items-center text-gray-600 dark:text-gray-400">
						<CalendarIcon className="h-5 w-5 mr-2" />
						{assignment.event.title}
					</div>
				</div>

				{/* Search */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari peserta, tim, atau sekolah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
								<UsersIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{participants.length}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Total Pendaftar
								</p>
							</div>
						</div>
					</div>
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
								<UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{participants.reduce((acc, p) => acc + p.groups.length, 0)}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Total Tim/Grup
								</p>
							</div>
						</div>
					</div>
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
								<AcademicCapIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{uniqueSchoolCategories.size}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Kategori Sekolah
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Participants List */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Daftar Peserta ({filteredParticipants.length})
						</h2>
					</div>

					{filteredParticipants.length === 0 ? (
						<div className="p-12 text-center">
							<UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								{participants.length === 0
									? "Belum Ada Peserta"
									: "Tidak Ada Hasil"}
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								{participants.length === 0
									? "Belum ada peserta yang terdaftar di event ini."
									: "Coba kata kunci pencarian yang berbeda."}
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredParticipants.map((participant) => (
								<div
									key={participant.id}
									className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50"
								>
									{/* Participant Info */}
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-4">
											<div className="flex-shrink-0">
												<div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
													<span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
														{participant.user.name.charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div>
												<h3 className="text-lg font-medium text-gray-900 dark:text-white">
													{participant.user.name}
												</h3>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{participant.user.email}
												</p>
												{participant.schoolName && (
													<div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
														<BuildingOffice2Icon className="h-4 w-4 mr-1" />
														{participant.schoolName}
													</div>
												)}
											</div>
										</div>
										<span
											className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
												participant.status
											)}`}
										>
											{getStatusLabel(participant.status)}
										</span>
									</div>

									{/* Groups */}
									{participant.groups.length > 0 && (
										<div className="mt-4 ml-16">
											<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												Tim Terdaftar:
											</p>
											<div className="space-y-3">
												{participant.groups.map((group) => {
													const memberNames = parseMemberNames(group.memberNames);
													return (
														<div
															key={group.id}
															className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4"
														>
															<div className="flex items-center justify-between mb-2">
																<span className="font-medium text-gray-900 dark:text-white">
																	{group.groupName}
																</span>
																<span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded">
																	{group.schoolCategory.name}
																</span>
															</div>
															<div className="text-sm text-gray-600 dark:text-gray-400">
																<span className="font-medium">{group.teamMembers}</span> anggota
															</div>
															{memberNames.length > 0 && (
																<div className="mt-2 flex flex-wrap gap-1">
																	{memberNames.map((name, idx) => (
																		<span
																			key={idx}
																			className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
																		>
																			{name}
																		</span>
																	))}
																</div>
															)}
														</div>
													);
												})}
											</div>
										</div>
									)}

									{/* Registration date */}
									<div className="mt-4 ml-16 text-xs text-gray-500 dark:text-gray-400">
										Terdaftar: {formatDate(participant.createdAt)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default JuriEventPeserta;
