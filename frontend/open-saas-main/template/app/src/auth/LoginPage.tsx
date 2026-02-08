import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { SplitAuthLayout } from "./SplitAuthLayout";

export default function Login() {
  return (
    <SplitAuthLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue your journey with SecureTag
        </p>
      </div>
      <div className="wasp-auth-form-wrapper">
        <LoginForm />
      </div>
      <div className="text-center text-sm text-muted-foreground mt-4">
        Don't have an account yet?{" "}
        <WaspRouterLink to={routes.SignupRoute.to} className="underline underline-offset-4 hover:text-primary">
          Sign up
        </WaspRouterLink>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        <WaspRouterLink
          to={routes.RequestPasswordResetRoute.to}
          className="underline underline-offset-4 hover:text-primary"
        >
          Forgot your password?
        </WaspRouterLink>
      </div>
    </SplitAuthLayout>
  );
}
