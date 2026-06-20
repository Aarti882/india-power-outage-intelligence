import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Trash2, ShieldAlert, Sparkles, Terminal, Cpu, Paperclip, FileText, Image, X } from 'lucide-react';
import Papa from 'papaparse';

const AIAgent = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am the **India Power Outage Intelligence System AI Agent**. I can help you analyze energy requirements, power deficits, outage frequencies, anomalies, and machine learning predictions across 15 Indian states. \n\nWhat would you like to explore today?",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, type, data, preview }
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Quick suggestions list
  const suggestions = [
    { label: "Which state is most vulnerable?", query: "Which state in India is currently most vulnerable based on SEVI score?" },
    { label: "Peak demand season for Bihar?", query: "What is the peak demand season and worst month for outages in Bihar?" },
    { label: "Next month power deficit forecast", query: "Forecast the energy deficit percentage for next month across all states and list the ones with highest risk." },
    { label: "List recent anomalies in the grid", query: "Scan the historical grid records and show me recent extreme anomalies." }
  ];

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name;

    if (fileType.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFile({
          name: fileName,
          type: "image",
          data: event.target.result, // base64 data URL
          preview: event.target.result // for thumbnail
        });
      };
      reader.readAsDataURL(file);
    } else if (fileName.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        let summaryText = "";
        try {
          const parsed = Papa.parse(text, { header: true });
          const rows = parsed.data.slice(0, 15); // limit to 15 rows for prompt context
          if (rows.length > 0) {
            const headers = Object.keys(rows[0]);
            summaryText = `[Attached CSV data: "${fileName}"]\n\n` + 
              `| ${headers.join(" | ")} |\n` + 
              `| ${headers.map(() => "---").join(" | ")} |\n` + 
              rows.map(row => `| ${headers.map(h => row[h] || "").join(" | ")} |`).join("\n");
          } else {
            summaryText = `[Attached CSV: "${fileName}" (Empty File)]`;
          }
        } catch (err) {
          summaryText = `[Attached CSV: "${fileName}" (Error parsing: ${err.message})]`;
        }

        setAttachedFile({
          name: fileName,
          type: "csv",
          data: summaryText,
          preview: null
        });
      };
      reader.readAsText(file);
    } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFile({
          name: fileName,
          type: "pdf",
          data: `[Attached PDF File: "${fileName}"]`,
          preview: null
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert("Unsupported file type. Please upload images (PNG, JPG), CSV, or PDF files.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle prompt sending
  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() && !attachedFile) return;

    let finalQuery = query;
    let base64Image = null;

    if (attachedFile) {
      if (attachedFile.type === "image") {
        base64Image = attachedFile.data; // send base64 data to vision model
      } else {
        // For CSV/PDF append text data/summary directly to the prompt
        finalQuery = `${attachedFile.data}\n\nUser Question: ${query}`;
      }
    }

    // Add user message
    const userMsg = { 
      role: "user", 
      content: query,
      attachment: attachedFile ? { name: attachedFile.name, type: attachedFile.type } : null
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachedFile(null);
    setLoading(true);

    // Format chat history for backend (list of [role, content])
    const formattedHistory = messages.map(msg => [
      msg.role === "user" ? "human" : "ai",
      msg.content
    ]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: finalQuery,
          chat_history: formattedHistory,
          image_data: base64Image
        })
      });

      if (!response.ok) {
        throw new Error("Gemini Agent responded with an error.");
      }

      const resData = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: resData.output }]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { 
          role: "assistant", 
          content: `**Error communicating with Gemini Agent**: ${err.message}. Please check that the backend is running and the GEMINI_API_KEY is configured on the server.` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat history cleared. How else can I assist you with Indian grid data today?",
      }
    ]);
  };

  // Helper to render markdown paragraphs
  const renderMessageContent = (content) => {
    return content.split('\n\n').map((para, i) => {
      // Bold syntax helper
      let formattedText = para.split('**').map((chunk, idx) => {
        if (idx % 2 === 1) return <strong key={idx} className="text-orange-400 font-bold">{chunk}</strong>;
        return chunk;
      });

      // Simple list render helper
      if (para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split(/\n[-*]\s+/);
        return (
          <ul key={i} className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
            {items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item.replace(/^[-*]\s+/, '')}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={i} className="leading-relaxed text-slate-200 text-sm mb-3">
          {formattedText}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] border border-navy-700/40 rounded-2xl bg-navy-900/25 relative overflow-hidden">
      
      {/* Agent Header Banner */}
      <div className="p-4 border-b border-navy-700/40 bg-navy-900/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20 text-orange-500">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>LangChain Gemini Cog</span>
              <span className="text-[9px] font-extrabold bg-orange-500/15 border border-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                Active
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Equipped with 4 analytical database querying tools</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-navy-800/60 transition-colors"
          title="Clear Chat Logs"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isBot = msg.role === "assistant";
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 max-w-3xl ${isBot ? '' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isBot 
                    ? 'bg-gradient-to-tr from-orange-600 to-orange-400 text-white' 
                    : 'bg-navy-700 text-slate-200 border border-navy-600'
                }`}>
                  {isBot ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                  isBot 
                    ? 'bg-navy-800/40 border-navy-700/50 text-slate-200' 
                    : 'bg-orange-500/10 border-orange-500/20 text-white'
                }`}>
                  {msg.attachment && (
                    <div className="mb-2.5 flex items-center gap-1.5 bg-navy-950/60 border border-navy-700/40 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-slate-300 w-fit animate-fade-in">
                      {msg.attachment.type === "image" ? (
                        <Image className="h-3.5 w-3.5 text-orange-400" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-orange-400" />
                      )}
                      <span>{msg.attachment.name}</span>
                      <span className="text-[9px] font-extrabold uppercase bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded border border-orange-500/20">
                        {msg.attachment.type}
                      </span>
                    </div>
                  )}
                  {renderMessageContent(msg.content)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Spinner Bubble */}
        {loading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr from-orange-600 to-orange-400 text-white">
              <Bot className="h-5 w-5 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-navy-800/40 border border-navy-700/50 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold italic flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                <span>Agent executing database queries...</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      <div className="px-6 py-3 border-t border-navy-700/30 bg-navy-950/20">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
          <span>Recommended queries:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.query)}
              className="text-[10px] bg-navy-800/50 hover:bg-orange-500/10 hover:border-orange-500/35 hover:text-orange-400 text-slate-300 font-medium px-3 py-1.5 rounded-lg border border-navy-700/50 transition-all text-left cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Preview Panel */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 border-t border-navy-700/40 bg-navy-950/40 flex items-center justify-between gap-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0">
              {attachedFile.type === "image" ? (
                <div className="relative h-12 w-12 rounded-lg border border-navy-700 bg-navy-800 overflow-hidden shrink-0">
                  <img src={attachedFile.preview} alt="upload preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${
                  attachedFile.type === "csv" 
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400" 
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate max-w-md">{attachedFile.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{attachedFile.type} file ready</p>
              </div>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="p-1.5 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Cancel Upload"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message input bar */}
      <div className="p-4 border-t border-navy-700/40 bg-navy-900/50 flex gap-3 items-center">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, .csv, .pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="p-3 bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white rounded-xl border border-navy-700/50 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
          title="Attach image, CSV, or PDF"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={loading}
          placeholder="Ask about state vulnerability scores, forecasts, peak demand months, or anomalies..."
          className="flex-1 bg-navy-950 border border-navy-700/60 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500/60 font-medium placeholder-slate-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || (!input.trim() && !attachedFile)}
          className="p-3 bg-gradient-to-tr from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl shadow-orange-glow disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>

    </div>
  );
};

export default AIAgent;
