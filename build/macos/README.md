# macOS build

```sh
npm install
npm run pack:mac          # creates out/CEsim Studio-darwin-arm64/CEsim Studio.app
```

On a Mac, sign it ad-hoc and make a disk image:

```sh
codesign --force --deep -s - "out/CEsim Studio-darwin-arm64/CEsim Studio.app"
hdiutil create -volname "CEsim Studio" -srcfolder "out/CEsim Studio-darwin-arm64" -ov -format UDZO dist/CEsim-Studio-arm64.dmg
```
