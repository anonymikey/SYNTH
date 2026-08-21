"use client";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { iconFor } from "@/lib/icons";
import type { ModuleDefinition } from "@/lib/config/modules";
import { getShortcutsByGroup } from "@/lib/shortcuts/shortcut-registry";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ModuleDefinition[];
  onModuleSelect: (module: ModuleDefinition) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onToggleContext: () => void;
  onToggleSidebar?: () => void;
  onFocusComposer?: () => void;
  onToggleTheme?: () => void;
  onOpenModelSelector?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  modules,
  onModuleSelect,
  onNewChat,
  onSettings,
  onToggleContext,
  onToggleSidebar,
  onFocusComposer,
  onToggleTheme,
  onOpenModelSelector,
}: CommandPaletteProps) {
  const NewChatIcon = iconFor("messageCirclePlus");
  const SettingsIcon = iconFor("settings");
  const ContextIcon = iconFor("panelRight");
  const SearchIcon = iconFor("search");
  const SidebarIcon = iconFor("panelLeftClose");
  const ThemeIcon = iconFor("sun");
  const ModelIcon = iconFor("cpu");

  const shortcutGroups = getShortcutsByGroup();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="SYNTH command palette" description="Search SYNTH workspace commands and modules.">
      <CommandInput placeholder="Search SYNTH commands..." />
      <CommandList>
        <CommandEmpty>No SYNTH command found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick actions">
          <CommandItem
            value="new conversation"
            onSelect={() => { onNewChat(); onOpenChange(false); }}
          >
            <NewChatIcon className="size-4" />
            <span>New conversation</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle sidebar"
            onSelect={() => { onToggleSidebar?.(); onOpenChange(false); }}
          >
            <SidebarIcon className="size-4" />
            <span>Toggle sidebar</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle context panel"
            onSelect={() => { onToggleContext(); onOpenChange(false); }}
          >
            <ContextIcon className="size-4" />
            <span>Toggle context panel</span>
            <CommandShortcut>⌘⇧B</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="focus composer"
            onSelect={() => { onFocusComposer?.(); onOpenChange(false); }}
          >
            <SearchIcon className="size-4" />
            <span>Focus composer</span>
            <CommandShortcut>⌘/</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="model selector"
            onSelect={() => { onOpenModelSelector?.(); onOpenChange(false); }}
          >
            <ModelIcon className="size-4" />
            <span>Model selector</span>
            <CommandShortcut>⌘⇧M</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle theme"
            onSelect={() => { onToggleTheme?.(); onOpenChange(false); }}
          >
            <ThemeIcon className="size-4" />
            <span>Toggle theme</span>
            <CommandShortcut>⌘⇧L</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="go to dashboard"
            onSelect={() => { onModuleSelect({ id: "assistant", label: "SYNTH Dashboard", description: "Home", icon: "dashboard", status: "active" } as ModuleDefinition); onOpenChange(false); }}
          >
            <SettingsIcon className="size-4" />
            <span>Go to Dashboard</span>
            <CommandShortcut>⌂</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="open settings"
            onSelect={() => { onSettings(); onOpenChange(false); }}
          >
            <SettingsIcon className="size-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* SYNTH Modules */}
        <CommandGroup heading="SYNTH modules">
          {modules.map((module) => {
            const Icon = iconFor(module.icon);
            return (
              <CommandItem
                key={module.id}
                value={`${module.label} ${module.description}`}
                onSelect={() => { onModuleSelect(module); onOpenChange(false); }}
              >
                <Icon className="size-4" />
                <span>{module.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {module.status === "active" ? "active" : "preview"}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Keyboard Shortcuts by Group */}
        {Object.entries(shortcutGroups).map(([group, shortcuts]) => (
          <CommandGroup key={group} heading={`${group} shortcuts`}>
            {shortcuts.map((shortcut) => (
              <CommandItem
                key={shortcut.id}
                value={`${shortcut.label} ${shortcut.description} ${shortcut.keys}`}
                disabled
                className="opacity-70"
              >
                <span className="text-muted-foreground">—</span>
                <span>{shortcut.label}</span>
                <span className="ml-1 text-[10px] text-muted-foreground/60">{shortcut.description}</span>
                <CommandShortcut>{shortcut.keys}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
