import { DOMParser, Element, Node } from "@xmldom/xmldom";

export function transformSVG(svgText: string): string {
  if (svgText.startsWith('export default "')) {
    svgText = JSON.parse(svgText.substring("export default ".length));
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const ret: string[] = [];

  ret.push("(function buildSVG(parent) {");
  ret.push("const builder = new DOMBuilder(parent);");

  function traverse(node: Element): void {
    const attributes: Record<string, string> = {};

    for (const attr of Array.from(node.attributes)) {
      attributes[attr.name] = attr.value;
    }

    ret.push(
      `builder.openTag("${node.tagName}", ${JSON.stringify(attributes)}, undefined, "http://www.w3.org/2000/svg");`,
    );

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        traverse(child as Element);
      } else if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent?.trim()
      ) {
        ret.push(`builder.text(${JSON.stringify(child.textContent.trim())});`);
      }
    }

    ret.push("builder.closeTag();");
  }

  const root = doc.documentElement;

  if (root) {
    traverse(root);
  }

  ret.push("return parent.firstElementChild; });");

  return ret.join("\n");
}
