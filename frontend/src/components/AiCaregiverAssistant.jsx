import { useState, useRef, useEffect, useCallback } from "react";
import API from "../services/api";
import "./AiCaregiverAssistant.css";

const SUGGESTED_QUESTIONS = [
  "Summarize my parent's health",
  "What health measurements are missing?",
  "What medicines are scheduled today?",
  "Show me the recent health records",
  "What should I discuss with the doctor?"
];

export default function AiCaregiverAssistant({ parent }) {
  const [prevParentId, setPrevParentId] = useState(parent?._id);
  const [messages, setMessages] = useState(() => {
    if (!parent?._id) return [];
    return [
      {
        id: `welcome-${parent._id}`,
        sender: "assistant",
        text: `Hello! I am your AI Caregiver Assistant for **${parent.name || "your parent"}**.\n\nYou can ask me about recent vital trends, medicine schedules, data gaps, or questions for your next doctor visit.`,
        timestamp: "Just now",
        mode: "development"
      }
    ];
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const inFlightParentRef = useRef(parent?._id);
  const messagesEndRef = useRef(null);

  // Reset state during render when switching parents (idiomatic React pattern)
  if (parent?._id !== prevParentId) {
    setPrevParentId(parent?._id);
    setIsLoading(false);
    setInputValue("");
    setLastFailedMessage(null);
    setErrorMessage("");
    setMessages(
      parent?._id
        ? [
            {
              id: `welcome-${parent._id}`,
              sender: "assistant",
              text: `Hello! I am your AI Caregiver Assistant for **${parent.name || "your parent"}**.\n\nYou can ask me about recent vital trends, medicine schedules, data gaps, or questions for your next doctor visit.`,
              timestamp: "Just now",
              mode: "development"
            }
          ]
        : []
    );
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (textToSend) => {
      const query = (textToSend || inputValue).trim();
      if (!query || !parent?._id || isLoading) return;

      const currentParentId = parent._id;
      inFlightParentRef.current = currentParentId;

      const userMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);
      setErrorMessage("");
      setLastFailedMessage(null);

      // Build conversation history for context
      const conversationHistory = messages
        .filter((m) => !m.isError)
        .slice(-6)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }));

      try {
        const response = await API.post(`/ai/assistant/${currentParentId}/chat`, {
          message: query,
          conversationHistory
        });

        // Ensure parent has not switched during request
        if (inFlightParentRef.current !== currentParentId) return;

        const data = response.data;
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mode: data.mode || "development",
          provider: data.provider,
          missingMetrics: data.missingMetrics || [],
          isEmergency: data.isEmergency || false,
          disclaimer: data.disclaimer
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (inFlightParentRef.current !== currentParentId) return;

        const status = err.response?.status;
        const apiMsg = err.response?.data?.message || err.message;
        let displayError = "An error occurred while contacting the assistant. Please try again.";

        if (status === 401) {
          displayError = "Your caregiver session has expired. Please log in again.";
        } else if (status === 403) {
          displayError = "You are not authorized to access records for this parent.";
        } else if (status === 503 || status === 502) {
          displayError = apiMsg || "AI Assistant service is temporarily unavailable. Please retry.";
        }

        setErrorMessage(displayError);
        setLastFailedMessage(query);

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "assistant",
            isError: true,
            text: displayError,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } finally {
        if (inFlightParentRef.current === currentParentId) {
          setIsLoading(false);
        }
      }
    },
    [inputValue, isLoading, messages, parent]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = () => {
    if (!parent?._id) return;
    setMessages([
      {
        id: `welcome-${parent._id}-${Date.now()}`,
        sender: "assistant",
        text: `Conversation cleared. How can I help you care for **${parent.name}** today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: "development"
      }
    ]);
    setErrorMessage("");
    setLastFailedMessage(null);
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  if (!parent) {
    return (
      <div className="assistant-card empty-assistant">
        <p>Select a parent to open the AI Caregiver Assistant.</p>
      </div>
    );
  }

  return (
    <section className="assistant-card" aria-label="AI Caregiver Assistant">
      {/* Header */}
      <header className="assistant-header">
        <div className="assistant-title-group">
          <div className="assistant-avatar" aria-hidden="true">
            AI
          </div>
          <div>
            <div className="assistant-name-row">
              <h3>AI Caregiver Assistant</h3>
              <span className="assistant-dev-badge" title="Grounded in actual database records (Simulation mode)">
                Development Mode
              </span>
            </div>
            <small className="assistant-subtitle">
              Active Context: <strong>{parent.name}</strong> ({parent.uniqueCode || "Patient"})
            </small>
          </div>
        </div>

        <div className="assistant-header-actions">
          <button
            type="button"
            className="assistant-btn-clear"
            onClick={handleClearConversation}
            title="Clear current conversation"
            disabled={isLoading}
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      <div className="assistant-mode-notice">
        <span>ℹ️</span>
        <div>
          <strong>Development Mode Active:</strong> Answers are grounded strictly in {parent.name}&apos;s verified database
          records (measurements, medicines, appointments). No artificial vitals are fabricated.
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="assistant-suggested-prompts">
        <span className="prompts-label">Quick Inquiries:</span>
        <div className="prompts-list">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className="prompt-chip"
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="assistant-chat-window" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`assistant-msg-bubble ${
              msg.sender === "user" ? "msg-user" : msg.isError ? "msg-error" : "msg-assistant"
            } ${msg.isEmergency ? "msg-emergency" : ""}`}
          >
            <div className="msg-header">
              <span className="msg-author">
                {msg.sender === "user" ? "You (Caregiver)" : "Vatsalya Assistant"}
              </span>
              <span className="msg-time">{msg.timestamp}</span>
            </div>

            <div className="msg-content">
              {msg.text.split("\n\n").map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {msg.missingMetrics && msg.missingMetrics.length > 0 && (
              <div className="msg-missing-badge">
                <span>⚠️ Missing in records:</span> {msg.missingMetrics.join(", ")}
              </div>
            )}

            {msg.disclaimer && (
              <footer className="msg-disclaimer">
                {msg.disclaimer}
              </footer>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="assistant-msg-bubble msg-assistant msg-loading">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-text">Reviewing {parent.name}&apos;s health records...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error & Retry Banner */}
      {errorMessage && lastFailedMessage && (
        <div className="assistant-error-banner">
          <span>{errorMessage}</span>
          <button type="button" onClick={handleRetry} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* Input Bar */}
      <footer className="assistant-input-bar">
        <input
          type="text"
          className="assistant-input"
          placeholder={`Ask about ${parent.name}'s vitals, medicine schedule, or missing data...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={1000}
        />
        <button
          type="button"
          className="assistant-send-btn"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          title="Send message"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </footer>
    </section>
  );
}
