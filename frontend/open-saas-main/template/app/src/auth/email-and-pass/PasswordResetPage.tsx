import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { SplitAuthLayout } from "../SplitAuthLayout";

export function PasswordResetPage() {
  return (
    <SplitAuthLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>
      <div className="wasp-auth-form-wrapper">
        <ResetPasswordForm />
      </div>
      <div className="text-center text-sm text-muted-foreground mt-4">
        If everything is okay,{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline underline-offset-4 hover:text-primary">
          go to login
        </WaspRouterLink>
      </div>
    </SplitAuthLayout>
  );
}
