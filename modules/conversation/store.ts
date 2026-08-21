import type {
  ConversationSummary,
  StoredConversation,
} from "./types";

const STORAGE_KEY = "synth-conversations";
const MAX_CONVERSATIONS = 50;

function readAll(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredConversation[];
  } catch {
    return [];
  }
}

function writeAll(conversations: StoredConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage full or unavailable — silently degrade
  }
}

export const ConversationStore = {
  list(): ConversationSummary[] {
    return readAll()
      .map((conv) => ({
        id: conv.id,
        title: conv.title,
        pinned: conv.pinned,
        messageCount: conv.messages.length,
        lastMessage: getLastUserMessage(conv.messages),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  },

  get(id: string): StoredConversation | undefined {
    return readAll().find((conv) => conv.id === id);
  },

  save(conversation: StoredConversation): void {
    const all = readAll().filter((c) => c.id !== conversation.id);
    all.unshift(conversation);
    // Enforce cap
    if (all.length > MAX_CONVERSATIONS) {
      // Remove oldest non-pinned first
      const nonPinned = all.filter((c) => !c.pinned);
      const pinned = all.filter((c) => c.pinned);
      const keep = pinned.concat(nonPinned.slice(0, MAX_CONVERSATIONS - pinned.length));
      writeAll(keep);
    } else {
      writeAll(all);
    }
  },

  remove(id: string): void {
    writeAll(readAll().filter((c) => c.id !== id));
  },

  rename(id: string, title: string): void {
    const all = readAll();
    const conv = all.find((c) => c.id === id);
    if (conv) {
      conv.title = title;
      conv.updatedAt = new Date().toISOString();
      writeAll(all);
    }
  },

  togglePin(id: string): void {
    const all = readAll();
    const conv = all.find((c) => c.id === id);
    if (conv) {
      conv.pinned = !conv.pinned;
      conv.updatedAt = new Date().toISOString();
      writeAll(all);
    }
  },

  search(query: string): ConversationSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return ConversationStore.list();
    return ConversationStore.list().filter(
      (conv) =>
        conv.title.toLowerCase().includes(q) ||
        conv.lastMessage.toLowerCase().includes(q)
    );
  },

  clearUnpinned(): void {
    writeAll(readAll().filter((c) => c.pinned));
  },
};

function getLastUserMessage(messages: StoredConversation["messages"]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  const text =
    typeof last.content === "string"
      ? last.content
      : String(last.content);
  return text.slice(0, 120);
}
