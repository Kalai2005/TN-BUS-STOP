import React, { useMemo, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, User, X } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ChatbotWidget.css';

export const ChatbotWidget = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => ([
    {
      role: 'assistant',
      content: language === 'ta'
        ? 'வணக்கம்! நான் TN Smart Bus உதவியாளர். பயணம், முன்பதிவு, டிக்கெட், ரத்து குறித்து கேளுங்கள்.'
        : 'Hi! I am TN Smart Bus Assistant. Ask me about booking, tickets, cancellations, routes, and travel tips.',
    },
  ]));

  const t = useMemo(() => (
    language === 'ta'
      ? {
          title: 'AI உதவியாளர்',
          subtitle: 'ChatGPT மூலம் இயக்கப்படுகிறது',
          placeholder: 'கேள்வியை உள்ளிடவும்...',
          send: 'அனுப்பு',
          typing: 'பதில் வருகிறது...',
          open: 'AI உதவியாளரை திறக்கவும்',
          close: 'AI உதவியாளரை மூடவும்',
          fallback: 'இப்போது பதில் கிடைக்கவில்லை. பிறகு மீண்டும் முயற்சிக்கவும்.',
        }
      : {
          title: 'AI Assistant',
          subtitle: 'Powered by ChatGPT',
          placeholder: 'Ask a question...',
          send: 'Send',
          typing: 'Typing...',
          open: 'Open AI assistant',
          close: 'Close AI assistant',
          fallback: 'Unable to reply now. Please try again shortly.',
        }
  ), [language]);

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt || loading) {
      return;
    }

    const userMessage = { role: 'user', content: prompt };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const history = next.map((item) => ({ role: item.role, content: item.content }));
      const response = await api.getChatbotReply(prompt, history);
      const reply = String(response?.reply || '').trim() || t.fallback;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('Chatbot widget error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: t.fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await sendMessage();
  };

  return (
    <>
      {isOpen && (
        <div className="chat-widget-panel" role="dialog" aria-label={t.title}>
          <div className="chat-widget-header">
            <div className="chat-widget-title-wrap">
              <MessageCircle size={18} />
              <div>
                <h3>{t.title}</h3>
                <p>{t.subtitle}</p>
              </div>
            </div>
            <button type="button" className="chat-widget-close" onClick={() => setIsOpen(false)} aria-label={t.close}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-widget-row ${message.role}`}>
                <span className="chat-widget-avatar">
                  {message.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </span>
                <div className="chat-widget-bubble">{message.content}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-widget-row assistant">
                <span className="chat-widget-avatar"><Bot size={14} /></span>
                <div className="chat-widget-bubble chat-widget-typing">
                  <Loader2 size={13} className="chat-widget-spin" /> {t.typing}
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget-input" onSubmit={onSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t.placeholder}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={14} /> {t.send}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-widget-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? t.close : t.open}
        title={isOpen ? t.close : t.open}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
};
