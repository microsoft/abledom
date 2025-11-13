/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ValidationRule, ValidationResult, ValidationRuleType } from "./base";

interface ParentRequirement {
  allowedParents?: string[];

  allowedParentRoles?: string[];

  allowIntermediateWrappers?: boolean;

  allowedWrappers?: string[];

  customValidator?: (element: HTMLElement) => boolean;
}

export class RequiredParentRule extends ValidationRule {
  type = ValidationRuleType.Error;
  name = "aria-required-parent";
  anchored = true;

  private parentRequirements: Map<string, ParentRequirement> = new Map([
    [
      "LI",
      {
        allowedParents: ["UL", "OL"],
        allowedParentRoles: ["list"],
      },
    ],

    [
      "DT",
      {
        allowedParents: ["DL"],
        allowIntermediateWrappers: true,
        allowedWrappers: ["DIV"],
      },
    ],
    [
      "DD",
      {
        allowedParents: ["DL"],
        allowIntermediateWrappers: true,
        allowedWrappers: ["DIV"],
      },
    ],

    [
      "TR",
      {
        allowedParents: ["TABLE", "THEAD", "TBODY", "TFOOT"],
        allowedParentRoles: ["table", "grid", "treegrid"],
      },
    ],
    [
      "TH",
      {
        allowedParents: ["TR"],
        allowedParentRoles: ["row"],
      },
    ],
    [
      "TD",
      {
        allowedParents: ["TR"],
        allowedParentRoles: ["row"],
      },
    ],
    [
      "THEAD",
      {
        allowedParents: ["TABLE"],
        allowedParentRoles: ["table", "grid", "treegrid"],
      },
    ],
    [
      "TBODY",
      {
        allowedParents: ["TABLE"],
        allowedParentRoles: ["table", "grid", "treegrid"],
      },
    ],
    [
      "TFOOT",
      {
        allowedParents: ["TABLE"],
        allowedParentRoles: ["table", "grid", "treegrid"],
      },
    ],
    [
      "CAPTION",
      {
        allowedParents: ["TABLE"],
      },
    ],
    [
      "COLGROUP",
      {
        allowedParents: ["TABLE"],
      },
    ],
    [
      "COL",
      {
        allowedParents: ["COLGROUP"],
      },
    ],

    [
      "FIGCAPTION",
      {
        allowedParents: ["FIGURE"],
      },
    ],

    [
      "OPTION",
      {
        allowedParents: ["SELECT", "OPTGROUP", "DATALIST"],
      },
    ],
    [
      "OPTGROUP",
      {
        allowedParents: ["SELECT"],
      },
    ],

    [
      "LEGEND",
      {
        allowedParents: ["FIELDSET"],
      },
    ],

    [
      "SUMMARY",
      {
        allowedParents: ["DETAILS"],
      },
    ],

    [
      "SOURCE",
      {
        allowedParents: ["AUDIO", "VIDEO", "PICTURE"],
      },
    ],
    [
      "TRACK",
      {
        allowedParents: ["AUDIO", "VIDEO"],
      },
    ],

    [
      "role=menuitem",
      {
        allowedParentRoles: ["menu", "menubar", "group"],
      },
    ],
    [
      "role=menuitemcheckbox",
      {
        allowedParentRoles: ["menu", "menubar", "group"],
      },
    ],
    [
      "role=menuitemradio",
      {
        allowedParentRoles: ["menu", "menubar", "group"],
      },
    ],

    [
      "role=listitem",
      {
        allowedParentRoles: ["list", "group"],
      },
    ],

    [
      "role=treeitem",
      {
        allowedParentRoles: ["tree", "group"],
      },
    ],

    [
      "role=tab",
      {
        allowedParentRoles: ["tablist"],
      },
    ],

    [
      "role=row",
      {
        allowedParentRoles: ["table", "grid", "treegrid", "rowgroup"],
      },
    ],

    [
      "role=cell",
      {
        allowedParentRoles: ["row"],
      },
    ],
    [
      "role=gridcell",
      {
        allowedParentRoles: ["row"],
      },
    ],
    [
      "role=columnheader",
      {
        allowedParentRoles: ["row"],
      },
    ],
    [
      "role=rowheader",
      {
        allowedParentRoles: ["row"],
      },
    ],

    [
      "role=rowgroup",
      {
        allowedParentRoles: ["table", "grid", "treegrid"],
      },
    ],

    [
      "role=option",
      {
        allowedParentRoles: ["listbox", "group"],
      },
    ],
  ]);

  accept(element: HTMLElement): boolean {
    const tagName = element.tagName;
    const role = element.getAttribute("role");

    if (this.parentRequirements.has(tagName)) {
      return true;
    }

    if (role && this.parentRequirements.has(`role=${role}`)) {
      return true;
    }

    return false;
  }

  validate(element: HTMLElement): ValidationResult | null {
    const tagName = element.tagName;
    const role = element.getAttribute("role");

    let requirement: ParentRequirement | undefined;
    let identifier: string = "";

    if (role && this.parentRequirements.has(`role=${role}`)) {
      requirement = this.parentRequirements.get(`role=${role}`);
      identifier = `role="${role}"`;
    } else if (this.parentRequirements.has(tagName)) {
      requirement = this.parentRequirements.get(tagName);
      identifier = `<${tagName.toLowerCase()}>`;
    }

    if (!requirement) {
      return null;
    }

    if (requirement.customValidator) {
      if (requirement.customValidator(element)) {
        return null;
      } else {
        return this.createIssue(element, identifier, requirement);
      }
    }

    if (this.hasValidParent(element, requirement)) {
      return null;
    }

    return this.createIssue(element, identifier, requirement);
  }

  private hasValidParent(
    element: HTMLElement,
    requirement: ParentRequirement,
  ): boolean {
    let parent = element.parentElement;
    let depth = 0;
    const maxDepth = requirement.allowIntermediateWrappers ? 2 : 1;

    while (parent && depth < maxDepth) {
      if (requirement.allowedParents?.includes(parent.tagName)) {
        return true;
      }

      const parentRole = parent.getAttribute("role");
      if (parentRole && requirement.allowedParentRoles?.includes(parentRole)) {
        return true;
      }

      if (depth === 0 && !requirement.allowIntermediateWrappers) {
        break;
      }

      if (depth === 0 && requirement.allowIntermediateWrappers) {
        if (!requirement.allowedWrappers?.includes(parent.tagName)) {
          break;
        }
      }

      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  private createIssue(
    element: HTMLElement,
    identifier: string,
    requirement: ParentRequirement,
  ): ValidationResult {
    const allowedParentsText = [
      ...(requirement.allowedParents?.map((p) => `<${p.toLowerCase()}>`) || []),
      ...(requirement.allowedParentRoles?.map((r) => `role="${r}"`) || []),
    ].join(", ");

    const message = `${identifier} must be contained by ${allowedParentsText}`;

    return {
      issue: {
        id: "aria-required-parent",
        message,
        element,
        help: "https://dequeuniversity.com/rules/axe/4.2/aria-required-parent",
      },
    };
  }
}
