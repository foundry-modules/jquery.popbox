all: modularize-script minify-script create-style-folder copy-style copy-extra

include ../../build/modules.mk

MODULE = popbox
MODULARIZE_OPTIONS = -d "ui/position"

SOURCE_STYLE_FILE_PREFIX =
SOURCE_STYLE_FILE_SUFFIX = .less
CSS_FILE_SUFFIX_UNCOMPRESSED = .less

copy-extra:
	cp source/variables.less ${TARGET_STYLE_FOLDER}/.