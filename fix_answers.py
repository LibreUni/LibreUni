import os
import re

dir_path = "/home/edf/Documents/GitSynced/EdLearning/src/content/lessons/programming-languages"
files = [f for f in os.listdir(dir_path) if f.endswith(".mdx")]

for filename in files:
    file_path = os.path.join(dir_path, filename)
    with open(file_path, 'r') as f:
        content = f.read()
    
    def fix_match(match):
        prefix = match.group(1)
        inner = match.group(2)
        suffix = match.group(3)
        
        # Strip potential whitespace
        inner_stripped = inner.strip()
        if not inner_stripped:
            return match.group(0)
            
        new_inner = inner_stripped
        if not new_inner.startswith('"'):
            new_inner = '"' + new_inner
        if not new_inner.endswith('"'):
            new_inner = new_inner + '"'
            
        return f"{prefix}{new_inner}{suffix}"

    # Match answers={[ ... ]}
    # Using a non-greedy match for the content inside brackets
    new_content = re.sub(r'(answers=\{\[)(.*?)(\]\})', fix_match, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filename}")
    else:
        print(f"No changes needed for {filename}")
