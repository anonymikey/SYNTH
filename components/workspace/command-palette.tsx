"use client";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { iconFor } from "@/lib/icons";
import type { ModuleDefinition } from "@/lib/config/modules";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ModuleDefinition[];
  onModuleSelect: (module: ModuleDefinition) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onToggleContext: () => void;
}

export function CommandPalette({ open, onOpenChange, modules, onModuleSelect, onNewChat, onSettings, onToggleContext }: CommandPaletteProps) {
  const NewChatIcon = iconFor("messageCirclePlus");
  const SettingsIcon = iconFor("settings");
  const ContextIcon = iconFor("panelRight");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="SYNTH command palette" description="Search SYNTH workspace commands and modules.">
      <CommandInput placeholder="Search SYNTH commands..." />
      <CommandList>
        <CommandEmpty>No SYNTH command found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => { onNewChat(); onOpenChange(false); }}><NewChatIcon className="size-4" /> New chat<CommandShortcut>⌘ N</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => { onToggleContext(); onOpenChange(false); }}><ContextIcon className="size-4" /> Toggle context panel<CommandShortcut>⌘ B</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => { onSettings(); onOpenChange(false); }}><SettingsIcon className="size-4" /> Open settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="SYNTH modules">
          {modules.map((module) => {
            const Icon = iconFor(module.icon);
            return <CommandItem key={module.id} value={`${module.label} ${module.description}`} onSelect={() => { onModuleSelect(module); onOpenChange(false); }}><Icon className="size-4" /><span>{module.label}</span><span className="ml-auto text-[10px] text-muted-foreground">{module.status === "active" ? "active" : "preview"}</span></CommandItem>;
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
