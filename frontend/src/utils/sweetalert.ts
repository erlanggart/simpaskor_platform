import Swal from "sweetalert2";

// Success alert
export const showSuccess = (message: string, title: string = "Berhasil!") => {
	return Swal.fire({
		icon: "success",
		title,
		text: message,
		confirmButtonText: "OK",
		confirmButtonColor: "#10b981",
	});
};

// Error alert
export const showError = (message: string, title: string = "Gagal!") => {
	return Swal.fire({
		icon: "error",
		title,
		text: message,
		confirmButtonText: "OK",
		confirmButtonColor: "#ef4444",
	});
};

// Warning alert
export const showWarning = (message: string, title: string = "Peringatan!") => {
	return Swal.fire({
		icon: "warning",
		title,
		text: message,
		confirmButtonText: "OK",
		confirmButtonColor: "#f59e0b",
	});
};

// Info alert
export const showInfo = (message: string, title: string = "Informasi") => {
	return Swal.fire({
		icon: "info",
		title,
		text: message,
		confirmButtonText: "OK",
		confirmButtonColor: "#3b82f6",
	});
};

// Confirmation dialog
export const showConfirm = (
	message: string,
	title: string = "Apakah Anda yakin?",
	confirmButtonText: string = "Ya",
	cancelButtonText: string = "Batal"
) => {
	return Swal.fire({
		icon: "question",
		title,
		text: message,
		showCancelButton: true,
		confirmButtonText,
		cancelButtonText,
		confirmButtonColor: "#3b82f6",
		cancelButtonColor: "#6b7280",
	});
};

// Delete confirmation
export const showDeleteConfirm = (
	itemName: string = "item ini",
	message?: string
) => {
	return Swal.fire({
		icon: "warning",
		title: "Hapus Data",
		text:
			message ||
			`Apakah Anda yakin ingin menghapus ${itemName}? Tindakan ini tidak dapat dibatalkan.`,
		showCancelButton: true,
		confirmButtonText: "Hapus",
		cancelButtonText: "Batal",
		confirmButtonColor: "#ef4444",
		cancelButtonColor: "#6b7280",
	});
};

// Loading alert (can be closed programmatically)
export const showLoading = (message: string = "Mohon tunggu...") => {
	return Swal.fire({
		title: message,
		allowOutsideClick: false,
		allowEscapeKey: false,
		didOpen: () => {
			Swal.showLoading();
		},
	});
};

// Close any open Swal
export const closeAlert = () => {
	Swal.close();
};

// Toast notification (small, auto-dismiss)
export const showToast = (
	message: string,
	icon: "success" | "error" | "warning" | "info" = "success",
	position:
		| "top-end"
		| "top"
		| "top-start"
		| "center"
		| "bottom-start"
		| "bottom"
		| "bottom-end" = "top-end"
) => {
	const Toast = Swal.mixin({
		toast: true,
		position,
		showConfirmButton: false,
		timer: 3000,
		timerProgressBar: true,
		didOpen: (toast) => {
			toast.addEventListener("mouseenter", Swal.stopTimer);
			toast.addEventListener("mouseleave", Swal.resumeTimer);
		},
	});

	return Toast.fire({
		icon,
		title: message,
	});
};
