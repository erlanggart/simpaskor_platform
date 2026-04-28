import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
	ArrowLeftIcon,
	CalendarIcon,
	MapPinIcon,
	PlusIcon,
	TrashIcon,
	DocumentArrowUpIcon,
	ExclamationCircleIcon,
	CheckCircleIcon,
	UserIcon,
	CameraIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { usePayment } from "../../hooks/usePayment";
import Swal from "sweetalert2";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	currentParticipants?: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface Event {
	id: string;
	title: string;
	description: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	location: string | null;
	venue: string | null;
	registrationFee: number | null;
	organizer: string | null;
	status: string;
	contactPhone: string | null;
	contactPersonName: string | null;
	contactEmail: string | null;
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

interface PersonMember {
	id: string;
	name: string;
	photo: File | null;
	photoPreview: string;
	existingPhotoUrl?: string | null;
}

interface ExistingRegistrationMember {
	id?: string;
	name: string;
	photo?: string | null;
	role: "PASUKAN" | "DANTON" | "CADANGAN" | "OFFICIAL" | "PELATIH";
}

interface ExistingRegistrationGroup {
	id: string;
	groupName: string;
	schoolCategoryId: string;
	teamMembers: number;
	memberData: string | null;
	notes: string | null;
}

interface ExistingRegistrationDetail {
	id: string;
	eventId: string;
	schoolName: string | null;
	supportingDoc: string | null;
	groups: ExistingRegistrationGroup[];
	registrationPayment?: {
		paymentMethod: string | null;
	} | null;
}

interface TeamData {
	id: string;
	groupName: string;
	schoolCategoryId: string;
	pasukan: PersonMember[];
	danton: PersonMember;
	cadangan: PersonMember[];
	official: PersonMember[];
	pelatih: PersonMember[];
	notes: string;
}

type MemberRole = "pasukan" | "danton" | "cadangan" | "official" | "pelatih";
type RepeatableMemberRole = Exclude<MemberRole, "danton">;
type RegistrationMemberRole = "PASUKAN" | "DANTON" | "CADANGAN" | "OFFICIAL" | "PELATIH";

const generateClientId = (): string => {
	const cryptoObject = globalThis.crypto;

	if (typeof cryptoObject?.randomUUID === "function") {
		return cryptoObject.randomUUID();
	}

	if (typeof cryptoObject?.getRandomValues === "function") {
		const bytes = cryptoObject.getRandomValues(new Uint8Array(16));
		const byte6 = bytes.at(6) ?? 0;
		const byte8 = bytes.at(8) ?? 0;
		bytes[6] = (byte6 & 0x0f) | 0x40;
		bytes[8] = (byte8 & 0x3f) | 0x80;

		const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

		return [
			hex.slice(0, 4).join(""),
			hex.slice(4, 6).join(""),
			hex.slice(6, 8).join(""),
			hex.slice(8, 10).join(""),
			hex.slice(10, 16).join(""),
		].join("-");
	}

	return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyMember = (): PersonMember => ({
	id: generateClientId(),
	name: "",
	photo: null,
	photoPreview: "",
});

const createInitialTeam = (name: string, categoryId: string = ""): TeamData => ({
	id: generateClientId(),
	groupName: name,
	schoolCategoryId: categoryId,
	pasukan: Array.from({ length: 6 }, () => createEmptyMember()), // Default 6 pasukan
	danton: createEmptyMember(),
	cadangan: [], // Start empty, add as needed
	official: [], // Start empty, add as needed
	pelatih: [], // Start empty, add as needed
	notes: "",
});

const getAssetUrl = (url: string | null | undefined): string => {
	if (!url) return "";
	if (url.startsWith("http://") || url.startsWith("https://")) return url;

	const backendUrl =
		import.meta.env.VITE_BACKEND_URL ||
		import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
		"";

	return `${backendUrl}${url}`;
};

const parseExistingMembers = (memberData: string | null): ExistingRegistrationMember[] => {
	if (!memberData) return [];
	try {
		const parsed = JSON.parse(memberData);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const createMemberFromExisting = (member: ExistingRegistrationMember): PersonMember => ({
	id: member.id || generateClientId(),
	name: member.name || "",
	photo: null,
	photoPreview: getAssetUrl(member.photo),
	existingPhotoUrl: member.photo || null,
});

const buildTeamFromExistingGroup = (group: ExistingRegistrationGroup, index: number): TeamData => {
	const members = parseExistingMembers(group.memberData);

	if (members.length === 0) {
		return {
			...createInitialTeam(group.groupName || `Tim ${index + 1}`, group.schoolCategoryId),
			pasukan: Array.from(
				{ length: Math.max(1, group.teamMembers - 1) },
				() => createEmptyMember()
			),
			notes: group.notes || "",
		};
	}

	const byRole = (role: ExistingRegistrationMember["role"]) =>
		members.filter((member) => member.role === role).map(createMemberFromExisting);

	return {
		id: group.id || generateClientId(),
		groupName: group.groupName || `Tim ${index + 1}`,
		schoolCategoryId: group.schoolCategoryId,
		pasukan: byRole("PASUKAN"),
		danton: byRole("DANTON")[0] || createEmptyMember(),
		cadangan: byRole("CADANGAN"),
		official: byRole("OFFICIAL"),
		pelatih: byRole("PELATIH"),
		notes: group.notes || "",
	};
};

const getTotalMembers = (team: TeamData): number => {
	return team.pasukan.length + 1 + team.cadangan.length + team.official.length + team.pelatih.length;
};

const buildCategoryUsage = (categoryUsageKey: string): Record<string, number> => {
	const usage: Record<string, number> = {};
	if (!categoryUsageKey) return usage;

	for (const categoryId of categoryUsageKey.split("|")) {
		if (!categoryId) continue;
		usage[categoryId] = (usage[categoryId] ?? 0) + 1;
	}

	return usage;
};

const roleConfig: Record<
	RepeatableMemberRole,
	{
		title: string;
		cardClassName: string;
		avatarClassName: string;
		iconClassName: string;
		inputClassName: string;
		addButtonClassName: string;
		addIconClassName: string;
		addTextClassName: string;
		gridClassName: string;
	}
> = {
	pasukan: {
		title: "Pasukan",
		cardClassName: "bg-gray-50 dark:bg-gray-700 rounded-lg p-2 sm:p-3 relative group",
		avatarClassName: "w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-500 hover:border-red-500",
		iconClassName: "w-5 h-5 sm:w-6 sm:h-6 text-gray-400",
		inputClassName: "w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center",
		addButtonClassName: "flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 transition-colors min-h-[100px]",
		addIconClassName: "w-6 h-6 text-gray-400 hover:text-green-500",
		addTextClassName: "text-xs text-gray-500 dark:text-gray-400 mt-1",
		gridClassName: "flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 order-2 md:order-1",
	},
	cadangan: {
		title: "Cadangan",
		cardClassName: "bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 sm:p-3 relative group border border-amber-200 dark:border-amber-700",
		avatarClassName: "w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-amber-300 dark:border-amber-600 hover:border-amber-500",
		iconClassName: "w-4 h-4 sm:w-5 sm:h-5 text-amber-400",
		inputClassName: "w-full px-2 py-1 text-xs border border-amber-300 dark:border-amber-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center",
		addButtonClassName: "flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-amber-300 dark:border-amber-600 hover:border-amber-500 transition-colors min-h-[90px]",
		addIconClassName: "w-5 h-5 text-amber-400 hover:text-amber-500",
		addTextClassName: "text-xs text-amber-500 dark:text-amber-400 mt-1",
		gridClassName: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3",
	},
	official: {
		title: "Official",
		cardClassName: "bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3 relative group border border-blue-200 dark:border-blue-700",
		avatarClassName: "w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500",
		iconClassName: "w-4 h-4 sm:w-5 sm:h-5 text-blue-400",
		inputClassName: "w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center",
		addButtonClassName: "flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500 transition-colors min-h-[90px]",
		addIconClassName: "w-5 h-5 text-blue-400 hover:text-blue-500",
		addTextClassName: "text-xs text-blue-500 dark:text-blue-400 mt-1",
		gridClassName: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3",
	},
	pelatih: {
		title: "Pelatih",
		cardClassName: "bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3 relative group border border-green-200 dark:border-green-700",
		avatarClassName: "w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-green-300 dark:border-green-600 hover:border-green-500",
		iconClassName: "w-4 h-4 sm:w-5 sm:h-5 text-green-400",
		inputClassName: "w-full px-2 py-1 text-xs border border-green-300 dark:border-green-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center",
		addButtonClassName: "flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-green-300 dark:border-green-600 hover:border-green-500 transition-colors min-h-[90px]",
		addIconClassName: "w-5 h-5 text-green-400 hover:text-green-500",
		addTextClassName: "text-xs text-green-500 dark:text-green-400 mt-1",
		gridClassName: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3",
	},
};

interface TeamMutationHandlers {
	onUpdateTeam: (teamId: string, field: keyof TeamData, value: TeamData[keyof TeamData]) => void;
	onUpdateMember: (
		teamId: string,
		role: MemberRole,
		memberId: string,
		field: keyof PersonMember,
		value: PersonMember[keyof PersonMember]
	) => void;
	onMemberPhoto: (teamId: string, role: MemberRole, memberId: string, file: File | null) => void;
	onAddMember: (teamId: string, role: RepeatableMemberRole) => void;
	onRemoveMember: (teamId: string, role: RepeatableMemberRole, memberId: string) => void;
}

interface RoleMemberCardProps extends Pick<TeamMutationHandlers, "onUpdateMember" | "onMemberPhoto" | "onRemoveMember"> {
	teamId: string;
	role: RepeatableMemberRole;
	member: PersonMember;
	memberIndex: number;
	canRemove: boolean;
}

const RoleMemberCard = memo<RoleMemberCardProps>(
	({ teamId, role, member, memberIndex, canRemove, onUpdateMember, onMemberPhoto, onRemoveMember }) => {
		const config = roleConfig[role];
		const label = `${config.title} ${memberIndex + 1}`;

		const handleNameChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				onUpdateMember(teamId, role, member.id, "name", e.target.value);
			},
			[member.id, onUpdateMember, role, teamId]
		);

		const handlePhotoChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const file = e.target.files?.[0];
				if (file) onMemberPhoto(teamId, role, member.id, file);
				e.target.value = "";
			},
			[member.id, onMemberPhoto, role, teamId]
		);

		const handleRemove = useCallback(() => {
			onRemoveMember(teamId, role, member.id);
		}, [member.id, onRemoveMember, role, teamId]);

		return (
			<div className={config.cardClassName}>
				{canRemove && (
					<button
						type="button"
						onClick={handleRemove}
						aria-label={`Hapus ${label}`}
						className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
					>
						&times;
					</button>
				)}
				<div className="flex justify-center mb-2">
					<label className="relative cursor-pointer">
						<div className={config.avatarClassName}>
							{member.photoPreview ? (
								<img
									src={member.photoPreview}
									alt={member.name || label}
									className="w-full h-full object-cover"
								/>
							) : (
								<CameraIcon className={config.iconClassName} />
							)}
						</div>
						<input
							type="file"
							accept="image/jpeg,image/png,image/jpg"
							onChange={handlePhotoChange}
							className="hidden"
						/>
					</label>
				</div>
				<input
					type="text"
					value={member.name}
					onChange={handleNameChange}
					placeholder={label}
					className={config.inputClassName}
				/>
			</div>
		);
	}
);

RoleMemberCard.displayName = "RoleMemberCard";

interface RepeatableRoleSectionProps extends Pick<TeamMutationHandlers, "onUpdateMember" | "onMemberPhoto" | "onAddMember" | "onRemoveMember"> {
	teamId: string;
	role: RepeatableMemberRole;
	members: PersonMember[];
}

const RepeatableRoleSection = memo<RepeatableRoleSectionProps>(
	({ teamId, role, members, onUpdateMember, onMemberPhoto, onAddMember, onRemoveMember }) => {
		const config = roleConfig[role];
		const canRemoveMember = role !== "pasukan" || members.length > 1;

		return (
			<div className={role === "pasukan" ? "" : "mb-4"}>
				{role !== "pasukan" && (
					<div className="mb-3">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
							{config.title} ({members.length} orang)
						</h4>
					</div>
				)}
				<div className={config.gridClassName}>
					{members.map((member, idx) => (
						<RoleMemberCard
							key={member.id}
							teamId={teamId}
							role={role}
							member={member}
							memberIndex={idx}
							canRemove={canRemoveMember}
							onUpdateMember={onUpdateMember}
							onMemberPhoto={onMemberPhoto}
							onRemoveMember={onRemoveMember}
						/>
					))}
					<button
						type="button"
						onClick={() => onAddMember(teamId, role)}
						className={config.addButtonClassName}
					>
						<PlusIcon className={config.addIconClassName} />
						<span className={config.addTextClassName}>Tambah</span>
					</button>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.teamId === nextProps.teamId &&
		prevProps.role === nextProps.role &&
		prevProps.members === nextProps.members &&
		prevProps.onUpdateMember === nextProps.onUpdateMember &&
		prevProps.onMemberPhoto === nextProps.onMemberPhoto &&
		prevProps.onAddMember === nextProps.onAddMember &&
		prevProps.onRemoveMember === nextProps.onRemoveMember
);

RepeatableRoleSection.displayName = "RepeatableRoleSection";

interface DantonCardProps extends Pick<TeamMutationHandlers, "onUpdateMember" | "onMemberPhoto"> {
	teamId: string;
	member: PersonMember;
}

const DantonCard = memo<DantonCardProps>(({ teamId, member, onUpdateMember, onMemberPhoto }) => {
	const handleNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onUpdateMember(teamId, "danton", member.id, "name", e.target.value);
		},
		[member.id, onUpdateMember, teamId]
	);

	const handlePhotoChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) onMemberPhoto(teamId, "danton", member.id, file);
			e.target.value = "";
		},
		[member.id, onMemberPhoto, teamId]
	);

	return (
		<div className="w-full md:w-32 order-1 md:order-2">
			<div className="text-center mb-2">
				<span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
					Komandan
				</span>
			</div>
			<div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border-2 border-red-200 dark:border-red-700 flex md:flex-col items-center md:items-stretch gap-3 md:gap-0">
				<div className="flex justify-center md:mb-2 flex-shrink-0">
					<label className="relative cursor-pointer">
						<div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-red-300 dark:border-red-600 hover:border-red-500">
							{member.photoPreview ? (
								<img
									src={member.photoPreview}
									alt={member.name || "Danton"}
									className="w-full h-full object-cover"
								/>
							) : (
								<UserIcon className="w-6 h-6 md:w-8 md:h-8 text-red-400" />
							)}
						</div>
						<input
							type="file"
							accept="image/jpeg,image/png,image/jpg"
							onChange={handlePhotoChange}
							className="hidden"
						/>
					</label>
				</div>
				<input
					type="text"
					value={member.name}
					onChange={handleNameChange}
					placeholder="Nama Danton"
					className="flex-1 md:w-full px-2 py-1 text-xs border border-red-300 dark:border-red-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
				/>
			</div>
		</div>
	);
});

DantonCard.displayName = "DantonCard";

interface TeamCardProps extends TeamMutationHandlers {
	team: TeamData;
	teamIndex: number;
	canRemoveTeam: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	categoryUsage: Record<string, number>;
	onRemoveTeam: (teamId: string) => void;
}

const TeamCard = memo<TeamCardProps>(
	({
		team,
		teamIndex,
		canRemoveTeam,
		schoolCategoryLimits,
		categoryUsage,
		onRemoveTeam,
		onUpdateTeam,
		onUpdateMember,
		onMemberPhoto,
		onAddMember,
		onRemoveMember,
	}) => {
		const handleCategoryChange = useCallback(
			(e: React.ChangeEvent<HTMLSelectElement>) => {
				onUpdateTeam(team.id, "schoolCategoryId", e.target.value);
			},
			[onUpdateTeam, team.id]
		);

		const handleGroupNameChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				onUpdateTeam(team.id, "groupName", e.target.value);
			},
			[onUpdateTeam, team.id]
		);

		const handleNotesChange = useCallback(
			(e: React.ChangeEvent<HTMLTextAreaElement>) => {
				onUpdateTeam(team.id, "notes", e.target.value);
			},
			[onUpdateTeam, team.id]
		);

		const handleRemoveTeam = useCallback(() => {
			onRemoveTeam(team.id);
		}, [onRemoveTeam, team.id]);

		return (
			<div className="border border-gray-200/60 dark:border-gray-700/40 rounded-lg p-3 sm:p-4">
				<div className="flex items-start justify-between mb-4">
					<h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
						Tim #{teamIndex + 1}
						<span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-gray-500">
							({getTotalMembers(team)} personil)
						</span>
					</h3>
					{canRemoveTeam && (
						<button
							type="button"
							onClick={handleRemoveTeam}
							className="text-red-500 hover:text-red-700"
						>
							<TrashIcon className="w-5 h-5" />
						</button>
					)}
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Kategori Sekolah <span className="text-red-500">*</span>
					</label>
					<select
						value={team.schoolCategoryId}
						onChange={handleCategoryChange}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
						required
					>
						<option value="">Pilih Kategori</option>
						{schoolCategoryLimits?.map((limit) => {
							const categoryId = limit.schoolCategory.id;
							const isCurrentSelection = team.schoolCategoryId === categoryId;
							const usedByOtherTeams = Math.max(
								0,
								(categoryUsage[categoryId] ?? 0) - (isCurrentSelection ? 1 : 0)
							);
							const available = Math.max(
								0,
								limit.maxParticipants - (limit.currentParticipants ?? 0) - usedByOtherTeams
							);

							return (
								<option
									key={categoryId}
									value={categoryId}
									disabled={available <= 0 && !isCurrentSelection}
								>
									{limit.schoolCategory.name}{" "}
									{isCurrentSelection
										? "(Dipilih)"
										: available > 0
											? `(${available} slot tersedia)`
											: "(Penuh)"}
								</option>
							);
						})}
					</select>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Nama Tim <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={team.groupName}
						onChange={handleGroupNameChange}
						placeholder="Contoh: Tim A"
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
						required
					/>
				</div>

				<div className="mb-6">
					<div className="mb-3">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
							Pasukan ({team.pasukan.length} orang)
						</h4>
					</div>
					<div className="flex flex-col md:flex-row gap-4">
						<RepeatableRoleSection
							teamId={team.id}
							role="pasukan"
							members={team.pasukan}
							onUpdateMember={onUpdateMember}
							onMemberPhoto={onMemberPhoto}
							onAddMember={onAddMember}
							onRemoveMember={onRemoveMember}
						/>
						<DantonCard
							teamId={team.id}
							member={team.danton}
							onUpdateMember={onUpdateMember}
							onMemberPhoto={onMemberPhoto}
						/>
					</div>
				</div>

				<RepeatableRoleSection
					teamId={team.id}
					role="cadangan"
					members={team.cadangan}
					onUpdateMember={onUpdateMember}
					onMemberPhoto={onMemberPhoto}
					onAddMember={onAddMember}
					onRemoveMember={onRemoveMember}
				/>
				<RepeatableRoleSection
					teamId={team.id}
					role="official"
					members={team.official}
					onUpdateMember={onUpdateMember}
					onMemberPhoto={onMemberPhoto}
					onAddMember={onAddMember}
					onRemoveMember={onRemoveMember}
				/>
				<RepeatableRoleSection
					teamId={team.id}
					role="pelatih"
					members={team.pelatih}
					onUpdateMember={onUpdateMember}
					onMemberPhoto={onMemberPhoto}
					onAddMember={onAddMember}
					onRemoveMember={onRemoveMember}
				/>

				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Catatan (Opsional)
					</label>
					<textarea
						value={team.notes}
						onChange={handleNotesChange}
						placeholder="Catatan tambahan untuk tim ini..."
						rows={2}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
					/>
				</div>
			</div>
		);
	}
);

TeamCard.displayName = "TeamCard";

const EventRegister: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { user } = useAuth();
	const { pay, isSnapReady } = usePayment();
	const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const registrationId = searchParams.get("registrationId");
	const isReregisterMode = searchParams.get("mode") === "reregister" && Boolean(registrationId);

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
	const [submitStatus, setSubmitStatus] = useState("Menyiapkan pendaftaran...");

	// Form state
	const [schoolName, setSchoolName] = useState<string>("");
	const [teams, setTeams] = useState<TeamData[]>([createInitialTeam("Tim 1")]);
	const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
	const [supportingDocPreview, setSupportingDocPreview] = useState<string>("");
	const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS" | "MANUAL">("MIDTRANS");
	const categoryUsageKey = useMemo(
		() => teams.map((team) => team.schoolCategoryId).join("|"),
		[teams]
	);
	const categoryUsage = useMemo(
		() => buildCategoryUsage(categoryUsageKey),
		[categoryUsageKey]
	);
	const totalFee = useMemo(
		() => (event?.registrationFee ? event.registrationFee * teams.length : 0),
		[event?.registrationFee, teams.length]
	);

	// Check if registration is closed
	const isRegistrationClosed = event?.registrationDeadline
		? new Date(event.registrationDeadline) < new Date()
		: false;

	useEffect(() => {
		fetchEventDetail();
	}, [eventSlug, registrationId]);

	useEffect(() => {
		// Auto-fill institution from user profile
		if (!isReregisterMode && user?.profile?.institution) {
			setSchoolName(user.profile.institution);
		}
	}, [isReregisterMode, user]);

	const fetchEventDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/events/${eventSlug}`);
			setEvent(response.data);

			// Set default school category for first team if only one option
			if (response.data.schoolCategoryLimits?.length === 1) {
				setTeams(prev => prev.map((t, i) => i === 0 ? { ...t, schoolCategoryId: response.data.schoolCategoryLimits[0].schoolCategory.id } : t));
			}

			if (registrationId) {
				const registrationResponse = await api.get<ExistingRegistrationDetail>(
					`/registrations/${registrationId}?includeCancelled=true`
				);
				const registration = registrationResponse.data;

				if (registration.eventId !== response.data.id) {
					throw new Error("Data pendaftaran tidak sesuai dengan event ini");
				}

				setSchoolName(registration.schoolName || user?.profile?.institution || "");
				if (registration.supportingDoc) {
					setSupportingDocPreview(registration.supportingDoc.split("/").pop() || "Dokumen sebelumnya");
				}
				if (registration.registrationPayment?.paymentMethod === "MANUAL") {
					setPaymentMethod("MANUAL");
				}

				const restoredTeams = registration.groups.map(buildTeamFromExistingGroup);
				if (restoredTeams.length > 0) {
					setTeams(restoredTeams);
				}
			}
		} catch (err: any) {
			setError(err.response?.data?.message || err.response?.data?.error || err.message || "Gagal memuat detail event");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const addTeam = useCallback(() => {
		setTeams((prevTeams) => {
			const newTeamNumber = prevTeams.length + 1;
			const defaultCategoryId = event?.schoolCategoryLimits?.find((limit) => {
				const available = limit.maxParticipants - (limit.currentParticipants ?? 0);
				const used = prevTeams.filter((team) => team.schoolCategoryId === limit.schoolCategory.id).length;
				return available - used > 0;
			})?.schoolCategory.id || "";

			return [...prevTeams, createInitialTeam(`Tim ${newTeamNumber}`, defaultCategoryId)];
		});
	}, [event?.schoolCategoryLimits]);

	const removeTeam = useCallback((teamId: string) => {
		setTeams((prevTeams) => {
			if (prevTeams.length <= 1) {
				Swal.fire({
					icon: "warning",
					title: "Tidak dapat menghapus",
					text: "Minimal harus ada satu tim",
				});
				return prevTeams;
			}

			return prevTeams.filter((team) => team.id !== teamId);
		});
	}, []);

	const updateTeam = useCallback((teamId: string, field: keyof TeamData, value: TeamData[keyof TeamData]) => {
		setTeams((prevTeams) =>
			prevTeams.map((team) => (team.id !== teamId ? team : { ...team, [field]: value }))
		);
	}, []);

	// Update member in specific role array
	const updateMember = useCallback((
		teamId: string,
		role: MemberRole,
		memberId: string,
		field: keyof PersonMember,
		value: PersonMember[keyof PersonMember]
	) => {
		setTeams((prevTeams) =>
			prevTeams.map((team) => {
				if (team.id !== teamId) return team;
				if (role === "danton") {
					const updatedDanton: PersonMember = { ...team.danton, [field]: value };
					return { ...team, danton: updatedDanton };
				}
				const members = [...team[role]];
				const idx = members.findIndex((m) => m.id === memberId);
				const currentMember = members[idx];
				if (idx === -1 || !currentMember) return team;

				members[idx] = { ...currentMember, [field]: value };
				return { ...team, [role]: members };
			})
		);
	}, []);

	// Handle photo upload for a member
	const handleMemberPhoto = useCallback((
		teamId: string,
		role: MemberRole,
		memberId: string,
		file: File | null
	) => {
		if (!file) return;

		const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
		if (!allowedTypes.includes(file.type)) {
			Swal.fire({
				icon: "error",
				title: "Format tidak didukung",
				text: "File harus berupa JPG atau PNG",
			});
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			Swal.fire({
				icon: "error",
				title: "File terlalu besar",
				text: "Ukuran foto maksimal 2MB",
			});
			return;
		}

		const preview = URL.createObjectURL(file);
		setTeams((prevTeams) =>
			prevTeams.map((team) => {
				if (team.id !== teamId) return team;
				if (role === "danton") {
					const updatedDanton: PersonMember = { ...team.danton, photo: file, photoPreview: preview };
					return { ...team, danton: updatedDanton };
				}
				const members = [...team[role]];
				const idx = members.findIndex((m) => m.id === memberId);
				const currentMember = members[idx];
				if (idx === -1 || !currentMember) return team;

				members[idx] = { ...currentMember, photo: file, photoPreview: preview };
				return { ...team, [role]: members };
			})
		);
	}, []);

	// Add/remove members from role arrays
	const addMemberToRole = useCallback((teamId: string, role: RepeatableMemberRole) => {
		setTeams((prevTeams) =>
			prevTeams.map((team) => {
				if (team.id !== teamId) return team;
				return { ...team, [role]: [...team[role], createEmptyMember()] };
			})
		);
	}, []);

	const removeMemberFromRole = useCallback((teamId: string, role: RepeatableMemberRole, memberId: string) => {
		setTeams((prevTeams) =>
			prevTeams.map((team) => {
				if (team.id !== teamId) return team;
				const members = team[role].filter((m) => m.id !== memberId);
				if (role === "pasukan" && members.length === 0) {
					Swal.fire({
						icon: "warning",
						title: "Tidak dapat menghapus",
						text: "Minimal harus ada satu pasukan",
					});
					return team;
				}
				return { ...team, [role]: members };
			})
		);
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type
			const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
			if (!allowedTypes.includes(file.type)) {
				Swal.fire({
					icon: "error",
					title: "Format tidak didukung",
					text: "File harus berupa PDF, JPG, atau PNG",
				});
				return;
			}

			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				Swal.fire({
					icon: "error",
					title: "File terlalu besar",
					text: "Ukuran file maksimal 5MB",
				});
				return;
			}

			setSupportingDoc(file);
			setSupportingDocPreview(file.name);
		}
	};

	const validateForm = (): boolean => {
		if (!schoolName.trim()) {
			Swal.fire({
				icon: "error",
				title: "Nama organisasi belum diisi",
				text: "Silakan isi nama organisasi/sekolah",
			});
			return false;
		}

		// Validate each team
		for (let i = 0; i < teams.length; i++) {
			const team = teams[i];
			if (!team) continue;
			if (!team.schoolCategoryId) {
				Swal.fire({
					icon: "error",
					title: "Kategori belum dipilih",
					text: `Silakan pilih kategori sekolah untuk Tim #${i + 1}`,
				});
				return false;
			}
			if (!team.groupName.trim()) {
				Swal.fire({
					icon: "error",
					title: "Nama tim belum diisi",
					text: `Setiap tim harus memiliki nama (Tim #${i + 1})`,
				});
				return false;
			}
		}

		// Check slot availability per category
		const categoryUsage: Record<string, number> = {};
		for (const team of teams) {
			categoryUsage[team.schoolCategoryId] = (categoryUsage[team.schoolCategoryId] || 0) + 1;
		}

		for (const [categoryId, count] of Object.entries(categoryUsage)) {
			const limit = event?.schoolCategoryLimits?.find(l => l.schoolCategory.id === categoryId);
			if (limit) {
				const available = limit.maxParticipants - (limit.currentParticipants || 0);
				if (count > available) {
					Swal.fire({
						icon: "error",
						title: "Slot tidak cukup",
						text: `Kategori ${limit.schoolCategory.name} hanya tersisa ${available} slot, Anda mendaftarkan ${count} tim`,
					});
					return false;
				}
			}
		}

		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!event) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Data event tidak ditemukan",
			});
			return;
		}

		if (!validateForm()) return;

		setSubmitting(true);
		setUploadProgress(null);
		setSubmitStatus("Menyiapkan data pendaftaran...");

		try {
			type RegistrationMemberPayload = {
				name: string;
				photo: string | null;
				role: RegistrationMemberRole;
			};
			type PreparedGroup = {
				groupName: string;
				schoolCategoryId: string;
				notes?: string;
				members: RegistrationMemberPayload[];
			};
			type UploadTask = {
				file: File;
				label: string;
				onComplete: (url: string) => void;
			};

			const uploadTasks: UploadTask[] = [];
			let uploadedCount = 0;
			let supportingDocUrl: string | undefined;

			if (supportingDoc) {
				uploadTasks.push({
					file: supportingDoc,
					label: "Dokumen pendukung",
					onComplete: (url) => {
						supportingDocUrl = url;
					},
				});
			}

			const preparedGroups: PreparedGroup[] = teams.map((team, teamIndex) => {
				const teamLabel = team.groupName.trim() || `Tim ${teamIndex + 1}`;
				const members: RegistrationMemberPayload[] = [];
				const addPreparedMember = (
					member: PersonMember,
					role: RegistrationMemberRole,
					roleLabel: string,
					fallbackLabel: string
				) => {
					const memberData: RegistrationMemberPayload = {
						name: member.name.trim(),
						photo: member.existingPhotoUrl || null,
						role,
					};
					members.push(memberData);

					if (member.photo) {
						const labelName = member.name.trim() || fallbackLabel;
						uploadTasks.push({
							file: member.photo,
							label: `${teamLabel} - ${roleLabel} ${labelName}`,
							onComplete: (url) => {
								memberData.photo = url;
							},
						});
					}
				};

				team.pasukan.forEach((member, index) => {
					addPreparedMember(member, "PASUKAN", "Pasukan", `${index + 1}`);
				});
				addPreparedMember(team.danton, "DANTON", "Danton", "tanpa nama");
				team.cadangan.forEach((member, index) => {
					addPreparedMember(member, "CADANGAN", "Cadangan", `${index + 1}`);
				});
				team.official.forEach((member, index) => {
					addPreparedMember(member, "OFFICIAL", "Official", `${index + 1}`);
				});
				team.pelatih.forEach((member, index) => {
					addPreparedMember(member, "PELATIH", "Pelatih", `${index + 1}`);
				});

				return {
					groupName: team.groupName.trim(),
					schoolCategoryId: team.schoolCategoryId,
					notes: team.notes.trim() || undefined,
					members,
				};
			});

			// Upload a single file with retry logic
			const uploadSingleFile = async (photo: File, label: string, maxRetries = 2): Promise<string> => {
				let lastError: any;
				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						const formData = new FormData();
						formData.append("file", photo);
						formData.append("type", "member");
						const uploadResponse = await api.post("/upload/document", formData, {
							headers: { "Content-Type": "multipart/form-data" },
							timeout: 60000, // 60 seconds per file
						});
						uploadedCount++;
						setUploadProgress({ current: uploadedCount, total: uploadTasks.length, label });
						return uploadResponse.data.url;
					} catch (err: any) {
						lastError = err;
						if (attempt < maxRetries) {
							// Wait before retry (1s, 2s)
							await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
						}
					}
				}
				// All retries failed - throw with descriptive message
				const isTimeout = lastError.code === 'ECONNABORTED' || lastError.message?.includes('timeout');
				const isServerError = lastError.response?.status >= 500;
				const isTooLarge = lastError.response?.status === 413;
				if (isTooLarge) throw new Error(`File "${label}" terlalu besar. Maksimal 5MB per file.`);
				if (isTimeout) throw new Error(`Upload "${label}" timeout setelah ${maxRetries + 1}x percobaan. Coba kurangi ukuran foto atau periksa koneksi.`);
				if (isServerError) throw new Error(`Server error saat upload "${label}". Silakan coba lagi nanti.`);
				throw new Error(lastError.response?.data?.error || `Gagal upload "${label}": ${lastError.message}`);
			};

			const uploadFiles = async (tasks: UploadTask[]) => {
				if (tasks.length === 0) return;

				setSubmitStatus("Mengunggah dokumen dan foto...");
				setUploadProgress({ current: 0, total: tasks.length, label: "Memulai upload" });

				let nextTaskIndex = 0;
				const concurrency = Math.min(4, tasks.length);
				const workers = Array.from({ length: concurrency }, async () => {
					while (nextTaskIndex < tasks.length) {
						const task = tasks[nextTaskIndex];
						nextTaskIndex++;
						if (!task) continue;

						const uploadedUrl = await uploadSingleFile(task.file, task.label);
						task.onComplete(uploadedUrl);
					}
				});

				await Promise.all(workers);
			};

			await uploadFiles(uploadTasks);
			setSubmitStatus("Menyimpan pendaftaran...");

			const groupsData = preparedGroups.map((group) => {
				const memberNames = group.members.filter((member) => member.name).map((member) => member.name);

				return {
					groupName: group.groupName,
					schoolCategoryId: group.schoolCategoryId,
					teamMembers: group.members.length,
					memberNames: JSON.stringify(memberNames),
					memberData: JSON.stringify(group.members),
					notes: group.notes,
				};
			});

			const registrationData = {
				eventId: event.id, // Use event.id (UUID) instead of URL param (might be slug)
				schoolName: schoolName.trim(),
				supportingDoc: supportingDocUrl,
				groups: groupsData,
				paymentMethod: event.registrationFee && event.registrationFee > 0 ? paymentMethod : undefined,
			};

			const regRes = await api.post("/registrations", registrationData);
			const { registration, paymentRequired } = regRes.data;

			// If payment required, initiate Midtrans payment
			if (paymentRequired) {
				try {
					setSubmitStatus("Menyiapkan pembayaran...");
					const paymentRes = await api.post(`/registrations/${registration.id}/pay`);
					const { snapToken, midtransOrderId } = paymentRes.data.payment;

				if (snapToken && isSnapReady) {
					await new Promise<void>((resolve) => {
						pay(snapToken, {
							onSuccess: async () => {
								// Verify payment status directly with Midtrans to avoid race condition with webhook
								try {
									await api.post(`/registrations/${registration.id}/verify-payment`);
								} catch {}
								Swal.fire({
									icon: "success",
									title: "Pembayaran Berhasil!",
									html: `
										<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
										<p class="text-sm text-gray-600">Pembayaran sebesar <strong>${formatCurrency(event.registrationFee)}</strong> telah diterima.</p>
										<p class="text-sm text-gray-600">Panitia akan meninjau pendaftaran Anda.</p>
									`,
									confirmButtonText: "Lihat Pendaftaran Saya",
								});
								resolve();
							},
							onPending: () => {
								Swal.fire({
									icon: "info",
									title: "Pembayaran Pending",
									html: `
										<p class="mb-2">Pendaftaran berhasil disimpan.</p>
										<p class="text-sm text-gray-600">Silakan selesaikan pembayaran untuk mengaktifkan pendaftaran Anda.</p>
										<p class="text-sm text-gray-600">Order ID: <code class="bg-gray-100 px-1 rounded">${midtransOrderId}</code></p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
							onError: () => {
								Swal.fire({
									icon: "error",
									title: "Pembayaran Gagal",
									html: `
										<p class="mb-2">Pendaftaran tersimpan, tapi pembayaran gagal.</p>
										<p class="text-sm text-gray-600">Silakan coba bayar lagi dari halaman pendaftaran Anda.</p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
							onClose: () => {
								Swal.fire({
									icon: "info",
									title: "Pembayaran Ditutup",
									html: `
										<p class="mb-2">Pendaftaran berhasil disimpan.</p>
										<p class="text-sm text-gray-600">Selesaikan pembayaran Anda untuk mengkonfirmasi pendaftaran.</p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
						});
					});
				} else {
					// Snap not ready, show manual payment info
					await Swal.fire({
						icon: "warning",
						title: "Pendaftaran Berhasil - Pembayaran Pending",
						html: `
							<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
							<p class="text-sm text-gray-600">Segera selesaikan pembayaran sebesar <strong>${formatCurrency(event.registrationFee)}</strong>.</p>
							<p class="text-sm text-gray-600">Order ID: <code class="bg-gray-100 px-1 rounded">${midtransOrderId}</code></p>
						`,
						confirmButtonText: "Lihat Pendaftaran Saya",
					});
				}
				} catch (paymentErr: any) {
					// Registration succeeded but payment initiation failed
					await Swal.fire({
						icon: "warning",
						title: "Pendaftaran Berhasil - Pembayaran Belum Bisa Diproses",
						html: `
							<p class="mb-2">Pendaftaran <strong>${teams.length} tim</strong> berhasil disimpan.</p>
							<p class="text-sm text-gray-600">${paymentErr.response?.data?.message || "Sistem pembayaran sedang tidak tersedia. Silakan coba bayar nanti dari halaman pendaftaran Anda."}</p>
						`,
						confirmButtonText: "Lihat Pendaftaran Saya",
					});
				}
				navigate("/peserta/registrations");
			} else if (event.registrationFee && event.registrationFee > 0 && paymentMethod === "MANUAL") {
				setSubmitStatus("Menyelesaikan pendaftaran...");
				// Manual payment - show contact info
				const contactInfo = event.contactPhone
					? `<p class="text-sm text-gray-600 mt-2">Hubungi panitia: <strong>${event.contactPersonName || "Panitia"}</strong></p>
					   <p class="text-sm text-gray-600">No. HP/WA: <a href="https://wa.me/${event.contactPhone.replace(/[^0-9]/g, "")}" target="_blank" class="text-green-600 font-bold hover:underline">${event.contactPhone}</a></p>`
					: "";
				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Berhasil!",
					html: `
						<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
						<p class="text-sm text-gray-600">Biaya pendaftaran: <strong>${formatCurrency(event.registrationFee)}</strong></p>
						<p class="text-sm text-gray-600 mt-1">Silakan lakukan pembayaran langsung ke panitia.</p>
						${contactInfo}
						<p class="text-sm text-gray-500 mt-2">Pendaftaran Anda akan dikonfirmasi setelah pembayaran diterima oleh panitia.</p>
					`,
					confirmButtonText: "Lihat Pendaftaran Saya",
				});
				navigate("/peserta/registrations");
			} else {
				setSubmitStatus("Menyelesaikan pendaftaran...");
				// No payment required
				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Berhasil!",
					html: `
						<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
						<p class="text-sm text-gray-600">Status pendaftaran Anda saat ini: <strong>REGISTERED</strong></p>
						<p class="text-sm text-gray-600">Panitia akan meninjau pendaftaran Anda.</p>
					`,
					confirmButtonText: "Lihat Pendaftaran Saya",
				});
				navigate("/peserta/registrations");
			}
		} catch (err: any) {
			const errorMessage = err.message || err.response?.data?.error || "Terjadi kesalahan saat mendaftar";
			const isUploadError = errorMessage.includes('upload') || errorMessage.includes('Upload') || errorMessage.includes('timeout') || errorMessage.includes('terlalu besar');
			Swal.fire({
				icon: "error",
				title: isUploadError ? "Upload Gagal" : "Pendaftaran Gagal",
				html: `
					<p class="mb-2">${errorMessage}</p>
					${isUploadError ? '<p class="text-sm text-gray-500">Tips: Pastikan ukuran setiap foto di bawah 2MB dan koneksi internet stabil. Coba kompres foto terlebih dahulu.</p>' : ''}
				`,
			});
		} finally {
			setSubmitting(false);
			setUploadProgress(null);
			setSubmitStatus("Menyiapkan pendaftaran...");
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{error || "Event tidak ditemukan"}
					</h2>
					<Link
						to="/"
						className="text-red-600 dark:text-red-400 hover:underline"
					>
						Kembali ke Beranda
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4">
			{submitting && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
					<div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800" role="status" aria-live="polite">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 flex-shrink-0 animate-spin rounded-full border-4 border-red-100 border-t-red-600 dark:border-red-950 dark:border-t-red-400"></div>
							<div>
								<p className="font-semibold text-gray-900 dark:text-white">
									{submitting ? submitStatus : "Memproses pendaftaran..."}
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Mohon tunggu, jangan tutup halaman ini.
								</p>
							</div>
						</div>

						{uploadProgress && uploadProgress.total > 0 && (
							<div className="mt-4">
								<div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
									<span>{uploadProgress.label}</span>
									<span>{uploadProgress.current}/{uploadProgress.total} file</span>
								</div>
								<div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
									<div
										className="h-2.5 rounded-full bg-red-600 transition-all duration-300"
										style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
									></div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-4 sm:mb-6">
					<button
						onClick={() => navigate(`/events/${eventSlug}`)}
						className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mb-3 sm:mb-4"
					>
						<ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
						Kembali ke Detail Event
					</button>
					<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
						{isReregisterMode ? "Edit Daftar Ulang" : "Pendaftaran Event"}
					</h1>
					<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
						{isReregisterMode
							? "Data lama sudah dimuat. Silakan ubah tim atau personil sebelum submit ulang."
							: "Lengkapi formulir di bawah untuk mendaftar ke event ini"}
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
						{/* Main Form */}
						<div className="lg:col-span-2 space-y-4 sm:space-y-6">
							{/* Event Info Card */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Informasi Event
								</h2>
								<div className="flex flex-col sm:flex-row items-start gap-4">
									{event.thumbnail && (
										<img
											src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${event.thumbnail}`}
											alt={event.title}
											className="w-full sm:w-24 h-32 sm:h-30 object-cover rounded-lg"
										/>
									)}
									<div className="flex-1">
										<h3 className="font-semibold text-gray-900 dark:text-white">
											{event.title}
										</h3>
										<div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
											<div className="flex items-center">
												<CalendarIcon className="w-4 h-4 mr-2" />
												{formatDate(event.startDate)} - {formatDate(event.endDate)}
											</div>
											{event.location && (
												<div className="flex items-center">
													<MapPinIcon className="w-4 h-4 mr-2" />
													{event.location}
													{event.venue && ` - ${event.venue}`}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Organization Info */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Informasi Organisasi
								</h2>

								<div className="space-y-4">
									{/* Organization/School Name */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Nama Organisasi/Sekolah <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={schoolName}
											onChange={(e) => setSchoolName(e.target.value)}
											placeholder="Contoh: SMAN 1 Jakarta"
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
											required
										/>
										{user?.profile?.institution && (
											<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
												Diisi otomatis dari profil Anda
											</p>
										)}
									</div>

									{/* Supporting Document */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Dokumen Pendukung (Opsional)
										</label>
										<div className="mt-1 flex items-center gap-4">
											<label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
												<DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-500" />
												<span className="text-sm text-gray-600 dark:text-gray-400">
													{supportingDocPreview || "Pilih File"}
												</span>
												<input
													type="file"
													accept=".pdf,.jpg,.jpeg,.png"
													onChange={handleFileChange}
													className="hidden"
												/>
											</label>
											{supportingDoc && (
												<button
													type="button"
													onClick={() => {
														setSupportingDoc(null);
														setSupportingDocPreview("");
													}}
													className="text-red-500 hover:text-red-700"
												>
													<TrashIcon className="w-5 h-5" />
												</button>
											)}
										</div>
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
											Format: PDF, JPG, PNG. Maksimal 5MB. Contoh: Surat Rekomendasi Sekolah, Surat tugas, SK Paskibra
										</p>
									</div>
								</div>
							</div>

							{/* Teams Section */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
										Daftar Tim ({teams.length})
									</h2>
									<button
										type="button"
										onClick={addTeam}
										className="flex items-center px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<PlusIcon className="w-4 h-4 mr-1" />
										Tambah Tim
									</button>
								</div>

								<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Setiap tim dapat memilih kategori sekolah yang berbeda sesuai kuota tersedia
								</p>

								<div className="space-y-4 sm:space-y-6">
									{teams.map((team, teamIndex) => (
										<TeamCard
											key={team.id}
											team={team}
											teamIndex={teamIndex}
											canRemoveTeam={teams.length > 1}
											schoolCategoryLimits={event.schoolCategoryLimits}
											categoryUsage={categoryUsage}
											onRemoveTeam={removeTeam}
											onUpdateTeam={updateTeam}
											onUpdateMember={updateMember}
											onMemberPhoto={handleMemberPhoto}
											onAddMember={addMemberToRole}
											onRemoveMember={removeMemberFromRole}
										/>
									))}
								</div>
							</div>
						</div>

						{/* Sidebar */}
						<div className="lg:col-span-1">
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 sticky top-4">
								<h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Ringkasan Pendaftaran
								</h2>

								<div className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Jumlah Tim:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{teams.length}
										</span>
									</div>

									{/* Personnel breakdown */}
									<div className="space-y-1">
										<span className="text-gray-600 dark:text-gray-400">Total Personil:</span>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Pasukan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.pasukan.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Komandan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.length} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Cadangan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.cadangan.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Official</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.official.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Pelatih</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.pelatih.length, 0)} orang
											</span>
										</div>
									</div>

									{/* Category breakdown */}
									{(() => {
										const categoryCount: Record<string, { name: string; count: number }> = {};
										teams.forEach(team => {
											if (team.schoolCategoryId) {
												const cat = event.schoolCategoryLimits?.find(l => l.schoolCategory.id === team.schoolCategoryId);
												if (cat) {
													if (!categoryCount[team.schoolCategoryId]) {
														categoryCount[team.schoolCategoryId] = { name: cat.schoolCategory.name, count: 0 };
													}
													const entry = categoryCount[team.schoolCategoryId];
													if (entry) entry.count++;
												}
											}
										});
										const entries = Object.values(categoryCount);
										if (entries.length === 0) return null;
										return (
											<div className="space-y-1">
												<span className="text-gray-600 dark:text-gray-400">Kategori:</span>
												{entries.map((entry, idx) => (
													<div key={idx} className="flex justify-between pl-2">
														<span className="text-gray-500 dark:text-gray-400 text-xs">{entry.name}</span>
														<span className="font-medium text-gray-900 dark:text-white text-xs">{entry.count} tim</span>
													</div>
												))}
											</div>
										);
									})()}

									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Biaya per Tim:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{formatCurrency(event.registrationFee)}
										</span>
									</div>

									<hr className="border-gray-200/60 dark:border-gray-700/40" />

									<div className="flex justify-between text-lg">
										<span className="font-semibold text-gray-900 dark:text-white">
											Total Biaya:
										</span>
										<span className="font-bold text-red-600 dark:text-red-400">
											{formatCurrency(totalFee)}
										</span>
									</div>
								</div>

								{/* Payment Method Selection */}
								{event.registrationFee && event.registrationFee > 0 && (
									<div className="mt-4">
										<label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
											Metode Pembayaran
										</label>
										<div className="space-y-2">
											<label
												className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
													paymentMethod === "MIDTRANS"
														? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
														: "border-gray-200 dark:border-gray-600 hover:border-blue-300"
												}`}
											>
												<input
													type="radio"
													name="paymentMethod"
													value="MIDTRANS"
													checked={paymentMethod === "MIDTRANS"}
													onChange={() => setPaymentMethod("MIDTRANS")}
													className="text-blue-600 focus:ring-blue-500"
												/>
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">
														Bayar Online (Midtrans)
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Transfer bank, e-wallet, QRIS, dll.
													</p>
												</div>
											</label>
											<label
												className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
													paymentMethod === "MANUAL"
														? "border-green-500 bg-green-50 dark:bg-green-900/20"
														: "border-gray-200 dark:border-gray-600 hover:border-green-300"
												}`}
											>
												<input
													type="radio"
													name="paymentMethod"
													value="MANUAL"
													checked={paymentMethod === "MANUAL"}
													onChange={() => setPaymentMethod("MANUAL")}
													className="text-green-600 focus:ring-green-500"
												/>
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">
														Bayar Langsung ke Panitia
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Pembayaran tunai/transfer langsung ke panitia
													</p>
												</div>
											</label>
										</div>
										{paymentMethod === "MANUAL" && event.contactPhone && (
											<div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
												<p className="text-sm font-medium text-green-800 dark:text-green-200">
													Hubungi Panitia:
												</p>
												<p className="text-sm text-green-700 dark:text-green-300">
													{event.contactPersonName || "Panitia"} - {event.contactPhone}
												</p>
											</div>
										)}
									</div>
								)}

								<button
									type="submit"
									disabled={submitting || isRegistrationClosed}
									className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center ${isRegistrationClosed
										? 'bg-gray-400 cursor-not-allowed text-white'
										: 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
									}`}
								>
									{isRegistrationClosed ? (
										<>
											<ExclamationCircleIcon className="w-5 h-5 mr-2" />
											Pendaftaran Telah Ditutup
										</>
									) : submitting ? (
										<>
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
											{uploadProgress
												? `Mengupload ${uploadProgress.current}/${uploadProgress.total}...`
												: submitStatus}
										</>
									) : (
										<>
											<CheckCircleIcon className="w-5 h-5 mr-2" />
											{isReregisterMode ? "Simpan Daftar Ulang" : "Daftar Sekarang"}
										</>
									)}
								</button>

								{/* Upload progress bar */}
								{submitting && uploadProgress && uploadProgress.total > 0 && (
									<div className="mt-4">
										<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
											<span>Upload: {uploadProgress.label}</span>
											<span>{uploadProgress.current}/{uploadProgress.total} file</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
											<div
												className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
												style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
											></div>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Jangan tutup halaman ini sampai proses upload selesai
										</p>
									</div>
								)}

								<p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
									Dengan mendaftar, Anda menyetujui syarat dan ketentuan event ini
								</p>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EventRegister;
