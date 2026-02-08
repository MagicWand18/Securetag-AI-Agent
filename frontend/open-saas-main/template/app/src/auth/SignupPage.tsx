import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { SplitAuthLayout } from "./SplitAuthLayout";

export function Signup() {
  return (
    <SplitAuthLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email below to create your account
        </p>
      </div>
      <div className="wasp-auth-form-wrapper">
        <SignupForm />
      </div>
      <div className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline underline-offset-4 hover:text-primary">
          Sign in
        </WaspRouterLink>
      </div>
    </SplitAuthLayout>
  );
}
