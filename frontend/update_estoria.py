import re

css_path = 'styles/estoria.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Replace `background: var(--e-charcoal);` with `background: var(--e-pinterest-bg);`
css_content = re.sub(r'background:\s*var\(--e-charcoal\);', 'background: var(--e-pinterest-bg);', css_content)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("estoria.css backgrounds updated.")
