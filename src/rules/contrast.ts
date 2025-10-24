/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { isElementVisible } from "../utils";
import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

function hexToRgb(hex: string): [number, number, number] | null {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  if (hex.length !== 6) {
    return null;
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function parseColor(color: string): [number, number, number] | null {
  color = color.trim();
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }

  const rgbMatch = color.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/,
  );
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10),
    ];
  }
  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function isTransparent(color: string): boolean {
  if (!color) {
    return true;
  }

  color = color.trim();

  if (color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return true;
  }

  const rgbaMatch = color.match(/^rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)$/);
  if (rgbaMatch && parseFloat(rgbaMatch[1]) === 0) {
    return true;
  }

  return false;
}

export class ContrastRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "ContrastRule";
  anchored = true;

  accept(element: HTMLElement): boolean {
    if (!isElementVisible(element)) {
      return false;
    }

    const hasDirectTextContent = Array.from(element.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text && text.length > 0;
      }
      return false;
    });

    return hasDirectTextContent;
  }

  validate(element: HTMLElement): ValidationResult | null {
    const win = this.window;

    if (!win) {
      return null;
    }

    const style = win.getComputedStyle(element);
    const fg = parseColor(style.color);

    if (!fg) {
      return null;
    }

    const hasChildWithDifferentColor = Array.from(element.children).some(
      (child) => {
        if (child instanceof HTMLElement && child.textContent?.trim()) {
          const childStyle = win.getComputedStyle(child);
          const childColor = parseColor(childStyle.color);
          if (
            childColor &&
            (childColor[0] !== fg[0] ||
              childColor[1] !== fg[1] ||
              childColor[2] !== fg[2])
          ) {
            return true;
          }
        }
        return false;
      },
    );

    if (hasChildWithDifferentColor) {
      return null;
    }

    let bg: [number, number, number] | null = null;
    let el: HTMLElement | null = element;
    let depth = 0;
    const maxDepth = 50;

    while (el && depth < maxDepth) {
      const bgColor = win.getComputedStyle(el).backgroundColor;

      if (!isTransparent(bgColor)) {
        const parsedBg = parseColor(bgColor);
        if (parsedBg) {
          bg = parsedBg;
          break;
        }
      }

      el = el.parentElement;
      depth++;
    }

    if (!bg) {
      bg = [255, 255, 255];
    }

    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const ratio = contrastRatio(l1, l2);

    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const isBold =
      fontWeight === "bold" ||
      fontWeight === "bolder" ||
      parseInt(fontWeight, 10) >= 700;

    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && isBold);
    const minRatio = isLarge ? 3 : 4.5;

    if (ratio < minRatio) {
      return {
        issue: {
          id: "contrast",
          message: `Text contrast ratio is ${ratio.toFixed(2)}:1, which is below the minimum of ${minRatio}:1 (text: rgb(${fg.join(", ")}), background: rgb(${bg.join(", ")})) on ${element.tagName}`,
          element,
          help: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
        },
      };
    }

    return null;
  }
}
