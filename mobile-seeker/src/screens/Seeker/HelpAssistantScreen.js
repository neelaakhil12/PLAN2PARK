import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { seekerFaqs } from '../../data/seekerFaqs';
import { endpoints } from '../../config/api';

// Format helper for timestamps (e.g., "9:50 PM")
const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Format helper for header date banner (e.g., "Today, 27 Sept 2026")
const formatHeaderDate = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `Today, ${day} ${month} ${year}`;
};

// Generate random ticket/session ID similar to Zepto: TK336B08A39DA
const generateTicketId = () => {
  const chars = '0123456789ABCDEF';
  let result = 'TK';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Structured Topic Categories mapped to seekerFaqs (Pure Automated Self-Service)
const TOPIC_CATEGORIES = [
  {
    id: 'cat_booking',
    title: 'Booking & Finding Parking',
    description: 'Find spots, advance booking, vehicle types & compare',
    questionIds: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21],
  },
  {
    id: 'cat_payment',
    title: 'Pricing, Payment & UPI',
    description: 'Charges, UPI payments, receipts & failed transactions',
    questionIds: [22, 23, 24, 25, 26, 27],
  },
  {
    id: 'cat_arrival',
    title: 'Arrival, Check-in & Directions',
    description: 'Navigation, spot identification & early/late policies',
    questionIds: [28, 29, 30, 31, 35, 36, 37],
  },
  {
    id: 'cat_extension',
    title: 'Extensions & Overstay',
    description: 'Extend parking, overstay fees & overnight rules',
    questionIds: [32, 45, 33],
  },
  {
    id: 'cat_cancellation',
    title: 'Cancellation & Refunds',
    description: 'Cancel reservation, refund eligibility & modifications',
    questionIds: [38, 39, 40],
  },
  {
    id: 'cat_urgent',
    title: 'Spot Occupied / Spot Issues',
    description: 'Reserved spot blocked, space unavailable or security',
    questionIds: [41, 42, 34],
  },
  {
    id: 'cat_account',
    title: 'Account & My Bookings',
    description: 'Registration, booking history & security',
    questionIds: [4, 5, 18, 19, 20, 44],
  },
];

const BOT_NAME = 'Agent Plan2Park';

export default function HelpAssistantScreen({ navigation }) {
  const [ticketId] = useState(generateTicketId);
  const [faqs, setFaqs] = useState(seekerFaqs);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const scrollViewRef = useRef(null);

  // Initial greeting and prompt
  const [messages, setMessages] = useState(() => [
    {
      id: 'greeting-1',
      sender: 'bot',
      botName: BOT_NAME,
      text: "Hello! Welcome to PlanToPark Support. I'm Agent Plan2Park, here to assist you.",
      timestamp: formatTime(),
    },
    {
      id: 'greeting-2',
      sender: 'bot',
      botName: BOT_NAME,
      text: "Can you specify what you need help with from the options below?",
      timestamp: formatTime(),
      options: TOPIC_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.title,
        payload: { type: 'SELECT_TOPIC', topic: cat },
      })),
      active: true,
    },
  ]);

  // Fetch live FAQs if available, otherwise use seekerFaqs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(endpoints.getFaqs);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setFaqs(data);
          }
        }
      } catch (err) {
        // Fallback to local seekerFaqs
      }
    })();
  }, []);

  const messageLayouts = useRef({});
  const pendingScrollId = useRef(null);

  const scrollToMessage = (msgId, offset = 16) => {
    pendingScrollId.current = msgId;
    const y = messageLayouts.current[msgId];
    if (typeof y === 'number') {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - offset), animated: true });
      }, 50);
    }
  };

  const handleMessageLayout = (id, event) => {
    const { y } = event.nativeEvent.layout;
    messageLayouts.current[id] = y;
    if (pendingScrollId.current === id) {
      pendingScrollId.current = null;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }, 50);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Copy Ticket ID
  const handleCopyTicket = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticketId);
    }
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(`Ticket ID #${ticketId} has been copied to clipboard.`);
      }
      return;
    }
    Alert.alert(
      'Ticket Reference Copied',
      `Ticket ID #${ticketId} has been copied for your records.`
    );
  };

  // Restart / Reset Chat
  const handleResetChat = () => {
    setIsChatEnded(false);
    setInputText('');
    setMessages([
      {
        id: `greeting-1-${Date.now()}`,
        sender: 'bot',
        botName: BOT_NAME,
        text: "Hello! Welcome to PlanToPark Support. I'm Agent Plan2Park, here to assist you.",
        timestamp: formatTime(),
      },
      {
        id: `greeting-2-${Date.now()}`,
        sender: 'bot',
        botName: BOT_NAME,
        text: "Can you specify what you need help with from the options below?",
        timestamp: formatTime(),
        options: TOPIC_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.title,
          payload: { type: 'SELECT_TOPIC', topic: cat },
        })),
        active: true,
      },
    ]);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  // End Chat Prompt
  const handleEndChat = () => {
    const doEndChat = () => {
      setIsChatEnded(true);
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, active: false })),
        {
          id: `ended-${Date.now()}`,
          sender: 'system',
          text: 'Chat session has ended. Thank you for using PlanToPark Support!',
          timestamp: formatTime(),
        },
      ]);
      scrollToBottom();
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Are you sure you want to end this support conversation?')
        : true;
      if (confirmed) {
        doEndChat();
      }
      return;
    }

    Alert.alert(
      'End Chat',
      'Are you sure you want to end this support conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Chat',
          style: 'destructive',
          onPress: doEndChat,
        },
      ]
    );
  };

  // Option Click Handler (Asks questions one by one sequentially)
  const handleOptionPress = (option, messageId) => {
    if (isTyping || isChatEnded) return;

    // Deactivate options in older messages
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, active: false } : m))
    );

    // 1. Post user selection as chat bubble
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: option.label,
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    scrollToMessage(userMsg.id, 16);

    // 2. Process selection after natural delay (~400ms)
    setTimeout(() => {
      setIsTyping(false);
      const payload = option.payload;

      if (!payload) return;

      if (payload.type === 'SELECT_TOPIC') {
        const topic = payload.topic;

        // Get questions belonging to this topic
        const topicQuestions = faqs.filter((f) =>
          topic.questionIds.includes(f.id)
        );

        const questionOptions = topicQuestions.map((q) => ({
          id: `q_${q.id}`,
          label: q.question,
          payload: { type: 'SELECT_QUESTION', questionItem: q, topic },
        }));

        questionOptions.push({
          id: 'back_main',
          label: '‹ Back to Main Menu',
          payload: { type: 'SHOW_MAIN_MENU' },
        });

        const nextBotMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: `Got it! Can you select the specific question you have regarding ${topic.title}?`,
          timestamp: formatTime(),
          options: questionOptions,
          active: true,
        };

        setMessages((prev) => [...prev, nextBotMsg]);
        scrollToMessage(userMsg.id, 16);
      } else if (payload.type === 'SELECT_QUESTION') {
        const qItem = payload.questionItem;
        const topic = payload.topic;

        // Bot gives the answer, followed by step-by-step resolution options
        const answerBotMsg = {
          id: `bot-ans-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: qItem.answer,
          timestamp: formatTime(),
          options: [
            {
              id: 'resolved_yes',
              label: '✅ Yes, that helped!',
              payload: { type: 'QUERY_RESOLVED' },
            },
            {
              id: 'ask_more_topic',
              label: '❓ Ask another question in this topic',
              payload: { type: 'SELECT_TOPIC', topic },
            },
            {
              id: 'back_main',
              label: '🏠 Return to Main Menu',
              payload: { type: 'SHOW_MAIN_MENU' },
            },
          ],
          active: true,
        };

        setMessages((prev) => [...prev, answerBotMsg]);
        scrollToMessage(userMsg.id, 16);
      } else if (payload.type === 'QUERY_RESOLVED') {
        const botSuccessMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: 'Awesome! Glad I could help. Have a safe journey and smooth parking experience! 🚗✨',
          timestamp: formatTime(),
          options: [
            {
              id: 'new_query',
              label: '🔄 Ask another question',
              payload: { type: 'SHOW_MAIN_MENU' },
            },
            {
              id: 'end_chat_opt',
              label: '👋 End Chat',
              payload: { type: 'END_CHAT' },
            },
          ],
          active: true,
        };
        setMessages((prev) => [...prev, botSuccessMsg]);
        scrollToMessage(userMsg.id, 16);
      } else if (payload.type === 'SHOW_MAIN_MENU') {
        const menuMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: 'Sure! Please choose a category below to continue:',
          timestamp: formatTime(),
          options: TOPIC_CATEGORIES.map((cat) => ({
            id: cat.id,
            label: cat.title,
            payload: { type: 'SELECT_TOPIC', topic: cat },
          })),
          active: true,
        };
        setMessages((prev) => [...prev, menuMsg]);
        scrollToMessage(userMsg.id, 16);
      } else if (payload.type === 'END_CHAT') {
        setIsChatEnded(true);
        setMessages((prev) => [
          ...prev.map((m) => ({ ...m, active: false })),
          {
            id: `ended-${Date.now()}`,
            sender: 'system',
            text: 'Chat session has ended. Thank you for using PlanToPark Support!',
            timestamp: formatTime(),
          },
        ]);
        scrollToBottom();
      }
    }, 400);
  };

  // Free-form user input handler (supports typing any question or query)
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || isTyping || isChatEnded) return;

    // Deactivate previous options
    setMessages((prev) => prev.map((m) => ({ ...m, active: false })));

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    scrollToMessage(userMsg.id, 16);

    // Natural bot response delay
    setTimeout(() => {
      setIsTyping(false);
      const queryLower = text.toLowerCase();

      // Find closest matching FAQ
      const matchedFaq = faqs.find(
        (f) =>
          f.question.toLowerCase().includes(queryLower) ||
          f.answer.toLowerCase().includes(queryLower)
      );

      if (matchedFaq) {
        const botReply = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: `Regarding "${matchedFaq.question}":\n\n${matchedFaq.answer}`,
          timestamp: formatTime(),
          options: [
            {
              id: 'resolved_yes',
              label: '✅ Yes, that helped!',
              payload: { type: 'QUERY_RESOLVED' },
            },
            {
              id: 'back_main',
              label: '🏠 Return to Main Menu',
              payload: { type: 'SHOW_MAIN_MENU' },
            },
          ],
          active: true,
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        // Fallback response with navigation options
        const botReply = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          botName: BOT_NAME,
          text: "I couldn't find an exact answer for that query. Please select a help category below to find what you need:",
          timestamp: formatTime(),
          options: [
            {
              id: 'view_topics',
              label: '🏠 View Help Topics',
              payload: { type: 'SHOW_MAIN_MENU' },
            },
          ],
          active: true,
        };
        setMessages((prev) => [...prev, botReply]);
      }
      scrollToMessage(userMsg.id, 16);
    }, 450);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation?.goBack?.()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>

            <View style={styles.botInfo}>
              <View style={styles.botTitleRow}>
                <Text style={styles.botName}>{BOT_NAME}</Text>
                <View style={styles.onlineDot} />
              </View>

              <TouchableOpacity
                style={styles.ticketRow}
                onPress={handleCopyTicket}
                activeOpacity={0.6}
              >
                <Text style={styles.ticketText}>{ticketId}</Text>
                <Ionicons name="copy-outline" size={13} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.endChatBtn}
            onPress={isChatEnded ? handleResetChat : handleEndChat}
            onClick={isChatEnded ? handleResetChat : handleEndChat}
            activeOpacity={0.7}
          >
            <Text style={styles.endChatText}>
              {isChatEnded ? 'Start New' : 'End Chat'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Chat Message Stream ─── */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Zepto Date Header */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatHeaderDate()}</Text>
          </View>

          {/* Messages */}
          {messages.map((m) => {
            if (m.sender === 'system') {
              return (
                <View
                  key={m.id}
                  style={styles.systemBubble}
                  onLayout={(e) => handleMessageLayout(m.id, e)}
                >
                  <Text style={styles.systemText}>{m.text}</Text>
                  <TouchableOpacity
                    style={styles.startNewBtn}
                    onPress={handleResetChat}
                  >
                    <Text style={styles.startNewBtnText}>Start New Chat</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (m.sender === 'user') {
              return (
                <View
                  key={m.id}
                  style={styles.userRow}
                  onLayout={(e) => handleMessageLayout(m.id, e)}
                >
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{m.text}</Text>
                    <Text style={styles.userTimestamp}>{m.timestamp}</Text>
                  </View>
                </View>
              );
            }

            // Bot Message Card
            return (
              <View
                key={m.id}
                style={styles.botCard}
                onLayout={(e) => handleMessageLayout(m.id, e)}
              >
                <Text style={styles.botCardName}>{m.botName || BOT_NAME}</Text>
                <Text style={styles.botCardText}>{m.text}</Text>

                {/* Question / Category Options inside Bot Card */}
                {Array.isArray(m.options) && m.options.length > 0 && (
                  <View style={styles.optionsList}>
                    {m.options.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.optionBtn,
                          !m.active && styles.optionBtnDisabled,
                        ]}
                        onPress={() => handleOptionPress(opt, m.id)}
                        disabled={!m.active || isTyping || isChatEnded}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            !m.active && styles.optionLabelDisabled,
                          ]}
                          numberOfLines={2}
                        >
                          {opt.label}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={m.active ? '#374151' : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.botTimestamp}>{m.timestamp}</Text>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.botCard}>
              <Text style={styles.botCardName}>{BOT_NAME}</Text>
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.typingText}>{BOT_NAME} is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ─── Bottom Chat Bar (Zepto Style) ─── */}
        {!isChatEnded && (
          <View style={styles.bottomBar}>
            <TextInput
              style={styles.inputField}
              placeholder="Type your query here..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F7F8FC', // Soft light Zepto chat background
  },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botInfo: {
    justifyContent: 'center',
  },
  botTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Zepto green dot
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  ticketText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  endChatBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  endChatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  // ─── Chat Area ───
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // ─── Bot Message Card (Zepto Design) ───
  botCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    alignSelf: 'flex-start',
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  botCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED', // Zepto signature purple
    marginBottom: 6,
  },
  botCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1F2937',
    fontWeight: '400',
  },
  optionsList: {
    marginTop: 10,
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionBtnDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    opacity: 0.6,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  optionLabelDisabled: {
    color: '#6B7280',
  },
  botTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  // ─── User Message Bubble ───
  userRow: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userTimestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  // ─── Typing Indicator ───
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // ─── System / Ended Chat ───
  systemBubble: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 14,
  },
  systemText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  startNewBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  startNewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Bottom Chat Input Bar ───
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
