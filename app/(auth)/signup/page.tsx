import AuthForm from "@/components/AuthForm";
import { signupAction } from "../actions";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <AuthForm mode="signup" action={signupAction} />
    </main>
  );
}
