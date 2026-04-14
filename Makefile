GIT_HOOKS_SRC := .git-hooks
GIT_DIR := $(shell git rev-parse --git-dir 2>/dev/null || echo .git)
GIT_HOOKS_DST := $(GIT_DIR)/hooks

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
PLUGIN_NAME := 0k
MARKETPLACE_NAME := 0k-software

TEMPLATE_FILES := $(wildcard $(ISSUE_TEMPLATE_SRC)/[0-9]*.yml)

.PHONY: sync-skill-templates
sync-skill-templates:
	@mkdir -p $(SKILL_TEMPLATES_DST)
	@rm -f $(SKILL_TEMPLATES_DST)/*.yml
	@cp $(TEMPLATE_FILES) $(SKILL_TEMPLATES_DST)/
	@echo "Synced $(words $(TEMPLATE_FILES)) templates to $(SKILL_TEMPLATES_DST)/"

.PHONY: install-plugin
install-plugin: sync-skill-templates
	@claude plugin marketplace add "$(CURDIR)" 2>/dev/null \
		|| claude plugin marketplace update $(MARKETPLACE_NAME)
	@claude plugin install $(PLUGIN_NAME) 2>/dev/null \
		|| claude plugin update $(PLUGIN_NAME)
	@echo "Plugin $(PLUGIN_NAME) installed from $(MARKETPLACE_NAME) marketplace"

PLUGIN_DIST := dist

.PHONY: package-plugin
package-plugin: sync-skill-templates
	@rm -rf $(PLUGIN_DIST)
	@mkdir -p $(PLUGIN_DIST)
	@cd . && zip -r $(PLUGIN_DIST)/0k-plugin.zip 0k/
	@echo "Packaged plugin -> $(PLUGIN_DIST)/0k-plugin.zip"

.PHONY: uninstall-plugin
uninstall-plugin:
	@claude plugin uninstall $(PLUGIN_NAME) 2>/dev/null || true
	@claude plugin marketplace remove $(MARKETPLACE_NAME) 2>/dev/null || true
	@echo "Plugin $(PLUGIN_NAME) uninstalled"

# Backwards-compatible aliases
.PHONY: install-skills uninstall-skills package-skills
install-skills: install-plugin
uninstall-skills: uninstall-plugin
package-skills: package-plugin
