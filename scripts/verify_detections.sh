#!/bin/bash
echo "🔍 Verifying Cross-File Detections in Docker Logs..."
echo "---------------------------------------------------"

# Get unique cross-file findings
FINDINGS=$(docker logs securetag-worker --since 20m | grep "analyzeFinding called for cross-file-" | sort | uniq)

if [ -z "$FINDINGS" ]; then
    echo "❌ No cross-file vulnerabilities detected in the last 20 minutes."
    exit 1
fi

echo "✅ Detected Cross-File Vulnerability Categories:"
echo "$FINDINGS" | sed 's/DEBUG: analyzeFinding called for cross-file-//g'

COUNT=$(echo "$FINDINGS" | wc -l)
echo "---------------------------------------------------"
echo "📊 Total Unique Categories Detected: $COUNT"

if [ $COUNT -ge 16 ]; then
    echo "🎉 SUCCESS: High coverage of vulnerability vectors verified!"
else
    echo "⚠️ WARNING: Some vectors might be missing (Expected ~18, Found $COUNT)"
fi
