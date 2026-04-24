import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { LuZoomIn, LuZoomOut, LuCheck, LuX, LuRotateCw } from "react-icons/lu";

interface ImageCropperProps {
	imageSrc: string;
	onCropComplete: (croppedBlob: Blob) => void;
	onCancel: () => void;
	aspectRatio?: number;
	cropShape?: "rect" | "round";
}

function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", (error) => reject(error));
		image.crossOrigin = "anonymous";
		image.src = url;
	});
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
	const image = await createImage(imageSrc);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No 2d context");

	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Canvas is empty"));
			},
			"image/jpeg",
			0.92
		);
	});
}

const ImageCropper: React.FC<ImageCropperProps> = ({
	imageSrc,
	onCropComplete,
	onCancel,
	aspectRatio = 3 / 4,
	cropShape = "rect",
}) => {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [rotation, setRotation] = useState(0);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [processing, setProcessing] = useState(false);

	const onCropChange = useCallback((location: { x: number; y: number }) => {
		setCrop(location);
	}, []);

	const onZoomChange = useCallback((z: number) => {
		setZoom(z);
	}, []);

	const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleConfirm = async () => {
		if (!croppedAreaPixels) return;
		try {
			setProcessing(true);
			const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
			onCropComplete(croppedBlob);
		} catch (e) {
			console.error("Crop failed:", e);
		} finally {
			setProcessing(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
				{/* Header */}
				<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						Atur Foto Nominee
					</h3>
					<button
						onClick={onCancel}
						className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
					>
						<LuX className="w-4 h-4" />
					</button>
				</div>

				{/* Crop area */}
				<div className="relative w-full h-[350px] bg-gray-900">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						rotation={rotation}
						aspect={aspectRatio}
						cropShape={cropShape}
						onCropChange={onCropChange}
						onZoomChange={onZoomChange}
						onCropComplete={onCropAreaComplete}
						showGrid={true}
					/>
				</div>

				{/* Controls */}
				<div className="px-4 py-3 space-y-3">
					{/* Zoom slider */}
					<div className="flex items-center gap-3">
						<LuZoomOut className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
						<input
							type="range"
							min={1}
							max={3}
							step={0.05}
							value={zoom}
							onChange={(e) => setZoom(Number(e.target.value))}
							className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-700 accent-red-500 cursor-pointer"
						/>
						<LuZoomIn className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
					</div>

					{/* Rotation */}
					<div className="flex items-center gap-3">
						<LuRotateCw className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
						<input
							type="range"
							min={0}
							max={360}
							step={1}
							value={rotation}
							onChange={(e) => setRotation(Number(e.target.value))}
							className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-700 accent-red-500 cursor-pointer"
						/>
						<span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{rotation}°</span>
					</div>
				</div>

				{/* Actions */}
				<div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<p className="text-xs text-gray-400 dark:text-gray-500">
						Geser & zoom untuk mengatur area foto
					</p>
					<div className="flex items-center gap-2">
						<button
							onClick={onCancel}
							className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							Batal
						</button>
						<button
							onClick={handleConfirm}
							disabled={processing}
							className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
						>
							<LuCheck className="w-3.5 h-3.5" />
							{processing ? "Memproses..." : "Terapkan"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ImageCropper;
