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
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
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

export class ContrastRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "ContrastRule";
  anchored = true;

  accept(element: HTMLElement): boolean {
    return isElementVisible(element) && !!element.textContent?.trim();
  }

  validate(element: HTMLElement): ValidationResult | null {
    const win = this.window;

    if (!win) {
      return null;
    }

    const style = win.getComputedStyle(element);
    const fg = parseColor(style.color);
    let bg: [number, number, number] | null = null;
    let el: HTMLElement | null = element;
    // Walk up the tree to find a non-transparent background
    while (el && !bg) {
      const bgColor = win.getComputedStyle(el).backgroundColor;
      if (
        bgColor &&
        bgColor !== "rgba(0, 0, 0, 0)" &&
        bgColor !== "transparent"
      ) {
        bg = parseColor(bgColor);
      }
      el = el.parentElement;
    }
    if (!fg || !bg) {
      return null; // Can't determine colors
    }
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const ratio = contrastRatio(l1, l2);
    // WCAG AA: 4.5:1 for normal text, 3:1 for large text
    const fontSize = parseFloat(style.fontSize);
    const isBold = /bold/i.test(style.fontWeight);
    const isLarge = fontSize >= 18 || (fontSize >= 14 && isBold);
    const minRatio = isLarge ? 3 : 4.5;
    if (ratio < minRatio) {
      return {
        issue: {
          id: "contrast",
          message: `Text contrast ratio is ${ratio.toFixed(2)}:1, which is below the minimum of ${minRatio}:1`,
          element,
          help: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
        },
      };
    }
    return null;
  }
}
