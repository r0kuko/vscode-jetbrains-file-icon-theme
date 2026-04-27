/**
 * Kotlin file content detection utilities.
 * Pure functions — no VS Code dependencies.
 */

/**
 * Single regex to match all Kotlin top-level declaration types.
 * Uses alternation with longest-match-first ordering so that
 * "enum class" doesn't also match as bare "class".
 */
const DECLARATION_PATTERN =
    /\b(annotation\s+class|enum\s+class|abstract\s+class|data\s+class|sealed\s+class|companion\s+object|interface|object|typealias|class)\b/g;

const DECLARATION_KIND_MAP: Record<string, string> = {
    'annotation class': 'annotation',
    'enum class': 'enum',
    'abstract class': 'abstract_class',
    'data class': 'data_class',
    'sealed class': 'sealed_class',
    'interface': 'interface',
    'object': 'object',
    'typealias': 'typealias',
    'class': 'class',
};

export function detectKotlinKind(text: string): string | null {
    const stripped = stripCommentsAndStrings(text);

    const kinds = new Set<string>();
    let match: RegExpExecArray | null;

    // Reset lastIndex since we use /g flag
    DECLARATION_PATTERN.lastIndex = 0;
    while ((match = DECLARATION_PATTERN.exec(stripped)) !== null) {
        const raw = match[1].replace(/\s+/g, ' ');
        // Skip companion object — it's not a standalone object declaration
        if (raw === 'companion object') continue;
        const kind = DECLARATION_KIND_MAP[raw];
        if (kind) kinds.add(kind);
    }

    // Container types (sealed class, enum class) naturally contain nested
    // class/data class/object declarations. If a container type is present,
    // bare 'class' and 'data_class' are likely nested sub-types, not
    // separate top-level declarations.
    const containers = new Set(['sealed_class', 'enum']);
    const nested = new Set(['class', 'data_class', 'object']);
    if (kinds.size > 1) {
        const hasContainer = [...kinds].some((k) => containers.has(k));
        if (hasContainer) {
            for (const n of nested) kinds.delete(n);
        }
    }

    // Only show a specialized icon when there is exactly one declaration kind
    if (kinds.size !== 1) {
        return null;
    }

    return kinds.values().next().value!;
}

/**
 * Remove block comments, line comments, and string literals
 * so that keywords inside them don't cause false positives.
 */
export function stripCommentsAndStrings(text: string): string {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')    // block comments
        .replace(/\/\/.*$/gm, '')             // line comments
        .replace(/"""[\s\S]*?"""/g, '')       // raw strings
        .replace(/"(?:[^"\\]|\\.)*"/g, '');   // regular strings
}
