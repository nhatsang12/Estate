import re
import os

dashboard_path = 'pages/provider/dashboard.tsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

# Replace inline styles where var(--e-charcoal) is used as a background
# Example: background: "var(--e-charcoal)" -> background: "var(--e-pinterest-bg)"
dashboard_content = re.sub(r'background:\s*(["\'])var\(--e-charcoal\)(["\'])', r'background: \g<1>var(--e-pinterest-bg)\g<2>', dashboard_content)

# Example: background: condition ? "var(--e-charcoal)" : "#fff"
dashboard_content = re.sub(r'var\(--e-charcoal\)', r'var(--e-pinterest-bg)', dashboard_content)
# Wait, if I indiscriminately replace var(--e-charcoal) with var(--e-pinterest-bg), it will also replace color: var(--e-charcoal).
# We ONLY want to replace it for background properties or background gradients.

# Let's revert and do targeted replacements in dashboard.tsx:
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

# 1. Linear gradients
dashboard_content = dashboard_content.replace('linear-gradient(135deg, var(--e-charcoal), #1a1e1b)', 'var(--e-pinterest-bg)')
dashboard_content = dashboard_content.replace('bg-[var(--e-charcoal)]', 'bg-[url("https://i.pinimg.com/736x/6e/93/79/6e93792081de1444edcaf82a8d64aba6.jpg")] bg-cover bg-center bg-no-repeat')

# 2. Inline background property values
dashboard_content = re.sub(
    r'(background:\s*.*?)var\(--e-charcoal\)(.*?[,}])', 
    r'\g<1>var(--e-pinterest-bg)\g<2>', 
    dashboard_content
)

# 3. For hover events setting background
dashboard_content = re.sub(
    r'(e\.currentTarget\.style\.background\s*=\s*)(["\'])var\(--e-charcoal\)(["\'])',
    r'\1\2var(--e-pinterest-bg)\3',
    dashboard_content
)

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(dashboard_content)
    
print("dashboard.tsx updated.")

# Now update estoria.css
css_path = 'styles/estoria.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

if "--e-pinterest-bg" not in css_content:
    css_content = css_content.replace(
        '--e-charcoal: #1A2B1E;',
        '--e-charcoal: #1A2B1E;\n    --e-pinterest-bg: url("https://i.pinimg.com/736x/6e/93/79/6e93792081de1444edcaf82a8d64aba6.jpg") center/cover no-repeat;'
    )

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("estoria.css updated.")
