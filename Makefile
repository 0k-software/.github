GIT_HOOKS_SRC := .git-hooks
GIT_DIR := $(shell git rev-parse --git-dir 2>/dev/null || echo .git)
GIT_HOOKS_DST := $(GIT_DIR)/hooks

HOOK_FILES := $(wildcard $(GIT_HOOKS_SRC)/*)

.PHONY: all
all: setup

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
