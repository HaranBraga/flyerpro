import AuthForm from "@/components/AuthForm";
import { loginAction } from "../actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <AuthForm mode="login" action={loginAction} />
    </main>
  );
}
