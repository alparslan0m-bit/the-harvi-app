/**
 * Import extraction for archgovern.
 *
 * Blank out comments and non-module-specifier string literals while keeping the
 * BYTE LENGTH identical to the input (newlines preserved), so match indices and
 * line-number math on the original content stay valid. Module specifier strings
 * (those immediately preceded by import/export/from/require(/import() in code)
 * are preserved verbatim so the extraction regexes can capture them; everything
 * else that is a comment or a plain string literal becomes spaces.
 */
function stripCommentsAndStrings(content) {
  const length = content.length;
  const out = new Array(length).fill(" ");

  // Is the quote at `pos` a module-specifier string (preceded by the import
  // keyword family in code context)?
  function isSpecifierPos(pos) {
    const before = content.slice(0, pos).replace(/[ \t\r\n]+$/, "");
    const okBoundary = (kwLen) => {
      const idx = before.length - kwLen - 1;
      return idx < 0 || !/[A-Za-z0-9_$]/.test(before[idx]);
    };
    return (
      (before.endsWith("from") && okBoundary(4)) ||
      (before.endsWith("import") && okBoundary(6)) ||
      (before.endsWith("import(") && okBoundary(7)) ||
      (before.endsWith("require(") && okBoundary(8))
    );
  }

  // Consume a quoted string verbatim. Returns the index after the closing quote.
  function skipQuotedVerbatim(quote, start) {
    let j = start + 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) return j + 1;
      j++;
    }
    return j;
  }

  // Scan a ${...} interpolation inside a template, starting at the "{". The
  // region is real code, so it is preserved verbatim (nested strings, comments,
  // backticks and ${} nesting are tracked). Returns index after the matching "}".
  function consumeInterpolation(openBrace) {
    out[openBrace] = "{";
    let j = openBrace + 1;
    let depth = 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        out[j] = ch;
        if (j + 1 < length) out[j + 1] = content[j + 1];
        j += 2;
        continue;
      }
      if (ch === "'" || ch === '"') {
        const end = skipQuotedVerbatim(ch, j);
        for (let k = j; k < end; k++) out[k] = content[k];
        j = end;
        continue;
      }
      if (ch === "`") {
        j = consumeTemplate(j);
        continue;
      }
      if (ch === "/" && content[j + 1] === "/") {
        out[j] = "/";
        out[j + 1] = "/";
        j += 2;
        while (j < length && content[j] !== "\n") {
          out[j] = content[j];
          j++;
        }
        continue;
      }
      if (ch === "/" && content[j + 1] === "*") {
        out[j] = "/";
        out[j + 1] = "*";
        j += 2;
        while (j < length && !(content[j] === "*" && content[j + 1] === "/")) {
          out[j] = content[j];
          j++;
        }
        if (j < length) {
          out[j] = "*";
          out[j + 1] = "/";
          j += 2;
        }
        continue;
      }
      if (ch === "$" && content[j + 1] === "{") {
        out[j] = "$";
        out[j + 1] = "{";
        j += 2;
        depth++;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          out[j] = "}";
          return j + 1;
        }
      }
      out[j] = ch;
      j++;
    }
    return j;
  }

  // Scan a backtick template starting at `start`. The template string text is
  // blanked (templates can never be module specifiers); ${...} interpolations
  // are real code and are preserved. Returns index after the closing backtick.
  function consumeTemplate(start) {
    out[start] = " ";
    let j = start + 1;
    while (j < length) {
      const ch = content[j];
      if (ch === "\\") {
        out[j] = " ";
        if (j + 1 < length) {
          const nxt = content[j + 1];
          out[j + 1] = nxt === "\n" ? "\n" : " ";
        }
        j += 2;
        continue;
      }
      if (ch === "`") {
        out[j] = " ";
        return j + 1;
      }
      if (ch === "$" && content[j + 1] === "{") {
        out[j] = "$";
        j = consumeInterpolation(j + 1);
        continue;
      }
      out[j] = ch === "\n" ? "\n" : " ";
      j++;
    }
    return j;
  }

  for (let i = 0; i < length; ) {
    const ch = content[i];

    if (ch === "/" && content[i + 1] === "/") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < length && content[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }

    if (ch === "/" && content[i + 1] === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < length) {
        if (content[i] === "*" && content[i + 1] === "/") {
          out[i] = " ";
          out[i + 1] = " ";
          i += 2;
          break;
        }
        out[i] = content[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      if (isSpecifierPos(i)) {
        const end = skipQuotedVerbatim(ch, i);
        for (let k = i; k < end; k++) out[k] = content[k];
        i = end;
      } else {
        out[i] = " ";
        i++;
        while (i < length) {
          const c2 = content[i];
          if (c2 === "\\") {
            out[i] = " ";
            if (i + 1 < length) {
              const nxt = content[i + 1];
              out[i + 1] = nxt === "\n" ? "\n" : " ";
            }
            i += 2;
            continue;
          }
          if (c2 === ch) {
            out[i] = " ";
            i++;
            break;
          }
          out[i] = c2 === "\n" ? "\n" : " ";
          i++;
        }
      }
      continue;
    }

    if (ch === "`") {
      i = consumeTemplate(i);
      continue;
    }

    out[i] = ch;
    i++;
  }

  return out.join("");
}

// Extract import/export/require/dynamic-import module specifiers with their
// 1-based source line numbers. Runs over the stripped content (comments and
// plain strings have been blanked, so no phantom imports are picked up), and
// recreates each regex per call to avoid shared lastIndex state.
function extractImports(content) {
  const stripped = stripCommentsAndStrings(content);
  const regexes = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /(?<![\w$.])require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /module\.require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const matches = [];
  for (const re of regexes) {
    let m;
    while ((m = re.exec(stripped)) !== null) {
      matches.push({
        index: m.index,
        importPath: m[1],
        lineNum: content.slice(0, m.index).split("\n").length,
      });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  return matches.map(({ importPath, lineNum }) => ({ importPath, lineNum }));
}

module.exports = { stripCommentsAndStrings, extractImports };
