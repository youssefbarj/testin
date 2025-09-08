"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Languages } from "lucide-react"
import Image from "next/image"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Universal environment detection
const getEnvironmentInfo = () => {
  if (typeof window === "undefined") return { isServer: true }

  return {
    isServer: false,
    isIframe: window !== window.parent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent),
    isEmbedded: document.referrer && document.referrer !== window.location.href,
    origin: window.location.origin,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
  }
}

// Universal API URL detection
const getApiUrl = () => {
  if (typeof window === "undefined") return "/api/chat"

  const env = getEnvironmentInfo()
  const baseUrl = env.origin || window.location.origin
  return `${baseUrl}/api/chat`
}

// Improved markdown renderer component
const MarkdownRenderer = ({ content }: { content: string }) => {
  const renderContent = (text: string) => {
    text = text.replace(/\n\n/g, "<br><br>")
    text = text.replace(/\n/g, "<br>")
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>")
    text = text.replace(/^- (.+)$/gm, "<div style='margin: 4px 0;'>• $1</div>")
    text = text.replace(/^\d+\. (.+)$/gm, "<div style='margin: 4px 0;'>• $1</div>")
    text = text.replace(/^### (.+)$/gm, "<div style='margin: 8px 0 4px 0;'><strong>$1</strong></div>")
    text = text.replace(/^## (.+)$/gm, "<div style='margin: 8px 0 4px 0;'><strong>$1</strong></div>")
    text = text.replace(/^# (.+)$/gm, "<div style='margin: 8px 0 4px 0;'><strong>$1</strong></div>")
    text = text.replace(
      /`([^`]+)`/g,
      '<span style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</span>',
    )
    return text
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
      style={{
        fontFamily: "var(--font-montserrat)",
        fontSize: "14px",
        lineHeight: "1.6",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    />
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState("french")
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [environmentInfo, setEnvironmentInfo] = useState<any>({})
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Detect environment on mount
  useEffect(() => {
    const env = getEnvironmentInfo()
    setEnvironmentInfo(env)
    console.log("Environment detected:", env)
  }, [])

  const languages = [
    { value: "arabic", label: "العربية", flag: "🇸🇦" },
    { value: "english", label: "English", flag: "🇺🇸" },
    { value: "french", label: "Français", flag: "🇫🇷" },
  ]

  const placeholders = {
    arabic: "اسأل عن أي جانب من الدورة...",
    english: "Ask about any aspect of the course...",
    french: "Posez une question sur le cours...",
  }

  const welcomeMessages = {
    arabic:
      "مرحباً بك! أنا مساعدك الذكي لدورة رفع الرموش والحواجب في أكاديمية إي-لومي للجمال الرقمية. أنا هنا لمساعدتك في فهم أي جانب من جوانب تقنيات رفع الرموش والحواجب أو الإجابة على أسئلتك العملية بعد إكمال الدورة. كيف يمكنني مساعدتك اليوم؟",
    english:
      "Welcome! I'm your AI assistant for the lash and brow lifting course on E-lumy Digital Beauty Academy. I'm here to help you understand any aspect of lash and brow lifting techniques or answer your practical questions after completing the course. How can I help you today?",
    french:
      "Bienvenue ! Je suis votre assistant IA pour le cours de lash lifting et brow lifting sur l'Académie de Beauté Numérique E-lumy. Je suis là pour vous aider à comprendre tout aspect des techniques de lifting des cils et sourcils ou répondre à vos questions pratiques après avoir terminé le cours. Comment puis-je vous aider aujourd'hui ?",
  }

  const commonQuestions = {
    arabic: ["ما هي تعليمات العناية بعد الجلسة؟", "ما هي موانع الاستخدام؟", "كم تدوم النتائج؟"],
    english: [
      "What are the post-treatment care instructions?",
      "What are the contraindications?",
      "How long do the results last?",
    ],
    french: [
      "Quelles sont les instructions post-traitement ?",
      "Quelles sont les contre-indications ?",
      "Combien de temps durent les résultats ?",
    ],
  }

  // Improved auto-scroll effect
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        // Try multiple methods to ensure scrolling works in all environments
        const scrollContainer =
          scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") || scrollAreaRef.current

        if (scrollContainer) {
          // Method 1: Set scrollTop
          scrollContainer.scrollTop = scrollContainer.scrollHeight

          // Method 2: Use scrollIntoView as backup
          setTimeout(() => {
            const lastMessage = scrollContainer.querySelector("[data-message-id]:last-child")
            if (lastMessage) {
              lastMessage.scrollIntoView({ behavior: "smooth", block: "end" })
            }
          }, 100)

          // Method 3: Force scroll with requestAnimationFrame
          requestAnimationFrame(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          })
        }
      }
    }

    // Scroll immediately
    scrollToBottom()

    // Also scroll after a short delay to handle any layout changes
    const timeoutId = setTimeout(scrollToBottom, 200)

    return () => clearTimeout(timeoutId)
  }, [messages])

  // Additional effect to scroll when loading state changes
  useEffect(() => {
    if (!isLoading && scrollAreaRef.current) {
      const scrollContainer =
        scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") || scrollAreaRef.current
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }, 300)
      }
    }
  }, [isLoading])

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer =
        scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") || scrollAreaRef.current

      if (scrollContainer) {
        // Smooth scroll to bottom
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        })

        // Fallback for browsers that don't support smooth scrolling
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }, 100)
      }
    }
  }, [])

  // Universal API call function with multiple fallbacks
  const makeApiCall = async (messageContent: string, conversationMessages: Message[]) => {
    const languageInstructions = {
      arabic: "Always respond in Arabic",
      english: "Always respond in English",
      french: "Always respond in French",
    }

    const outOfScopeMessages = {
      arabic:
        "عذراً، هذا السؤال خارج نطاق دورة رفع الرموش والحواجب. أنا مختص فقط في الإجابة على الأسئلة المتعلقة بتقنيات رفع الرموش والحواجب والعناية والبروتوكولات العلاجية التي تم تغطيتها في الدورة.",
      english:
        "Sorry, this question falls outside the scope of the lash and brow lifting course. I can only answer questions related to lash lifting, brow lifting techniques, care instructions, and treatment protocols covered in the course.",
      french:
        "Désolé, cette question sort du cadre du cours de lash lifting et brow lifting. Je ne peux répondre qu'aux questions liées aux techniques de lifting des cils et sourcils, aux soins et aux protocoles de traitement couverts dans le cours.",
    }

    // Try multiple API URL strategies
    const apiUrls = [
      getApiUrl(),
      "/api/chat",
      `${window.location.origin}/api/chat`,
      `${window.location.protocol}//${window.location.host}/api/chat`,
    ]

    let lastError: Error | null = null

    for (const apiUrl of apiUrls) {
      try {
        console.log("Trying API URL:", apiUrl)

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are a specialized tutor for E-lumy Digital Beauty Academy's lash and brow lifting course. 

LANGUAGE: ${languageInstructions[selectedLanguage as keyof typeof languageInstructions]}

CONVERSATION HANDLING:
- ALWAYS respond in the selected language (${selectedLanguage})
- For greetings (hi, hello, bonjour, salut, etc.) or basic conversational starters: Respond warmly and guide them to ask about lash and brow lifting topics
- For questions about lash and brow lifting course content: Provide helpful, detailed answers
- For completely unrelated topics (cooking, politics, other beauty treatments not in course, etc.): Use the out-of-scope message

OUT-OF-SCOPE RESPONSE (only for truly unrelated topics):
${outOfScopeMessages[selectedLanguage as keyof typeof outOfScopeMessages]}

RESPONSE FORMAT:
- Keep answers SHORT and BITE-SIZED (maximum 3-4 sentences)
- Use line breaks between different points for better readability
- You can use **bold** for emphasis and - for bullet points if helpful
- Answer the specific question directly
- Add ONE quick practical tip if helpful
- Be concise and to the point

LASH AND BROW LIFTING COURSE CONTENT INCLUDES:
- Lash lifting techniques and protocols (15 min perm solution, 10 min setting solution)
- Brow lifting procedures and timing (15-20 min first application, 10 min fixation)
- Post-treatment care instructions (24-48 hour water restriction period)
- Contraindications (eye infections, recent eye surgery, pregnancy concerns, allergies)
- Client consultation and patch testing (48 hours before treatment)
- Safety protocols and hygiene standards
- Tool selection and proper usage (silicone shields, lifting solutions, nourishing treatments)
- Treatment duration and results (6-8 weeks lasting results)
- Pre-treatment preparation (no waterproof mascara, clean lashes/brows)
- Professional kit components and their purposes
- Client aftercare and maintenance
- Troubleshooting common issues
- Legal and professional responsibilities

EXAMPLES:
- "Hi" → Respond warmly in selected language and ask how you can help with lash and brow lifting questions
- "What is lash lifting?" → Provide detailed course-related answer
- "How to cook pasta?" → Use out-of-scope response`,
              },
              ...conversationMessages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: messageContent },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("API call successful with URL:", apiUrl)
          return data
        } else {
          const errorData = await response.json().catch(() => ({}))
          lastError = new Error(`HTTP ${response.status}: ${errorData.error || "Unknown error"}`)
          console.warn("API call failed with URL:", apiUrl, lastError.message)
        }
      } catch (error) {
        lastError = error as Error
        console.warn("API call failed with URL:", apiUrl, error)
      }
    }

    // If all URLs failed, throw the last error
    throw lastError || new Error("All API endpoints failed")
  }

  const handleQuestionClick = async (question: string) => {
    setShowSuggestions(false)
    setIsLoading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const data = await makeApiCall(question, messages)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error:", error)
      const errorMessages = {
        arabic: "عذراً، حدث خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
        english: "Sorry, a connection error occurred. Please check your internet connection and try again.",
        french:
          "Désolé, une erreur de connexion s'est produite. Veuillez vérifier votre connexion internet et réessayer.",
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessages[selectedLanguage as keyof typeof errorMessages],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    setShowSuggestions(false)
    setIsLoading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageContent = input
    setInput("")

    try {
      const data = await makeApiCall(messageContent, messages)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error:", error)
      const errorMessages = {
        arabic: "عذراً، حدث خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
        english: "Sorry, a connection error occurred. Please check your internet connection and try again.",
        french:
          "Désolé, une erreur de connexion s'est produite. Veuillez vérifier votre connexion internet et réessayer.",
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessages[selectedLanguage as keyof typeof errorMessages],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Responsive layout based on environment
  const isCompact = environmentInfo.isIframe || environmentInfo.isMobile || environmentInfo.isEmbedded

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
    setShowSuggestions(true)
    setMessages([
      {
        role: "assistant",
        content: welcomeMessages[language as keyof typeof welcomeMessages],
        timestamp: new Date(),
      },
    ])
  }

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: welcomeMessages[selectedLanguage as keyof typeof welcomeMessages],
        timestamp: new Date(),
      },
    ])
  }, []) // Run only once on mount

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#CF9FFF" }}>
      <div className="flex max-w-7xl mx-auto lg:p-4 lg:pt-4 lg:gap-6">
        {/* Main Chat Container */}
        <div className="flex-1 lg:max-w-6xl lg:mx-auto w-full">
          <div className="bg-white lg:rounded-2xl shadow-xl overflow-hidden min-h-screen lg:min-h-[70vh]">
            {/* Chat Header with Integrated Logo */}
            <div
              className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100"
              style={{
                background: "linear-gradient(90deg, #000435 0%, #CF9FFF 100%)",
                backgroundImage: "linear-gradient(90deg, #000435 0%, #CF9FFF 100%)",
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* E-lumy Digital Beauty Academy Logo */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg p-1 shadow-sm">
                    <Image
                      src="/images/e-lumy-robot-logo.png"
                      alt="E-lumy Digital Beauty Academy"
                      width={40}
                      height={40}
                      className="object-contain w-full h-full"
                      priority
                      unoptimized
                    />
                  </div>
                  <div>
                    <h2
                      className="text-base sm:text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {selectedLanguage === "arabic" && "مساعد دورة رفع الرموش والحواجب"}
                      {selectedLanguage === "english" && "Lash & Brow Lifting Course Assistant"}
                      {selectedLanguage === "french" && "Assistant Cours Lash & Brow Lifting"}
                    </h2>
                    <p
                      className="text-xs sm:text-sm font-light"
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        color: "rgba(255, 255, 255, 0.95)",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {selectedLanguage === "arabic" && "أكاديمية إي-لومي للجمال الرقمية"}
                      {selectedLanguage === "english" && "E-lumy Digital Beauty Academy"}
                      {selectedLanguage === "french" && "Académie de Beauté Numérique E-lumy"}
                    </p>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Languages className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: "#ffffff" }} />
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger
                      className="w-24 sm:w-32 border text-xs sm:text-sm"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        color: "#ffffff",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <div className="flex items-center space-x-2">
                            <span>{lang.flag}</span>
                            <span className="text-xs sm:text-sm">{lang.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="h-[calc(100vh-140px)] sm:h-96 p-3 sm:p-6" ref={scrollAreaRef}>
              <div className="space-y-4 sm:space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    data-message-id={message.id}
                    data-message-index={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                        message.role === "user" ? "text-white shadow-lg" : "bg-gray-50 text-gray-900 shadow-sm"
                      }`}
                      style={
                        message.role === "user"
                          ? {
                              background: "linear-gradient(135deg, #000435 0%, #CF9FFF 100%)",
                            }
                          : {}
                      }
                    >
                      <div className="space-y-1 sm:space-y-2">
                        {message.role === "assistant" ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <p
                            className="whitespace-pre-wrap font-regular leading-relaxed text-sm"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {message.content}
                          </p>
                        )}
                        <p
                          className={`text-xs font-light ${message.role === "user" ? "text-white/80" : "text-gray-500"}`}
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Suggested Questions */}
                {showSuggestions && messages.length === 1 && (
                  <div className="flex justify-start">
                    <div className="max-w-[95%] sm:max-w-[90%] space-y-2 sm:space-y-3">
                      <p className="text-sm text-gray-500 font-light" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {selectedLanguage === "arabic" && "أسئلة شائعة:"}
                        {selectedLanguage === "english" && "Common questions:"}
                        {selectedLanguage === "french" && "Questions fréquentes:"}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                        {commonQuestions[selectedLanguage as keyof typeof commonQuestions].map((question, index) => (
                          <Button
                            key={index}
                            onClick={() => handleQuestionClick(question)}
                            disabled={isLoading}
                            className="h-auto px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-200 shadow-sm hover:shadow-md text-left justify-start"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                            variant="outline"
                          >
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div
                            className="w-2 h-2 rounded-full animate-bounce"
                            style={{ backgroundColor: "#000435" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full animate-bounce"
                            style={{ backgroundColor: "#000435", animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full animate-bounce"
                            style={{ backgroundColor: "#000435", animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span
                          className="text-sm font-light text-gray-500"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          {selectedLanguage === "arabic" && "جاري الكتابة..."}
                          {selectedLanguage === "english" && "Typing..."}
                          {selectedLanguage === "french" && "En cours de frappe..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-gray-100 p-3 sm:p-6 bg-white">
              <div className="flex space-x-2 sm:space-x-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholders[selectedLanguage as keyof typeof placeholders]}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border-2 px-3 sm:px-4 py-2 sm:py-3 text-sm font-regular focus:border-2 transition-colors"
                  style={{
                    fontFamily: "var(--font-montserrat)",
                    borderColor: "#000435",
                    focusBorderColor: "#CF9FFF",
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl px-4 sm:px-6 py-2 sm:py-3 font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #000435 0%, #CF9FFF 100%)",
                    fontFamily: "var(--font-montserrat)",
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p
                className="text-xs font-light text-gray-500 mt-2 text-center"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {selectedLanguage === "arabic" && "اضغط Enter للإرسال"}
                {selectedLanguage === "english" && "Press Enter to send"}
                {selectedLanguage === "french" && "Appuyez sur Entrée pour envoyer"}
              </p>
            </div>
          </div>

          {/* Footer - Now visible in all environments */}
          <div className="text-center mt-4">
            <p className="text-sm font-light text-gray-600" style={{ fontFamily: "var(--font-montserrat)" }}>
              © 2024 E-lumy Digital Beauty Academy.
              {selectedLanguage === "arabic" && " جميع الحقوق محفوظة"}
              {selectedLanguage === "english" && " All rights reserved"}
              {selectedLanguage === "french" && " Tous droits réservés"}
              <br />
              <span className="text-xs">
                {selectedLanguage === "arabic" && "الجلسات الحضورية متوفرة في معهد فندي للتجميل"}
                {selectedLanguage === "english" && "In-person sessions available at Institut Fandi D'Esthétique"}
                {selectedLanguage === "french" && "Sessions en présentiel disponibles à l'institut Fandi D'Esthétique"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
