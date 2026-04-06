---
name: kitty
description:
  Open kitty terminal — activates an existing window in the current directory
  or opens a new tab
---

Open a kitty terminal window for the current working directory.

## Steps

1. Get the current working directory of this Claude session:

   ```
   pwd
   ```

2. Check if kitty is running and look for a window whose `cwd` matches:

   ```
   kitty @ ls 2>/dev/null
   ```

   This returns JSON. Parse it to find a window where `cwd` matches the
   session's working directory (exact match or the session dir is a prefix).

3. **If a matching window is found:**
   - Focus the OS window that contains it:
     ```
     kitty @ focus-window --match id:<window-id>
     ```
   - Tell the user which window was activated.

4. **If no matching window is found:**
   - Open a new kitty tab in the current directory:
     ```
     kitty @ new-window --new-tab --cwd <session-cwd> --tab-title "<basename of cwd>"
     ```
   - If the above fails because no kitty instance is running, launch a new one:
     ```
     kitty --directory <session-cwd> &
     ```
   - Tell the user a new tab/window was opened.
