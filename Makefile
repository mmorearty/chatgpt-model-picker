# Zip up the extension for submission
package:
	rm -f chatgpt-model-picker.zip
	zip -r chatgpt-model-picker.zip content.js manifest.json icons/icon*.png
