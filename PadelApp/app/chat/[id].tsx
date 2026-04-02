import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function ChatRoom() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const currentUser = auth.currentUser;

  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    const fetchMatchInfo = async () => {
      const matchRef = doc(db, "matches", id as string);
      const docSnap = await getDoc(matchRef);
      if (docSnap.exists()) setMatchInfo(docSnap.data());
    };
    fetchMatchInfo();

    const q = query(
      collection(db, `matches/${id}/chat`),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(chatData);
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !currentUser) return;
    try {
      await addDoc(collection(db, `matches/${id}/chat`), {
        text: newMessage,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        createdAt: new Date().getTime(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Fout bij versturen:", error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = currentUser && item.senderId === currentUser.uid;
    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text style={[styles.sender, isMe && { color: "#064E3B" }]}>
            {isMe ? "Ik" : item.senderEmail}
          </Text>
          <Text style={[styles.messageText, isMe && { color: "#0F172A" }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const isParticipant = matchInfo?.players?.includes(currentUser?.uid);

  if (matchInfo && !isParticipant) {
    return (
      <View style={styles.deniedContainer}>
        <Ionicons
          name="lock-closed"
          size={64}
          color="#EF4444"
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.deniedText}>Geen toegang</Text>
        <Text style={styles.deniedSubText}>
          Je kunt deze chat alleen bekijken als je meedoet aan deze match.
        </Text>
        <TouchableOpacity
          style={styles.backButtonLarge}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonLargeText}>Terug naar overzicht</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Team Chat</Text>
          <Text style={styles.subtitle}>
            {matchInfo ? matchInfo.club : "Laden..."}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.chatContentContainer}
        style={styles.chatArea}
        bounces={false}
        overScrollMode="never"
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Typ een bericht..."
          placeholderTextColor="#64748B"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 60,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: { marginRight: 15 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: "900", color: "#F8FAFC" },
  subtitle: { fontSize: 13, color: "#00E676", fontWeight: "600" },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#020617",
  },
  deniedText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 10,
  },
  deniedSubText: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "500",
  },
  backButtonLarge: {
    backgroundColor: "#00E676",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  backButtonLargeText: { color: "#0F172A", fontWeight: "800", fontSize: 16 },
  chatArea: { flex: 1, backgroundColor: "#020617" },
  chatContentContainer: { padding: 20, paddingBottom: 30 },
  messageContainer: { width: "100%", marginBottom: 15, flexDirection: "row" },
  myMessageContainer: { justifyContent: "flex-end" },
  otherMessageContainer: { justifyContent: "flex-start" },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    maxWidth: "75%",
    elevation: 1,
  },
  myMessage: { backgroundColor: "#00E676", borderBottomRightRadius: 4 },
  otherMessage: {
    backgroundColor: "#1E293B",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sender: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
    fontWeight: "800",
  },
  messageText: {
    fontSize: 15,
    color: "#F8FAFC",
    fontWeight: "600",
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: "row",
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    backgroundColor: "#0F172A",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#1E293B",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  sendButton: {
    backgroundColor: "#00E676",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
