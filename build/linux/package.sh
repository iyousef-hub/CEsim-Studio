#!/bin/sh
# Builds dist/*.deb and dist/*.AppImage from out/CEsim Studio-linux-x64 (run `npm run pack:linux` first).
# Needs: dpkg-deb, and appimagetool (https://github.com/AppImage/appimagetool) on PATH.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
VER=$(node -p "require('./app/package.json').version"); SRC="out/CEsim Studio-linux-x64"; mkdir -p dist
P="dist/deb/cesim-studio_${VER}_amd64"; rm -rf dist/deb
mkdir -p "$P/DEBIAN" "$P/opt/cesim-studio" "$P/usr/bin" "$P/usr/share/applications" "$P/usr/share/mime/packages" "$P/usr/share/icons/hicolor/512x512/apps"
cp -a "$SRC/." "$P/opt/cesim-studio/"; ln -s /opt/cesim-studio/cesim-studio "$P/usr/bin/cesim-studio"
cp assets/icon.png "$P/usr/share/icons/hicolor/512x512/apps/cesim-studio.png"
cp build/linux/cesim-studio.desktop "$P/usr/share/applications/"; cp build/linux/cesim-studio-mime.xml "$P/usr/share/mime/packages/cesim-studio.xml"
sed "s/@VER@/$VER/; s/@SIZE@/$(du -sk "$P/opt" | cut -f1)/" build/linux/control > "$P/DEBIAN/control"
cp build/linux/postinst "$P/DEBIAN/postinst"; cp build/linux/postrm "$P/DEBIAN/postrm"; chmod 755 "$P/DEBIAN/postinst" "$P/DEBIAN/postrm"
dpkg-deb --root-owner-group --build -Zxz "$P" "dist/CEsim-Studio-${VER}-Linux-amd64.deb"; rm -rf dist/deb
A=dist/AppDir; rm -rf "$A"; mkdir -p "$A/usr/lib/cesim-studio"; cp -a "$SRC/." "$A/usr/lib/cesim-studio/"
cp assets/icon.png "$A/cesim-studio.png"; ln -s cesim-studio.png "$A/.DirIcon"
sed -e 's#^Exec=.*#Exec=cesim-studio %F#' -e '/^MimeType/d' build/linux/cesim-studio.desktop > "$A/cesim-studio.desktop"
printf '#!/bin/sh\nHERE="$(dirname "$(readlink -f "$0")")"\nexec "$HERE/usr/lib/cesim-studio/cesim-studio" --no-sandbox "$@"\n' > "$A/AppRun"; chmod +x "$A/AppRun"
ARCH=x86_64 appimagetool "$A" "dist/CEsim-Studio-${VER}-Linux-x86_64.AppImage"; rm -rf "$A"
echo "Done: dist/"
