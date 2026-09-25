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
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { endpoints } from '../../config/api';
import { seekerFaqs as fallbackFaqs } from '../../data/seekerFaqs';

export default function HelpAssistantScreen({ navigation }) {
  const [faqs, setFaqs] = useState(fallbackFaqs);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Hi there! 👋 Welcome to Plan To Park 24/7 Smart Assistant.',
      timestamp: new Date(),
    },
    {
      id: 'welcome-2',
      sender: 'bot',
      text: 'I can help you with anything regarding parking, bookings, payments, pricing, and extensions. Please select a question below or choose a topic to begin:',
      timestamp: new Date(),
      showQuestions: true,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);

  // Fetch live FAQs if backend online, fallback to curated local list
  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await fetch(endpoints.getFaqs);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data);
          const cats = ['All', ...new Set(data.map((f) => f.category))];
          setCategories(cats);
          return;
        }
      }
    } catch (e) {
      // Use fallback
    }
    const cats = ['All', ...new Set(fallbackFaqs.map((f) => f.category))];
    setCategories(cats);
  };

  const handleSelectQuestion = (faqItem) => {
    if (isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: faqItem.question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate natural AI / Bot response delay
    setTimeout(() => {
      setIsTyping(false);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: faqItem.answer,
        category: faqItem.category,
        faqId: faqItem.id,
        timestamp: new Date(),
        showNextOptions: true,
      };
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }, 450);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: 'Conversation restarted! 🔄 Choose a question below or pick a category:',
        timestamp: new Date(),
        showQuestions: true,
      },
    ]);
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+919876543210').catch(() => {
      alert('Support contact: support@plantopark.com / +91 98765 43210');
    });
  };

  // Filter questions based on category and search query
  const filteredQuestions = faqs.filter((f) => {
    const matchesCat =
      selectedCategory === 'All' ||
      f.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery =
      !searchQuery.trim() ||
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack?.()}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>PlanToPark Assistant</Text>
            <View style={styles.statusRow}>
              <View style={styles.liveIndicator} />
              <Text style={styles.statusTxt}>Online • 24/7 Smart FAQ</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleResetChat}
          activeOpacity={0.7}
        >
          <Text style={styles.resetTxt}>Restart</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Category Scroll Bar ─── */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryTxt,
                    isSelected && styles.categoryTxtActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Search Bar ─── */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search question keyword (e.g. UPI, extend, refund)..."
          placeholderTextColor={COLORS.textMuted || '#64748b'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Chat Messages Area ─── */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <View
              key={m.id}
              style={[
                styles.messageRow,
                isBot ? styles.botRow : styles.userRow,
              ]}
            >
              {isBot && (
                <View style={styles.msgAvatar}>
                  <Text style={{ fontSize: 13 }}>🤖</Text>
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isBot ? styles.botBubble : styles.userBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isBot ? styles.botText : styles.userText,
                  ]}
                >
                  {m.text}
                </Text>

                {m.category && (
                  <View style={styles.bubbleTag}>
                    <Text style={styles.bubbleTagTxt}>📌 {m.category}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Bot Typing Indicator */}
        {isTyping && (
          <View style={[styles.messageRow, styles.botRow]}>
            <View style={styles.msgAvatar}>
              <Text style={{ fontSize: 13 }}>🤖</Text>
            </View>
            <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.primary || '#10b981'} />
              <Text style={styles.typingTxt}>Assistant is typing...</Text>
            </View>
          </View>
        )}

        {/* Quick Question Selector Options */}
        <View style={styles.pickerSection}>
          <Text style={styles.pickerHeading}>
            💡 {selectedCategory === 'All' ? 'Choose a Question to Ask:' : `${selectedCategory} Questions:`} ({filteredQuestions.length})
          </Text>

          {filteredQuestions.length === 0 ? (
            <View style={styles.emptyQuestions}>
              <Text style={styles.emptyTxt}>No questions match your search.</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                style={styles.clearFiltersBtn}
              >
                <Text style={styles.clearFiltersTxt}>Show All 45 Questions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredQuestions.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.questionChip}
                onPress={() => handleSelectQuestion(q)}
                activeOpacity={0.7}
              >
                <View style={styles.questionBadge}>
                  <Text style={styles.questionNum}>{q.id}</Text>
                </View>
                <Text style={styles.questionChipTxt} numberOfLines={2}>
                  {q.question}
                </Text>
                <Text style={styles.questionArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Live Support Escalation Card */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Still need personal help?</Text>
          <Text style={styles.supportSub}>
            Our human support team is available 24 hours a day to assist with active bookings.
          </Text>
          <TouchableOpacity
            style={styles.callSupportBtn}
            onPress={handleCallSupport}
            activeOpacity={0.8}
          >
            <Text style={styles.callSupportTxt}>📞 Call 24/7 Support Desk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg || '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark || '#1e293b',
    backgroundColor: COLORS.cardBg || '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 28,
  },
  botAvatar: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusTxt: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resetTxt: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryTxt: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTxtActive: {
    color: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    padding: 0,
  },
  clearSearch: {
    color: '#94a3b8',
    fontSize: 13,
    paddingHorizontal: 6,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 40,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: COLORS.cardBg || '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primary || '#10b981',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  botText: {
    color: '#e2e8f0',
  },
  userText: {
    color: '#fff',
    fontWeight: '600',
  },
  bubbleTag: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bubbleTagTxt: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingTxt: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  pickerSection: {
    marginTop: 10,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  pickerHeading: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyQuestions: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTxt: {
    color: '#64748b',
    fontSize: 12,
  },
  clearFiltersBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
  },
  clearFiltersTxt: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  questionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  questionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  questionNum: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  questionChipTxt: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  questionArrow: {
    color: '#64748b',
    fontSize: 18,
    marginLeft: 6,
  },
  supportCard: {
    marginTop: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  supportTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  supportSub: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  callSupportBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  callSupportTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
