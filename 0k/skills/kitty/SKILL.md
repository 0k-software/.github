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

2. Check if kitty is running:

   ```
   kitty @ ls 2>/dev/null
   ```

   If the command exits non-zero or produces empty stdout, treat kitty as not
   running and skip to Step 4b. Otherwise parse the JSON output to find a
   window where `cwd` matches the session's working directory (exact match or
   the session dir is a prefix).

3. **If a matching window is found:**
   - Focus the OS window that contains it:
     ```
     kitty @ focus-window --match id:{window-id}
     ```
   - Tell the user which window was activated.

4. **If no matching window is found:**

   a. **Kitty is running but no matching window** — open a new tab:

   ```
   kitty @ new-window --new-tab --cwd {session-cwd} --tab-title "{basename of cwd}"
   ```

   b. **Kitty is not running** — launch a new instance:

   ```
   kitty --directory {session-cwd} &
   ```

   Tell the user a new tab/window was opened.
