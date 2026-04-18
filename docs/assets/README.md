# Brand assets

Source files and rendered exports for the project's README hero and GitHub social preview.

| File                                       | Purpose                                                   | Dimensions       |
| ------------------------------------------ | --------------------------------------------------------- | ---------------- |
| [`banner.svg`](banner.svg)                 | README hero banner source                                 | 1280×640         |
| [`banner.png`](banner.png)                 | Rendered banner — used as the README hero image           | 1280×640         |
| [`social-preview.png`](social-preview.png) | Upload to GitHub → Settings → Social preview              | 1280×640         |
| [`logo-512.svg`](logo-512.svg)             | Square logo source (wraps `logo.png` at 512×512)          | 512×512          |
| [`logo-512.png`](logo-512.png)             | Rendered 512×512 logo — use for avatars, favicons, slides | 512×512          |
| [`logo.png`](logo.png)                     | ComplianceGenie genie-lamp master mark                    | 600×600 (source) |

## Re-rendering

Assets are rendered from SVG source via [`rsvg-convert`](https://gitlab.gnome.org/GNOME/librsvg) (ships with Homebrew's `librsvg`):

```bash
cd docs/assets
rsvg-convert -w 1280 -h 640 banner.svg       -o banner.png
rsvg-convert -w 1280 -h 640 banner.svg       -o social-preview.png
rsvg-convert -w  512 -h  512 logo-512.svg    -o logo-512.png
```

If you change `banner.svg`, re-render both `banner.png` **and** `social-preview.png` so the README hero and social card stay in sync.

## Remote URLs (for npm / external renders)

The README uses absolute `raw.githubusercontent.com` URLs so images render on the npm package page — npm's CDN can't resolve relative paths into a GitHub repo. The canonical URL pattern is:

```
https://raw.githubusercontent.com/MarkAC007/mcp-server-scf/main/docs/assets/<filename>
```

## Uploading the social preview (one-time, manual)

1. Repo → **Settings** → **General** → scroll to **Social preview**
2. Click **Edit** → upload `social-preview.png`
3. Verify at https://cards-dev.twitter.com/validator (paste the repo URL)
