const decodeXmlText = (value) => value
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"');

/**
 * PlantUML can return exit code 0 and still put diagnostics in the SVG.
 * These messages are rendered as a yellow panel, so inspect the SVG text
 * rather than relying only on the process status or an SVG parse.
 */
export function findPlantUmlDiagnostics(svg) {
  const diagnostics = [];
  const textNodes = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
    .map((match) => decodeXmlText(match[1]).replace(/\s+/g, ' ').trim());

  for (const message of textNodes) {
    if (/^You should use a bracket\s*\(\{/i.test(message) || /^Warning:/i.test(message)) {
      if (!diagnostics.includes(message)) diagnostics.push(message);
    }
  }

  return diagnostics;
}
