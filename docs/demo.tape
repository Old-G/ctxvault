# VHS tape file for generating demo.gif
# Run: vhs docs/demo.tape

Output docs/assets/demo.gif

Set FontSize 14
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 40ms

# Setup: create temp project and alias ctx
Hide
Type "cd /tmp && rm -rf ctx-demo && mkdir ctx-demo && cd ctx-demo && git init -q"
Enter
Sleep 500ms
Type "alias ctx='node /Users/glebzavalov/Desktop/Projects/ctxvault/packages/cli/bin/ctx.js'"
Enter
Sleep 300ms
Show

# Init
Type "ctx init --no-hooks --no-skill"
Enter
Sleep 1.5s

# Add memories
Type "ctx add gotcha 'React useEffect runs twice in StrictMode'"
Enter
Sleep 1s

Type "ctx add decision 'Chose SQLite FTS5 over Elasticsearch for search'"
Enter
Sleep 1s

Type "ctx add solution 'Fixed CORS by adding origin whitelist to Express'"
Enter
Sleep 1s

# Search
Type "ctx search 'useEffect'"
Enter
Sleep 2s

# Status
Type "ctx status"
Enter
Sleep 2s

# Inject preview
Type "ctx inject"
Enter
Sleep 3s
