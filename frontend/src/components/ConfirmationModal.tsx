interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between bg-secondary-600 p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gunmetal-700 text-sm mb-6 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer - Buttons */}
        <div className="flex justify-end items-center gap-3 p-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gunmetal-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose(); // Close modal after confirm
            }}
            className="px-4 py-2.5 text-sm font-medium text-gunmetal-900 bg-primary-500 border border-primary-500 rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 