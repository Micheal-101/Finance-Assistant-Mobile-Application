import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';

import { chatWithAssistant, type AssistantChatMessage, type ExpenseCategory } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCurrentMonthKey } from '@/lib/format';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const expenseCategoryValues: ExpenseCategory[] = [
  'health',
  'groceries',
  'utilities',
  'entertainment',
  'dining',
  'transport',
  'other',
];

const suggestedQuestions = [
  'Can I afford to eat out this weekend?',
  'How much did I spend this month?',
  "What's my biggest expense?",
  'Am I on track with my budget?',
];

function normalizeParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <View className="max-w-[76%] rounded-[18px] border border-line bg-white px-4 py-4">
      <Text className="text-[15px] leading-8 text-ink">{text}</Text>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View className="max-w-[60%] self-end rounded-[18px] bg-[#F4F6EF] px-4 py-4">
      <Text className="text-[15px] leading-8 text-ink">{text}</Text>
    </View>
  );
}

function TypingBubble() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 250, useNativeDriver: true }),
          Animated.delay(500 - delay),
        ]),
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View className="w-[54px] rounded-[16px] border border-line bg-white px-4 py-4">
      <View className="flex-row items-center gap-1">
        <Animated.View style={{ opacity: dot1 }} className="h-2 w-2 rounded-full bg-slate-400" />
        <Animated.View style={{ opacity: dot2 }} className="h-2 w-2 rounded-full bg-slate-400" />
        <Animated.View style={{ opacity: dot3 }} className="h-2 w-2 rounded-full bg-slate-400" />
      </View>
    </View>
  );
}

export default function AssistantScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const hasAutoSentRef = useRef(false);
  const params = useLocalSearchParams<{
    prompt?: string | string[];
    screen?: string | string[];
    category?: string | string[];
    expenseId?: string | string[];
  }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const sendMessageRef = useRef<(message: string) => Promise<void>>(async () => {});

  const promptParam = normalizeParam(params.prompt);
  const screenParam = normalizeParam(params.screen);
  const categoryParam = normalizeParam(params.category);
  const expenseIdParam = normalizeParam(params.expenseId);

  const assistantContext = useMemo(
    () => ({
      screen: screenParam,
      category: expenseCategoryValues.includes(categoryParam as ExpenseCategory)
        ? (categoryParam as ExpenseCategory)
        : undefined,
      expenseId: expenseIdParam,
    }),
    [categoryParam, expenseIdParam, screenParam],
  );

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();

    if (!trimmed || isTyping) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setErrorMessage('Sign in again to use the assistant.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyForApi: AssistantChatMessage[] = messages.slice(-6).map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setErrorMessage('');
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(token, {
        message: trimmed,
        history: historyForApi,
        month: getCurrentMonthKey(),
        context:
          assistantContext.screen || assistantContext.category || assistantContext.expenseId
            ? assistantContext
            : undefined,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
        },
      ]);
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : 'I could not reach your finance data right now. Please try again.';

      setErrorMessage(messageText);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: `I ran into a problem loading your finance insight: ${messageText}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!promptParam || hasAutoSentRef.current) {
      return;
    }

    hasAutoSentRef.current = true;
    void sendMessageRef.current(promptParam);
  }, [promptParam]);

  const showSuggestions = messages.length === 0 && !promptParam;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-1 bg-white">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-6 pt-5">
              <Text className="text-[24px] font-semibold tracking-tight text-ink">
                AI Assistant
              </Text>

              <View className="mt-8 gap-5">
                <AssistantBubble text="Hi! I’m your FinAssist coach. I can explain your spending, alerts, categories, and budget using your real account data. What would you like to understand?" />

                {showSuggestions ? (
                  <View className="gap-3">
                    <Text className="text-[16px] font-semibold text-ink">Suggested Questions:</Text>

                    {suggestedQuestions.map((question) => (
                      <Pressable
                        key={question}
                        className="self-start rounded-full bg-[#E9FCE2] px-5 py-3"
                        disabled={isTyping}
                        onPress={() => {
                          void sendMessage(question);
                        }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.82 : 1,
                        })}>
                        <Text className="text-[13px] text-[#1A9C15]">{question}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {messages.map((message) =>
                  message.role === 'user' ? (
                    <UserBubble key={message.id} text={message.text} />
                  ) : (
                    <AssistantBubble key={message.id} text={message.text} />
                  ),
                )}

                {isTyping ? <TypingBubble /> : null}
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-line bg-white px-4 pb-4 pt-3">
            {errorMessage ? (
              <View className="mb-3 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3">
                <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center gap-3">
              <TextInput
                className="h-14 flex-1 rounded-[16px] border border-line bg-white px-4 text-[14px] text-ink"
                editable={!isTyping}
                onChangeText={setDraft}
                onSubmitEditing={() => {
                  void sendMessage(draft);
                }}
                placeholder="Ask me anything about your finances here..."
                placeholderTextColor="#98A2B3"
                returnKeyType="send"
                value={draft}
              />

              <Pressable
                accessibilityLabel="Send message"
                className="h-14 w-14 items-center justify-center rounded-[16px] bg-brand-600"
                disabled={!draft.trim() || isTyping}
                onPress={() => {
                  void sendMessage(draft);
                }}
                style={({ pressed }) => ({
                  opacity: !draft.trim() || isTyping ? 0.5 : pressed ? 0.88 : 1,
                })}>
                <Ionicons color="#FFFFFF" name="arrow-forward" size={22} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
