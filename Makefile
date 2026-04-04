ISSUE_TEMPLATE_SRC := .github/ISSUE_TEMPLATE
SKILL_TEMPLATES_DST := .claude/skills/0k-create-issue/templates

TEMPLATE_FILES := $(wildcard $(ISSUE_TEMPLATE_SRC)/[0-9]*.yml)

.PHONY: sync-skill-templates
sync-skill-templates:
	@mkdir -p $(SKILL_TEMPLATES_DST)
	@rm -f $(SKILL_TEMPLATES_DST)/*.yml
	@cp $(TEMPLATE_FILES) $(SKILL_TEMPLATES_DST)/
	@echo "Synced $(words $(TEMPLATE_FILES)) templates to $(SKILL_TEMPLATES_DST)/"
