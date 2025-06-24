# Wigle Files Listing Endpoint

## Overview
Added endpoint to list available Wigle CSV files for the Kismet Operations Center.

## Endpoint Details

### GET /list_wigle_files

Lists all `.wiglecsv` files in the specified directory.

**Query Parameters:**
- `directory` (optional) - Directory path to search for Wigle CSV files
  - Default: `/home/pi/kismet_ops`

**Response Format:**
```json
{
  "files": ["file1.wiglecsv", "file2.wiglecsv"],
  "directory": "/home/pi/kismet_ops",
  "count": 2
}
```

**Error Response:**
```json
{
  "error": "Directory not found",
  "directory": "/path/to/directory"
}
```

**Status Codes:**
- 200 - Success
- 404 - Directory not found
- 500 - Server error

## Usage Examples

### Default directory:
```bash
curl http://localhost:8002/list_wigle_files
```

### Custom directory:
```bash
curl "http://localhost:8002/list_wigle_files?directory=/tmp/kismet"
```

## Implementation Notes
- Files are sorted in reverse alphabetical order (newest first)
- Only files with `.wiglecsv` extension are returned
- Directory existence is checked before listing