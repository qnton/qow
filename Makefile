.PHONY: all build check clean update publish

# Default architecture is to just run and builds
all: check build

# Clean the generated dist folder
clean:
	rm -rf dist

# Lint the codebase
check:
	pnpm run check

# Build the TS into the 'dist' outputs
build: clean update
	pnpm run build

# Build, check, and publish the package to NPM
publish: build
	npm publish --access public
