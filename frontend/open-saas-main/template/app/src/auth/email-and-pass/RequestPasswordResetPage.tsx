import { ForgotPasswordForm } from "wasp/client/auth";
import { SplitAuthLayout } from "../SplitAuthLayout";

export function RequestPasswordResetPage() {
  return (
    <SplitAuthLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      <div className="wasp-auth-form-wrapper">
        <ForgotPasswordForm />
      </div>
    </SplitAuthLayout>
  );
}
