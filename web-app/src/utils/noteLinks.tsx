import { Link } from 'react-router-dom';

// Parse [[note-title]] syntax and convert to clickable links
export const renderContentWithLinks = (content: string, allNotes?: Array<{id: string, title: string}>) => {
  if (!content) return null;

  // Split by [[...]] pattern
  const parts = content.split(/(\[\[.+?\]\])/g);
  
  return parts.map((part, index) => {
    // Check if this part is a link
    const linkMatch = part.match(/^\[\[(.+?)\]\]$/);
    
    if (linkMatch) {
      const linkTitle = linkMatch[1];
      
      // Try to find the note
      const linkedNote = allNotes?.find(n => 
        n.title.toLowerCase() === linkTitle.toLowerCase()
      );
      
      if (linkedNote) {
        return (
          <Link
            key={index}
            to={`/notes/${linkedNote.id}`}
            className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium"
          >
            {linkTitle}
          </Link>
        );
      } else {
        // Note doesn't exist yet, show as plain text with different style
        return (
          <span
            key={index}
            className="text-gray-500 dark:text-gray-400 italic"
            title="Note not found"
          >
            [[{linkTitle}]]
          </span>
        );
      }
    }
    
    // Regular text - preserve whitespace
    return <span key={index}>{part}</span>;
  });
};
