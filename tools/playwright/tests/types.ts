/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Window interface with AbleDOM testing properties.
 */
export interface WindowWithAbleDOM extends Window {
  ableDOMInstanceForTestingNeeded?: boolean;
  ableDOMInstanceForTesting?: {
    idle: () => Promise<
      { id: string; message: string; element: Element | null }[]
    >;
    highlightElement: (el: HTMLElement, scrollIntoView?: boolean) => void;
  };
}
