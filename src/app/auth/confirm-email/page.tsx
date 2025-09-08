export default function ConfirmEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="mx-auto h-12 w-12 text-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We've sent a confirmation link to your email address. Please check your inbox and click the link to verify your account.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          If you don't see the email, please check your spam folder or request a new confirmation email.
        </p>
      </div>
    </div>
  );
}
