import re

with open("apps/main/src/content/lessons/math-stats/stochastic.mdx", 'r') as f:
    text = f.read()

text = text.replace(r'\n\n', '\n\n')
text = text.replace(r'\n', '\n')

with open("apps/main/src/content/lessons/math-stats/stochastic.mdx", 'w') as f:
    f.write(text)
