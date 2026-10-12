import React, { createContext, useContext, useEffect, useState } from "react";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme?: "light" | "dark";
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  headerColor?: string;
  backgroundColor?: string;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramContextValue {
  tg: TelegramWebApp | null;
  user: TelegramUser | null;
  initData: string;
  isReady: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
  tg: null,
  user: null,
  initData: "",
  isReady: false,
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.ready();
      webApp.expand();
      setTg(webApp);
      setInitData(webApp.initData || "");
      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
      } else {
        // Fallback for browser preview during local development
        setUser({
          id: 123456789,
          first_name: "Tashkent",
          last_name: "Gentleman",
          username: "tashkent_gent",
        });
      }
      setIsReady(true);
    } else {
      // Mock for standard browser preview
      setUser({
        id: 123456789,
        first_name: "Tashkent",
        last_name: "Gentleman",
        username: "tashkent_gent",
      });
      // Generate mock initData for development
      const mockUser = JSON.stringify({ id: 123456789, first_name: "Tashkent", last_name: "Gentleman" });
      setInitData(`user=${encodeURIComponent(mockUser)}&auth_date=1728380000&hash=mock_dev_hash`);
      setIsReady(true);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ tg, user, initData, isReady }}>
      {children}
    </TelegramContext.Provider>
  );
};
