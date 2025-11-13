import { type ReactNode } from 'react'
import { Form, Formik, type FormikConfig, type FormikValues } from 'formik'

interface FormikFormProps<T extends FormikValues> extends Omit<FormikConfig<T>, 'children'> {
  children: ReactNode
  className?: string
}

export const FormikForm = <T extends FormikValues>({
  children,
  className,
  ...formikProps
}: FormikFormProps<T>) => {
  return (
    <Formik {...formikProps}>
      <Form className={className}>{children}</Form>
    </Formik>
  )
}

