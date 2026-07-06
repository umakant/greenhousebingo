import { type PropsWithChildren } from "react";
import { AuthCopyrightFooter } from "@/components/auth/crs-auth-brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import CookieConsent from "@/components/cookie-consent";

interface AuthLayoutProps {
  name?: string;
  title?: string;
  description?: string;
}

export default function AuthSimpleLayout({
  children,
  title,
  description,
}: PropsWithChildren<AuthLayoutProps>) {
  const primaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? "#3b82f6";
  const bgBase = "#0B1324";

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-between relative overflow-hidden"
      style={{ backgroundColor: bgBase }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          // Match Laravel-style login background: full-bleed image + dark overlay.
          backgroundImage: `linear-gradient(135deg, rgba(11, 19, 36, 0.88) 0%, rgba(11, 19, 36, 0.65) 45%, rgba(11, 19, 36, 0.88) 100%), url(/images/login-bg-dark.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full p-6 md:p-10">
        <div className="w-full max-w-md relative z-10 mt-16">
          <div
            className="absolute -top-4 -left-4 w-10 h-10 border-t-2 border-l-2 rounded-tl-md"
            style={{ borderColor: primaryColor }}
          />
          <div
            className="absolute -bottom-4 -right-4 w-10 h-10 border-b-2 border-r-2 rounded-br-md"
            style={{ borderColor: primaryColor }}
          />

          <div
            className="rounded-xl shadow-lg border border-slate-700/50 p-8"
            style={{ backgroundColor: "#1E293B" }}
          >
            <div className="flex flex-col gap-6">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="text-center text-sm text-slate-400">{description}</p>
              </div>
              <div className="auth-form-fields">{children}</div>
            </div>
          </div>

          <style>{`
            .auth-form-fields label { color: #e2e8f0; }
            .auth-form-fields input {
              background-color: #334155 !important;
              border-color: #475569 !important;
              color: #f1f5f9 !important;
            }
            .auth-form-fields input::placeholder { color: #94a3b8 !important; }
            .auth-form-fields .text-destructive,
            .auth-form-fields [class*="text-red"] { color: #f87171 !important; }
            .auth-form-fields a { color: ${primaryColor}; }
            .auth-form-fields .text-muted-foreground,
            .auth-form-fields [class*="text-gray"] { color: #94a3b8 !important; }
          `}</style>
        </div>
      </div>

      <AuthCopyrightFooter className="relative z-10 py-4 text-center text-sm text-slate-500" />

      <CookieConsent settings={{}} />
    </div>
  );
}

