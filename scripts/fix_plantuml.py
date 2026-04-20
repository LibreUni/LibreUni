import os
import re

def fix_plantuml(content):
    def replace_block(match):
        code_content = match.group(1)
        
        # 1. @startuml/@enduml
        if '@startuml' not in code_content:
            code_content = '@startuml\n' + code_content.strip() + '\n@enduml'
        elif '@enduml' not in code_content:
            code_content = code_content.strip() + '\n@enduml'
            
        lines = code_content.split('\n')
        new_lines = []
        for line in lines:
            # Skip empty lines or just @startuml/@enduml
            if not line.strip() or line.strip() in ['@startuml', '@enduml']:
                new_lines.append(line)
                continue
            
            # 2. Package names / Containers
            # package Name { or rectangle Name {
            pkg_match = re.match(r'^(\s*(?:package|rectangle|node|database|queue|interface|frame|cloud|folder|node|storage|component)\s+)([^{}\n]+)(\{.*)$', line)
            if pkg_match:
                prefix, name, suffix = pkg_match.groups()
                name = name.strip()
                if not (name.startswith('"') and name.endswith('"')):
                    line = f'{prefix}"{name}" {suffix}'
                new_lines.append(line)
                continue

            # 3. Component/Element definitions
            # [Label] as alias
            # node Label as alias
            # database Label as alias
            
            # Try [Label] as alias
            comp_match = re.match(r'^(\s*)\[([^!"\n].*)\](\s+as\s+\w+)?(.*)$', line)
            if comp_match:
                indent, label, alias_part, suffix = comp_match.groups()
                label = label.strip()
                if not (label.startswith('"') and label.endswith('"')):
                    label = f'"{label}"'
                line = f'{indent}[{label}]{alias_part or ""}{suffix or ""}'
                new_lines.append(line)
                continue

            # Try element Label as alias
            elem_pattern = r'^(\s*(?:node|database|queue|interface|object|state|component|actor|usecase|rectangle|storage|artifact|boundary|control|entity|stack|queue|card)\s+)([^"\s\n][^"\n]*?)(\s+as\s+\w+)?(.*)$'
            elem_match = re.match(elem_pattern, line)
            if elem_match:
                prefix, label, alias_part, suffix = elem_match.groups()
                label = label.strip()
                # Check if it's already quoted
                if not (label.startswith('"') and label.endswith('"')):
                    line = f'{prefix}"{label}"{alias_part or ""}{suffix or ""}'
                new_lines.append(line)
                continue
                
            new_lines.append(line)

        code_content = '\n'.join(new_lines)
        return f'<PlantUML theme="none" code={{`{code_content}`}} />'

    pattern = r'<PlantUML\s+[^>]*code=\{\s*`\s*(.*?)\s*`\s*\}\s*/>'
    new_content = re.sub(pattern, replace_block, content, flags=re.DOTALL)
    return new_content

directory = 'src/content/lessons/programming-languages/'
for filename in os.listdir(directory):
    if filename.endswith('.mdx'):
        path = os.path.join(directory, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = fix_plantuml(content)
        
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filename}")
        else:
            print(f"No changes needed for {filename}")
