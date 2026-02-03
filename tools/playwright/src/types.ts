/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Testing mode values for ableDOMInstanceForTestingNeeded:
 * - 1 (headed): Force headless=false, show UI
 * - 2 (headless): Force headless=true, hide UI
 * - 3 (exact): Use props as-is, no override
 */
export type AbleDOMTestingMode = 1 | 2 | 3;

/**
 * Window interface with AbleDOM testing properties.
 */
export interface WindowWithAbleDOMInstance extends Window {
  ableDOMInstanceForTestingNeeded?: AbleDOMTestingMode;
  ableDOMInstanceForTesting?: {
    idle: () => Promise<
      { id: string; message: string; element: HTMLElement | null }[]
    >;
    highlightElement: (element: HTMLElement, scrollIntoView: boolean) => void;
  };
}
