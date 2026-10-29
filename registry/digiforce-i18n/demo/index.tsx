import { useGetLocale, useTranslate } from "@refinedev/core";
import { useEnabledLocales } from "@digiforce/portal-sdk/i18n";
import { Database, Languages, PanelsTopLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { digiforceClient } from "@digiforce/portal-sdk/client";
import { LanguageSwitcher } from "..";
import { I18nPromptGenerator } from "./prompt-generator";

export function I18nDemoPage() {
  const t = useTranslate();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const locales = useEnabledLocales();
  const canSwitchLanguage = locales.length > 1;

  return (
    <div className="space-y-10 pb-12">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">i18n</Badge>
          <Badge variant="outline">{locale}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
          {t("demo.title", { ns: "digiforce-i18n" }, "Internationalization")}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t(
            "demo.description",
            { ns: "digiforce-i18n" },
            "Optional Digiforce server translations and language controls built on the Starter's internationalization runtime."
          )}
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-4" />
              {t(
                "demo.switcher.title",
                { ns: "digiforce-i18n" },
                "Language switcher"
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "demo.switcher.description",
                { ns: "digiforce-i18n" },
                "The same reusable component is also integrated into the signed-in user menu."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canSwitchLanguage ? (
              <LanguageSwitcher className="max-w-sm" />
            ) : (
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                <Languages className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {t(
                      "demo.switcher.unavailable.title",
                      { ns: "digiforce-i18n" },
                      "Only one language is enabled"
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t(
                      "demo.switcher.unavailable.description",
                      { ns: "digiforce-i18n" },
                      "Enable another language in Digiforce system settings to display the switcher."
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <CapabilityCard
          icon={<PanelsTopLeft className="size-4" />}
          title={t(
            "demo.frontend.title",
            { ns: "digiforce-i18n" },
            "Application UI translations"
          )}
          description={t(
            "demo.frontend.description",
            { ns: "digiforce-i18n" },
            "The Starter provides the runtime while application and Registry components keep their messages in local resource files."
          )}
        >
          <div className="divide-y rounded-lg border">
            <DemoRow
              label={t(
                "language.current",
                { ns: "digiforce-i18n" },
                "Current language"
              )}
              value={locale}
            />
            <DemoRow
              label={t(
                "demo.frontend.actions",
                { ns: "digiforce-i18n" },
                "Common actions"
              )}
              value={`${t("buttons.apply", "Apply")} · ${t(
                "buttons.clear",
                "Clear"
              )}`}
            />
          </div>
        </CapabilityCard>

        <CapabilityCard
          icon={<Database className="size-4" />}
          title={t(
            "demo.server.title",
            { ns: "digiforce-i18n" },
            "Digiforce metadata translations"
          )}
          description={t(
            "demo.server.description",
            { ns: "digiforce-i18n" },
            "Collection and field labels are loaded from dynamic server namespaces such as lm-collections."
          )}
        >
          <div className="divide-y rounded-lg border">
            <DemoRow
              label="Users"
              value={t("Users", { ns: "lm-collections" }, "Users")}
            />
            <DemoRow
              label="Nickname"
              value={t("Nickname", { ns: "lm-collections" }, "Nickname")}
            />
            <DemoRow
              label="X-Locale"
              value={digiforceClient.getLocale() ?? locale}
              code
            />
          </div>
        </CapabilityCard>
      </section>

      <section className="border-t pt-8">
        <I18nPromptGenerator />
      </section>
    </div>
  );
}

function DemoRow({
  code,
  label,
  value,
}: {
  code?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {code ? (
        <code className="rounded bg-muted px-2 py-1 text-xs">{value}</code>
      ) : (
        <span className="text-sm font-medium">{value}</span>
      )}
    </div>
  );
}

function CapabilityCard({
  children,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}
