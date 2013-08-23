all: modularize-script minify-script

include ../../build/modules.mk

MODULE = popbox
MODULARIZE_OPTIONS = -d "ui/position"