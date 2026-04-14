GIT_HOOKS_SRC := .git-hooks
GIT_HOOKS_DST := .git/hooks

HOOK_FILES := $(wildcard $(GIT_HOOKS_SRC)/*)

.PHONY: all
all: setup install-plugin package-plugin

.PHONY: setup
setup:
	@mkdir -p $(GIT_HOOKS_DST)
	@for hook in $(HOOK_FILES); do \
		name=$$(basename "$$hook"); \
		cp "$$hook" "$(GIT_HOOKS_DST)/$$name"; \
		chmod +x "$(GIT_HOOKS_DST)/$$name"; \
		echo "Installed hook: $$name"; \
	done
	@echo "Git hooks installed to $(GIT_HOOKS_DST)/"

ISSUE_TEMPLATE_SRC := .github/ISSUE_TEMPLATE
SKILL_TEMPLATES_DST := 0k/skills/create-issue/templates
PLUGIN_SRC := 0k
PLUGIN_HOME := $(HOME)/.claude/plugins/0k

TEMPLATE_FILES := $(wildcard $(ISSUE_TEMPLATE_SRC)/[0-9]*.yml)
SKILL_DIRS := $(wildcard $(PLUGIN_SRC)/skills/*)

.PHONY: sync-skill-templates
sync-skill-templates:
	@mkdir -p $(SKILL_TEMPLATES_DST)
	@rm -f $(SKILL_TEMPLATES_DST)/*.yml
	@cp $(TEMPLATE_FILES) $(SKILL_TEMPLATES_DST)/
	@echo "Synced $(words $(TEMPLATE_FILES)) templates to $(SKILL_TEMPLATES_DST)/"

.PHONY: install-plugin
install-plugin: sync-skill-templates
	@mkdir -p "$(PLUGIN_HOME)/.claude-plugin"
	@cp $(PLUGIN_SRC)/.claude-plugin/plugin.json "$(PLUGIN_HOME)/.claude-plugin/"
	@for dir in $(SKILL_DIRS); do \
		name=$$(basename "$$dir"); \
		echo "Installing $$name -> $(PLUGIN_HOME)/skills/$$name/"; \
		mkdir -p "$(PLUGIN_HOME)/skills/$$name"; \
		rm -rf "$(PLUGIN_HOME)/skills/$$name/"*; \
		cp -r "$$dir/"* "$(PLUGIN_HOME)/skills/$$name/"; \
	done
	@echo "Installed 0k plugin to $(PLUGIN_HOME)/"

PLUGIN_DIST := dist

.PHONY: package-plugin
package-plugin: sync-skill-templates
	@rm -rf $(PLUGIN_DIST)
	@mkdir -p $(PLUGIN_DIST)
	@cd . && zip -r $(PLUGIN_DIST)/0k-plugin.zip 0k/
	@echo "Packaged plugin -> $(PLUGIN_DIST)/0k-plugin.zip"

.PHONY: uninstall-plugin
uninstall-plugin:
	@if [ -d "$(PLUGIN_HOME)" ]; then \
		rm -rf "$(PLUGIN_HOME)"; \
		echo "Removed $(PLUGIN_HOME)/"; \
	fi

# Backwards-compatible aliases
.PHONY: install-skills uninstall-skills package-skills
install-skills: install-plugin
uninstall-skills: uninstall-plugin
package-skills: package-plugin
