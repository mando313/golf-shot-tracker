import React from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Confirm Action</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-medium transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}
