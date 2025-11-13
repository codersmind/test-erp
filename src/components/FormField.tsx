import { useField } from 'formik'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseFieldProps {
  name: string
  label?: string | ReactNode
  required?: boolean
  helperText?: string
  className?: string
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  as?: 'input'
}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  as: 'select'
  children: React.ReactNode
}

interface TextareaFieldProps extends BaseFieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  as: 'textarea'
}

type FormFieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps

export const FormField = (props: FormFieldProps) => {
  const { name, label, required, helperText, className, as = 'input', ...fieldProps } = props
  const [field, meta] = useField(name)

  const hasError = meta.touched && meta.error
  const fieldId = `field-${name}`

  const baseInputClasses = `mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/40 dark:border-red-700'
      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/40 dark:border-slate-700'
  } bg-white dark:bg-slate-900 dark:text-slate-50`

  const renderField = () => {
    // Convert null to empty string for input/textarea, undefined for select
    const fieldValue = field.value === null ? (as === 'select' ? undefined : '') : field.value

    if (as === 'select') {
      return (
        <select
          id={fieldId}
          {...field}
          value={fieldValue}
          {...(fieldProps as SelectFieldProps)}
          className={`${baseInputClasses} ${className || ''}`}
        >
          {props.children}
        </select>
      )
    }

    if (as === 'textarea') {
      return (
        <textarea
          id={fieldId}
          {...field}
          value={fieldValue}
          {...(fieldProps as TextareaFieldProps)}
          className={`${baseInputClasses} ${className || ''}`}
        />
      )
    }

    return (
      <input
        id={fieldId}
        {...field}
        value={fieldValue}
        {...(fieldProps as InputFieldProps)}
        className={`${baseInputClasses} ${className || ''}`}
      />
    )
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-600 dark:text-slate-300">
          {typeof label === 'string' ? (
            <>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </>
          ) : (
            label
          )}
        </label>
      )}
      {renderField()}
      {hasError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{meta.error}</p>}
      {helperText && !hasError && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  )
}

