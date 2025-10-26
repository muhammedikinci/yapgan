import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiService, Note, ChatMessage, Conversation } from "../services/api";

const NoteChat = () => {
  const { noteId } = useParams<{ noteId: string }>();

  const [note, setNote] = useState<Note | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteId) {
      initializeChat();
    }
  }, [noteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    if (!noteId) return;

    try {
      setLoading(true);

      // Load the note
      console.log("Loading note:", noteId);
      const noteData = await apiService.getNote(noteId);
      setNote(noteData);
      console.log("Note loaded:", noteData);

      // Try to get existing conversation for this note
      console.log("Fetching conversations...");
      const conversationsResponse = await apiService.listConversations(1, 100);
      console.log("Conversations response:", conversationsResponse);

      const existingConv = conversationsResponse.conversations.find(
        (c: Conversation) => c.note_id === noteId,
      );
      console.log("Existing conversation for this note:", existingConv);

      if (existingConv) {
        // Load existing conversation
        console.log("Loading existing conversation:", existingConv.id);
        const convData = await apiService.getConversation(existingConv.id);
        setConversation(convData.conversation);
        setMessages(convData.messages);
        console.log("Conversation loaded:", convData);
      } else {
        // Create new conversation for this note
        console.log("Creating new conversation for note:", noteId);
        const newConv = await apiService.createConversation(
          noteId,
          `Chat about: ${noteData.title}`,
        );
        setConversation(newConv);
        setMessages([]);
        console.log("New conversation created:", newConv);
      }

      setError(null);
    } catch (err: any) {
      console.error("Initialize chat error:", err);
      setError(err.message || "Failed to initialize chat");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    console.log("sendMessage called", {
      input: input.trim(),
      conversation,
      sending,
    });

    if (!input.trim() || !conversation || sending) {
      console.log("sendMessage blocked:", {
        hasInput: !!input.trim(),
        hasConversation: !!conversation,
        isSending: sending,
      });
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setSending(true);

    console.log("Sending message:", userMessage);

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: "temp-user",
      conversation_id: conversation.id,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await apiService.sendMessage(
        conversation.id,
        userMessage,
      );

      // Remove temp message and add real messages
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== "temp-user");
        return [
          ...withoutTemp,
          {
            id: `user-${Date.now()}`,
            conversation_id: conversation.id,
            role: "user" as const,
            content: userMessage,
            created_at: new Date().toISOString(),
          },
          {
            id: `assistant-${Date.now()}`,
            conversation_id: conversation.id,
            role: "assistant" as const,
            content: response.response,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (err: any) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== "temp-user"));

      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-black/60 dark:text-white/60">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  if (error && !note) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <Link to="/my/notes" className="text-primary hover:underline">
            ← Back to notes
          </Link>
        </div>
      </div>
    );
  }

  // Safety check - conversation should be loaded
  if (!conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 dark:text-yellow-400 mb-4">
            Conversation not initialized. Please refresh the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 mr-3"
          >
            Refresh
          </button>
          <Link to="/my/notes" className="text-primary hover:underline">
            ← Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            to="/my/dashboard"
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 hover:text-primary"
          >
            Yapgan
          </Link>
          <span className="text-gray-400">|</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Chat about:
            </span>
            <Link
              to={`/my/notes/${noteId}`}
              className="text-sm font-medium text-primary hover:underline max-w-md truncate"
            >
              {note?.title}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/my/notes/${noteId}`}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            ← Back to Note
          </Link>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Chat with AI about this note
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Ask questions about "{note?.title}". The AI will only answer
                questions related to this specific note.
              </p>
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> You have 20 AI messages per day in the
                  free plan.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <div
                  className={`prose prose-sm max-w-none ${
                    message.role === "user"
                      ? "prose-invert [&_*]:text-white [&_code]:text-white [&_pre]:bg-white/10"
                      : "dark:prose-invert"
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div
                  className={`text-xs mt-2 ${message.role === "user" ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Sending Indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-3 items-end"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this note..."
              disabled={sending}
              rows={3}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoteChat;
