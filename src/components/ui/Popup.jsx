import { t } from '../../i18n';

function Popup({ open, title, message, variant = 'info', confirmText, cancelText, onConfirm, onCancel, extraActions = [] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-md p-6 transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          {Array.isArray(extraActions) && extraActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={action.className || 'px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'}
            >
              {action.label}
            </button>
          ))}
          {variant === 'confirm' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {cancelText || t('popup_cancel')}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600"
          >
            {confirmText || (variant === 'confirm' ? t('popup_confirm') : t('popup_ok'))}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Popup;
