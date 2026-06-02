import React from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">
                    {title}
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                    {message}
                </p>

                <div className="flex gap-3 justify-end mt-4">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
