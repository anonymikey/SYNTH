"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme/theme-provider";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

interface WorkspaceSettingsProps {
  onSavePreferences?: (prefs: UserPreferences) => void;
}

export interface UserPreferences {
  compactMode: boolean;
  showAnimations: boolean;
  notificationsEnabled: boolean;
  showWelcomeScreen: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  compactMode: false,
  showAnimations: true,
  notificationsEnabled: true,
  showWelcomeScreen: true,
};

export function WorkspaceSettings({ onSavePreferences }: WorkspaceSettingsProps) {
  const { theme, toggleTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    onSavePreferences?.(next);
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            label="Dark theme"
            description="Keep the neon IDE canvas in its default dark mode."
            control={
              <Switch
                checked={theme === "dark"}
                onCheckedChange={() => toggleTheme()}
                aria-label="Toggle dark theme"
              />
            }
          />
          <Separator />
          <SettingRow
            label="Compact mode"
            description="Reduce spacing and padding for a denser workspace layout."
            control={
              <Switch
                checked={preferences.compactMode}
                onCheckedChange={(checked) => updatePreference("compactMode", checked)}
                aria-label="Toggle compact mode"
              />
            }
          />
          <Separator />
          <SettingRow
            label="Animations"
            description="Enable smooth transitions and motion effects throughout the workspace."
            control={
              <Switch
                checked={preferences.showAnimations}
                onCheckedChange={(checked) => updatePreference("showAnimations", checked)}
                aria-label="Toggle animations"
              />
            }
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            label="Workspace notifications"
            description="Show local engine and workspace activity feedback."
            control={
              <Switch
                checked={preferences.notificationsEnabled}
                onCheckedChange={(checked) => updatePreference("notificationsEnabled", checked)}
                aria-label="Toggle workspace notifications"
              />
            }
          />
          <Separator />
          <SettingRow
            label="Welcome screen"
            description="Show the welcome state with suggested prompts when starting a new conversation."
            control={
              <Switch
                checked={preferences.showWelcomeScreen}
                onCheckedChange={(checked) => updatePreference("showWelcomeScreen", checked)}
                aria-label="Toggle welcome screen"
              />
            }
          />
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">About SYNTH</p>
            <p className="mt-1 leading-5">
              SYNTH is built by ANONYMIKETECH and created by ANONYMIKE.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">
                v0.1.0
              </Badge>
              <Badge variant="outline" className="text-[9px]">
                Next.js 15
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-destructive">Danger zone</p>
              <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                Permanently remove your SYNTH account and all associated data.
              </p>
            </div>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}
