import type { ChannelMessage, ViewportRect, WindowState } from "../types";

const CHANNEL_NAME = "COSMIC_NEXUS_TS_MULTI_WINDOW_V2";
const WINDOW_TIMEOUT_MS = 3500;

export class WindowManager extends EventTarget {
  public readonly id: string;
  public windows = new Map<string, WindowState>();

  private readonly channel: BroadcastChannel;

  constructor() {
    super();

    this.id =
      crypto.randomUUID?.() ??
      `win-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<unknown>) => {
      this.handleMessage(event.data);
    };

    window.addEventListener("beforeunload", () => {
      this.post({
        type: "remove-window",
        id: this.id
      });
    });
  }

  updateSelf(): void {
    const rect = this.getViewportRect();

    const data: WindowState = {
      id: this.id,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      lastSeen: Date.now()
    };

    this.windows.set(this.id, data);

    this.post({
      type: "window-update",
      data
    });
  }

  cleanup(): void {
    const now = Date.now();

    for (const [id, win] of this.windows.entries()) {
      if (id === this.id) continue;

      if (now - win.lastSeen > WINDOW_TIMEOUT_MS) {
        this.windows.delete(id);

        this.dispatchEvent(
          new CustomEvent("window-remove", {
            detail: { id }
          })
        );
      }
    }
  }

  getSortedWindows(): WindowState[] {
    return [...this.windows.values()].sort((a, b) => a.x - b.x);
  }

  getViewportRect(): ViewportRect {
    const sideBorder = Math.max(
      0,
      (window.outerWidth - window.innerWidth) / 2
    );

    const topChrome = Math.max(
      0,
      window.outerHeight - window.innerHeight - sideBorder
    );

    return {
      x: window.screenX + sideBorder,
      y: window.screenY + topChrome,
      w: window.innerWidth,
      h: window.innerHeight
    };
  }

  openWindow(): void {
    const left = Math.round(window.screenX + window.outerWidth + 16);
    const top = Math.round(window.screenY);

    window.open(
      location.href,
      "_blank",
      `width=680,height=500,left=${left},top=${top}`
    );
  }

  broadcastBurst(x: number, y: number, z = 0): void {
    this.post({
      type: "burst",
      data: { x, y, z }
    });
  }

  broadcastPalette(index: number): void {
    this.post({
      type: "palette",
      index
    });
  }

  private handleMessage(raw: unknown): void {
    const msg = this.validateMessage(raw);

    if (!msg) {
      console.warn("[WindowManager] Invalid message:", raw);
      return;
    }

    if (msg.type === "window-update") {
      this.windows.set(msg.data.id, msg.data);

      this.dispatchEvent(
        new CustomEvent("window-update", {
          detail: msg.data
        })
      );
    }

    if (msg.type === "remove-window") {
      this.windows.delete(msg.id);

      this.dispatchEvent(
        new CustomEvent("window-remove", {
          detail: { id: msg.id }
        })
      );
    }

    if (msg.type === "burst") {
      this.dispatchEvent(
        new CustomEvent("burst", {
          detail: msg.data
        })
      );
    }

    if (msg.type === "palette") {
      this.dispatchEvent(
        new CustomEvent("palette", {
          detail: { index: msg.index }
        })
      );
    }
  }

  private validateMessage(raw: unknown): ChannelMessage | null {
    if (!raw || typeof raw !== "object") return null;

    const msg = raw as Partial<ChannelMessage>;

    if (msg.type === "window-update") {
      const data = (msg as { data?: Partial<WindowState> }).data;

      if (!data || typeof data.id !== "string") return null;

      const nums = [data.x, data.y, data.w, data.h, data.lastSeen];

      if (
        !nums.every(
          (value) => typeof value === "number" && Number.isFinite(value)
        )
      ) {
        return null;
      }

      return msg as ChannelMessage;
    }

    if (msg.type === "remove-window") {
      return typeof (msg as { id?: unknown }).id === "string"
        ? (msg as ChannelMessage)
        : null;
    }

    if (msg.type === "burst") {
      const data = (msg as { data?: { x?: unknown; y?: unknown; z?: unknown } })
        .data;

      if (!data) return null;

      return [data.x, data.y, data.z].every(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
        ? (msg as ChannelMessage)
        : null;
    }

    if (msg.type === "palette") {
      return typeof (msg as { index?: unknown }).index === "number"
        ? (msg as ChannelMessage)
        : null;
    }

    return null;
  }

  private post(message: ChannelMessage): void {
    this.channel.postMessage(message);
  }
}