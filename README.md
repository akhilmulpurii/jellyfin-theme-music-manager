# Jellyfin Theme Manager

A modern Next.js web application for managing theme songs and backdrop videos for your Jellyfin media library. This tool helps you automatically detect missing theme files and download them from YouTube using yt-dlp, with optional video processing via FFmpeg.

## Features

- 🎵 **Theme Audio Management**: Download and organize theme songs (MP3) for movies and TV shows
- 🎬 **Theme Video Management**: Download and organize backdrop videos (MP4) with automatic folder creation
- 🔍 **Smart Detection**: Scan your media directories to identify missing theme files
- 📋 **Queue System**: Batch download multiple items with progress tracking
- 🍪 **Authentication Support**: Multiple methods for handling YouTube cookies (file upload, paste, browser extraction)
- ✂️ **Video Processing**: Optional FFmpeg integration to remove black bars from videos
- 📊 **Live Logging**: Real-time console output during downloads with Server-Sent Events
- 🎨 **Modern UI**: Built with shadcn/ui components for a polished, responsive experience
- 💾 **Local-Only**: All data is stored locally - nothing is saved to external servers

## Prerequisites

### Required Dependencies

1. **Node.js** (v18 or higher)
2. **yt-dlp** - Must be installed and available in your system PATH
3. **FFmpeg** (optional, for video processing) - Must be installed and available in your system PATH

### Installation Commands

#### macOS (using Homebrew)
```bash
brew install yt-dlp ffmpeg
```

#### Windows (using Chocolatey)
```bash
choco install yt-dlp ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install yt-dlp ffmpeg
```

#### Manual Installation
- **yt-dlp**: Download from [GitHub releases](https://github.com/yt-dlp/yt-dlp/releases)
- **FFmpeg**: Download from [official website](https://ffmpeg.org/download.html)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jellyfin-theme-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Path to your yt-dlp binary (if not in PATH)
   YTDLP_PATH=/usr/local/bin/yt-dlp
   
   # Optional: Default cookies file location
   YTDLP_COOKIES_FILE=/path/to/cookies.txt
   
   # Optional: Default browser for cookie extraction
   YTDLP_BROWSER=chrome
   
   # Data directory for storing configuration
   DATA_DIR=./data
   ```

4. **Create data directory**
   ```bash
   mkdir -p data
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Initial Setup

On first launch, you'll need to configure your media library paths:

- Add absolute paths to your Movies and TV Shows directories
- Specify whether each path contains Movies or Series content
- Click "Save & Continue" to proceed

### 2. Media Scanning

The application automatically scans your configured directories and displays:
- Movie/TV show titles
- Current theme audio status (format and file existence)
- Current theme video status (format and file existence)
- Visual indicators for missing files

### 3. Filtering

Use the filter dropdown to focus on specific items:
- **All items**: Show everything
- **Missing audio or video**: Items that need at least one theme file
- **Missing theme audio**: Items without theme songs
- **Missing theme video**: Items without backdrop videos

### 4. Download Queue

1. **Add URLs**: For each item, paste YouTube URLs in the input fields
2. **Queue Items**: Click "Queue Audio" or "Queue Video" to add to the download queue
3. **Configure Options**:
   - Enable "Remove black bars" to automatically crop videos using FFmpeg
   - Set up authentication if needed (see Authentication section)
4. **Execute Queue**: Click "Execute Queue" to start downloading

### 5. Authentication (Optional)

For YouTube videos that require authentication, configure cookies using one of these methods:

- **None**: No authentication (public videos only)
- **Absolute Path**: Path to a cookies.txt file
- **Upload File**: Upload a cookies.txt file through the interface
- **Paste Contents**: Paste cookies content directly (Netscape format)
- **From Browser**: Extract cookies from your browser (Chrome, Firefox, Safari, etc.)

### 6. Live Monitoring

During queue execution, a console overlay shows:
- Real-time download progress
- yt-dlp and FFmpeg output
- Error messages and success indicators
- Current item being processed

## File Organization

The application organizes theme files following Jellyfin conventions:

### Movies
```
/Movie Name (Year)/
├── theme.mp3           # Theme audio
└── backdrops/
    └── theme.mp4       # Theme video
```

### TV Shows
```
/TV Show Name (Year)/
├── theme.mp3           # Theme audio
└── backdrops/
    └── theme.mp4       # Theme video
```

## Data Storage

**Important**: This application is entirely local. All data is stored on your local machine:

- **Configuration**: Media paths and settings are saved in the `DATA_DIR` (default: `./data`)
- **No Cloud Storage**: Nothing is uploaded to external servers
- **No Telemetry**: No usage data is collected or transmitted
- **Local Processing**: All file operations and downloads happen on your machine

## Advanced Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `YTDLP_PATH` | Path to yt-dlp binary | `yt-dlp` (from PATH) | No |
| `YTDLP_COOKIES_FILE` | Default cookies file path | None | No |
| `YTDLP_BROWSER` | Default browser for cookies | `chrome` | No |
| `DATA_DIR` | Configuration storage directory | `./data` | No |

### Video Processing

When "Remove black bars" is enabled:
1. Video is downloaded normally
2. FFmpeg runs `cropdetect` for 4 seconds to analyze black bars
3. Video is re-encoded with automatic cropping
4. Original video is replaced with cropped version

## Troubleshooting

### Common Issues

1. **yt-dlp not found**
   - Ensure yt-dlp is installed and in your PATH
   - Or set `YTDLP_PATH` environment variable to the binary location

2. **FFmpeg not found**
   - Install FFmpeg or disable video cropping option
   - Ensure FFmpeg is in your PATH if using video processing

3. **Permission denied errors**
   - Check that the application has write permissions to your media directories
   - Ensure the data directory is writable

4. **YouTube download failures**
   - Configure cookies for authentication
   - Try different cookies methods (file upload vs browser extraction)
   - Check if the video is region-restricted

### Logs and Debugging

- Check the browser console for JavaScript errors
- Monitor the live console overlay during downloads for detailed yt-dlp output
- Review the `DATA_DIR` configuration files for path issues

## Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── download/      # Download and streaming APIs
│   │   ├── media/         # Media scanning APIs
│   │   ├── setup/         # Path configuration APIs
│   │   └── cookies/       # Cookie handling APIs
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── dashboard/         # Main dashboard UI
│   ├── setup/             # Configuration forms
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and API helpers
└── types/                 # TypeScript type definitions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.
