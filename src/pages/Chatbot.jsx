import React, { useMemo, useState } from 'react';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Chatbot.css';

const starterMessages = {
  en: 'Hi! I am TN Smart Bus Assistant. Ask me about routes, bookings, tickets, cancellations, or travel tips.',
  ta: 'வணக்கம்! நான் TN Smart Bus உதவியாளர். பாதைகள், முன்பதிவுகள், டிக்கெட், ரத்து அல்லது பயண குறிப்புகள் பற்றி கேளுங்கள்.',
};

export const Chatbot = () => {
  const { language } = useLanguage();
  const [messages, setMessages] = useState(() => ([
    { role: 'assistant', content: starterMessages[language] || starterMessages.en },
  ]));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const text = useMemo(() => (
    language === 'ta'
      ? {
          title: 'AI பஸ் உதவியாளர்',
          subtitle: 'ChatGPT இயக்கும் உடனடி உதவி',
          placeholder: 'உங்கள் கேள்வியை உள்ளிடவும்...',
          send: 'அனுப்பு',
          typing: 'உதவியாளர் பதிலளிக்கிறார்...',
        }
      : {
          title: 'AI Bus Assistant',
          subtitle: 'Instant help powered by ChatGPT',
          placeholder: 'Type your question...',
          send: 'Send',
          typing: 'Assistant is replying...',
        }
  ), [language]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMsg = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages.map((m) => ({ role: m.role, content: m.content }));
      const result = await api.getChatbotReply(trimmed, history);
      const botReply = String(result?.reply || '').trim() || 'Sorry, I could not respond right now.';
      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('Chatbot request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: language === 'ta'
            ? 'இப்போது பதில் பெற முடியவில்லை. சில நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.'
            : 'Unable to get response now. Please try again shortly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await sendMessage();
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-shell">
        <div className="chatbot-header">
          <div className="chatbot-title-wrap">
            <MessageCircle className="chatbot-title-icon" />
            <div>
              <h2>{text.title}</h2>
              <p>{text.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={`chat-row ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-row assistant">
              <div className="chat-avatar"><Bot size={16} /></div>
              <div className="chat-bubble typing"><Loader2 size={14} className="spin" /> {text.typing}</div>
            </div>
          )}
        </div>

        <form className="chatbot-input-bar" onSubmit={onSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={text.placeholder}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <Send size={16} /> {text.send}
          </button>
        </form>
      </div>
    </div>
  );
};
