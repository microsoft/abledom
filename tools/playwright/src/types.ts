/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Window interface with AbleDOM testing properties.
 */
export interface WindowWithAbleDOMInstance extends Window {
  ableDOMInstanceForTesting?: {
    idle: (
      markAsRead?: boolean,
      timeout?: number,
    ) => Promise<
      { id: string; message: string; element: HTMLElement | null }[] | null
    >;
    highlightElement: (element: HTMLElement, scrollIntoView: boolean) => void;
  };
}
