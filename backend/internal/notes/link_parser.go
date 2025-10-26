package notes

import (
"regexp"
)

// ExtractNoteLinks extracts all [[note-title]] links from markdown content
func ExtractNoteLinks(content string) []string {
// Regex to match [[note-title]] or [[note title]]
re := regexp.MustCompile(`\[\[([^\]]+)\]\]`)
matches := re.FindAllStringSubmatch(content, -1)

links := make([]string, 0, len(matches))
seen := make(map[string]bool)

for _, match := range matches {
if len(match) > 1 {
title := match[1]
// Avoid duplicates
if !seen[title] {
links = append(links, title)
seen[title] = true
}
}
}

return links
}
