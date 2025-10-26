package notes

import (
	"strings"
)

// GenerateContentDiff creates a line-by-line diff between two content strings
func GenerateContentDiff(oldContent, newContent string) []DiffLine {
	oldLines := strings.Split(oldContent, "\n")
	newLines := strings.Split(newContent, "\n")

	// Simple line-by-line diff algorithm
	// For production, consider using a proper diff library like github.com/sergi/go-diff
	var diff []DiffLine
	lineNum := 1

	maxLen := len(oldLines)
	if len(newLines) > maxLen {
		maxLen = len(newLines)
	}

	for i := 0; i < maxLen; i++ {
		var oldLine, newLine string

		if i < len(oldLines) {
			oldLine = oldLines[i]
		}
		if i < len(newLines) {
			newLine = newLines[i]
		}

		if oldLine == newLine {
			// Unchanged line
			diff = append(diff, DiffLine{
				Type:    "unchanged",
				Content: oldLine,
				LineNum: lineNum,
			})
			lineNum++
		} else {
			// Lines differ
			if oldLine != "" && i < len(oldLines) {
				diff = append(diff, DiffLine{
					Type:    "removed",
					Content: oldLine,
					LineNum: lineNum,
				})
			}
			if newLine != "" && i < len(newLines) {
				diff = append(diff, DiffLine{
					Type:    "added",
					Content: newLine,
					LineNum: lineNum,
				})
				lineNum++
			}
		}
	}

	return diff
}

// CalculateTagDiff returns added and removed tags
func CalculateTagDiff(oldTags, newTags []string) (added, removed []string) {
	// Initialize empty slices instead of nil
	added = []string{}
	removed = []string{}
	
	oldSet := make(map[string]bool)
	newSet := make(map[string]bool)

	for _, tag := range oldTags {
		oldSet[tag] = true
	}
	for _, tag := range newTags {
		newSet[tag] = true
	}

	// Find added tags (in new but not in old)
	for tag := range newSet {
		if !oldSet[tag] {
			added = append(added, tag)
		}
	}

	// Find removed tags (in old but not in new)
	for tag := range oldSet {
		if !newSet[tag] {
			removed = append(removed, tag)
		}
	}

	return added, removed
}
