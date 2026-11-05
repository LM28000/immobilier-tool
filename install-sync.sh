#!/bin/bash
# Installe une tâche macOS qui lance sync.sh toutes les heures et quand index.html change.
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.lm28000.immobilier-sync.plist"
chmod +x "$DIR/sync.sh"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.lm28000.immobilier-sync</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$DIR/sync.sh</string></array>
  <key>WatchPaths</key><array><string>$DIR/index.html</string></array>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>$DIR/sync.log</string>
  <key>StandardErrorPath</key><string>$DIR/sync.log</string>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null; launchctl load "$PLIST" && echo "Synchronisation installée. Journal : $DIR/sync.log"
