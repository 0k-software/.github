GIT_HOOKS_SRC := .git-hooks
GIT_HOOKS_DST := .git/hooks

HOOK_FILES := $(wildcard $(GIT_HOOKS_SRC)/*)

.PHONY: all
all: setup install-skills package-skills

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
SKILL_TEMPLATES_DST := .claude/skills/0k-create-issue/templates
SKILLS_SRC := .claude/skills
SKILLS_HOME := $(HOME)/.claude/skills

TEMPLATE_FILES := $(wildcard $(ISSUE_TEMPLATE_SRC)/[0-9]*.yml)
SKILL_DIRS := $(wildcard $(SKILLS_SRC)/0k-*)

.PHONY: sync-skill-templates
sync-skill-templates:
	@mkdir -p $(SKILL_TEMPLATES_DST)
	@rm -f $(SKILL_TEMPLATES_DST)/*.yml
	@cp $(TEMPLATE_FILES) $(SKILL_TEMPLATES_DST)/
	@echo "Synced $(words $(TEMPLATE_FILES)) templates to $(SKILL_TEMPLATES_DST)/"

.PHONY: install-skills
install-skills: sync-skill-templates
	@for dir in $(SKILL_DIRS); do \
		name=$$(basename "$$dir"); \
		echo "Installing $$name -> $(SKILLS_HOME)/$$name/"; \
		mkdir -p "$(SKILLS_HOME)/$$name"; \
		rm -rf "$(SKILLS_HOME)/$$name/"*; \
		cp -r "$$dir/"* "$(SKILLS_HOME)/$$name/"; \
	done
	@echo "Installed $(words $(SKILL_DIRS)) skill(s) to $(SKILLS_HOME)/"

SKILLS_ZIP := skills.zip

.PHONY: package-skills
package-skills: sync-skill-templates
	@rm -f $(SKILLS_ZIP)
	@cd $(SKILLS_SRC) && zip -r ../../$(SKILLS_ZIP) $(notdir $(SKILL_DIRS))
	@echo "Packaged $(words $(SKILL_DIRS)) skill(s) into $(SKILLS_ZIP)"

.PHONY: uninstall-skills
uninstall-skills:
	@for dir in $(SKILL_DIRS); do \
		name=$$(basename "$$dir"); \
		if [ -d "$(SKILLS_HOME)/$$name" ]; then \
			rm -rf "$(SKILLS_HOME)/$$name"; \
			echo "Removed $(SKILLS_HOME)/$$name/"; \
		fi; \
	done
