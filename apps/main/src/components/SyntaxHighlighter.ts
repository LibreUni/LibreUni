export const highlightCode = (text: string) => {
  if (!text) return '';

  // 1. Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. One-pass tokenization using a single regex with capture groups
  // Improved to handle flags, properties, and better shell identification
  const combinedRegex = /(?:\/\/.*|\/\*[\s\S]*?\*\/|#.*)|(?:&quot;.*?&quot;|&#039;.*?&#039;)|(?:&lt;&lt;|&gt;&gt;|::|\+\+|--|-&gt;|==|!=|&lt;=|&gt;=|&&|\|\||&lt;|&gt;|&amp;)|(?:#\w+)|(?:\b(?:if|else|while|for|return|class|struct|public|private|protected|namespace|using|new|delete|try|catch|throw|virtual|override|final|constexpr|const|static|mutable|volatile|explicit|export|import|template|typename|concept|requires|target_link_libraries|add_executable|project|cmake_minimum_required|set|find_package|let|var|function|async|await|break|continue|default|do|enum|extends|finally|implements|in|instanceof|interface|package|super|switch|this|typeof|with|yield|undefined|null|true|false|def|from|as|elif|None|is|not|pass|raise|try|except|None|lambda|with|assert|nonlocal|global|del)\b)|(?:\b(?:int|char|float|double|void|bool|auto|std|iostream|vector|string|uint32_t|int32_t|uint64_t|int64_t|long|short|unsigned|signed|size_t|number|any|boolean|object|symbol|bigint|unknown|never)\b)|(?:\b(?:cout|endl|cin|cerr|clog|printf|scanf|malloc|free|memcpy|memset|console|log|error|warn|info|debug|git|init|status|add|commit|branch|checkout|switch|merge|push|pull|fetch|rebase|stash|log|diff|config|remote|tag|reset|revert|bisect|grep|show|rm|mv|mkdir|cd|echo|cat|openssl|sha1|sudo|apt|dnf|pacman|pkg|brew|winget|print|len|range|zip|enumerate|sorted|reversed|abs|sum|min|max|any|all|bool|int|float|str|list|dict|set|tuple|type|input|open|exec|eval|vars|getattr|setattr|hasattr)\b)|(?:-{1,2}[a-zA-Z0-9-]+)|(?:[-+*/%=<>!&|^~])|(?:[(){}\[\]])|(?:\b\d+\b)/g;

  return escaped.replace(combinedRegex, (match) => {
    // 1. Comments
    if (match.startsWith('//') || match.startsWith('/*') || (match.startsWith('#') && !/#[a-zA-Z]/.test(match))) 
      return `<span class="hl-comment">${match}</span>`;
    // 2. Strings
    if (match.startsWith('&quot;') || match.startsWith('&#039;')) return `<span class="hl-string">${match}</span>`;
    // 3. Flags/Options (Starting with - or --)
    if (match.startsWith('-')) return `<span class="hl-flag">${match}</span>`;
    // 4. Operators
    if (/^(&lt;&lt;|&gt;&gt;|::|\+\+|--|-&gt;|==|!=|&lt;=|&gt;=|&&|\|\||&lt;|&gt;|&amp;)$/.test(match) || /^[-+*/%=<>!&|^~]$/.test(match)) 
      return `<span class="hl-operator">${match}</span>`;
    // 5. Directives
    if (match.startsWith('#')) return `<span class="hl-directive">${match}</span>`;
    // 6. Keywords
    if (/^(if|else|while|for|return|class|struct|public|private|protected|namespace|using|new|delete|try|catch|throw|virtual|override|final|constexpr|const|static|mutable|volatile|explicit|export|import|template|typename|concept|requires|target_link_libraries|add_executable|project|cmake_minimum_required|set|find_package|let|var|function|async|await|break|continue|default|do|enum|extends|finally|implements|in|instanceof|interface|package|super|switch|this|typeof|with|yield|undefined|null|true|false|def|from|as|elif|None|is|not|pass|raise|try|except|None|lambda|with|assert|nonlocal|global|del)$/.test(match)) 
      return `<span class="hl-keyword">${match}</span>`;
    // 7. Types
    if (/^(int|char|float|double|void|bool|auto|std|iostream|vector|string|uint32_t|int32_t|uint64_t|int64_t|long|short|unsigned|signed|size_t|number|any|boolean|object|symbol|bigint|unknown|never)$/.test(match))
      return `<span class="hl-type">${match}</span>`;
    // 8. Functions/Commands
    if (/^(cout|endl|cin|cerr|clog|printf|scanf|malloc|free|memcpy|memset|console|log|error|warn|info|debug|git|init|status|add|commit|branch|checkout|switch|merge|push|pull|fetch|rebase|stash|log|diff|config|remote|tag|reset|revert|bisect|grep|show|rm|mv|mkdir|cd|echo|cat|openssl|sha1|sudo|apt|dnf|pacman|pkg|brew|winget|print|len|range|zip|enumerate|sorted|reversed|abs|sum|min|max|any|all|bool|int|float|str|list|dict|set|tuple|type|input|open|exec|eval|vars|getattr|setattr|hasattr)$/.test(match)) {
      return `<span class="hl-function">${match}</span>`;
    }
    // 9. Brackets
    if (/^[(){}\[\]]$/.test(match)) return `<span class="hl-bracket">${match}</span>`;
    // 10. Numbers
    if (/^\d+$/.test(match)) return `<span class="hl-number">${match}</span>`;
    
    return match;
  });
};
