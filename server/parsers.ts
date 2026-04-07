export interface ParsedSection {
  title: string;
  content: string[];
}

/**
 * Parse a markdown file into sections based on ## headings.
 * Each section has a title and an array of content lines (rules/paragraphs).
 */
export function parseMarkdownSections(raw: string): ParsedSection[] {
  const lines = raw.split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1].trim(), content: [] };
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed) {
        // Strip leading "- " for list items
        current.content.push(trimmed.startsWith('- ') ? trimmed.slice(2) : trimmed);
      }
    } else if (line.trim()) {
      // Content before any heading goes into a default section
      if (!current) {
        current = { title: '', content: [] };
      }
      current.content.push(line.trim());
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Convert sections back to markdown.
 */
export function sectionsToMarkdown(sections: ParsedSection[]): string {
  return sections
    .map((s) => {
      const heading = s.title ? `## ${s.title}\n\n` : '';
      const body = s.content.map((c) => `- ${c}`).join('\n');
      return heading + body;
    })
    .join('\n\n');
}

/**
 * Parse YAML frontmatter from a markdown file (e.g., SKILL.md, agent .md).
 * Returns the frontmatter as key-value pairs and the body as a string.
 */
export function parseYamlFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  // Simple YAML parser for key: value pairs (handles strings, arrays, booleans, numbers)
  let currentKey = '';
  let inArray = false;
  const arrayValues: string[] = [];

  for (const line of frontmatterStr.split('\n')) {
    const trimmed = line.trim();

    if (inArray) {
      if (trimmed.startsWith('- ')) {
        arrayValues.push(trimmed.slice(2).trim());
        continue;
      } else {
        frontmatter[currentKey] = [...arrayValues];
        arrayValues.length = 0;
        inArray = false;
      }
    }

    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();
      currentKey = key;

      if (val === '') {
        // Could be the start of an array
        inArray = true;
        continue;
      }

      // Parse value type
      if (val === 'true') frontmatter[key] = true;
      else if (val === 'false') frontmatter[key] = false;
      else if (/^\d+$/.test(val)) frontmatter[key] = parseInt(val, 10);
      else if (/^\d+\.\d+$/.test(val)) frontmatter[key] = parseFloat(val);
      else frontmatter[key] = val.replace(/^["']|["']$/g, '');
    }
  }

  if (inArray && currentKey) {
    frontmatter[currentKey] = [...arrayValues];
  }

  return { frontmatter, body };
}
