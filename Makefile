.PHONY: build serve clean

build:
	node build.mjs

serve: build
	cd dist && python3 -m http.server 8347

clean:
	rm -rf dist
