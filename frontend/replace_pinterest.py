import re

dashboard_path = 'pages/provider/dashboard.tsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

dashboard_content = dashboard_content.replace(
    'https://i.pinimg.com/736x/6e/93/79/6e93792081de1444edcaf82a8d64aba6.jpg', 
    '/images/provider-bg.png'
)

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(dashboard_content)

print("dashboard.tsx updated to use local image.")
