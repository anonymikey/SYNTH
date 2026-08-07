import type { PluginDefinition } from "@/modules/plugins/types";

const pluginDefinitions: PluginDefinition[] = [];

export const PluginRegistry = {
  list: () => [...pluginDefinitions],
  register: (plugin: PluginDefinition) => {
    if (!pluginDefinitions.some((item) => item.id === plugin.id)) pluginDefinitions.push(plugin);
  },
};
