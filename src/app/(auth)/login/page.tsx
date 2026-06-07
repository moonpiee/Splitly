import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <div className="loginwrap min-h-screen grid place-items-center p-6 bg-bg1">
      <AuthForm mode="login" />
    </div>
  )
}
