PLUGIN_ID := com.github.mattermost-channel-reply
PLUGIN_VERSION := 1.2.0
BUNDLE_NAME := $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz

.PHONY: all hooks webapp bundle dist clean

all: dist

hooks:
	cd webapp && npm run hooks:install

webapp:
	cd webapp && npm ci
	cd webapp && npm test
	cd webapp && npm run typecheck
	cd webapp && npm run build

bundle:
	rm -rf dist/$(PLUGIN_ID)
	mkdir -p dist/$(PLUGIN_ID)/webapp/dist
	cp plugin.json dist/$(PLUGIN_ID)/
	cp -r webapp/dist dist/$(PLUGIN_ID)/webapp/
	cd dist && tar -czf $(BUNDLE_NAME) $(PLUGIN_ID)
	@echo "Plugin bundle: dist/$(BUNDLE_NAME)"

dist: webapp bundle

clean:
	rm -rf dist webapp/dist webapp/node_modules
