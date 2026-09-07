import React from 'react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { motion } from 'motion/react';

interface ResponsiveFormFieldProps {
  label: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select';
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  rows?: number;
}

export const ResponsiveFormField: React.FC<ResponsiveFormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  options,
  required,
  error,
  helperText,
  disabled,
  rows = 3,
}) => {
  const device = useDeviceDetection();

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-semibold text-[#071e27]">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input Field */}
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all touch-target font-[16px] ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
              : 'border-gray-300 focus:border-[#004d99] focus:ring-blue-200'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all touch-target font-[16px] ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
              : 'border-gray-300 focus:border-[#004d99] focus:ring-blue-200'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="">{placeholder || 'Seleccionar...'}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all touch-target font-[16px] ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
              : 'border-gray-300 focus:border-[#004d99] focus:ring-blue-200'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
        />
      )}

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 font-medium flex items-center gap-1"
        >
          ⚠️ {error}
        </motion.p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

// Responsive Button Wrapper
interface ResponsiveButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
}) => {
  const device = useDeviceDetection();

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-[#004d99] hover:bg-[#003366] text-white active:bg-[#002447]',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-[#071e27] active:bg-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white active:bg-red-800',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading || disabled}
      className={`rounded-lg font-semibold transition-all touch-target ${
        sizeClasses[size]
      } ${
        variantClasses[variant]
      } ${
        fullWidth ? 'w-full' : ''
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          Procesando...
        </span>
      ) : (
        label
      )}
    </motion.button>
  );
};
