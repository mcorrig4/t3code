## Summary

- use 16px composer text on mobile to avoid iPhone focus zoom
- keep the existing 14px composer sizing from sm and up
- update the placeholder sizing to match the editor

## Testing

- ~/.bun/bin/bun fmt
- ~/.bun/bin/bun lint
- export PATH="$HOME/.bun/bin:$PATH" && bun typecheck
