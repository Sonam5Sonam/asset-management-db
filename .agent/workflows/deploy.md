---
description: How to publish changes to the live website
---

# Deploy to Live Site

Since your site is connected to GitHub, "Deploying" just means "Saving to GitHub". Netlify picks it up automatically.

1.  Open your terminal in the project folder.
2.  Run these 3 commands:

```bash
# 1. Stage all changes
git add .

# 2. Save them with a message (you can change the message)
git commit -m "Update site"

# 3. Upload to GitHub (Triggers Netlify)
git push
```

// turbo-all
