import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


export function StorefrontSetupNoOrganization() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Setup progress")}</CardTitle>
        <CardDescription>
          {t(
            "Storefront setup is tracked per company. Sign in as a company or staff user, or open a specific website with ?websiteId= as a superadmin.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          {t("Superadmin accounts do not have a default tenant; use the Websites screen after choosing a company context, or pass websiteId in the query string on this overview.")}
        </p>
      </CardContent>
    </Card>
  );
}
