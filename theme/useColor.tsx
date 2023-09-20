"use client";

import { useEffect, createContext, useContext, useMemo, useState } from "react";
import { useHistoryState } from "../hooks/useHistoryState";
import {
  Color,
  Hsl,
  parseCSSVariables,
  themes,
  hexToHsl,
  hslToCssString,
  hslToHex,
  createColor,
  randomColor,
} from "./utils";

const randomIndex = Math.floor(Math.random() * themes.length);

const initialColorsLight = parseCSSVariables(themes[randomIndex].light);
const initialColorsDark = parseCSSVariables(themes[randomIndex].dark);

type ColorsContextType = {
  mode: "light" | "dark";
  colors: Color[];
  otherModeColors: Color[];
  uniqueColors: (Color & { varNames: string[] })[];
  setColor: (varName: string, color: Hsl | string) => void;
  setUniqueColor: (colorHsl: Hsl, newColor: Hsl | string) => void;
  getColor: (varName: string) => Color | undefined;
  undo: () => void;
  canUndo: boolean;
  redo: () => void;
  canRedo: boolean;
  save: () => void;
  setLock: (varName: string, locked: boolean) => void;
  setUniqueLock: (colorHsl: Hsl, locked: boolean) => void;
  setLockAllColors: (locked: boolean) => void;
  toggleMode: () => void;
  randomize: () => void;
};

const ColorsContext = createContext<ColorsContextType>({
  mode: "dark",
  colors: initialColorsDark,
  otherModeColors: initialColorsLight,
  uniqueColors: [],
  setColor: (varName: string, color: Hsl | string) => {},
  setUniqueColor: (colorHsl: Hsl, newColor: Hsl | string) => {},
  getColor: () => undefined,
  undo: () => {},
  canUndo: false,
  redo: () => {},
  canRedo: false,
  save: () => {},
  setLock: (varName: string, locked: boolean) => {},
  setUniqueLock: () => {},
  setLockAllColors: () => {},
  toggleMode: () => {},
  randomize: () => {},
});

export const ColorsProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  const darkColors = useHistoryState(initialColorsDark);
  const lightColors = useHistoryState(initialColorsLight);

  const {
    state: colors,
    set: setColors,
    undo,
    canUndo,
    redo,
    canRedo,
    save,
  } = useMemo(
    () => (mode === "dark" ? darkColors : lightColors),
    [mode, darkColors, lightColors]
  );
  const otherModeColors = useMemo(
    () => (mode === "dark" ? lightColors.state : darkColors.state),
    [mode, darkColors, lightColors]
  );

  const toggleMode = () => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  };

  const updateCssVariable = (color: Color) => {
    document.documentElement.style.setProperty(
      color.varName,
      hslToCssString(color.colorHsl)
    );
  };

  useEffect(() => {
    for (const color of colors) {
      updateCssVariable(color);
    }
  }, [colors]);

  const setColor = (varName: string, color: Hsl | string) => {
    const newColors = colors.map((c) => {
      if (c.varName === varName && !c.locked) {
        const newColor = {
          ...c,
        };

        let colorHsl: Hsl;
        let colorHex: string;

        if (typeof color === "string") {
          colorHsl = hexToHsl(color);
          colorHex = color;
        } else {
          colorHsl = color;
          colorHex = hslToHex(color);
        }

        newColor.colorHsl = colorHsl;
        newColor.colorHex = colorHex;

        return newColor;
      } else {
        return c;
      }
    });

    setColors(newColors);
  };

  const getColor = (varName: string) => {
    return colors.find((c) => c.varName === varName);
  };

  const uniqueColors = useMemo(() => {
    const uniqueColors = new Set<string>();
    let filteredVariables = [];

    for (const color of colors) {
      if (!uniqueColors.has(color.colorHex)) {
        uniqueColors.add(color.colorHex);
        filteredVariables.push({ ...color, varNames: [color.varName] });
      } else {
        const existingColor = filteredVariables.find(
          (c) => c.colorHex === color.colorHex
        );
        if (existingColor) {
          existingColor.varNames.push(color.varName);
        }
      }
    }

    return filteredVariables;
  }, [colors]);

  const setUniqueColor = (colorHsl: Hsl, newColor: Hsl | string) => {
    const newColors = colors.map((c) => {
      if (
        c.colorHsl.h === colorHsl.h &&
        c.colorHsl.s === colorHsl.s &&
        c.colorHsl.l === colorHsl.l &&
        !c.locked
      ) {
        const newC = {
          ...c,
        };
        let colorHsl: Hsl;
        let colorHex: string;

        if (typeof newColor === "string") {
          colorHsl = hexToHsl(newColor);
          colorHex = newColor;
        } else {
          colorHsl = newColor;
          colorHex = hslToHex(newColor);
        }

        newC.colorHsl = colorHsl;
        newC.colorHex = colorHex;

        return newC;
      } else {
        return c;
      }
    });

    setColors(newColors);
  };

  const setLock = (varName: string, locked: boolean) => {
    const newColors = colors.map((c) => {
      if (c.varName === varName) {
        const newColor = {
          ...c,
        };

        newColor.locked = locked;

        return newColor;
      } else {
        return c;
      }
    });

    setColors(newColors);
  };

  const setUniqueLock = (colorHsl: Hsl, locked: boolean) => {
    const newColors = colors.map((c) => {
      if (
        c.colorHsl.h === colorHsl.h &&
        c.colorHsl.s === colorHsl.s &&
        c.colorHsl.l === colorHsl.l
      ) {
        const newC = {
          ...c,
        };

        newC.locked = locked;

        return newC;
      } else {
        return c;
      }
    });

    setColors(newColors);
  };

  const setLockAllColors = (locked: boolean) => {
    const newColors = colors.map((c) => {
      const newC = {
        ...c,
      };

      newC.locked = locked;

      return newC;
    });

    setColors(newColors);
  };

  const randomize = () => {
    const newTheme = [createColor("--background", randomColor())];

    const newColors = colors.map((color) => {
      if (color.locked) return color;

      const newColor = newTheme.find((c) => c.varName === color.varName);
      return newColor ?? color;
    });

    setColors(newColors);
    save();
  };

  return (
    <ColorsContext.Provider
      value={{
        mode,
        colors,
        otherModeColors,
        uniqueColors,
        setColor,
        setUniqueColor,
        getColor,
        undo,
        canUndo,
        redo,
        canRedo,
        save,
        setLock,
        setUniqueLock,
        setLockAllColors,
        toggleMode,
        randomize,
      }}
    >
      {children}
    </ColorsContext.Provider>
  );
};

const useColors = () => {
  const context = useContext(ColorsContext);

  return context;
};

export default useColors;