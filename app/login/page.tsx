import LoginForm from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Login to Bid</h1>
        <LoginForm />
      </div>
    </div>
  )
}

