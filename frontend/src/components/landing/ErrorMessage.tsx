import React from "react";

interface ErrorMessageProps {
	message: string;
	onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="text-center">
				<p className="text-red-600 mb-4">{message}</p>
				{onRetry && (
					<button
						onClick={onRetry}
						className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
					>
						Coba Lagi
					</button>
				)}
			</div>
		</div>
	);
};

export default ErrorMessage;
