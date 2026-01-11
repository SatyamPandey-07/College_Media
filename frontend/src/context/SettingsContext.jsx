import { createContext, useContext, useState, useEffect } from "react";
import { accountApi } from "../api/endpoints";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem("fontSize") || "medium";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("themePreference") || "auto";
  });

  const [loading, setLoading] = useState(false);

  // Fetch settings from backend on mount (if user is logged in)
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await accountApi.getSettings();
        if (response.success && response.data) {
          if (response.data.fontSize) {
            setFontSize(response.data.fontSize);
            localStorage.setItem("fontSize", response.data.fontSize);
          }
          if (response.data.theme) {
            setTheme(response.data.theme);
            localStorage.setItem("themePreference", response.data.theme);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all font size classes
    root.classList.remove("text-small", "text-medium", "text-large");
    
    // Add the current font size class
    root.classList.add(`text-${fontSize}`);
    
    // Save to localStorage
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  // Update settings on backend
  const updateFontSize = async (newSize) => {
    setFontSize(newSize);
    
    const token = localStorage.getItem("token");
    if (!token) return; // User not logged in, just update locally

    setLoading(true);
    try {
      await accountApi.updateSettings({ fontSize: newSize });
    } catch (error) {
      console.error("Failed to update font size:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("themePreference", newTheme);
    
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      await accountApi.updateSettings({ theme: newTheme });
    } catch (error) {
      console.error("Failed to update theme:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        fontSize, 
        updateFontSize, 
        theme, 
        updateTheme, 
        loading 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
