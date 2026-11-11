# Local Course Player

A course player that runs entirely in your browser and plays courses stored **on your own computer**. Pick a folder of downloaded courses and watch the videos, read the documents and track your progress. Nothing is uploaded anywhere; files are read straight from your disk.

## Features

- **Dashboard** with one card per course folder, plus search
- **Course screen** with a collapsible section list on the right and the player in the main area
- **Video player** with automatic subtitles (`.vtt` / `.srt`) and auto-play of the next lesson
- **Viewer** for PDF, Word (`.docx`), HTML, text/code, images and audio
- **Resources dropdown** under each lesson for its related files (PDF, zip, HTML, …)
- **Progress tracking**: checkboxes per lesson and a `done / total | duration` summary per section
- **Previous / Next** buttons and a back-to-dashboard button
- Light and dark mode, responsive layout

## Tech used

| Part | What |
| --- | --- |
| Markup | HTML5 |
| Styling | Plain CSS (custom properties, grid, flexbox, `prefers-color-scheme`) |
| Logic | Vanilla JavaScript (ES2020), no framework, no build step |
| Reading your folders | [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API) (`showDirectoryPicker`), with an `<input webkitdirectory>` fallback |
| Remembering the folder | IndexedDB |
| Remembering progress | `localStorage` |
| `.docx` preview | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) loaded from cdnjs |
| Font | Google Sans Flex from Google Fonts |

Internet is only needed for the font and the `.docx` preview library. Everything else works offline.

## Project structure

```
local-course-player/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── .gitignore
└── README.md
```

## Run it

1. Download or clone this repository.
2. Open `index.html` in **Chrome, Edge or Brave**.
3. Click **Choose folder** and select the folder that contains your courses.

If double-clicking doesn't work in your browser, serve it locally:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

You can also host it on **GitHub Pages**. Your course files still never leave your computer, because the browser reads them locally.

### Browser support

| Browser | Support |
| --- | --- |
| Chrome / Edge / Brave | Full. Remembers your folder between visits |
| Firefox / Safari | Works, but you must choose the folder each time |

Browsers refuse system folders such as `Documents` or `Downloads` themselves. Choose a folder inside them (for example `Documents/Courses`).

## Folder structure (important)

Your downloaded courses must follow this layout: **courses folder → course → section → files**, and sections and files should start with a **number** so they play in the right order.

```
Courses/                                  ← choose this folder
├── The Complete JavaScript Course/       ← one course (one card)
│   ├── 1. Welcome/                       ← Section 1
│   │   ├── 1. Welcome to the course.mp4
│   │   ├── 1. Welcome to the course.vtt  ← subtitles for lesson 1
│   │   ├── 1. Course outline.pdf         ← resource of lesson 1
│   │   └── 2. How to learn.mp4
│   ├── 2. JavaScript Fundamentals/       ← Section 2
│   │   ├── 011 Variables.mp4
│   │   ├── 011 Variables.vtt
│   │   ├── 012 CHALLENGE #1.html         ← no video 12, so it becomes lesson 12
│   │   ├── 013 Solution.mp4
│   │   └── 013 Starter files.zip         ← resource of lesson 13
│   └── 3. Wrap Up/
│       └── ...
└── Another Course/
    └── ...
```

### Numbering rules

- **Sections** and **files** are sorted by the number at the start of their name (`1`, `2`, … `10`), then by name. `2.` comes before `10.`, and the order doesn't depend on how the files were downloaded.
- Any of these formats work, and they are displayed as `5. Title`:
  `1. Title`, `1 - Title`, `005 Title`, `[005] Title`, `(5) Title`, `Section 5 - Title`
- A section without a number is placed after the numbered ones.

### How files are matched

| File | What happens |
| --- | --- |
| **Video** (`mp4`, `webm`, `mkv`, `mov`, `m4v`, `avi`, `ogv`) | Becomes a lesson |
| **Subtitles** (`vtt`, `srt`) | Attached to the video with the same name or the same number. Never listed |
| **Any other file** with the **same number** as a video | Goes into that lesson's **Resources** dropdown |
| **Viewable file** (HTML, PDF, …) with a number but **no video of that number** | Becomes its own lesson in the list, in order |
| Un-numbered file or zip with no matching lesson | Goes into the Resources of the nearest earlier lesson |
| A section with **no videos** | Every file becomes a lesson |
| Files **directly inside the course folder** | Shown in an "Introduction" section |
| Nested folders inside a section | Flattened into that section |
| Hidden files (starting with `.`) | Ignored |

File extensions are never shown, only an icon for the file type.

### What can be viewed in the page

| Type | Behaviour |
| --- | --- |
| Video / audio | Plays in the player |
| PDF | Built-in browser PDF viewer |
| HTML | Shown on a white background with margins, using the app font. Scripts run; files it links to in other folders can't load |
| `.docx` | Converted to a readable page |
| Text and code (`txt`, `md`, `json`, `js`, `py`, …) | Shown as text |
| Images | Shown in the player |
| Zip and other files | Downloaded when clicked |

## Progress

Ticked lessons are saved in your browser's `localStorage`, per course. Opening a course jumps to the first lesson you haven't finished. Clearing browser data resets progress.

## Troubleshooting

- **A video doesn't play.** Browsers support `mp4` (H.264/AAC) and `webm` best. Convert `mkv` or `avi` files to `mp4`.
- **"Could not open that folder".** You selected a protected system folder. Pick a subfolder.
- **Sections look out of order.** Check that every section and file name starts with a number.
- **An HTML lesson is blank.** It probably depends on images, CSS or scripts stored in other files, which the browser can't load from a local page.
- **The font looks different.** Google Sans Flex needs internet to load; the page falls back to a system font offline.

## Notes

- Use only with courses and files you are allowed to use.
- This project is not affiliated with any course provider.
- A part of this site is vibe coded
